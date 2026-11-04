import { useCallback, useEffect, useState } from 'react';
import { initialCampuses } from '../data/institutionCampusesData.js';

const STORAGE_KEY = 'vincula.institution.campuses.v1';
const SYNC_EVENT = 'vincula:institution-campuses-updated';

function readCampuses() {
  if (typeof window === 'undefined') return initialCampuses;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : initialCampuses;
  } catch {
    return initialCampuses;
  }
}

function writeCampuses(campuses) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(campuses));
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

  useEffect(() => {
    function handleSync(event) {
      setCampuses(event.detail ?? readCampuses());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const addCampus = useCallback((newCampus) => {
    setCampuses((prev) => {
      const generated = {
        id: newCampus.id || `sede-${Date.now().toString().slice(-5)}`,
        ...newCampus,
      };
      // Si se marca como principal, desmarcar las demás
      const list = newCampus.isMain ? prev.map((c) => ({ ...c, isMain: false })) : [...prev];
      const next = [generated, ...list];
      writeCampuses(next);
      return next;
    });
  }, []);

  const updateCampus = useCallback((id, patch) => {
    setCampuses((prev) => {
      let list = prev;
      if (patch.isMain) {
        list = list.map((c) => (c.id === id ? c : { ...c, isMain: false }));
      }
      const next = list.map((c) => (c.id === id ? { ...c, ...patch } : c));
      writeCampuses(next);
      return next;
    });
  }, []);

  const deleteCampus = useCallback((id) => {
    setCampuses((prev) => {
      const next = prev.filter((c) => c.id !== id);
      writeCampuses(next);
      return next;
    });
  }, []);

  return {
    campuses,
    addCampus,
    updateCampus,
    deleteCampus,
  };
}
