"""
Moderación: reportes de vacantes de los usuarios y acciones del administrador de Vincula
(inhabilitar vacantes, suspender cuentas y empresas). Cada acción queda en `acciones_moderacion`.
"""

import logging
import uuid
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import restore_sessions, revoke_sessions
from app.integrations.transactional_notifications import send_vincula_email
from app.modules.moderation.schemas import MOTIVO_ETIQUETA, ReportRequest

logger = logging.getLogger(__name__)

MAX_REPORTES_POR_DIA = 10
LIMITE_REPORTES_LISTADO = 300


def _error(code: int, codigo: str, mensaje: str) -> HTTPException:
    return HTTPException(status_code=code, detail={"codigo": codigo, "mensaje": mensaje})


def _uuid(value: str, codigo: str = "ID_INVALIDO") -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError:
        raise _error(404, codigo, "El recurso no existe.") from None


async def _registrar(session: AsyncSession, tipo: str, id_entidad, accion: str, motivo: str, id_admin) -> None:
    await session.execute(text("""
        INSERT INTO acciones_moderacion (id, tipo_entidad, id_entidad, accion, motivo, id_admin)
        VALUES (:id, :tipo, :ent, :acc, :mot, :adm)"""),
        {"id": uuid.uuid4(), "tipo": tipo, "ent": id_entidad, "acc": accion, "mot": motivo, "adm": _uuid(id_admin)})


# ----------------------------------------------------------------------------- reportes de usuarios

async def report_vacancy(session: AsyncSession, user: Dict[str, Any], vacancy_id: str, payload: ReportRequest) -> Dict[str, str]:
    vid, uid = _uuid(vacancy_id, "VACANTE_NO_ENCONTRADA"), _uuid(user["sub"])
    estado = (await session.execute(text("SELECT estado::text FROM vacantes WHERE id = :v"), {"v": vid})).scalar()
    if estado not in ("abierta", "pausada"):
        raise _error(404, "VACANTE_NO_ENCONTRADA", "La vacante no está disponible.")
    recientes = (await session.execute(text(
        "SELECT count(*) FROM reportes_vacante WHERE id_reportante = :u AND creado_en > now() - interval '24 hours'"),
        {"u": uid})).scalar() or 0
    if recientes >= MAX_REPORTES_POR_DIA:
        raise _error(429, "LIMITE_DE_REPORTES", "Alcanzaste el límite diario de reportes. Intenta mañana.")
    creado = (await session.execute(text("""
        INSERT INTO reportes_vacante (id, id_vacante, id_reportante, motivo, detalle)
        VALUES (:id, :v, :u, :m, :d)
        ON CONFLICT (id_vacante, id_reportante) DO NOTHING
        RETURNING id"""),
        {"id": uuid.uuid4(), "v": vid, "u": uid, "m": payload.motivo, "d": payload.detalle or None})).first()
    if creado is None:
        raise _error(409, "YA_REPORTADA", "Ya reportaste esta vacante; el equipo de Vincula la está revisando.")
    await session.commit()
    return {"mensaje": "Gracias. Recibimos tu reporte y el equipo de Vincula lo revisará."}


async def list_reports(session: AsyncSession, estado: str) -> Dict[str, Any]:
    """Reportes agrupados por vacante, la más reportada recientemente primero."""
    if estado not in ("pendiente", "resuelto", "descartado", "todos"):
        raise _error(400, "ESTADO_INVALIDO", "Estado inválido. Opciones: pendiente, resuelto, descartado, todos.")
    rows = (await session.execute(text("""
        SELECT r.id, r.id_vacante, r.motivo, r.detalle, r.estado, r.resolucion, r.nota_admin, r.creado_en,
               u.correo_electronico, u.rol::text,
               v.titulo, v.codigo_vacante, v.estado::text, v.id_empresa, COALESCE(e.nombre_comercial, e.razon_social)
        FROM reportes_vacante r
        JOIN vacantes v ON v.id = r.id_vacante
        JOIN empresas e ON e.id = v.id_empresa
        JOIN usuarios u ON u.id = r.id_reportante
        WHERE (:estado = 'todos' OR r.estado = :estado)
        ORDER BY r.creado_en DESC
        LIMIT :lim"""), {"estado": estado, "lim": LIMITE_REPORTES_LISTADO})).fetchall()
    grupos: Dict[str, Dict[str, Any]] = {}
    for (rid, vid, motivo, detalle, est, resolucion, nota, creado, correo, rol,
         titulo, codigo, est_vac, id_empresa, empresa) in rows:
        g = grupos.setdefault(str(vid), {
            "id_vacante": str(vid), "titulo": titulo, "codigo_vacante": codigo, "estado_vacante": est_vac,
            "id_empresa": str(id_empresa), "empresa": empresa, "total_reportes": 0,
            "ultimo_reporte": creado.isoformat(), "motivos": {}, "reportes": [],
        })
        g["total_reportes"] += 1
        g["motivos"][motivo] = g["motivos"].get(motivo, 0) + 1
        g["reportes"].append({
            "id": str(rid), "motivo": motivo, "motivo_etiqueta": MOTIVO_ETIQUETA.get(motivo, motivo),
            "detalle": detalle, "estado": est, "resolucion": resolucion, "nota_admin": nota,
            "creado_en": creado.isoformat(), "reportante": correo, "rol_reportante": rol,
        })
    items = list(grupos.values())  # ya ordenados por el reporte más reciente de cada vacante
    return {"items": items, "total_vacantes": len(items), "total_reportes": len(rows)}


