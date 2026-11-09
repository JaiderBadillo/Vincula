import { useCallback, useEffect, useState } from 'react';
import { initialCandidates } from '../data/companyCandidatesData.js';
import { atsService } from '../services/atsService.js';

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
      const target = prev.find((c) => c.id === id);
      const candidateMeta = target
        ? {
            correo_candidato: target.email,
            nombre_candidato: target.candidateName,
            vacante_titulo: target.vacancyTitle,
            vacante_codigo: target.vacancyCode,
            fase_anterior: target.stage,
          }
        : {};

      // Sincronizar en segundo plano con el backend de PostgreSQL y notificar por correo
      atsService.moveCandidateStage(id, newStage, null, notes, candidateMeta).catch((err) => {
        console.info('[useCompanyCandidates] Transición local o error API:', err.message);
      });

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
      const target = prev.find((c) => c.id === id);
      const candidateMeta = target
        ? {
            correo_candidato: target.email,
            nombre_candidato: target.candidateName,
            vacante_titulo: target.vacancyTitle,
            vacante_codigo: target.vacancyCode,
            fase_anterior: target.stage,
          }
        : {};

      // Sincronizar descarte con PostgreSQL y notificar por correo
      atsService.moveCandidateStage(id, 'discarded', reason, notes, candidateMeta).catch((err) => {
        console.info('[useCompanyCandidates] Descarte local o error API:', err.message);
      });

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
    // Sincronizar nota con PostgreSQL
    atsService.addCandidateNote(id, noteText).catch((err) => {
      console.info('[useCompanyCandidates] Nota guardada localmente o error API:', err.message);
    });

    setCandidates((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, recruiterNotes: noteText } : c));
      writeCandidates(next);
      return next;
    });
  }, []);

  const scheduleInterview = useCallback((id, payload) => {
    setCandidates((prev) => {
      const target = prev.find((c) => c.id === id);
      const candidateMeta = target
        ? {
            correo_candidato: target.email,
            nombre_candidato: target.candidateName,
            vacante_titulo: target.vacancyTitle,
            vacante_codigo: target.vacancyCode,
            fase_anterior: target.stage,
          }
        : {};

      atsService.scheduleInterview(id, payload, candidateMeta).catch((err) => {
        console.info('[useCompanyCandidates] Entrevista programada localmente o error API:', err.message);
      });

      const next = prev.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          stage: 'interview',
          interviewDate: `${payload.date || payload.fecha_entrevista}, ${payload.timeRange || payload.franja_horaria} (${payload.modality || payload.modalidad || 'Virtual'})`,
        };
      });
      writeCandidates(next);
      return next;
    });
  }, []);

  const loadLiveBoard = useCallback(async (vacancyId) => {
    if (!vacancyId) return;
    try {
      const boardData = await atsService.getKanbanBoard(vacancyId);
      if (boardData && boardData.columnas) {
        // Aplanar todas las columnas del ATS en la lista de candidatos
        const flatCandidates = [];
        Object.values(boardData.columnas).forEach((col) => {
          if (Array.isArray(col.candidatos)) {
            flatCandidates.push(...col.candidatos);
          }
        });
        if (flatCandidates.length > 0) {
          setCandidates((prev) => {
            // Fusionar candidatos del backend sin borrar los de otras vacantes
            const otherCandidates = prev.filter((c) => c.vacancyId !== vacancyId);
            const merged = [...otherCandidates, ...flatCandidates];
            writeCandidates(merged);
            return merged;
          });
        }
      }
    } catch (err) {
      console.info('[useCompanyCandidates] No se pudo cargar tablero remoto:', err.message);
    }
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
    scheduleInterview,
    loadLiveBoard,
    resetCandidates,
  };
}
