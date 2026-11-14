import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi import HTTPException

from app.integrations.email_service import get_stage_display_info, normalize_stage_key
from app.modules.graduates.services import GraduateService
from app.modules.vacancies_ats.schemas import MoverFaseRequest
from app.modules.vacancies_ats.services import VacancyATSService as Service


class HiringPhaseTests(unittest.IsolatedAsyncioTestCase):
    def test_contratado_es_una_fase_propia_y_no_una_oferta(self):
        self.assertEqual(Service.STAGE_UI_TO_DB["hired"], "contratado")
        self.assertEqual(Service.STAGE_DB_TO_UI["contratado"], "hired")
        self.assertEqual(normalize_stage_key("hired"), "contratado")
        self.assertIn("6 de 6", get_stage_display_info("contratado")["badge"])
        self.assertEqual(GraduateService.STAGE_DB_TO_UI["contratado"], "hired")

    async def test_descartar_sin_motivo_se_rechaza(self):
        for motivo in (None, "   "):
            with self.assertRaises(HTTPException) as raised:
                await Service.mover_fase_candidato(
                    None, str(uuid.uuid4()), "reclutador_empresa", str(uuid.uuid4()),
                    MoverFaseRequest(fase_nueva="discarded", motivo_descarte=motivo),
                )
            self.assertEqual(raised.exception.detail["codigo"], "MOTIVO_DESCARTE_REQUERIDO")

    async def test_la_contratacion_se_atribuye_al_programa_afin(self):
        afin, otro = uuid.uuid4(), uuid.uuid4()
        acad_otro = SimpleNamespace(id=uuid.uuid4(), id_programa=otro)
        acad_afin = SimpleNamespace(id=uuid.uuid4(), id_programa=afin)
        postulacion = SimpleNamespace(
            id=uuid.uuid4(),
            egresado=SimpleNamespace(academicos=[acad_otro, acad_afin]),
            vacante=SimpleNamespace(
                titulo="Analista", tipo_contrato="Término Indefinido", modalidad="Presencial",
                salario_es_confidencial=False, salario_minimo=2000000, salario_maximo=3000000,
                empresa=SimpleNamespace(nombre_comercial="Acme", razon_social="Acme SAS"),
                programas_afines=[SimpleNamespace(id_programa=afin)],
            ),
        )
        session = SimpleNamespace(execute=AsyncMock())
        await Service._registrar_vinculacion_laboral(session, postulacion)
        params = session.execute.await_args.args[1]
        self.assertEqual(params["academico"], acad_afin.id)
        self.assertEqual((params["empresa"], params["cargo"], params["rango"]),
                         ("Acme", "Analista", "2.000.000 - 3.000.000"))
        self.assertEqual(params["postulacion"], postulacion.id)

    async def test_sin_registro_academico_no_se_inventa_vinculacion(self):
        session = SimpleNamespace(execute=AsyncMock())
        await Service._registrar_vinculacion_laboral(
            session, SimpleNamespace(id=uuid.uuid4(), egresado=SimpleNamespace(academicos=[]), vacante=SimpleNamespace()))
        session.execute.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
