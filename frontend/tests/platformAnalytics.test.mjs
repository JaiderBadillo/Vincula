import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlatformPeriods } from '../src/utils/platformAnalytics.js';

test('las cifras históricas provienen de los meses consultados y no del rango visible', () => {
  const result = buildPlatformPeriods({
    total_empresas: 3,
    total_vacantes: 6,
    instituciones_activas: 1,
    total_egresados: 23,
    periodos_mensuales: [
      { mes: '2026-10', nuevas_empresas: 2, nuevas_vacantes: 0, nuevas_instituciones: 1, nuevos_egresados: 0, nuevas_postulaciones: 32 },
      { mes: '2026-11', nuevas_empresas: 1, nuevas_vacantes: 6, nuevas_instituciones: 0, nuevos_egresados: 23, nuevas_postulaciones: 2 },
    ],
  }, new Date('2026-11-15T12:00:00Z'));

  const october = result.monthly.find((row) => row.key === '2026-10');
  const november = result.monthly.find((row) => row.key === '2026-11');
  assert.equal(october.cumVacancies, 0);
  assert.equal(october.totalApplications, 32);
  assert.equal(november.newVacancies, 6);
  assert.equal(november.cumCompanies, 3);
  assert.equal(november.cumGraduates, 23);
  assert.equal(result.semesters.at(-1).newVacancies, 6);
});

test('sin datos de la API no se dibujan cifras de ejemplo', () => {
  assert.deepEqual(buildPlatformPeriods(null), { monthly: [], semesters: [] });
});
