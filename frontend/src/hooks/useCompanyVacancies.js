import { useCallback, useEffect, useState } from 'react';
import { vacancyService } from '../services/vacancyService.js';
import { authService } from '../services/authService.js';
import { formatSalary } from '../data/companyVacanciesData.js';

const toCompetencias = (skills = [], skillsSoft = []) =>
  skills.map((nombre) => ({ nombre, categoria: skillsSoft.includes(nombre) ? 'blanda' : 'tecnica', es_obligatoria: true }));

const toIdiomas = (value) => (value && value !== 'No requerido' ? [value] : []);

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
    workSchedule: '',
    languages: 'No requerido',
    benefits: [],
    closingDate: '',
    experienceLevel: '',
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
    status: v.estado === 'abierta' ? 'open' : v.estado === 'borrador' ? 'draft' : v.estado === 'pausada' ? 'paused' : v.estado === 'inhabilitada' ? 'disabled' : 'closed',
    modality: v.modalidad || 'Presencial',
    contractType: v.tipo_contrato,
    experienceLevel: v.nivel_experiencia || '',
    salaryMin: v.salario_minimo,
    salaryMax: v.salario_maximo,
    salaryConfidential: Boolean(v.salario_es_confidencial),
    salary: formatSalary(v.salario_minimo, v.salario_maximo, v.salario_es_confidencial),
    openSpots: v.cupos_disponibles,
    workSchedule: v.jornada_laboral || '',
    description: v.descripcion,
    responsibilities: v.responsabilidades || [],
    requirements: v.requisitos || [],
    skills: (v.competencias || []).map((c) => c.nombre),
    skillsTech: (v.competencias || []).filter((c) => c.categoria === 'tecnica').map((c) => c.nombre),
    skillsSoft: (v.competencias || []).filter((c) => c.categoria === 'blanda').map((c) => c.nombre),
    targetPrograms: v.programas_afines_nombres || [],
    benefits: v.beneficios || [],
    languages: (v.idiomas_requeridos || []).join(', ') || 'No requerido',
    closingDate: v.fecha_cierre,
    agreementId: v.id_convenio || null,
    publishedAt: v.publicado_en ? v.publicado_en.slice(0, 10) : null,
    applicantsCount: v.total_postulantes || 0,
    source: 'api',
  });
}

function readVacancies() {
  return [];
}

function writeVacancies(list) {
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { owner: authService.getCurrentUser()?.id_entidad, list } }));
    });
  }
}

/** Vacantes que aún requieren atención de un responsable (no cerradas). */
export function countActiveVacancies(vacancies, recruiterId) {
  return vacancies.filter((v) => v.ownerRecruiterId === recruiterId && v.status !== 'closed').length;
}

