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

export const CUSTOM_CATEGORY_VALUE = '__otra__';

export const VACANCY_CATEGORIES = [
  'Administración y finanzas',
  'Calidad y mejora continua',
  'Comercial, ventas y servicio al cliente',
  'Compras y cadena de suministro',
  'Contabilidad y auditoría',
  'Diseño, arquitectura y arte',
  'Educación, docencia e investigación',
  'Ingeniería y construcción',
  'Jurídica y cumplimiento',
  'Logística y transporte',
  'Marketing y comunicaciones',
  'Operación, producción y mantenimiento',
  'Salud y bienestar',
  'Sostenibilidad, medio ambiente y SST',
  'Talento humano y bienestar laboral',
  'Tecnología, sistemas y datos',
];

export function parseCategoryField(rawValue) {
  const cleaned = String(rawValue || '').trim();
  if (!cleaned) {
    return { category: VACANCY_CATEGORIES[0], customCategory: '' };
  }
  const matched = VACANCY_CATEGORIES.find((c) => c.toLowerCase() === cleaned.toLowerCase());
  if (matched) {
    return { category: matched, customCategory: '' };
  }
  return { category: CUSTOM_CATEGORY_VALUE, customCategory: cleaned };
}

export function resolveCategoryValue(category, customCategory = '') {
  if (category === CUSTOM_CATEGORY_VALUE) {
    return String(customCategory || '').trim();
  }
  return String(category || '').trim() || VACANCY_CATEGORIES[0];
}

export const VACANCY_EXPERIENCE_LEVELS = [
  { id: 'sin-experiencia', label: 'Sin experiencia', hint: 'Menos de 1 año de experiencia' },
  { id: '1-2-anos', label: '1 a 2 años', hint: 'Experiencia inicial en el área' },
  { id: '3-5-anos', label: '3 a 5 años', hint: 'Experiencia intermedia consolidada' },
  { id: 'mas-5-anos', label: 'Más de 5 años', hint: 'Amplia trayectoria en el cargo' },
  { id: 'practicante', label: 'Practicante / En formación', hint: 'Estudiantes en etapa productiva' },
  { id: 'personalizado', label: 'Personalizado', hint: 'Escribe los años o requisito exacto' },
];

const EXPERIENCE_ALIAS_TO_ID = {
  'sin-experiencia': 'sin-experiencia',
  'sin experiencia': 'sin-experiencia',
  'sin experiencia (menos de 1 año)': 'sin-experiencia',
  'recien-egresado': 'sin-experiencia',
  'recién egresado': 'sin-experiencia',
  '1-2-anos': '1-2-anos',
  '1 a 2 años': '1-2-anos',
  junior: '1-2-anos',
  '3-5-anos': '3-5-anos',
  '3 a 5 años': '3-5-anos',
  'semi-senior': '3-5-anos',
  'semi senior': '3-5-anos',
  'mas-5-anos': 'mas-5-anos',
  'más de 5 años': 'mas-5-anos',
  'mas de 5 años': 'mas-5-anos',
  senior: 'mas-5-anos',
  practicante: 'practicante',
  'practicante / en formación': 'practicante',
};

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

/** Los programas académicos disponibles se consultan desde /api/v1/auth/catalogo-academico */
export const ACADEMIC_PROGRAM_SUGGESTIONS = [];

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

export function parseExperienceField(rawValue) {
  const cleaned = String(rawValue || '').trim();
  if (!cleaned) {
    return { experienceLevel: 'sin-experiencia', customExperience: '' };
  }
  const normalized = cleaned.toLowerCase();
  if (normalized === 'personalizado') {
    return { experienceLevel: 'personalizado', customExperience: '' };
  }
  const matchedId = EXPERIENCE_ALIAS_TO_ID[normalized];
  if (matchedId) {
    return { experienceLevel: matchedId, customExperience: '' };
  }
  return { experienceLevel: 'personalizado', customExperience: cleaned };
}

export function resolveExperienceValue(experienceLevel, customExperience = '') {
  if (experienceLevel === 'personalizado') {
    return String(customExperience || '').trim();
  }
  const preset = VACANCY_EXPERIENCE_LEVELS.find((l) => l.id === experienceLevel);
  if (preset) return preset.label;
  return experienceLabel(experienceLevel);
}

export function experienceLabel(value, customValue = '') {
  const cleaned = String(value || '').trim();
  if (!cleaned) return 'Sin definir';
  if (cleaned === 'personalizado') {
    return String(customValue || '').trim() || 'Personalizado';
  }
  const matchedId = EXPERIENCE_ALIAS_TO_ID[cleaned.toLowerCase()];
  if (matchedId) {
    return VACANCY_EXPERIENCE_LEVELS.find((l) => l.id === matchedId)?.label || cleaned;
  }
  return cleaned;
}

export const initialVacancies = [];
