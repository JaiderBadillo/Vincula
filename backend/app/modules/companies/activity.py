"""
Actividad y métricas de contratación de una empresa, calculadas con lo que ya está guardado:
vacantes, postulaciones, historial de fases, entrevistas y reclutadores.
Lo que no tiene datos se devuelve como None o lista vacía; nunca se rellena.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

BOGOTA = timezone(timedelta(hours=-5))  # Colombia no tiene horario de verano
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
RANGO = {"en_revision": 0, "preseleccionados": 1, "prueba_tecnica": 2,
         "entrevista": 3, "oferta_finalistas": 4, "contratado": 5}
ETIQUETA_FASE = {"en_revision": "En revisión", "preseleccionados": "Preseleccionados",
                 "prueba_tecnica": "Prueba técnica", "entrevista": "Entrevista",
                 "oferta_finalistas": "Oferta y finalistas", "contratado": "Contratado",
                 "descartados": "Descartado"}

CONSULTAS = {
    "vacantes": """
        SELECT v.id, v.titulo, v.estado, v.id_reclutador_responsable AS reclutador, v.publicado_en,
               c.id_institucion AS convenio_ies_id, i.nombre_corto AS convenio_ies
        FROM vacantes v
        LEFT JOIN convenios_interinstitucionales c ON c.id = v.id_convenio
        LEFT JOIN instituciones i ON i.id = c.id_institucion
        WHERE v.id_empresa = :e""",
    "postulaciones": """
        SELECT p.id, p.id_vacante, p.fase_actual, p.postulado_en, p.actualizado_en,
               g.nombre_completo AS egresado
        FROM postulaciones p
        JOIN vacantes v ON v.id = p.id_vacante
        JOIN egresados g ON g.id = p.id_egresado
        WHERE v.id_empresa = :e""",
    "historial": """
        SELECT h.id, h.id_postulacion, h.fase_anterior, h.fase_nueva, h.registrado_en,
               u.rol, r.nombre_completo AS actor
        FROM historial_fases_postulacion h
        JOIN postulaciones p ON p.id = h.id_postulacion
        JOIN vacantes v ON v.id = p.id_vacante
        LEFT JOIN usuarios u ON u.id = h.cambiado_por_usuario
        LEFT JOIN reclutadores_empresa r ON r.id_usuario = h.cambiado_por_usuario AND r.id_empresa = v.id_empresa
        WHERE v.id_empresa = :e""",
    "entrevistas": """
        SELECT t.id, t.id_postulacion, t.fecha_entrevista, t.franja_horaria, t.estado, t.creado_en,
               r.nombre_completo AS actor
        FROM entrevistas_postulacion t
        JOIN postulaciones p ON p.id = t.id_postulacion
        JOIN vacantes v ON v.id = p.id_vacante
        LEFT JOIN reclutadores_empresa r ON r.id = t.id_reclutador
        WHERE v.id_empresa = :e""",
    "reclutadores": """
        SELECT r.id, r.nombre_completo, r.url_avatar, r.estado,
               string_agg(s.nombre, ', ' ORDER BY s.nombre) AS sedes
        FROM reclutadores_empresa r
        LEFT JOIN asignacion_reclutadores_sedes a ON a.id_reclutador = r.id
        LEFT JOIN sedes_empresa s ON s.id = a.id_sede
        WHERE r.id_empresa = :e
        GROUP BY r.id""",
}


def _pct(parte: int, total: int):
    return round(parte * 100 / total, 1) if total else None


def _promedio(valores: List[int]):
    return round(sum(valores) / len(valores)) if valores else None


def calcular(vacantes, postulaciones, historial, entrevistas, reclutadores, ahora: datetime) -> Dict[str, Any]:
    hoy = ahora.astimezone(BOGOTA)
    local = lambda fecha: fecha.astimezone(BOGOTA) if fecha else None

    vacante = {v["id"]: v for v in vacantes}
    postulacion = {p["id"]: p for p in postulaciones}

    contratado_en, avance = {}, {p["id"]: RANGO.get(p["fase_actual"], 0) for p in postulaciones}
    for h in sorted(historial, key=lambda h: h["registrado_en"]):
        pid = h["id_postulacion"]
        avance[pid] = max(avance.get(pid, 0), RANGO.get(h["fase_nueva"], 0))
        if h["fase_nueva"] == "contratado":
            contratado_en[pid] = h["registrado_en"]
    for t in entrevistas:
        if t["estado"] != "cancelada":
            avance[t["id_postulacion"]] = max(avance.get(t["id_postulacion"], 0), RANGO["entrevista"])

    contratadas = [p for p in postulaciones if p["fase_actual"] == "contratado"]
    # Sin evento en el historial, la última actualización de la postulación es la fecha de contratación.
    fecha_contrato = {p["id"]: local(contratado_en.get(p["id"]) or p["actualizado_en"]) for p in contratadas}
    dias = {p["id"]: max(0, (fecha_contrato[p["id"]] - local(p["postulado_en"])).days) for p in contratadas}
    del_mes = lambda f: (f.year, f.month) == (hoy.year, hoy.month)

    abiertas = [v for v in vacantes if v["estado"] == "abierta"]
    con_postulantes = {p["id_vacante"] for p in postulaciones}

    tendencia = []
    if postulaciones:
        for atras in range(5, -1, -1):
            indice = hoy.year * 12 + hoy.month - 1 - atras
            anio, mes = indice // 12, indice % 12 + 1
            es = lambda f: (f.year, f.month) == (anio, mes)
            tendencia.append({
                "month": f"{MESES[mes - 1]} {anio}", "short": MESES[mes - 1][:3],
                "applicants": sum(es(local(p["postulado_en"])) for p in postulaciones),
                "hired": sum(es(f) for f in fecha_contrato.values()),
            })

    fuentes: Dict[str, Dict[str, Any]] = {}
    for p in postulaciones:
        v = vacante[p["id_vacante"]]
        if v["convenio_ies_id"]:
            clave, etiqueta = f"ies-{v['convenio_ies_id']}", f"Convenio con {v['convenio_ies']}"
        else:
            clave, etiqueta = "abiertas", "Convocatorias abiertas"
        fuentes.setdefault(clave, {"id": clave, "label": etiqueta, "count": 0})["count"] += 1

    equipo = []
    for r in reclutadores:
        if r["estado"] != "active":  # reclutadores_empresa guarda los estados en inglés
            continue
        suyas = {v["id"] for v in vacantes if v["reclutador"] == r["id"]}
        recibidas = [p for p in postulaciones if p["id_vacante"] in suyas]
        hechas = [p for p in recibidas if p["fase_actual"] == "contratado"]
        equipo.append({
            "recruiterId": str(r["id"]), "fullName": r["nombre_completo"], "avatar": r["url_avatar"],
            "sites": r["sedes"] or "",
            "activeVacancies": sum(v["id"] in suyas for v in abiertas),
            "screenedApplicants": sum(p["fase_actual"] != "en_revision" for p in recibidas),
            "hiresMonth": sum(del_mes(fecha_contrato[p["id"]]) for p in hechas),
            "avgDaysToFill": _promedio([dias[p["id"]] for p in hechas]),
            "effectivenessRate": round(len(hechas) * 100 / len(recibidas)) if recibidas else None,
        })

    def evento(clave, categoria, accion, detalle, fecha, actor=None, rol=None):
        return {"id": clave, "category": categoria, "action": accion, "detail": detalle,
                "user": actor, "role": rol, "at": fecha}

    def de(pid):
        p = postulacion[pid]
        return f"{p['egresado']} · {vacante[p['id_vacante']]['titulo']}"

    eventos = [evento(f"vac-{v['id']}", "vacantes", "Vacante publicada", v["titulo"], v["publicado_en"])
               for v in vacantes if v["publicado_en"]]
    eventos += [evento(f"post-{p['id']}", "postulaciones", "Postulación recibida", de(p["id"]), p["postulado_en"])
                for p in postulaciones]
    for h in historial:
        if h["fase_anterior"] is None:  # el alta ya figura como "Postulación recibida"
            continue
        hecho = h["fase_nueva"] == "contratado"
        rol = {"egresado": "Egresado", "admin_empresa": "Administración",
               "reclutador_empresa": "Reclutador"}.get(h["rol"])
        eventos.append(evento(
            f"fase-{h['id']}", "contrataciones" if hecho else "postulaciones",
            "Contratación registrada" if hecho else f"Pasó a {ETIQUETA_FASE.get(h['fase_nueva'], h['fase_nueva'])}",
            de(h["id_postulacion"]), h["registrado_en"], h["actor"] or rol, rol if h["actor"] else None))
    eventos += [evento(
        f"ent-{t['id']}", "postulaciones", "Entrevista agendada",
        f"{de(t['id_postulacion'])} · {t['fecha_entrevista']:%d/%m/%Y} {t['franja_horaria']}",
        t["creado_en"], t["actor"], "Reclutador" if t["actor"] else None) for t in entrevistas]
    eventos.sort(key=lambda e: e["at"], reverse=True)

    return {
        "metrics": {
            "openVacancies": len(abiertas),
            "applicantsTotal": len(postulaciones),
            "inReview": sum(p["fase_actual"] in ("en_revision", "preseleccionados", "prueba_tecnica") for p in postulaciones),
            "interviewing": sum(p["fase_actual"] == "entrevista" for p in postulaciones),
            "hiredMonth": sum(del_mes(f) for f in fecha_contrato.values()),
            "hiredTotal": len(contratadas),
            "conversionRate": _pct(len(contratadas), len(postulaciones)),
            "avgTimeToHireDays": _promedio(list(dias.values())),
            "vacanciesWithApplicantsPct": _pct(sum(v["id"] in con_postulantes for v in abiertas), len(abiertas)),
        },
        "funnel": {
            "applied": len(postulaciones),
            "screened": sum(avance[p["id"]] >= RANGO["preseleccionados"] for p in postulaciones),
            "interviewed": sum(avance[p["id"]] >= RANGO["entrevista"] for p in postulaciones),
            "hired": len(contratadas),
        },
        "monthlyTrend": tendencia,
        "talentSources": list(fuentes.values()),
        "recruiters": equipo,
        "log": [{**e, "at": e["at"].isoformat()} for e in eventos[:40]],
    }


async def actividad(session: AsyncSession, id_empresa) -> Dict[str, Any]:
    datos = {nombre: (await session.execute(text(sql), {"e": id_empresa})).mappings().all()
             for nombre, sql in CONSULTAS.items()}
    return calcular(**datos, ahora=datetime.now(timezone.utc))
