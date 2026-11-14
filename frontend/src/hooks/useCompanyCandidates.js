import { useCallback, useEffect, useState } from 'react';
import { atsService } from '../services/atsService.js';

function boardCandidates(board) {
  if (!board || !board.columnas) throw new Error('El tablero ATS devolvio una respuesta incompleta.');
  const columns = Object.values(board.columnas);
  return columns.flatMap((column) => Array.isArray(column) ? column : Array.isArray(column?.candidatos) ? column.candidatos : []);
}

export function useCompanyCandidates(vacancyIds = []) {
  const idsKey = vacancyIds.slice().sort().join(',');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadLiveBoard = useCallback(async (vacancyId) => {
    if (!vacancyId || !idsKey.split(',').includes(vacancyId)) return [];
    const result = boardCandidates(await atsService.getKanbanBoard(vacancyId));
    setCandidates((previous) => [...previous.filter((candidate) => candidate.vacancyId !== vacancyId), ...result]);
    setError('');
    return result;
  }, [idsKey]);

  useEffect(() => {
    let active = true;
    const ids = idsKey ? idsKey.split(',') : [];
    setCandidates([]);
    if (!ids.length) { setLoading(false); setError(''); return undefined; }
    setLoading(true);
    Promise.all(ids.map((id) => atsService.getKanbanBoard(id).then(boardCandidates)))
      .then((lists) => { if (active) { setCandidates(lists.flat()); setError(''); } })
      .catch((cause) => { if (active) { setCandidates([]); setError(cause.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [idsKey]);

  const candidateById = (id) => candidates.find((candidate) => candidate.id === id);
  const moveCandidateStage = async (id, newStage, notes = null) => {
    const candidate = candidateById(id);
    if (!candidate) throw new Error('No se encontro la postulacion en tus vacantes.');
    await atsService.moveCandidateStage(id, newStage, null, notes);
    await loadLiveBoard(candidate.vacancyId);
  };
  const discardCandidate = async (id, reason, notes = null) => {
    const candidate = candidateById(id);
    if (!candidate) throw new Error('No se encontro la postulacion en tus vacantes.');
    await atsService.moveCandidateStage(id, 'discarded', reason, notes);
    await loadLiveBoard(candidate.vacancyId);
  };
  const addCandidateNote = async (id, noteText) => {
    const candidate = candidateById(id);
    if (!candidate) throw new Error('No se encontro la postulacion en tus vacantes.');
    await atsService.addCandidateNote(id, noteText);
    await loadLiveBoard(candidate.vacancyId);
  };

  return { candidates, loading, error, loadLiveBoard, moveCandidateStage, discardCandidate, addCandidateNote };
}
