"""
Convenios IES <-> empresa.

Cualquiera de las dos partes propone; la otra acepta o rechaza. Al aceptar se crea el convenio vigente, que
habilita a la empresa a publicar vacantes exclusivas para los egresados de esa IES. Todo se consulta y se
valida desde la cuenta de quien llama: nadie ve ni responde propuestas de otra pareja.
"""

import logging
import re
import uuid
from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.transactional_notifications import send_vincula_email
from app.modules.notifications import services as avisos

logger = logging.getLogger(__name__)

ROLES_EMPRESA = ("admin_empresa",)
ROLES_IES = ("admin_ies", "ies_admin", "asesor_ies", "ies_asesor")
TIPOS = ("Pasantía", "Aprendizaje", "Laboral")  # mismos valores que modalidad_convenio_enum
ABIERTAS = ("pendiente", "en_revision")
MODALIDADES = ("presencial", "hibrido", "remoto")
REMUNERACIONES = ("a_convenir", "remunerada", "con_auxilio", "sin_remuneracion")
COMPROMISOS = ("prioridad_egresados", "charlas_empleabilidad", "ferias_visitas", "seguimiento_conjunto")
_ID = re.compile(r"[0-9a-fA-F-]{36}")


def side_of(user: Dict[str, Any]) -> Tuple[str, str]:
    """('empresa'|'ies', id de la entidad) de quien llama."""
    entidad = str(user.get("id_entidad") or "")
    if not _ID.fullmatch(entidad):
        raise HTTPException(status_code=400, detail="Tu cuenta no está vinculada a una empresa o institución.")
    rol = user.get("rol")
    if rol in ROLES_EMPRESA:
        return "empresa", entidad
    if rol in ROLES_IES:
        return "ies", entidad
    raise HTTPException(status_code=403, detail="Tu rol no puede gestionar convenios.")


def puede_responder(iniciada_por: str, lado: str) -> bool:
    """Responde la parte que NO propuso."""
    return iniciada_por != lado


def _uuid(value: Any) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError:
        raise HTTPException(status_code=404, detail="No encontrado.") from None


def _contraparte(lado: str, r) -> Dict[str, Any]:
    """Datos de la otra parte, vistos desde `lado`."""
    if lado == "empresa":  # la contraparte es la IES
        return {"id": str(r["id_ies"]), "nombre": r["nombre_ies"], "detalle": r["ciudad_ies"]}
    return {"id": str(r["id_empresa"]), "nombre": r["nombre_empresa"], "detalle": " · ".join(x for x in (r["sector"], r["ciudad_empresa"]) if x),
            "nit": r["nit"], "contacto": r["persona_contacto"]}


