/**
 * Datos del equipo de selección: reclutadores y sedes del portal de empresa.
 */

import { initialCompanySites } from './companySitesData.js';

export { initialCompanySites };

export const RECRUITER_STATUS = {
  active: { label: 'Activo', dot: 'bg-green' },
  invited: { label: 'Invitación pendiente', dot: 'bg-ochre' },
  suspended: { label: 'Suspendido', dot: 'bg-terracotta' },
};

export const initialRecruiters = [];
