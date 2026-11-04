/**
 * Datos del equipo de selección: reclutadores y sedes del portal de empresa.
 * Sin roles adicionales: todos son reclutadores con acceso a sus sedes y vacantes.
 */

import { initialCompanySites } from './companySitesData.js';

export { initialCompanySites };

export const RECRUITER_STATUS = {
  active: { label: 'Activo', dot: 'bg-green' },
  invited: { label: 'Invitación pendiente', dot: 'bg-ochre' },
  suspended: { label: 'Suspendido', dot: 'bg-terracotta' },
};

export const initialRecruiters = [
  {
    id: 'rec-01',
    fullName: 'María Fernanda Henao',
    email: 'm.henao@cenit-transporte.com',
    phone: '+57 311 200 4589',
    siteIds: ['site-bga', 'site-bcm', 'site-gir'],
    status: 'active',
    lastAccess: 'Hoy, 8:42 a. m.',
    vacanciesCount: 0,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: 'rec-02',
    fullName: 'Andrés Felipe Camargo',
    email: 'a.camargo@cenit-transporte.com',
    phone: '+57 315 887 2210',
    siteIds: ['site-bga', 'site-gir'],
    status: 'active',
    lastAccess: 'Ayer, 5:10 p. m.',
    vacanciesCount: 4,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: 'rec-03',
    fullName: 'Laura Sofía Pineda',
    email: 'l.pineda@cenit-transporte.com',
    phone: '+57 320 441 9087',
    siteIds: ['site-bcm'],
    status: 'active',
    lastAccess: 'Hace 3 días',
    vacanciesCount: 2,
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: 'rec-04',
    fullName: 'Julián David Ortiz',
    email: 'j.ortiz@cenit-transporte.com',
    phone: '+57 300 612 7745',
    siteIds: ['site-bga'],
    status: 'invited',
    lastAccess: 'Sin accesos registrados',
    vacanciesCount: 0,
    avatar: null,
  },
  {
    id: 'rec-05',
    fullName: 'Diana Carolina Rueda',
    email: 'd.rueda@cenit-transporte.com',
    phone: '+57 316 903 3361',
    siteIds: ['site-gir'],
    status: 'suspended',
    lastAccess: 'Hace 6 semanas',
    vacanciesCount: 1,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
  },
];
