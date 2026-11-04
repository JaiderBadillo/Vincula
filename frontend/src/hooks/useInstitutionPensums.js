import { useCallback, useEffect, useState } from 'react';
import { initialInstitutionPensums } from '../data/institutionPensumsData.js';

const STORAGE_KEY = 'vincula.institution.pensums.v1';
const SYNC_EVENT = 'vincula:institution-pensums-updated';

// Familias tecnológicas equivalentes para matching determinista
const EQUIVALENCE_FAMILIES = [
  { name: 'SQL Relacional', tools: ['mysql', 'postgresql', 'oracle', 'sql server', 'mariadb', 'sqlite', 'sql'] },
  { name: 'Bases NoSQL', tools: ['mongodb', 'redis', 'cassandra', 'dynamodb', 'couchdb'] },
  { name: 'Frontend React/Vue', tools: ['react', 'vue', 'vue.js', 'angular', 'svelte'] },
  { name: 'Sistemas ERP Contable', tools: ['siigo', 'sap', 'world office', 'helisa', 'monica'] },
  { name: 'Gestión Ágil / Proyectos', tools: ['jira', 'trello', 'asana', 'scrum', 'kanban', 'ms project'] },
  { name: 'Automatización PLC', tools: ['plc', 'siemens', 'allen bradley', 'scada', 'ladder'] },
  { name: 'Modelado CAD/BIM', tools: ['autocad', 'revit', 'civil 3d', 'archicad', 'cypecad'] },
  { name: 'Analítica / BI', tools: ['power bi', 'tableau', 'excel avanzado', 'dax'] },
];

function areToolsEquivalent(toolA, toolB) {
  if (typeof toolA !== 'string' || typeof toolB !== 'string') return false;
  const a = toolA.toLowerCase().trim();
  const b = toolB.toLowerCase().trim();
  if (!a || !b) return false;
  if (a === b) return true;
  for (const fam of EQUIVALENCE_FAMILIES) {
    const hasA = fam.tools.some((t) => a.includes(t) || t.includes(a));
    const hasB = fam.tools.some((t) => b.includes(t) || t.includes(b));
    if (hasA && hasB) return fam.name;
  }
  return false;
}

export function resolvePensum(pensumsData, programIdOrSlug) {
  if (!pensumsData) return null;
  if (!programIdOrSlug) {
    const firstKey = Object.keys(pensumsData)[0];
    return pensumsData[firstKey] || null;
  }

  // 1. Coincidencia directa por clave
  if (pensumsData[programIdOrSlug]) return pensumsData[programIdOrSlug];

  // 2. Mapeo de alias conocidos
  const aliasMap = {
    'prog-01': 'sistemas',
    'prog-02': 'electronica',
    'prog-03': 'software',
    'prog-04': 'gestion',
    'prog-05': 'contabilidad',
    sistemas: 'prog-01',
    electronica: 'prog-02',
    gestion: 'prog-04',
    software: 'prog-03',
    contabilidad: 'prog-05',
    finanzas: 'prog-05',
  };

  const mappedKey = aliasMap[programIdOrSlug];
  if (mappedKey && pensumsData[mappedKey]) return pensumsData[mappedKey];

  // 3. Búsqueda por propiedad interna (id, programCode, nombre aproximado)
  const query = String(programIdOrSlug).toLowerCase().trim();
  for (const key of Object.keys(pensumsData)) {
    const p = pensumsData[key];
    if (!p) continue;
    if (p.id && String(p.id).toLowerCase() === query) return p;
    if (p.programCode && String(p.programCode).toLowerCase() === query) return p;
    if (p.programName && String(p.programName).toLowerCase().includes(query)) return p;
  }

  // 4. Fallback: retornar el primer pensum disponible o sistemas
  return pensumsData['prog-01'] || pensumsData['sistemas'] || Object.values(pensumsData)[0] || null;
}

function readPensums() {
  if (typeof window === 'undefined') return initialInstitutionPensums;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialInstitutionPensums;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return initialInstitutionPensums;
    }
    return { ...initialInstitutionPensums, ...parsed };
  } catch {
    return initialInstitutionPensums;
  }
}

