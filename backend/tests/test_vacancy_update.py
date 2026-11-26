# -*- coding: utf-8 -*-
"""Editar una vacante guarda sede, responsable, competencias y salario. Sin base de datos real."""

import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException

import app.modules.iam  # noqa: F401  primero: evita un import circular de los modelos
from app.modules.vacancies_ats.services import VacancyATSService
from app.modules.vacancies_ats.models import CompetenciaExigidaVacante
from app.modules.vacancies_ats.schemas import CompetenciaItem, VacanteUpdateRequest

COMPANY, VACANCY = str(uuid.uuid4()), str(uuid.uuid4())


def result(value):
    return SimpleNamespace(scalar_one_or_none=lambda: value)


def vacancy(**extra):
    base = dict(id=uuid.UUID(VACANCY), id_sede=uuid.uuid4(), id_reclutador_responsable=uuid.uuid4(),
                salario_minimo=2000000, salario_maximo=3000000, modalidad="Híbrido",
                competencias=[], total_postulantes=0, id_convenio=None)
    return SimpleNamespace(**{**base, **extra})


def session_with(*results):
    session = AsyncMock()
    session.add = MagicMock()
    session.expunge_all = MagicMock()
    session.execute.side_effect = [result(r) for r in results]
    return session


async def update(session, payload):
    with patch.object(VacancyATSService, "get_company_vacancy_detail", AsyncMock(return_value="detalle")):
        return await VacancyATSService.update_vacancy(session, COMPANY, VACANCY, payload)


class VacancyUpdateTests(unittest.IsolatedAsyncioTestCase):
    async def test_saves_site_owner_and_skills_keeping_existing_links(self):
        kept = CompetenciaExigidaVacante(id_competencia=uuid.uuid4(), es_obligatoria=False)
        dropped = CompetenciaExigidaVacante(id_competencia=uuid.uuid4(), es_obligatoria=True)
        new_skill = SimpleNamespace(id=uuid.uuid4())
        site, owner = uuid.uuid4(), uuid.uuid4()
        vac = vacancy(competencias=[kept, dropped])
        session = session_with(vac, site, owner, SimpleNamespace(id=kept.id_competencia), new_skill)

        # SimpleNamespace no es una entidad ORM: la colección se comprueba tal como queda asignada.
        await update(session, VacanteUpdateRequest(
            id_sede=str(site), id_reclutador_responsable=str(owner),
            competencias=[CompetenciaItem(nombre="SQL"), CompetenciaItem(nombre="Python")]))

        self.assertEqual((vac.id_sede, vac.id_reclutador_responsable), (site, owner))
        self.assertIs(vac.competencias[0], kept)
        self.assertFalse(vac.competencias[0].es_obligatoria)
        self.assertEqual([c.id_competencia for c in vac.competencias], [kept.id_competencia, new_skill.id])
        session.commit.assert_awaited_once()

    async def test_untouched_fields_stay_and_null_salary_clears_it(self):
        vac = vacancy()
        before = (vac.id_sede, vac.id_reclutador_responsable, vac.modalidad, vac.salario_maximo)
        await update(session_with(vac), VacanteUpdateRequest(salario_minimo=None))
        self.assertIsNone(vac.salario_minimo)
        self.assertEqual((vac.id_sede, vac.id_reclutador_responsable, vac.modalidad, vac.salario_maximo), before)

    async def test_rejects_foreign_site_and_empty_owner(self):
        for payload in (VacanteUpdateRequest(id_sede=str(uuid.uuid4())),
                        VacanteUpdateRequest(id_reclutador_responsable=None)):
            session = session_with(vacancy(), None)
            with self.assertRaises(HTTPException) as ctx:
                await update(session, payload)
            self.assertEqual(ctx.exception.status_code, 422)
            session.commit.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
