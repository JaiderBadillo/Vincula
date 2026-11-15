import { useCallback, useEffect, useState } from 'react';
import { authService } from '../services/authService.js';
import { institutionService } from '../services/institutionService.js';

const STORAGE_KEY = 'vincula.institution.programs.v1';
const SYNC_EVENT = 'vincula:institution-programs-updated';

function mapApiProgram(p) {
  const semesters = Number(p.duracion_semestres) || 10;
  return {
    id: p.id,
    facultyId: p.id_facultad,
    campusId: p.id_sede,
    code: p.codigo_interno || p.codigo_snies,
    sniesCode: p.codigo_snies,
    name: p.nombre,
    faculty: p.nombre_facultad || '',
    campus: p.nombre_sede || '',
    level: p.nivel_formacion === 'Especialización Tecnológica' ? 'Posgrado' : p.nivel_formacion,
    modality: p.modalidad,
    semesters,
    duration: `${semesters} semestres`,
    credits: p.total_creditos,
    accreditation: p.estado_acreditacion || '',
    director: p.nombre_director || '',
    directorEmail: p.correo_director || '',
    status: p.estado === 'activo' ? 'active' : 'inactive',
    graduatesCount: 0,
    employmentRate: null,
    source: 'api',
  };
}

function readPrograms() {
  if (typeof window === 'undefined' || !authService.getToken()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p) => p && p.source === 'api') : [];
  } catch {
    return [];
  }
}

function writePrograms(programs) {
  try {
    const apiOnly = Array.isArray(programs) ? programs.filter((p) => p && p.source === 'api') : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(apiOnly));
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
  const [loading, setLoading] = useState(Boolean(authService.getToken()));
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function fetchFromBackend() {
      if (!authService.getToken()) {
        if (isMounted) {
          setPrograms([]);
          setLoading(false);
          setError('');
        }
        return;
      }

      setLoading(true);
      try {
        const firstPage = await institutionService.getProgramas({ page: 1, limit: 100 });
        if (!isMounted) return;

        let allItems = Array.isArray(firstPage?.items) ? [...firstPage.items] : [];
        const totalPages = Number(firstPage?.total_pages) || 1;
        if (totalPages > 1) {
          const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, idx) =>
              institutionService.getProgramas({ page: idx + 2, limit: 100 })
            )
          );
          if (!isMounted) return;
          rest.forEach((res) => {
            if (Array.isArray(res?.items)) allItems = allItems.concat(res.items);
          });
        }

        const apiPrograms = allItems.map(mapApiProgram);
        writePrograms(apiPrograms);
        setPrograms(apiPrograms);
        setError('');
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'No se pudieron consultar los programas académicos.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchFromBackend();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    function handleSync(event) {
      setPrograms(Array.isArray(event.detail) ? event.detail : readPrograms());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const refreshPrograms = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const addProgram = useCallback(async (newProg) => {
    if (!newProg.facultyId || !newProg.campusId) {
      throw new Error('Selecciona la facultad y la sede del programa.');
    }
    const created = await institutionService.createPrograma({
      id_facultad: newProg.facultyId,
      id_sede: newProg.campusId,
      codigo_interno: newProg.code,
      codigo_snies: newProg.sniesCode || newProg.code,
      nombre: newProg.name,
      nivel_formacion: newProg.level,
      modalidad: newProg.modality || 'Presencial',
      duracion_semestres: Number(newProg.semesters) || 10,
      total_creditos: Number(newProg.credits) || 160,
      nombre_director: newProg.director || undefined,
      correo_director: newProg.directorEmail || undefined,
      estado_acreditacion: newProg.accreditation || undefined,
    });
    const mapped = mapApiProgram(created);
    setPrograms((prev) => {
      const next = [...prev.filter((p) => p.id !== mapped.id), mapped].sort((a, b) =>
        a.name.localeCompare(b.name, 'es')
      );
      writePrograms(next);
      return next;
    });
    setReloadKey((k) => k + 1);
    return mapped;
  }, []);

  const updateProgram = useCallback(async (id, patch) => {
    const updated = await institutionService.updatePrograma(id, {
      id_facultad: patch.facultyId,
      id_sede: patch.campusId,
      nombre: patch.name,
      codigo_interno: patch.code,
      codigo_snies: patch.sniesCode || patch.code,
      nivel_formacion: patch.level,
      duracion_semestres: patch.semesters ? Number(patch.semesters) : undefined,
      total_creditos: patch.credits ? Number(patch.credits) : undefined,
      modalidad: patch.modality,
      nombre_director: patch.director,
      correo_director: patch.directorEmail,
      estado_acreditacion: patch.accreditation,
      estado: patch.status === 'active' ? 'activo' : patch.status === 'inactive' ? 'inactivo' : undefined,
    });
    const mapped = mapApiProgram(updated);
    setPrograms((prev) => {
      const next = prev.map((p) => (p.id === id ? mapped : p));
      writePrograms(next);
      return next;
    });
    setReloadKey((k) => k + 1);
    return mapped;
  }, []);

  const deleteProgram = useCallback(async (id) => {
    await institutionService.deletePrograma(id);
    setPrograms((prev) => {
      const next = prev.filter((p) => p.id !== id);
      writePrograms(next);
      return next;
    });
  }, []);

  const resetPrograms = useCallback(() => {
    writePrograms([]);
    setPrograms([]);
  }, []);

  return {
    programs,
    loading,
    error,
    refreshPrograms,
    addProgram,
    updateProgram,
    deleteProgram,
    resetPrograms,
  };
}
