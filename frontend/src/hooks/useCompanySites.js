import { useCallback, useEffect, useState } from 'react';
import { initialCompanySites } from '../data/companySitesData.js';

const STORAGE_KEY = 'vincula.company.sites.v1';
const SYNC_EVENT = 'vincula:company-sites-updated';

function readSites() {
  if (typeof window === 'undefined') return initialCompanySites;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : initialCompanySites;
  } catch {
    return initialCompanySites;
  }
}

function writeSites(sites) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
  } catch {
    // safe fallback
  }
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: sites }));
    });
  }
}

export function useCompanySites() {
  const [sites, setSites] = useState(readSites);

  useEffect(() => {
    function handleSync(event) {
      setSites(event.detail ?? readSites());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const addSite = useCallback((newSite) => {
    let createdSiteId = '';
    setSites((prev) => {
      const generated = {
        id: newSite.id || `site-${Date.now().toString().slice(-6)}`,
        status: 'active',
        isMain: false,
        departments: [],
        headcount: 0,
        ...newSite,
      };
      createdSiteId = generated.id;

      // Si se marca como principal, desmarcar las demás sedes
      const list = newSite.isMain ? prev.map((s) => ({ ...s, isMain: false })) : [...prev];
      const next = [generated, ...list];
      writeSites(next);
      return next;
    });
    return createdSiteId;
  }, []);

  const updateSite = useCallback((id, patch) => {
    setSites((prev) => {
      let list = prev;
      if (patch.isMain) {
        list = list.map((s) => (s.id === id ? s : { ...s, isMain: false }));
      }
      const next = list.map((s) => (s.id === id ? { ...s, ...patch } : s));
      writeSites(next);
      return next;
    });
  }, []);

  const deleteSite = useCallback((id) => {
    setSites((prev) => {
      const next = prev.filter((s) => s.id !== id);
      writeSites(next);
      return next;
    });
  }, []);

  const toggleSiteStatus = useCallback((id) => {
    setSites((prev) => {
      const next = prev.map((s) =>
        s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s
      );
      writeSites(next);
      return next;
    });
  }, []);

  const setMainSite = useCallback((id) => {
    setSites((prev) => {
      const next = prev.map((s) => ({
        ...s,
        isMain: s.id === id,
      }));
      writeSites(next);
      return next;
    });
  }, []);

  const resetSites = useCallback(() => {
    writeSites(initialCompanySites);
    setSites(initialCompanySites);
  }, []);

  return {
    sites,
    addSite,
    updateSite,
    deleteSite,
    toggleSiteStatus,
    setMainSite,
    resetSites,
  };
}

