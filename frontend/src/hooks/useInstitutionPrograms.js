import { useCallback, useEffect, useState } from 'react';
import { initialInstitutionPrograms } from '../data/institutionProgramsData.js';

const STORAGE_KEY = 'vincula.institution.programs.v1';
const SYNC_EVENT = 'vincula:institution-programs-updated';

function sanitizePrograms(list) {
  if (!Array.isArray(list)) return initialInstitutionPrograms;
  return list.map((p) => {
    if (p.level === 'Especialización Tecnológica') {
      return { ...p, level: 'Posgrado' };
    }
    return p;
  });
}

function readPrograms() {
  if (typeof window === 'undefined') return initialInstitutionPrograms;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizePrograms(JSON.parse(raw)) : initialInstitutionPrograms;
  } catch {
    return initialInstitutionPrograms;
  }
}

function writePrograms(programs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
  } catch {
    // safe fallback
  }
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: programs }));
    });
  }
}

export function useInstitutionPrograms() {
  const [programs, setPrograms] = useState(readPrograms);

  useEffect(() => {
    function handleSync(event) {
      setPrograms(event.detail ?? readPrograms());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const addProgram = useCallback((newProg) => {
    setPrograms((prev) => {
      const next = [newProg, ...prev];
      writePrograms(next);
      return next;
    });
  }, []);

  const updateProgram = useCallback((id, patch) => {
    setPrograms((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      writePrograms(next);
      return next;
    });
  }, []);

  const deleteProgram = useCallback((id) => {
    setPrograms((prev) => {
      const next = prev.filter((p) => p.id !== id);
      writePrograms(next);
      return next;
    });
  }, []);

  const resetPrograms = useCallback(() => {
    writePrograms(initialInstitutionPrograms);
    setPrograms(initialInstitutionPrograms);
  }, []);

  return {
    programs,
    addProgram,
    updateProgram,
    deleteProgram,
    resetPrograms,
  };
}
