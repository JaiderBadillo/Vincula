const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function buildPlatformPeriods(metrics, today = new Date()) {
  if (!metrics) return { monthly: [], semesters: [] };

  const raw = metrics.periodos_mensuales || [];
  const byMonth = new Map(raw.map((row) => [row.mes, row]));
  const currentMonth = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
  const oldestAllowed = new Date(Date.UTC(today.getFullYear(), today.getMonth() - 59, 1));
  const firstRecord = raw.length ? new Date(`${raw[0].mes}-01T00:00:00Z`) : currentMonth;
  const start = new Date(Math.max(oldestAllowed.getTime(), Math.min(
    firstRecord.getTime(),
    Date.UTC(today.getFullYear(), 0, 1),
    Date.UTC(today.getFullYear(), today.getMonth() - 5, 1),
  )));

  const totals = {
    cumCompanies: metrics.total_empresas,
    cumVacancies: metrics.total_vacantes,
    cumInstitutions: metrics.instituciones_activas,
    cumGraduates: metrics.total_egresados,
  };
  const baseline = {
    cumCompanies: totals.cumCompanies - raw.reduce((sum, row) => sum + row.nuevas_empresas, 0),
    cumVacancies: totals.cumVacancies - raw.reduce((sum, row) => sum + row.nuevas_vacantes, 0),
    cumInstitutions: totals.cumInstitutions - raw.reduce((sum, row) => sum + row.nuevas_instituciones, 0),
    cumGraduates: totals.cumGraduates - raw.reduce((sum, row) => sum + row.nuevos_egresados, 0),
  };
  const monthly = [];
  let running = { ...baseline };
  for (let month = new Date(oldestAllowed); month < start; month.setUTCMonth(month.getUTCMonth() + 1)) {
    const key = month.toISOString().slice(0, 7);
    const row = byMonth.get(key);
    if (row) {
      running.cumCompanies += row.nuevas_empresas;
      running.cumVacancies += row.nuevas_vacantes;
      running.cumInstitutions += row.nuevas_instituciones;
      running.cumGraduates += row.nuevos_egresados;
    }
  }

  for (let month = new Date(start); month <= currentMonth; month.setUTCMonth(month.getUTCMonth() + 1)) {
    const key = month.toISOString().slice(0, 7);
    const row = byMonth.get(key);
    const year = month.getUTCFullYear();
    const monthIndex = month.getUTCMonth();
    const newCompanies = row?.nuevas_empresas || 0;
    const newVacancies = row?.nuevas_vacantes || 0;
    const newInstitutions = row?.nuevas_instituciones || 0;
    const newGraduates = row?.nuevos_egresados || 0;
    const totalApplications = row?.nuevas_postulaciones || 0;
    running = {
      cumCompanies: running.cumCompanies + newCompanies,
      cumVacancies: running.cumVacancies + newVacancies,
      cumInstitutions: running.cumInstitutions + newInstitutions,
      cumGraduates: running.cumGraduates + newGraduates,
    };
    const count = newCompanies + newVacancies + newInstitutions + newGraduates;
    const previous = monthly.at(-1);
    const priorCount = previous ? previous.newCompanies + previous.newVacancies + previous.newInstitutions + previous.newGraduates : 0;
    monthly.push({
      key,
      periodLabel: `${MONTHS[monthIndex]} ${year}`,
      shortLabel: MONTHS[monthIndex],
      semester: `${year}-${monthIndex < 6 ? 'I' : 'II'}`,
      quarter: `q${Math.floor(monthIndex / 3) + 1}`,
      newCompanies, newVacancies, newInstitutions, newGraduates, totalApplications,
      ...running,
      growthRate: priorCount ? `${Math.round(((count - priorCount) / priorCount) * 100)} %` : count ? '—' : '0 %',
    });
  }

  const semesters = [];
  for (const month of monthly) {
    let semester = semesters.at(-1);
    if (!semester || semester.key !== month.semester) {
      semester = {
        key: month.semester,
        periodLabel: `Semestre ${month.semester}`,
        shortLabel: month.semester,
        newCompanies: 0, newVacancies: 0, newInstitutions: 0,
        newGraduates: 0, totalApplications: 0, growthRate: '—',
      };
      semesters.push(semester);
    }
    for (const field of ['newCompanies', 'newVacancies', 'newInstitutions', 'newGraduates', 'totalApplications']) {
      semester[field] += month[field];
    }
    for (const field of ['cumCompanies', 'cumVacancies', 'cumInstitutions', 'cumGraduates']) {
      semester[field] = month[field];
    }
  }
  return { monthly, semesters };
}
