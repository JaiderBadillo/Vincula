import unittest
from datetime import datetime, timedelta, timezone

from app.modules.ai_engine.outcomes_service import MIN_MUESTRA, calculate_outcomes

T0 = datetime(2026, 1, 1, tzinfo=timezone.utc)


def post(egresado, fase_actual, fases=None, afinidad=80, motivo=None):
    """fases: {fase: días después de postular en que se alcanzó}"""
    return {"id_egresado": egresado, "fase_actual": fase_actual, "afinidad": afinidad, "motivo_descarte": motivo,
            "postulado_en": T0, "fases": {f: T0 + timedelta(days=d) for f, d in (fases or {}).items()}}


class ProgramOutcomesTests(unittest.TestCase):
    def test_sin_postulaciones_solo_hay_ceros_y_ninguna_tasa(self):
        r = calculate_outcomes("X", "p", 3, [])
        self.assertEqual((r.egresados_registrados, r.total_postulaciones, r.egresados_contratados), (3, 0, 0))
        self.assertFalse(r.muestra_suficiente)
        self.assertIsNone(r.tasa_contratacion)
        self.assertEqual([s.postulaciones for s in r.embudo], [0] * 6)

    def test_bajo_el_minimo_hay_conteos_pero_no_tasas(self):
        r = calculate_outcomes("X", "p", 2, [
            post("a", "contratado", {"en_revision": 0, "oferta_finalistas": 5, "contratado": 9}),
            post("b", "descartados", {"en_revision": 0, "preseleccionados": 2, "descartados": 4}, motivo="Salario"),
        ])
        # el embudo es acumulado: el contratado cuenta en todas las fases anteriores
        self.assertEqual([s.postulaciones for s in r.embudo], [2, 2, 1, 1, 1, 1])
        self.assertEqual((r.egresados_postulados, r.egresados_contratados, r.postulaciones_descartadas), (2, 1, 1))
        self.assertEqual([(m.motivo, m.postulaciones) for m in r.motivos_descarte], [("Salario", 1)])
        self.assertEqual((r.tasa_contratacion, r.dias_mediana_contratacion, r.afinidad_promedio_contratados),
                         (None, None, None))

    def test_con_muestra_suficiente_calcula_tasa_tiempos_y_afinidad(self):
        posts = [post(f"e{i}", "en_revision", {"en_revision": 0}) for i in range(MIN_MUESTRA - 2)]
        posts.append(post("h1", "contratado", {"oferta_finalistas": 4, "contratado": 10}, afinidad=90))
        # saltó directo a contratado: cuenta como oferta alcanzada ese mismo día
        posts.append(post("h2", "contratado", {"contratado": 20}, afinidad=70))
        r = calculate_outcomes("X", "p", 20, posts)
        self.assertTrue(r.muestra_suficiente)
        self.assertEqual(r.tasa_contratacion, 20.0)  # 2 contratados de 10 egresados que se postularon
        self.assertEqual((r.dias_mediana_oferta, r.dias_mediana_contratacion), (12.0, 15.0))
        self.assertEqual(r.afinidad_promedio_contratados, 80.0)
        self.assertIsNone(r.afinidad_promedio_descartados)

    def test_un_egresado_con_varias_postulaciones_cuenta_una_vez(self):
        posts = [post("mismo", "contratado" if i == 0 else "en_revision") for i in range(MIN_MUESTRA)]
        r = calculate_outcomes("X", "p", 1, posts)
        self.assertEqual((r.egresados_postulados, r.egresados_contratados, r.tasa_contratacion), (1, 1, 100.0))


if __name__ == "__main__":
    unittest.main()