export function useCompanyVacancies() {
  const companyId = authService.getCurrentUser()?.id_entidad;
  const [vacancies, setVacancies] = useState(readVacancies);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sincronización con backend REST API
  useEffect(() => {
    let isMounted = true;
    setVacancies([]);
    async function fetchVacancies() {
      if (!authService.isAuthenticated() || !companyId) { setLoading(false); return; }
      try {
        setLoading(true);
        const res = await vacancyService.getCompanyVacancies({ page: 1, limit: 50 });
        if (!res || !Array.isArray(res.items)) throw new Error('La respuesta de vacantes no es válida.');
        const all = [...res.items];
        for (let page = 2; page <= (res.total_pages || 1); page += 1) {
          const next = await vacancyService.getCompanyVacancies({ page, limit: 50 });
          if (!Array.isArray(next?.items)) throw new Error('No se pudo cargar la lista completa de vacantes.');
          all.push(...next.items);
        }
        if (isMounted) {
          const mapped = all.map(mapApiVacancyToLocal);
          setVacancies(mapped);
          writeVacancies(mapped);
          setError('');
        }
      } catch (error) {
        if (isMounted) {
          setVacancies([]);
          writeVacancies([]);
          setError(error.message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchVacancies();
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  useEffect(() => {
    function handleSync(event) {
      if (event.detail?.owner === companyId) setVacancies(event.detail.list ?? []);
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, [companyId]);

  /** Crea la vacante y devuelve su id para poder navegar a ella. */
  const addVacancy = useCallback(async (data) => {
    if (!authService.isAuthenticated()) throw new Error('Debes iniciar sesión para crear una vacante.');
    if (!data.title?.trim()) throw new Error('Escribe el título de la vacante.');
    if (!data.siteId) throw new Error('Selecciona una sede registrada antes de guardar la vacante.');
    if (!data.description?.trim() || data.description.trim().length < 15) throw new Error('Escribe una descripción de al menos 15 caracteres.');
    if (!data.closingDate) throw new Error('Selecciona la fecha de cierre de la vacante.');
      const apiPayload = {
        titulo: data.title.trim(),
        id_sede: data.siteId,
        id_reclutador_responsable: data.ownerRecruiterId || null,
        categoria: data.category || 'Tecnología',
        modalidad: data.modality || 'Presencial',
        tipo_contrato: data.contractType || 'Término Indefinido',
        nivel_experiencia: data.experienceLevel?.trim() || 'Sin experiencia',
        salario_minimo: data.salaryMin ? Number(data.salaryMin) : null,
        salario_maximo: data.salaryMax ? Number(data.salaryMax) : null,
        salario_es_confidencial: Boolean(data.salaryConfidential),
        periodo_salario: 'Mensual',
        jornada_laboral: data.workSchedule || 'Tiempo Completo',
        cupos_disponibles: data.openSpots ? Number(data.openSpots) : 1,
        descripcion: data.description.trim(),
        responsabilidades: data.responsibilities || [],
        requisitos: data.requirements || [],
        beneficios: data.benefits || [],
        idiomas_requeridos: toIdiomas(data.languages),
        fecha_cierre: data.closingDate,
        estado: data.status === 'open' ? 'abierta' : 'borrador',
        programas_afines_nombres: data.targetPrograms || [],
        id_convenio: data.agreementId || null,
        competencias: toCompetencias(data.skills, data.skillsSoft),
      };

    const saved = await vacancyService.createVacancy(apiPayload);
    if (!saved?.id) throw new Error('El servidor no confirmó la creación de la vacante.');
    setVacancies((previous) => {
      const next = [mapApiVacancyToLocal(saved), ...previous];
      writeVacancies(next);
      return next;
    });
    return saved.id;
  }, []);

  const updateVacancy = useCallback(async (id, changes) => {
    if (!authService.isAuthenticated() || !id) throw new Error('Inicia sesión para actualizar la vacante.');
    const patch = {};
    const fields = {
      title: 'titulo', siteId: 'id_sede', ownerRecruiterId: 'id_reclutador_responsable',
      category: 'categoria', modality: 'modalidad', contractType: 'tipo_contrato',
      experienceLevel: 'nivel_experiencia', salaryMin: 'salario_minimo', salaryMax: 'salario_maximo',
      salaryConfidential: 'salario_es_confidencial',
      workSchedule: 'jornada_laboral', openSpots: 'cupos_disponibles', description: 'descripcion',
      responsibilities: 'responsabilidades', requirements: 'requisitos', benefits: 'beneficios',
      closingDate: 'fecha_cierre', agreementId: 'id_convenio',
    };
    Object.entries(fields).forEach(([source, target]) => {
      if (Object.prototype.hasOwnProperty.call(changes, source)) patch[target] = changes[source];
    });
    if (changes.skills) patch.competencias = toCompetencias(changes.skills, changes.skillsSoft);
    if (changes.targetPrograms) patch.programas_afines_nombres = changes.targetPrograms;
    if (changes.languages !== undefined) patch.idiomas_requeridos = toIdiomas(changes.languages);
    let saved = null;
    if (Object.keys(patch).length) saved = await vacancyService.updateVacancy(id, patch);
    if (changes.status) {
      const estadoApi = { open: 'abierta', paused: 'pausada', closed: 'cerrada', draft: 'borrador' }[changes.status];
      saved = await vacancyService.updateVacancyStatus(id, estadoApi);
    }
    if (!saved?.id) throw new Error('El servidor no confirmó la actualización de la vacante.');
    setVacancies((prev) => {
      const next = prev.map((v) => v.id === id ? mapApiVacancyToLocal(saved) : v);
      writeVacancies(next);
      return next;
    });
    return saved;
  }, []);

  const deleteVacancy = useCallback(async (id) => updateVacancy(id, { status: 'closed' }), [updateVacancy]);

  const duplicateVacancy = useCallback(async (id) => {
    const source = vacancies.find((vacancy) => vacancy.id === id);
    if (!source) throw new Error('La vacante ya no aparece en la empresa.');
    return addVacancy({ ...source, title: `${source.title} (Copia)`, status: 'draft' });
  }, [vacancies, addVacancy]);

  /** Deja sin responsable las vacantes de un reclutador (p. ej. al eliminarlo). */
  const unassignOwner = useCallback(async (recruiterId) => {
    const owned = vacancies.filter((v) => v.ownerRecruiterId === recruiterId);
    await Promise.all(owned.map((v) => updateVacancy(v.id, { ownerRecruiterId: null })));
  }, [vacancies, updateVacancy]);

  const resetVacancies = useCallback(() => {
    writeVacancies([]);
    setVacancies([]);
  }, []);

  return {
    vacancies,
    loading,
    error,
    addVacancy,
    updateVacancy,
    deleteVacancy,
    duplicateVacancy,
    unassignOwner,
    resetVacancies,
  };
}
