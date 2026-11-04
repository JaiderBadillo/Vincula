import { useCallback, useEffect, useState } from 'react';
import {
  INITIAL_COMPANIES_REQUESTS,
  INITIAL_INSTITUTIONS_REQUESTS,
  INITIAL_PLATFORM_METRICS,
} from '../data/vinculaAdminData.js';

const STORAGE_KEY_COMPANIES = 'vincula.admin.companies.v1';
const STORAGE_KEY_INSTITUTIONS = 'vincula.admin.institutions.v1';
const SYNC_EVENT = 'vincula:admin-platform-updated';

function readStoredData(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
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

export function useVinculaAdmin() {
  const [companies, setCompanies] = useState(() =>
    readStoredData(STORAGE_KEY_COMPANIES, INITIAL_COMPANIES_REQUESTS)
  );
  const [institutions, setInstitutions] = useState(() =>
    readStoredData(STORAGE_KEY_INSTITUTIONS, INITIAL_INSTITUTIONS_REQUESTS)
  );

  useEffect(() => {
    function handleSync() {
      setCompanies(readStoredData(STORAGE_KEY_COMPANIES, INITIAL_COMPANIES_REQUESTS));
      setInstitutions(readStoredData(STORAGE_KEY_INSTITUTIONS, INITIAL_INSTITUTIONS_REQUESTS));
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
    (companyId, adminNotes = '') => {
      setCompanies((prev) => {
        const next = prev.map((item) => {
          if (item.id !== companyId) return item;
          const nowStr = new Date().toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          return {
            ...item,
            status: 'approved',
            daysWaiting: 0,
            reviewLog: [
              {
                date: nowStr,
                author: 'Super Admin Vincula',
                action: 'Empresa Aprobada y Verificada. Credenciales de acceso generadas.',
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
    (companyId, reason = '', requiredDocs = []) => {
      setCompanies((prev) => {
        const next = prev.map((item) => {
          if (item.id !== companyId) return item;
          const nowStr = new Date().toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          return {
            ...item,
            status: 'in_correction',
            correctionReason: reason,
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
    (companyId, rejectionReason = '') => {
      setCompanies((prev) => {
        const next = prev.map((item) => {
          if (item.id !== companyId) return item;
          const nowStr = new Date().toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          return {
            ...item,
            status: 'rejected',
            rejectionReason,
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
    (iesId, adminNotes = '') => {
      setInstitutions((prev) => {
        const next = prev.map((item) => {
          if (item.id !== iesId) return item;
          const nowStr = new Date().toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          return {
            ...item,
            status: 'approved',
            daysWaiting: 0,
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
    (iesId, reason = '', requiredDocs = []) => {
      setInstitutions((prev) => {
        const next = prev.map((item) => {
          if (item.id !== iesId) return item;
          const nowStr = new Date().toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          return {
            ...item,
            status: 'in_correction',
            correctionReason: reason,
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
    (iesId, rejectionReason = '') => {
      setInstitutions((prev) => {
        const next = prev.map((item) => {
          if (item.id !== iesId) return item;
          const nowStr = new Date().toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          return {
            ...item,
            status: 'rejected',
            rejectionReason,
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
    writeStoredData(STORAGE_KEY_COMPANIES, INITIAL_COMPANIES_REQUESTS);
    writeStoredData(STORAGE_KEY_INSTITUTIONS, INITIAL_INSTITUTIONS_REQUESTS);
    setCompanies(INITIAL_COMPANIES_REQUESTS);
    setInstitutions(INITIAL_INSTITUTIONS_REQUESTS);
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
    approveCompany,
    requestCompanyCorrection,
    rejectCompany,
    approveInstitution,
    requestInstitutionCorrection,
    rejectInstitution,
    resetAll,
  };
}

