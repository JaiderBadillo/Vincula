import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException

from app.modules.institutions.services import InstitutionService
from app.modules.superadmin.services import SuperAdminService
from app.modules.graduates.services import GraduateService


class DocumentProvenanceTests(unittest.IsolatedAsyncioTestCase):
    async def test_existing_storage_url_without_graduate_upload_is_not_viewable(self):
        ies_id = uuid.uuid4()
        acad_id = uuid.uuid4()
        acad = SimpleNamespace(
            id=acad_id, id_institucion=ies_id,
            url_diploma_pdf="https://example.supabase.co/storage/v1/object/public/diplomas/fabricado.pdf",
            diploma_cargado_por_egresado=False,
        )
        result = MagicMock()
        result.first.return_value = (acad, None, None, None)
        session = SimpleNamespace(execute=AsyncMock(return_value=result))

        with patch("app.modules.institutions.services.SupabaseStorageService.create_signed_url", new_callable=AsyncMock) as signer:
            with self.assertRaises(HTTPException) as context:
                await InstitutionService.get_diploma_secure_url(session, str(ies_id), str(acad_id))
            self.assertEqual(context.exception.status_code, 404)
            signer.assert_not_awaited()

    async def test_existing_company_url_without_user_upload_is_not_signed(self):
        doc_id = uuid.uuid4()
        doc = SimpleNamespace(id=doc_id, archivo_cargado_por_usuario=False)
        result = MagicMock()
        result.scalar_one_or_none.return_value = doc
        session = SimpleNamespace(execute=AsyncMock(return_value=result))

        with patch("app.modules.superadmin.services.SupabaseStorageService.create_signed_url", new_callable=AsyncMock) as signer:
            with self.assertRaisesRegex(ValueError, "carga del usuario"):
                await SuperAdminService.get_document_secure_url(session, str(doc_id))
            signer.assert_not_awaited()

    async def test_graduate_profile_uses_record_and_does_not_claim_verification(self):
        graduate = SimpleNamespace(
            id=uuid.uuid4(), nombre_completo="Persona real", correo_personal="real@example.com",
            telefono="3000000000", departamento_residencia="Santander",
            ciudad_residencia="Bucaramanga", titular_profesional="Ingeniería Industrial",
        )
        results = []
        for record in (graduate, None, None):
            result = MagicMock()
            result.scalar_one_or_none.return_value = record
            result.scalars.return_value.first.return_value = record
            result.scalars.return_value.all.return_value = []
            results.append(result)
        session = SimpleNamespace(execute=AsyncMock(side_effect=results))

        profile = await GraduateService.get_profile_async(session, str(uuid.uuid4()))
        self.assertEqual(profile.nombre_completo, "Persona real")
        self.assertFalse(profile.titulo_verificado)
        self.assertIsNone(profile.hoja_de_vida_pdf_url)


if __name__ == "__main__":
    unittest.main()
