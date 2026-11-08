import { useCallback, useEffect, useState } from 'react';
import { initialInstitutionFaculties } from '../data/institutionFacultiesData.js';
import { institutionService } from '../services/institutionService.js';

const STORAGE_KEY = 'vincula.institution.faculties.v1';
const SYNC_EVENT = 'vincula:institution-faculties-updated';

function readFaculties() {
  if (typeof window === 'undefined') return initialInstitutionFaculties;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialInstitutionFaculties;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(({ dean, deanEmail, ...rest }) => rest) : initialInstitutionFaculties;
  } catch {
    return initialInstitutionFaculties;
  }
}

function writeFaculties(faculties) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(faculties));
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

  // Sincronización con Backend REST API (Fase 3 Paso 1)
  useEffect(() => {
    let isMounted = true;
    async function fetchFacultiesFromBackend() {
      try {
        const list = await institutionService.getFacultades();
        if (isMounted && Array.isArray(list) && list.length > 0) {
          const apiFaculties = list.map((f) => ({
            id: f.id,
            code: f.codigo,
            shortName: f.sigla || f.codigo,
            name: f.nombre,
            phone: f.telefono || '',
            office: f.oficina || '',
            color: f.color_distintivo || '#00A86B',
            status: f.estado === 'activa' ? 'active' : 'inactive',
            source: 'api',
          }));

          setFaculties((prev) => {
            const apiIds = new Set(apiFaculties.map((a) => a.id));
            const localOnly = prev.filter((l) => !apiIds.has(l.id) && l.source !== 'api');
            const merged = [...apiFaculties, ...localOnly];
            writeFaculties(merged);
            return merged;
          });
        }
      } catch (err) {
        console.warn('[useInstitutionFaculties] Usando facultades locales:', err.message);
      }
    }

    fetchFacultiesFromBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleSync(event) {
      setFaculties(event.detail ?? readFaculties());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const addFaculty = useCallback(async (newFaculty) => {
    try {
      await institutionService.createFacultad({
        codigo: newFaculty.code,
        sigla: newFaculty.shortName || newFaculty.code,
        nombre: newFaculty.name,
        telefono: newFaculty.phone || undefined,
        oficina: newFaculty.office || undefined,
        color_distintivo: newFaculty.color || '#00A86B',
      });
    } catch (err) {
      console.warn('[useInstitutionFaculties] Guardando facultad local tras error API:', err.message);
    }

    setFaculties((prev) => {
      const next = [newFaculty, ...prev];
      writeFaculties(next);
      return next;
    });
  }, []);

  const updateFaculty = useCallback((id, patch) => {
    setFaculties((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, ...patch } : f));
      writeFaculties(next);
      return next;
    });
  }, []);

  const deleteFaculty = useCallback((id) => {
    setFaculties((prev) => {
      const next = prev.filter((f) => f.id !== id);
      writeFaculties(next);
      return next;
    });
  }, []);

  const resetFaculties = useCallback(() => {
    writeFaculties(initialInstitutionFaculties);
    setFaculties(initialInstitutionFaculties);
  }, []);

  return {
    faculties,
    addFaculty,
    updateFaculty,
    deleteFaculty,
    resetFaculties,
  };
}
