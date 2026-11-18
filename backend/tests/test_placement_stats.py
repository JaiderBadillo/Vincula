# -*- coding: utf-8 -*-
"""Estadísticas de colocación: solo cuentan hechos; sin datos no se inventa nada."""

import unittest
from datetime import datetime, timedelta, timezone

from app.modules.institutions.placement_stats import calculate_placement

T0 = datetime(2026, 1, 1, tzinfo=timezone.utc)


def egr(i, prog="p1", ano=2025):
    return {"id_egresado": i, "id_programa": prog, "programa": f"Programa {prog}", "nivel": "Profesional",
            "id_facultad": "f1", "facultad": "Ingenierías", "ano": ano}


def col(i, prog="p1", ano=2025, minimo=3_000_000, maximo=5_000_000, dias=30, **extra):
    base = {"id_egresado": i, "id_programa": prog, "ano": ano, "salario_min": minimo, "salario_max": maximo,
            "confidencial": False, "periodo": "Mensual", "modalidad": "Remoto", "contrato": "Indefinido",
            "id_empresa": "e1", "empresa": "Acme", "sector": "Tecnología",
            "postulado_en": T0, "contratado_en": T0 + timedelta(days=dias)}
    return {**base, **extra}


class PlacementTests(unittest.TestCase):
    def test_sin_datos_no_inventa_nada(self):
        out = calculate_placement([], [])
        self.assertEqual(out["resumen"]["egresados"], 0)
        self.assertIsNone(out["resumen"]["tasa"])
        self.assertIsNone(out["resumen"]["salario_promedio"])
        for k in ("facultades", "programas", "tiempos", "salarios", "contratos", "modalidades", "empresas", "cohortes"):
            self.assertEqual(out[k], [], k)

    def test_tasa_y_promedios_salen_de_los_registros(self):
        out = calculate_placement([egr("a"), egr("b"), egr("c"), egr("d")], [col("a", dias=20), col("b", dias=40, minimo=1_000_000, maximo=3_000_000)])
        r = out["resumen"]
        self.assertEqual((r["egresados"], r["colocados"], r["tasa"]), (4, 2, 50.0))
        self.assertEqual(r["salario_promedio"], 3_000_000)  # medios 4M y 2M
        self.assertEqual(r["dias_mediana"], 30.0)
        self.assertEqual(out["programas"][0]["tasa"], 50.0)
        self.assertEqual(out["cohortes"][0]["ano"], 2025)

    def test_salario_confidencial_o_no_mensual_no_cuenta_pero_la_contratacion_si(self):
        out = calculate_placement([egr("a"), egr("b")], [col("a", confidencial=True), col("b", periodo="Por hora")])
        self.assertEqual(out["resumen"]["colocados"], 2)
        self.assertIsNone(out["resumen"]["salario_promedio"])
        self.assertEqual(out["salarios"], [])

    def test_un_egresado_con_dos_contrataciones_cuenta_una_vez(self):
        out = calculate_placement([egr("a")], [col("a"), col("a", id_empresa="e2", empresa="Otra")])
        self.assertEqual(out["resumen"]["colocados"], 1)
        self.assertEqual(out["resumen"]["tasa"], 100.0)

    def test_repartos_y_empresas(self):
        out = calculate_placement([egr("a"), egr("b")], [col("a", dias=10), col("b", dias=100, modalidad="Presencial")])
        self.assertEqual([t["cantidad"] for t in out["tiempos"]], [1, 0, 1, 0])
        self.assertEqual({m["etiqueta"] for m in out["modalidades"]}, {"Remoto", "Presencial"})
        self.assertEqual(out["empresas"][0]["contratados"], 2)


if __name__ == "__main__":
    unittest.main()
