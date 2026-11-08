/**
 * Servicio Centralizado de Autenticación, Registro y Conexión con FastAPI (Fase 1 - Paso 3)
 * Conecta los formularios del Frontend con los endpoints /api/v1/auth/*
 */

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const AUTH_TOKEN_KEY = 'vincula.auth.token';
export const AUTH_USER_KEY = 'vincula.auth.user';

/**
 * Extrae y formatea mensajes de error enriquecidos provenientes de la API de FastAPI.
 * Muestra el por qué ocurre el error y la acción sugerida en lugar de un error en seco.
 */
export function extractErrorMessage(errorData, fallback = 'Ha ocurrido un error inesperado.') {
  if (!errorData) return fallback;
  if (typeof errorData === 'string') return errorData;
  const detail = errorData.detail ?? errorData.mensaje ?? errorData.message;
  if (typeof detail === 'string') return detail;
  if (typeof detail === 'object' && detail !== null) {
    if (detail.mensaje && detail.motivo) {
      const sugerencia = detail.accion_sugerida ? ` → ${detail.accion_sugerida}` : '';
      return `${detail.mensaje} (${detail.motivo})${sugerencia}`;
    }
    return detail.mensaje || detail.motivo || detail.codigo || JSON.stringify(detail);
  }
  return fallback;
}

