// Cuenta institucional de la IES (representa a la universidad en sí, no a una persona individual)
export const institutionalAccount = {
  id: 'ies-uts',
  name: 'Unidades Tecnológicas de Santander',
  acronym: 'UTS',
  role: 'Cuenta Institucional',
  email: 'ies@uts.edu.co',
  nit: '890.200.832-6',
};

// Alias de retrocompatibilidad
export const adminProfile = institutionalAccount;

export const initialInstitutionProfile = {
  logo: '/assets/uts-logo.png',
  acronym: 'UTS',
  name: 'Unidades Tecnológicas de Santander',
  legalName: 'Unidades Tecnológicas de Santander',
  nit: '890.200.832-6',
  institutionType: 'Institución universitaria pública',
  city: 'Bucaramanga',
  department: 'Santander',
  address: 'Calle de los Estudiantes # 9-82, Ciudadela Real de Minas',
  phone: '+57 (607) 691-7700',
  contactEmail: 'ies@uts.edu.co',
  website: 'https://www.uts.edu.co',
  legalRepresentative: 'Dr. Omar Lengerke Pérez',
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

export const initialAdvisors = [];
