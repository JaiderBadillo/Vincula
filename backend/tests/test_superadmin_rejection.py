# -*- coding: utf-8 -*-
"""Una cuenta ya aprobada no se puede rechazar. Sin base de datos real."""

import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi import HTTPException

from app.modules.superadmin.services import SuperAdminService


class RejectionTests(unittest.IsolatedAsyncioTestCase):
    async def test_approved_company_and_institution_cannot_be_rejected(self):
        for reject in (SuperAdminService.reject_company, SuperAdminService.reject_institution):
            entity = SimpleNamespace(id=uuid.uuid4(), estado="aprobado")
            session = AsyncMock()
            session.execute.return_value = SimpleNamespace(scalar_one_or_none=lambda: entity)

            with self.assertRaises(HTTPException) as ctx:
                await reject(session, str(entity.id), uuid.uuid4(), SimpleNamespace(motivo_rechazo="motivo"))

            self.assertEqual(ctx.exception.status_code, 409)
            self.assertEqual(entity.estado, "aprobado")
            session.commit.assert_not_called()


if __name__ == "__main__":
    unittest.main()
