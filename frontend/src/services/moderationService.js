/**
 * Moderación: reportar vacantes (usuarios) y acciones del administrador de Vincula.
 */

import { authService, extractErrorMessage } from './authService.js';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function request(path, { method = 'GET', body } = {}) {
  const token = authService.getToken();
  const response = await fetch(`${API_BASE_URL}/moderacion${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(extractErrorMessage(data, 'No se pudo completar la acción.'));
  return data;
}

export const moderationService = {
  reportVacancy: (vacancyId, motivo, detalle) =>
    request(`/vacantes/${vacancyId}/reportes`, { method: 'POST', body: { motivo, ...(detalle ? { detalle } : {}) } }),

  listReports: (estado = 'pendiente') => request(`/reportes?estado=${encodeURIComponent(estado)}`),
  listDisabledVacancies: () => request('/vacantes-inhabilitadas'),
  listHistory: () => request('/historial'),
  searchAccounts: (q) => request(`/cuentas?q=${encodeURIComponent(q)}`),

  disableVacancy: (id, motivo) => request(`/vacantes/${id}/inhabilitar`, { method: 'POST', body: { motivo } }),
  enableVacancy: (id, nota) => request(`/vacantes/${id}/rehabilitar`, { method: 'POST', body: { nota: nota || null } }),
  dismissReports: (id, nota) => request(`/vacantes/${id}/descartar-reportes`, { method: 'POST', body: { nota: nota || null } }),

  suspendAccount: (id, motivo) => request(`/cuentas/${id}/suspender`, { method: 'POST', body: { motivo } }),
  reactivateAccount: (id, nota) => request(`/cuentas/${id}/reactivar`, { method: 'POST', body: { nota: nota || null } }),
  suspendCompany: (id, motivo) => request(`/empresas/${id}/suspender`, { method: 'POST', body: { motivo } }),
  reactivateCompany: (id, nota) => request(`/empresas/${id}/reactivar`, { method: 'POST', body: { nota: nota || null } }),
};
