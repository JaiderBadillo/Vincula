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
        with patch.object(reset.settings, 'N8N_WEBHOOK_BASE_URL', ''), \
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
        with patch.object(reset.settings, 'N8N_WEBHOOK_BASE_URL', ''), \
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


if __name__ == '__main__': unittest.main()
