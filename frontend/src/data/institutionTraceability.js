// Datos de ejemplo para la trazabilidad programa ↔ demanda (fase 1).
// Más adelante vendrán del backend: pensum confirmado + habilidades de vacantes.

export const overview = {
  employedRate: 71,
  openVacancies: 186,
};

export const programTraceability = [
  {
    id: 'sistemas',
    name: 'Ingeniería de Sistemas',
    faculty: 'Ciencias Naturales e Ingenierías',
    graduates: 612,
    employedRate: 84,
    coverage: 84,
    trend: 4,
    pensumUpdated: 'Pensum 2024 · confirmado en agosto',
    covered: [
      { skill: 'JavaScript', vacancies: 58 },
      { skill: 'SQL', vacancies: 51 },
      { skill: 'Python', vacancies: 44 },
      { skill: 'Git', vacancies: 39 },
      { skill: 'APIs REST', vacancies: 33 },
    ],
    uncovered: [
      { skill: 'Docker', vacancies: 31 },
      { skill: 'Power BI', vacancies: 22 },
      { skill: 'AWS', vacancies: 19 },
    ],
  },
  {
    id: 'gestion',
    name: 'Tecnología en Gestión Empresarial',
    faculty: 'Ciencias Socioeconómicas y Empresariales',
    graduates: 540,
    employedRate: 72,
    coverage: 72,
    trend: -2,
    pensumUpdated: 'Pensum 2023 · confirmado en marzo',
    covered: [
      { skill: 'Gestión de proyectos', vacancies: 36 },
      { skill: 'Atención al cliente', vacancies: 34 },
      { skill: 'Contabilidad básica', vacancies: 21 },
    ],
    uncovered: [
      { skill: 'Excel avanzado', vacancies: 28 },
      { skill: 'Power BI', vacancies: 20 },
      { skill: 'Inglés B2', vacancies: 25 },
      { skill: 'CRM', vacancies: 14 },
      { skill: 'Marketing digital', vacancies: 12 },
    ],
  },
  {
    id: 'electronica',
    name: 'Ingeniería Electrónica',
    faculty: 'Ciencias Naturales e Ingenierías',
    graduates: 388,
    employedRate: 66,
    coverage: 58,
    trend: -5,
    pensumUpdated: 'Pensum 2021 · desactualizado',
    covered: [
      { skill: 'Circuitos', vacancies: 17 },
      { skill: 'Microcontroladores', vacancies: 15 },
      { skill: 'Instrumentación', vacancies: 12 },
    ],
    uncovered: [
      { skill: 'PLC', vacancies: 26 },
      { skill: 'IoT', vacancies: 21 },
      { skill: 'Python', vacancies: 18 },
      { skill: 'Docker', vacancies: 9 },
      { skill: 'Inglés B2', vacancies: 12 },
    ],
  },
  {
    id: 'contabilidad',
    name: 'Tecnología en Contabilidad Financiera',
    faculty: 'Ciencias Socioeconómicas y Empresariales',
    graduates: 455,
    employedRate: 69,
    coverage: 66,
    trend: 1,
    pensumUpdated: 'Pensum 2023 · confirmado en marzo',
    covered: [
      { skill: 'NIIF', vacancies: 24 },
      { skill: 'Nómina', vacancies: 19 },
      { skill: 'Declaración de renta', vacancies: 15 },
    ],
    uncovered: [
      { skill: 'Excel avanzado', vacancies: 22 },
      { skill: 'ERP (SAP/Siigo)', vacancies: 16 },
      { skill: 'Power BI', vacancies: 11 },
      { skill: 'Inglés B2', vacancies: 8 },
    ],
  },
  {
    id: 'topografia',
    name: 'Tecnología en Topografía e Infraestructura',
    faculty: 'Ciencias Naturales e Ingenierías',
    graduates: 210,
    employedRate: 74,
    coverage: null,
    trend: null,
    pensumUpdated: null,
    covered: [],
    uncovered: [],
  },
];

export const institutionTeam = [
  { id: 't1', name: 'Camila Morales', role: 'Asesora IES', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80' },
  { id: 't2', name: 'Juan Pérez', role: 'Director · Sistemas', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80' },
  { id: 't3', name: 'Ana García', role: 'Directora · Gestión', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80' },
  { id: 't4', name: 'Camilo Rodríguez', role: 'Director · Electrónica', avatar: null },
];

// Brechas priorizadas: suma de vacantes por habilidad no cubierta en cualquier programa.
export function getPriorityGaps(limit = 5) {
  const totals = new Map();
  programTraceability.forEach((program) => {
    program.uncovered.forEach(({ skill, vacancies }) => {
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

// Semáforo simple: verde ≥ 75, ámbar 60–74, rojo < 60.
export function coverageTone(value) {
  if (value == null) return { bar: 'bg-line', text: 'text-secondary' };
  if (value >= 75) return { bar: 'bg-emerald-600', text: 'text-emerald-700' };
  if (value >= 60) return { bar: 'bg-amber-500', text: 'text-amber-700' };
  return { bar: 'bg-rose-500', text: 'text-rose-700' };
}
