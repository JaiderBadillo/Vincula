import unittest
import uuid
import importlib
from types import SimpleNamespace

from fastapi import HTTPException

company_router = importlib.import_module('app.modules.companies.router')


class FakeDB:
    def __init__(self, company):
        self.company = company
        self.commits = 0

    async def execute(self, _query):
        return SimpleNamespace(scalar_one_or_none=lambda: self.company)

    async def commit(self):
        self.commits += 1


class CompanyProfileTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.company = SimpleNamespace(
            id=uuid.uuid4(), nombre_comercial='Empresa real', razon_social='Empresa real SAS',
            nit='900123456-7', sector_economico='Tecnolog�a', tamano_empresa='Microempresa',
            departamento='Santander', ciudad='Bucaramanga', direccion='Calle 1', telefono='3000000000',
            correo_contacto='empresa@example.com', sitio_web=None, descripcion_corporativa=None,
            nombre_representante_legal='Representante', documento_representante_legal='123456',
            url_logo=None, url_portada=None, estado='aprobado',
        )
        self.db = FakeDB(self.company)
        self.user = {'id_entidad': str(self.company.id), 'rol': 'admin_empresa'}
        self.payload = company_router.CompanyProfileUpdate(
            name='Empresa real', commercialName='Empresa real', legalName='Empresa real SAS',
            nit='900123456-7', sector='Servicios', size='Microempresa', department='Santander',
            city='Bucaramanga', address='Calle 1', phone='3000000000',
            contactEmail='empresa@example.com', website='', description='Ahora tiene perfil',
            legalRepresentative={'name': 'Representante', 'documentId': '123456'},
        )

    async def test_reads_real_company_and_saves_editable_fields(self):
        profile = await company_router.get_company_profile(self.user, self.db)
        self.assertEqual(profile['name'], 'Empresa real')
        self.assertEqual(profile['legalRepresentative']['name'], 'Representante')
        updated = await company_router.update_company_profile(self.payload, self.user, self.db)
        self.assertEqual(updated['description'], 'Ahora tiene perfil')
        self.assertEqual(self.company.sector_economico, 'Servicios')
        self.assertEqual(self.db.commits, 1)

    async def test_verified_legal_identity_cannot_change(self):
        edited = self.payload.model_copy(update={'nit': '111222333-4'})
        with self.assertRaises(HTTPException) as error:
            await company_router.update_company_profile(edited, self.user, self.db)
        self.assertEqual(error.exception.status_code, 409)
        self.assertEqual(self.db.commits, 0)

    async def test_company_is_resolved_from_token(self):
        with self.assertRaises(HTTPException) as error:
            await company_router.get_company_profile({'id_entidad': str(uuid.uuid4())}, FakeDB(None))
        self.assertEqual(error.exception.status_code, 404)

    async def test_invalid_image_rejected(self):
        edited = self.payload.model_copy(update={'logo': 'data:image/png;base64,ZmFrZQ=='})
        with self.assertRaises(HTTPException) as error:
            await company_router.update_company_profile(edited, self.user, self.db)
        self.assertEqual(error.exception.status_code, 422)
        self.assertEqual(self.db.commits, 0)

