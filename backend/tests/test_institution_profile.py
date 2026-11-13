import importlib
import unittest
import uuid
from types import SimpleNamespace

from fastapi import HTTPException

ies_router = importlib.import_module('app.modules.institutions.router')


class FakeDB:
    def __init__(self, ies):
        self.ies = ies
        self.commits = 0

    async def execute(self, _query):
        return SimpleNamespace(scalar_one_or_none=lambda: self.ies)

    async def commit(self):
        self.commits += 1


class InstitutionProfileTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.ies = SimpleNamespace(
            id=uuid.uuid4(), nombre_oficial='Institución Real', nombre_corto='IR',
            nit='900123456-7', caracter_academico='Universidad', ciudad='Bucaramanga',
            departamento='Santander', direccion='Calle 2', telefono='1234567',
            correo_institucional='ies@example.com', sitio_web=None, nombre_rector='Rector Real',
            url_logo=None, url_portada=None, estado='aprobado',
        )
        self.db = FakeDB(self.ies)
        self.user = {'id_entidad': str(self.ies.id), 'rol': 'admin_ies'}
        self.payload = ies_router.InstitutionProfileUpdate(
            name='Institución Real', legalName='Institución Real', acronym='IR',
            nit='900123456-7', institutionType='Universidad', city='Bucaramanga',
            department='Santander', address='Calle 2', phone='1234567',
            contactEmail='ies@example.com', website='https://example.com', legalRepresentative='Rector Real',
        )

    async def test_real_institution_and_persistent_update(self):
        self.assertEqual((await ies_router.get_institution_profile(self.user, self.db))['name'], 'Institución Real')
        result = await ies_router.update_institution_profile(self.payload, self.user, self.db)
        self.assertEqual(result['website'], 'https://example.com')
        self.assertEqual(self.db.commits, 1)

    async def test_verified_identity_is_immutable(self):
        changed = self.payload.model_copy(update={'name': 'Otro nombre'})
        with self.assertRaises(HTTPException) as error:
            await ies_router.update_institution_profile(changed, self.user, self.db)
        self.assertEqual(error.exception.status_code, 409)
