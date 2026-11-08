import { useCallback, useEffect, useState } from 'react';
import { initialRecruiters } from '../data/companyRecruitersData.js';
import { companyService } from '../services/companyService.js';
import { authService } from '../services/authService.js';

const STORAGE_KEY = 'vincula.company.recruiters.v3';
const LEGACY_KEYS = ['vincula.company.recruiters.v1', 'vincula.company.recruiters.v2'];
const SYNC_EVENT = 'vincula:company-recruiters-updated';

function sanitizeRecruiter(item) {
  const { role: _r, permissions: _p, position: _pos, ...clean } = item;
  return clean;
}

function mapApiRecruiterToLocal(r) {
  return {
    id: r.id,
    fullName: r.nombre_completo,
    email: r.correo_corporativo,
    phone: r.telefono || '(607) 6000000',
    title: r.cargo || 'Especialista de Atracción de Talento',
    avatar: r.url_avatar || null,
    status: r.estado === 'active' ? 'active' : r.estado === 'suspended' ? 'suspended' : 'invited',
    siteIds: (r.sedes_asignadas || []).map((s) => s.id),
    lastAccess: r.ultimo_acceso_en ? r.ultimo_acceso_en.slice(0, 10) : 'Sin accesos registrados',
    vacanciesCount: 0,
    source: 'api',
  };
}

function readRecruiters() {
  if (typeof window === 'undefined') return initialRecruiters;
  try {
    LEGACY_KEYS.forEach((k) => {
      if (window.localStorage.getItem(k)) window.localStorage.removeItem(k);
    });
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(sanitizeRecruiter) : initialRecruiters;
    }
    return initialRecruiters;
  } catch {
    return initialRecruiters;
  }
}

function writeRecruiters(list) {
  try {
    const cleanList = list.map(sanitizeRecruiter);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
  } catch {
    // safe fallback
  }
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: list }));
    });
  }
}

export function useCompanyRecruiters() {
  const [recruiters, setRecruiters] = useState(readRecruiters);
  const [loading, setLoading] = useState(false);

  // Sincronización con backend REST API
  useEffect(() => {
    let isMounted = true;
    async function fetchRecruiters() {
      if (!authService.isAuthenticated()) return;
      try {
        setLoading(true);
        const data = await companyService.getRecruiters();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const mapped = data.map(mapApiRecruiterToLocal);
          setRecruiters(mapped);
          writeRecruiters(mapped);
        }
      } catch {
        // Fallback a localStorage si offline
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchRecruiters();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleSync(event) {
      setRecruiters(event.detail ?? readRecruiters());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const addRecruiter = useCallback((data) => {
    const cleanData = sanitizeRecruiter(data);
    const tempId = `rec-${Date.now().toString().slice(-6)}`;

    // Llamada al backend
    if (authService.isAuthenticated()) {
      const payload = {
        nombre_completo: cleanData.fullName || cleanData.nombre_completo || 'Nuevo Reclutador',
        correo_corporativo: cleanData.email || cleanData.correo_corporativo,
        password: cleanData.password || 'TalentoSeguro2026*!',
        telefono: cleanData.phone || cleanData.telefono || null,
        cargo: cleanData.title || cleanData.cargo || 'Especialista de Atracción de Talento',
        sedes_asignadas_ids: cleanData.siteIds || [],
      };

      companyService.createRecruiter(payload).then((apiRes) => {
        if (apiRes && apiRes.id) {
          setRecruiters((prev) => {
            const updated = prev.map((r) => r.id === tempId ? { ...r, id: apiRes.id, source: 'api' } : r);
            writeRecruiters(updated);
            return updated;
          });
        }
      }).catch((err) => {
        console.warn('Reclutador creado localmente (backend no disponible):', err);
      });
    }

    setRecruiters((prev) => {
      const created = {
        id: tempId,
        status: 'invited',
        lastAccess: 'Sin accesos registrados',
        vacanciesCount: 0,
        avatar: null,
        ...cleanData,
      };
      const next = [created, ...prev];
      writeRecruiters(next);
      return next;
    });
  }, []);

  const updateRecruiter = useCallback((id, changes) => {
    const cleanChanges = sanitizeRecruiter(changes);

    if (authService.isAuthenticated() && id && !id.startsWith('rec-')) {
      if (cleanChanges.status) {
        const estadoApi = cleanChanges.status === 'active' ? 'active' : 'suspended';
        companyService.updateRecruiterStatus(id, estadoApi).catch(() => {});
      }
      if (cleanChanges.siteIds) {
        companyService.assignSedesToRecruiter(id, cleanChanges.siteIds).catch(() => {});
      }
    }

    setRecruiters((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...cleanChanges } : r));
      writeRecruiters(next);
      return next;
    });
  }, []);

  const deleteRecruiter = useCallback((id) => {
    setRecruiters((prev) => {
      const next = prev.filter((r) => r.id !== id);
      writeRecruiters(next);
      return next;
    });
  }, []);

  const syncRecruitersForSite = useCallback((siteId, selectedRecruiterIds) => {
    setRecruiters((prev) => {
      const next = prev.map((r) => {
        const isSelected = selectedRecruiterIds.includes(r.id);
        const currentSites = r.siteIds || [];
        const currentlyHas = currentSites.includes(siteId);

        let newSites = currentSites;
        if (isSelected && !currentlyHas) {
          newSites = [...currentSites, siteId];
        } else if (!isSelected && currentlyHas) {
          newSites = currentSites.filter((id) => id !== siteId);
        }

        if (newSites !== currentSites && authService.isAuthenticated() && !r.id.startsWith('rec-')) {
          companyService.assignSedesToRecruiter(r.id, newSites).catch(() => {});
        }

        return newSites !== currentSites ? { ...r, siteIds: newSites } : r;
      });
      writeRecruiters(next);
      return next;
    });
  }, []);

  const removeSiteFromAllRecruiters = useCallback((siteId) => {
    setRecruiters((prev) => {
      const next = prev.map((r) => {
        const filtered = (r.siteIds || []).filter((id) => id !== siteId);
        if (filtered.length !== (r.siteIds || []).length && authService.isAuthenticated() && !r.id.startsWith('rec-')) {
          companyService.assignSedesToRecruiter(r.id, filtered).catch(() => {});
        }
        return { ...r, siteIds: filtered };
      });
      writeRecruiters(next);
      return next;
    });
  }, []);

  const resetRecruiters = useCallback(() => {
    writeRecruiters(initialRecruiters);
    setRecruiters(initialRecruiters);
  }, []);

  return {
    recruiters,
    loading,
    addRecruiter,
    updateRecruiter,
    deleteRecruiter,
    syncRecruitersForSite,
    removeSiteFromAllRecruiters,
    resetRecruiters,
  };
}
