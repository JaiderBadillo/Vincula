import { jobs } from './jobs.js';

const applicationFixtures = [
  {
    id: 'application-frontend',
    jobId: 'desarrollador-frontend',
    appliedAt: '2026-09-29',
    phase: '3',
    recruiter: {
      name: 'Mariana Valenzuela',
      role: 'Líder de Atracción de Talento Tech',
      email: 'm.valenzuela@laboratoriodigital.co',
      phone: '+57 318 450 9210',
    },
    phaseStatusLabel: 'Entrevista técnica programada',
    phaseFeedback: 'Tu portafolio y prueba conceptual fueron aprobados con felicitaciones. Has avanzado a la sesión técnica en vivo con el Líder de Arquitectura.',
    submittedDocument: {
      fileName: 'CV_Jaider_Frontend_UTS.pdf',
      fileSize: '348 KB',
      uploadedAt: '2026-09-29',
    },
  },
  {
    id: 'application-projects',
    jobId: 'gestion-proyectos',
    appliedAt: '2026-09-27',
    phase: '2',
    recruiter: {
      name: 'Dr. Carlos Eduardo Serrano',
      role: 'Coordinador de Selección y Méritos',
      email: 'c.serrano@desarrolloregional.gov.co',
      phone: '+57 315 889 4432',
    },
    phaseStatusLabel: 'Revisión de requisitos y certificaciones',
    phaseFeedback: 'El comité evaluador está verificando la autenticidad de tus títulos y certificaciones en metodologías de proyectos presentadas.',
    submittedDocument: {
      fileName: 'Hoja_de_Vida_Gestion_Proyectos_UTS.pdf',
      fileSize: '412 KB',
      uploadedAt: '2026-09-27',
    },
  },
  {
    id: 'application-data',
    jobId: 'analista-datos',
    appliedAt: '2026-09-25',
    phase: '4',
    recruiter: {
      name: 'Laura Sofía Pinzón',
      role: 'Head of People & Operations',
      email: 'laura.pinzon@techcolombia.io',
      phone: '+57 320 671 2289',
    },
    phaseStatusLabel: 'Oferta económica y formalización',
    phaseFeedback: '¡Felicitaciones! Has superado todas las etapas evaluativas con un puntaje de 96/100. En este momento se está preparando tu contrato laboral.',
    submittedDocument: {
      fileName: 'CV_Analista_Datos_UTS.pdf',
      fileSize: '390 KB',
      uploadedAt: '2026-09-25',
    },
  },
  {
    id: 'application-processes',
    jobId: 'ingenieria-procesos',
    appliedAt: '2026-09-24',
    phase: '1',
    recruiter: {
      name: 'Ing. Fernando Gómez',
      role: 'Director Técnico y Operativo',
      email: 'procesos@innovacionterritorial.org',
      phone: '+57 301 234 5678',
    },
    phaseStatusLabel: 'Postulación registrada en espera de filtro',
    phaseFeedback: 'Tu postulación fue recibida exitosamente. El equipo de selección iniciará la revisión curricular en los próximos 3 días hábiles.',
    submittedDocument: {
      fileName: 'CV_Ingenieria_Procesos_UTS.pdf',
      fileSize: '295 KB',
      uploadedAt: '2026-09-24',
    },
  },
  {
    id: 'application-talent',
    jobId: 'asistente-talento',
    appliedAt: '2026-09-22',
    phase: '2',
    recruiter: {
      name: 'Claudia Patricia Reyes',
      role: 'Gerente de Gestión Humana',
      email: 'gestionhumana@cooperativahorizonte.co',
      phone: '+57 312 908 1123',
    },
    phaseStatusLabel: 'Evaluación de pruebas psicotécnicas',
    phaseFeedback: 'Has completado el cuestionario de competencias laborales. En breve serás notificado sobre la fecha de la entrevista grupal.',
    submittedDocument: {
      fileName: 'CV_Talento_Humano_UTS.pdf',
      fileSize: '310 KB',
      uploadedAt: '2026-09-22',
    },
  },
];

const jobsById = new Map(jobs.map((job) => [job.id, job]));

export const phaseDefinitions = [
  {
    number: '1',
    name: 'Postulación recibida',
    shortDescription: 'Registro y confirmación de recepción en el sistema',
  },
  {
    number: '2',
    name: 'Revisión curricular y requisitos',
    shortDescription: 'Validación de títulos UTS, competencias y experiencia',
  },
  {
    number: '3',
    name: 'Entrevista técnica / Evaluación',
    shortDescription: 'Entrevista con el líder de área o prueba práctica',
  },
  {
    number: '4',
    name: 'Oferta final y contratación',
    shortDescription: 'Propuesta salarial, exámenes y suscripción del contrato',
  },
];

// Combine application info with complete vacancy specs
export const applications = applicationFixtures.flatMap((application) => {
  const job = jobsById.get(application.jobId);
  if (!job) return [];

  return [{
    ...job,
    id: application.id,
    jobId: job.id,
    companyName: job.companyName,
    companyLogo: job.companyLogo,
    vacancyTitle: job.title,
    appliedAt: application.appliedAt,
    phase: application.phase,
    recruiter: application.recruiter,
    phaseStatusLabel: application.phaseStatusLabel,
    phaseFeedback: application.phaseFeedback,
    submittedDocument: application.submittedDocument,
  }];
});

export const interviews = [
  {
    id: 'interview-frontend',
    applicationId: 'application-frontend',
    interviewAt: '2026-10-07T15:00:00-05:00',
    interviewer: 'Mariana Valenzuela & Ing. Andrés Morales (Tech Lead)',
    modality: 'Videollamada Google Meet',
    meetingUrl: 'https://meet.google.com/uts-tech-2026',
    objective: 'Revisión de arquitectura frontend, buenas prácticas con React y prueba interactiva en vivo.',
  },
  {
    id: 'interview-projects',
    applicationId: 'application-projects',
    interviewAt: '2026-10-08T10:30:00-05:00',
    interviewer: 'Dr. Carlos Eduardo Serrano',
    modality: 'Presencial - Sala de Juntas EDR (Bucaramanga)',
    meetingUrl: null,
    objective: 'Sustentación de experiencia en proyectos regionales y marco lógico.',
  },
  {
    id: 'interview-data',
    applicationId: 'application-data',
    interviewAt: '2026-10-12T09:00:00-05:00',
    interviewer: 'Laura Sofía Pinzón (Head of People)',
    modality: 'Videollamada Microsoft Teams',
    meetingUrl: 'https://teams.microsoft.com/l/meetup-join/uts-data-offer',
    objective: 'Sesión de bienvenida, lectura de contrato y concertación de fecha de inicio.',
  },
].flatMap((interview) => {
  const application = applications.find((item) => item.id === interview.applicationId);
  if (!application) return [];

  return [{
    ...interview,
    companyName: application.companyName,
    companyLogo: application.companyLogo,
    vacancyTitle: application.vacancyTitle,
    application,
  }];
});
