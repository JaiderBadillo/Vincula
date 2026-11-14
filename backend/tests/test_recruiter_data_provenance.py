import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException

from app.modules.vacancies_ats.services import VacancyATSService
from app.modules.vacancies_ats.schemas import PostulacionCreateRequest, MoverFaseRequest


class RecruiterDataProvenanceTests(unittest.TestCase):
    def test_missing_candidate_fields_are_not_fabricated(self):
        graduate = SimpleNamespace(
            nombre_completo='Persona real', correo_personal='real@example.com',
            telefono=None, ciudad_residencia=None, url_avatar=None,
            academicos=[], titular_profesional=None,
        )
        vacancy = SimpleNamespace(
            titulo='Vacante real', codigo_vacante='REAL-1', id_sede=uuid.uuid4(), competencias=[],
        )
        application = SimpleNamespace(
            id=uuid.uuid4(), egresado=graduate, vacante=vacancy, fase_actual='en_revision',
            id_vacante=uuid.uuid4(), porcentaje_afinidad=None, postulado_en=None,
            notas=[], entrevistas=[], motivo_descarte=None,
        )
        card = VacancyATSService._build_candidate_card(application)
        self.assertEqual(card.candidateName, 'Persona real')
        self.assertEqual(card.vacancyTitle, 'Vacante real')
        self.assertIsNone(card.matchPercentage)
        self.assertEqual(card.phone, '')
        self.assertEqual(card.city, '')
        self.assertEqual(card.program, '')
        self.assertIsNone(card.graduationYear)


class RecruiterNoPhantomRecordsTests(unittest.IsolatedAsyncioTestCase):
    async def test_unknown_vacancy_cannot_create_fake_application(self):
        graduate = SimpleNamespace(id=uuid.uuid4())
        found = MagicMock()
        found.scalar_one_or_none.return_value = graduate
        missing = MagicMock()
        missing.scalar_one_or_none.return_value = None
        session = SimpleNamespace(execute=AsyncMock(side_effect=[found, missing]), add=MagicMock())
        payload = PostulacionCreateRequest(vacante_titulo='Vacante de muestra', empresa_nombre='Empresa de muestra')
        with patch('app.modules.vacancies_ats.services.N8nWebhookDispatcher.dispatch_event', new_callable=AsyncMock) as webhook:
            with self.assertRaises(HTTPException) as error:
                await VacancyATSService.postular_egresado(session, str(uuid.uuid4()), str(uuid.uuid4()), payload=payload)
        self.assertEqual(error.exception.status_code, 404)
        session.add.assert_not_called()
        webhook.assert_not_awaited()

    async def test_unknown_application_cannot_move_stage_or_email(self):
        missing = MagicMock()
        missing.scalar_one_or_none.return_value = None
        session = SimpleNamespace(execute=AsyncMock(return_value=missing))
        payload = MoverFaseRequest(fase_nueva='interview', correo_candidato='example@example.com')
        with patch('app.modules.vacancies_ats.services.send_vincula_email', new_callable=AsyncMock) as mail:
            with self.assertRaises(HTTPException) as error:
                await VacancyATSService.mover_fase_candidato(
                    session, str(uuid.uuid4()), 'reclutador_empresa', str(uuid.uuid4()), payload, str(uuid.uuid4()),
                )
        self.assertEqual(error.exception.status_code, 404)
        mail.assert_not_awaited()
