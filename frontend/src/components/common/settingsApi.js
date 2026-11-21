import { authService, extractErrorMessage } from '../../services/authService.js';

export const API = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
export const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || '698543862122-050jkphuknmg709207im4lfs39744ef8.apps.googleusercontent.com';

/** Cliente para los endpoints de configuración (cuenta general o asesor IES). */
export function createSettingsRequest(base) {
  return async function request(path = '', method = 'GET', payload) {
    const response = await fetch(`${API}${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${authService.getToken()}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(extractErrorMessage(data, 'No se pudo guardar el cambio.'));
    return data;
  };
}

export const formatDateTime = (value) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
