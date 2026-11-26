# -*- coding: utf-8 -*-
"""Qué entrevista ve el egresado y si cuenta como próxima."""

import unittest
from datetime import date
from types import SimpleNamespace

from app.modules.graduates.services import GraduateService


def ent(dia, estado):
    return SimpleNamespace(fecha_entrevista=date(2026, 11, dia), estado=estado)


class InterviewToShowTest(unittest.TestCase):
    def test_confirmada_futura_cuenta_y_gana_a_una_pasada(self):
        pasada, confirmada = ent(10, "programada"), ent(28, "confirmada")
        self.assertEqual(GraduateService.entrevista_a_mostrar([pasada, confirmada], date(2026, 11, 25)), (confirmada, True))

    def test_pasada_o_por_reprogramar_no_es_proxima(self):
        pasada, otra_fecha = ent(17, "confirmada"), ent(28, "reprogramada")
        self.assertEqual(GraduateService.entrevista_a_mostrar([pasada], date(2026, 11, 25)), (pasada, False))
        self.assertEqual(GraduateService.entrevista_a_mostrar([pasada, otra_fecha], date(2026, 11, 25)), (otra_fecha, False))


if __name__ == "__main__":
    unittest.main()
