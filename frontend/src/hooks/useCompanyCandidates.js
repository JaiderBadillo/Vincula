import { useCallback, useEffect, useState } from 'react';
import { initialCandidates } from '../data/companyCandidatesData.js';

const STORAGE_KEY = 'vincula.company.candidates.v1';
const SYNC_EVENT = 'vincula:company-candidates-updated';

function readCandidates() {
  if (typeof window === 'undefined') return initialCandidates;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : initialCandidates;
  } catch {
    return initialCandidates;
  }
}

function writeCandidates(list) {
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

export function useCompanyCandidates() {
  const [candidates, setCandidates] = useState(readCandidates);

  useEffect(() => {
    function handleSync(event) {
      setCandidates(event.detail ?? readCandidates());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const updateCandidate = useCallback((id, patch) => {
    setCandidates((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      writeCandidates(next);
      return next;
    });
  }, []);

  const moveCandidateStage = useCallback((id, newStage, notes = null) => {
    setCandidates((prev) => {
      const next = prev.map((c) => {
        if (c.id !== id) return c;
        const updated = {
          ...c,
          stage: newStage,
          rejectionReason: newStage === 'discarded' ? c.rejectionReason : null,
        };
        if (notes) {
          updated.recruiterNotes = notes;
        }
        return updated;
      });
      writeCandidates(next);
      return next;
    });
  }, []);

  const discardCandidate = useCallback((id, reason, notes = null) => {
    setCandidates((prev) => {
      const next = prev.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          stage: 'discarded',
          rejectionReason: reason || 'Descartado en el proceso de selección',
          recruiterNotes: notes || c.recruiterNotes,
        };
      });
      writeCandidates(next);
      return next;
    });
  }, []);

  const addCandidateNote = useCallback((id, noteText) => {
    setCandidates((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, recruiterNotes: noteText } : c));
      writeCandidates(next);
      return next;
    });
  }, []);

  const resetCandidates = useCallback(() => {
    writeCandidates(initialCandidates);
    setCandidates(initialCandidates);
  }, []);

  return {
    candidates,
    updateCandidate,
    moveCandidateStage,
    discardCandidate,
    addCandidateNote,
    resetCandidates,
  };
}

