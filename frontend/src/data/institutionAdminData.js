// Cuenta institucional de la IES (representa a la universidad en sí, no a una persona individual)
export const institutionalAccount = {
  id: '',
  name: '',
  acronym: '',
  role: 'Cuenta Institucional',
  email: '',
  nit: '',
};

// Alias de retrocompatibilidad
export const adminProfile = institutionalAccount;

export const initialInstitutionProfile = {
  logo: null,
  coverImage: null,
  acronym: '',
  name: '',
  legalName: '',
  nit: '',
  institutionType: '',
  city: '',
  department: '',
  address: '',
  phone: '',
  contactEmail: '',
  website: '',
  legalRepresentative: '',
};

export const institutionPrograms = [
  { id: 'sistemas', name: 'Ingeniería de Sistemas' },
  { id: 'electronica', name: 'Ingeniería Electrónica' },
  { id: 'gestion', name: 'Tecnología en Gestión Empresarial' },
  { id: 'contabilidad', name: 'Tecnología en Contabilidad Financiera' },
  { id: 'topografia', name: 'Tecnología en Topografía e Infraestructura' },
];

export const initialAdvisors = [];
