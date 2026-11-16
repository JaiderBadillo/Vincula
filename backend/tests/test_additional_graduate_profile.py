import importlib
import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
from app.modules.graduates.schemas import GraduateProfileUpdate

router = importlib.import_module('app.modules.graduates.router')


class AdditionalProfileTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.owner = uuid.uuid4()
        self.graduate = SimpleNamespace(id=uuid.uuid4(), id_usuario=self.owner, perfil_adicional={})
        result = MagicMock()
        result.scalar_one_or_none.return_value = self.graduate
        self.db = SimpleNamespace(execute=AsyncMock(return_value=result), commit=AsyncMock())

    async def test_persists_extra_only_for_authenticated_owner(self):
        extra = {'skills': [{'name': 'Python'}], 'photo': None, 'preferences': {'modes': ['Remoto']}}
        with patch.object(router.GraduateService, 'get_profile_async', new_callable=AsyncMock, return_value={'perfil_adicional': extra}):
            result = await router.update_my_profile(GraduateProfileUpdate(perfil_adicional=extra), {'sub': str(self.owner)}, self.db)
        self.assertEqual(self.graduate.perfil_adicional, extra)
        self.assertEqual(result['perfil_adicional'], extra)
        self.db.commit.assert_awaited_once()

    async def test_rejects_unknown_fields_and_oversized_images(self):
        for extra in ({'isAdmin': True}, {'photo': 'data:image/jpeg;base64,' + 'A' * 350_000}):
            with self.assertRaises(HTTPException) as error:
                await router.update_my_profile(GraduateProfileUpdate(perfil_adicional=extra), {'sub': str(self.owner)}, self.db)
            self.assertEqual(error.exception.status_code, 422)
        self.db.commit.assert_not_awaited()
