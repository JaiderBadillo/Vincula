/**
 * Servicio del Motor de Inteligencia Artificial, Matching y Trazabilidad (Fase 6).
 * Endpoints oficiales bajo /api/v1/ia:
 * - Afinidad y Matching Semántico: GET /api/v1/ia/matching/evaluar/{vacante_id}
 * - Vacantes Recomendadas por IA: GET /api/v1/ia/vacantes-recomendadas
 * - Extracción y Pertinencia de Pensum PDF: POST /api/v1/ia/trazabilidad/analizar-pensum-pdf
 * - Pertinencia de Programa Académico: GET /api/v1/ia/trazabilidad/programas/{id}/pertinencia
 * - Guardar malla del programa: PUT /api/v1/ia/trazabilidad/programas/{id}/pensum
 * - Taxonomía de Familias de Conocimiento: GET /api/v1/ia/trazabilidad/taxonomy
 */

import { authService, extractErrorMessage } from './authService.js';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class AIService {
  getAuthHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Evalúa la compatibilidad semántica entre una vacante y el egresado.
   */
  async evaluateVacancyAffinity(vacancyId, egresadoId = null) {
    try {
      const query = egresadoId ? `?egresado_id=${encodeURIComponent(egresadoId)}` : '';
      const res = await fetch(`${API_BASE_URL}/ia/matching/evaluar/${vacancyId}${query}`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errorData, 'Error al evaluar afinidad IA.'));
      }
      return await res.json();
    } catch (err) {
      console.warn('[AIService] evaluateVacancyAffinity error/fallback:', err.message);
      throw err;
    }
  }

  /**
   * Obtiene el catálogo de vacantes ordenadas por mayor afinidad IA para el egresado autenticado.
   */
  async getRecommendedVacancies(limit = 20, egresadoId = null) {
    try {
      const egrQuery = egresadoId ? `&egresado_id=${encodeURIComponent(egresadoId)}` : '';
      const res = await fetch(`${API_BASE_URL}/ia/vacantes-recomendadas?limit=${limit}${egrQuery}`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errorData, 'Error al consultar vacantes recomendadas.'));
      }
      return await res.json();
    } catch (err) {
      console.warn('[AIService] getRecommendedVacancies fallback/info:', err.message);
      throw err;
    }
  }

  /**
   * Carga un PDF de pensum curricular para extraer asignaturas y calcular pertinencia frente al mercado.
   */
  async analyzePensumPdf(file, programHint = '', idPrograma = null) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (programHint) formData.append('program_hint', programHint);
      if (idPrograma) formData.append('id_programa', idPrograma);

      const token = authService.getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`${API_BASE_URL}/ia/trazabilidad/analizar-pensum-pdf`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errorData, 'Error al procesar pensum PDF con IA.'));
      }
      return await res.json();
    } catch (err) {
      console.warn('[AIService] analyzePensumPdf error:', err.message);
      throw err;
    }
  }

  /**
   * Consulta el informe de pertinencia curricular y brechas para un programa registrado de la IES.
   */
  async getProgramPertinence(programId) {
    try {
      const res = await fetch(`${API_BASE_URL}/ia/trazabilidad/programas/${programId}/pertinencia`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errorData, 'Error al consultar pertinencia curricular.'));
      }
      return await res.json();
    } catch (err) {
      console.warn('[AIService] getProgramPertinence error:', err.message);
      throw err;
    }
  }

  /**
   * Ciclo propedéutico: define o quita (null) el programa previo requerido. Devuelve el informe actualizado.
   */
  async setPreviousProgram(programId, previousProgramId) {
    const res = await fetch(`${API_BASE_URL}/ia/trazabilidad/programas/${programId}/programa-previo`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ id_programa_previo: previousProgramId || null }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(extractErrorMessage(errorData, 'No se pudo guardar el programa previo.'));
    }
    return await res.json();
  }

  /**
   * Resultados reales de los egresados del programa en los procesos de selección.
   */
  async getProgramOutcomes(programId) {
    const res = await fetch(`${API_BASE_URL}/ia/trazabilidad/programas/${programId}/resultados`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(extractErrorMessage(errorData, 'Error al consultar los resultados de egresados.'));
    }
    return await res.json();
  }

  /**
   * Guarda la malla confirmada por la IES (asignaturas y herramientas declaradas) y devuelve el informe.
   */
  async savePensum(programId, pensum) {
    const body = {
      version: pensum.version || null,
      semestres: (pensum.semesters || [])
        .filter((sem) => (sem.subjects || []).length > 0)
        .map((sem) => ({
          numero_semestre: sem.semesterNumber,
          asignaturas: sem.subjects.map((sub) => ({
            codigo: sub.code || '',
            nombre: sub.name,
            creditos: Number(sub.credits) || 0,
            herramientas: Array.isArray(sub.tools) ? sub.tools : [],
          })),
        })),
    };
    const res = await fetch(`${API_BASE_URL}/ia/trazabilidad/programas/${programId}/pensum`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(extractErrorMessage(errorData, 'No se pudo guardar la malla curricular.'));
    }
    return await res.json();
  }

  /**
   * Retorna el catálogo maestro de familias tecnológicas de la taxonomía.
   */
  async getTaxonomy() {
    try {
      const res = await fetch(`${API_BASE_URL}/ia/trazabilidad/taxonomy`);
      if (!res.ok) throw new Error('Error al consultar taxonomía.');
      return await res.json();
    } catch (err) {
      console.warn('[AIService] getTaxonomy error:', err.message);
      return { success: true, families: {} };
    }
  }
}

export const aiService = new AIService();
export default aiService;

