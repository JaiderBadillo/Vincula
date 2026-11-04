// Cuenta institucional de la IES (representa a la universidad en sí, no a una persona individual)
export const institutionalAccount = {
  id: 'ies-uts',
  name: 'Unidades Tecnológicas de Santander',
  acronym: 'UTS',
  role: 'Cuenta Institucional',
  email: 'contacto@uts.edu.co',
  nit: '890.201.213-4',
};

// Alias de retrocompatibilidad
export const adminProfile = institutionalAccount;

export const initialInstitutionProfile = {
  logo: '/assets/uts-logo.png', // Logo oficial UTS en public/assets
  acronym: 'UTS',
  name: 'Unidades Tecnológicas de Santander',
  legalName: 'Unidades Tecnológicas de Santander',
  nit: '890.201.213-4',
  institutionType: 'Institución universitaria pública',
  city: 'Bucaramanga',
  department: 'Santander',
  address: 'Calle de los Estudiantes # 9-82, Ciudadela Real de Minas',
  phone: '+57 (607) 680 0600',
  contactEmail: 'contacto@uts.edu.co',
  website: 'https://www.uts.edu.co',
  legalRepresentative: 'Rector de la institución',
  description:
    'Institución de educación superior orientada a la formación tecnológica y profesional en Santander.',
};

export const institutionPrograms = [
  { id: 'sistemas', name: 'Ingeniería de Sistemas' },
  { id: 'electronica', name: 'Ingeniería Electrónica' },
  { id: 'gestion', name: 'Tecnología en Gestión Empresarial' },
  { id: 'contabilidad', name: 'Tecnología en Contabilidad Financiera' },
  { id: 'topografia', name: 'Tecnología en Topografía e Infraestructura' },
];

export const initialAdvisors = [
  {
    id: 'adv-001',
    fullName: 'Camila Morales Rey',
    email: 'c.morales@correo.institucion.edu.co',
    phone: '+57 318 450 1290',
    position: 'Asesora de Vinculación y Empleabilidad',
    campusIds: ['sede-bga-principal', 'sede-piedecuesta'],
    status: 'active',
    lastAccess: 'Hoy, 08:15 AM',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'adv-002',
    fullName: 'Juan Pablo Pérez Díaz',
    email: 'jp.perez@correo.institucion.edu.co',
    phone: '+57 315 890 4421',
    position: 'Asesor de Graduados',
    campusIds: ['sede-bga-principal'],
    status: 'active',
    lastAccess: 'Ayer, 04:40 PM',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'adv-003',
    fullName: 'Ana María García Ortiz',
    email: 'am.garcia@correo.institucion.edu.co',
    phone: '+57 312 778 3199',
    position: 'Asesora de Graduados',
    campusIds: ['sede-barrancabermeja', 'sede-velez'],
    status: 'active',
    lastAccess: '20 Oct 2026',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'adv-004',
    fullName: 'Camilo Rodríguez Vega',
    email: 'c.rodriguez@correo.institucion.edu.co',
    phone: '+57 301 223 9081',
    position: 'Asesor de Extensión',
    campusIds: ['sede-piedecuesta', 'sede-velez'],
    status: 'inactive',
    lastAccess: '02 Sep 2026',
    avatar: null,
  },
];