# ───────────────────────────────────────────────────────────── consulta
async def listar(session: AsyncSession, lado: str, entidad: str) -> Dict[str, Any]:
    columna = "s.id_empresa" if lado == "empresa" else "s.id_institucion"  # fijo: nunca viene del usuario
    props = (await session.execute(text(f"""
        SELECT s.id, s.estado, s.iniciada_por, s.tipo_convenio, s.vacantes_proyectadas, s.duracion_anos, s.programas_objetivo,
               s.mensaje, s.notas_evaluador, s.solicitado_en, s.revisado_en,
               s.modalidad_trabajo, s.remuneracion, s.compromisos, s.responsable_nombre, s.responsable_contacto,
               e.id AS id_empresa, COALESCE(e.nombre_comercial, e.razon_social) AS nombre_empresa, e.nit, e.sector_economico AS sector,
               e.ciudad AS ciudad_empresa, e.persona_contacto, i.id AS id_ies, i.nombre_oficial AS nombre_ies, i.ciudad AS ciudad_ies
        FROM solicitudes_convenio_ies s JOIN empresas e ON e.id = s.id_empresa JOIN instituciones i ON i.id = s.id_institucion
        WHERE {columna} = :id ORDER BY s.solicitado_en DESC LIMIT 100"""), {"id": _uuid(entidad)})).mappings().all()
    hoy = date.today()
    convs = (await session.execute(text(f"""
        SELECT c.id, c.codigo_convenio, c.modalidad::text AS tipo, c.fecha_inicio, c.fecha_vencimiento, c.estado::text AS estado,
               e.id AS id_empresa, COALESCE(e.nombre_comercial, e.razon_social) AS nombre_empresa, e.nit, e.sector_economico AS sector,
               e.ciudad AS ciudad_empresa, e.persona_contacto, i.id AS id_ies, i.nombre_oficial AS nombre_ies, i.ciudad AS ciudad_ies,
               (SELECT COUNT(*) FROM vacantes v WHERE v.id_convenio = c.id) AS vacantes
        FROM convenios_interinstitucionales c JOIN empresas e ON e.id = c.id_empresa JOIN instituciones i ON i.id = c.id_institucion
        WHERE {columna.replace('s.', 'c.')} = :id ORDER BY c.fecha_inicio DESC LIMIT 100"""), {"id": _uuid(entidad)})).mappings().all()

    return {
        "lado": lado,
        "propuestas": [{
            "id": str(r["id"]), "estado": r["estado"], "direccion": "enviada" if r["iniciada_por"] == lado else "recibida",
            "tipo": r["tipo_convenio"], "vacantes_proyectadas": r["vacantes_proyectadas"], "duracion_anos": r["duracion_anos"],
            "programas": list(r["programas_objetivo"] or []), "mensaje": r["mensaje"], "respuesta": r["notas_evaluador"],
            "modalidad": r["modalidad_trabajo"], "remuneracion": r["remuneracion"], "compromisos": list(r["compromisos"] or []),
            "responsable": {"nombre": r["responsable_nombre"], "contacto": r["responsable_contacto"]} if r["responsable_nombre"] or r["responsable_contacto"] else None,
            "creada_en": r["solicitado_en"], "respondida_en": r["revisado_en"], "contraparte": _contraparte(lado, r),
        } for r in props],
        "convenios": [{
            "id": str(r["id"]), "codigo": r["codigo_convenio"], "tipo": r["tipo"], "inicio": r["fecha_inicio"], "vence": r["fecha_vencimiento"],
            # vigente solo si está activo y no venció, la misma regla que usan las vacantes exclusivas
            "vigente": r["estado"] == "activo" and r["fecha_vencimiento"] >= hoy, "vacantes": r["vacantes"],
            "contraparte": _contraparte(lado, r),
        } for r in convs],
    }


def _relacion_sql(lado: str) -> str:
    """'vigente' si ya hay convenio activo, 'propuesta' si hay una abierta, NULL si nada: se calcula contra la entidad de quien busca."""
    mia, otra = ("id_empresa", "id_institucion") if lado == "empresa" else ("id_institucion", "id_empresa")
    # `{otra}` se compara con la fila candidata (c.id) y `{mia}` con :me; los nombres de columna son fijos, nunca del usuario
    return f"""CASE
        WHEN EXISTS (SELECT 1 FROM convenios_interinstitucionales c WHERE c.{otra} = x.id AND c.{mia} = :me
                     AND c.estado = 'activo' AND c.fecha_vencimiento >= CURRENT_DATE) THEN 'vigente'
        WHEN EXISTS (SELECT 1 FROM solicitudes_convenio_ies s WHERE s.{otra} = x.id AND s.{mia} = :me
                     AND s.estado IN ('pendiente', 'en_revision')) THEN 'propuesta' END"""


