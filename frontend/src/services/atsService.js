/**
 * Servicio del Pipeline ATS Kanban para Reclutadores y Empresas (Fase 5 - Pasos 1 y 3).
 * Endpoints oficiales bajo /api/v1/reclutador:
 * - Tablero Kanban de 6 fases hidratado: GET /api/v1/reclutador/kanban/{vacancy_id}
 * - Transición drag-and-drop de fase: PATCH /api/v1/reclutador/postulaciones/{application_id}/mover-fase
 * - Notas privadas de evaluación: POST /api/v1/reclutador/postulaciones/{application_id}/notas
 * - Programación de entrevistas: POST /api/v1/reclutador/postulaciones/{application_id}/entrevistas
 */

import { authService, extractErrorMessage } from './authService.js';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class ATSService {
  getAuthHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Obtiene el tablero ATS Kanban con las 6 columnas y candidatos hidratados para una vacante.
   */
  async getKanbanBoard(vacancyId) {
    try {
      const res = await fetch(`${API_BASE_URL}/reclutador/kanban/${vacancyId}`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errorData, 'Error al cargar tablero ATS Kanban.'));
      }
      return await res.json();
    } catch (err) {
      console.warn('[ATSService] getKanbanBoard fallback/error:', err.message);
      throw err;
    }
  }

  /**
   * Mueve un candidato de fase en el tablero ATS con bitácora de auditoría.
   */
  async moveCandidateStage(applicationId, newStage, rejectionReason = null, recruiterNotes = null) {
    try {
      const res = await fetch(`${API_BASE_URL}/reclutador/postulaciones/${applicationId}/mover-fase`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          nueva_fase: newStage,
          motivo_descarte: rejectionReason,
          notas_fase: recruiterNotes,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errorData, 'Error al mover candidato de fase.'));
      }
      return await res.json();
    } catch (err) {
      console.warn('[ATSService] moveCandidateStage fallback/error:', err.message);
      throw err;
    }
  }

  /**
   * Agrega una nota privada de evaluación del reclutador.
   */
  async addCandidateNote(applicationId, noteText, rating = null) {
    try {
      const res = await fetch(`${API_BASE_URL}/reclutador/postulaciones/${applicationId}/notas`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          nota: noteText,
          calificacion: rating,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errorData, 'Error al registrar nota del candidato.'));
      }
      return await res.json();
    } catch (err) {
      console.warn('[ATSService] addCandidateNote fallback/error:', err.message);
      throw err;
    }
  }

  /**
   * Agenda una entrevista formal con el candidato y lo avanza a fase 'entrevista'.
   */
  async scheduleInterview(applicationId, payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/reclutador/postulaciones/${applicationId}/entrevistas`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          fecha_entrevista: payload.fecha_entrevista || payload.date,
          franja_horaria: payload.franja_horaria || payload.timeRange || '10:00 AM - 11:00 AM',
          modalidad: payload.modalidad || payload.modality || 'Virtual',
          url_reunion: payload.url_reunion || payload.meetUrl || null,
          objetivo: payload.objetivo || payload.objective || 'Entrevista de evaluación técnica',
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errorData, 'Error al agendar entrevista.'));
      }
      return await res.json();
    } catch (err) {
      console.warn('[ATSService] scheduleInterview fallback/error:', err.message);
      throw err;
    }
  }
}

export const atsService = new ATSService();
export default atsService;

