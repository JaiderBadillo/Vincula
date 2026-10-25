import { useCallback, useEffect, useState } from 'react';
import { proposalJobs } from '../data/proposalJobs.js';

const STORAGE_KEY = 'vincula.savedJobs.v1';
const SYNC_EVENT = 'vincula:saved-jobs-updated';

// 2 vacantes iniciales por defecto para que el usuario nuevo vea contenido real de inmediato
const DEFAULT_SAVED_IDS = ['bancolombia-data-lead', 'rappi-fullstack-dev'];

function readSavedJobIds() {
  if (typeof window === 'undefined') return DEFAULT_SAVED_IDS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SAVED_IDS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_SAVED_IDS;
  } catch {
    return DEFAULT_SAVED_IDS;
  }
}

function writeSavedJobIds(ids) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Fallback silencioso en memoria
  }
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: ids }));
    });
  }
}

export function useSavedJobs() {
  const [savedIds, setSavedIds] = useState(readSavedJobIds);

  useEffect(() => {
    function handleSync(event) {
      setSavedIds(event.detail ?? readSavedJobIds());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const toggleSave = useCallback((jobId) => {
    setSavedIds((current) => {
      const exists = current.includes(jobId);
      const next = exists ? current.filter((id) => id !== jobId) : [...current, jobId];
      writeSavedJobIds(next);
      return next;
    });
  }, []);

  const removeSaved = useCallback((jobId) => {
    setSavedIds((current) => {
      const next = current.filter((id) => id !== jobId);
      writeSavedJobIds(next);
      return next;
    });
  }, []);

  const isSaved = useCallback((jobId) => savedIds.includes(jobId), [savedIds]);

  // Lista completa de objetos de vacantes guardadas
  const savedJobs = proposalJobs.filter((job) => savedIds.includes(job.id));

  return {
    savedIds,
    savedJobs,
    savedCount: savedJobs.length,
    isSaved,
    toggleSave,
    removeSaved,
  };
}
