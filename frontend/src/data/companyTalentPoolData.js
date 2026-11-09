/**
 * Base de datos del Banco de Talento IES (Sourcing y Headhunting Institucional).
 * Talento verificado de universidades con convenio activo (UTS, UIS).
 */

export const TALENT_STATUSES = [
  { id: 'all', label: 'Todos los estados formativos' },
  { id: 'recien-egresado', label: 'Recién egresado (< 1 año)', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { id: 'practicante', label: 'Practicante habilitado', badge: 'bg-ochre/25 text-cocoa border-ochre/40' },
  { id: 'experiencia', label: 'Egresado con experiencia (1-3 años)', badge: 'bg-sand text-cocoa border-sand-line' },
];

export const ALLIED_INSTITUTIONS = [
  { id: 'all', name: 'Todas las IES aliadas' },
  { id: 'uts', name: 'Unidades Tecnológicas de Santander (UTS)' },
  { id: 'uis', name: 'Universidad Industrial de Santander (UIS)' },
];

export const INITIAL_TALENT_LISTS = [];

export const initialTalentPool = [];
