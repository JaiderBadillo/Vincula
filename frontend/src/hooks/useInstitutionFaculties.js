import { useCallback, useEffect, useState } from 'react';
import { initialInstitutionFaculties } from '../data/institutionFacultiesData.js';

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

  useEffect(() => {
    function handleSync(event) {
      setFaculties(event.detail ?? readFaculties());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const addFaculty = useCallback((newFaculty) => {
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