async def contrapartes(session: AsyncSession, lado: str, q: Optional[str], ciudad: Optional[str] = None, sector: Optional[str] = None,
                       programa: Optional[str] = None, con_vacantes: bool = False, entidad: Optional[str] = None) -> List[Dict[str, Any]]:
    """Entidades aprobadas a las que se les puede proponer un convenio, con filtros y su relación actual con quien busca."""
    params: Dict[str, Any] = {
        "q": f"%{(q or '').strip()[:60]}%", "ciudad": (ciudad or "").strip()[:100] or None, "sector": (sector or "").strip()[:100] or None,
        "prog": f"%{(programa or '').strip()[:80]}%" if (programa or "").strip() else None, "abiertas": bool(con_vacantes),
        "me": _uuid(entidad) if entidad else uuid.UUID(int=0),
    }
    if lado == "empresa":  # la contraparte es una IES
        rows = (await session.execute(text(f"""
            SELECT x.id, x.nombre_oficial, x.ciudad,
                   (SELECT COUNT(*) FROM programas_academicos p WHERE p.id_institucion = x.id) AS programas,
                   (SELECT COUNT(*) FROM academicos_egresado a WHERE a.id_institucion = x.id AND a.estado_verificacion = 'aprobado') AS egresados,
                   {_relacion_sql(lado)} AS relacion
            FROM instituciones x
            WHERE x.estado = 'aprobado' AND (x.nombre_oficial ILIKE :q OR x.nombre_corto ILIKE :q)
              AND (CAST(:ciudad AS text) IS NULL OR x.ciudad = CAST(:ciudad AS text))
              AND (CAST(:prog AS text) IS NULL OR EXISTS (SELECT 1 FROM programas_academicos p WHERE p.id_institucion = x.id AND p.nombre ILIKE CAST(:prog AS text)))
            ORDER BY x.nombre_oficial LIMIT 30"""), params)).fetchall()
        return [{"id": str(r[0]), "nombre": r[1], "detalle": r[2], "ciudad": r[2], "programas": int(r[3] or 0),
                 "egresados": int(r[4] or 0), "relacion": r[5]} for r in rows]
    rows = (await session.execute(text(f"""
        SELECT x.id, COALESCE(x.nombre_comercial, x.razon_social) AS nombre, x.sector_economico, x.ciudad,
               (SELECT COUNT(*) FROM vacantes v WHERE v.id_empresa = x.id AND v.estado::text = 'abierta') AS vacantes_abiertas,
               {_relacion_sql(lado)} AS relacion
        FROM empresas x
        WHERE x.estado = 'aprobado' AND (COALESCE(x.nombre_comercial, x.razon_social) ILIKE :q OR x.razon_social ILIKE :q)
          AND (CAST(:ciudad AS text) IS NULL OR x.ciudad = CAST(:ciudad AS text))
          AND (CAST(:sector AS text) IS NULL OR x.sector_economico = CAST(:sector AS text))
          AND (NOT :abiertas OR EXISTS (SELECT 1 FROM vacantes v WHERE v.id_empresa = x.id AND v.estado::text = 'abierta'))
        ORDER BY 2 LIMIT 30"""), params)).fetchall()
    return [{"id": str(r[0]), "nombre": r[1], "detalle": " · ".join(p for p in (r[2], r[3]) if p), "sector": r[2], "ciudad": r[3],
             "vacantes_abiertas": int(r[4] or 0), "relacion": r[5]} for r in rows]


async def filtros_contrapartes(session: AsyncSession, lado: str) -> Dict[str, List[str]]:
    """Valores reales para los filtros: ciudades (y sectores, si la contraparte es una empresa) de las entidades aprobadas."""
    tabla = "instituciones" if lado == "empresa" else "empresas"  # fijo: no viene del usuario
    ciudades = [r[0] for r in (await session.execute(text(
        f"SELECT DISTINCT ciudad FROM {tabla} WHERE estado = 'aprobado' AND ciudad IS NOT NULL ORDER BY ciudad"))).fetchall()]
    sectores: List[str] = []
    if lado != "empresa":
        sectores = [r[0] for r in (await session.execute(text(
            "SELECT DISTINCT sector_economico FROM empresas WHERE estado = 'aprobado' AND sector_economico IS NOT NULL ORDER BY sector_economico"))).fetchall()]
    return {"ciudades": ciudades, "sectores": sectores}


# ───────────────────────────────────────────────────────────── acciones
async def _correo_y_nombre(session: AsyncSession, lado: str, entidad: uuid.UUID) -> Tuple[Optional[str], str, str]:
    """(correo de contacto, nombre de quien recibe, nombre de la entidad)."""
    if lado == "empresa":
        r = (await session.execute(text("SELECT correo_contacto, persona_contacto, COALESCE(nombre_comercial, razon_social) FROM empresas WHERE id = :i"), {"i": entidad})).one()
    else:
        r = (await session.execute(text("SELECT correo_institucional, nombre_rector, nombre_oficial FROM instituciones WHERE id = :i"), {"i": entidad})).one()
    return r[0], r[1] or "", r[2]


async def _avisar(session: AsyncSession, receptor: str, id_receptor: uuid.UUID, kind: str, **data) -> None:
    quien = data.get("contraparte") or "La otra parte"
    if kind == "convenio_propuesta":
        titulo, mensaje = "Nueva propuesta de convenio", f"{quien} te propone un convenio de {data.get('tipo')}."
    else:
        resultado = "aceptó" if data.get("accion") == "aceptar" else "rechazó"
        titulo, mensaje = f"Tu propuesta de convenio fue {'aceptada' if resultado == 'aceptó' else 'rechazada'}", f"{quien} {resultado} tu propuesta de convenio."
        if data.get("mensaje"):
            mensaje += f" {data['mensaje']}"
    destinatarios = await (avisos.de_empresa(session, id_receptor) if receptor == "empresa" else avisos.de_institucion(session, id_receptor))
    await avisos.notificar(session, destinatarios, kind, titulo, mensaje,
                           "/empresa/admin/convenios" if receptor == "empresa" else "/institucion/empresas/solicitudes", commit=True)
    try:
        correo, nombre, _ = await _correo_y_nombre(session, receptor, id_receptor)
        if correo:
            await send_vincula_email(kind, correo, nombre=nombre, **data)
    except Exception as exc:  # noqa: BLE001  el aviso no debe deshacer la propuesta ya guardada
        logger.warning("Aviso de convenio no enviado: tipo=%s", type(exc).__name__)


