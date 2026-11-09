/**
 * Datos iniciales del portal Administrador de Empresa.
 * Ver docs/ROADMAP_ADMIN_EMPRESA.md para el modelo de datos completo.
 */

export const COMPANY_SECTORS = [
  'Tecnología y Software',
  'Banca y Servicios Financieros',
  'Energía e Hidrocarburos',
  'Logística y Transporte',
  'Manufactura e Industria',
  'Comercio y Retail',
  'Salud',
  'Educación',
  'Construcción e Infraestructura',
  'Consultoría y Servicios Profesionales',
  'Sector Público',
  'Otro',
];

export const COMPANY_SIZES = [
  'Microempresa (1 - 10 empleados)',
  'Pequeña (11 - 50 empleados)',
  'Mediana (51 - 200 empleados)',
  'Grande (más de 200 empleados)',
];

export const initialCompanyProfile = {
  id: '',
  name: '',
  commercialName: '',
  legalName: '',
  nit: '',
  logo: null,
  coverImage: null,
  sector: '',
  size: '',
  website: '',
  description: '',
  contactEmail: '',
  phone: '',
  department: '',
  city: '',
  address: '',
  legalRepresentative: {
    name: '',
    role: '',
    documentId: '',
  },
};

