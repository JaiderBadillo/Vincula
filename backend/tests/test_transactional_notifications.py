import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from app.integrations.transactional_notifications import build_message, send_vincula_email
from app.modules.vacancies_ats.services import VacancyATSService


class TransactionalNotificationTests(unittest.IsolatedAsyncioTestCase):
    def test_all_requested_messages_use_vincula_layout(self):
        for kind in (
            "registro_egresado", "registro_empresa", "registro_ies",
            "egresado_verificado", "empresa_aprobada", "ies_aprobada",
            "fase_postulacion", "vacante_publicada",
            "postulacion_creada", "nueva_postulacion_empresa",
        ):
            with self.subTest(kind=kind):
                subject, plain, html = build_message(kind, {
                    "nombre": "Ana <Test>", "institucion": "Universidad UTS",
                    "empresa": "Empresa", "vacante": "Analista", "fase_nueva": "entrevista",
                    "codigo": "VAC-01", "candidato": "Carlos Ruiz",
                })
                self.assertTrue(subject and plain)
                self.assertIn("#336F24", html)
                self.assertIn("Ana &lt;Test&gt;", html)
                self.assertNotIn("cid:vincula_logo", html)

    async def test_dispatches_only_when_n8n_is_configured(self):
        dispatcher = AsyncMock(return_value=True)
        with patch("app.integrations.transactional_notifications.settings") as config, patch(
            "app.integrations.transactional_notifications.N8nWebhookDispatcher.dispatch_event", dispatcher
        ):
            config.BREVO_API_KEY = ""
            config.N8N_WEBHOOK_BASE_URL = ""
            config.N8N_WEBHOOK_SECRET = ""
            self.assertFalse(await send_vincula_email("registro_empresa", "test@example.com"))
            dispatcher.assert_not_awaited()
            config.N8N_WEBHOOK_BASE_URL = "https://example.test/webhook"
            config.N8N_WEBHOOK_SECRET = "configured"
            self.assertTrue(await send_vincula_email("empresa_aprobada", "test@example.com", empresa="Prueba"))
            event, payload = dispatcher.await_args.args
            self.assertEqual(event, "correo-transaccional")
            self.assertEqual(payload["tipo"], "empresa_aprobada")
            self.assertEqual(payload["correo"], "test@example.com")
            self.assertIn("<html", payload["html"])

    async def test_sends_with_brevo_when_api_key_is_set(self):
        fake_response = SimpleNamespace(status_code=201, text="{}")
        fake_client = AsyncMock()
        fake_client.post = AsyncMock(return_value=fake_response)
        fake_cm = AsyncMock()
        fake_cm.__aenter__.return_value = fake_client
        with patch("app.integrations.transactional_notifications.settings") as config, patch(
            "app.integrations.transactional_notifications.httpx.AsyncClient", return_value=fake_cm
        ):
            config.BREVO_API_KEY = "xkeysib-test"
            config.SMTP_FROM_EMAIL = "vincula.b.empleo@gmail.com"
            config.SMTP_FROM_NAME = "Vincula"
            config.SMTP_USER = ""
            ok = await send_vincula_email(
                "postulacion_creada", "egresado@example.com",
                nombre="Laura", empresa="Acme", vacante="Dev", codigo="VAC-9",
            )
        self.assertTrue(ok)
        fake_client.post.assert_awaited_once()

    async def test_notify_application_created_sends_to_graduate_and_recruiter(self):
        rec = SimpleNamespace(correo_corporativo="rec@empresa.com", nombre_completo="Juan Rec")
        exec_res = MagicMock()
        exec_res.scalar_one_or_none.return_value = rec
        session = AsyncMock()
        session.execute = AsyncMock(return_value=exec_res)
        empresa = SimpleNamespace(nombre_comercial="Acme", razon_social="Acme SAS", correo_contacto="admin@empresa.com", persona_contacto="Admin")
        vacante = SimpleNamespace(titulo="Analista", codigo_vacante="VAC-10", id_reclutador_responsable="rec-uuid")
        egresado = SimpleNamespace(nombre_completo="Ana Egresada", correo_personal="ana@uts.edu.co")
        sender = AsyncMock(return_value=True)
        with patch("app.modules.vacancies_ats.services.send_vincula_email", sender):
            await VacancyATSService._notify_application_created(session, empresa, vacante, egresado)
        self.assertEqual(sender.await_count, 2)
        self.assertEqual(sender.await_args_list[0].args[:2], ("postulacion_creada", "ana@uts.edu.co"))
        self.assertEqual(sender.await_args_list[1].args[:2], ("nueva_postulacion_empresa", "rec@empresa.com"))


if __name__ == "__main__":
    unittest.main()
