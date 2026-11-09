/**
 * Catálogo y datos iniciales de convenios interinstitucionales
 * para el portal de Administrador de Empresa (Bloque 5).
 * Vincula Empresas · Conexión con IES (Unidades Tecnológicas de Santander y aliadas)
 */

export const AGREEMENT_STATUS = {
  vigente: {
    label: 'Vigente',
    description: 'Convenio activo y formalizado',
    dotColor: 'bg-emerald-600',
    textColor: 'text-emerald-800',
    badgeClass: 'border-emerald-200 bg-emerald-50/80 text-emerald-800',
  },
  por_renovar: {
    label: 'Por renovar',
    description: 'Vence en menos de 60 días',
    dotColor: 'bg-amber-600',
    textColor: 'text-amber-800',
    badgeClass: 'border-amber-200 bg-amber-50/80 text-amber-800',
  },
  en_revision: {
    label: 'En revisión',
    description: 'Solicitud radicada en evaluación por la IES',
    dotColor: 'bg-terracotta',
    textColor: 'text-terracotta',
    badgeClass: 'border-sand-line bg-sand/60 text-cocoa',
  },
  vencido: {
    label: 'Vencido',
    description: 'Periodo de vigencia culminado',
    dotColor: 'bg-neutral-400',
    textColor: 'text-secondary',
    badgeClass: 'border-neutral-200 bg-neutral-100 text-secondary',
  },
};

export const AGREEMENT_TYPES = [
  {
    id: 'alianza_preferente',
    name: 'Convenio de Vinculación Preferente',
    description: 'Prioridad en ferias, preselección directa de egresados y banco de talentos exclusivo.',
  },
  {
    id: 'convenio_marco',
    name: 'Convenio Marco de Prácticas y Pasantías',
    description: 'Homologación de prácticas empresariales para estudiantes de últimos semestres.',
  },
  {
    id: 'cooperacion_academica',
    name: 'Convenio de Cooperación Académica e Innovación',
    description: 'Desarrollo conjunto de proyectos de grado, becas aplicadas y semilleros técnicos.',
  },
  {
    id: 'pasantias_tecnicas',
    name: 'Convenio Específico de Pasantías Técnicas y Tecnológicas',
    description: 'Vinculación de estudiantes técnicos y tecnólogos en plantas u operaciones de campo.',
  },
];

export const REGIONAL_CITIES = [
  'Bucaramanga',
  'Barrancabermeja',
  'Floridablanca',
  'Piedecuesta',
  'San Gil',
  'Vélez',
  'Cúcuta',
];

