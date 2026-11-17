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
        self.assertFalse(card.degreeVerified)
        self.assertFalse(card.hasDiplomaPdf)

    def test_verified_graduate_diploma_metadata_is_exposed_to_recruiter(self):
        academic = SimpleNamespace(
            id=uuid.uuid4(),
            programa=SimpleNamespace(nombre='Ingeniería de Sistemas'),
            institucion=SimpleNamespace(nombre_oficial='Unidades Tecnológicas de Santander', nombre_corto='UTS'),
            ano_graduacion=2025,
            nivel_formacion='Profesional Universitario',
            validado_por_ies=True,
            estado_verificacion='aprobado',
            diploma_cargado_por_egresado=True,
            url_diploma_pdf='diplomas/egresado-1/diploma_grado.pdf',
            numero_acta_grado='ACTA-2025-88',
            numero_libro_folio='LIB-4-FOL-12',
            fecha_grado='2025-11-20',
            sello_digital='sha256-seal-xyz',
        )
        graduate = SimpleNamespace(
            nombre_completo='Angie Camargo', correo_personal='angie@example.com',
            telefono='3001234567', ciudad_residencia='Bucaramanga', url_avatar=None,
            academicos=[academic], titular_profesional='Ingeniera de Sistemas',
        )
        vacancy = SimpleNamespace(
            titulo='Desarrolladora Backend', codigo_vacante='VAC-01', id_sede=uuid.uuid4(), competencias=[],
        )
        application = SimpleNamespace(
            id=uuid.uuid4(), egresado=graduate, vacante=vacancy, fase_actual='en_revision',
            id_vacante=uuid.uuid4(), porcentaje_afinidad=92, postulado_en=None,
            notas=[], entrevistas=[], motivo_descarte=None,
        )
        card = VacancyATSService._build_candidate_card(application)
        self.assertTrue(card.degreeVerified)
        self.assertTrue(card.hasDiplomaPdf)
        self.assertEqual(card.diplomaFileName, 'diploma_grado.pdf')
        self.assertEqual(card.actaNumber, 'ACTA-2025-88')
        self.assertEqual(card.bookFolio, 'LIB-4-FOL-12')
        self.assertEqual(card.degreeDate, '2025-11-20')
        self.assertEqual(card.digitalSeal, 'sha256-seal-xyz')


class RecruiterNoPhantomRecordsTests(unittest.IsolatedAsyncioTestCase):
    async def test_vacancy_without_recruiter_does_not_create_an_imaginary_one(self):
        company_id = uuid.uuid4()
        site = SimpleNamespace(id=uuid.uuid4(), id_empresa=company_id)
        found = MagicMock()
        found.scalar_one_or_none.return_value = site
        session = SimpleNamespace(execute=AsyncMock(return_value=found), add=MagicMock())
        payload = SimpleNamespace(id_sede=site.id, id_reclutador_responsable=None)
        with self.assertRaises(HTTPException) as error:
            await VacancyATSService.create_vacancy(session, str(company_id), 'aprobado', payload)
        self.assertEqual(error.exception.status_code, 422)
        session.add.assert_not_called()

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

    async def test_recruiter_can_get_signed_diploma_url_even_when_verified(self):
        company_id = uuid.uuid4()
        academic_id = uuid.uuid4()
        app_id = uuid.uuid4()
        academic = SimpleNamespace(
            id=academic_id,
            validado_por_ies=True,
            estado_verificacion='aprobado',
            diploma_cargado_por_egresado=True,
            url_diploma_pdf='diplomas/egr-1/titulo_verificado.pdf',
            numero_acta_grado='ACTA-99',
            numero_libro_folio='FOLIO-10',
            fecha_grado='2025-06-15',
            sello_digital='sello-123',
        )
        postulacion = SimpleNamespace(
            id=app_id,
            id_egresado=uuid.uuid4(),
            vacante=SimpleNamespace(id_empresa=company_id),
            egresado=SimpleNamespace(academicos=[academic]),
        )
        found = MagicMock()
        found.scalar_one_or_none.return_value = postulacion
        session = SimpleNamespace(execute=AsyncMock(return_value=found))

        with patch(
            'app.modules.vacancies_ats.services.SupabaseStorageService.create_signed_url',
            new_callable=AsyncMock,
            return_value='https://supabase.example.com/signed/titulo_verificado.pdf',
        ) as sign_mock:
            res = await VacancyATSService.get_candidate_diploma_url_async(
                session=session,
                id_postulacion=str(app_id),
                user_role='reclutador_empresa',
                company_id=str(company_id),
                expires_in=3600,
            )

        self.assertEqual(res.url_segura, 'https://supabase.example.com/signed/titulo_verificado.pdf')
        self.assertTrue(res.titulo_verificado)
        self.assertEqual(res.nombre_archivo, 'titulo_verificado.pdf')
        self.assertEqual(res.numero_acta_grado, 'ACTA-99')
        sign_mock.assert_awaited_once()

    async def test_recruiter_from_other_company_cannot_get_candidate_diploma_url(self):
        app_id = uuid.uuid4()
        postulacion = SimpleNamespace(
            id=app_id,
            id_egresado=uuid.uuid4(),
            vacante=SimpleNamespace(id_empresa=uuid.uuid4()),
            egresado=SimpleNamespace(academicos=[]),
        )
        found = MagicMock()
        found.scalar_one_or_none.return_value = postulacion
        session = SimpleNamespace(execute=AsyncMock(return_value=found))

        with self.assertRaises(HTTPException) as error:
            await VacancyATSService.get_candidate_diploma_url_async(
                session=session,
                id_postulacion=str(app_id),
                user_role='reclutador_empresa',
                company_id=str(uuid.uuid4()),
            )
        self.assertEqual(error.exception.status_code, 403)
