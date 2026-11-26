# -*- coding: utf-8 -*-
"""Suspender o desvincular un asesor corta su acceso; la cuenta administradora no se toca. Sin base de datos real."""

import unittest
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi import HTTPException

import app.modules.iam  # noqa: F401  primero: evita un import circular de los modelos
from app.core.dependencies import SUSPENDED_USERS
from app.modules.institutions.schemas import AsesorUpdateRequest
from app.modules.institutions.services import InstitutionService

IES = str(uuid.uuid4())


def setup(rol):
    user = SimpleNamespace(id=uuid.uuid4(), rol=rol, estado="activo", correo_electronico="a@b.co")
    advisor = SimpleNamespace(id=uuid.uuid4(), id_usuario=user.id, estado="activo", correo_institucional="a@b.co",
                              nombre_completo="Asesor Prueba", telefono=None, cargo="Asesor", sedes_cobertura=None,
                              id_sede=None, programas_asignados=[], creado_en=datetime.now(timezone.utc))
    session = AsyncMock()
    session.execute.side_effect = [SimpleNamespace(scalar_one_or_none=lambda value=value: value) for value in (advisor, user)]
    return session, advisor, user


class AdvisorAccessTests(unittest.IsolatedAsyncioTestCase):
    async def asyncTearDown(self):
        SUSPENDED_USERS.clear()

    async def test_unlink_cuts_open_sessions_and_reactivation_restores_them(self):
        session, advisor, user = setup("asesor_ies")
        await InstitutionService.update_asesor(session, IES, str(advisor.id), AsesorUpdateRequest(estado="desvinculado"))
        self.assertEqual((advisor.estado, user.estado), ("desvinculado", "suspendido"))
        self.assertIn(str(user.id), SUSPENDED_USERS)

        session.execute.side_effect = [SimpleNamespace(scalar_one_or_none=lambda value=value: value) for value in (advisor, user)]
        await InstitutionService.update_asesor(session, IES, str(advisor.id), AsesorUpdateRequest(estado="activo"))
        self.assertEqual(user.estado, "activo")
        self.assertNotIn(str(user.id), SUSPENDED_USERS)

    async def test_institution_admin_account_cannot_be_suspended_or_unlinked(self):
        for estado in ("inactivo", "desvinculado"):
            session, advisor, user = setup("admin_ies")
            with self.assertRaises(HTTPException) as ctx:
                await InstitutionService.update_asesor(session, IES, str(advisor.id), AsesorUpdateRequest(estado=estado))
            self.assertEqual(ctx.exception.status_code, 409)
            self.assertEqual((advisor.estado, user.estado), ("activo", "activo"))
            session.commit.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
