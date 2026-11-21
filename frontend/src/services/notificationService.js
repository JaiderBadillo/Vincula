/**
 * Notificaciones de la plataforma: GET/POST bajo /api/v1/notificaciones.
 * Cada usuario solo ve y marca las suyas (el servidor lo decide por el token).
 */
import { authService, extractErrorMessage } from './authService.js';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function request(path, method = 'GET') {
  const token = authService.getToken();
  const res = await fetch(`${API_BASE_URL}/notificaciones${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => { throw new Error('No pudimos conectar con el servidor.'); });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractErrorMessage(data, 'No se pudieron cargar las notificaciones.'));
  return data;
}

export const notificationService = {
  /** { items: [{ id, tipo, titulo, mensaje, enlace, leida, creada_en }], no_leidas } */
  list: ({ limit = 30 } = {}) => request(`?limit=${limit}`),
  markRead: (id) => request(`/${encodeURIComponent(id)}/leer`, 'POST'),
  markAllRead: () => request('/leer-todas', 'POST'),
};

/** Aviso a las campanas abiertas de que cambió algo (p. ej. se marcaron como leídas desde la página). */
export const NOTIFICATIONS_CHANGED = 'vincula:notifications-changed';

export function formatRelative(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (!Number.isFinite(minutes) || minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}
