# -*- coding: utf-8 -*-
"""Perfil del candidato para el reclutador: solo datos reales, comparados con la vacante."""

import app.main  # noqa: F401  carga los módulos en el orden de producción
import unittest

from fastapi import HTTPException

from app.modules.vacancies_ats.candidate_profile import build_profile, candidate_cv_url_async, candidate_profile_async

TABLAS = {"competencias": [{"nombre": "SQL", "tipo": "tecnica", "nivel": 4, "validada": True}],
          "idiomas": [{"nombre": "Inglés", "nivel": "B2"}], "experiencias": [], "enlaces": {}, "hojas_de_vida": []}
EGR = {"titular": "Ing. de Sistemas", "biografia": None, "ciudad": "Bucaramanga", "departamento": "Santander", "disponible": True,
       "tipo_disponibilidad": "inmediata", "reubicarse": False, "aspiracion_min": 2_200_000, "aspiracion_max": 3_200_000}
VAC = {"salario_min": 2_500_000, "salario_max": 3_500_000, "salario_confidencial": False, "modalidad": "Híbrido",
       "tipo_contrato": "Término indefinido", "jornada": "Tiempo completo", "experiencia": "Junior"}
REQ = [{"nombre": "SQL", "obligatoria": True}, {"nombre": "Docker", "obligatoria": False}]


def perfil(egr=EGR, tablas=TABLAS, extra=None, vac=VAC, req=REQ):
    return build_profile(egr, tablas, extra or {}, vac, req)


class BuildProfileTests(unittest.TestCase):
    def test_marca_que_pide_la_vacante_y_que_tiene_el_candidato(self):
        p = perfil()
        self.assertEqual([(r["nombre"], r["tiene"]) for r in p["requeridas"]], [("SQL", True), ("Docker", False)])

    def test_une_habilidades_de_tablas_y_perfil_adicional_sin_duplicar(self):
        p = perfil(extra={"skills": [{"name": "sql", "level": "Avanzado"}, {"name": "Docker", "level": "Básico", "type": "tech"}]})
        self.assertEqual(sorted(h["nombre"] for h in p["habilidades"]), ["Docker", "SQL"])
        self.assertTrue(next(r for r in perfil(extra={"skills": [{"name": "Docker"}]})["requeridas"] if r["nombre"] == "Docker")["tiene"])

    def test_salario_compatible_o_que_supera_la_oferta(self):
        self.assertEqual(perfil()["salario"]["encaje"], "compatible")
        self.assertEqual(perfil(egr={**EGR, "aspiracion_min": 4_000_000})["salario"]["encaje"], "supera_oferta")

    def test_respeta_que_el_egresado_no_comparta_su_aspiracion(self):
        s = perfil(extra={"preferences": {"showSalary": False, "salaryMin": 9_000_000}})["salario"]
        self.assertEqual((s["aspiracion_compartida"], s["aspiracion_min"], s["encaje"]), (False, None, None))

    def test_oferta_confidencial_no_se_revela(self):
        s = perfil(vac={**VAC, "salario_confidencial": True})["salario"]
        self.assertEqual((s["oferta_min"], s["oferta_max"], s["oferta_confidencial"], s["encaje"]), (None, None, True, None))

    def test_enlaces_solo_http_y_sin_datos_no_inventa(self):
        p = perfil(extra={"links": {"linkedin": "javascript:alert(1)", "github": "https://github.com/x", "portfolio": ""}})
        self.assertEqual((p["enlaces"]["linkedin"], p["enlaces"]["github"], p["enlaces"]["portafolio"]), (None, "https://github.com/x", None))
        vacio = build_profile({k: None for k in EGR}, {"competencias": [], "idiomas": [], "experiencias": [], "enlaces": {}, "hojas_de_vida": []}, {}, VAC, [])
        self.assertEqual((vacio["habilidades"], vacio["idiomas"], vacio["experiencias"], vacio["requeridas"]), ([], [], [], []))

    def test_experiencia_del_perfil_adicional(self):
        p = perfil(extra={"experience": [{"role": "Practicante", "company": "Acme", "start": "2025-01", "current": True}]})
        self.assertEqual((p["experiencias"][0]["cargo"], p["experiencias"][0]["actual"]), ("Practicante", True))


class ScopeTests(unittest.IsolatedAsyncioTestCase):
    async def test_ids_invalidos_dan_404_sin_consultar(self):
        for pid, cid in (("x", "y"), ("00000000-0000-0000-0000-000000000000", None)):
            with self.assertRaises(HTTPException) as e:
                await candidate_profile_async(None, pid, cid)
            self.assertEqual(e.exception.status_code, 404)

    async def test_hoja_de_vida_con_ids_invalidos_da_404(self):
        with self.assertRaises(HTTPException) as e:
            await candidate_cv_url_async(None, "x", "y")
        self.assertEqual(e.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
