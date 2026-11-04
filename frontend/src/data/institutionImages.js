/**
 * Fotografías oficiales del portal Administrador de IES (Pexels).
 * 100% enfocadas en vida universitaria, estudiantes, docentes, aulas, laboratorios y graduación.
 */
const pexels = (id, w = 1400) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&q=80`;

export const institutionPhotos = {
  perfil: {
    src: pexels(5940841),
    alt: 'Docente universitaria guiando a estudiantes en biblioteca académica moderna',
    position: 'object-[center_30%]',
  },
  perfilCover: {
    src: pexels(1438072, 1200),
    alt: 'Estudiantes universitarios en el campus colaborando con computador portátil',
    position: 'object-[center_35%]',
  },
  asesores: {
    src: pexels(32213421),
    alt: 'Equipo de asesores y profesionales universitarios en laboratorio moderno',
    position: 'object-[center_30%]',
  },
  sedes: {
    src: pexels(1181396),
    alt: 'Auditorio institucional y salas de conferencias académicas',
    position: 'object-center',
  },
  programas: {
    src: pexels(8533082),
    alt: 'Investigación y laboratorios de vanguardia en la institución',
    position: 'object-[center_35%]',
  },
  facultades: {
    src: pexels(256455),
    alt: 'Biblioteca y acervo bibliográfico de las facultades universitarias',
    position: 'object-[center_30%]',
  },
  trazabilidad: {
    src: pexels(36898131),
    alt: 'Análisis curricular, tecnología y pertinencia laboral',
    position: 'object-[center_30%]',
  },
  sidebar: {
    src: pexels(267885, 800),
    alt: 'Graduados universitarios celebrando con birretes al cielo',
    position: 'object-[center_20%]',
  },
};

/**
 * Fotografías oficiales del portal Asesor de IES (Gestión de Egresados y Convenios).
 * Estética académica, campus, laboratorios, graduación y verde institucional.
 */
export const advisorPhotos = {
  dashboard: {
    src: pexels(5940841),
    alt: 'Docente universitaria guiando a estudiantes en biblioteca académica moderna',
    position: 'object-[center_30%]',
  },
  graduateValidation: {
    src: pexels(1438072),
    alt: 'Estudiantes en el campus universitario listos para validación de título',
    position: 'object-[center_35%]',
  },
  studentTracking: {
    src: pexels(32213421),
    alt: 'Egresada profesional en laboratorio de alta tecnología',
    position: 'object-[center_30%]',
  },
  placementStats: {
    src: pexels(267885),
    alt: 'Egresados universitarios en ceremonia de graduación con birretes al cielo',
    position: 'object-[center_20%]',
  },
  companyValidation: {
    src: pexels(1181396),
    alt: 'Alianzas y convenios institucionales con el sector empresarial',
    position: 'object-center',
  },
  companyTracking: {
    src: pexels(8533082),
    alt: 'Supervisión de convenios y empleabilidad con empresas aliadas',
    position: 'object-[center_35%]',
  },
  laborMarket: {
    src: pexels(36898131),
    alt: 'Observatorio de competencias y pertinencia del mercado laboral',
    position: 'object-[center_30%]',
  },
};
