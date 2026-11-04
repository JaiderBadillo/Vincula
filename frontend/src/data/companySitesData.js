/**
 * Catálogo maestro de Sedes y Áreas Operativas de la Empresa.
 * Modelo: Cenit Transporte y Logística (Sector Energía e Infraestructura).
 */

export const COMPANY_SITE_STATUS = {
  active: { label: 'Activa', dot: 'bg-emerald-500' },
  inactive: { label: 'Inactiva', dot: 'bg-stone-400' },
};

export const AVAILABLE_CITIES = [
  'Bucaramanga',
  'Barrancabermeja',
  'Girón',
  'Floridablanca',
  'Piedecuesta',
  'San Gil',
  'Socorro',
  'Cúcuta',
  'Bogotá D.C.',
  'Medellín',
];

export const initialCompanySites = [
  {
    id: 'site-bga',
    name: 'Sede Administrativa Torre Empresarial',
    shortName: 'Torre Empresarial',
    city: 'Bucaramanga',
    department: 'Santander',
    address: 'Calle 36 # 29-45, Cabecera del Llano',
    phone: '+57 (607) 643-2000',
    email: 'sede.bga@cenit-transporte.com',
    manager: 'María Fernanda Henao',
    isMain: true,
    status: 'active',
    headcount: 85,
    departments: [
      'Gestión de Talento Humano',
      'Tecnología e Información',
      'Finanzas y Tesorería',
      'Dirección Jurídica',
      'Comercial y Convenios',
    ],
  },
  {
    id: 'site-bcm',
    name: 'Terminal de Operaciones Barrancabermeja',
    shortName: 'Terminal Barrancabermeja',
    city: 'Barrancabermeja',
    department: 'Santander',
    address: 'Vía al Muelle # 12-80, Sector Industrial',
    phone: '+57 (607) 622-4500',
    email: 'operaciones.barranca@cenit-transporte.com',
    manager: 'Ing. Carlos Julio Méndez',
    isMain: false,
    status: 'active',
    headcount: 140,
    departments: [
      'Operaciones Pipeline & Bombeo',
      'Mantenimiento Mecánico de Campo',
      'Seguridad Industrial & HSEQ',
      'Logística de Abastecimiento',
    ],
  },
  {
    id: 'site-gir',
    name: 'Planta de Mantenimiento y Logística Girón',
    shortName: 'Planta Girón',
    city: 'Girón',
    department: 'Santander',
    address: 'Zona Industrial Chimitá, Km 3 Vía Palenque',
    phone: '+57 (607) 646-8800',
    email: 'planta.giron@cenit-transporte.com',
    manager: 'Ing. Roberto Silva Prada',
    isMain: false,
    status: 'active',
    headcount: 95,
    departments: [
      'Mantenimiento Electromecánico',
      'Almacén y Gestión de Repuestos',
      'Taller de Flota Pesada',
      'Control de Calidad',
    ],
  },
];