async def proponer(session: AsyncSession, lado: str, entidad: str, id_contraparte: str, tipo: str, vacantes: int,
                   anos: int, programas: List[str], mensaje: Optional[str], detalle: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if tipo not in TIPOS:
        raise HTTPException(status_code=422, detail="Tipo de convenio inválido.")
    d = detalle or {}
    modalidad, remuneracion = d.get("modalidad") or None, d.get("remuneracion") or None
    compromisos = [c for c in dict.fromkeys(d.get("compromisos") or [])]
    if (modalidad and modalidad not in MODALIDADES) or (remuneracion and remuneracion not in REMUNERACIONES) \
            or any(c not in COMPROMISOS for c in compromisos):
        raise HTTPException(status_code=422, detail="Las condiciones del convenio no son válidas.")
    responsable_nombre = (d.get("responsable_nombre") or "").strip()[:150] or None
    responsable_contacto = (d.get("responsable_contacto") or "").strip()[:200] or None
    mia, otra = _uuid(entidad), _uuid(id_contraparte)
    id_empresa, id_ies = (mia, otra) if lado == "empresa" else (otra, mia)

    ok = (await session.execute(text("""
        SELECT (SELECT estado::text FROM empresas WHERE id = :e), (SELECT estado::text FROM instituciones WHERE id = :i)"""),
        {"e": id_empresa, "i": id_ies})).one()
    if ok[0] != "aprobado" or ok[1] != "aprobado":
        raise HTTPException(status_code=422, detail="Solo se pueden proponer convenios entre empresas e instituciones con cuenta aprobada.")
    vigente = (await session.execute(text("""
        SELECT 1 FROM convenios_interinstitucionales WHERE id_empresa = :e AND id_institucion = :i
        AND estado = 'activo' AND fecha_vencimiento >= CURRENT_DATE"""), {"e": id_empresa, "i": id_ies})).first()
    if vigente:
        raise HTTPException(status_code=409, detail="Ya existe un convenio vigente entre estas dos partes.")

    try:
        nueva = (await session.execute(text("""
            INSERT INTO solicitudes_convenio_ies (id_empresa, id_institucion, tipo_convenio, vacantes_proyectadas, duracion_anos,
                                                  programas_objetivo, mensaje, iniciada_por, estado, modalidad_trabajo, remuneracion,
                                                  compromisos, responsable_nombre, responsable_contacto)
            VALUES (:e, :i, :t, :v, :a, :p, :m, :lado, 'pendiente', :mod, :rem, :comp, :rn, :rc) RETURNING id"""),
            {"e": id_empresa, "i": id_ies, "t": tipo, "v": vacantes, "a": anos, "p": programas, "m": (mensaje or "").strip() or None, "lado": lado,
             "mod": modalidad, "rem": remuneracion, "comp": compromisos, "rn": responsable_nombre, "rc": responsable_contacto})).scalar()
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Ya hay una propuesta abierta entre estas dos partes. Espera su respuesta o retírala.") from None

    _, _, mi_nombre = await _correo_y_nombre(session, lado, mia)
    await _avisar(session, "ies" if lado == "empresa" else "empresa", otra, "convenio_propuesta", contraparte=mi_nombre, tipo=tipo,
                  vacantes=vacantes, anos=anos, mensaje=(mensaje or "").strip())
    return {"id": str(nueva), "estado": "pendiente"}


async def responder(session: AsyncSession, lado: str, entidad: str, id_propuesta: str, accion: str, notas: Optional[str]) -> Dict[str, Any]:
    """aceptar / rechazar (la parte que recibió) o retirar (la que propuso)."""
    if accion not in ("aceptar", "rechazar", "retirar"):
        raise HTTPException(status_code=422, detail="Acción inválida.")
    notas = (notas or "").strip() or None
    if accion == "rechazar" and not notas:
        raise HTTPException(status_code=422, detail="Para rechazar escribe el motivo: la otra parte lo verá.")
    mia, pid = _uuid(entidad), _uuid(id_propuesta)
    columna = "id_empresa" if lado == "empresa" else "id_institucion"
    p = (await session.execute(text(f"""
        SELECT id_empresa, id_institucion, estado, iniciada_por, tipo_convenio, duracion_anos FROM solicitudes_convenio_ies
        WHERE id = :p AND {columna} = :m FOR UPDATE"""), {"p": pid, "m": mia})).one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada.")
    if p[2] not in ABIERTAS:
        raise HTTPException(status_code=409, detail="Esta propuesta ya fue resuelta.")
    soy_quien_propuso = not puede_responder(p[3], lado)
    if accion == "retirar" and not soy_quien_propuso:
        raise HTTPException(status_code=403, detail="Solo quien envió la propuesta puede retirarla.")
    if accion in ("aceptar", "rechazar") and soy_quien_propuso:
        raise HTTPException(status_code=403, detail="Tu propia propuesta la responde la otra parte; si quieres cancelarla, retírala.")

    nuevo = {"aceptar": "aprobada", "rechazar": "rechazada", "retirar": "retirada"}[accion]
    id_convenio = None
    if accion == "aceptar":
        hoy = date.today()
        id_convenio = (await session.execute(text("""
            INSERT INTO convenios_interinstitucionales (id_empresa, id_institucion, codigo_convenio, modalidad, fecha_inicio, fecha_vencimiento, estado)
            VALUES (:e, :i, :c, CAST(:m AS modalidad_convenio_enum), :ini, :fin, 'activo') RETURNING id"""),
            {"e": p[0], "i": p[1], "c": f"CONV-{hoy.year}-{uuid.uuid4().hex[:6].upper()}", "m": p[4], "ini": hoy,
             "fin": hoy + timedelta(days=365 * max(1, p[5] or 1))})).scalar()
    await session.execute(text("""UPDATE solicitudes_convenio_ies SET estado = :e, notas_evaluador = :n, revisado_en = now(), id_convenio = :c
                                  WHERE id = :p"""), {"e": nuevo, "n": notas, "c": id_convenio, "p": pid})
    await session.commit()

    if accion != "retirar":
        otra = p[1] if lado == "empresa" else p[0]  # avisa a quien propuso
        _, _, mi_nombre = await _correo_y_nombre(session, lado, mia)
        await _avisar(session, p[3], otra, "convenio_respuesta", contraparte=mi_nombre, accion=accion, mensaje=notas or "")
    return {"id": str(pid), "estado": nuevo, "id_convenio": str(id_convenio) if id_convenio else None}


async def convenios_vigentes_de_empresa(session: AsyncSession, id_empresa: str) -> List[Dict[str, Any]]:
    """Convenios vigentes con los que una empresa puede publicar vacantes exclusivas."""
    rows = (await session.execute(text("""
        SELECT c.id, i.nombre_oficial, c.fecha_vencimiento FROM convenios_interinstitucionales c JOIN instituciones i ON i.id = c.id_institucion
        WHERE c.id_empresa = :e AND c.estado = 'activo' AND c.fecha_vencimiento >= CURRENT_DATE ORDER BY i.nombre_oficial"""),
        {"e": _uuid(id_empresa)})).fetchall()
    return [{"id": str(r[0]), "institucion": r[1], "vence": r[2]} for r in rows]


async def validar_convenio_de_empresa(session: AsyncSession, id_empresa: uuid.UUID, id_convenio: Optional[str]) -> uuid.UUID:
    """El convenio debe ser de la empresa y estar vigente; si no, la vacante no puede ser exclusiva de él."""
    try:
        cid = uuid.UUID(str(id_convenio))
    except ValueError:
        raise HTTPException(status_code=422, detail={"codigo": "CONVENIO_INVALIDO", "mensaje": "Convenio inválido."}) from None
    ok = (await session.execute(text("""
        SELECT 1 FROM convenios_interinstitucionales WHERE id = :c AND id_empresa = :e AND estado = 'activo' AND fecha_vencimiento >= CURRENT_DATE"""),
        {"c": cid, "e": id_empresa})).first()
    if not ok:
        raise HTTPException(status_code=422, detail={"codigo": "CONVENIO_NO_VIGENTE",
                                                      "mensaje": "Ese convenio no existe, no es de tu empresa o ya no está vigente."})
    return cid
