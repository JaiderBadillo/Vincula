# -*- coding: utf-8 -*-
"""Vistas del asesor IES: reglas de las solicitudes de convenio."""

import unittest

from fastapi import HTTPException

from app.modules.institutions.advisor_views import _modalidad_convenio, resolver_solicitud_async


class AgreementTests(unittest.IsolatedAsyncioTestCase):
    async def test_rechazar_exige_observaciones_antes_de_tocar_la_base(self):
        for notas in (None, "", "   "):
            with self.assertRaises(HTTPException) as e:
                await resolver_solicitud_async(None, "iid", "x", "rechazada", notas)
            self.assertEqual(e.exception.status_code, 422)

    async def test_estado_invalido_y_solicitud_inexistente(self):
        with self.assertRaises(HTTPException) as e:
            await resolver_solicitud_async(None, "iid", "x", "borrada", None)
        self.assertEqual(e.exception.status_code, 422)
        with self.assertRaises(HTTPException) as e:
            await resolver_solicitud_async(None, "iid", "no-es-uuid", "aprobada", None)
        self.assertEqual(e.exception.status_code, 404)

    def test_tipo_de_convenio_se_traduce_a_la_modalidad(self):
        self.assertEqual(_modalidad_convenio("Aprendizaje SENA"), "Aprendizaje")
        self.assertEqual(_modalidad_convenio("Contrato laboral"), "Laboral")
        self.assertEqual(_modalidad_convenio("Pasantía"), "Pasantía")
        self.assertEqual(_modalidad_convenio(""), "Pasantía")


if __name__ == "__main__":
    unittest.main()
