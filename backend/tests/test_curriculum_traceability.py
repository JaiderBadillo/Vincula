import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from fastapi import HTTPException

from app.core.skills_taxonomy import families_for_text
from app.modules.ai_engine.curriculum_service import CurriculumTraceabilityService as Service

PROGRAMA = str(uuid.uuid4())


def vacante(competencias, programas=(PROGRAMA,), **extra):
    """competencias: [(nombre, categoria, obligatoria)]"""
    return SimpleNamespace(
        competencias=[SimpleNamespace(competencia=SimpleNamespace(nombre=n, categoria=c), es_obligatoria=o)
                      for n, c, o in competencias],
        programas_afines=[SimpleNamespace(id_programa=p, programa=SimpleNamespace(nombre="Otro programa"))
                          for p in programas],
        titulo=extra.get("titulo", ""), descripcion=extra.get("descripcion", ""),
        requisitos=extra.get("requisitos", []), responsabilidades=[],
    )


def pensum(tools=()):
    return {"program_name": "Ingeniería de Sistemas", "semesters": [{"semester_number": 2, "subjects": [
        {"id": "1", "code": "SIS201", "name": "Bases de Datos I", "credits": 3, "tools": list(tools)},
        {"id": "2", "code": "SIS202", "name": "Cálculo Integral", "credits": 4, "tools": []},
    ]}]}


MIXTA = [("SQL", "tecnica", True), ("PostgreSQL", "tecnica", False),
         ("Docker", "tecnica", True), ("Trabajo en Equipo", "blanda", True)]


class PertinenceAlgorithmTests(unittest.TestCase):
    def test_sin_vacantes_no_inventa_demanda_ni_indice(self):
        r = Service.calculate_pertinence_report(pensum(), [], PROGRAMA)
        self.assertIsNone(r.indice_pertinencia)
        self.assertEqual((r.confianza, r.demanda, r.recomendaciones_decanatura, r.total_vacantes_analizadas),
                         ("sin_datos", [], [], 0))

    def test_sin_malla_no_hay_indice_aunque_haya_vacantes(self):
        r = Service.calculate_pertinence_report({"program_name": "X", "semesters": []}, [vacante(MIXTA)], PROGRAMA)
        self.assertIsNone(r.indice_pertinencia)
        self.assertFalse(r.pensum_registrado)

    def test_solo_cuentan_vacantes_dirigidas_al_programa(self):
        ajena = vacante([("Docker", "tecnica", True)], programas=(str(uuid.uuid4()),))
        sin_programa = vacante([("Docker", "tecnica", True)], programas=())
        r = Service.calculate_pertinence_report(pensum(), [ajena, sin_programa, vacante(MIXTA)], PROGRAMA)
        self.assertEqual((r.total_vacantes_abiertas, r.total_vacantes_analizadas), (3, 1))

    def test_indice_pondera_obligatoria_y_cobertura(self):
        r = Service.calculate_pertinence_report(pensum(), [vacante(MIXTA)], PROGRAMA)
        cobertura = {d.skill: d.cobertura for d in r.demanda}
        self.assertEqual(cobertura, {"SQL": "directa", "PostgreSQL": "afin", "Docker": "brecha",
                                     "Trabajo en Equipo": "brecha"})
        # (1·1 SQL + 0.5·0.5 PostgreSQL + 1·0 Docker) / 2.5; la blanda no entra
        self.assertEqual(r.indice_pertinencia, 50.0)
        self.assertEqual(r.confianza, "baja")
        sql = next(d for d in r.demanda if d.skill == "SQL")
        self.assertEqual(sql.asignaturas[0].nombre, "Bases de Datos I")

    def test_herramienta_declarada_convierte_afin_en_directa(self):
        r = Service.calculate_pertinence_report(pensum(tools=["PostgreSQL"]), [vacante(MIXTA)], PROGRAMA)
        self.assertEqual(r.indice_pertinencia, 60.0)

    def test_vacante_sin_competencias_usa_terminos_de_su_texto(self):
        v = vacante([], requisitos=["Manejo de Docker y SQL"], descripcion="Equipo de datos")
        r = Service.calculate_pertinence_report(pensum(), [v], PROGRAMA)
        self.assertEqual({d.skill for d in r.demanda}, {"Docker", "SQL"})

    def test_taxonomia_por_palabra_completa(self):
        self.assertNotIn("mobile_dev", families_for_text("Modelos de Negocios"))
        self.assertNotIn("cad_civil", families_for_text("Mercadeo"))
        self.assertEqual(families_for_text("Redes Sociales"), ["digital_marketing"])
        self.assertIn("sql_relational", families_for_text("Bases de Datos II"))


class ProgramAccessTests(unittest.IsolatedAsyncioTestCase):
    async def test_programa_de_otra_ies_responde_404(self):
        programa = SimpleNamespace(id=uuid.UUID(PROGRAMA), id_institucion=uuid.uuid4(), nombre="X")
        result = MagicMock()
        result.scalar_one_or_none.return_value = programa
        session = SimpleNamespace(execute=AsyncMock(return_value=result))
        with self.assertRaises(HTTPException) as raised:
            await Service._get_program(session, PROGRAMA, {"rol": "admin_ies", "id_entidad": str(uuid.uuid4())})
        self.assertEqual(raised.exception.status_code, 404)
        ok = await Service._get_program(session, PROGRAMA, {"rol": "admin_ies", "id_entidad": str(programa.id_institucion)})
        self.assertIs(ok, programa)


if __name__ == "__main__":
    unittest.main()
