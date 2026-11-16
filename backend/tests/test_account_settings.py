import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException

from app.modules.iam.account_settings import change_password, get_settings
from app.modules.iam.advisor_settings import PasswordChange
from app.modules.iam.services import IAMService


class AccountSettingsTests(unittest.IsolatedAsyncioTestCase):
    async def test_password_change_requires_current_password_for_company_admin(self):
        user_id = uuid.uuid4()
        user = SimpleNamespace(id=user_id, rol="admin_empresa", estado="activo",
                               contrasena_hash="stored-hash")
        result = MagicMock()
        result.scalar_one_or_none.return_value = user
        session = SimpleNamespace(execute=AsyncMock(return_value=result), commit=AsyncMock())

        with patch("app.modules.iam.account_settings.verify_password", return_value=False):
            with self.assertRaises(HTTPException) as raised:
                await change_password(PasswordChange(contrasena_actual="incorrecta", nueva_contrasena="ClaveNueva123!"),
                                      {"sub": str(user_id), "rol": "admin_empresa"}, session)
        self.assertEqual(raised.exception.status_code, 403)
        session.commit.assert_not_awaited()

    async def test_account_settings_come_from_authenticated_user(self):
        user_id = uuid.uuid4()
        user = SimpleNamespace(id=user_id, rol="egresado", estado="activo", correo_electronico="real@example.com",
                               google_sub=None, ultimo_acceso_en=None, actualizado_en=None)
        result = MagicMock()
        result.scalar_one_or_none.return_value = user
        session = SimpleNamespace(execute=AsyncMock(return_value=result))
        data = await get_settings({"sub": str(user_id), "rol": "egresado", "nombre": "Persona real"}, session)
        self.assertEqual(data["correo"], "real@example.com")
        self.assertEqual(data["nombre"], "Persona real")

    async def test_google_login_links_google_sub_for_graduate(self):
        user_id = uuid.uuid4()
        grad_id = uuid.uuid4()
        usuario = SimpleNamespace(
            id=user_id,
            rol="egresado",
            estado="activo",
            correo_electronico="angie@example.com",
            google_sub=None,
            ultimo_acceso_en=None,
        )
        egresado = SimpleNamespace(
            id=grad_id,
            nombre_completo="Angie Camargo",
            url_avatar="https://example.com/avatar.png",
        )

        res_user = MagicMock()
        res_user.scalar_one_or_none.return_value = usuario
        res_owner = MagicMock()
        res_owner.first.return_value = None
        res_grad = MagicMock()
        res_grad.scalar_one_or_none.return_value = egresado

        session = SimpleNamespace(
            execute=AsyncMock(side_effect=[res_user, res_owner, res_grad]),
            commit=AsyncMock(),
        )

        with patch(
            "app.modules.iam.services.id_token.verify_oauth2_token",
            return_value={
                "email": "angie@example.com",
                "name": "Angie Camargo",
                "sub": "google-sub-12345",
                "email_verified": True,
            },
        ), patch("app.modules.iam.services.IAMService.create_token_for_user", return_value=SimpleNamespace(access_token="tok")):
            await IAMService.authenticate_google(session, credential="fake-jwt")

        self.assertEqual(usuario.google_sub, "google-sub-12345")
        session.commit.assert_awaited()


if __name__ == "__main__":
    unittest.main()
