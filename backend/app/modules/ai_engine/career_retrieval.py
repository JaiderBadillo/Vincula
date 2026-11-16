"""Recuperación léxica de guías curadas y fragmentos del CV del usuario actual."""

import json
import math
import re
import unicodedata
from collections import Counter
from functools import lru_cache
from pathlib import Path

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
