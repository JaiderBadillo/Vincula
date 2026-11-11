/**
 * Servicio de Gestión Institucional IES (Fase 3 - Pasos 1, 2 y 3)
 * Conecta el Frontend con los endpoints oficiales bajo /api/v1/instituciones:
 * - Sedes Institucionales (Campus)
 * - Facultades y Divisiones Académicas
 * - Programas Académicos con Código SNIES Oficial
 * - Asesores de Enlace y Asignación a Programas
 * - Cola de Validación de Diplomas, Visor Seguro Supabase Storage y Sello Digital SHA-256
 */

import { authService, extractErrorMessage } from './authService.js';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class InstitutionService {
  /**
   * Genera los encabezados con Bearer token institucional
   */
  getAuthHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // =========================================================================
  // 1. SEDES INSTITUCIONALES (CAMPUS)
  // =========================================================================

  async getSedes(idInstitucion = null) {
    const params = new URLSearchParams();
    if (idInstitucion) params.append('id_institucion', idInstitucion);

    const url = `${API_BASE_URL}/instituciones/sedes${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });

    if (!res.ok) {
      let msg = 'Error al consultar sedes institucionales.';
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

  async createSede(payload, idInstitucion = null) {
    const params = new URLSearchParams();
    if (idInstitucion) params.append('id_institucion', idInstitucion);

    const url = `${API_BASE_URL}/instituciones/sedes${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = 'Error al registrar sede institucional.';
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
  // 2. FACULTADES
  // =========================================================================

  async getFacultades(idInstitucion = null) {
    const params = new URLSearchParams();
    if (idInstitucion) params.append('id_institucion', idInstitucion);

    const url = `${API_BASE_URL}/instituciones/facultades${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });

    if (!res.ok) {
      let msg = 'Error al consultar facultades.';
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

  async createFacultad(payload, idInstitucion = null) {
    const params = new URLSearchParams();
    if (idInstitucion) params.append('id_institucion', idInstitucion);

    const url = `${API_BASE_URL}/instituciones/facultades${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = 'Error al crear facultad.';
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
  // 3. PROGRAMAS ACADÉMICOS CON CÓDIGO SNIES
  // =========================================================================

  async getProgramas({
    idInstitucion = null,
    facultadId = null,
    sedeId = null,
    nivel = null,
    search = null,
    page = 1,
    limit = 20,
  } = {}) {
    const params = new URLSearchParams();
    if (idInstitucion) params.append('id_institucion', idInstitucion);
    if (facultadId && facultadId !== 'all') params.append('id_facultad', facultadId);
    if (sedeId && sedeId !== 'all') params.append('id_sede', sedeId);
    if (nivel && nivel !== 'all') params.append('nivel_formacion', nivel);
    if (search && search.trim()) params.append('busqueda', search.trim());
    params.append('page', String(page));
    params.append('limit', String(limit));

    const res = await fetch(`${API_BASE_URL}/instituciones/programas?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });

    if (!res.ok) {
      let msg = 'Error al consultar programas académicos.';
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

  async createPrograma(payload, idInstitucion = null) {
    const params = new URLSearchParams();
    if (idInstitucion) params.append('id_institucion', idInstitucion);

    const url = `${API_BASE_URL}/instituciones/programas${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = 'Error al crear programa académico.';
      let details = null;
      try {
        const errJson = await res.json();
        details = errJson.detail || errJson;
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = res.status;
      err.details = details;
      throw err;
    }
    return await res.json();
  }

  async updatePrograma(programId, payload, idInstitucion = null) {
    const params = new URLSearchParams();
    if (idInstitucion) params.append('id_institucion', idInstitucion);

    const url = `${API_BASE_URL}/instituciones/programas/${programId}${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = 'Error al actualizar programa.';
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

  async updateProgramaStatus(programId, estado, idInstitucion = null) {
    const params = new URLSearchParams();
    if (idInstitucion) params.append('id_institucion', idInstitucion);

    const url = `${API_BASE_URL}/instituciones/programas/${programId}/estado${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ estado }),
    });

    if (!res.ok) {
      let msg = 'Error al actualizar estado del programa.';
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
  // 4. ASESORES DE EMPLEABILIDAD
  // =========================================================================

  async getAsesores(idInstitucion = null) {
    const params = new URLSearchParams();
    if (idInstitucion) params.append('id_institucion', idInstitucion);

    const url = `${API_BASE_URL}/instituciones/asesores${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });

    if (!res.ok) {
      let msg = 'Error al consultar asesores institucionales.';
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

  async createAsesor(payload, idInstitucion = null) {
    const params = new URLSearchParams();
    if (idInstitucion) params.append('id_institucion', idInstitucion);

    const url = `${API_BASE_URL}/instituciones/asesores${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = 'Error al registrar asesor institucional.';
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

  async updateAsesor(asesorId, payload, idInstitucion = null) {
    const params = new URLSearchParams();
    if (idInstitucion) params.append('id_institucion', idInstitucion);

    const url = `${API_BASE_URL}/instituciones/asesores/${asesorId}${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = 'Error al actualizar asesor institucional.';
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

  async assignAsesorToProgram(programId, idAsesor, idInstitucion = null) {
    const params = new URLSearchParams();
    if (idInstitucion) params.append('id_institucion', idInstitucion);

    const url = `${API_BASE_URL}/instituciones/programas/${programId}/asignar-asesor${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ id_asesor: idAsesor }),
    });

    if (!res.ok) {
      let msg = 'Error al asignar asesor al programa.';
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
  // 5. BANDEJA DE VALIDACIÓN DE DIPLOMAS Y SELLO DIGITAL (Fase 3 Paso 2/3)
  // =========================================================================

  /**
   * Consulta la cola paginada de validación de diplomas con conteo de estados
   */
  async getPendingGraduates({
    idInstitucion = null,
    idPrograma = null,
    estado = 'todos',
    busqueda = null,
    page = 1,
    limit = 20,
  } = {}) {
    const params = new URLSearchParams();
    if (idInstitucion) params.append('id_institucion', idInstitucion);
    if (idPrograma && idPrograma !== 'all') params.append('id_programa', idPrograma);
    if (estado && estado !== 'all') params.append('estado', estado);
    if (busqueda && busqueda.trim()) params.append('busqueda', busqueda.trim());
    params.append('page', String(page));
    params.append('limit', String(limit));

    const res = await fetch(`${API_BASE_URL}/instituciones/egresados/pendientes?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });

    if (!res.ok) {
      let msg = 'Error al consultar bandeja de validación de egresados.';
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

  /**
   * Obtiene la URL firmada temporal de descarga protegida para el PDF del diploma (Supabase Storage)
   */
  async getDiplomaSecureUrl(identifier, expiresIn = 3600, idInstitucion = null) {
    const params = new URLSearchParams();
    params.append('expires_in', String(expiresIn));
    if (idInstitucion) params.append('id_institucion', idInstitucion);

    const url = `${API_BASE_URL}/instituciones/egresados/${identifier}/diploma-secure-url?${params.toString()}`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });

    if (!res.ok) {
      let msg = 'Error al generar enlace seguro del diploma.';
      let details = null;
      try {
        const errJson = await res.json();
        details = errJson.detail || errJson;
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = res.status;
      err.details = details;
      throw err;
    }
    return await res.json();
  }

  /**
   * Valida oficialmente el diploma otorgando el Sello Digital Institucional SHA-256
   */
  async validateGraduateDiploma(
    identifier,
    { numero_acta_grado, numero_libro_folio = null, fecha_grado = null, observaciones = null },
    idInstitucion = null
  ) {
    const params = new URLSearchParams();
    if (idInstitucion) params.append('id_institucion', idInstitucion);

    const url = `${API_BASE_URL}/instituciones/egresados/${identifier}/validar-diploma${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        numero_acta_grado,
        numero_libro_folio,
        fecha_grado,
        observaciones,
      }),
    });

    if (!res.ok) {
      let msg = 'Error al validar diploma institucional.';
      let details = null;
      try {
        const errJson = await res.json();
        details = errJson.detail || errJson;
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = res.status;
      err.details = details;
      throw err;
    }
    return await res.json();
  }

  /**
   * Rechaza u observa formalmente el diploma con justificación documentada
   */
  async rejectGraduateDiploma(identifier, { motivo_rechazo, observaciones = null }, idInstitucion = null) {
    const params = new URLSearchParams();
    if (idInstitucion) params.append('id_institucion', idInstitucion);

    const url = `${API_BASE_URL}/instituciones/egresados/${identifier}/rechazar-diploma${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        motivo_rechazo,
        observaciones,
      }),
    });

    if (!res.ok) {
      let msg = 'Error al observar/rechazar diploma.';
      let details = null;
      try {
        const errJson = await res.json();
        details = errJson.detail || errJson;
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = res.status;
      err.details = details;
      throw err;
    }
    return await res.json();
  }
}

export const institutionService = new InstitutionService();

