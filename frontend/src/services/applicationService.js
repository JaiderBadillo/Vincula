/**
 * Servicio del Portal de Egresados y Mis Postulaciones (Fase 5 - Paso 2 y 3).
 * Endpoints oficiales:
 * - Postulación 1-Clic: POST /api/v1/postulaciones/{vacancy_id}
 * - Listado de Postulaciones: GET /api/v1/egresados/mis-postulaciones
 * - Detalle de Postulación: GET /api/v1/egresados/mis-postulaciones/{application_id}
 * - Retiro Voluntario: DELETE /api/v1/egresados/mis-postulaciones/{application_id}/retirar
 */

import { authService, extractErrorMessage } from './authService.js';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class ApplicationService {
  getAuthHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Obtiene la lista de postulaciones activas del egresado con su trazabilidad de fases.
   */
  async getMyApplications() {
    try {
      const res = await fetch(`${API_BASE_URL}/egresados/mis-postulaciones`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errorData, 'Error al consultar postulaciones del egresado.'));
      }
      return await res.json();
    } catch (err) {
      console.warn('[ApplicationService] getMyApplications fallback/error:', err.message);
      throw err;
    }
  }

  /**
   * Obtiene el detalle profundo de una postulación individual del egresado.
   */
  async getApplicationDetail(applicationId) {
    try {
      const res = await fetch(`${API_BASE_URL}/egresados/mis-postulaciones/${applicationId}`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errorData, 'Error al consultar detalle de postulación.'));
      }
      return await res.json();
    } catch (err) {
      console.warn('[ApplicationService] getApplicationDetail error:', err.message);
      throw err;
    }
  }

  /**
   * Retiro voluntario de una postulación por parte del egresado.
   */
  async withdrawApplication(applicationId) {
    try {
      const res = await fetch(`${API_BASE_URL}/egresados/mis-postulaciones/${applicationId}/retirar`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errorData, 'Error al retirar la postulación.'));
      }
      return await res.json();
    } catch (err) {
      console.warn('[ApplicationService] withdrawApplication error:', err.message);
      throw err;
    }
  }

  /**
   * Postula al egresado autenticado a una vacante con gating de validación de empresa.
   */
  async applyToVacancy(vacancyId, payload = {}) {
    try {
      const currentUser = authService.getCurrentUser();
      const res = await fetch(`${API_BASE_URL}/postulaciones/${vacancyId}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          id_hoja_vida: payload.id_hoja_vida || null,
          salario_esperado: payload.salario_esperado || null,
          carta_presentacion: payload.carta_presentacion || '',
          disponibilidad_inmediata: payload.disponibilidad_inmediata ?? true,
          respuestas_formulario: payload.respuestas_formulario || {},
          vacante_titulo: payload.vacante_titulo || payload.title || null,
          vacante_codigo: payload.vacante_codigo || payload.code || null,
          empresa_nombre: payload.empresa_nombre || payload.company || null,
          modalidad: payload.modalidad || payload.modality || null,
          ubicacion: payload.ubicacion || payload.location || null,
          correo_egresado: payload.correo_egresado || currentUser?.correo || currentUser?.email || null,
          nombre_egresado: payload.nombre_egresado || currentUser?.nombre || currentUser?.name || null,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errorData, 'Error al procesar la postulación a la vacante.'));
      }
      return await res.json();
    } catch (err) {
      console.warn('[ApplicationService] applyToVacancy error:', err.message);
      throw err;
    }
  }
}

export const applicationService = new ApplicationService();
export default applicationService;

