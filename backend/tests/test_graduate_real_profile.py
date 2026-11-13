import importlib
import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException, UploadFile

from app.modules.graduates.services import GraduateService

graduate_router = importlib.import_module('app.modules.graduates.router')


class GraduateRealProfileTests(unittest.IsolatedAsyncioTestCase):
    async def test_profile_returns_only_stored_cv_and_real_person(self):
        graduate = SimpleNamespace(
            id=uuid.uuid4(), nombre_completo='Nombre auténtico', correo_personal='real@example.com',
            telefono='3000000000', departamento_residencia='Antioquia', ciudad_residencia='Medellín',
            titular_profesional='Ingeniería', biografia='Biografía registrada', disponible_para_trabajar=True,
        )
        cv = SimpleNamespace(id=uuid.uuid4(), nombre_archivo='mi-cv.pdf', tamano_kb=37,
                             subido_en=None, es_predeterminado=True, url_archivo='https://storage.example/cv.pdf')
        responses = []
        for obj, records in ((graduate, []), (None, []), (None, [cv])):
            result = MagicMock()
            result.scalar_one_or_none.return_value = obj
            result.scalars.return_value.first.return_value = obj
            result.scalars.return_value.all.return_value = records
            responses.append(result)
        session = SimpleNamespace(execute=AsyncMock(side_effect=responses))
        profile = await GraduateService.get_profile_async(session, str(uuid.uuid4()))
        self.assertEqual(profile.nombre_completo, 'Nombre auténtico')
        self.assertEqual(profile.cvs[0].fileName, 'mi-cv.pdf')
        self.assertEqual(profile.cvs[0].size, 37 * 1024)
        self.assertEqual(profile.hoja_de_vida_pdf_url, cv.url_archivo)
        self.assertFalse(profile.titulo_verificado)

    async def test_invalid_cv_cannot_be_presented_as_uploaded(self):
        graduate = SimpleNamespace(id=uuid.uuid4())
        first = MagicMock()
        first.scalar_one_or_none.return_value = graduate
        second = MagicMock()
        second.scalars.return_value.all.return_value = []
        session = SimpleNamespace(execute=AsyncMock(side_effect=[first, second]), commit=AsyncMock())
        file = UploadFile(filename='fabricado.pdf', file=__import__('io').BytesIO(b'Esto no es un PDF'))
        with self.assertRaises(HTTPException) as error:
            await graduate_router.upload_my_cv(file, {'sub': str(uuid.uuid4())}, session)
        self.assertEqual(error.exception.status_code, 400)
        session.commit.assert_not_awaited()

    async def test_private_cv_receives_short_lived_signed_url(self):
        graduate = SimpleNamespace(
            id=uuid.uuid4(), nombre_completo='Persona', correo_personal='person@example.com',
            telefono='3000000000', departamento_residencia='Antioquia', ciudad_residencia='Medellín',
            titular_profesional='Profesional',
        )
        cv = SimpleNamespace(
            id=uuid.uuid4(), nombre_archivo='hoja.pdf', tamano_kb=2,
            subido_en=None, es_predeterminado=True,
            url_archivo='https://storage.example/storage/v1/object/public/vincula-hojas-de-vida/hojas-de-vida/abc.pdf',
        )
        responses = []
        for obj, records in ((graduate, []), (None, []), (None, [cv])):
            result = MagicMock()
            result.scalar_one_or_none.return_value = obj
            result.scalars.return_value.first.return_value = obj
            result.scalars.return_value.all.return_value = records
            responses.append(result)
        session = SimpleNamespace(execute=AsyncMock(side_effect=responses))
        with patch('app.modules.graduates.services.SupabaseStorageService.create_signed_url', new_callable=AsyncMock, return_value='https://storage.example/signed/cv') as signer:
            profile = await GraduateService.get_profile_async(session, str(uuid.uuid4()))
        self.assertEqual(profile.cvs[0].url, 'https://storage.example/signed/cv')
        signer.assert_awaited_once_with('vincula-hojas-de-vida', 'hojas-de-vida/abc.pdf', expires_in=900)
