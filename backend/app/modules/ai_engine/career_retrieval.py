"""Recuperación para el Copiloto de Carrera: guías curadas, fragmentos del CV
y vacantes reales abiertas en Víncula afines a los programas del egresado."""

import json
import math
import re
import unicodedata
from collections import Counter
from functools import lru_cache
from pathlib import Path

from sqlalchemy import text as sql

from app.core.text_similarity import TfidfIndex
from app.modules.convenios.visibility import SQL_VISIBLE_PARA_EG

STOP = frozenset("a al como con de del el en es la las lo los mi mis para por que se su sus tu un una unas unos y yo quiero puedes ayuda dame hacer sobre este esta cual cómo".split())


def tokens(value: str) -> list[str]:
    plain = unicodedata.normalize("NFKD", value.lower())
    plain = "".join(c for c in plain if not unicodedata.combining(c))
    return [t for t in re.findall(r"[a-z0-9]+", plain) if len(t) > 2 and t not in STOP]


@lru_cache(maxsize=1)
def knowledge() -> tuple[dict, ...]:
    file = Path(__file__).with_name("career_knowledge.json")
    return tuple(json.loads(file.read_text(encoding="utf-8")))


def cv_chunks(cv_text: str, size: int = 1300) -> list[dict]:
    """Corta en límites de palabra, con pequeña superposición para no perder contexto."""
    text = re.sub(r"\s+", " ", cv_text).strip()
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        if end < len(text):
            boundary = text.rfind(" ", start + size // 2, end)
            if boundary > start:
                end = boundary
        chunks.append({"id": f"cv_{len(chunks) + 1}", "title": f"CV adjunto · fragmento {len(chunks) + 1}", "text": text[start:end]})
        if end == len(text):
            break
        start = max(start + 1, end - 120)
    return chunks


def rank_vacancy_docs(query: str, docs: list[dict], limit: int = 2, min_similarity: float = 0.1) -> list[dict]:
    """Las vacantes más parecidas a la consulta (TF-IDF + coseno); ninguna si la consulta no las toca."""
    if not docs:
        return []
    index = TfidfIndex([d["title"] + " " + d["text"] for d in docs])
    return [docs[i] for i, _ in index.best_matches(query, limit=limit, min_similarity=min_similarity)]


VACANTES_AFINES_SQL = """
    SELECT v.titulo, COALESCE(e.nombre_comercial, e.razon_social) AS empresa,
           v.modalidad::text, v.nivel_experiencia, v.descripcion, v.requisitos,
           array_remove(array_agg(DISTINCT tc.nombre || CASE WHEN cev.es_obligatoria THEN ' (obligatoria)' ELSE '' END), NULL) AS competencias
    FROM vacantes v
    JOIN empresas e ON e.id = v.id_empresa AND e.estado = 'aprobado'
    JOIN programas_afines_vacante pav ON pav.id_vacante = v.id
    JOIN academicos_egresado ae ON ae.id_programa = pav.id_programa
    JOIN egresados eg ON eg.id = ae.id_egresado
    LEFT JOIN competencias_exigidas_vacante cev ON cev.id_vacante = v.id
    LEFT JOIN taxonomia_competencias tc ON tc.id = cev.id_competencia
    WHERE v.estado = 'abierta' AND (eg.id = CAST(:eid AS uuid) OR eg.id_usuario = CAST(:uid AS uuid))
      AND {visible}
    GROUP BY v.id, e.id
    LIMIT 12
""".replace("{visible}", SQL_VISIBLE_PARA_EG)  # las vacantes exclusivas de convenio solo para su IES


async def retrieve_vacancies(session, current_user: dict, query: str, limit: int = 2) -> list[dict]:
    """Vacantes reales afines al egresado, como fuentes citables del copiloto."""
    eid = str(current_user.get("id_entidad") or "00000000-0000-0000-0000-000000000000")
    uid = str(current_user.get("sub") or current_user.get("id") or "00000000-0000-0000-0000-000000000000")
    rows = (await session.execute(sql(VACANTES_AFINES_SQL), {"eid": eid, "uid": uid})).fetchall()
    docs = []
    for titulo, empresa, modalidad, nivel, descripcion, requisitos, competencias in rows:
        partes = [f"Vacante abierta en Víncula: {titulo} — {empresa} ({modalidad}, nivel {nivel})."]
        if descripcion:
            partes.append(descripcion[:600])
        if requisitos:
            partes.append("Requisitos: " + "; ".join(str(r) for r in requisitos[:6]))
        if competencias:
            partes.append("Competencias exigidas: " + ", ".join(competencias[:10]))
        docs.append({"id": f"vac_{len(docs) + 1}", "title": f"Vacante en Víncula · {titulo}", "text": "\n".join(partes)})
    return rank_vacancy_docs(query, docs, limit=limit)


def retrieve(query: str, cv_text: str = "", limit: int = 5) -> list[dict]:
    """BM25 por consulta, sin mezclar CV entre peticiones ni persistir documentos."""
    docs = list(knowledge()) + cv_chunks(cv_text)
    if not docs:
        return []
    counts = [Counter(tokens(d["title"] + " " + d["text"])) for d in docs]
    query_terms = set(tokens(query))
    df = Counter(term for count in counts for term in count)
    avg_length = sum(map(lambda c: sum(c.values()), counts)) / len(counts) or 1

    def score(index: int) -> float:
        count = counts[index]
        length = sum(count.values())
        return sum(
            math.log(1 + (len(docs) - df[term] + 0.5) / (df[term] + 0.5))
            * (count[term] * 2.2 / (count[term] + 1.2 * (0.25 + 0.75 * length / avg_length)))
            for term in query_terms if count[term]
        )

    ranked = sorted(((score(i), i) for i in range(len(docs))), key=lambda pair: (-pair[0], pair[1]))
    selected = [i for value, i in ranked if value > 0][:limit]
    if cv_text and not any(docs[i]["id"].startswith("cv_") for i in selected):
        cv_start = len(knowledge())
        cv_end = len(docs) - 1
        selected = selected[:max(0, limit - 3)] + [cv_start, (cv_start + cv_end) // 2, cv_end]
    selected = list(dict.fromkeys(selected))[:limit]
    return [docs[i] for i in selected]
