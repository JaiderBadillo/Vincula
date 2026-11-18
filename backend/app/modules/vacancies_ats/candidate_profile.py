"""
Perfil del candidato tal como lo ve el reclutador de la empresa a la que se postuló.

Todo sale de registros reales del egresado (tablas de perfil y el perfil adicional que él edita) y se
compara con lo que pide la vacante. Lo que el egresado no llenó queda vacío; nada se inventa. Respeta su
decisión de no compartir la aspiración salarial.
"""

import re
import uuid
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.skills_taxonomy import normalize_text
from app.integrations.supabase_storage import SupabaseStorageService

_URL = re.compile(r"https?://[^\s<>\"']{3,300}")


def _url(value: Any) -> Optional[str]:
    value = str(value or "").strip()
    return value if _URL.fullmatch(value) else None  # solo http(s): el enlace se pinta como <a href>


def _num(value: Any) -> Optional[float]:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    return n if n > 0 else None


def _items(value: Any) -> List[Dict[str, Any]]:
    return [x for x in value if isinstance(x, dict)] if isinstance(value, list) else []


def build_profile(egresado: Dict[str, Any], tablas: Dict[str, List[Dict[str, Any]]], extra: Dict[str, Any],
                  vacante: Dict[str, Any], requeridas: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Une tablas y perfil adicional (el egresado puede haber llenado uno u otro) y lo compara con la vacante."""
    extra = extra if isinstance(extra, dict) else {}
    prefs = extra.get("preferences") if isinstance(extra.get("preferences"), dict) else {}

    habilidades, vistas = [], set()
    for h in tablas["competencias"] + [{"nombre": s.get("name"), "nivel": s.get("level"), "tipo": s.get("type"), "validada": False}
                                       for s in _items(extra.get("skills"))]:
        nombre = str(h.get("nombre") or "").strip()
        clave = normalize_text(nombre)
        if nombre and clave not in vistas:
            vistas.add(clave)
            habilidades.append({"nombre": nombre, "nivel": h.get("nivel"), "tipo": h.get("tipo"), "validada": bool(h.get("validada"))})

    idiomas = [{"nombre": i["nombre"], "nivel": i["nivel"]} for i in tablas["idiomas"]] + [
        {"nombre": l.get("name"), "nivel": l.get("level")} for l in _items(extra.get("languages")) if l.get("name")]

    experiencias = list(tablas["experiencias"]) + [
        {"cargo": e.get("role"), "empresa": e.get("company"), "inicio": e.get("start"), "fin": e.get("end"),
         "actual": bool(e.get("current")), "descripcion": e.get("description")}
        for e in _items(extra.get("experience")) if e.get("role") or e.get("company")]

    formacion = [{"titulo": e.get("degree"), "institucion": e.get("institution"), "anio": e.get("year"), "tipo": e.get("type")}
                 for e in _items(extra.get("otherEducation")) if e.get("degree")]

    links = extra.get("links") if isinstance(extra.get("links"), dict) else {}
    enlaces = {"linkedin": _url(tablas["enlaces"].get("linkedin") or links.get("linkedin")),
               "github": _url(tablas["enlaces"].get("github") or links.get("github")),
               "portafolio": _url(tablas["enlaces"].get("portafolio") or links.get("portfolio"))}

    # Aspiración salarial: el egresado decide si la comparte (si nunca configuró esa opción, se muestra)
    comparte = bool(prefs["showSalary"]) if "showSalary" in prefs else True
    asp_min = _num(prefs.get("salaryMin")) or _num(egresado.get("aspiracion_min"))
    asp_max = _num(prefs.get("salaryMax")) or _num(egresado.get("aspiracion_max"))
    oferta_min, oferta_max = (None, None) if vacante["salario_confidencial"] else (_num(vacante["salario_min"]), _num(vacante["salario_max"]))
    encaje = None
    if comparte and asp_min and oferta_max:
        encaje = "supera_oferta" if asp_min > oferta_max else "compatible"

    tiene = {normalize_text(h["nombre"]) for h in habilidades}
    return {
        "titular": egresado.get("titular"), "biografia": egresado.get("biografia"),
        "ciudad": egresado.get("ciudad"), "departamento": egresado.get("departamento"),
        "disponibilidad": {"disponible": bool(egresado.get("disponible")), "tipo": egresado.get("tipo_disponibilidad") or prefs.get("availability"),
                           "reubicarse": bool(egresado.get("reubicarse") or prefs.get("relocate")),
                           "modalidades": list(prefs.get("modes") or []), "contratos": list(prefs.get("contracts") or []),
                           "ciudades": list(prefs.get("cities") or [])},
        "salario": {"aspiracion_compartida": comparte, "aspiracion_min": asp_min if comparte else None, "aspiracion_max": asp_max if comparte else None,
                    "oferta_min": oferta_min, "oferta_max": oferta_max, "oferta_confidencial": bool(vacante["salario_confidencial"]),
                    "encaje": encaje},
        "condiciones_vacante": {"modalidad": vacante["modalidad"], "contrato": vacante["tipo_contrato"],
                                "jornada": vacante["jornada"], "experiencia": vacante["experiencia"]},
        "requeridas": [{"nombre": r["nombre"], "obligatoria": bool(r["obligatoria"]), "tiene": normalize_text(r["nombre"]) in tiene}
                       for r in requeridas],
        "habilidades": habilidades, "idiomas": idiomas, "experiencias": experiencias, "otra_formacion": formacion, "enlaces": enlaces,
        "hojas_de_vida": tablas["hojas_de_vida"],
    }


async def candidate_profile_async(session: AsyncSession, id_postulacion: str, company_id: Optional[str]) -> Dict[str, Any]:
    no_existe = HTTPException(status_code=404, detail={"codigo": "POSTULACION_NO_ENCONTRADA", "mensaje": "Postulación no encontrada."})
    try:
        pid, cid = uuid.UUID(str(id_postulacion)), uuid.UUID(str(company_id))
    except (ValueError, TypeError):
        raise no_existe from None

    # La postulación debe ser de una vacante de la empresa de quien consulta
    base = (await session.execute(text("""
        SELECT po.id_egresado, v.id, v.salario_minimo, v.salario_maximo, v.salario_es_confidencial, v.modalidad::text,
               v.tipo_contrato, v.jornada_laboral, v.nivel_experiencia
        FROM postulaciones po JOIN vacantes v ON v.id = po.id_vacante
        WHERE po.id = :pid AND v.id_empresa = :cid"""), {"pid": pid, "cid": cid})).one_or_none()
    if base is None:
        raise no_existe
    eid, vid = base[0], base[1]

    async def rows(sql: str, **params):
        return (await session.execute(text(sql), params)).fetchall()

    e = (await rows("""SELECT titular_profesional, biografia, ciudad_residencia, departamento_residencia, disponible_para_trabajar,
                       tipo_disponibilidad, dispuesto_a_reubicarse, aspiracion_salarial_min, aspiracion_salarial_max, perfil_adicional
                       FROM egresados WHERE id = :e""", e=eid))[0]
    tablas = {
        "competencias": [{"nombre": r[0], "tipo": r[1], "nivel": r[2], "validada": r[3]} for r in await rows(
            """SELECT t.nombre, t.categoria::text, ce.nivel_dominio, ce.validada_por_pensum FROM competencias_egresado ce
               JOIN taxonomia_competencias t ON t.id = ce.id_competencia WHERE ce.id_egresado = :e ORDER BY t.nombre""", e=eid)],
        "idiomas": [{"nombre": r[0], "nivel": r[1]} for r in await rows(
            "SELECT nombre_idioma, nivel_marco_europeo FROM idiomas_egresado WHERE id_egresado = :e", e=eid)],
        "experiencias": [{"cargo": r[0], "empresa": r[1], "inicio": r[2].isoformat() if r[2] else None, "fin": r[3].isoformat() if r[3] else None,
                          "actual": r[4], "descripcion": r[5]} for r in await rows(
            """SELECT cargo, empresa, fecha_inicio, fecha_fin, es_trabajo_actual, descripcion_funciones
               FROM experiencias_laborales_egresado WHERE id_egresado = :e ORDER BY fecha_inicio DESC""", e=eid)],
        "enlaces": dict(zip(("linkedin", "github", "portafolio"), (await rows(
            "SELECT url_linkedin, url_github, url_portafolio FROM enlaces_egresado WHERE id_egresado = :e", e=eid) or [(None,) * 3])[0])),
        "hojas_de_vida": [{"nombre": r[0], "principal": r[1]} for r in await rows(
            "SELECT nombre_archivo, es_predeterminado FROM archivos_hoja_vida WHERE id_egresado = :e ORDER BY es_predeterminado DESC", e=eid)],
    }
    requeridas = [{"nombre": r[0], "obligatoria": r[1]} for r in await rows(
        """SELECT t.nombre, c.es_obligatoria FROM competencias_exigidas_vacante c
           JOIN taxonomia_competencias t ON t.id = c.id_competencia WHERE c.id_vacante = :v ORDER BY c.es_obligatoria DESC, t.nombre""", v=vid)]

    egresado = {"titular": e[0], "biografia": e[1], "ciudad": e[2], "departamento": e[3], "disponible": e[4], "tipo_disponibilidad": e[5],
                "reubicarse": e[6], "aspiracion_min": e[7], "aspiracion_max": e[8]}
    vacante = {"salario_min": base[2], "salario_max": base[3], "salario_confidencial": base[4], "modalidad": base[5],
               "tipo_contrato": base[6], "jornada": base[7], "experiencia": base[8]}
    return build_profile(egresado, tablas, e[9] or {}, vacante, requeridas)


PRIVATE_CV_BUCKET = "vincula-hojas-de-vida"  # el mismo bucket privado donde el egresado sube su hoja de vida


async def candidate_cv_url_async(session: AsyncSession, id_postulacion: str, company_id: Optional[str], expires_in: int = 900) -> Dict[str, Any]:
    """URL temporal de la hoja de vida principal del candidato, solo para la empresa a la que se postuló."""
    no_existe = HTTPException(status_code=404, detail={"codigo": "POSTULACION_NO_ENCONTRADA", "mensaje": "Postulación no encontrada."})
    try:
        pid, cid = uuid.UUID(str(id_postulacion)), uuid.UUID(str(company_id))
    except (ValueError, TypeError):
        raise no_existe from None
    cv = (await session.execute(text("""
        SELECT h.nombre_archivo, h.url_archivo FROM postulaciones po
        JOIN vacantes v ON v.id = po.id_vacante
        JOIN archivos_hoja_vida h ON h.id_egresado = po.id_egresado
        WHERE po.id = :pid AND v.id_empresa = :cid
        ORDER BY h.es_predeterminado DESC, h.subido_en DESC LIMIT 1"""), {"pid": pid, "cid": cid})).one_or_none()
    if cv is None:
        exists = (await session.execute(text("""SELECT 1 FROM postulaciones po JOIN vacantes v ON v.id = po.id_vacante
                                                WHERE po.id = :pid AND v.id_empresa = :cid"""), {"pid": pid, "cid": cid})).first()
        if not exists:
            raise no_existe
        raise HTTPException(status_code=404, detail={"codigo": "SIN_HOJA_DE_VIDA", "mensaje": "El egresado aún no ha cargado una hoja de vida."})
    nombre, url = cv
    prefix = f"/storage/v1/object/public/{PRIVATE_CV_BUCKET}/"
    if prefix in url:
        url = await SupabaseStorageService.create_signed_url(PRIVATE_CV_BUCKET, url.split(prefix, 1)[1], expires_in=expires_in)
    return {"nombre_archivo": nombre, "url_segura": url, "expira_en_segundos": expires_in}
