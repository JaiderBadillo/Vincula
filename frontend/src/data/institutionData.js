export const advisorProfile = {
  id: 'adv-001',
  fullName: 'Coordinación de Egresados UTS',
  role: 'Asesoría de Vinculación y Empleabilidad',
  institution: 'Unidades Tecnológicas de Santander',
  faculty: 'Dirección de Extensión y Graduados',
  campus: 'Bucaramanga · Sede Principal',
  email: 'ies@uts.edu.co',
  avatar: null,
  mfaVerified: true,
  lastAccess: 'Hoy, 08:15 AM',
};

export const institutionMetrics = {
  registeredStudents: {
    total: 0,
    newThisMonth: 0,
    growthPercentage: '0.0%',
    label: 'Estudiantes & Egresados',
    sublabel: 'Registrados en la plataforma',
  },
  availableVacancies: {
    total: 0,
    activeExclusivelyForUTS: 0,
    newThisWeek: 0,
    label: 'Vacantes Disponibles',
    sublabel: 'Abiertas para postulación hoy',
  },
  employedStudents: {
    total: 0,
    ratePercentage: '0.0%',
    recentHiresMonth: 0,
    label: 'Egresados con Empleo',
    sublabel: 'Vinculados formalmente (Tasa: 0%)',
  },
  unemployedStudents: {
    total: 0,
    activelyApplying: 0,
    ratePercentage: '0.0%',
    label: 'En Búsqueda Activa',
    sublabel: 'Sin empleo o buscando nuevas ofertas',
  },
};

export const studentValidationRequests = [];
export const pendingStudentRequests = [];
export const pendingCompanyRequests = [];

export const placementByFaculty = [];

export const quickActionModules = [
  {
    id: 'validate-students',
    title: 'Validar Egresados',
    description: 'Aprobar o rechazar solicitudes de cuenta y documentos de egresados.',
    icon: 'bx-user-check',
    to: '/institucion/estudiantes/solicitudes',
    badge: '0 pendientes',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    accentColor: 'from-emerald-500/10 to-emerald-500/5',
    iconColor: 'text-emerald-700 bg-emerald-100',
    highlight: false,
  },
  {
    id: 'student-tracking',
    title: 'Seguimiento de Egresados',
    description: 'Historial laboral, empresas actuales y fases alcanzadas en procesos.',
    icon: 'bx-history',
    to: '/institucion/estudiantes/seguimiento',
    badge: '0 expedientes',
    badgeColor: 'bg-lime/25 text-ink border-lime/50',
    accentColor: 'from-lime/20 to-lime/5',
    iconColor: 'text-green-dark bg-lime/25',
    highlight: false,
  },
  {
    id: 'validate-companies',
    title: 'Validar Empresas',
    description: 'Revisar documentación legal, NIT y solicitudes de convenio marco.',
    icon: 'bx-buildings',
    to: '/institucion/empresas/solicitudes',
    badge: '0 en espera',
    badgeColor: 'bg-lime/30 text-ink border-lime/50',
    accentColor: 'from-lime/20 to-lime/5',
    iconColor: 'text-green-dark bg-lime/30',
    highlight: false,
  },
  {
    id: 'company-tracking',
    title: 'Seguimiento a Empresas',
    description: 'Vacantes activadas, embudo por fases de selección y tasa de contratación.',
    icon: 'bx-line-chart-down',
    to: '/institucion/empresas/seguimiento',
    badge: '0 vacantes',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    accentColor: 'from-emerald-500/10 to-emerald-500/5',
    iconColor: 'text-emerald-700 bg-emerald-100',
    highlight: false,
  },
  {
    id: 'analytics',
    title: 'Estadísticas Institucionales',
    description: 'Métricas de inserción laboral para directivas y acreditación de alta calidad.',
    icon: 'bx-bar-chart-alt-2',
    to: '/institucion/estudiantes/estadisticas',
    badge: 'Reporte 2026',
    badgeColor: 'bg-lime/30 text-ink border-lime/50',
    accentColor: 'from-lime/20 to-lime/5',
    iconColor: 'text-green-dark bg-lime/40',
    highlight: false,
  },
  {
    id: 'skills-observatory',
    title: 'Habilidades Demandadas',
    description: 'Observatorio de competencias más solicitadas por la industria en Santander.',
    icon: 'bx-radar',
    to: '/institucion/mercado-laboral/competencias',
    badge: 'Mercado',
    badgeColor: 'bg-green/15 text-green-dark border-green/30',
    accentColor: 'from-green/15 to-green/5',
    iconColor: 'text-green-dark bg-green/15',
    highlight: false,
  },
];

export { graduatesTrackingData } from './institutionTrackingData.js';
export * from './institutionPlacementStats.js';
