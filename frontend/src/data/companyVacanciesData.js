/**
 * Datos del Bloque 4: vacantes de la empresa (vista del administrador / equipo de selección).
 * Sincronizado con el modelo de datos de egresados (habilidades técnicas, blandas, programas académicos afines, etc.).
 */

export const VACANCY_STATUS = {
  open: { label: 'Abierta', plural: 'Abiertas', dot: 'bg-green' },
  draft: { label: 'Borrador', plural: 'Borradores', dot: 'bg-secondary' },
  paused: { label: 'Pausada', plural: 'Pausadas', dot: 'bg-ochre' },
  closed: { label: 'Cerrada', plural: 'Cerradas', dot: 'bg-terracotta' },
};

export const VACANCY_TABS = ['open', 'draft', 'paused', 'closed'];

export const VACANCY_MODALITIES = ['Presencial', 'Híbrido', 'Remoto'];

export const VACANCY_CONTRACTS = [
  'Término indefinido',
  'Término fijo',
  'Obra o labor',
  'Contrato de aprendizaje',
  'Prestación de servicios',
];

export const VACANCY_CATEGORIES = [
  'Tecnología y datos',
  'Operación y mantenimiento',
  'Logística',
  'Sostenibilidad y seguridad',
  'Finanzas y administración',
  'Comercial y servicio',
];

export const VACANCY_EXPERIENCE_LEVELS = [
  { id: 'practicante', label: 'Practicante', hint: 'Estudiantes en etapa productiva' },
  { id: 'recien-egresado', label: 'Recién egresado', hint: 'Menos de 1 año de experiencia' },
  { id: 'junior', label: 'Junior', hint: '1 a 2 años de experiencia' },
  { id: 'semi-senior', label: 'Semi senior', hint: '3 a 5 años de experiencia' },
  { id: 'senior', label: 'Senior', hint: 'Más de 5 años de experiencia' },
];

/** Habilidades técnicas (herramientas, lenguajes, frameworks) */
export const TECH_SKILL_SUGGESTIONS = [
  'SQL',
  'Power BI',
  'Excel avanzado',
  'Python',
  'JavaScript',
  'React.js',
  'Git & GitHub',
  'Node.js',
  'Docker',
  'AutoCAD',
  'Siigo',
  'Normatividad SST',
  'Mantenimiento preventivo',
  'Modelado ETL',
];

/** Habilidades blandas (competencias socioemocionales e interpersonales) */
export const SOFT_SKILL_SUGGESTIONS = [
  'Trabajo en equipo',
  'Comunicación asertiva',
  'Liderazgo',
  'Resolución de problemas',
  'Pensamiento crítico',
  'Adaptabilidad',
  'Gestión del tiempo',
  'Orientación a resultados',
  'Atención al cliente',
  'Proactividad',
  'Negociación',
  'Capacidad de análisis',
];

/** Programas académicos sugeridos a los que va dirigida la oferta */
export const ACADEMIC_PROGRAM_SUGGESTIONS = [
  'Ingeniería de Sistemas',
  'Tecnología en Desarrollo de Sistemas Informáticos',
  'Ingeniería Electrónica',
  'Tecnología en Electricidad Industrial',
  'Ingeniería Electromecánica',
  'Tecnología en Gestión Empresarial',
  'Contaduría Pública',
  'Tecnología en Manejo de Recursos Ambientales',
  'Tecnología en Gestión de la Moda y el Diseño',
  'Tecnología en Topografía',
];

export const UTS_PROGRAM_SUGGESTIONS = ACADEMIC_PROGRAM_SUGGESTIONS;

export const LANGUAGE_OPTIONS = [
  'No requerido',
  'Inglés A2 (Básico)',
  'Inglés B1 (Intermedio)',
  'Inglés B2 (Intermedio alto)',
  'Inglés C1 (Avanzado)',
];

export const WORK_SCHEDULE_SUGGESTIONS = [
  'Lunes a Viernes (8:00 AM - 5:00 PM)',
  'Lunes a Viernes (7:30 AM - 5:00 PM) · Viernes corto',
  'Lunes a Sábado (Turnos rotativos)',
  'Lunes a Viernes (8:00 AM - 1:00 PM) · Medio tiempo',
  'Horario flexible / Por resultados',
];

export const VACANCY_BENEFIT_SUGGESTIONS = [
  'Medicina prepagada',
  'Horario flexible',
  'Trabajo híbrido',
  'Auxilio de alimentación',
  'Bonificación por desempeño',
  'Plan de formación',
  'Auxilio educativo',
  'Ruta de transporte',
  'Día de cumpleaños libre',
  'Seguro de vida',
];

export function experienceLabel(id) {
  return VACANCY_EXPERIENCE_LEVELS.find((l) => l.id === id)?.label || 'Sin definir';
}

export const initialVacancies = [];
