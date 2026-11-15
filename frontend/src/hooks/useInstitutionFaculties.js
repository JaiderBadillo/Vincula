import { useCallback, useEffect, useState } from 'react';
import { authService } from '../services/authService.js';
import { institutionService } from '../services/institutionService.js';

const STORAGE_KEY = 'vincula.institution.faculties.v1';
const SYNC_EVENT = 'vincula:institution-faculties-updated';

function mapApiFaculty(f) {
  return {
    id: f.id,
    code: f.codigo,
    shortName: f.sigla || f.codigo,
    acronym: f.sigla || f.codigo,
    name: f.nombre,
    phone: f.telefono || '',
    office: f.oficina || '',
    color: f.color_distintivo || '#00A86B',
    status: f.estado === 'activa' ? 'active' : 'inactive',
    source: 'api',
  };
}

function readFaculties() {
  if (typeof window === 'undefined' || !authService.getToken()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((f) => f && f.source === 'api') : [];
  } catch {
    return [];
  }
}

function writeFaculties(faculties) {
  try {
    const apiOnly = Array.isArray(faculties) ? faculties.filter((f) => f && f.source === 'api') : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(apiOnly));
  } catch {
    // safe fallback
  }
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: faculties }));
    });
  }
}

export function useInstitutionFaculties() {
  const [faculties, setFaculties] = useState(readFaculties);
  const [loading, setLoading] = useState(Boolean(authService.getToken()));
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function fetchFacultiesFromBackend() {
      if (!authService.getToken()) {
        if (isMounted) {
          setFaculties([]);
          setLoading(false);
          setError('');
        }
        return;
      }

      setLoading(true);
      try {
        const list = await institutionService.getFacultades();
        if (isMounted && Array.isArray(list)) {
          const apiFaculties = list.map(mapApiFaculty);
          writeFaculties(apiFaculties);
          setFaculties(apiFaculties);
          setError('');
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'No se pudieron consultar las facultades.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchFacultiesFromBackend();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    function handleSync(event) {
      setFaculties(Array.isArray(event.detail) ? event.detail : readFaculties());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const refreshFaculties = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const addFaculty = useCallback(async (newFaculty) => {
    const created = await institutionService.createFacultad({
      codigo: newFaculty.code,
      sigla: newFaculty.acronym || newFaculty.shortName || newFaculty.code,
      nombre: newFaculty.name,
      telefono: newFaculty.phone || undefined,
      oficina: newFaculty.office || undefined,
      color_distintivo: newFaculty.color || '#00A86B',
    });
    const mapped = mapApiFaculty(created);
    setFaculties((prev) => {
      const next = [...prev.filter((f) => f.id !== mapped.id), mapped].sort((a, b) =>
        a.name.localeCompare(b.name, 'es')
      );
      writeFaculties(next);
      return next;
    });
    setReloadKey((k) => k + 1);
    return mapped;
  }, []);

  const updateFaculty = useCallback(async (id, patch) => {
    const updated = await institutionService.updateFacultad(id, {
      codigo: patch.code,
      sigla: patch.acronym || patch.shortName,
      nombre: patch.name,
      telefono: patch.phone,
      oficina: patch.office,
      color_distintivo: patch.color,
      estado: patch.status === 'active' ? 'activa' : patch.status === 'inactive' ? 'inactiva' : undefined,
    });
    const mapped = mapApiFaculty(updated);
    setFaculties((prev) => {
      const next = prev.map((f) => (f.id === id ? mapped : f));
      writeFaculties(next);
      return next;
    });
    setReloadKey((k) => k + 1);
    return mapped;
  }, []);

  const deleteFaculty = useCallback(async (id) => {
    await institutionService.deleteFacultad(id);
    setFaculties((prev) => {
      const next = prev.filter((f) => f.id !== id);
      writeFaculties(next);
      return next;
    });
  }, []);

  const resetFaculties = useCallback(() => {
    writeFaculties([]);
    setFaculties([]);
  }, []);

  return {
    faculties,
    loading,
    error,
    refreshFaculties,
    addFaculty,
    updateFaculty,
    deleteFaculty,
    resetFaculties,
  };
}
