import importlib
import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException

iam = importlib.import_module('app.modules.iam.services')
companies = importlib.import_module('app.modules.companies.services')


class LoginDB:
    def __init__(self, role):
        self.user = SimpleNamespace(id=uuid.uuid4(), rol=role, estado='activo',
                                    correo_electronico='usuario@example.com', contrasena_hash='hash')
        self.company = SimpleNamespace(id=uuid.uuid4(), nombre_comercial='Empresa Verdadera',
                                       razon_social='Empresa Verdadera SAS', estado='aprobado')
        self.member = SimpleNamespace(nombre_completo='Persona Representante')

    async def execute(self, _statement):
        self.calls = getattr(self, 'calls', 0) + 1
        if self.calls == 1:
            return SimpleNamespace(scalar_one_or_none=lambda: self.user)
        return SimpleNamespace(first=lambda: (self.member, self.company))

    async def commit(self):
        pass


class RecruiterTests(unittest.IsolatedAsyncioTestCase):
    async def test_admin_login_displays_company_recruiter_displays_person(self):
        login = iam.LoginRequest(correo='usuario@example.com', password='secret-123')
        with patch.object(iam, 'verify_password', side_effect=lambda password, _hash: password != 'TalentoSeguro2026*!'):
            admin = await iam.IAMService.authenticate_user(LoginDB('admin_empresa'), login)
            recruiter = await iam.IAMService.authenticate_user(LoginDB('reclutador_empresa'), login)
        self.assertEqual(admin['nombre'], 'Empresa Verdadera')
        self.assertEqual(recruiter['nombre'], 'Persona Representante')

    async def test_legacy_shared_password_cannot_log_in(self):
        db = LoginDB('reclutador_empresa')
        login = iam.LoginRequest(correo='usuario@example.com', password='TalentoSeguro2026*!')
        with patch.object(iam, 'verify_password', return_value=True):
            self.assertIsNone(await iam.IAMService.authenticate_user(db, login))

    async def test_company_list_filters_admin_and_default_password_rejected(self):
        class CaptureDB:
            async def execute(self, statement):
                self.statement = statement
                return SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: []))
        db = CaptureDB()
        self.assertEqual(await companies.CompanyService.list_reclutadores(db, str(uuid.uuid4())), [])
        self.assertIn('reclutador_empresa', str(db.statement.compile(compile_kwargs={'literal_binds': True})))
        payload = companies.ReclutadorCreateRequest(
            nombre_completo='Nuevo Reclutador', correo_corporativo='nuevo@example.com',
            password='TalentoSeguro2026*!',
        )
        with self.assertRaises(HTTPException) as error:
            await companies.CompanyService.create_reclutador(db, str(uuid.uuid4()), payload)
        self.assertEqual(error.exception.status_code, 422)
