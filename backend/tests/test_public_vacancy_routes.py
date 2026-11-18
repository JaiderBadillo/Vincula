# -*- coding: utf-8 -*-
"""Las rutas públicas de vacantes deben responder con y sin sesión (un 500 aquí deja sin catálogo a todos)."""

import app.main  # noqa: F401  carga los módulos en el orden de producción
import inspect
import unittest

import importlib

router = importlib.import_module("app.modules.vacancies_ats.router")  # el paquete exporta el APIRouter con ese mismo nombre


class PublicRoutesTests(unittest.TestCase):
    def test_listado_y_detalle_reciben_la_sesion_opcional(self):
        for fn in (router.list_public_vacancies, router.get_public_vacancy_detail):
            self.assertIn("viewer", inspect.signature(fn).parameters, fn.__name__)

    def test_las_rutas_publicas_responden_sin_sesion(self):
        from unittest.mock import AsyncMock, patch
        from fastapi.testclient import TestClient
        vacio = {"items": [], "total": 0, "page": 1, "limit": 1, "total_pages": 1, "tiempo_respuesta_ms": 1.0}
        with TestClient(app.main.app) as c, patch.object(router.VacancyATSService, "list_public_vacancies", new_callable=AsyncMock, return_value=vacio) as lista:
            r = c.get("/api/v1/vacantes?limit=1")
        self.assertEqual(r.status_code, 200, r.text)
        self.assertIsNone(lista.call_args.kwargs["viewer"])  # visitante: solo vacantes abiertas a todos


if __name__ == "__main__":
    unittest.main()