class AuthService {
  /**
   * Obtener token JWT almacenado
   */
  getToken() {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY) || null;
    } catch {
      return null;
    }
  }

  /**
   * Obtener usuario actual almacenado
   */
  getCurrentUser() {
    try {
      const user = localStorage.getItem(AUTH_USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }

  /**
   * Saber si hay una sesión activa
   */
  isAuthenticated() {
    return Boolean(this.getToken());
  }

  /**
   * Cerrar sesión y limpiar almacenamiento local
   */
  logout() {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    } catch {
      // noop
    }
  }

  /**
   * Guardar sesión tras login exitoso
   */
  saveSession(tokenResponse) {
    if (!tokenResponse) return;
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, tokenResponse.access_token);
      localStorage.setItem(
        AUTH_USER_KEY,
        JSON.stringify({
          id: tokenResponse.user_id,
          nombre: tokenResponse.nombre,
          correo: tokenResponse.correo,
          rol: tokenResponse.rol,
          estado_validacion: tokenResponse.estado_validacion,
          id_entidad: tokenResponse.id_entidad,
        })
      );
    } catch (e) {
      console.warn('No se pudo guardar la sesión en localStorage:', e);
    }
  }

  /**
   * Iniciar sesión multi-rol contra FastAPI / Supabase PostgreSQL
   */
  async login(correo, password) {
    const trimmedEmail = correo.trim().toLowerCase();
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        correo: trimmedEmail,
        password: password,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Error al iniciar sesión.';
      try {
        const errorData = await response.json();
        errorMessage = extractErrorMessage(errorData, errorMessage);
      } catch {
        if (response.status === 401) {
          errorMessage = 'Correo electrónico o contraseña incorrectos.';
        }
      }
      const err = new Error(errorMessage);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    this.saveSession(data);
    return data;
  }

  /**
   * Consultar datos del usuario autenticado (/auth/me)
   */
  async getMe() {
    const token = this.getToken();
    if (!token) throw new Error('No hay sesión activa.');

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Sesión expirada o inválida.');
    }

    return await response.json();
  }

  /**
   * Registro de Empresa con subida de PDFs de auditoría a Supabase Storage
   * @param {Object} data Datos corporativos
   * @param {Object} files Archivos { camaraComercio, rut, cedulaRepLegal }
   */
  async registerCompany(data, files = {}) {
    const formData = new FormData();

    // Campos de texto obligatorios
    formData.append('razon_social', data.legalName?.trim() || '');
    formData.append('nombre_comercial', data.commercialName?.trim() || data.legalName?.trim() || '');
    formData.append('nit', data.nit?.trim() || '');
    if (data.ciiuCode) formData.append('codigo_ciiu', data.ciiuCode.trim());
    if (data.ciiuDesc) formData.append('descripcion_ciiu', data.ciiuDesc.trim());
    formData.append('sector_economico', data.sector || 'Tecnología e Información');
    formData.append('tamano_empresa', data.companySize || 'Mediana (51 - 200 empleados)');
    formData.append('departamento', data.dept || 'Santander');
    formData.append('ciudad', data.city || 'Bucaramanga');
    formData.append('direccion', data.address?.trim() || 'No suministrada');
    formData.append('telefono', data.companyPhone?.trim() || 'No suministrado');
    formData.append('correo_contacto', (data.recruiterEmail || data.email)?.trim().toLowerCase() || '');
    formData.append('password', data.password || 'Empresa123*');
    if (data.website) formData.append('sitio_web', data.website.trim());

    // Representante Legal y contacto
    formData.append('nombre_representante_legal', data.legalRepName?.trim() || data.recruiterName?.trim() || 'No indicado');
    formData.append('documento_representante_legal', data.legalRepDoc?.trim() || 'No indicado');
    formData.append('persona_contacto', data.recruiterName?.trim() || 'Contacto de Selección');

    // Archivos PDF para Supabase Storage
    if (files.camaraComercio) {
      formData.append('camara_comercio_pdf', files.camaraComercio);
    }
    if (files.rut) {
      formData.append('rut_pdf', files.rut);
    }
    if (files.cedulaRepLegal) {
      formData.append('cedula_rep_legal_pdf', files.cedulaRepLegal);
    }

    const response = await fetch(`${API_BASE_URL}/auth/registro-empresa-form`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let msg = 'Error en el registro de empresa.';
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
   * Registro de Institución Educativa (IES) con subida de PDFs de validez MEN a Supabase Storage
   * @param {Object} data Datos institucionales
   * @param {Object} files Archivos { resolucionMen, sniesCert, rut }
   */
  async registerInstitution(data, files = {}) {
    const formData = new FormData();

    formData.append('nombre_institucion', data.legalName?.trim() || '');
    if (data.acronym) formData.append('sigla', data.acronym.trim());
    formData.append('codigo_snies', data.sniesCode?.trim() || '');
    formData.append('caracter_academico', data.academicCharacter || 'Institución Universitaria');
    formData.append('origen_institucional', data.institutionOrigin || 'Oficial / Pública');
    formData.append('nit', data.nit?.trim() || '');
    formData.append('departamento', data.dept || 'Santander');
    formData.append('ciudad', data.city || 'Bucaramanga');
    formData.append('direccion', data.address?.trim() || '');
    if (data.website) formData.append('sitio_web', data.website.trim());
    formData.append('correo_institucional', data.advisorEmail?.trim().toLowerCase() || '');
    formData.append('password', data.password || 'IesAdmin123*');
    formData.append('telefono', data.phone?.trim() || 'No suministrado');
    formData.append('nombre_rector', data.rectorName?.trim() || '');
    formData.append('documento_rector', data.rectorDoc?.trim() || 'No suministrado');
    formData.append('nombre_contacto_asesor', data.advisorName?.trim() || '');
    formData.append('cargo_asesor', data.advisorRole?.trim() || 'Coordinador de Empleabilidad');

    // Documentos PDF
    if (files.resolucionMen) {
      formData.append('resolucion_men_pdf', files.resolucionMen);
    }
    if (files.sniesCert) {
      formData.append('snies_cert_pdf', files.sniesCert);
    }
    if (files.rut) {
      formData.append('rut_pdf', files.rut);
    }

    const response = await fetch(`${API_BASE_URL}/auth/registro-institucion-form`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let msg = 'Error en el registro de institución educativa.';
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
   * Registro y pre-registro de Egresado Universitario
   * @param {Object} data Datos del egresado
   */
  async registerGraduate(data) {
    const payload = {
      tipo_documento: data.docType || 'CC',
      numero_documento: data.docNumber?.trim() || '',
      nombre_completo: data.fullName?.trim() || '',
      correo: data.email?.trim().toLowerCase() || '',
      password: data.password || 'Egresado123*',
      telefono: data.phone?.trim() || null,
      departamento: data.dept || 'Santander',
      ciudad: data.city || 'Bucaramanga',
      id_institucion: data.institutionId || null,
      carrera: data.career?.trim() || 'Profesional Universitario',
      nivel_educativo: data.educationLevel || 'Profesional Universitario',
      ano_graduacion: String(data.graduationYear || '2025'),
      autoriza_datos: data.habeasData ?? true,
    };

    const response = await fetch(`${API_BASE_URL}/auth/registro-egresado`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let msg = 'Error al registrar egresado.';
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

export const authService = new AuthService();
export default authService;

