import unittest
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from fastapi import HTTPException

from app.modules.institutions.schemas import (
    FacultadUpdateRequest,
    ProgramaUpdateRequest,
    SedeUpdateRequest,
)
from app.modules.institutions.services import InstitutionService


def _exec_result(scalar=None):
    res = MagicMock()
    res.scalar_one_or_none.return_value = scalar
    res.scalar.return_value = scalar
    return res


class InstitutionStructureServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_delete_facultad_refused_when_programs_exist(self):
        ies_id = str(uuid.uuid4())
        fac_id = str(uuid.uuid4())
        session = MagicMock()
        session.execute = AsyncMock(side_effect=[
            _exec_result(SimpleNamespace(id=uuid.UUID(fac_id))),
            _exec_result(2),
        ])
        session.delete = AsyncMock()

        with self.assertRaises(HTTPException) as ctx:
            await InstitutionService.delete_facultad(session, ies_id, fac_id)

        self.assertEqual(ctx.exception.status_code, 409)
        session.delete.assert_not_awaited()

    async def test_delete_facultad_succeeds_without_programs(self):
        ies_id = str(uuid.uuid4())
        fac_id = str(uuid.uuid4())
        fac_obj = SimpleNamespace(id=uuid.UUID(fac_id))
        session = MagicMock()
        session.execute = AsyncMock(side_effect=[_exec_result(fac_obj), _exec_result(0)])
        session.delete = AsyncMock()
        session.commit = AsyncMock()

        await InstitutionService.delete_facultad(session, ies_id, fac_id)

        session.delete.assert_awaited_once_with(fac_obj)
        session.commit.assert_awaited_once()

    async def test_update_facultad_updates_fields(self):
        ies_id = uuid.uuid4()
        fac_id = uuid.uuid4()
        fac_obj = SimpleNamespace(
            id=fac_id,
            id_institucion=ies_id,
            codigo="FCNI",
            sigla="FCNI",
            nombre="Facultad Inicial",
            telefono=None,
            oficina=None,
            color_distintivo="#00A86B",
            estado="activa",
            creado_en=datetime.now(timezone.utc),
        )
        session = MagicMock()
        session.execute = AsyncMock(return_value=_exec_result(fac_obj))
        session.commit = AsyncMock()
        session.refresh = AsyncMock()

        resp = await InstitutionService.update_facultad(
            session,
            str(ies_id),
            str(fac_id),
            FacultadUpdateRequest(nombre="Facultad de Ingeniería", sigla="FI", estado="inactiva"),
        )

        self.assertEqual(resp.nombre, "Facultad de Ingeniería")
        self.assertEqual(resp.sigla, "FI")
        self.assertEqual(resp.estado, "inactiva")

    async def test_delete_sede_refused_when_programs_exist(self):
        ies_id = str(uuid.uuid4())
        sede_id = str(uuid.uuid4())
        session = MagicMock()
        session.execute = AsyncMock(side_effect=[
            _exec_result(SimpleNamespace(id=uuid.UUID(sede_id))),
            _exec_result(1),
        ])
        session.delete = AsyncMock()

        with self.assertRaises(HTTPException) as ctx:
            await InstitutionService.delete_sede(session, ies_id, sede_id)

        self.assertEqual(ctx.exception.status_code, 409)
        session.delete.assert_not_awaited()

    async def test_update_sede_unsets_previous_main(self):
        ies_id = uuid.uuid4()
        sede_id = uuid.uuid4()
        sede_obj = SimpleNamespace(
            id=sede_id,
            id_institucion=ies_id,
            nombre="Campus Norte",
            nombre_corto="Norte",
            ciudad="Bucaramanga",
            departamento="Santander",
            direccion="Calle 1",
            telefono=None,
            correo=None,
            es_sede_principal=False,
            estado="activa",
            creado_en=datetime.now(timezone.utc),
        )
        session = MagicMock()
        session.execute = AsyncMock(side_effect=[_exec_result(sede_obj), MagicMock()])
        session.commit = AsyncMock()
        session.refresh = AsyncMock()

        resp = await InstitutionService.update_sede(
            session,
            str(ies_id),
            str(sede_id),
            SedeUpdateRequest(es_sede_principal=True, nombre="Campus Principal Norte"),
        )

        self.assertTrue(resp.es_sede_principal)
        self.assertEqual(resp.nombre, "Campus Principal Norte")
        self.assertEqual(session.execute.await_count, 2)

    async def test_update_programa_rejects_foreign_faculty(self):
        ies_id = uuid.uuid4()
        prog_id = uuid.uuid4()
        new_fac_id = uuid.uuid4()
        prog_obj = SimpleNamespace(
            id=prog_id,
            id_institucion=ies_id,
            id_facultad=uuid.uuid4(),
            id_sede=uuid.uuid4(),
            codigo_interno="101",
            codigo_snies="101",
            nombre="Tecnología en Producción Industrial",
            nivel_formacion="Tecnológico",
            modalidad="Presencial",
            duracion_semestres=6,
            total_creditos=96,
            nombre_director=None,
            correo_director=None,
            estado_acreditacion="Registro Calificado Vigente",
            estado="activo",
            facultad=None,
            sede=None,
            asesores_asignados=[],
            creado_en=datetime.now(timezone.utc),
        )
        session = MagicMock()
        session.execute = AsyncMock(side_effect=[_exec_result(prog_obj), _exec_result(None)])
        session.commit = AsyncMock()

        with self.assertRaises(HTTPException) as ctx:
            await InstitutionService.update_programa(
                session,
                str(ies_id),
                str(prog_id),
                ProgramaUpdateRequest(id_facultad=str(new_fac_id)),
            )

        self.assertEqual(ctx.exception.status_code, 400)
        session.commit.assert_not_awaited()
