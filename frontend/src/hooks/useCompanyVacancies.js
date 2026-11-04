import { useCallback, useEffect, useState } from 'react';
import { initialVacancies } from '../data/companyVacanciesData.js';

const STORAGE_KEY = 'vincula.company.vacancies.v4';
const LEGACY_KEYS = ['vincula.company.vacancies.v1', 'vincula.company.vacancies.v2', 'vincula.company.vacancies.v3'];
const SYNC_EVENT = 'vincula:company-vacancies-updated';

/** Completa y normaliza campos para garantizar compatibilidad técnica y blanda. */
function normalizeVacancy(v) {
  const skillsTech = Array.isArray(v.skillsTech)
    ? v.skillsTech
    : Array.isArray(v.skills)
      ? v.skills.filter((s) => !['Trabajo en equipo', 'Comunicación asertiva', 'Liderazgo', 'Pensamiento crítico', 'Resolución de problemas', 'Adaptabilidad'].includes(s))
      : [];

  const skillsSoft = Array.isArray(v.skillsSoft)
    ? v.skillsSoft
    : Array.isArray(v.skills)
      ? v.skills.filter((s) => ['Trabajo en equipo', 'Comunicación asertiva', 'Liderazgo', 'Pensamiento crítico', 'Resolución de problemas', 'Adaptabilidad'].includes(s))
      : [];

  const combinedSkills = Array.isArray(v.skills) && v.skills.length > 0
    ? v.skills
    : [...skillsTech, ...skillsSoft];

  return {
    description: '',
    responsibilities: [],
    requirements: [],
    skillsTech,
    skillsSoft,
    skills: combinedSkills,
    targetPrograms: [],
    openSpots: 1,
    workSchedule: 'Lunes a Viernes (8:00 AM - 5:00 PM)',
    languages: 'No requerido',
    benefits: [],
    closingDate: '',
    experienceLevel: 'recien-egresado',
    ...v,
  };
}

function readVacancies() {
  if (typeof window === 'undefined') return initialVacancies;
  try {
    LEGACY_KEYS.forEach((k) => {
      if (window.localStorage.getItem(k)) window.localStorage.removeItem(k);
    });
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw).map(normalizeVacancy) : initialVacancies;
  } catch {
    return initialVacancies;
  }
}

function writeVacancies(list) {
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

/** Vacantes que aún requieren atención de un responsable (no cerradas). */
export function countActiveVacancies(vacancies, recruiterId) {
  return vacancies.filter((v) => v.ownerRecruiterId === recruiterId && v.status !== 'closed').length;
}

export function useCompanyVacancies() {
  const [vacancies, setVacancies] = useState(readVacancies);

  useEffect(() => {
    function handleSync(event) {
      setVacancies(event.detail ?? readVacancies());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  /** Crea la vacante y devuelve su id para poder navegar a ella. */
  const addVacancy = useCallback((data) => {
    const id = `vac-${Date.now().toString().slice(-6)}`;
    setVacancies((prev) => {
      const nextNumber = prev.length + 19;
      const created = normalizeVacancy({
        id,
        code: `CEN-2026-0${nextNumber}`,
        applicantsCount: 0,
        publishedAt: data.status === 'draft' ? null : new Date().toISOString().slice(0, 10),
        ...data,
      });
      const next = [created, ...prev];
      writeVacancies(next);
      return next;
    });
    return id;
  }, []);

  const updateVacancy = useCallback((id, changes) => {
    setVacancies((prev) => {
      const next = prev.map((v) => {
        if (v.id !== id) return v;
        const updated = normalizeVacancy({ ...v, ...changes });
        if (!v.publishedAt && updated.status === 'open') {
          updated.publishedAt = new Date().toISOString().slice(0, 10);
        }
        return updated;
      });
      writeVacancies(next);
      return next;
    });
  }, []);

  const deleteVacancy = useCallback((id) => {
    setVacancies((prev) => {
      const next = prev.filter((v) => v.id !== id);
      writeVacancies(next);
      return next;
    });
  }, []);

  const duplicateVacancy = useCallback((id) => {
    let duplicatedId = null;
    setVacancies((prev) => {
      const source = prev.find((v) => v.id === id);
      if (!source) return prev;
      duplicatedId = `vac-${Date.now().toString().slice(-6)}`;
      const nextNumber = prev.length + 20;
      const copy = normalizeVacancy({
        ...source,
        id: duplicatedId,
        code: `CEN-2026-0${nextNumber}`,
        title: `${source.title} (Copia)`,
        status: 'draft',
        applicantsCount: 0,
        publishedAt: null,
      });
      const next = [copy, ...prev];
      writeVacancies(next);
      return next;
    });
    return duplicatedId;
  }, []);

  /** Deja sin responsable las vacantes de un reclutador (p. ej. al eliminarlo). */
  const unassignOwner = useCallback((recruiterId) => {
    setVacancies((prev) => {
      const next = prev.map((v) => (v.ownerRecruiterId === recruiterId ? { ...v, ownerRecruiterId: null } : v));
      writeVacancies(next);
      return next;
    });
  }, []);

  const resetVacancies = useCallback(() => {
    writeVacancies(initialVacancies);
    setVacancies(initialVacancies);
  }, []);

  return {
    vacancies,
    addVacancy,
    updateVacancy,
    deleteVacancy,
    duplicateVacancy,
    unassignOwner,
    resetVacancies,
  };
}
