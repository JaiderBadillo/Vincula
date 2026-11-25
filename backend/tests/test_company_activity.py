# -*- coding: utf-8 -*-
"""Métricas de actividad de la empresa: salen de los registros, sin rellenos. Sin base de datos."""

import unittest
from datetime import date, datetime, timezone

from app.modules.companies.activity import calcular


def dia(mes, d):
    return datetime(2026, mes, d, 15, tzinfo=timezone.utc)


class CompanyActivityTest(unittest.TestCase):
    def test_sin_registros_no_se_inventa_nada(self):
        r = calcular([], [], [], [], [], ahora=dia(11, 25))
        self.assertEqual(r["metrics"]["openVacancies"], 0)
        self.assertIsNone(r["metrics"]["conversionRate"])
        self.assertIsNone(r["metrics"]["avgTimeToHireDays"])
        self.assertEqual([r["monthlyTrend"], r["talentSources"], r["recruiters"], r["log"]], [[], [], [], []])

    def test_cuenta_fases_contrataciones_y_origen(self):
        vacantes = [{"id": "v1", "titulo": "Analista", "estado": "abierta", "reclutador": "r1",
                     "publicado_en": dia(10, 1), "convenio_ies_id": None, "convenio_ies": None}]
        postulaciones = [
            {"id": "p1", "id_vacante": "v1", "fase_actual": "contratado", "postulado_en": dia(11, 1),
             "actualizado_en": dia(11, 20), "egresado": "Egresado A"},
            {"id": "p2", "id_vacante": "v1", "fase_actual": "entrevista", "postulado_en": dia(11, 2),
             "actualizado_en": dia(11, 3), "egresado": "Egresado B"},
            {"id": "p3", "id_vacante": "v1", "fase_actual": "descartados", "postulado_en": dia(10, 5),
             "actualizado_en": dia(10, 9), "egresado": "Egresado C"},
        ]
        historial = [{"id": "h1", "id_postulacion": "p1", "fase_anterior": "oferta_finalistas",
                      "fase_nueva": "contratado", "registrado_en": dia(11, 11), "rol": "reclutador_empresa",
                      "actor": "Reclutadora"}]
        entrevistas = [{"id": "t1", "id_postulacion": "p2", "fecha_entrevista": date(2026, 11, 28),
                        "franja_horaria": "10:00", "estado": "programada", "creado_en": dia(11, 3), "actor": None}]
        reclutadores = [{"id": "r1", "nombre_completo": "Reclutadora", "url_avatar": None,
                         "estado": "active", "sedes": None}]

        r = calcular(vacantes, postulaciones, historial, entrevistas, reclutadores, ahora=dia(11, 25))

        m = r["metrics"]
        self.assertEqual((m["applicantsTotal"], m["interviewing"], m["hiredMonth"]), (3, 1, 1))
        self.assertEqual((m["conversionRate"], m["avgTimeToHireDays"]), (33.3, 10))
        self.assertEqual(r["funnel"], {"applied": 3, "screened": 2, "interviewed": 2, "hired": 1})
        self.assertEqual([(t["short"], t["applicants"], t["hired"]) for t in r["monthlyTrend"][-2:]],
                         [("oct", 1, 0), ("nov", 2, 1)])
        self.assertEqual(r["talentSources"], [{"id": "abiertas", "label": "Convocatorias abiertas", "count": 3}])
        self.assertEqual((r["recruiters"][0]["screenedApplicants"], r["recruiters"][0]["effectivenessRate"]), (3, 33))
        self.assertEqual(r["log"][0]["action"], "Contratación registrada")


if __name__ == "__main__":
    unittest.main()