function writePensums(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // fallback
  }
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: data }));
    });
  }
}

export function useInstitutionPensums() {
  const [pensums, setPensums] = useState(readPensums);

  useEffect(() => {
    function handleSync(event) {
      setPensums(event.detail ?? readPensums());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const savePensum = useCallback((programId, newPensumData) => {
    setPensums((prev) => {
      const existing = prev[programId] || resolvePensum(prev, programId) || {};
      const next = {
        ...prev,
        [programId]: {
          ...existing,
          ...newPensumData,
          id: programId,
          vacanciesDemand: (existing.vacanciesDemand && existing.vacanciesDemand.length > 0)
            ? existing.vacanciesDemand
            : [
                { skill: 'JavaScript', vacanciesCount: 45, category: 'frontend' },
                { skill: 'SQL', vacanciesCount: 40, category: 'database' },
                { skill: 'Python', vacanciesCount: 35, category: 'backend' },
                { skill: 'Git', vacanciesCount: 30, category: 'tools' },
                { skill: 'Docker', vacanciesCount: 25, category: 'devops' },
              ],
          lastUpdated: new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }),
        },
      };
      writePensums(next);
      return next;
    });
  }, []);

  const addSubjectTool = useCallback((programId, semesterNumber, subjectId, newTool) => {
    const cleanTool = typeof newTool === 'string' ? newTool.trim() : '';
    if (!cleanTool) return;

    setPensums((prev) => {
      const prog = prev[programId] || resolvePensum(prev, programId);
      if (!prog) return prev;

      const updatedSemesters = (prog.semesters || []).map((sem) => {
        if (sem.semesterNumber !== semesterNumber) return sem;
        const updatedSubjects = (sem.subjects || []).map((sub) => {
          if (sub.id !== subjectId) return sub;
          const currentTools = Array.isArray(sub.tools) ? sub.tools : [];
          if (currentTools.some((t) => typeof t === 'string' && t.toLowerCase() === cleanTool.toLowerCase())) {
            return sub;
          }
          return { ...sub, tools: [...currentTools, cleanTool] };
        });
        return { ...sem, subjects: updatedSubjects };
      });

      const next = {
        ...prev,
        [programId]: { ...prog, semesters: updatedSemesters },
      };
      writePensums(next);
      return next;
    });
  }, []);

  const removeSubjectTool = useCallback((programId, semesterNumber, subjectId, toolToRemove) => {
    setPensums((prev) => {
      const prog = prev[programId] || resolvePensum(prev, programId);
      if (!prog) return prev;

      const updatedSemesters = (prog.semesters || []).map((sem) => {
        if (sem.semesterNumber !== semesterNumber) return sem;
        const updatedSubjects = (sem.subjects || []).map((sub) => {
          if (sub.id !== subjectId) return sub;
          const currentTools = Array.isArray(sub.tools) ? sub.tools : [];
          return { ...sub, tools: currentTools.filter((t) => t !== toolToRemove) };
        });
        return { ...sem, subjects: updatedSubjects };
      });

      const next = {
        ...prev,
        [programId]: { ...prog, semesters: updatedSemesters },
      };
      writePensums(next);
      return next;
    });
  }, []);

  // Función para calcular la trazabilidad en tiempo real (Match Directo, Equivalente, Brecha)
  const calculateTraceability = useCallback((programId) => {
    const prog = resolvePensum(pensums, programId);
    if (!prog) {
      return {
        coverageScore: 0,
        exactMatches: [],
        equivalentMatches: [],
        criticalGaps: [],
        recommendations: [],
      };
    }

    // Recolectar todas las herramientas y habilidades declaradas en el pensum
    const taughtSkills = [];
    (prog.semesters || []).forEach((sem) => {
      (sem?.subjects || []).forEach((sub) => {
        if (!sub) return;
        if (Array.isArray(sub.tools)) {
          sub.tools.forEach((t) => {
            if (typeof t === 'string' && t.trim()) taughtSkills.push(t.trim());
          });
        }
        if (typeof sub.name === 'string' && sub.name.trim()) {
          taughtSkills.push(sub.name.trim());
        }
      });
    });

    const taughtSkillsLower = taughtSkills
      .filter((s) => typeof s === 'string')
      .map((s) => s.toLowerCase().trim());

    // Asegurar lista de vacantes demandadas
    const fallbackDemand = [
      { skill: 'JavaScript', vacanciesCount: 45, category: 'frontend' },
      { skill: 'SQL', vacanciesCount: 40, category: 'database' },
      { skill: 'Python', vacanciesCount: 35, category: 'backend' },
      { skill: 'Git', vacanciesCount: 30, category: 'tools' },
      { skill: 'APIs REST', vacanciesCount: 28, category: 'backend' },
      { skill: 'PostgreSQL', vacanciesCount: 25, category: 'database' },
      { skill: 'Docker', vacanciesCount: 22, category: 'devops' },
    ];

    const vacanciesDemand = (Array.isArray(prog.vacanciesDemand) && prog.vacanciesDemand.length > 0)
      ? prog.vacanciesDemand
      : fallbackDemand;

    const exactMatches = [];
    const equivalentMatches = [];
    const criticalGaps = [];

    let totalWeight = 0;
    let coveredWeight = 0;

    vacanciesDemand.forEach((dem) => {
      if (!dem || !dem.skill) return;
      const skill = String(dem.skill).trim();
      const count = Number(dem.vacanciesCount) || 1;
      const sLower = skill.toLowerCase();
      totalWeight += count;

      // 1. Match Directo
      const isDirect = taughtSkillsLower.some((ts) => ts === sLower || ts.includes(sLower) || sLower.includes(ts));
      if (isDirect) {
        exactMatches.push({ skill, vacanciesCount: count, matchType: 'exact', label: 'Cubierta en el plan de estudios' });
        coveredWeight += count;
        return;
      }

      // 2. Match por Equivalencia / Familia Tecnológica
      let foundEquiv = null;
      for (const t of taughtSkills) {
        const eqFamily = areToolsEquivalent(t, skill);
        if (eqFamily) {
          foundEquiv = { pensumTool: t, familyName: eqFamily };
          break;
        }
      }

      if (foundEquiv) {
        equivalentMatches.push({
          skill,
          pensumEquivalent: foundEquiv.pensumTool,
          familyName: foundEquiv.familyName,
          vacanciesCount: count,
          matchType: 'equivalent',
          label: `Equivalente tecnológico: se practica con ${foundEquiv.pensumTool}`,
        });
        coveredWeight += count * 0.75;
        return;
      }

      // 3. Brecha Crítica
      criticalGaps.push({
        skill,
        vacanciesCount: count,
        matchType: 'gap',
        label: 'No cubierta en el pensum oficial',
      });
    });

    const score = totalWeight > 0 ? Math.round((coveredWeight / totalWeight) * 100) : 0;

    // Generar recomendaciones automáticas
    const recommendations = [];
    if (criticalGaps.length > 0) {
      recommendations.push(
        `Alta prioridad: '${criticalGaps[0].skill}' se solicita en ${criticalGaps[0].vacanciesCount} vacantes de empresas aliadas pero no figura en el pensum. Se recomienda abrir un módulo práctico o electiva técnica de profundización.`
      );
    }
    if (criticalGaps.length > 1) {
      recommendations.push(
        `Brecha emergente: Se detecta demanda recurrente de '${criticalGaps[1].skill}' (${criticalGaps[1].vacanciesCount} vacantes). Integrar como micro-credencial institucional de fin de carrera.`
      );
    }
    if (equivalentMatches.length > 0) {
      recommendations.push(
        `Alineación práctica: La vacante exige '${equivalentMatches[0].skill}' y en el pensum se practica con '${equivalentMatches[0].pensumEquivalent}'. Incorporar un taller comparativo de 2 semanas para acelerar la colocación laboral de los egresados.`
      );
    }

    return {
      coverageScore: Math.min(100, Math.max(0, score)),
      exactMatches,
      equivalentMatches,
      criticalGaps,
      recommendations,
    };
  }, [pensums]);

  return {
    pensums,
    resolvePensum: (id) => resolvePensum(pensums, id),
    savePensum,
    addSubjectTool,
    removeSubjectTool,
    calculateTraceability,
  };
}
