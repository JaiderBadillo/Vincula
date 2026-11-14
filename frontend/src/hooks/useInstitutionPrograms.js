import { useCallback, useEffect, useState } from 'react';
import { institutionService } from '../services/institutionService.js';

const STORAGE_KEY = 'vincula.institution.programs.v1';
const SYNC_EVENT = 'vincula:institution-programs-updated';

function sanitizePrograms(list) {
  if (!Array.isArray(list)) return [];
  return list.map((p) => {
    if (p.level === 'Especialización Tecnológica') {
      return { ...p, level: 'Posgrado' };
    }
    return p;
  });
}

function readPrograms() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizePrograms(JSON.parse(raw)).filter((p) => p.source === 'api') : [];
  } catch {
    return [];
  }
}

function writePrograms(programs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
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
  const [reloadKey, setReloadKey] = useState(0);

  // Sincronización con Backend REST API (Fase 3 Paso 1)
  useEffect(() => {
    let isMounted = true;
    async function fetchFromBackend() {
      try {
        const res = await institutionService.getProgramas({ page: 1, limit: 100 });
        if (isMounted && res && Array.isArray(res.items)) {
          const apiPrograms = res.items.map((p) => ({
            id: p.id,
            code: p.codigo_interno || p.codigo_snies,
            sniesCode: p.codigo_snies,
            name: p.nombre,
            faculty: p.nombre_facultad || 'Facultad General',
            campus: p.nombre_sede || 'Campus Principal',
            level: p.nivel_formacion,
            modality: p.modalidad,
            semesters: p.duracion_semestres,
            credits: p.total_creditos,
            director: p.nombre_director || '',
            directorEmail: p.correo_director || '',
            status: p.estado === 'activo' ? 'active' : 'inactive',
            graduatesCount: 0,
            employabilityRate: '75%',
            source: 'api',
          }));

          // Mezclar con programas locales si no existieran
          // El servidor es la única fuente: no se mezclan programas guardados solo en el navegador
          writePrograms(apiPrograms);
          setPrograms(apiPrograms);
        }
      } catch (err) {
        // Fallback silencioso a localStorage si no está autenticado aún
        console.warn('[useInstitutionPrograms] Usando datos de programas locales:', err.message);
      }
    }

    fetchFromBackend();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    function handleSync(event) {
      setPrograms(event.detail ?? readPrograms());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const addProgram = useCallback(async (newProg) => {
    if (!newProg.facultyId || !newProg.campusId) throw new Error('Selecciona la facultad y la sede del programa.');
    await institutionService.createPrograma({
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
    });

    setReloadKey((k) => k + 1);
  }, []);

  const updateProgram = useCallback(async (id, patch) => {
    try {
      if (id && !String(id).startsWith('prog-')) {
        await institutionService.updatePrograma(id, {
          nombre: patch.name,
          codigo_interno: patch.code,
          duracion_semestres: patch.semesters ? Number(patch.semesters) : undefined,
          total_creditos: patch.credits ? Number(patch.credits) : undefined,
          modalidad: patch.modality,
          nombre_director: patch.director,
          correo_director: patch.directorEmail,
          estado: patch.status === 'active' ? 'activo' : patch.status === 'inactive' ? 'inactivo' : undefined,
        });
      }
    } catch (err) {
      console.warn('[useInstitutionPrograms] Actualizando localmente tras error API:', err.message);
    }

    setPrograms((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      writePrograms(next);
      return next;
    });
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
    addProgram,
    updateProgram,
    deleteProgram,
    resetPrograms,
  };
}
