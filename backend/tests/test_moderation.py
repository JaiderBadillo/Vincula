# -*- coding: utf-8 -*-
"""Moderación: reportes de usuarios y acciones del administrador. Sin base de datos real."""

import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

from app.core import dependencies
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import create_access_token
from app.modules.moderation import services
from app.modules.moderation.router import router
from app.modules.vacancies_ats.services import VacancyATSService

ADMIN_ID, USER_ID, VAC_ID = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())


class Result:
    def __init__(self, rows=None, scalar=None, rowcount=1):
        self.rows, self._scalar, self.rowcount = rows or [], scalar, rowcount

    def scalar(self): return self._scalar
    def first(self): return self.rows[0] if self.rows else None
    def fetchall(self): return self.rows


class FakeSession:
    """Responde en orden a cada sentencia y comprueba que sea la esperada (fragmento de SQL)."""

    def __init__(self, script):
        self.script, self.log, self.commits = list(script), [], 0

    async def execute(self, statement, params=None):
        sql = str(statement)
        self.log.append((sql, params))
        fragment, result = self.script.pop(0)
        assert fragment in sql, f"se esperaba '{fragment}' en: {sql}"
        return result

    async def commit(self): self.commits += 1

    def sqls(self): return " || ".join(s for s, _ in self.log)


def client(role, session=None, user_id=USER_ID):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: {"sub": user_id, "rol": role}
    if session is not None:
        async def fake_db():
            yield session
        app.dependency_overrides[get_db] = fake_db
    return TestClient(app)


class ModelTests(unittest.TestCase):
    def test_el_modelo_de_vacante_acepta_el_estado_inhabilitada(self):
        """Si el enum del ORM no lo declara, cargar una vacante inhabilitada lanza LookupError (500)."""
        from app.modules.vacancies_ats.models import EstadoVacanteEnum
        self.assertIn("inhabilitada", EstadoVacanteEnum.enums)


class AccessTests(unittest.TestCase):
    def test_sin_sesion_no_se_puede_reportar(self):
        app = FastAPI(); app.include_router(router)
        self.assertEqual(TestClient(app).post(f"/moderacion/vacantes/{VAC_ID}/reportes", json={"motivo": "otro"}).status_code, 401)

    def test_solo_el_administrador_ve_reportes_y_actua(self):
        for role in ("egresado", "admin_empresa", "reclutador_empresa", "admin_ies", "asesor_ies"):
            c = client(role)
            for method, path, body in [
                ("get", "/moderacion/reportes", None),
                ("get", "/moderacion/historial", None),
                ("get", "/moderacion/cuentas?q=abc", None),
                ("post", f"/moderacion/vacantes/{VAC_ID}/inhabilitar", {"motivo": "fraude evidente"}),
                ("post", f"/moderacion/cuentas/{USER_ID}/suspender", {"motivo": "fraude evidente"}),
                ("post", f"/moderacion/empresas/{USER_ID}/suspender", {"motivo": "fraude evidente"}),
            ]:
                r = getattr(c, method)(path, **({"json": body} if body else {}))
                self.assertEqual(r.status_code, 403, (role, path))

    def test_el_administrador_no_reporta_vacantes(self):
        self.assertEqual(client("superadmin_vincula").post(
            f"/moderacion/vacantes/{VAC_ID}/reportes", json={"motivo": "otro"}).status_code, 403)

    def test_validacion_del_reporte(self):
        c = client("egresado")
        for body in ({"motivo": "no_existe"}, {"motivo": "otro", "detalle": "x" * 1001},
                     {"motivo": "otro", "extra": 1}, {}):
            self.assertEqual(c.post(f"/moderacion/vacantes/{VAC_ID}/reportes", json=body).status_code, 422, body)
        # inhabilitar exige un motivo real: queda en el historial
        self.assertEqual(client("superadmin_vincula").post(
            f"/moderacion/vacantes/{VAC_ID}/inhabilitar", json={"motivo": "ya"}).status_code, 422)


