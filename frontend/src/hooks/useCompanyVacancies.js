import { useCallback, useEffect, useState } from 'react';
import { initialVacancies } from '../data/companyVacanciesData.js';
import { vacancyService } from '../services/vacancyService.js';
import { authService } from '../services/authService.js';

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

function mapApiVacancyToLocal(v) {
  return normalizeVacancy({
    id: v.id,
    code: v.codigo_vacante,
    title: v.titulo,
    category: v.categoria,
    siteId: v.id_sede,
    ownerRecruiterId: v.id_reclutador_responsable,
    status: v.estado === 'abierta' ? 'open' : v.estado === 'borrador' ? 'draft' : v.estado === 'pausada' ? 'paused' : 'closed',
    modality: (v.modalidad || 'presencial').toLowerCase(),
    contractType: v.tipo_contrato,
    experienceLevel: (v.nivel_experiencia || '').toLowerCase().includes('senior') ? 'senior' : (v.nivel_experiencia || '').toLowerCase().includes('semi') ? 'intermedio' : 'recien-egresado',
    salaryMin: v.salario_minimo,
    salaryMax: v.salario_maximo,
    salary: v.salario_es_confidencial ? 'Confidencial' : v.salario_minimo && v.salario_maximo ? `$${v.salario_minimo.toLocaleString('es-CO')} - $${v.salario_maximo.toLocaleString('es-CO')}` : '',
    openSpots: v.cupos_disponibles,
    description: v.descripcion,
    responsibilities: v.responsabilidades || [],
    requirements: v.requisitos || [],
    skills: (v.competencias || []).map((c) => c.nombre),
    skillsTech: (v.competencias || []).filter((c) => c.categoria === 'tecnica').map((c) => c.nombre),
    skillsSoft: (v.competencias || []).filter((c) => c.categoria === 'blanda').map((c) => c.nombre),
    benefits: v.beneficios || [],
    languages: (v.idiomas_requeridos || []).join(', ') || 'No requerido',
    closingDate: v.fecha_cierre,
    publishedAt: v.publicado_en ? v.publicado_en.slice(0, 10) : null,
    applicantsCount: v.total_postulantes || 0,
    source: 'api',
  });
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
  const [loading, setLoading] = useState(false);

  // Sincronización con backend REST API
  useEffect(() => {
    let isMounted = true;
    async function fetchVacancies() {
      if (!authService.isAuthenticated()) return;
      try {
        setLoading(true);
        const res = await vacancyService.getCompanyVacancies({ page: 1, limit: 50 });
        if (isMounted && res && Array.isArray(res.items) && res.items.length > 0) {
          const mapped = res.items.map(mapApiVacancyToLocal);
          setVacancies(mapped);
          writeVacancies(mapped);
        }
      } catch {
        // Fallback a localStorage
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchVacancies();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleSync(event) {
      setVacancies(event.detail ?? readVacancies());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  /** Crea la vacante y devuelve su id para poder navegar a ella. */
  const addVacancy = useCallback((data) => {
    const tempId = `vac-${Date.now().toString().slice(-6)}`;

    // Sincronización asíncrona con el Backend FastAPI
    if (authService.isAuthenticated()) {
      const modalityApi = data.modality === 'remoto' ? 'Remoto' : data.modality === 'hibrido' ? 'Híbrido' : 'Presencial';
      const defaultClosing = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

      const apiPayload = {
        titulo: data.title || 'Nueva Vacante',
        id_sede: data.siteId,
        id_reclutador_responsable: data.ownerRecruiterId || null,
        categoria: data.category || 'Tecnología',
        modalidad: modalityApi,
        tipo_contrato: data.contractType || 'Término Indefinido',
        nivel_experiencia: data.experienceLevel || 'Junior',
        salario_minimo: data.salaryMin ? Number(data.salaryMin) : null,
        salario_maximo: data.salaryMax ? Number(data.salaryMax) : null,
        salario_es_confidencial: Boolean(data.salary === 'Confidencial'),
        periodo_salario: 'Mensual',
        jornada_laboral: data.workSchedule || 'Tiempo Completo',
        cupos_disponibles: data.openSpots ? Number(data.openSpots) : 1,
        descripcion: data.description || 'Convocatoria laboral formal para egresados universitarios.',
        responsabilidades: Array.isArray(data.responsibilities) && data.responsibilities.length > 0
          ? data.responsibilities
          : ['Cumplir con las metas y objetivos del cargo'],
        requisitos: Array.isArray(data.requirements) && data.requirements.length > 0
          ? data.requirements
          : ['Título universitario en áreas afines'],
        beneficios: data.benefits || [],
        idiomas_requeridos: data.languages && data.languages !== 'No requerido' ? [data.languages] : [],
        fecha_cierre: data.closingDate || defaultClosing,
        estado: data.status === 'open' ? 'abierta' : 'borrador',
        competencias: (data.skills || []).map((s) => ({
          nombre: s,
          categoria: ['Trabajo en equipo', 'Liderazgo', 'Comunicación asertiva'].includes(s) ? 'blanda' : 'tecnica',
          es_obligatoria: true,
        })),
      };

      vacancyService.createVacancy(apiPayload).then((resApi) => {
        if (resApi && resApi.id) {
          setVacancies((prev) => {
            const updated = prev.map((v) => v.id === tempId ? { ...v, id: resApi.id, code: resApi.codigo_vacante, source: 'api' } : v);
            writeVacancies(updated);
            return updated;
          });
        }
      }).catch((err) => {
        console.warn('Vacante guardada en modo local (backend no disponible):', err);
      });
    }

    setVacancies((prev) => {
      const nextNumber = prev.length + 19;
      const created = normalizeVacancy({
        id: tempId,
        code: `CEN-2026-0${nextNumber}`,
        applicantsCount: 0,
        publishedAt: data.status === 'draft' ? null : new Date().toISOString().slice(0, 10),
        ...data,
      });
      const next = [created, ...prev];
      writeVacancies(next);
      return next;
    });

    return tempId;
  }, []);

  const updateVacancy = useCallback((id, changes) => {
    // Sincronización asíncrona con el Backend FastAPI
    if (authService.isAuthenticated() && id && !id.startsWith('vac-')) {
      const patch = {};
      if (changes.title) patch.titulo = changes.title;
      if (changes.category) patch.categoria = changes.category;
      if (changes.description) patch.descripcion = changes.description;
      if (changes.openSpots) patch.cupos_disponibles = Number(changes.openSpots);
      if (changes.closingDate) patch.fecha_cierre = changes.closingDate;

      if (Object.keys(patch).length > 0) {
        vacancyService.updateVacancy(id, patch).catch(() => {});
      }

      if (changes.status) {
        const estadoApi = changes.status === 'open' ? 'abierta' : changes.status === 'paused' ? 'pausada' : changes.status === 'closed' ? 'cerrada' : 'borrador';
        vacancyService.updateVacancyStatus(id, estadoApi).catch(() => {});
      }
    }

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
    if (authService.isAuthenticated() && id && !id.startsWith('vac-')) {
      vacancyService.updateVacancyStatus(id, 'cerrada').catch(() => {});
    }

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
    loading,
    addVacancy,
    updateVacancy,
    deleteVacancy,
    duplicateVacancy,
    unassignOwner,
    resetVacancies,
  };
}
