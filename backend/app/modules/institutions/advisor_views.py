"""
Datos reales para las vistas del asesor IES: panel, seguimiento de egresados y empresas, convenios.

Todo sale de registros de Vincula; lo que no existe se devuelve vacío o None, nunca estimado.
"""

from collections import defaultdict
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.ai_engine.outcomes_service import EMBUDO, ORDEN
from app.modules.institutions.placement_stats import _SIN_TITULO_SUPERIOR, placement_stats_async

ETIQUETA_FASE = {**dict(EMBUDO), "descartados": "Descartado"}

# egresados de la IES (título más alto), reutilizado por las consultas de abajo
_EGRESADOS_IES = f"""
    SELECT a.id_egresado FROM academicos_egresado a
    JOIN programas_academicos p ON p.id = a.id_programa
    WHERE p.id_institucion = CAST(:iid AS uuid) AND a.estado_verificacion <> 'rechazado' AND {_SIN_TITULO_SUPERIOR}
"""


def _fase(nombre: str) -> Dict[str, Any]:
    return {"fase": nombre, "etiqueta": ETIQUETA_FASE.get(nombre, nombre), "orden": ORDEN.get(nombre, -1)}


# ───────────────────────────────────────────────────────────── panel
async def panel_async(session: AsyncSession, iid: str) -> Dict[str, Any]:
    p = {"iid": iid}
    colocacion = await placement_stats_async(session, iid)

    async def uno(sql: str) -> int:
        return (await session.execute(text(sql), p)).scalar() or 0

    nuevos_mes = await uno(f"""SELECT COUNT(DISTINCT a.id_egresado) FROM academicos_egresado a
        JOIN programas_academicos pr ON pr.id = a.id_programa
        WHERE pr.id_institucion = CAST(:iid AS uuid) AND a.creado_en >= date_trunc('month', now())""")
    vacantes = (await session.execute(text("""
        SELECT COUNT(DISTINCT v.id), COUNT(DISTINCT v.id) FILTER (WHERE v.publicado_en >= now() - interval '7 days')
        FROM vacantes v JOIN programas_afines_vacante pa ON pa.id_vacante = v.id
        JOIN programas_academicos pr ON pr.id = pa.id_programa
        WHERE pr.id_institucion = CAST(:iid AS uuid) AND v.estado = 'abierta'"""), p)).one()
    contrataciones_mes = await uno(f"""SELECT COUNT(DISTINCT po.id_egresado) FROM postulaciones po
        WHERE po.fase_actual = 'contratado' AND po.actualizado_en >= now() - interval '30 days'
          AND po.id_egresado IN ({_EGRESADOS_IES})""")
    postulando = await uno(f"""SELECT COUNT(DISTINCT po.id_egresado) FROM postulaciones po
        WHERE po.fase_actual NOT IN ('contratado', 'descartados') AND po.id_egresado IN ({_EGRESADOS_IES})""")
    pendientes = await solicitudes_convenio_async(session, iid, "pendiente", limite=5)

    return {"resumen": colocacion["resumen"], "facultades": colocacion["facultades"], "egresados_nuevos_mes": nuevos_mes,
            "vacantes_abiertas": vacantes[0], "vacantes_nuevas_semana": vacantes[1],
            "contrataciones_mes": contrataciones_mes, "postulando": postulando,
            "convenios_pendientes": pendientes["total"], "convenios_recientes": pendientes["items"]}


# ───────────────────────────────────────────────────────────── seguimiento de egresados
async def seguimiento_egresados_async(session: AsyncSession, iid: str) -> Dict[str, Any]:
    p = {"iid": iid}
    egresados = (await session.execute(text(f"""
        SELECT DISTINCT ON (e.id) e.id, e.nombre_completo, e.correo_personal, pr.nombre, f.nombre, a.ano_graduacion,
               a.periodo_graduacion, s.nombre
        FROM academicos_egresado a
        JOIN egresados e ON e.id = a.id_egresado
        JOIN programas_academicos pr ON pr.id = a.id_programa
        JOIN facultades f ON f.id = pr.id_facultad
        LEFT JOIN sedes_institucion s ON s.id = a.id_sede
        WHERE pr.id_institucion = CAST(:iid AS uuid) AND a.estado_verificacion <> 'rechazado' AND {_SIN_TITULO_SUPERIOR}
        ORDER BY e.id, a.ano_graduacion DESC"""), p)).fetchall()
    posts = (await session.execute(text(f"""
        SELECT po.id_egresado, v.titulo, e.nombre_comercial, po.fase_actual::text, po.postulado_en, po.actualizado_en,
               po.porcentaje_afinidad, v.tipo_contrato, v.modalidad::text
        FROM postulaciones po JOIN vacantes v ON v.id = po.id_vacante JOIN empresas e ON e.id = v.id_empresa
        WHERE po.id_egresado IN ({_EGRESADOS_IES}) ORDER BY po.postulado_en DESC"""), p)).fetchall()

    por_egresado = defaultdict(list)
    for eid, vacante, empresa, fase, postulado, actualizado, afinidad, contrato, modalidad in posts:
        por_egresado[eid].append({"vacante": vacante, "empresa": empresa, **_fase(fase), "postulado_en": postulado,
                                  "actualizado_en": actualizado, "afinidad": float(afinidad) if afinidad is not None else None,
                                  "tipo_contrato": contrato, "modalidad": modalidad})
    items = []
    for eid, nombre, correo, programa, facultad, ano, periodo, sede in egresados:
        postulaciones = por_egresado.get(eid, [])
        contratacion = next((x for x in postulaciones if x["fase"] == "contratado"), None)
        items.append({"id": str(eid), "nombre": nombre, "correo": correo, "programa": programa, "facultad": facultad,
                      "ano_graduacion": ano, "periodo": periodo or str(ano), "sede": sede,
                      "estado": "contratado" if contratacion else "en_busqueda",
                      "contratacion": contratacion, "postulaciones": postulaciones})
    items.sort(key=lambda x: x["nombre"])
    return {"items": items}


