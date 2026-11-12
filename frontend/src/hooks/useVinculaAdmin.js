import { useCallback, useEffect, useState } from 'react';
import { INITIAL_PLATFORM_METRICS } from '../data/vinculaAdminData.js';
import { adminService } from '../services/adminService.js';

const STORAGE_KEY_COMPANIES = 'vincula.admin.companies.v2';
const STORAGE_KEY_INSTITUTIONS = 'vincula.admin.institutions.v2';
const SYNC_EVENT = 'vincula:admin-platform-updated';

function readStoredData(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    window.localStorage.removeItem('vincula.admin.companies.v1');
    window.localStorage.removeItem('vincula.admin.institutions.v1');
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredData(key, data) {
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // safe fallback
  }
}

/**
 * Normaliza una empresa proveniente de PostgreSQL / FastAPI a la estructura del Frontend
 */
function mapBackendCompanyToUi(item) {
  const statusMap = {
    pendiente: 'pending',
    en_subsanacion: 'in_correction',
    aprobado: 'approved',
    rechazado: 'rejected',
  };

  const domain = item.correo_contacto ? item.correo_contacto.split('@')[1] || '' : '';
  const isCorporate =
    Boolean(domain) &&
    !domain.includes('gmail') &&
    !domain.includes('hotmail') &&
    !domain.includes('yahoo') &&
    !domain.includes('outlook');

  return {
    id: item.id,
    radicado: item.radicado || `RAD-EMP-2026-${String(item.id).slice(0, 8).toUpperCase()}`,
    businessName: item.razon_social,
    tradeName: item.nombre_comercial || '',
    nit: item.nit,
    ciiuCode: item.codigo_ciiu || '6201',
    ciiuDescription: item.descripcion_ciiu || 'Actividades de tecnología y servicios empresariales',
    sector: item.sector_economico || 'Construcción / Servicios',
    companySize: item.tamano_empresa || 'Mediana',
    city: `${item.ciudad || 'Bucaramanga'}, ${item.departamento || 'Santander'}`,
    address: item.direccion || 'Dirección corporativa registrada',
    phone: item.telefono || '',
    email: item.correo_contacto,
    website: item.sitio_web || '',
    legalRepName: item.nombre_representante_legal || 'Representante Legal',
    legalRepId: item.documento_representante_legal || 'C.C. Registrada',
    contactPerson: item.persona_contacto || item.nombre_representante_legal || 'Contacto Oficial',
    registeredAt: item.registrado_en || new Date().toISOString(),
    approvedAt: item.aprobado_en,
    status: statusMap[item.estado] || item.estado || 'pending',
    slaHoursRemaining: typeof item.sla_horas_restantes === 'number' ? item.sla_horas_restantes : 72,
    slaText: item.sla_texto || '72 horas restantes',
    daysWaiting: Math.max(0, Math.floor((72 - (item.sla_horas_restantes ?? 72)) / 24)),
    correctionReason: item.motivo_subsanacion || null,
    domainValidation: {
      domain,
      isCorporate,
      mxVerified: isCorporate,
    },
    documents: (item.documentos || []).map((d) => ({
      id: d.id,
      type: d.tipo_documento,
      label:
        d.tipo_documento === 'camara_comercio'
          ? 'Certificado Cámara de Comercio'
          : d.tipo_documento === 'rut'
          ? 'Registro Único Tributario (RUT)'
          : d.tipo_documento === 'cedula_rep_legal'
          ? 'Cédula de Ciudadanía Representante Legal'
          : d.tipo_documento === 'carta_autorizacion'
          ? 'Carta de Autorización / Delegación de Talento'
          : d.tipo_documento,
      issuer:
        d.tipo_documento === 'rut'
          ? 'DIAN Colombia'
          : d.tipo_documento === 'camara_comercio'
          ? 'Cámara de Comercio'
          : 'Entidad Oficial',
      fileName: d.nombre_archivo || 'Sin nombre de archivo',
      fileSize: d.tamano_kb ? `${d.tamano_kb} KB` : 'Tamaño no disponible',
      urlArchivo: d.url_archivo,
      status: d.estado || 'adjunto',
      uploadedAt: d.subido_en,
      verified: d.estado === 'aprobado',
    })),
    reviewLog: [
      {
        date: item.registrado_en ? new Date(item.registrado_en).toLocaleString('es-CO') : 'Reciente',
        author: 'Sistema Vincula',
        action: `Expediente radicado: ${item.radicado || item.nit}`,
        notes: item.motivo_subsanacion || undefined,
      },
    ],
  };
}

