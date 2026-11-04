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

export const initialVacancies = [
  {
    id: 'vac-01',
    code: 'CEN-2026-014',
    title: 'Analista de Datos Operativos',
    siteId: 'site-bga',
    ownerRecruiterId: 'rec-01',
    status: 'open',
    applicantsCount: 38,
    openSpots: 2,
    category: 'Tecnología y datos',
    modality: 'Híbrido',
    contractType: 'Término indefinido',
    experienceLevel: 'junior',
    targetPrograms: [
      'Ingeniería de Sistemas',
      'Tecnología en Desarrollo de Sistemas Informáticos',
    ],
    salary: '$4.200.000 - $5.400.000',
    workSchedule: 'Lunes a Viernes (8:00 AM - 5:00 PM)',
    languages: 'Inglés B1 (Intermedio)',
    publishedAt: '2026-10-06',
    closingDate: '2026-11-20',
    description:
      'Buscamos una persona que consolide y analice la información operativa de nuestra red de transporte para apoyar la toma de decisiones. Construirás tableros de seguimiento, depurarás bases de datos y presentarás hallazgos al equipo de operaciones.',
    responsibilities: [
      'Construir y mantener tableros ejecutivos en Power BI para el seguimiento de despachos.',
      'Escribir consultas SQL optimizadas para la extracción y depuración de bases de datos.',
      'Analizar indicadores de rendimiento operativo y proponer mejoras en la recolección de datos.',
      'Trabajar de la mano con líderes de planta para responder hipótesis operativas.',
    ],
    requirements: [
      'Título o tecnólogo en Sistemas, Analítica o programas afines.',
      'Manejo intermedio/avanzado de SQL y Power BI.',
      'Conocimientos básicos en Python para procesamiento de datos.',
    ],
    skillsTech: ['SQL', 'Power BI', 'Excel avanzado', 'Python'],
    skillsSoft: ['Pensamiento crítico', 'Comunicación asertiva', 'Resolución de problemas', 'Trabajo en equipo'],
    skills: ['SQL', 'Power BI', 'Excel avanzado', 'Python', 'Pensamiento crítico', 'Comunicación asertiva'],
    benefits: ['Trabajo híbrido', 'Medicina prepagada', 'Plan de formación', 'Horario flexible'],
  },
  {
    id: 'vac-02',
    code: 'CEN-2026-015',
    title: 'Desarrollador/a Full Stack Junior',
    siteId: 'site-bga',
    ownerRecruiterId: 'rec-01',
    status: 'open',
    applicantsCount: 52,
    openSpots: 1,
    category: 'Tecnología y datos',
    modality: 'Híbrido',
    contractType: 'Término fijo',
    experienceLevel: 'recien-egresado',
    targetPrograms: [
      'Tecnología en Desarrollo de Sistemas Informáticos',
      'Ingeniería de Sistemas',
    ],
    salary: '$3.600.000 - $4.600.000',
    workSchedule: 'Lunes a Viernes (8:00 AM - 5:00 PM)',
    languages: 'Inglés B1 (Intermedio)',
    publishedAt: '2026-10-09',
    closingDate: '2026-11-15',
    description:
      'Te unirás al equipo de transformación digital para desarrollar y mantener aplicaciones web internas. Trabajarás con metodologías ágiles junto a desarrolladores senior que acompañarán tu crecimiento profesional.',
    responsibilities: [
      'Desarrollar interfaces responsivas en React.js y componentes reutilizables.',
      'Integrar servicios backend mediante APIs REST en Node.js.',
      'Participar en ceremonias Scrum y revisiones de código en GitHub.',
    ],
    requirements: [
      'Egresado reciente o estudiante de últimos semestres en Sistemas o Desarrollo Informático.',
      'Bases sólidas en JavaScript, React y consumo de APIs.',
      'Manejo de Git para trabajo colaborativo.',
    ],
    skillsTech: ['JavaScript', 'React.js', 'SQL', 'Git & GitHub'],
    skillsSoft: ['Trabajo en equipo', 'Proactividad', 'Adaptabilidad', 'Capacidad de análisis'],
    skills: ['JavaScript', 'React.js', 'SQL', 'Git & GitHub', 'Trabajo en equipo', 'Proactividad'],
    benefits: ['Trabajo híbrido', 'Horario flexible', 'Auxilio educativo', 'Día de cumpleaños libre'],
  },
  {
    id: 'vac-03',
    code: 'CEN-2026-011',
    title: 'Técnico/a en Instrumentación y Control',
    siteId: 'site-gir',
    ownerRecruiterId: 'rec-01',
    status: 'paused',
    applicantsCount: 17,
    openSpots: 1,
    category: 'Operación y mantenimiento',
    modality: 'Presencial',
    contractType: 'Término indefinido',
    experienceLevel: 'junior',
    targetPrograms: [
      'Ingeniería Electrónica',
      'Tecnología en Electricidad Industrial',
      'Ingeniería Electromecánica',
    ],
    salary: '$3.100.000 - $3.900.000',
    workSchedule: 'Lunes a Sábado (Turnos rotativos)',
    languages: 'No requerido',
    publishedAt: '2026-09-22',
    closingDate: '2026-11-05',
    description:
      'Realizarás la calibración, el mantenimiento y el diagnóstico de instrumentos de medición y sistemas de control en planta, garantizando la continuidad y seguridad de la operación.',
    responsibilities: [
      'Ejecutar rutinas de mantenimiento preventivo y correctivo en instrumentos de campo.',
      'Calibrar transmisores de presión, nivel y flujo bajo estándares de seguridad.',
      'Diligenciar órdenes de trabajo y reportes de condición en el sistema de mantenimiento.',
    ],
    requirements: [
      'Formación técnica o tecnológica en Electrónica, Electricidad o Electromecánica.',
      'Conocimiento en normatividad de seguridad industrial y protocolos de planta.',
    ],
    skillsTech: ['Mantenimiento preventivo', 'Normatividad SST', 'AutoCAD'],
    skillsSoft: ['Atención al detalle', 'Trabajo en equipo', 'Resolución de problemas'],
    skills: ['Mantenimiento preventivo', 'Normatividad SST', 'Trabajo en equipo'],
    benefits: ['Ruta de transporte', 'Auxilio de alimentación', 'Seguro de vida'],
  },
  {
    id: 'vac-04',
    code: 'CEN-2026-018',
    title: 'Ingeniero/a de Sistemas para Soporte SCADA',
    siteId: 'site-bga',
    ownerRecruiterId: 'rec-01',
    status: 'draft',
    applicantsCount: 0,
    openSpots: 1,
    category: 'Tecnología y datos',
    modality: 'Presencial',
    contractType: 'Término indefinido',
    experienceLevel: 'semi-senior',
    targetPrograms: ['Ingeniería de Sistemas', 'Ingeniería Electrónica'],
    salary: '$5.000.000 - $6.200.000',
    workSchedule: 'Lunes a Viernes (8:00 AM - 5:00 PM)',
    languages: 'Inglés B2 (Intermedio alto)',
    publishedAt: null,
    closingDate: '',
    description:
      'Darás soporte a la plataforma SCADA que monitorea nuestra infraestructura de transporte, atendiendo incidentes técnicos y proponiendo mejoras de disponibilidad y ciberseguridad.',
    responsibilities: [
      'Monitorear telemetría y alarmas del sistema SCADA.',
      'Automatizar tareas de verificación con scripts en Python.',
    ],
    requirements: ['Ingeniero o profesional con experiencia en monitoreo de redes o SCADA.'],
    skillsTech: ['Python', 'SQL', 'Docker'],
    skillsSoft: ['Pensamiento crítico', 'Liderazgo', 'Gestión del tiempo'],
    skills: ['Python', 'SQL', 'Pensamiento crítico'],
    benefits: ['Medicina prepagada', 'Plan de formación'],
  },
  {
    id: 'vac-05',
    code: 'CEN-2026-012',
    title: 'Auxiliar de Logística de Transporte',
    siteId: 'site-bcm',
    ownerRecruiterId: 'rec-03',
    status: 'open',
    applicantsCount: 24,
    openSpots: 2,
    category: 'Logística',
    modality: 'Presencial',
    contractType: 'Obra o labor',
    experienceLevel: 'recien-egresado',
    targetPrograms: [
      'Tecnología en Gestión Empresarial',
      'Tecnología en Manejo de Recursos Ambientales',
    ],
    salary: '$2.200.000 - $2.800.000',
    workSchedule: 'Lunes a Viernes (7:30 AM - 5:00 PM)',
    languages: 'No requerido',
    publishedAt: '2026-09-28',
    closingDate: '2026-11-10',
    description:
      'Apoyarás la programación de despachos, el control de inventarios y la coordinación con transportadores en la terminal.',
    responsibilities: [
      'Generar guías de despacho y conciliar registros de carga en Excel.',
      'Coordinar con conductores la asignación de turnos de descargue.',
    ],
    requirements: ['Tecnólogo o profesional con manejo intermedio de Excel y atención al detalle.'],
    skillsTech: ['Excel avanzado', 'Siigo'],
    skillsSoft: ['Comunicación asertiva', 'Trabajo en equipo', 'Atención al cliente'],
    skills: ['Excel avanzado', 'Comunicación asertiva', 'Trabajo en equipo'],
    benefits: ['Auxilio de alimentación', 'Ruta de transporte'],
  },
  {
    id: 'vac-06',
    code: 'CEN-2026-013',
    title: 'Profesional en Gestión Ambiental y SST',
    siteId: 'site-bcm',
    ownerRecruiterId: 'rec-03',
    status: 'open',
    applicantsCount: 19,
    openSpots: 1,
    category: 'Sostenibilidad y seguridad',
    modality: 'Presencial',
    contractType: 'Término indefinido',
    experienceLevel: 'junior',
    targetPrograms: ['Tecnología en Manejo de Recursos Ambientales'],
    salary: '$3.800.000 - $4.800.000',
    workSchedule: 'Lunes a Viernes (8:00 AM - 5:00 PM)',
    languages: 'No requerido',
    publishedAt: '2026-10-01',
    closingDate: '2026-11-25',
    description:
      'Liderarás la implementación del sistema de gestión ambiental y de seguridad y salud en el trabajo en la terminal, realizando inspecciones, capacitaciones y seguimiento de planes de mejora.',
    responsibilities: [
      'Liderar auditorías internas de seguridad y brigadas de emergencia.',
      'Gestionar la documentación de licencias y reportes ante la autoridad ambiental.',
    ],
    requirements: ['Profesional o tecnólogo con licencia vigente de SST y experiencia de 1 año.'],
    skillsTech: ['Normatividad SST', 'Gestión de proyectos'],
    skillsSoft: ['Liderazgo', 'Comunicación asertiva', 'Resolución de problemas'],
    skills: ['Normatividad SST', 'Gestión de proyectos', 'Liderazgo'],
    benefits: ['Bonificación por desempeño', 'Plan de formación', 'Seguro de vida'],
  },
  {
    id: 'vac-07',
    code: 'CEN-2026-016',
    title: 'Practicante de Contabilidad y Finanzas',
    siteId: 'site-gir',
    ownerRecruiterId: 'rec-01',
    status: 'open',
    applicantsCount: 31,
    openSpots: 2,
    category: 'Finanzas y administración',
    modality: 'Presencial',
    contractType: 'Contrato de aprendizaje',
    experienceLevel: 'practicante',
    targetPrograms: ['Contaduría Pública', 'Tecnología en Gestión Empresarial'],
    salary: '1 SMMLV + auxilio de transporte',
    workSchedule: 'Lunes a Viernes (8:00 AM - 5:00 PM)',
    languages: 'No requerido',
    publishedAt: '2026-10-12',
    closingDate: '2026-11-30',
    description:
      'Acompañarás al equipo contable en conciliaciones bancarias, causación de facturas y preparación de informes financieros mensuales para la dirección.',
    responsibilities: [
      'Apoyar la causación de comprobantes de egreso e ingreso en Siigo.',
      'Verificar soportes tributarios y archivo digital de facturación electrónica.',
    ],
    requirements: ['Estudiante activo habilitado para iniciar etapa productiva o práctica empresarial.'],
    skillsTech: ['Excel avanzado', 'Siigo'],
    skillsSoft: ['Atención al detalle', 'Trabajo en equipo', 'Proactividad'],
    skills: ['Excel avanzado', 'Siigo', 'Trabajo en equipo'],
    benefits: ['Auxilio de alimentación', 'Plan de formación', 'Día de cumpleaños libre'],
  },
  {
    id: 'vac-08',
    code: 'CEN-2026-007',
    title: 'Coordinador/a de Proyectos de Integridad',
    siteId: 'site-bga',
    ownerRecruiterId: 'rec-01',
    status: 'closed',
    applicantsCount: 64,
    openSpots: 1,
    category: 'Operación y mantenimiento',
    modality: 'Híbrido',
    contractType: 'Término indefinido',
    experienceLevel: 'senior',
    targetPrograms: ['Ingeniería Electromecánica', 'Ingeniería Electrónica'],
    salary: '$6.500.000 - $8.000.000',
    workSchedule: 'Lunes a Viernes (8:00 AM - 5:00 PM)',
    languages: 'Inglés B2 (Intermedio alto)',
    publishedAt: '2026-08-14',
    closingDate: '2026-09-30',
    description:
      'Coordinarás los proyectos de integridad de ductos, gestionando contratistas, presupuesto y cronogramas de intervención en campo.',
    responsibilities: [
      'Supervisar planes de inspección y mitigación de corrosión en ductos.',
      'Administrar presupuestos de proyectos de inversión operativa.',
    ],
    requirements: ['Profesional con más de 5 años coordinando proyectos industriales.'],
    skillsTech: ['Gestión de proyectos', 'Normatividad SST', 'Modelado ETL'],
    skillsSoft: ['Liderazgo', 'Negociación', 'Comunicación asertiva'],
    skills: ['Gestión de proyectos', 'Normatividad SST', 'Liderazgo'],
    benefits: ['Medicina prepagada', 'Bonificación por desempeño', 'Trabajo híbrido'],
  },
];
