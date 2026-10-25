// Datos iniciales del perfil del egresado hasta que exista la API de perfiles.
export const initialProfile = {
  fullName: 'Jaider',
  headline: 'Tecnólogo en Desarrollo de Sistemas Informáticos · Frontend React',
  program: 'Tecnología en Desarrollo de Sistemas Informáticos',
  graduationYear: '2025',
  location: 'Bucaramanga, Santander',
  email: 'jaider@correo.uts.edu.co',
  phone: '+57 300 000 0000',
  about:
    'Egresado UTS apasionado por construir interfaces web accesibles y rápidas. Me interesa trabajar en equipos de producto donde pueda aportar en React, diseño de componentes y buenas prácticas de código.',
  photo: null,
  cover: null,
  openToWork: true,
  openToWorkVisibility: 'recruiters', // 'recruiters' | 'all'
  links: {
    linkedin: 'linkedin.com/in/jaider',
    github: 'github.com/jaider',
    portfolio: '',
  },
  cvs: [
    { id: 'cv-general', label: 'CV General', fileName: 'CV_Jaider_General_UTS.pdf', size: 356000, uploadedAt: '2026-09-20', primary: true },
    { id: 'cv-frontend', label: 'CV Frontend', fileName: 'CV_Jaider_Frontend_UTS.pdf', size: 348000, uploadedAt: '2026-09-29', primary: false },
  ],
  skills: [
    { id: 's1', name: 'React.js', level: 3, type: 'tech' },
    { id: 's2', name: 'JavaScript', level: 3, type: 'tech' },
    { id: 's3', name: 'Tailwind CSS', level: 3, type: 'tech' },
    { id: 's4', name: 'Git & GitHub', level: 2, type: 'tech' },
    { id: 's5', name: 'SQL', level: 2, type: 'tech' },
    { id: 's6', name: 'Trabajo en equipo', level: 4, type: 'soft' },
    { id: 's7', name: 'Comunicación asertiva', level: 3, type: 'soft' },
  ],
  languages: [
    { id: 'l1', name: 'Español', level: 'Nativo' },
    { id: 'l2', name: 'Inglés', level: 'B1' },
  ],
  experience: [
    {
      id: 'e1',
      type: 'practice',
      role: 'Practicante de desarrollo web',
      company: 'Laboratorio de Software UTS',
      start: '2025-02',
      end: '2025-08',
      current: false,
      description: 'Desarrollo de módulos en React para el sistema de gestión académica y pruebas de usabilidad con estudiantes.',
    },
    {
      id: 'e2',
      type: 'education',
      role: 'Tecnología en Desarrollo de Sistemas Informáticos',
      company: 'Unidades Tecnológicas de Santander',
      start: '2022-02',
      end: '2025-06',
      current: false,
      description: 'Proyecto de grado: plataforma web para la gestión de prácticas empresariales.',
    },
  ],
  preferences: {
    salaryMin: 2800000,
    salaryMax: 3800000,
    showSalary: false,
    modes: ['Remoto', 'Híbrido'],
    cities: ['Bucaramanga', 'Floridablanca'],
    relocate: false,
    availability: 'Inmediata',
    contracts: ['Término indefinido'],
    areas: ['Tecnología', 'Datos y tecnología'],
  },
  privacy: {
    visibleToCompanies: true,
    showContact: 'applications', // 'applications' | 'all' | 'none'
    hiddenCompanies: [],
  },
  alerts: {
    enabled: true,
    frequency: 'Diaria',
  },
};

export const skillSuggestions = {
  tech: ['TypeScript', 'Node.js', 'Python', 'Power BI', 'Figma', 'Docker', 'Excel avanzado', 'Scrum', 'AutoCAD', 'Siigo'],
  soft: ['Liderazgo', 'Resolución de problemas', 'Pensamiento crítico', 'Adaptabilidad', 'Gestión del tiempo', 'Creatividad'],
};

export const skillLevels = ['Básico', 'Intermedio', 'Avanzado', 'Experto'];
export const languageLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Nativo'];
export const workModes = ['Remoto', 'Híbrido', 'Presencial'];
export const contractTypes = ['Término indefinido', 'Término fijo', 'Prestación de servicios', 'Prácticas'];
export const availabilityOptions = ['Inmediata', '15 días', '30 días', 'Más de 30 días'];
export const cityOptions = ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Bogotá', 'Medellín', 'Cualquier ciudad'];
