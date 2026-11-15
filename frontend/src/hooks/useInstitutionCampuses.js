import { useCallback, useEffect, useState } from 'react';
import { authService } from '../services/authService.js';
import { institutionService } from '../services/institutionService.js';

const STORAGE_KEY = 'vincula.institution.campuses.v1';
const SYNC_EVENT = 'vincula:institution-campuses-updated';

function mapApiCampus(s) {
  return {
    id: s.id,
    name: s.nombre,
    shortName: s.nombre_corto || s.ciudad || s.nombre,
    city: s.ciudad,
    department: s.departamento,
    address: s.direccion,
    phone: s.telefono || '',
    email: s.correo || '',
    isMain: Boolean(s.es_sede_principal),
    status: s.estado === 'activa' ? 'active' : 'inactive',
    source: 'api',
  };
}

function readCampuses() {
  if (typeof window === 'undefined' || !authService.getToken()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c) => c && c.source === 'api') : [];
  } catch {
    return [];
  }
}

function writeCampuses(campuses) {
  try {
    const apiOnly = Array.isArray(campuses) ? campuses.filter((c) => c && c.source === 'api') : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(apiOnly));
  } catch {
    // safe fallback
  }
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: campuses }));
    });
  }
}

export function useInstitutionCampuses() {
  const [campuses, setCampuses] = useState(readCampuses);
  const [loading, setLoading] = useState(Boolean(authService.getToken()));
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function fetchFromBackend() {
      if (!authService.getToken()) {
        if (isMounted) {
          setCampuses([]);
          setLoading(false);
          setError('');
        }
        return;
      }

      setLoading(true);
      try {
        const list = await institutionService.getSedes();
        if (isMounted && Array.isArray(list)) {
          const apiCampuses = list.map(mapApiCampus);
          writeCampuses(apiCampuses);
          setCampuses(apiCampuses);
          setError('');
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'No se pudieron consultar las sedes.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchFromBackend();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    function handleSync(event) {
      setCampuses(Array.isArray(event.detail) ? event.detail : readCampuses());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const refreshCampuses = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const addCampus = useCallback(async (newCampus) => {
    const created = await institutionService.createSede({
      nombre: newCampus.name,
      nombre_corto: newCampus.shortName || undefined,
      ciudad: newCampus.city,
      departamento: newCampus.department,
      direccion: newCampus.address,
      telefono: newCampus.phone || undefined,
      correo: newCampus.email || undefined,
      es_sede_principal: Boolean(newCampus.isMain),
    });
    const mapped = mapApiCampus(created);
    setCampuses((prev) => {
      const list = mapped.isMain ? prev.map((c) => ({ ...c, isMain: false })) : prev;
      const next = [mapped, ...list.filter((c) => c.id !== mapped.id)];
      writeCampuses(next);
      return next;
    });
    setReloadKey((k) => k + 1);
    return mapped;
  }, []);

  const updateCampus = useCallback(async (id, patch) => {
    const updated = await institutionService.updateSede(id, {
      nombre: patch.name,
      nombre_corto: patch.shortName,
      ciudad: patch.city,
      departamento: patch.department,
      direccion: patch.address,
      telefono: patch.phone,
      correo: patch.email,
      es_sede_principal: patch.isMain,
      estado: patch.status === 'active' ? 'activa' : patch.status === 'inactive' ? 'inactiva' : undefined,
    });
    const mapped = mapApiCampus(updated);
    setCampuses((prev) => {
      let list = prev;
      if (mapped.isMain) {
        list = list.map((c) => (c.id === id ? c : { ...c, isMain: false }));
      }
      const next = list.map((c) => (c.id === id ? mapped : c));
      writeCampuses(next);
      return next;
    });
    setReloadKey((k) => k + 1);
    return mapped;
  }, []);

  const deleteCampus = useCallback(async (id) => {
    await institutionService.deleteSede(id);
    setCampuses((prev) => {
      const next = prev.filter((c) => c.id !== id);
      writeCampuses(next);
      return next;
    });
  }, []);

  return {
    campuses,
    loading,
    error,
    refreshCampuses,
    addCampus,
    updateCampus,
    deleteCampus,
  };
}