class ReportTests(unittest.TestCase):
    def reportar(self, script):
        s = FakeSession(script)
        return client("egresado", s).post(f"/moderacion/vacantes/{VAC_ID}/reportes",
                                          json={"motivo": "fraude_o_estafa", "detalle": "Piden dinero"}), s

    def test_reporte_registrado(self):
        r, s = self.reportar([("FROM vacantes", Result(scalar="abierta")), ("reportes_vacante", Result(scalar=0)),
                              ("INSERT INTO reportes_vacante", Result(rows=[(uuid.uuid4(),)]))])
        self.assertEqual(r.status_code, 201)
        self.assertEqual(s.commits, 1)
        self.assertEqual(s.log[-1][1]["u"], uuid.UUID(USER_ID))  # el reportante sale del token, no del cuerpo

    def test_un_usuario_reporta_una_vez(self):
        r, s = self.reportar([("FROM vacantes", Result(scalar="abierta")), ("reportes_vacante", Result(scalar=0)),
                              ("INSERT INTO reportes_vacante", Result(rows=[]))])
        self.assertEqual((r.status_code, r.json()["detail"]["codigo"]), (409, "YA_REPORTADA"))
        self.assertEqual(s.commits, 0)

    def test_un_borrador_o_inhabilitada_no_se_reporta(self):
        for estado in ("borrador", "inhabilitada", None):
            r, _ = self.reportar([("FROM vacantes", Result(scalar=estado))])
            self.assertEqual(r.status_code, 404, estado)

    def test_limite_diario(self):
        r, _ = self.reportar([("FROM vacantes", Result(scalar="abierta")),
                              ("reportes_vacante", Result(scalar=services.MAX_REPORTES_POR_DIA))])
        self.assertEqual(r.status_code, 429)


