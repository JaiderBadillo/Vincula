# -*- coding: utf-8 -*-
"""El Match Score del recomendador usa representación vectorial (TF-IDF + coseno)."""

import unittest
import uuid
from types import SimpleNamespace

from app.modules.ai_engine.services import TalentMatcherService as Matcher


# "Medicina" no está en la taxonomía: así no se infieren competencias del programa
# y el test aísla la capa vectorial.
def egresado(skills, programa="Medicina"):
    return SimpleNamespace(
        competencias=[SimpleNamespace(competencia=SimpleNamespace(nombre=s, etiqueta_normalizada=None)) for s in skills],
        academicos=[SimpleNamespace(sello_digital=None, id_programa=uuid.uuid4(),
                                    programa=SimpleNamespace(nombre=programa))],
    )


def vacante(obligatorias, deseables=()):
    comp = [SimpleNamespace(competencia=SimpleNamespace(nombre=n, categoria=c), es_obligatoria=True) for n, c in obligatorias]
    comp += [SimpleNamespace(competencia=SimpleNamespace(nombre=n, categoria=c), es_obligatoria=False) for n, c in deseables]
    return SimpleNamespace(competencias=comp, requisitos=[], programas_afines=[],
                           titulo="Analista de planta", descripcion="", categoria="Producción y operaciones")


class TestMatchVectorial(unittest.TestCase):
    def test_requisito_con_otra_redaccion_se_cubre_por_coseno(self):
        """'Control Estadístico de Calidad' no coincide léxicamente con lo declarado,
        pero el coseno TF-IDF lo empareja con 'Control de Calidad' y da crédito parcial."""
        e = egresado(["Control de Calidad", "Excel"])
        con = Matcher.calculate_match(e, vacante([("Control Estadístico de Calidad", "tecnica")]))
        sin = Matcher.calculate_match(egresado(["Excel"]), vacante([("Control Estadístico de Calidad", "tecnica")]))
        self.assertNotIn("Control Estadístico de Calidad", con.missing_skills)
        self.assertIn("Control Estadístico de Calidad", con.skills_match)
        self.assertTrue(any("similitud" in s for s in con.skills_equivalent))
        self.assertGreater(con.match_score, sin.match_score)
        self.assertIn("Control Estadístico de Calidad", sin.missing_skills)

    def test_sin_parecido_sigue_faltando(self):
        r = Matcher.calculate_match(egresado(["Control de Calidad"]), vacante([("Soldadura TIG", "tecnica")]))
        self.assertIn("Soldadura TIG", r.missing_skills)

    def test_las_blandas_no_se_emparejan_por_coseno(self):
        """Una blanda no debe 'cubrirse' con una técnica de nombre parecido."""
        r = Matcher.calculate_match(egresado(["Redes de Comunicaciones"]),
                                    vacante([("Comunicación Asertiva", "blanda")]))
        self.assertIn("Comunicación Asertiva", r.missing_skills)


if __name__ == "__main__":
    unittest.main()
