import unittest
from unittest.mock import AsyncMock, patch

from app.integrations.transactional_notifications import build_message, send_vincula_email


class TransactionalNotificationTests(unittest.IsolatedAsyncioTestCase):
    def test_all_requested_messages_use_vincula_layout(self):
        for kind in (
            "registro_egresado", "registro_empresa", "registro_ies",
            "egresado_verificado", "empresa_aprobada", "ies_aprobada", "fase_postulacion",
        ):
            with self.subTest(kind=kind):
                subject, plain, html = build_message(kind, {
                    "nombre": "Ana <Test>", "institucion": "Universidad UTS",
                    "empresa": "Empresa", "vacante": "Analista", "fase_nueva": "entrevista",
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


if __name__ == "__main__":
    unittest.main()
