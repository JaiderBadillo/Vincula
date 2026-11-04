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
  id: 'company-01',
  name: 'Cenit Transporte y Logística',
  commercialName: 'Cenit',
  legalName: 'Cenit Transporte y Logística de Hidrocarburos S.A.S.',
  nit: '900.531.210-3',
  logo: null,
  coverImage: null,
  sector: 'Energía e Hidrocarburos',
  size: 'Grande (más de 200 empleados)',
  website: 'https://www.cenit-transporte.com',
  description:
    'Operamos la infraestructura de transporte y logística de hidrocarburos del país y vinculamos talento joven de la región a nuestros equipos de operación, mantenimiento y tecnología.',
  contactEmail: 'talento@cenit-transporte.com',
  phone: '+57 (607) 633 4000',
  department: 'Santander',
  city: 'Bucaramanga',
  address: 'Carrera 27 # 36-14, Edificio Torre Empresarial',
  legalRepresentative: {
    name: 'Carlos Andrés Rueda',
    role: 'Gerente General',
    documentId: '91.234.567',
  },
};

