# -*- coding: utf-8 -*-
"""Notificaciones de la plataforma: creación sin bloquear el negocio, lectura solo del propio usuario. Sin base de datos real."""

import app.main  # noqa: F401  carga los módulos en el orden de producción (evita un ciclo de importación)
import unittest
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.modules.moderation import services as moderation
from app.modules.moderation.schemas import ReportRequest
from app.modules.notifications import services
from app.modules.notifications.router import router

USER, OTHER = uuid.uuid4(), uuid.uuid4()


class Result:
    def __init__(self, rows=None, scalar=None, rowcount=1):
        self.rows, self._scalar, self.rowcount = rows or [], scalar, rowcount

    def scalar(self): return self._scalar
    def fetchall(self): return self.rows


class Nested:
    async def __aenter__(self): return self
    async def __aexit__(self, *exc): return False


class FakeSession:
    """Registra cada sentencia; `results` se consume en orden, y `fail` hace que execute falle."""

    def __init__(self, results=None, fail=False):
        self.results, self.fail, self.log, self.commits = list(results or []), fail, [], 0

    def begin_nested(self): return Nested()

    async def execute(self, statement, params=None):
        if self.fail:
            raise RuntimeError('relation "notificaciones" does not exist')
        self.log.append((str(statement), params))
        return self.results.pop(0) if self.results else Result()

    async def commit(self): self.commits += 1


class NotificarTests(unittest.IsolatedAsyncioTestCase):
    async def test_crea_un_aviso_por_usuario_sin_repetir_ni_aceptar_ids_invalidos(self):
        s = FakeSession()
        await services.notificar(s, [USER, str(USER), OTHER, None, "no-es-uuid"], "x", "Título", "Mensaje", "/ruta")
        self.assertEqual(sorted(p["u"] for _, p in s.log), sorted([USER, OTHER]))
        self.assertTrue(all(p["e"] == "/ruta" and p["ti"] == "Título" for _, p in s.log))
        self.assertEqual(s.commits, 0)  # el commit es del llamador salvo que lo pida

    async def test_commit_solo_si_se_pide(self):
        s = FakeSession()
        await services.notificar(s, [USER], "x", "t", "m", commit=True)
        self.assertEqual(s.commits, 1)

    async def test_sin_destinatarios_no_toca_la_base(self):
        s = FakeSession()
        await services.notificar(s, [], "x", "t", "m", commit=True)
        self.assertEqual((s.log, s.commits), ([], 0))

    async def test_un_fallo_nunca_rompe_la_operacion_que_lo_origina(self):
        s = FakeSession(fail=True)
        await services.notificar(s, [USER], "x", "t", "m", commit=True)  # no lanza
        self.assertEqual(s.commits, 0)

    async def test_destinatarios_con_error_devuelven_lista_vacia(self):
        self.assertEqual(await services.superadmins(FakeSession(fail=True)), [])

    async def test_recorta_tipo_y_titulo_al_tamano_de_la_columna(self):
        s = FakeSession()
        await services.notificar(s, [USER], "t" * 80, "T" * 300, "m")
        _, p = s.log[0]
        self.assertEqual((len(p["t"]), len(p["ti"])), (40, 160))


class ConsultaTests(unittest.IsolatedAsyncioTestCase):
    async def test_listar_marca_leidas_y_cuenta_no_leidas(self):
        ahora = datetime.now(timezone.utc)
        rows = [(uuid.uuid4(), "fase", "Hola", "msg", "/dashboard", None, ahora),
                (uuid.uuid4(), "fase", "Viejo", "msg", None, ahora, ahora)]
        s = FakeSession([Result(rows=rows), Result(scalar=1)])
        out = await services.listar(s, USER, 30, False)
        self.assertEqual([i["leida"] for i in out["items"]], [False, True])
        self.assertEqual(out["no_leidas"], 1)
        self.assertTrue(all(p["u"] == USER for _, p in s.log))  # siempre filtra por el usuario

    async def test_limite_acotado(self):
        s = FakeSession([Result(), Result(scalar=0)])
        await services.listar(s, USER, 100000, True)
        self.assertEqual(s.log[0][1]["l"], services.MAX_PAGE)
        self.assertIn("leida_en IS NULL", s.log[0][0])


def client(session, user_id=USER):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: {"sub": str(user_id), "rol": "egresado"}

    async def fake_db():
        yield session
    app.dependency_overrides[get_db] = fake_db
    return TestClient(app)


class RouterTests(unittest.TestCase):
    def test_get_devuelve_solo_las_del_usuario_del_token(self):
        s = FakeSession([Result(), Result(scalar=0)])
        res = client(s, OTHER).get("/notificaciones?limit=5")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"items": [], "no_leidas": 0})
        self.assertTrue(all(p["u"] == OTHER for _, p in s.log))

    def test_leer_una_ajena_o_inexistente_da_404(self):
        s = FakeSession([Result(rowcount=0)])
        self.assertEqual(client(s).post(f"/notificaciones/{uuid.uuid4()}/leer").status_code, 404)
        self.assertEqual(s.commits, 0)
        self.assertEqual(client(FakeSession()).post("/notificaciones/no-es-uuid/leer").status_code, 404)

    def test_leer_propia_confirma(self):
        s = FakeSession([Result(rowcount=1)])
        res = client(s).post(f"/notificaciones/{uuid.uuid4()}/leer")
        self.assertEqual((res.status_code, res.json(), s.commits), (200, {"ok": True}, 1))
        self.assertEqual(s.log[0][1]["u"], USER)

    def test_leer_todas(self):
        s = FakeSession([Result(rowcount=4)])
        res = client(s).post("/notificaciones/leer-todas")
        self.assertEqual((res.status_code, res.json()), (200, {"actualizadas": 4}))

    def test_sin_sesion_valida_se_rechaza(self):
        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_current_user] = lambda: {"rol": "egresado"}  # token sin id de usuario
        self.assertEqual(TestClient(app).get("/notificaciones").status_code, 401)


class EnganchesTests(unittest.IsolatedAsyncioTestCase):
    async def test_un_reporte_de_vacante_avisa_a_los_superadmins(self):
        admin = uuid.uuid4()

        class Sesion(FakeSession):
            async def execute(self, statement, params=None):
                sql = str(statement)
                if "SELECT estado::text FROM vacantes" in sql: return Result(scalar="abierta")
                if "count(*)" in sql: return Result(scalar=0)
                if "INSERT INTO reportes_vacante" in sql: return SimpleNamespace(first=lambda: (uuid.uuid4(),))
                return await super().execute(statement, params)

        s = Sesion()
        with patch.object(moderation.avisos, "superadmins", AsyncMock(return_value=[admin])), \
             patch.object(moderation.avisos, "notificar", AsyncMock()) as notificar:
            await moderation.report_vacancy(s, {"sub": str(uuid.uuid4())}, str(uuid.uuid4()), ReportRequest(motivo="fraude_o_estafa"))
        args = notificar.await_args.args
        self.assertEqual((args[1], args[2], args[5]), ([admin], "vacante_reportada", "/admin/moderacion"))
        self.assertEqual(s.commits, 1)


if __name__ == "__main__":
    unittest.main()
