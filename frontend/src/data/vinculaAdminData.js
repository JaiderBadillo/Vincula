/**
 * Datos iniciales para el Administrador de Plataforma Vincula (Super Admin).
 * Dataset depurado: Contiene exclusivamente las cuentas oficiales activas de Vincula y UTS.
 */

export const INITIAL_PLATFORM_METRICS = {
  totalCompanies: 0,
  activeCompanies: 0,
  pendingCompanies: 0,
  correctionCompanies: 0,
  totalInstitutions: 1,
  activeInstitutions: 1,
  pendingInstitutions: 0,
  activeAgreements: 0,
  activeVacancies: 0,
  graduatesConnected: 0,
};

export const INITIAL_COMPANIES_REQUESTS = [];

export const INITIAL_INSTITUTIONS_REQUESTS = [
  {
    id: 'ies-req-03',
    name: 'Unidades Tecnológicas de Santander - UTS',
    shortName: 'UTS',
    sniesCode: '2827',
    academicCharacter: 'Institución Tecnológica y Universitaria',
    nit: '890.200.832-6',
    city: 'Bucaramanga, Santander',
    address: 'Calle de los Estudiantes # 9-82, Ciudadela Real de Minas',
    phone: '+57 (607) 691-7700',
    email: 'ies@uts.edu.co',
    website: 'https://www.uts.edu.co',
    rectorName: 'Dr. Omar Lengerke Pérez',
    rectorId: 'C.C. 91.229.418 de Bucaramanga',
    contactPerson: 'Coordinación de Egresados UTS',
    programsCount: 6,
    registeredAt: '2026-10-01T08:00:00Z',
    status: 'approved',
    daysWaiting: 0,
    documents: [
      {
        id: 'ies-doc-21',
        type: 'resolucion_men',
        label: 'Resolución de Reconocimiento Institucional MEN',
        number: 'Ordenanza Departamental No. 049 de 1963 / Acreditación Institucional',
        issuer: 'Ministerio de Educación Nacional',
        fileName: 'Acreditacion_Institucional_UTS.pdf',
        fileSize: '4.5 MB',
        verified: true,
      },
      {
        id: 'ies-doc-22',
        type: 'snies',
        label: 'Registro Oficial SNIES',
        number: 'Código SNIES: 2827',
        issuer: 'MEN Colombia',
        fileName: 'Registro_SNIES_UTS.pdf',
        fileSize: '1.1 MB',
        verified: true,
      },
      {
        id: 'ies-doc-23',
        type: 'rut',
        label: 'Registro Único Tributario (RUT)',
        issuer: 'DIAN Colombia',
        fileName: 'RUT_Oficial_UTS.pdf',
        fileSize: '950 KB',
        verified: true,
      },
    ],
    notes: 'Institución de Educación Superior fundadora del ecosistema Vincula.',
    reviewLog: [
      {
        date: '01/10/2026 - 08:00 AM',
        author: 'Super Admin Vincula',
        action: 'IES Fundadora Aprobada y Activa en la Red',
      },
    ],
  },
];

/**
 * Serie histórica mensual y por periodos para analítica avanzada del Super Administrador.
 */
export const MONTHLY_PERIODS_DATA = [
  {
    key: '2026-01',
    periodLabel: 'Inicio Red 2026',
    shortLabel: '2026',
    semester: '2026-I',
    quarter: 'q1',
    newCompanies: 0,
    cumCompanies: 0,
    newVacancies: 0,
    cumVacancies: 0,
    newInstitutions: 1,
    cumInstitutions: 1,
    newGraduates: 0,
    cumGraduates: 0,
    totalApplications: 0,
    growthRate: '0.0%',
  },
];

export const SEMESTRAL_PERIODS_DATA = [
  {
    key: '2026-I',
    periodLabel: 'Semestre 2026-I',
    shortLabel: '2026-I',
    newCompanies: 0,
    cumCompanies: 0,
    newVacancies: 0,
    cumVacancies: 0,
    newInstitutions: 1,
    cumInstitutions: 1,
    newGraduates: 0,
    cumGraduates: 0,
    totalApplications: 0,
    growthRate: '0.0%',
  },
];
