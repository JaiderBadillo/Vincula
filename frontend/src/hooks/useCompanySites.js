import { useCallback, useEffect, useState } from 'react';
import { authService } from '../services/authService.js';
import { companyService } from '../services/companyService.js';

const EVENT = 'vincula:company-sites-updated';
let cachedCompany = null;
let cachedSites = [];

function companyId() {
  return authService.getCurrentUser()?.id_entidad || null;
}

function mapSite(s) {
  return {
    id: s.id, name: s.nombre || '', shortName: s.nombre_corto || '',
    city: s.ciudad || '', state: s.departamento || '', department: s.departamento || '',
    address: s.direccion || '', phone: s.telefono || '', email: s.correo || '',
    contactName: s.nombre_responsable || '', manager: s.nombre_responsable || '',
    isMain: Boolean(s.es_sede_principal), status: s.estado === 'activa' ? 'active' : 'inactive',
    departments: [], headcount: null, recruitersCount: s.total_reclutadores || 0,
    source: 'api',
  };
}

function broadcast(owner, list) {
  cachedCompany = owner;
  cachedSites = list;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { owner, list } }));
}

function sitePayload(site) {
  return {
    nombre: site.name, nombre_corto: site.shortName || site.name?.slice(0, 30),
    departamento: site.department || site.state, ciudad: site.city,
    direccion: site.address, telefono: site.phone || null,
    correo: site.email || null, nombre_responsable: site.contactName || site.manager || null,
    es_sede_principal: Boolean(site.isMain),
  };
}

export function useCompanySites() {
  const id = companyId();
  const [sites, setSites] = useState(() => id && cachedCompany === id ? cachedSites : []);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const sync = (event) => { if (event.detail?.owner === id) setSites(event.detail.list); };
    window.addEventListener(EVENT, sync);
    if (id) {
      setLoading(true);
      companyService.getSedes().then((data) => {
        if (!active) return;
        if (!Array.isArray(data)) throw new Error('Respuesta de sedes no valida.');
        broadcast(id, data.map(mapSite));
        setError('');
      }).catch((cause) => {
        if (!active) return;
        broadcast(id, []);
        setError(cause.message);
      }).finally(() => { if (active) setLoading(false); });
    } else { setSites([]); setLoading(false); }
    return () => { active = false; window.removeEventListener(EVENT, sync); };
  }, [id]);

  const refresh = useCallback(async () => {
    const owner = companyId();
    if (!owner) throw new Error('La sesion de empresa no esta activa.');
    const data = await companyService.getSedes();
    if (!Array.isArray(data)) throw new Error('Respuesta de sedes no valida.');
    broadcast(owner, data.map(mapSite));
    setError('');
    return data;
  }, []);

  const addSite = useCallback(async (site) => {
    const owner = companyId();
    if (!owner) throw new Error('La sesion de empresa no esta activa.');
    const created = await companyService.createSede(sitePayload(site));
    await refresh();
    return created.id;
  }, [refresh]);

  const updateSite = useCallback(async (siteId, patch) => {
    const previous = cachedSites.find((site) => site.id === siteId && cachedCompany === companyId());
    if (!previous) throw new Error('La sede no pertenece a la empresa actual.');
    const merged = { ...previous, ...patch };
    await companyService.updateSede(siteId, {
      ...sitePayload(merged),
      estado: merged.status === 'active' ? 'activa' : 'inactiva',
    });
    await refresh();
  }, [refresh]);

  const toggleSiteStatus = useCallback(async (siteId) => {
    const site = cachedSites.find((item) => item.id === siteId && cachedCompany === companyId());
    if (!site) throw new Error('La sede no pertenece a la empresa actual.');
    await updateSite(siteId, { status: site.status === 'active' ? 'inactive' : 'active' });
  }, [updateSite]);

  const setMainSite = useCallback(async (siteId) => updateSite(siteId, { isMain: true }), [updateSite]);
  const deleteSite = useCallback(async () => {
    throw new Error('No se puede eliminar una sede desde este panel. Desactivala para conservar la trazabilidad.');
  }, []);
  const resetSites = useCallback(() => { cachedCompany = null; cachedSites = []; setSites([]); }, []);

  return { sites, loading, error, refresh, addSite, updateSite, deleteSite, toggleSiteStatus, setMainSite, resetSites };
}
