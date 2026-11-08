/**
 * Servicio de Super Admin Vincula (Fase 2 - Paso 3)
 * Conecta el Frontend con los endpoints oficiales de Auditoría 72H,
 * previsualización segura de PDFs con URLs firmadas y decisiones administrativas.
 */

import { authService, extractErrorMessage } from './authService.js';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class AdminService {
  /**
   * Genera los encabezados con Bearer token del Super Admin
   */
  getAuthHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Consulta la cola paginada de auditoría de empresas con horas restantes del SLA 72h
   */
  async getCompaniesAudit({ estado = null, page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (estado && estado !== 'all') params.append('estado', estado);
    params.append('page', String(page));
    params.append('limit', String(limit));

    const response = await fetch(`${API_BASE_URL}/admin/auditoria/empresas?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let msg = 'Error al consultar auditoría de empresas.';
      try {
        const errJson = await response.json();
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = response.status;
      throw err;
    }

    return await response.json();
  }

  /**
   * Consulta la lista paginada de IES en verificación SNIES y personería MEN
   */
  async getInstitutionsAudit({ estado = null, page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (estado && estado !== 'all') params.append('estado', estado);
    params.append('page', String(page));
    params.append('limit', String(limit));

    const response = await fetch(`${API_BASE_URL}/admin/auditoria/ies?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let msg = 'Error al consultar auditoría de IES.';
      try {
        const errJson = await response.json();
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = response.status;
      throw err;
    }

    return await response.json();
  }

  /**
   * Genera una URL firmada de descarga temporal desde Supabase Storage para previsualizar PDFs
   * @param {string} documentoId UUID del documento en documentos_empresa o documentos_institucion
   * @param {number} expiresIn Vigencia en segundos (por defecto 3600s = 1h)
   */
  async getDocumentSecureUrl(documentoId, expiresIn = 3600) {
    const response = await fetch(
      `${API_BASE_URL}/admin/auditoria/documento/${documentoId}/secure-url?expires_in=${expiresIn}`,
      { headers: this.getAuthHeaders() }
    );

    if (!response.ok) {
      let msg = 'Error al generar enlace seguro para el documento.';
      try {
        const errJson = await response.json();
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = response.status;
      throw err;
    }

    return await response.json();
  }

  /**
   * Aprueba formalmente una empresa y levanta el Modo Cuarentena
   */
  async approveCompany(companyId, notas = '') {
    const response = await fetch(`${API_BASE_URL}/admin/empresas/${companyId}/aprobar`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ notas: notas || undefined }),
    });

    if (!response.ok) {
      let msg = 'Error al aprobar la empresa.';
      try {
        const errJson = await response.json();
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = response.status;
      throw err;
    }

    return await response.json();
  }

  /**
   * Solicita subsanación de documentos defectuosos o vencidos a la empresa
   */
  async requestCompanyCorrection(companyId, motivo, documentosRequeridos = []) {
    const response = await fetch(`${API_BASE_URL}/admin/empresas/${companyId}/solicitar-subsanacion`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        motivo,
        documentos_requeridos: documentosRequeridos,
      }),
    });

    if (!response.ok) {
      let msg = 'Error al solicitar subsanación a la empresa.';
      try {
        const errJson = await response.json();
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = response.status;
      throw err;
    }

    return await response.json();
  }

  /**
   * Rechaza formalmente la solicitud de vinculación de una empresa
   */
  async rejectCompany(companyId, motivoRechazo) {
    const response = await fetch(`${API_BASE_URL}/admin/empresas/${companyId}/rechazar`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        motivo_rechazo: motivoRechazo,
      }),
    });

    if (!response.ok) {
      let msg = 'Error al rechazar la empresa.';
      try {
        const errJson = await response.json();
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = response.status;
      throw err;
    }

    return await response.json();
  }

  /**
   * Aprueba oficialmente una IES tras validar personería MEN y código SNIES
   */
  async approveInstitution(iesId, notas = '') {
    const response = await fetch(`${API_BASE_URL}/admin/ies/${iesId}/aprobar`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ notas: notas || undefined }),
    });

    if (!response.ok) {
      let msg = 'Error al aprobar la institución educativa.';
      try {
        const errJson = await response.json();
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = response.status;
      throw err;
    }

    return await response.json();
  }

  /**
   * Solicita subsanación de documentos a una IES
   */
  async requestInstitutionCorrection(iesId, motivo, documentosRequeridos = []) {
    const response = await fetch(`${API_BASE_URL}/admin/ies/${iesId}/solicitar-subsanacion`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        motivo,
        documentos_requeridos: documentosRequeridos,
      }),
    });

    if (!response.ok) {
      let msg = 'Error al requerir subsanación a la IES.';
      try {
        const errJson = await response.json();
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = response.status;
      throw err;
    }

    return await response.json();
  }

  /**
   * Rechaza formalmente la solicitud de vinculación de una IES
   */
  async rejectInstitution(iesId, motivoRechazo) {
    const response = await fetch(`${API_BASE_URL}/admin/ies/${iesId}/rechazar`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        motivo_rechazo: motivoRechazo,
      }),
    });

    if (!response.ok) {
      let msg = 'Error al rechazar la institución educativa.';
      try {
        const errJson = await response.json();
        msg = extractErrorMessage(errJson, msg);
      } catch {
        // noop
      }
      const err = new Error(msg);
      err.status = response.status;
      throw err;
    }

    return await response.json();
  }
}

export const adminService = new AdminService();
export default adminService;