export const REGIONAL_INSTITUTIONS = [
  // ─── Bucaramanga ───
  {
    id: 'uts',
    name: 'Unidades Tecnológicas de Santander',
    shortName: 'UTS',
    cityKey: 'Bucaramanga',
    city: 'Bucaramanga, Santander',
    logo: '/assets/uts-logo.png',
    isPrimary: true,
    coordinator: {
      name: 'Dra. Carolina Gómez Plata',
      role: 'Coordinadora de Convenios y Empleabilidad UTS',
      email: 'convenios.empleabilidad@correo.uts.edu.co',
      phone: '+57 (607) 691 7700 ext. 1240',
      office: 'Edificio B - Oficina de Egresados y Prácticas, Campus Bucaramanga',
    },
  },
  {
    id: 'uis',
    name: 'Universidad Industrial de Santander',
    shortName: 'UIS',
    cityKey: 'Bucaramanga',
    city: 'Bucaramanga, Santander',
    logo: null,
    isPrimary: false,
    coordinator: {
      name: 'Ing. Mauricio Silva Carvajal',
      role: 'Director de Relacionamiento Empresarial UIS',
      email: 'relaciones.empresa@uis.edu.co',
      phone: '+57 (607) 634 4000 ext. 2311',
      office: 'Sede Central Bucaramanga, Carrera 27',
    },
  },
  {
    id: 'udes',
    name: 'Universidad de Santander',
    shortName: 'UDES',
    cityKey: 'Bucaramanga',
    city: 'Bucaramanga, Santander',
    logo: null,
    isPrimary: false,
    coordinator: {
      name: 'Dra. Patricia Valenzuela',
      role: 'Coordinadora de Prácticas Profesionales UDES',
      email: 'practicas@udes.edu.co',
      phone: '+57 (607) 651 6500 ext. 1102',
      office: 'Campus Lagos del Cacique, Bloque Administrativo',
    },
  },
  {
    id: 'unab',
    name: 'Universidad Autónoma de Bucaramanga',
    shortName: 'UNAB',
    cityKey: 'Bucaramanga',
    city: 'Bucaramanga, Santander',
    logo: null,
    isPrimary: false,
    coordinator: {
      name: 'Dra. Andrea Mantilla',
      role: 'Líder de Alianzas Corporativas UNAB',
      email: 'alianzas@unab.edu.co',
      phone: '+57 (607) 643 6111 ext. 308',
      office: 'Campus El Jardín, Bucaramanga',
    },
  },
  {
    id: 'usta-bga',
    name: 'Universidad Santo Tomás - Seccional Bucaramanga',
    shortName: 'USTA Bucaramanga',
    cityKey: 'Bucaramanga',
    city: 'Bucaramanga, Santander',
    logo: null,
    isPrimary: false,
    coordinator: {
      name: 'Dr. Fernando Serrano',
      role: 'Director de Extensión y Convenios USTA',
      email: 'extension@ustabuca.edu.co',
      phone: '+57 (607) 680 0801 ext. 2150',
      office: 'Campus Central, Carrera 18 # 9-27',
    },
  },

  // ─── Barrancabermeja ───
  {
    id: 'uts-bcm',
    name: 'Unidades Tecnológicas de Santander (Sede Barrancabermeja)',
    shortName: 'UTS Barrancabermeja',
    cityKey: 'Barrancabermeja',
    city: 'Barrancabermeja, Santander',
    logo: '/assets/uts-logo.png',
    isPrimary: true,
    coordinator: {
      name: 'Ing. Javier Orlando Rueda',
      role: 'Coordinador Regional UTS Barrancabermeja',
      email: 'sedebarranca@correo.uts.edu.co',
      phone: '+57 (607) 622 1540',
      office: 'Sede Regional Palmira, Carrera 28',
    },
  },
  {
    id: 'unipaz',
    name: 'Instituto Universitario de la Paz',
    shortName: 'UNIPAZ',
    cityKey: 'Barrancabermeja',
    city: 'Barrancabermeja, Santander',
    logo: null,
    isPrimary: false,
    coordinator: {
      name: 'Dra. Martha Cecilia Suárez',
      role: 'Directora de Articulación y Prácticas UNIPAZ',
      email: 'practicas@unipaz.edu.co',
      phone: '+57 (607) 611 8210',
      office: 'Centro de Investigaciones Santa Inés',
    },
  },
  {
    id: 'uis-bcm',
    name: 'Universidad Industrial de Santander (Sede Barrancabermeja)',
    shortName: 'UIS Barrancabermeja',
    cityKey: 'Barrancabermeja',
    city: 'Barrancabermeja, Santander',
    logo: null,
    isPrimary: false,
    coordinator: {
      name: 'Ing. Carlos Julio Plata',
      role: 'Coordinador Sede UIS Barrancabermeja',
      email: 'uisbarranca@uis.edu.co',
      phone: '+57 (607) 622 2250',
      office: 'Campus UIS Barrancabermeja',
    },
  },

  // ─── Floridablanca ───
  {
    id: 'upb-florida',
    name: 'Universidad Pontificia Bolivariana',
    shortName: 'UPB Floridablanca',
    cityKey: 'Floridablanca',
    city: 'Floridablanca, Santander',
    logo: null,
    isPrimary: false,
    coordinator: {
      name: 'Dra. Diana Carolina Jaimes',
      role: 'Coordinadora de Empleabilidad UPB',
      email: 'empleabilidad.bga@upb.edu.co',
      phone: '+57 (607) 679 6220',
      office: 'Campus Universitario Floridablanca',
    },
  },
  {
    id: 'usta-florida',
    name: 'Universidad Santo Tomás (Campus Floridablanca)',
    shortName: 'USTA Floridablanca',
    cityKey: 'Floridablanca',
    city: 'Floridablanca, Santander',
    logo: null,
    isPrimary: false,
    coordinator: {
      name: 'Dr. Leonardo Gómez',
      role: 'Coordinador de Prácticas Campus Floridablanca',
      email: 'practicas.florida@ustabuca.edu.co',
      phone: '+57 (607) 698 5858',
      office: 'Campus El Limonal, Autopista a Floridablanca',
    },
  },

  // ─── Piedecuesta ───
  {
    id: 'uts-piedecuesta',
    name: 'Unidades Tecnológicas de Santander (Extensión Piedecuesta)',
    shortName: 'UTS Piedecuesta',
    cityKey: 'Piedecuesta',
    city: 'Piedecuesta, Santander',
    logo: '/assets/uts-logo.png',
    isPrimary: true,
    coordinator: {
      name: 'Dra. Claudia Patricia Niño',
      role: 'Coordinadora Extensión UTS Piedecuesta',
      email: 'sedepiedecuesta@correo.uts.edu.co',
      phone: '+57 (607) 655 4210',
      office: 'Extensión Piedecuesta, Calle 10',
    },
  },
  {
    id: 'uis-guatiguara',
    name: 'UIS Parque Tecnológico Guatiguará',
    shortName: 'UIS Guatiguará',
    cityKey: 'Piedecuesta',
    city: 'Piedecuesta, Santander',
    logo: null,
    isPrimary: false,
    coordinator: {
      name: 'Dr. Andrés Felipe Moreno',
      role: 'Director de Innovación y Transferencia UIS',
      email: 'guatiguara@uis.edu.co',
      phone: '+57 (607) 634 4000 ext. 3400',
      office: 'Parque Tecnológico Guatiguará Km 2',
    },
  },

  // ─── San Gil ───
  {
    id: 'uts-sangil',
    name: 'Unidades Tecnológicas de Santander (Sede San Gil)',
    shortName: 'UTS San Gil',
    cityKey: 'San Gil',
    city: 'San Gil, Santander',
    logo: '/assets/uts-logo.png',
    isPrimary: true,
    coordinator: {
      name: 'Ing. Henry Morales Díaz',
      role: 'Coordinador Sede San Gil',
      email: 'sedesangil@correo.uts.edu.co',
      phone: '+57 (607) 724 5510',
      office: 'Sede San Gil, Carrera 11',
    },
  },
  {
    id: 'unisangil',
    name: 'Fundación Universitaria de San Gil',
    shortName: 'Unisangil',
    cityKey: 'San Gil',
    city: 'San Gil, Santander',
    logo: null,
    isPrimary: false,
    coordinator: {
      name: 'Dra. Sandra Milena Rueda',
      role: 'Directora de Extensión y Prácticas Unisangil',
      email: 'extension@unisangil.edu.co',
      phone: '+57 (607) 724 5757',
      office: 'Campus Universitario San Gil',
    },
  },

  // ─── Vélez ───
  {
    id: 'uts-velez',
    name: 'Unidades Tecnológicas de Santander (Extensión Vélez)',
    shortName: 'UTS Vélez',
    cityKey: 'Vélez',
    city: 'Vélez, Santander',
    logo: '/assets/uts-logo.png',
    isPrimary: true,
    coordinator: {
      name: 'Lic. Gonzalo Forero',
      role: 'Coordinador Extensión Vélez',
      email: 'sedevelez@correo.uts.edu.co',
      phone: '+57 (607) 756 3120',
      office: 'Extensión Regional Vélez, Carrera 5',
    },
  },

  // ─── Cúcuta ───
  {
    id: 'ufps',
    name: 'Universidad Francisco de Paula Santander',
    shortName: 'UFPS',
    cityKey: 'Cúcuta',
    city: 'Cúcuta, Norte de Santander',
    logo: null,
    isPrimary: false,
    coordinator: {
      name: 'Dra. Claudia Marcela Vega',
      role: 'Jefe de Prácticas y Egresados UFPS',
      email: 'egresados@ufps.edu.co',
      phone: '+57 (607) 577 6655 ext. 190',
      office: 'Avenida Gran Colombia # 12E-96, Cúcuta',
    },
  },
  {
    id: 'unisimon-cucuta',
    name: 'Universidad Simón Bolívar (Sede Cúcuta)',
    shortName: 'Unisimón Cúcuta',
    cityKey: 'Cúcuta',
    city: 'Cúcuta, Norte de Santander',
    logo: null,
    isPrimary: false,
    coordinator: {
      name: 'Dr. Jairo Cárdenas',
      role: 'Coordinador de Alianzas Regionales',
      email: 'convenios.cucuta@unisimon.edu.co',
      phone: '+57 (607) 582 7070',
      office: 'Sede Cúcuta, Barrio San Mateo',
    },
  },
];

export const REGIONAL_AVAILABLE_PROGRAMS = [
  'Ingeniería de Sistemas',
  'Tecnología en Desarrollo de Sistemas Informáticos',
  'Ingeniería Electromecánica',
  'Tecnología en Operación y Mantenimiento Electromecánico',
  'Tecnología en Gestión Empresarial',
  'Tecnología en Contabilidad y Finanzas',
  'Ingeniería Ambiental',
  'Tecnología en Telecomunicaciones',
  'Tecnología en Recursos Ambientales',
  'Tecnología en Gestión de la Moda',
];

export const UTS_AVAILABLE_PROGRAMS = REGIONAL_AVAILABLE_PROGRAMS;

export const initialAgreements = [];
