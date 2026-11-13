/**
 * Servicio de Gestión Corporativa Multi-Sede y Reclutadores (Fase 4 - Paso 1 y 3).
 * Conecta el frontend con los endpoints oficiales bajo /api/v1/empresas:
 * - Consulta de cuarentena y radicado oficial
 * - CRUD de Sedes Corporativas
 * - Áreas funcionales por sede
 * - Equipo de Reclutadores de Talento y Asignación de Sedes
 */

import { authService, extractErrorMessage } from './authService.js';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class CompanyService {
  async getProfile() {
    const res = await fetch(`${API_BASE_URL}/empresas/perfil`, { headers: this.getAuthHeaders() });
    if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => null), 'No se pudo cargar el perfil de la empresa.'));
    return res.json();
  }

  async updateProfile(profile) {
    const res = await fetch(`${API_BASE_URL}/empresas/perfil`, {
      method: 'PUT', headers: this.getAuthHeaders(), body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => null), 'No se pudo guardar el perfil de la empresa.'));
    return res.json();
  }

  /**
   * Genera los encabezados con Bearer token de la empresa o reclutador
   */
  getAuthHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // =========================================================================
  // 1. ESTADO DE CUARENTENA Y SUBSANACIÓN
  // =========================================================================

  async getQuarantineStatus() {
    const url = `${API_BASE_URL}/empresas/estado-cuarentena`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });

    if (!res.ok) {
      let msg = 'Error al consultar estado de cuarentena.';
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

  async subsanarDocumentoForm(tipoDocumento, file, observaciones = null) {
    const token = authService.getToken();
    const formData = new FormData();
    formData.append('tipo_documento', tipoDocumento);
    formData.append('archivo_pdf', file);
    if (observaciones) formData.append('observaciones', observaciones);

    const url = `${API_BASE_URL}/empresas/subsanar-documento-form`;
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      let msg = 'Error al subsanar documento.';
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
  // 2. SEDES CORPORATIVAS
  // =========================================================================

  async getSedes(idEmpresa = null) {
    const params = new URLSearchParams();
    if (idEmpresa) params.append('id_empresa', idEmpresa);

    const url = `${API_BASE_URL}/empresas/sedes${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });

    if (!res.ok) {
      let msg = 'Error al consultar sedes corporativas.';
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

  async createSede(payload, idEmpresa = null) {
    const params = new URLSearchParams();
    if (idEmpresa) params.append('id_empresa', idEmpresa);

    const url = `${API_BASE_URL}/empresas/sedes${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = 'Error al crear la sede corporativa.';
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

  async getSede(sedeId, idEmpresa = null) {
    const params = new URLSearchParams();
    if (idEmpresa) params.append('id_empresa', idEmpresa);

    const url = `${API_BASE_URL}/empresas/sedes/${sedeId}${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });

    if (!res.ok) {
      let msg = 'Error al consultar la sede.';
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

  async updateSede(sedeId, payload, idEmpresa = null) {
    const params = new URLSearchParams();
    if (idEmpresa) params.append('id_empresa', idEmpresa);

    const url = `${API_BASE_URL}/empresas/sedes/${sedeId}${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = 'Error al actualizar la sede corporativa.';
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
  // 3. ÁREAS FUNCIONALES DE SEDE
  // =========================================================================

  async getAreas(sedeId, idEmpresa = null) {
    const params = new URLSearchParams();
    if (idEmpresa) params.append('id_empresa', idEmpresa);

    const url = `${API_BASE_URL}/empresas/sedes/${sedeId}/areas${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });

    if (!res.ok) {
      let msg = 'Error al consultar áreas de la sede.';
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

  async createArea(sedeId, payload, idEmpresa = null) {
    const params = new URLSearchParams();
    if (idEmpresa) params.append('id_empresa', idEmpresa);

    const url = `${API_BASE_URL}/empresas/sedes/${sedeId}/areas${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = 'Error al crear el área funcional.';
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
  // 4. EQUIPO DE RECLUTADORES DE TALENTO
  // =========================================================================

  async getRecruiters(idEmpresa = null) {
    const params = new URLSearchParams();
    if (idEmpresa) params.append('id_empresa', idEmpresa);

    const url = `${API_BASE_URL}/empresas/reclutadores${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });

    if (!res.ok) {
      let msg = 'Error al consultar equipo de reclutadores.';
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

  async createRecruiter(payload, idEmpresa = null) {
    const params = new URLSearchParams();
    if (idEmpresa) params.append('id_empresa', idEmpresa);

    const url = `${API_BASE_URL}/empresas/reclutadores${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = 'Error al crear el reclutador.';
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

  async assignSedesToRecruiter(recruiterId, sedesIds, idEmpresa = null) {
    const params = new URLSearchParams();
    if (idEmpresa) params.append('id_empresa', idEmpresa);

    const url = `${API_BASE_URL}/empresas/reclutadores/${recruiterId}/asignar-sedes${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ sedes_ids: sedesIds }),
    });

    if (!res.ok) {
      let msg = 'Error al asignar sedes al reclutador.';
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

  async updateRecruiterStatus(recruiterId, estado, idEmpresa = null) {
    const params = new URLSearchParams();
    if (idEmpresa) params.append('id_empresa', idEmpresa);

    const url = `${API_BASE_URL}/empresas/reclutadores/${recruiterId}/estado${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ estado }),
    });

    if (!res.ok) {
      let msg = 'Error al actualizar estado del reclutador.';
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

export const companyService = new CompanyService();

