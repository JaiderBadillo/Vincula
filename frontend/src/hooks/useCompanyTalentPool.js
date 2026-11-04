import { useCallback, useEffect, useState } from 'react';
import { initialTalentPool } from '../data/companyTalentPoolData.js';

const STORAGE_KEY = 'vincula.company.talent_pool.v1';
const SYNC_EVENT = 'vincula:company-talent-pool-updated';

function readTalents() {
  if (typeof window === 'undefined') return initialTalentPool;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : initialTalentPool;
  } catch {
    return initialTalentPool;
  }
}

function writeTalents(list) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // safe fallback
  }
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: list }));
    });
  }
}

export function useCompanyTalentPool() {
  const [talents, setTalents] = useState(readTalents);

  useEffect(() => {
    function handleSync(event) {
      setTalents(event.detail ?? readTalents());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const toggleBookmark = useCallback((talentId) => {
    setTalents((prev) => {
      const next = prev.map((t) => (t.id === talentId ? { ...t, isBookmarked: !t.isBookmarked } : t));
      writeTalents(next);
      return next;
    });
  }, []);

  const inviteToVacancy = useCallback((talentId, vacancyId) => {
    setTalents((prev) => {
      const next = prev.map((t) => {
        if (t.id !== talentId) return t;
        const currentInvited = t.invitedVacancies || [];
        if (currentInvited.includes(vacancyId)) return t;
        return {
          ...t,
          invitedVacancies: [...currentInvited, vacancyId],
        };
      });
      writeTalents(next);
      return next;
    });
  }, []);

  const assignToList = useCallback((talentId, listId) => {
    setTalents((prev) => {
      const next = prev.map((t) => (t.id === talentId ? { ...t, listId } : t));
      writeTalents(next);
      return next;
    });
  }, []);

  const resetTalents = useCallback(() => {
    writeTalents(initialTalentPool);
    setTalents(initialTalentPool);
  }, []);

  return {
    talents,
    toggleBookmark,
    inviteToVacancy,
    assignToList,
    resetTalents,
  };
}

