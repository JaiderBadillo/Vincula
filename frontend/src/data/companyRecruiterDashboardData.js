/**
 * Datos para el Panel de Inicio del Reclutador (Portal de Empresa).
 */

export const recruiterProfile = {
  id: '',
  fullName: 'Equipo de Selección',
  email: '',
  phone: '',
  company: '',
  role: 'Reclutador',
  avatar: null,
  assignedSites: [],
  lastAccess: 'Hoy',
};

export const recruiterDashboardMetrics = {
  activeVacancies: {
    total: 0,
    label: 'Mis Vacantes Activas',
    sublabel: 'En proceso de selección',
    newThisWeek: 0,
    status: '0 vacantes asignadas',
  },
  pendingReviewApplicants: {
    total: 0,
    label: 'Postulantes por Revisar',
    sublabel: 'Esperando primer filtro',
    newToday: 0,
    growth: '0 hoy',
  },
  scheduledInterviews: {
    total: 0,
    label: 'Entrevistas de la Semana',
    sublabel: '0 programadas para hoy',
    todayCount: 0,
    rate: '0% confirmadas',
  },
  hiresThisMonth: {
    total: 0,
    label: 'Contrataciones del Mes',
    sublabel: '0% efectividad',
    target: 0,
    rate: '0%',
  },
};

export const quickActionModules = [
  {
    id: 'candidates-ats',
    title: 'Candidatos y Embudo ATS',
    description: 'Evalúa hojas de vida, califica el match con la vacante y avanza postulantes por etapas.',
    icon: 'bx-user-check',
    badge: '0 en cola',
    to: '/empresa/reclutador/candidatos',
    accentColor: 'from-terracotta/20 to-transparent',
    iconColor: 'bg-terracotta/15 text-terracotta',
    badgeColor: 'bg-terracotta/15 text-terracotta-dark border-terracotta/30',
  },
  {
    id: 'my-vacancies',
    title: 'Mis Vacantes Asignadas',
    description: 'Gestiona requisitos, cupos disponibles y fechas de cierre de tus ofertas activas.',
    icon: 'bx-briefcase-alt-2',
    badge: '0 activas',
    to: '/empresa/reclutador/vacantes',
    accentColor: 'from-ochre/20 to-transparent',
    iconColor: 'bg-ochre/20 text-ochre-dark',
    badgeColor: 'bg-ochre/15 text-ochre-dark border-ochre/30',
  },
  {
    id: 'interviews-agenda',
    title: 'Agenda de Entrevistas',
    description: 'Consulta citaciones técnicas, enlaces de videollamada y registra conceptos evaluativos.',
    icon: 'bx-calendar-event',
    badge: '0 agendadas',
    to: '/empresa/reclutador/candidatos?filter=interview',
    accentColor: 'from-emerald-500/20 to-transparent',
    iconColor: 'bg-emerald-50 text-emerald-700',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
];

export const pendingApplicantsQueue = [];
export const upcomingInterviews = [];