/**
 * Normaliza una Institución (IES) proveniente de PostgreSQL / FastAPI
 */
function mapBackendInstitutionToUi(item) {
  const statusMap = {
    pendiente: 'pending',
    en_subsanacion: 'in_correction',
    aprobado: 'approved',
    rechazado: 'rejected',
  };

  return {
    id: item.id,
    radicado: item.radicado || `RAD-IES-2026-${String(item.id).slice(0, 8).toUpperCase()}`,
    name: item.nombre_oficial,
    shortName: item.nombre_corto || item.nombre_oficial,
    sniesCode: item.codigo_snies,
    academicCharacter: item.caracter_academico || 'Universidad',
    nit: item.nit,
    city: `${item.ciudad || 'Bucaramanga'}, ${item.departamento || 'Santander'}`,
    address: item.direccion || '',
    phone: item.telefono || '',
    email: item.correo_institucional,
    website: item.sitio_web || '',
    rectorName: item.nombre_rector || 'Rector(a) Institucional',
    rectorDoc: item.documento_rector || '',
    contactPerson: item.persona_contacto || 'Coordinador de Empleabilidad',
    registeredAt: item.registrado_en || new Date().toISOString(),
    approvedAt: item.aprobado_en,
    status: statusMap[item.estado] || item.estado || 'pending',
    slaHoursRemaining: typeof item.sla_horas_restantes === 'number' ? item.sla_horas_restantes : 72,
    slaText: item.sla_texto || '72 horas restantes',
    daysWaiting: Math.max(0, Math.floor((72 - (item.sla_horas_restantes ?? 72)) / 24)),
    correctionReason: item.motivo_subsanacion || null,
    documents: (item.documentos || []).map((d) => ({
      id: d.id,
      type: d.tipo_documento,
      label:
        d.tipo_documento === 'resolucion_men'
          ? 'Resolución Reconocimiento MEN'
          : d.tipo_documento === 'rut_institucional' || d.tipo_documento === 'rut'
          ? 'RUT Institucional de la Universidad'
          : d.tipo_documento === 'cedula_rector' || d.tipo_documento === 'acto_posesion'
          ? 'Acto de Nombramiento / Cédula Rector'
          : d.tipo_documento,
      issuer: 'Ministerio de Educación Nacional',
      fileName: d.nombre_archivo || 'Sin nombre de archivo',
      fileSize: d.tamano_kb ? `${d.tamano_kb} KB` : 'Tamaño no disponible',
      urlArchivo: d.url_archivo,
      status: d.estado || 'adjunto',
      uploadedAt: d.subido_en,
      verified: d.estado === 'aprobado',
    })),
    reviewLog: [
      {
        date: item.registrado_en ? new Date(item.registrado_en).toLocaleString('es-CO') : 'Reciente',
        author: 'Sistema Vincula',
        action: `Expediente IES radicado: ${item.radicado || item.codigo_snies}`,
        notes: item.motivo_subsanacion || undefined,
      },
    ],
  };
}

