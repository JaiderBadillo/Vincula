/**
 * Catálogo y etapas del Embudo ATS de Selección de Candidatos.
 * Reclutadora: María Fernanda Henao (Cenit Transporte y Logística).
 */

export const ATS_STAGES = [
  {
    id: 'review',
    label: 'En Revisión',
    shortLabel: 'Revisión',
    dot: 'bg-amber-500',
    badgeColor: 'bg-sand text-cocoa border-sand-line',
    icon: 'bx-file-find',
    description: 'Postulantes nuevos esperando primer filtro curricular.',
  },
  {
    id: 'preselected',
    label: 'Preseleccionados',
    shortLabel: 'Preselección',
    dot: 'bg-ochre',
    badgeColor: 'bg-ochre/20 text-cocoa border-ochre/40',
    icon: 'bx-check-double',
    description: 'Aspirantes que cumplen el perfil base y pasan a validación.',
  },
  {
    id: 'evaluation',
    label: 'Prueba Técnica',
    shortLabel: 'Prueba',
    dot: 'bg-amber-600',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    icon: 'bx-test-tube',
    description: 'Evaluación técnica, prueba de código o prueba práctica de planta.',
  },
  {
    id: 'interview',
    label: 'Entrevista',
    shortLabel: 'Entrevista',
    dot: 'bg-terracotta',
    badgeColor: 'bg-terracotta/15 text-terracotta-dark border-terracotta/30',
    icon: 'bx-calendar-event',
    description: 'Entrevista con reclutador líder o jefe directo del área.',
  },
  {
    id: 'offer',
    label: 'Oferta / Finalistas',
    shortLabel: 'Oferta',
    dot: 'bg-emerald-500',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    icon: 'bx-trophy',
    description: 'Fase de propuesta salarial, exámenes médicos o vinculación.',
  },
  {
    id: 'discarded',
    label: 'Descartados',
    shortLabel: 'Descarte',
    dot: 'bg-stone-400',
    badgeColor: 'bg-stone-100 text-stone-700 border-stone-300',
    icon: 'bx-x-circle',
    description: 'Postulantes no seleccionados en este proceso con motivo registrado.',
  },
];

export const DISCARD_REASONS = [
  'Afinidad técnica insuficiente para el nivel requerido',
  'Expectativa salarial fuera del rango corporativo',
  'No disponibilidad para la modalidad o sede requerida',
  'Otro candidato seleccionado con mayor experiencia práctica',
  'No completó la prueba técnica en el tiempo acordado',
  'Desistió voluntariamente del proceso de selección',
];

export const initialCandidates = [];
