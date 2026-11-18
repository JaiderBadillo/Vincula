/** Convenios IES <-> empresa: propuestas en ambas direcciones (endpoints bajo /api/v1/convenios). */

import { authService, extractErrorMessage } from './authService.js';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function request(path, options = {}, fallback = 'No se pudo completar la operación.') {
  const token = authService.getToken();
  const res = await fetch(`${API_BASE_URL}/convenios/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, fallback));
  }
  return res.json();
}

export const convenioService = {
  /** { lado, propuestas, convenios } de la empresa o institución de la sesión. */
  getMine: () => request('mios', {}, 'No se pudieron cargar los convenios.'),
  /** Instituciones (si eres empresa) o empresas (si eres IES) aprobadas. */
  searchCounterparts: (q = '') => request(`contrapartes?q=${encodeURIComponent(q)}`, {}, 'No se pudo buscar.'),
  propose: (payload) => request('propuestas', { method: 'POST', body: JSON.stringify(payload) }, 'No se pudo enviar la propuesta.'),
  respond: (id, accion, notas = null) => request(`propuestas/${id}/responder`, { method: 'POST', body: JSON.stringify({ accion, notas }) }, 'No se pudo responder la propuesta.'),
  /** Convenios vigentes de la empresa, para publicar vacantes exclusivas. */
  getActive: () => request('vigentes', {}, 'No se pudieron cargar los convenios vigentes.'),
};
