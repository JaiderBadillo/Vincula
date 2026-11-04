import { useCallback, useEffect, useState } from 'react';
import { initialRecruiters } from '../data/companyRecruitersData.js';

const STORAGE_KEY = 'vincula.company.recruiters.v3';
const LEGACY_KEYS = ['vincula.company.recruiters.v1', 'vincula.company.recruiters.v2'];
const SYNC_EVENT = 'vincula:company-recruiters-updated';

function sanitizeRecruiter(item) {
  const { role: _r, permissions: _p, position: _pos, ...clean } = item;
  return clean;
}

function readRecruiters() {
  if (typeof window === 'undefined') return initialRecruiters;
  try {
    LEGACY_KEYS.forEach((k) => {
      if (window.localStorage.getItem(k)) window.localStorage.removeItem(k);
    });
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(sanitizeRecruiter) : initialRecruiters;
    }
    return initialRecruiters;
  } catch {
    return initialRecruiters;
  }
}

function writeRecruiters(list) {
  try {
    const cleanList = list.map(sanitizeRecruiter);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
  } catch {
    // safe fallback
  }
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: list }));
    });
  }
}

export function useCompanyRecruiters() {
  const [recruiters, setRecruiters] = useState(readRecruiters);

  useEffect(() => {
    function handleSync(event) {
      setRecruiters(event.detail ?? readRecruiters());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const addRecruiter = useCallback((data) => {
    setRecruiters((prev) => {
      const cleanData = sanitizeRecruiter(data);
      const created = {
        id: `rec-${Date.now().toString().slice(-6)}`,
        status: 'invited',
        lastAccess: 'Sin accesos registrados',
        vacanciesCount: 0,
        avatar: null,
        ...cleanData,
      };
      const next = [created, ...prev];
      writeRecruiters(next);
      return next;
    });
  }, []);

  const updateRecruiter = useCallback((id, changes) => {
    setRecruiters((prev) => {
      const cleanChanges = sanitizeRecruiter(changes);
      const next = prev.map((r) => (r.id === id ? { ...r, ...cleanChanges } : r));
      writeRecruiters(next);
      return next;
    });
  }, []);

  const deleteRecruiter = useCallback((id) => {
    setRecruiters((prev) => {
      const next = prev.filter((r) => r.id !== id);
      writeRecruiters(next);
      return next;
    });
  }, []);

  const syncRecruitersForSite = useCallback((siteId, selectedRecruiterIds) => {
    setRecruiters((prev) => {
      const next = prev.map((r) => {
        const isSelected = selectedRecruiterIds.includes(r.id);
        const currentSites = r.siteIds || [];
        const currentlyHas = currentSites.includes(siteId);

        if (isSelected && !currentlyHas) {
          return { ...r, siteIds: [...currentSites, siteId] };
        }
        if (!isSelected && currentlyHas) {
          return { ...r, siteIds: currentSites.filter((id) => id !== siteId) };
        }
        return r;
      });
      writeRecruiters(next);
      return next;
    });
  }, []);

  const removeSiteFromAllRecruiters = useCallback((siteId) => {
    setRecruiters((prev) => {
      const next = prev.map((r) => ({
        ...r,
        siteIds: (r.siteIds || []).filter((id) => id !== siteId),
      }));
      writeRecruiters(next);
      return next;
    });
  }, []);

  const resetRecruiters = useCallback(() => {
    writeRecruiters(initialRecruiters);
    setRecruiters(initialRecruiters);
  }, []);

  return {
    recruiters,
    addRecruiter,
    updateRecruiter,
    deleteRecruiter,
    syncRecruitersForSite,
    removeSiteFromAllRecruiters,
    resetRecruiters,
  };
}
