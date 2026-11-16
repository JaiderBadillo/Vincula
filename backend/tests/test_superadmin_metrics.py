import unittest
from unittest.mock import AsyncMock, MagicMock

from app.modules.superadmin.schemas import PlatformMetricsResponse
from app.modules.superadmin.services import SuperAdminService


class SuperAdminMetricsTests(unittest.IsolatedAsyncioTestCase):
    async def test_totals_and_monthly_activity_are_read_from_database(self):
        session = MagicMock()
        session.execute = AsyncMock()
        monthly = {
            'mes': '2026-11', 'nuevas_empresas': 1, 'nuevas_vacantes': 6,
            'nuevas_instituciones': 1, 'nuevos_egresados': 23,
            'nuevas_postulaciones': 2,
        }
        results = []
        for count in [1, 1, 0, 0, 1, 1, 0, 6, 6, 23, 34, 0]:
            result = MagicMock()
            result.scalar.return_value = count
            results.append(result)
        monthly_result = MagicMock()
        monthly_result.mappings.return_value.all.return_value = [monthly]
        session.execute.side_effect = [*results, monthly_result]

        data = await SuperAdminService.get_platform_metrics(session)
        response = PlatformMetricsResponse.model_validate(data)

        self.assertEqual(response.total_vacantes, 6)
        self.assertEqual(response.empresas_activas, 1)
        self.assertEqual(response.periodos_mensuales[0].nuevas_vacantes, 6)
        self.assertEqual(session.execute.await_count, 13)