class AdminActionTests(unittest.IsolatedAsyncioTestCase):
    admin = {"sub": ADMIN_ID, "rol": "superadmin_vincula"}

    async def test_inhabilitar_vacante_resuelve_reportes_y_deja_historial(self):
        s = FakeSession([
            ("FROM vacantes v JOIN empresas", Result(rows=[("abierta", "Auxiliar", uuid.uuid4(), "Empresa X")])),
            ("SET estado = 'inhabilitada'", Result()),
            ("UPDATE reportes_vacante", Result(rowcount=3)),
            ("INSERT INTO acciones_moderacion", Result()),
            ("reclutadores_empresa", Result(scalar="rec@empresa.test")),
        ])
        with patch.object(services, "send_vincula_email", new_callable=AsyncMock) as correo:
            out = await services.disable_vacancy(s, self.admin, VAC_ID, "Cobra por postularse")
        self.assertIn("inhabilitada", out["mensaje"])
        self.assertEqual(s.commits, 1)
        accion = [p for sql, p in s.log if "INSERT INTO acciones_moderacion" in sql][0]
        self.assertEqual((accion["tipo"], accion["acc"], accion["mot"]), ("vacante", "vacante_inhabilitada", "Cobra por postularse"))
        correo.assert_awaited_once()
        self.assertEqual(correo.call_args.args[:2], ("vacante_inhabilitada", "rec@empresa.test"))

    async def test_un_fallo_del_correo_no_deshace_la_inhabilitacion(self):
        s = FakeSession([
            ("FROM vacantes v JOIN empresas", Result(rows=[("abierta", "Auxiliar", uuid.uuid4(), "Empresa X")])),
            ("SET estado = 'inhabilitada'", Result()), ("UPDATE reportes_vacante", Result()),
            ("INSERT INTO acciones_moderacion", Result()), ("reclutadores_empresa", Result(scalar="rec@empresa.test")),
        ])
        with patch.object(services, "send_vincula_email", new_callable=AsyncMock, side_effect=RuntimeError("caído")):
            await services.disable_vacancy(s, self.admin, VAC_ID, "Cobra por postularse")
        self.assertEqual(s.commits, 1)

    async def test_no_se_inhabilita_dos_veces(self):
        s = FakeSession([("FROM vacantes v JOIN empresas", Result(rows=[("inhabilitada", "A", uuid.uuid4(), "E")]))])
        with self.assertRaises(HTTPException) as e:
            await services.disable_vacancy(s, self.admin, VAC_ID, "motivo válido")
        self.assertEqual(e.exception.status_code, 409)

    async def test_rehabilitar_deja_la_vacante_pausada_no_abierta(self):
        s = FakeSession([("SET estado = 'pausada'", Result(rowcount=1)), ("INSERT INTO acciones_moderacion", Result())])
        await services.enable_vacancy(s, self.admin, VAC_ID, None)
        self.assertNotIn("'abierta'", s.log[0][0])
        s = FakeSession([("SET estado = 'pausada'", Result(rowcount=0))])
        with self.assertRaises(HTTPException) as e:
            await services.enable_vacancy(s, self.admin, VAC_ID, None)
        self.assertEqual(e.exception.status_code, 409)

    async def test_descartar_sin_reportes_pendientes(self):
        s = FakeSession([("UPDATE reportes_vacante", Result(rowcount=0))])
        with self.assertRaises(HTTPException) as e:
            await services.dismiss_reports(s, self.admin, VAC_ID, None)
        self.assertEqual(e.exception.status_code, 404)

    async def test_las_cuentas_de_administracion_y_la_propia_estan_protegidas(self):
        for rol, objetivo in (("superadmin_vincula", USER_ID), ("egresado", ADMIN_ID)):
            s = FakeSession([("FROM usuarios", Result(rows=[(rol, "activo")]))])
            with self.assertRaises(HTTPException) as e:
                await services.suspend_account(s, self.admin, objetivo, "motivo válido")
            self.assertEqual(e.exception.status_code, 403, rol)

    async def test_suspender_corta_las_sesiones_abiertas_y_reactivar_las_devuelve(self):
        objetivo = str(uuid.uuid4())
        s = FakeSession([("FROM usuarios", Result(rows=[("egresado", "activo")])), ("SET estado = 'suspendido'", Result()),
                         ("INSERT INTO acciones_moderacion", Result())])
        await services.suspend_account(s, self.admin, objetivo, "Suplantación de identidad")
        # un token todavía vigente de esa cuenta deja de servir
        token = create_access_token({"sub": objetivo, "rol": "egresado"})
        with self.assertRaises(HTTPException) as e:
            await dependencies.get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
        self.assertEqual(e.exception.status_code, 401)
        s = FakeSession([("SET estado = 'activo'", Result(rowcount=1)), ("INSERT INTO acciones_moderacion", Result())])
        await services.reactivate_account(s, self.admin, objetivo, None)
        user = await dependencies.get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
        self.assertEqual(user["sub"], objetivo)

    async def test_suspender_empresa_inhabilita_cuentas_y_vacantes(self):
        a, b = uuid.uuid4(), uuid.uuid4()
        s = FakeSession([("SELECT 1 FROM empresas", Result(rows=[(1,)])), ("SELECT u.id", Result(rows=[(a,), (b,)])),
                         ("UPDATE usuarios", Result()), ("UPDATE vacantes", Result(rowcount=4)),
                         ("UPDATE reportes_vacante", Result()), ("INSERT INTO acciones_moderacion", Result())])
        try:
            out = await services.suspend_company(s, self.admin, str(uuid.uuid4()), "Empresa fachada")
            self.assertIn("2 cuenta(s) y 4 vacante(s)", out["mensaje"])
            self.assertTrue({str(a), str(b)} <= dependencies.SUSPENDED_USERS)
        finally:
            dependencies.restore_sessions(a); dependencies.restore_sessions(b)

    async def test_la_empresa_no_puede_reabrir_una_vacante_inhabilitada(self):
        s = FakeSession([("FROM vacantes", SimpleNamespace(scalar_one_or_none=lambda: SimpleNamespace(estado="inhabilitada")))])
        with self.assertRaises(HTTPException) as e:
            await VacancyATSService.update_vacancy_status(s, str(uuid.uuid4()), "aprobado", VAC_ID, "abierta")
        self.assertEqual((e.exception.status_code, e.exception.detail["codigo"]), (403, "VACANTE_INHABILITADA"))

    async def test_busqueda_exige_tres_caracteres(self):
        with self.assertRaises(HTTPException):
            await services.search_accounts(FakeSession([]), "ab")


if __name__ == "__main__":
    unittest.main()