async def dismiss_reports(session: AsyncSession, admin: Dict[str, Any], vacancy_id: str, nota: Optional[str]) -> Dict[str, str]:
    vid = _uuid(vacancy_id, "VACANTE_NO_ENCONTRADA")
    cerrados = (await session.execute(text("""
        UPDATE reportes_vacante SET estado = 'descartado', resolucion = 'sin_irregularidad', nota_admin = :n,
               resuelto_por = :a, resuelto_en = now()
        WHERE id_vacante = :v AND estado = 'pendiente'"""), {"v": vid, "n": nota, "a": _uuid(admin["sub"])})).rowcount
    if not cerrados:
        raise _error(404, "SIN_REPORTES_PENDIENTES", "La vacante no tiene reportes pendientes.")
    await _registrar(session, "vacante", vid, "reportes_descartados", nota or "Sin irregularidad encontrada", admin["sub"])
    await session.commit()
    return {"mensaje": f"{cerrados} reporte(s) descartado(s)."}


# ----------------------------------------------------------------------------- vacantes

async def disable_vacancy(session: AsyncSession, admin: Dict[str, Any], vacancy_id: str, motivo: str) -> Dict[str, str]:
    vid = _uuid(vacancy_id, "VACANTE_NO_ENCONTRADA")
    fila = (await session.execute(text("""
        SELECT v.estado::text, v.titulo, v.id_reclutador_responsable, COALESCE(e.nombre_comercial, e.razon_social)
        FROM vacantes v JOIN empresas e ON e.id = v.id_empresa WHERE v.id = :v"""), {"v": vid})).first()
    if not fila:
        raise _error(404, "VACANTE_NO_ENCONTRADA", "La vacante no existe.")
    estado, titulo, id_reclutador, empresa = fila
    if estado == "inhabilitada":
        raise _error(409, "YA_INHABILITADA", "La vacante ya está inhabilitada.")
    await session.execute(text(
        "UPDATE vacantes SET estado = 'inhabilitada', actualizado_en = now() WHERE id = :v"), {"v": vid})
    await session.execute(text("""
        UPDATE reportes_vacante SET estado = 'resuelto', resolucion = 'vacante_inhabilitada', nota_admin = :n,
               resuelto_por = :a, resuelto_en = now()
        WHERE id_vacante = :v AND estado = 'pendiente'"""), {"v": vid, "n": motivo, "a": _uuid(admin["sub"])})
    await _registrar(session, "vacante", vid, "vacante_inhabilitada", motivo, admin["sub"])
    correo = (await session.execute(text("""
        SELECT u.correo_electronico FROM reclutadores_empresa r JOIN usuarios u ON u.id = r.id_usuario WHERE r.id = :r"""),
        {"r": id_reclutador})).scalar()
    await session.commit()
    await _notify_company(correo, titulo, empresa)
    return {"mensaje": "Vacante inhabilitada: ya no es visible para los egresados."}


async def _notify_company(correo: Optional[str], titulo: str, empresa: str) -> None:
    """Aviso al responsable de la vacante; si falla, la inhabilitación ya quedó registrada."""
    if not correo:
        return
    try:
        await send_vincula_email("vacante_inhabilitada", correo, vacante=titulo, empresa=empresa)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Aviso de vacante inhabilitada no enviado: tipo=%s", type(exc).__name__)


