import { useCallback, useEffect, useState } from 'react';
import { companyService } from '../services/companyService.js';
import { authService } from '../services/authService.js';

const SYNC_EVENT = 'vincula:company-recruiters-updated';

function sanitizeRecruiter(item) {
  const { password: _password, passwordConfirmation: _confirmation, role: _r, permissions: _p, position: _pos, ...clean } = item;
  return clean;
}

function mapApiRecruiterToLocal(r) {
  return {
    id: r.id,
    userId: r.id_usuario,
    fullName: r.nombre_completo,
    email: r.correo_corporativo,
    phone: r.telefono || '',
    title: r.cargo || 'Reclutador',
    avatar: r.url_avatar || null,
    status: r.estado === 'active' ? 'active' : 'suspended',
    siteIds: (r.sedes_asignadas || []).map((s) => s.id),
    lastAccess: r.ultimo_acceso_en ? r.ultimo_acceso_en.slice(0, 10) : 'Sin accesos registrados',
    vacanciesCount: 0,
    source: 'api',
  };
}

function writeRecruiters(list) {
  if (typeof window !== 'undefined') {
    queueMicrotask(() => window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: list })));
  }
}

export function useCompanyRecruiters() {
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sincronización con backend REST API
  useEffect(() => {
    let isMounted = true;
    try {
      ['vincula.company.recruiters.v1', 'vincula.company.recruiters.v2', 'vincula.company.recruiters.v3']
        .forEach((key) => window.localStorage.removeItem(key));
    } catch { /* Navegador sin almacenamiento local. */ }
    async function fetchRecruiters() {
      if (!authService.isAuthenticated()) { setLoading(false); return; }
      try {
        setLoading(true);
        const data = await companyService.getRecruiters();
        if (isMounted && Array.isArray(data)) {
          const mapped = data.map(mapApiRecruiterToLocal);
          setRecruiters(mapped);
          writeRecruiters(mapped);
          setError('');
        }
      } catch (failure) {
        if (isMounted) setError(failure.message || 'No se pudo consultar el equipo.');
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
      setRecruiters(event.detail ?? []);
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const addRecruiter = useCallback(async (data) => {
    if (!authService.isAuthenticated()) throw new Error('Inicia sesión para crear reclutadores.');
    if (!data.password) throw new Error('Escribe una contraseña para el reclutador.');
    const result = await companyService.createRecruiter({
      nombre_completo: data.fullName,
      correo_corporativo: data.email,
      password: data.password,
      telefono: data.phone || null,
      sedes_asignadas_ids: data.siteIds || [],
    });
    setRecruiters((previous) => {
      const next = [...previous, mapApiRecruiterToLocal(result)];
      writeRecruiters(next);
      return next;
    });
    return result;
  }, []);

  const updateRecruiter = useCallback(async (id, changes) => {
    const cleanChanges = sanitizeRecruiter(changes);
    if (!authService.isAuthenticated()) throw new Error('Inicia sesión para editar reclutadores.');
    if (cleanChanges.status) {
      await companyService.updateRecruiterStatus(id, cleanChanges.status);
    }
    if (cleanChanges.fullName !== undefined || cleanChanges.phone !== undefined || changes.password) {
      await companyService.updateRecruiter(id, {
        ...(cleanChanges.fullName !== undefined ? { nombre_completo: cleanChanges.fullName } : {}),
        ...(cleanChanges.phone !== undefined ? { telefono: cleanChanges.phone } : {}),
        ...(changes.password ? { password: changes.password } : {}),
      });
    }
    if (cleanChanges.siteIds) await companyService.assignSedesToRecruiter(id, cleanChanges.siteIds);
    setRecruiters((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...cleanChanges } : r));
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

        if (newSites !== currentSites && authService.isAuthenticated()) {
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
        if (filtered.length !== (r.siteIds || []).length && authService.isAuthenticated()) {
          companyService.assignSedesToRecruiter(r.id, filtered).catch(() => {});
        }
        return { ...r, siteIds: filtered };
      });
      writeRecruiters(next);
      return next;
    });
  }, []);

  const resetRecruiters = useCallback(() => {
    writeRecruiters([]);
    setRecruiters([]);
  }, []);

  return {
    recruiters,
    loading,
    error,
    addRecruiter,
    updateRecruiter,
    syncRecruitersForSite,
    removeSiteFromAllRecruiters,
    resetRecruiters,
  };
}