# ───────────────────────────────────────────────────────────── seguimiento de empresas
async def seguimiento_empresas_async(session: AsyncSession, iid: str) -> Dict[str, Any]:
    """Empresas con vacantes dirigidas a programas de la IES y qué ha pasado con los egresados en ellas."""
    filas = (await session.execute(text(f"""
        SELECT e.id, e.nombre_comercial, e.sector_economico, e.ciudad, v.id, v.estado::text, po.fase_actual::text, po.id_egresado,
               (SELECT c.estado::text FROM convenios_interinstitucionales c
                 WHERE c.id_empresa = e.id AND c.id_institucion = CAST(:iid AS uuid) ORDER BY c.creado_en DESC LIMIT 1)
        FROM vacantes v JOIN empresas e ON e.id = v.id_empresa
        LEFT JOIN postulaciones po ON po.id_vacante = v.id AND po.id_egresado IN ({_EGRESADOS_IES})
        WHERE v.id IN (SELECT pa.id_vacante FROM programas_afines_vacante pa
                       JOIN programas_academicos pr ON pr.id = pa.id_programa WHERE pr.id_institucion = CAST(:iid AS uuid))
          AND v.estado <> 'borrador'"""), {"iid": iid})).fetchall()

    empresas: Dict[Any, Dict[str, Any]] = {}
    for eid, nombre, sector, ciudad, vid, vestado, fase, egresado, convenio in filas:
        e = empresas.setdefault(eid, {"id": str(eid), "nombre": nombre, "sector": sector, "ciudad": ciudad,
                                      "convenio": convenio, "vacantes": set(), "abiertas": set(), "fases": [], "egresados": set()})
        e["vacantes"].add(vid)
        if vestado == "abierta":
            e["abiertas"].add(vid)
        if fase:
            e["fases"].append(fase)
            e["egresados"].add(egresado)

    items = []
    for e in empresas.values():
        activas = [f for f in e["fases"] if f != "descartados"]
        embudo = [{"fase": f, "etiqueta": et, "postulaciones": sum(1 for x in activas if ORDEN[x] >= i)}
                  for i, (f, et) in enumerate(EMBUDO)]
        contratados = embudo[-1]["postulaciones"]
        items.append({"id": e["id"], "nombre": e["nombre"], "sector": e["sector"], "ciudad": e["ciudad"], "convenio": e["convenio"],
                      "vacantes": len(e["vacantes"]), "vacantes_abiertas": len(e["abiertas"]),
                      "egresados_postulados": len(e["egresados"]), "contratados": contratados, "embudo": embudo,
                      "tasa_contratacion": round(100 * contratados / len(e["egresados"]), 1) if e["egresados"] else None})
    items.sort(key=lambda x: (-x["contratados"], -x["vacantes_abiertas"], x["nombre"]))
    return {"items": items}


# ───────────────────────────────────────────────────────────── propuestas de convenio recibidas (el resto vive en modules/convenios)
async def solicitudes_convenio_async(session: AsyncSession, iid: str, estado: Optional[str] = None,
                                     limite: int = 200) -> Dict[str, Any]:
    filas = (await session.execute(text("""
        SELECT s.id, s.estado, s.tipo_convenio, s.vacantes_proyectadas, s.duracion_anos, s.facultades_objetivo,
               s.programas_objetivo, s.notas_evaluador, s.solicitado_en, s.revisado_en,
               e.id, e.nombre_comercial, e.nit, e.sector_economico, e.ciudad, e.persona_contacto, e.correo_contacto
        FROM solicitudes_convenio_ies s JOIN empresas e ON e.id = s.id_empresa
        WHERE s.id_institucion = CAST(:iid AS uuid) AND s.iniciada_por = 'empresa' AND (CAST(:estado AS text) IS NULL OR s.estado = CAST(:estado AS text))
        ORDER BY s.solicitado_en DESC LIMIT :lim"""), {"iid": iid, "estado": estado, "lim": limite})).fetchall()
    items = [{"id": str(r[0]), "estado": r[1], "tipo_convenio": r[2], "vacantes_proyectadas": r[3], "duracion_anos": r[4],
              "facultades": list(r[5] or []), "programas": list(r[6] or []), "notas": r[7], "solicitado_en": r[8],
              "revisado_en": r[9], "empresa": {"id": str(r[10]), "nombre": r[11], "nit": r[12], "sector": r[13], "ciudad": r[14],
                                               "contacto": r[15], "correo": r[16]}} for r in filas]
    return {"items": items, "total": len(items)}