async def enable_vacancy(session: AsyncSession, admin: Dict[str, Any], vacancy_id: str, nota: Optional[str]) -> Dict[str, str]:
    """Vuelve a 'pausada': la empresa decide cuándo reabrirla, no se publica sola."""
    vid = _uuid(vacancy_id, "VACANTE_NO_ENCONTRADA")
    cambiado = (await session.execute(text(
        "UPDATE vacantes SET estado = 'pausada', actualizado_en = now() WHERE id = :v AND estado = 'inhabilitada'"),
        {"v": vid})).rowcount
    if not cambiado:
        raise _error(409, "NO_ESTA_INHABILITADA", "La vacante no está inhabilitada.")
    await _registrar(session, "vacante", vid, "vacante_rehabilitada", nota or "Rehabilitada por el administrador", admin["sub"])
    await session.commit()
    return {"mensaje": "Vacante rehabilitada en estado pausada; la empresa puede reabrirla."}


async def list_disabled_vacancies(session: AsyncSession) -> Dict[str, Any]:
    rows = (await session.execute(text("""
        SELECT v.id, v.titulo, v.codigo_vacante, v.id_empresa, COALESCE(e.nombre_comercial, e.razon_social), v.actualizado_en,
               (SELECT a.motivo FROM acciones_moderacion a
                WHERE a.tipo_entidad = 'vacante' AND a.id_entidad = v.id AND a.accion = 'vacante_inhabilitada'
                ORDER BY a.creado_en DESC LIMIT 1)
        FROM vacantes v JOIN empresas e ON e.id = v.id_empresa
        WHERE v.estado = 'inhabilitada' ORDER BY v.actualizado_en DESC LIMIT 200"""))).fetchall()
    return {"items": [{"id_vacante": str(i), "titulo": t, "codigo_vacante": c, "id_empresa": str(ie), "empresa": e,
                       "inhabilitada_en": a.isoformat(), "motivo": m} for i, t, c, ie, e, a, m in rows]}


# ----------------------------------------------------------------------------- cuentas y empresas

async def search_accounts(session: AsyncSession, q: str) -> Dict[str, Any]:
    q = (q or "").strip()
    if len(q) < 3:
        raise _error(400, "BUSQUEDA_CORTA", "Escribe al menos 3 caracteres del correo.")
    rows = (await session.execute(text("""
        SELECT u.id, u.correo_electronico, u.rol::text, u.estado::text, r.id_empresa, COALESCE(e.nombre_comercial, e.razon_social)
        FROM usuarios u
        LEFT JOIN reclutadores_empresa r ON r.id_usuario = u.id
        LEFT JOIN empresas e ON e.id = r.id_empresa
        WHERE u.correo_electronico ILIKE :q ORDER BY u.correo_electronico LIMIT 20"""),
        {"q": "%" + q.replace("%", r"\%").replace("_", r"\_") + "%"})).fetchall()
    return {"items": [{"id": str(i), "correo": c, "rol": rol, "estado": est,
                       "id_empresa": str(ie) if ie else None, "empresa": emp} for i, c, rol, est, ie, emp in rows]}


async def suspend_account(session: AsyncSession, admin: Dict[str, Any], user_id: str, motivo: str) -> Dict[str, str]:
    uid = _uuid(user_id, "CUENTA_NO_ENCONTRADA")
    fila = (await session.execute(text("SELECT rol::text, estado::text FROM usuarios WHERE id = :u"), {"u": uid})).first()
    if not fila:
        raise _error(404, "CUENTA_NO_ENCONTRADA", "La cuenta no existe.")
    if fila[0].startswith("superadmin") or str(uid) == str(admin["sub"]):
        raise _error(403, "CUENTA_PROTEGIDA", "No se puede suspender una cuenta de administración ni la propia.")
    if fila[1] == "suspendido":
        raise _error(409, "YA_SUSPENDIDA", "La cuenta ya está suspendida.")
    await session.execute(text("UPDATE usuarios SET estado = 'suspendido' WHERE id = :u"), {"u": uid})
    await _registrar(session, "usuario", uid, "cuenta_suspendida", motivo, admin["sub"])
    await session.commit()
    revoke_sessions(uid)  # corta las sesiones abiertas: el token JWT dura 24 h
    return {"mensaje": "Cuenta suspendida: no podrá iniciar sesión ni usar la plataforma."}


async def reactivate_account(session: AsyncSession, admin: Dict[str, Any], user_id: str, nota: Optional[str]) -> Dict[str, str]:
    uid = _uuid(user_id, "CUENTA_NO_ENCONTRADA")
    cambiado = (await session.execute(text(
        "UPDATE usuarios SET estado = 'activo' WHERE id = :u AND estado = 'suspendido'"), {"u": uid})).rowcount
    if not cambiado:
        raise _error(409, "NO_ESTA_SUSPENDIDA", "La cuenta no está suspendida.")
    await _registrar(session, "usuario", uid, "cuenta_reactivada", nota or "Reactivada por el administrador", admin["sub"])
    await session.commit()
    restore_sessions(uid)
    return {"mensaje": "Cuenta reactivada."}


