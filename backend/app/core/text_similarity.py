"""
Similitud textual ligera para el análisis de brechas de habilidades (Skill Gap Analysis).

Técnica: TF-IDF sobre unigramas de palabra + trigramas de caracteres, con similitud
coseno. Implementado sin dependencias externas a propósito: scikit-learn/scipy no
caben con holgura en los 512 MB del plan gratuito de Render.

Qué aporta frente al emparejamiento léxico de la taxonomía:
  - variaciones morfológicas y de redacción ("gestión logística" ~ "fundamentos de logística",
    "estadística aplicada" ~ "estadística inferencial") sin mantener diccionarios;
  - tolerancia a plurales, orden de palabras y texto parcial, gracias a los trigramas.
Qué NO resuelve: sinónimos sin solape léxico ("suministro" vs "abastecimiento");
esos siguen siendo responsabilidad del vocabulario de `skills_taxonomy`.
"""

from __future__ import annotations

import math
import re
from typing import Dict, List, Sequence, Tuple

from app.core.skills_taxonomy import normalize_text

# Similitud coseno mínima para aceptar un emparejamiento semántico (calibrado con datos
# reales: los pares correctos puntúan >= 0.44 y los espurios <= 0.38).
UMBRAL_SEMANTICO = 0.42

# Palabras vacías del español académico: no aportan significado y ensucian el coseno.
_STOPWORDS = {
    "de", "del", "la", "las", "el", "los", "un", "una", "y", "e", "o", "u",
    "en", "a", "al", "para", "por", "con", "su", "sus", "i", "ii", "iii", "iv", "v",
}


def _features(text: str) -> List[str]:
    """Rasgos de un texto: palabras significativas + trigramas de caracteres de cada palabra."""
    clean = normalize_text(text or "")
    words = [w for w in re.split(r"[^a-z0-9+#]+", clean) if len(w) > 1 and w not in _STOPWORDS]
    feats: List[str] = list(words)
    for w in words:
        padded = f" {w} "  # los espacios marcan inicio y fin de palabra
        feats.extend(padded[i:i + 3] for i in range(len(padded) - 2))
    return feats


class TfidfIndex:
    """Índice TF-IDF de una colección pequeña de textos (p. ej., las asignaturas de una malla)."""

    def __init__(self, documents: Sequence[str]):
        self.documents = list(documents)
        feats_por_doc = [_features(d) for d in self.documents]
        n = len(feats_por_doc)
        df: Dict[str, int] = {}
        for feats in feats_por_doc:
            for f in set(feats):
                df[f] = df.get(f, 0) + 1
        # IDF suavizado: los rasgos presentes en casi todos los documentos pesan poco.
        self._idf = {f: math.log((1 + n) / (1 + c)) + 1.0 for f, c in df.items()}
        # Un rasgo que no está en ningún documento es lo más raro posible.
        self._idf_desconocido = math.log(1 + n) + 1.0
        self._vectors = [self._vector(feats) for feats in feats_por_doc]

    def _vector(self, feats: List[str]) -> Dict[str, float]:
        counts: Dict[str, int] = {}
        for f in feats:
            counts[f] = counts.get(f, 0) + 1
        # TF sublineal: repetir un rasgo aporta cada vez menos.
        vec = {f: (1.0 + math.log(c)) * self._idf.get(f, self._idf_desconocido)
               for f, c in counts.items()}
        norm = math.sqrt(sum(v * v for v in vec.values()))
        return {f: v / norm for f, v in vec.items()} if norm else {}

    def best_matches(self, query: str, limit: int = 4, min_similarity: float = 0.0) -> List[Tuple[int, float]]:
        """Documentos más parecidos a `query`: [(índice, similitud coseno 0..1)], de mayor a menor."""
        q = self._vector(_features(query))
        if not q:
            return []
        scored = []
        for i, d in enumerate(self._vectors):
            s = sum(w * d.get(f, 0.0) for f, w in q.items())
            if s >= min_similarity:
                scored.append((i, round(s, 4)))
        scored.sort(key=lambda x: -x[1])
        return scored[:limit]