export function useVinculaAdmin() {
  const [companies, setCompanies] = useState(() =>
    []
  );
  const [institutions, setInstitutions] = useState(() =>
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  /**
   * Carga de datos reales desde el Backend FastAPI
   */
  const loadBackendData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      // 1. Obtener empresas desde /api/v1/admin/auditoria/empresas
      const compRes = await adminService.getCompaniesAudit({ limit: 50 });
      const rawCompList = compRes.items || compRes;
      if (Array.isArray(rawCompList)) {
        const mappedComp = rawCompList.map(mapBackendCompanyToUi);
        setCompanies(mappedComp);
        writeStoredData(STORAGE_KEY_COMPANIES, mappedComp);
      }

      // 2. Obtener IES desde /api/v1/admin/auditoria/ies
      const iesRes = await adminService.getInstitutionsAudit({ limit: 50 });
      const rawIesList = iesRes.items || iesRes;
      if (Array.isArray(rawIesList)) {
        const mappedIes = rawIesList.map(mapBackendInstitutionToUi);
        setInstitutions(mappedIes);
        writeStoredData(STORAGE_KEY_INSTITUTIONS, mappedIes);
      }
    } catch (err) {
      setCompanies([]);
      setInstitutions([]);
      writeStoredData(STORAGE_KEY_COMPANIES, []);
      writeStoredData(STORAGE_KEY_INSTITUTIONS, []);
      // Si no hay sesión de admin o falla la red, conserva el fallback
      setApiError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackendData();
  }, [loadBackendData]);

  useEffect(() => {
    function handleSync() {
      setCompanies(readStoredData(STORAGE_KEY_COMPANIES, []));
      setInstitutions(readStoredData(STORAGE_KEY_INSTITUTIONS, []));
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const dispatchUpdate = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT));
    }
  }, []);

  // ─── Acciones sobre Empresas ───

  const approveCompany = useCallback(
    async (companyId, adminNotes = '') => {
      await adminService.approveCompany(companyId, adminNotes);

      setCompanies((prev) => {
        const next = prev.map((item) => {
          if (item.id !== companyId) return item;
          const nowStr = new Date().toLocaleString('es-CO');
          return {
            ...item,
            status: 'approved',
            daysWaiting: 0,
            slaHoursRemaining: 0,
            slaText: 'Aprobado (SLA Cumplido)',
            reviewLog: [
              {
                date: nowStr,
                author: 'Super Admin Vincula',
                action: 'Empresa Aprobada y Verificada. Cuarentena levantada.',
                notes: adminNotes || undefined,
              },
              ...item.reviewLog,
            ],
          };
        });
        writeStoredData(STORAGE_KEY_COMPANIES, next);
        return next;
      });
      dispatchUpdate();
    },
    [dispatchUpdate]
  );

  const requestCompanyCorrection = useCallback(
    async (companyId, reason = '', requiredDocs = []) => {
      await adminService.requestCompanyCorrection(companyId, reason, requiredDocs);

      setCompanies((prev) => {
        const next = prev.map((item) => {
          if (item.id !== companyId) return item;
          const nowStr = new Date().toLocaleString('es-CO');
          return {
            ...item,
            status: 'in_correction',
            correctionReason: reason,
            slaHoursRemaining: 0,
            slaText: 'Pausado (Esperando corrección del solicitante)',
            requiredDocs: requiredDocs.length > 0 ? requiredDocs : undefined,
            reviewLog: [
              {
                date: nowStr,
                author: 'Super Admin Vincula',
                action: `Subsanación solicitada: ${reason}`,
              },
              ...item.reviewLog,
            ],
          };
        });
        writeStoredData(STORAGE_KEY_COMPANIES, next);
        return next;
      });
      dispatchUpdate();
    },
    [dispatchUpdate]
  );

  const rejectCompany = useCallback(
    async (companyId, rejectionReason = '') => {
      await adminService.rejectCompany(companyId, rejectionReason);

      setCompanies((prev) => {
        const next = prev.map((item) => {
          if (item.id !== companyId) return item;
          const nowStr = new Date().toLocaleString('es-CO');
          return {
            ...item,
            status: 'rejected',
            rejectionReason,
            slaHoursRemaining: 0,
            slaText: 'Rechazado Definitivo',
            reviewLog: [
              {
                date: nowStr,
                author: 'Super Admin Vincula',
                action: `Solicitud rechazada: ${rejectionReason}`,
              },
              ...item.reviewLog,
            ],
          };
        });
        writeStoredData(STORAGE_KEY_COMPANIES, next);
        return next;
      });
      dispatchUpdate();
    },
    [dispatchUpdate]
  );

  // ─── Acciones sobre IES ───

  const approveInstitution = useCallback(
    async (iesId, adminNotes = '') => {
      await adminService.approveInstitution(iesId, adminNotes);

      setInstitutions((prev) => {
        const next = prev.map((item) => {
          if (item.id !== iesId) return item;
          const nowStr = new Date().toLocaleString('es-CO');
          return {
            ...item,
            status: 'approved',
            daysWaiting: 0,
            slaHoursRemaining: 0,
            slaText: 'Aprobado (SLA Cumplido)',
            reviewLog: [
              {
                date: nowStr,
                author: 'Super Admin Vincula',
                action: 'IES Aprobada e Incorporada a la Red. Convenio marco formalizado.',
                notes: adminNotes || undefined,
              },
              ...item.reviewLog,
            ],
          };
        });
        writeStoredData(STORAGE_KEY_INSTITUTIONS, next);
        return next;
      });
      dispatchUpdate();
    },
    [dispatchUpdate]
  );

  const requestInstitutionCorrection = useCallback(
    async (iesId, reason = '', requiredDocs = []) => {
      await adminService.requestInstitutionCorrection(iesId, reason, requiredDocs);

      setInstitutions((prev) => {
        const next = prev.map((item) => {
          if (item.id !== iesId) return item;
          const nowStr = new Date().toLocaleString('es-CO');
          return {
            ...item,
            status: 'in_correction',
            correctionReason: reason,
            slaHoursRemaining: 0,
            slaText: 'Pausado (Esperando corrección del solicitante)',
            requiredDocs: requiredDocs.length > 0 ? requiredDocs : undefined,
            reviewLog: [
              {
                date: nowStr,
                author: 'Super Admin Vincula',
                action: `Subsanación institucional solicitada: ${reason}`,
              },
              ...item.reviewLog,
            ],
          };
        });
        writeStoredData(STORAGE_KEY_INSTITUTIONS, next);
        return next;
      });
      dispatchUpdate();
    },
    [dispatchUpdate]
  );

  const rejectInstitution = useCallback(
    async (iesId, rejectionReason = '') => {
      await adminService.rejectInstitution(iesId, rejectionReason);

      setInstitutions((prev) => {
        const next = prev.map((item) => {
          if (item.id !== iesId) return item;
          const nowStr = new Date().toLocaleString('es-CO');
          return {
            ...item,
            status: 'rejected',
            rejectionReason,
            slaHoursRemaining: 0,
            slaText: 'Rechazado Definitivo',
            reviewLog: [
              {
                date: nowStr,
                author: 'Super Admin Vincula',
                action: `Solicitud de IES rechazada: ${rejectionReason}`,
              },
              ...item.reviewLog,
            ],
          };
        });
        writeStoredData(STORAGE_KEY_INSTITUTIONS, next);
        return next;
      });
      dispatchUpdate();
    },
    [dispatchUpdate]
  );

  const resetAll = useCallback(() => {
    writeStoredData(STORAGE_KEY_COMPANIES, []);
    writeStoredData(STORAGE_KEY_INSTITUTIONS, []);
    setCompanies([]);
    setInstitutions([]);
    dispatchUpdate();
  }, [dispatchUpdate]);

  // Métricas calculadas en vivo
  const metrics = {
    ...INITIAL_PLATFORM_METRICS,
    pendingCompanies: companies.filter((c) => c.status === 'pending').length,
    correctionCompanies: companies.filter((c) => c.status === 'in_correction').length,
    approvedCompanies: companies.filter((c) => c.status === 'approved').length,
    totalCompaniesCount: companies.length,

    pendingInstitutions: institutions.filter((i) => i.status === 'pending').length,
    correctionInstitutions: institutions.filter((i) => i.status === 'in_correction').length,
    approvedInstitutions: institutions.filter((i) => i.status === 'approved').length,
    totalInstitutionsCount: institutions.length,

    totalPendingOverall:
      companies.filter((c) => c.status === 'pending').length +
      institutions.filter((i) => i.status === 'pending').length,
  };

  return {
    companies,
    institutions,
    metrics,
    isLoading,
    apiError,
    refreshData: loadBackendData,
    approveCompany,
    requestCompanyCorrection,
    rejectCompany,
    approveInstitution,
    requestInstitutionCorrection,
    rejectInstitution,
    resetAll,
  };
}
export default useVinculaAdmin;
