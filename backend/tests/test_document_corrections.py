import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from app.modules.iam.router import estado_documental


def result(one=None, many=None):
    response = MagicMock()
    response.scalar_one_or_none.return_value = one
    response.scalars.return_value.first.return_value = one
    response.scalars.return_value.all.return_value = many or []
    return response


class DocumentCorrectionTests(unittest.IsolatedAsyncioTestCase):
    async def test_rejected_graduate_sees_reason_and_can_upload_without_existing_diploma(self):
        graduate = SimpleNamespace(id=uuid.uuid4())
        academic = SimpleNamespace(estado_verificacion="rechazado", motivo_rechazo="Falta diploma legible",
                                   diploma_cargado_por_egresado=False, url_diploma_pdf=None)
        session = SimpleNamespace(execute=AsyncMock(side_effect=[result(graduate), result(academic)]))
        status = await estado_documental({"rol": "egresado", "sub": str(uuid.uuid4())}, session)
        self.assertEqual(status["motivo"], "Falta diploma legible")
        self.assertEqual(status["documentos"], [])
        self.assertTrue(status["puede_subir"])

    async def test_company_only_offers_documents_marked_for_correction(self):
        entity_id = uuid.uuid4()
        company = SimpleNamespace(estado="en_subsanacion")
        docs = [SimpleNamespace(tipo_documento="rut", nombre_archivo="rut.pdf", estado="requiere_subsanacion"),
                SimpleNamespace(tipo_documento="camara_comercio", nombre_archivo="camara.pdf", estado="adjunto")]
        audit = SimpleNamespace(observaciones_correccion="Actualiza el RUT")
        session = SimpleNamespace(execute=AsyncMock(side_effect=[result(company), result(many=docs), result(audit)]))
        status = await estado_documental({"rol": "admin_empresa", "id_entidad": str(entity_id)}, session)
        self.assertEqual(status["motivo"], "Actualiza el RUT")
        self.assertEqual([doc["estado"] for doc in status["documentos"]], ["requiere_subsanacion", "adjunto"])
        self.assertTrue(status["puede_subir"])


if __name__ == "__main__":
    unittest.main()
