import { useCallback, useEffect, useState } from 'react';
import { vacancyService } from '../services/vacancyService.js';
import { mapPublicVacancy } from '../utils/publicVacancies.js';

const STORAGE_KEY = 'vincula.savedJobs.v1';
const SYNC_EVENT = 'vincula:saved-jobs-updated';

function readSavedJobIds() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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
  const [publicJobs, setPublicJobs] = useState([]);

  useEffect(() => {
    function handleSync(event) {
      setSavedIds(event.detail ?? readSavedJobIds());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  useEffect(() => {
    if (savedIds.length === 0) {
      setPublicJobs([]);
      return undefined;
    }
    let active = true;
    vacancyService
      .getPublicVacancies({ limit: 50 })
      .then((res) => {
        if (active) setPublicJobs((res?.items || []).map(mapPublicVacancy));
      })
      .catch(() => {
        if (active) setPublicJobs([]);
      });
    return () => {
      active = false;
    };
  }, [savedIds.length]);

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

  const savedJobs = publicJobs.filter((job) => savedIds.includes(job.id));

  return {
    savedIds,
    savedJobs,
    savedCount: savedJobs.length,
    isSaved,
    toggleSave,
    removeSaved,
  };
}
