/**
 * Servicio del Motor de Vacantes y Convocatorias Laborales (Fase 4 - Pasos 2 y 3).
 * Conecta el frontend con los endpoints oficiales bajo /api/v1/vacantes:
 * - Catálogo público de vacantes para egresados con filtros avanzados (modalidad, salario, etc.)
 * - Detalle público seguro de vacantes
 * - Bandeja privada corporativa de vacantes (mis-vacantes)
 * - Publicación y actualización formal de vacantes
 * - Cambio de estado de vacante (abierta, pausada, cerrada, borrador)
 */

import { authService, extractErrorMessage } from './authService.js';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class VacancyService {
  /**
   * Genera los encabezados con Bearer token
   */
  getAuthHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // =========================================================================
  // 1. CATÁLOGO PÚBLICO DE VACANTES (EGRESADOS)
  // =========================================================================

  async getPublicVacancies(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.modalidad) query.append('modalidad', params.modalidad);
    if (params.categoria) query.append('categoria', params.categoria);
    if (params.departamento) query.append('departamento', params.departamento);
    if (params.ciudad) query.append('ciudad', params.ciudad);
    if (params.q) query.append('q', params.q);
    if (params.salario_min) query.append('salario_min', params.salario_min);
    if (params.nivel_experiencia) query.append('nivel_experiencia', params.nivel_experiencia);

    const url = `${API_BASE_URL}/vacantes${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      let msg = 'Error al consultar catálogo de vacantes.';
      try {
        const errJson = await res.json();
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  }

  async getPublicVacancyDetail(vacancyId) {
    const url = `${API_BASE_URL}/vacantes/${vacancyId}`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      let msg = 'Error al consultar detalle de la vacante.';
      try {
        const errJson = await res.json();
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  }

  // =========================================================================
  // 2. GESTIÓN CORPORATIVA DE VACANTES (EMPRESAS / RECLUTADORES)
  // =========================================================================

  async getCompanyVacancies(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.estado) query.append('estado', params.estado);
    if (params.sede_id) query.append('sede_id', params.sede_id);
    if (params.q) query.append('q', params.q);
    if (params.id_empresa) query.append('id_empresa', params.id_empresa);

    const url = `${API_BASE_URL}/vacantes/empresa/mis-vacantes${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });

    if (!res.ok) {
      let msg = 'Error al consultar vacantes de la empresa.';
      try {
        const errJson = await res.json();
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  }

  async getCompanyVacancyDetail(vacancyId, idEmpresa = null) {
    const query = new URLSearchParams();
    if (idEmpresa) query.append('id_empresa', idEmpresa);

    const url = `${API_BASE_URL}/vacantes/empresa/detalle/${vacancyId}${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });

    if (!res.ok) {
      let msg = 'Error al consultar detalle privado de la vacante.';
      try {
        const errJson = await res.json();
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  }

  async createVacancy(payload, idEmpresa = null) {
    const query = new URLSearchParams();
    if (idEmpresa) query.append('id_empresa', idEmpresa);

    const url = `${API_BASE_URL}/vacantes${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = 'Error al crear la vacante.';
      try {
        const errJson = await res.json();
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  }

  async updateVacancy(vacancyId, payload, idEmpresa = null) {
    const query = new URLSearchParams();
    if (idEmpresa) query.append('id_empresa', idEmpresa);

    const url = `${API_BASE_URL}/vacantes/${vacancyId}${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = 'Error al actualizar la vacante.';
      try {
        const errJson = await res.json();
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  }

  async updateVacancyStatus(vacancyId, estado, idEmpresa = null) {
    const query = new URLSearchParams();
    if (idEmpresa) query.append('id_empresa', idEmpresa);

    const url = `${API_BASE_URL}/vacantes/${vacancyId}/estado${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ estado }),
    });

    if (!res.ok) {
      let msg = 'Error al actualizar estado de la vacante.';
      try {
        const errJson = await res.json();
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  }
}

export const vacancyService = new VacancyService();