async def suspend_company(session: AsyncSession, admin: Dict[str, Any], company_id: str, motivo: str) -> Dict[str, str]:
    """Suspende a todos los usuarios de la empresa e inhabilita sus vacantes abiertas o pausadas."""
    eid = _uuid(company_id, "EMPRESA_NO_ENCONTRADA")
    if not (await session.execute(text("SELECT 1 FROM empresas WHERE id = :e"), {"e": eid})).first():
        raise _error(404, "EMPRESA_NO_ENCONTRADA", "La empresa no existe.")
    ids = [r[0] for r in (await session.execute(text("""
        SELECT u.id FROM usuarios u JOIN reclutadores_empresa r ON r.id_usuario = u.id
        WHERE r.id_empresa = :e AND u.estado = 'activo' AND NOT (u.rol::text LIKE 'superadmin%')"""), {"e": eid})).fetchall()]
    await session.execute(text("""
        UPDATE usuarios SET estado = 'suspendido'
        WHERE id IN (SELECT id_usuario FROM reclutadores_empresa WHERE id_empresa = :e)
          AND estado = 'activo' AND NOT (rol::text LIKE 'superadmin%')"""), {"e": eid})
    vacantes = (await session.execute(text("""
        UPDATE vacantes SET estado = 'inhabilitada', actualizado_en = now()
        WHERE id_empresa = :e AND estado IN ('abierta', 'pausada')"""), {"e": eid})).rowcount
    await session.execute(text("""
        UPDATE reportes_vacante SET estado = 'resuelto', resolucion = 'empresa_suspendida', nota_admin = :n,
               resuelto_por = :a, resuelto_en = now()
        WHERE estado = 'pendiente' AND id_vacante IN (SELECT id FROM vacantes WHERE id_empresa = :e)"""),
        {"e": eid, "n": motivo, "a": _uuid(admin["sub"])})
    await _registrar(session, "empresa", eid, "empresa_suspendida", motivo, admin["sub"])
    await session.commit()
    for uid in ids:
        revoke_sessions(uid)
    return {"mensaje": f"Empresa suspendida: {len(ids)} cuenta(s) y {vacantes} vacante(s) inhabilitada(s)."}


async def reactivate_company(session: AsyncSession, admin: Dict[str, Any], company_id: str, nota: Optional[str]) -> Dict[str, str]:
    """Reactiva las cuentas; las vacantes se rehabilitan una a una, con criterio del administrador."""
    eid = _uuid(company_id, "EMPRESA_NO_ENCONTRADA")
    ids = [r[0] for r in (await session.execute(text("""
        SELECT u.id FROM usuarios u JOIN reclutadores_empresa r ON r.id_usuario = u.id
        WHERE r.id_empresa = :e AND u.estado = 'suspendido'"""), {"e": eid})).fetchall()]
    if not ids:
        raise _error(409, "SIN_CUENTAS_SUSPENDIDAS", "La empresa no tiene cuentas suspendidas.")
    await session.execute(text("""
        UPDATE usuarios SET estado = 'activo'
        WHERE id IN (SELECT id_usuario FROM reclutadores_empresa WHERE id_empresa = :e) AND estado = 'suspendido'"""), {"e": eid})
    await _registrar(session, "empresa", eid, "empresa_reactivada", nota or "Reactivada por el administrador", admin["sub"])
    await session.commit()
    for uid in ids:
        restore_sessions(uid)
    return {"mensaje": f"{len(ids)} cuenta(s) reactivadas. Rehabilita sus vacantes una a una."}


async def list_history(session: AsyncSession) -> Dict[str, Any]:
    rows = (await session.execute(text("""
        SELECT a.id, a.tipo_entidad, a.id_entidad, a.accion, a.motivo, a.creado_en, u.correo_electronico
        FROM acciones_moderacion a LEFT JOIN usuarios u ON u.id = a.id_admin
        ORDER BY a.creado_en DESC LIMIT 100"""))).fetchall()
    return {"items": [{"id": str(i), "tipo_entidad": t, "id_entidad": str(e), "accion": a, "motivo": m,
                       "creado_en": c.isoformat(), "administrador": adm} for i, t, e, a, m, c, adm in rows]}


async def load_suspended_users(session: AsyncSession) -> List[str]:
    return [str(r[0]) for r in (await session.execute(text("SELECT id FROM usuarios WHERE estado = 'suspendido'"))).fetchall()]
