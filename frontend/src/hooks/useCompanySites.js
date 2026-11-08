import { useCallback, useEffect, useState } from 'react';
import { initialCompanySites } from '../data/companySitesData.js';
import { companyService } from '../services/companyService.js';
import { authService } from '../services/authService.js';

const STORAGE_KEY = 'vincula.company.sites.v1';
const SYNC_EVENT = 'vincula:company-sites-updated';

function mapApiSiteToLocal(s) {
  return {
    id: s.id,
    name: s.nombre,
    city: s.ciudad,
    state: s.departamento,
    address: s.direccion,
    phone: s.telefono || '(607) 6000000',
    email: s.correo || 'contacto@empresa.com',
    contactName: s.nombre_responsable || 'Responsable de Sede',
    isMain: Boolean(s.es_sede_principal),
    status: s.estado === 'activa' ? 'active' : 'inactive',
    departments: ['Operaciones', 'Tecnología'],
    headcount: s.total_areas || 0,
    recruitersCount: s.total_reclutadores || 0,
    source: 'api',
  };
}

function readSites() {
  if (typeof window === 'undefined') return initialCompanySites;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : initialCompanySites;
  } catch {
    return initialCompanySites;
  }
}

function writeSites(sites) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
  } catch {
    // safe fallback
  }
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: sites }));
    });
  }
}

export function useCompanySites() {
  const [sites, setSites] = useState(readSites);
  const [loading, setLoading] = useState(false);

  // Sincronización con backend REST API
  useEffect(() => {
    let isMounted = true;
    async function fetchSites() {
      if (!authService.isAuthenticated()) return;
      try {
        setLoading(true);
        const data = await companyService.getSedes();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const mapped = data.map(mapApiSiteToLocal);
          setSites(mapped);
          writeSites(mapped);
        }
      } catch {
        // Fallback a localStorage si el token expiró o estamos offline
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchSites();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleSync(event) {
      setSites(event.detail ?? readSites());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const addSite = useCallback((newSite) => {
    let createdSiteId = '';
    const tempId = newSite.id || `site-${Date.now().toString().slice(-6)}`;

    // Llamada asíncrona al backend si está autenticado
    if (authService.isAuthenticated()) {
      companyService.createSede({
        nombre: newSite.name || 'Nueva Sede',
        nombre_corto: newSite.name ? newSite.name.slice(0, 30) : null,
        departamento: newSite.state || 'Santander',
        ciudad: newSite.city || 'Bucaramanga',
        direccion: newSite.address || 'Calle 10 # 20-30',
        telefono: newSite.phone || '(607) 6000000',
        correo: newSite.email || 'contacto@empresa.com',
        nombre_responsable: newSite.contactName || null,
        es_sede_principal: Boolean(newSite.isMain),
      }).then((apiRes) => {
        if (apiRes && apiRes.id) {
          setSites((prev) => {
            const updated = prev.map((s) => s.id === tempId ? { ...s, id: apiRes.id, source: 'api' } : s);
            writeSites(updated);
            return updated;
          });
        }
      }).catch((err) => {
        console.warn('Sede guardada localmente (backend no disponible):', err);
      });
    }

    setSites((prev) => {
      const generated = {
        id: tempId,
        status: 'active',
        isMain: false,
        departments: newSite.departments || ['Operaciones'],
        headcount: 0,
        ...newSite,
      };
      createdSiteId = generated.id;

      // Si se marca como principal, desmarcar las demás sedes
      const list = newSite.isMain ? prev.map((s) => ({ ...s, isMain: false })) : [...prev];
      const next = [generated, ...list];
      writeSites(next);
      return next;
    });

    return createdSiteId;
  }, []);

  const updateSite = useCallback((id, patch) => {
    // Sincronización asíncrona con backend
    if (authService.isAuthenticated() && id && !id.startsWith('site-')) {
      const payload = {};
      if (patch.name) payload.nombre = patch.name;
      if (patch.state) payload.departamento = patch.state;
      if (patch.city) payload.ciudad = patch.city;
      if (patch.address) payload.direccion = patch.address;
      if (patch.phone) payload.telefono = patch.phone;
      if (patch.email) payload.correo = patch.email;
      if (patch.contactName) payload.nombre_responsable = patch.contactName;
      if (patch.isMain !== undefined) payload.es_sede_principal = patch.isMain;
      if (patch.status) payload.estado = patch.status === 'active' ? 'activa' : 'inactiva';

      if (Object.keys(payload).length > 0) {
        companyService.updateSede(id, payload).catch((err) => {
          console.warn('No se pudo sincronizar actualización de sede:', err);
        });
      }
    }

    setSites((prev) => {
      let list = prev;
      if (patch.isMain) {
        list = list.map((s) => (s.id === id ? s : { ...s, isMain: false }));
      }
      const next = list.map((s) => (s.id === id ? { ...s, ...patch } : s));
      writeSites(next);
      return next;
    });
  }, []);

  const deleteSite = useCallback((id) => {
    setSites((prev) => {
      const next = prev.filter((s) => s.id !== id);
      writeSites(next);
      return next;
    });
  }, []);

  const toggleSiteStatus = useCallback((id) => {
    setSites((prev) => {
      const next = prev.map((s) => {
        if (s.id === id) {
          const newStatus = s.status === 'active' ? 'inactive' : 'active';
          if (authService.isAuthenticated() && !id.startsWith('site-')) {
            companyService.updateSede(id, { estado: newStatus === 'active' ? 'activa' : 'inactiva' }).catch(() => {});
          }
          return { ...s, status: newStatus };
        }
        return s;
      });
      writeSites(next);
      return next;
    });
  }, []);

  const setMainSite = useCallback((id) => {
    if (authService.isAuthenticated() && !id.startsWith('site-')) {
      companyService.updateSede(id, { es_sede_principal: true }).catch(() => {});
    }

    setSites((prev) => {
      const next = prev.map((s) => ({
        ...s,
        isMain: s.id === id,
      }));
      writeSites(next);
      return next;
    });
  }, []);

  const resetSites = useCallback(() => {
    writeSites(initialCompanySites);
    setSites(initialCompanySites);
  }, []);

  return {
    sites,
    loading,
    addSite,
    updateSite,
    deleteSite,
    toggleSiteStatus,
    setMainSite,
    resetSites,
  };
}
