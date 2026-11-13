import { authService, extractErrorMessage } from './authService.js';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function request(method, body) {
  const token = authService.getToken();
  if (!token) throw new Error('Debes iniciar sesión para consultar tu perfil.');
  const response = await fetch(`${API_BASE_URL}/egresados/perfil`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(extractErrorMessage(await response.json().catch(() => null), 'No se pudo consultar tu perfil.'));
  return response.json();
}

async function cvRequest(method, suffix, file) {
  const token = authService.getToken();
  if (!token) throw new Error('Debes iniciar sesión para gestionar tu hoja de vida.');
  const body = file ? new FormData() : undefined;
  if (body) body.append('archivo_pdf', file);
  const response = await fetch(`${API_BASE_URL}/egresados/perfil/hojas-de-vida${suffix}`, {
    method, headers: { Authorization: `Bearer ${token}` }, body,
  });
  if (!response.ok) throw new Error(extractErrorMessage(await response.json().catch(() => null), 'No se pudo guardar la hoja de vida.'));
  return response.json();
}

export const graduateProfileService = {
  get: () => request('GET'),
  update: (fields) => request('PATCH', fields),
  uploadCv: (file) => cvRequest('POST', '', file),
  deleteCv: (id) => cvRequest('DELETE', `/${encodeURIComponent(id)}`),
  setPrimaryCv: (id) => cvRequest('PATCH', `/${encodeURIComponent(id)}/principal`),
};
