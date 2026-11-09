export const overview = {
  employedRate: 0,
  openVacancies: 0,
};

export const programTraceability = [];

export const institutionTeam = [];

export function getPriorityGaps(limit = 5) {
  const totals = new Map();
  programTraceability.forEach((program) => {
    (program.uncovered || []).forEach(({ skill, vacancies }) => {
      const current = totals.get(skill) || { skill, vacancies: 0, programs: [] };
      current.vacancies += vacancies;
      current.programs.push(program.name);
      totals.set(skill, current);
    });
  });
  return [...totals.values()].sort((a, b) => b.vacancies - a.vacancies).slice(0, limit);
}

export function getProgramById(id) {
  return programTraceability.find((program) => program.id === id) || null;
}

export function coverageTone(value) {
  if (value == null) return { bar: 'bg-line', text: 'text-secondary' };
  if (value >= 75) return { bar: 'bg-emerald-600', text: 'text-emerald-700' };
  if (value >= 60) return { bar: 'bg-amber-500', text: 'text-amber-700' };
  return { bar: 'bg-rose-500', text: 'text-rose-700' };
}
