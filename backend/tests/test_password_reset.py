import importlib
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

reset = importlib.import_module('app.modules.iam.password_reset')


class FakeDB:
    def __init__(self):
        self.user = SimpleNamespace(id='user-1', correo_electronico='egresado@example.com', estado='activo', contrasena_hash='old')
        self.record = None
        self.calls = 0
        self.commits = 0
        self.rollbacks = 0

    async def execute(self, statement):
        self.calls += 1
        value = self.user if self.calls % 2 else self.record
        return SimpleNamespace(scalar_one_or_none=lambda: value)

    def add(self, record): self.record = record
    async def delete(self, record): self.record = None
    async def commit(self): self.commits += 1
    async def rollback(self): self.rollbacks += 1


class RecoveryTests(unittest.IsolatedAsyncioTestCase):
    async def test_complete_flow_and_one_time_code(self):
        db = FakeDB()
        with patch.object(reset.settings, 'BREVO_API_KEY', ''), \
             patch.object(reset.settings, 'SMTP_USER', 'smtp@example.com'), \
             patch.object(reset.settings, 'SMTP_PASSWORD', 'configured'), \
             patch.object(reset.secrets, 'randbelow', return_value=42), \
             patch.object(reset.EmailService, 'send_email', new_callable=AsyncMock, return_value={'success': True}) as mail:
            requested = await reset.request_code(reset.RequestCode(correo='Egresado@example.com'), db)
            self.assertEqual(requested['mensaje'], reset.GENERIC_MESSAGE)
            self.assertNotIn('000042', db.record.codigo_hash)
            self.assertIn('000042', mail.call_args.args[3])
            with patch.object(reset, 'get_password_hash', return_value='new-hash'):
                changed = await reset.confirm_reset(reset.ResetPassword(correo='egresado@example.com', codigo='000042', nueva_contrasena='new-password-1'), db)
            self.assertIn('actualizada', changed['mensaje'])
            self.assertEqual(db.user.contrasena_hash, 'new-hash')
            self.assertIsNone(db.record)
            with self.assertRaises(HTTPException):
                await reset.confirm_reset(reset.ResetPassword(correo='egresado@example.com', codigo='000042', nueva_contrasena='new-password-2'), db)

    async def test_invalid_attempts_and_delivery_failure(self):
        db = FakeDB()
        with patch.object(reset.settings, 'BREVO_API_KEY', ''), \
             patch.object(reset.settings, 'SMTP_USER', 'smtp@example.com'), \
             patch.object(reset.settings, 'SMTP_PASSWORD', 'configured'), \
             patch.object(reset.EmailService, 'send_email', new_callable=AsyncMock, return_value={'success': False}):
            with self.assertRaises(HTTPException) as error:
                await reset.request_code(reset.RequestCode(correo='egresado@example.com'), db)
            self.assertEqual(error.exception.status_code, 503)
            self.assertEqual(db.rollbacks, 1)

        db = FakeDB()
        db.record = SimpleNamespace(codigo_hash=reset.code_digest(db.user.id, '123456'),
                                    expira_en=datetime.now(timezone.utc).replace(year=2099), intentos=0)
        for count in range(5):
            with self.assertRaises(HTTPException):
                await reset.confirm_reset(reset.ResetPassword(correo='egresado@example.com', codigo='000000', nueva_contrasena='new-password-1'), db)
            self.assertEqual(db.record.intentos, count + 1)
        with self.assertRaises(HTTPException):
            await reset.confirm_reset(reset.ResetPassword(correo='egresado@example.com', codigo='123456', nueva_contrasena='new-password-1'), db)
        self.assertEqual(db.user.contrasena_hash, 'old')


class BrevoDeliveryTests(unittest.IsolatedAsyncioTestCase):
    """En producción el correo sale por Brevo; el código viaja en texto plano y HTML, sin botones."""

    async def test_codigo_y_aviso_de_cambio_salen_por_brevo(self):
        db = FakeDB()
        with patch.object(reset.settings, 'BREVO_API_KEY', 'key'),              patch.object(reset.settings, 'SMTP_USER', ''),              patch.object(reset.secrets, 'randbelow', return_value=7),              patch.object(reset, 'send_vincula_email', new_callable=AsyncMock, return_value=True) as mail:
            await reset.request_code(reset.RequestCode(correo='egresado@example.com'), db)
            self.assertEqual(mail.call_args.args[:2], ('recuperacion_contrasena', 'egresado@example.com'))
            self.assertEqual(mail.call_args.kwargs['codigo'], '000007')
            with patch.object(reset, 'get_password_hash', return_value='new-hash'):
                await reset.confirm_reset(reset.ResetPassword(correo='egresado@example.com', codigo='000007', nueva_contrasena='new-password-1'), db)
            # el titular recibe un aviso de que su contraseña cambió
            self.assertEqual(mail.call_args.args[0], 'contrasena_actualizada')

    async def test_fallo_del_aviso_no_deshace_el_cambio(self):
        db = FakeDB()
        db.record = SimpleNamespace(codigo_hash=reset.code_digest(db.user.id, '123456'),
                                    expira_en=datetime.now(timezone.utc).replace(year=2099), intentos=0)
        with patch.object(reset, 'send_vincula_email', new_callable=AsyncMock, side_effect=RuntimeError('caído')),              patch.object(reset, 'get_password_hash', return_value='new-hash'):
            await reset.confirm_reset(reset.ResetPassword(correo='egresado@example.com', codigo='123456', nueva_contrasena='new-password-1'), db)
        self.assertEqual(db.user.contrasena_hash, 'new-hash')

    async def test_sin_proveedor_responde_igual_exista_o_no_el_correo(self):
        """El 503 por falta de configuración no debe depender de que el usuario exista."""
        for exists in (True, False):
            db = FakeDB()
            if not exists:
                db.user = None
            with patch.object(reset.settings, 'BREVO_API_KEY', ''), patch.object(reset.settings, 'SMTP_USER', ''):
                with self.assertRaises(HTTPException) as error:
                    await reset.request_code(reset.RequestCode(correo='alguien@example.com'), db)
            self.assertEqual(error.exception.status_code, 503)

    def test_plantillas_de_seguridad(self):
        from app.integrations.transactional_notifications import build_message
        subject, plain, html = build_message('recuperacion_contrasena', {'codigo': '048213', 'minutos_validez': 10})
        self.assertIn('048213', plain)          # Brevo envía `plain` como texto plano
        self.assertIn('048213', html)
        _, _, aviso = build_message('contrasena_actualizada', {})
        for page in (html, aviso):
            self.assertNotIn('vincula.vercel.app', page)   # dominio ajeno que usaban otros correos
            self.assertNotIn('Ingresar a Vincula', page)   # sin botón en correos de seguridad
        _, _, otro = build_message('registro_egresado', {})
        self.assertIn('vincula-henna.vercel.app', otro)
        self.assertNotIn('//vincula.vercel.app', otro)


if __name__ == '__main__': unittest.main()
