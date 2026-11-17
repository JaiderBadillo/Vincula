/**
 * Informes en Excel por rol. Cada función recibe los datos reales que ya muestra la pantalla
 * (nunca datos de ejemplo) y devuelve la especificación que consume `downloadWorkbook`.
 */

import { exportFilename } from './excelExport.js';

const fraction = (value) => (value === null || value === undefined ? null : value / 100);
const joined = (list) => (Array.isArray(list) ? list.filter(Boolean).join('; ') : '');
const present = (value) => value !== null && value !== undefined;

// ───────────────────────────────────────────────────────────── Administrador de Vincula

export function buildPlatformSummaryReport(metrics, { date = new Date() } = {}) {
  const m = metrics || {};
  const indicators = [
    ['Empresas', 'Registradas', m.totalCompanies],
    ['Empresas', 'Activas (aprobadas)', m.activeCompanies],
    ['Empresas', 'Pendientes de validación', m.pendingCompanies],
    ['Empresas', 'En subsanación', m.correctionCompanies],
    ['Instituciones', 'Registradas', m.totalInstitutionsCount],
    ['Instituciones', 'Activas (aprobadas)', m.activeInstitutions],
    ['Instituciones', 'Pendientes de validación', m.pendingInstitutions],
    ['Instituciones', 'En subsanación', m.correctionInstitutions],
    ['Convenios', 'Convenios activos', m.activeAgreements],
    ['Vacantes', 'Publicadas (total)', m.totalVacancies],
    ['Vacantes', 'Abiertas', m.activeVacancies],
    ['Egresados', 'Egresados conectados', m.graduatesConnected],
    ['Postulaciones', 'Postulaciones registradas', m.totalApplications],
  ].filter(([, , value]) => present(value));
  const kpis = [
    ['Empresas activas', m.activeCompanies], ['Instituciones activas', m.activeInstitutions],
    ['Egresados conectados', m.graduatesConnected], ['Vacantes abiertas', m.activeVacancies],
    ['Postulaciones', m.totalApplications], ['Pendientes por validar', m.totalPendingOverall],
  ].filter(([, value]) => present(value)).map(([label, value]) => ({ label, value, format: 'int' }));

  return {
    filename: exportFilename('Resumen_de_plataforma', date),
    title: 'Resumen de la plataforma',
    subtitle: 'Indicadores generales de Vincula',
    date,
    sheets: [{
      name: 'Resumen',
      title: 'Vincula · Resumen de la plataforma',
      kpis,
      tables: [{
        title: 'Indicadores generales',
        columns: [
          { header: 'Categoría', key: 'category', width: 20 },
          { header: 'Indicador', key: 'indicator', width: 36 },
          { header: 'Valor', key: 'value', format: 'int', width: 14 },
        ],
        rows: indicators.map(([category, indicator, value]) => ({ category, indicator, value })),
      }],
    }],
  };
}

export function buildPeriodicReport({ series, totals, rangeLabel }, { date = new Date() } = {}) {
  return {
    filename: exportFilename(`Metricas_por_periodo_${rangeLabel}`, date),
    title: 'Métricas por periodo',
    subtitle: `Evolución de la plataforma · ${rangeLabel}`,
    date,
    sheets: [{
      name: 'Evolución',
      title: 'Vincula · Evolución por periodo',
      tables: [{
        columns: [
          { header: 'Periodo', key: 'periodLabel', width: 18 },
          { header: 'Nuevas empresas', key: 'newCompanies', format: 'int' },
          { header: 'Nuevas vacantes', key: 'newVacancies', format: 'int' },
          { header: 'Nuevas IES', key: 'newInstitutions', format: 'int' },
          { header: 'Nuevos egresados', key: 'newGraduates', format: 'int' },
          { header: 'Total postulaciones', key: 'totalApplications', format: 'int' },
          { header: 'Crecimiento', key: 'growthRate', align: 'center', value: (row) => row.growthRate || 'N/A' },
        ],
        rows: series,
        totals: { periodLabel: 'TOTAL DEL PERIODO', ...totals, growthRate: '—' },
      }],
    }],
  };
}

// ───────────────────────────────────────────────────────────── Institución: trazabilidad

const COVERAGE = { directa: 'Directa', afin: 'Afín', brecha: 'Brecha' };
const COVERAGE_TONE = { directa: 'good', afin: 'warn', brecha: 'bad' };
const CRITICALITY = { alta: 'Alta', media: 'Media', baja: 'Baja' };
const CRITICALITY_TONE = { alta: 'bad', media: 'warn', baja: 'info' };
const CONFIDENCE = { sin_datos: 'Sin datos', baja: 'Baja', media: 'Media', alta: 'Alta' };
const CATEGORY = { tecnica: 'Técnica', blanda: 'Blanda' };

export function buildTraceabilityReport({ report, outcomes, institutionName }, { date = new Date() } = {}) {
  const program = report.programa_nombre;
  const hasSample = Boolean(outcomes?.muestra_suficiente);
  const minimum = outcomes?.minimo_muestra ?? 10;
  const insufficient = `Muestra insuficiente (mínimo ${minimum} postulaciones)`;

  const noIndex = report.indice_pertinencia === null || report.indice_pertinencia === undefined;
  const okOffer = hasSample && present(outcomes?.dias_mediana_oferta);
  const okHire = hasSample && present(outcomes?.dias_mediana_contratacion);
  // [indicador, valor, formato]: el formato va por fila porque la columna mezcla textos, enteros y porcentajes.
  const alignment = [
    ['Programa', program],
    ['Ciclo propedéutico previo', report.programa_previo_nombre || 'No aplica'],
    ['Versión de la malla', report.pensum_version || 'Sin malla registrada'],
    ['Semestres de la malla', report.total_semestres, 'int'],
    ['Asignaturas de la malla', report.total_asignaturas, 'int'],
    ['Vacantes abiertas en la plataforma', report.total_vacantes_abiertas, 'int'],
    ['Vacantes dirigidas al programa (analizadas)', report.total_vacantes_analizadas, 'int'],
    ['Vacantes con alta cobertura de la malla', report.vacantes_alta_cobertura, 'int'],
    ['Índice de alineación', noIndex ? 'Sin datos para medir' : fraction(report.indice_pertinencia), noIndex ? undefined : 'pct'],
    ['Nivel de alineación', report.nivel_pertinencia],
    ['Confianza de la medición', CONFIDENCE[report.confianza] || report.confianza],
  ];
  const results = outcomes ? [
    ['Egresados registrados en el programa', outcomes.egresados_registrados, 'int'],
    ['Egresados que se postularon', outcomes.egresados_postulados, 'int'],
    ['Egresados contratados', outcomes.egresados_contratados, 'int'],
    ['Postulaciones totales', outcomes.total_postulaciones, 'int'],
    ['Postulaciones descartadas', outcomes.postulaciones_descartadas, 'int'],
    ['Tasa de contratación', hasSample ? fraction(outcomes.tasa_contratacion) : insufficient, hasSample ? 'pct' : undefined],
    ['Días hasta la oferta (mediana)', okOffer ? outcomes.dias_mediana_oferta : insufficient, okOffer ? 'dec' : undefined],
    ['Días hasta la contratación (mediana)', okHire ? outcomes.dias_mediana_contratacion : insufficient, okHire ? 'dec' : undefined],
    ['Afinidad promedio de los contratados', present(outcomes.afinidad_promedio_contratados) ? fraction(outcomes.afinidad_promedio_contratados) : 'Sin datos', present(outcomes.afinidad_promedio_contratados) ? 'pct' : undefined],
    ['Afinidad promedio de los descartados', present(outcomes.afinidad_promedio_descartados) ? fraction(outcomes.afinidad_promedio_descartados) : 'Sin datos', present(outcomes.afinidad_promedio_descartados) ? 'pct' : undefined],
  ] : [];

  const valueColumn = { header: 'Valor', key: 'value', width: 34, align: 'left', format: (_, row) => row.fmt };
  const asRows = (list) => list.map(([label, value, fmt]) => ({ label, value, fmt }));
  const sheets = [{
    name: 'Resumen',
    title: `Vincula · Trazabilidad curricular · ${program}`,
    subtitle: institutionName,
    notes: [
      'El índice de alineación mide cuánto respaldan las asignaturas del programa las competencias técnicas que piden las vacantes abiertas dirigidas a él. Las competencias blandas no entran al índice.',
      `Las tasas y medianas de egresados solo se publican con al menos ${minimum} postulaciones; con menos datos no representan al programa.`,
    ],
    kpis: [
      { label: 'Índice de alineación', value: report.indice_pertinencia === null || report.indice_pertinencia === undefined ? 'Sin datos' : fraction(report.indice_pertinencia), format: report.indice_pertinencia === null || report.indice_pertinencia === undefined ? undefined : 'pct' },
      { label: 'Vacantes analizadas', value: report.total_vacantes_analizadas, format: 'int' },
      ...(outcomes ? [{ label: 'Egresados contratados', value: outcomes.egresados_contratados, format: 'int' },
        { label: 'Postulaciones', value: outcomes.total_postulaciones, format: 'int' }] : []),
    ],
    tables: [
      { title: 'Alineación malla–demanda', columns: [{ header: 'Indicador', key: 'label', width: 44 }, valueColumn], rows: asRows(alignment) },
      ...(outcomes ? [{ title: 'Resultados de los egresados', columns: [{ header: 'Indicador', key: 'label', width: 44 }, valueColumn], rows: asRows(results) }] : []),
    ],
  }];
  if (outcomes) {
    const total = outcomes.embudo?.[0]?.postulaciones || 0;
    sheets.push({
      name: 'Embudo',
      title: `Vincula · Embudo de selección · ${program}`,
      subtitle: institutionName,
      tables: [{
        title: 'Postulaciones que alcanzaron cada fase',
        columns: [
          { header: 'Fase', key: 'etiqueta', width: 28 },
          { header: 'Postulaciones', key: 'postulaciones', format: 'int' },
          { header: '% del total', key: 'pct', format: 'pct' },
        ],
        rows: (outcomes.embudo || []).map((s) => ({ ...s, pct: total ? s.postulaciones / total : null })),
      }, {
        title: 'Motivos de descarte',
        columns: [
          { header: 'Motivo', key: 'motivo', width: 56 },
          { header: 'Postulaciones', key: 'postulaciones', format: 'int' },
        ],
        rows: outcomes.motivos_descarte || [],
      }],
    });
  }

  sheets.push({
    name: 'Demanda vs malla',
    title: `Vincula · Demanda del mercado vs malla · ${program}`,
    subtitle: institutionName,
    notes: ['Directa: la malla enseña la competencia. Afín: la malla enseña algo cercano. Brecha: la malla no la respalda.'],
    tables: [{
      columns: [
        { header: 'Competencia', key: 'skill', width: 30 },
        { header: 'Tipo', key: 'categoria', width: 11, value: (r) => CATEGORY[r.categoria] || r.categoria },
        { header: 'Vacantes que la piden', key: 'vacantes', format: 'int' },
        { header: '% de las vacantes', key: 'pct', format: 'pct', value: (r) => fraction(r.porcentaje_vacantes) },
        { header: 'Obligatoria en', key: 'obligatoria_en', format: 'int' },
        { header: 'Cobertura', key: 'cobertura', width: 13, value: (r) => COVERAGE[r.cobertura] || r.cobertura, tone: (_, r) => COVERAGE_TONE[r.cobertura] },
        { header: 'Área de formación', key: 'area', width: 28 },
        { header: 'Asignaturas que la respaldan', key: 'asignaturas', width: 46, value: (r) => joined((r.asignaturas || []).map((a) => `${a.nombre} (sem. ${a.semestre})`)) },
        { header: 'Criticidad de la brecha', key: 'criticidad', width: 14, value: (r) => (r.criticidad ? CRITICALITY[r.criticidad] : ''), tone: (_, r) => (r.criticidad ? CRITICALITY_TONE[r.criticidad] : undefined) },
      ],
      rows: report.demanda || [],
    }],
  });

  sheets.push({
    name: 'Áreas de formación',
    title: `Vincula · Áreas de formación · ${program}`,
    subtitle: institutionName,
    tables: [{
      columns: [
        { header: 'Área', key: 'area', width: 40 },
        { header: 'Asignaturas que la enseñan', key: 'asignaturas', format: 'int' },
        { header: 'Vacantes que la piden', key: 'vacantes', format: 'int' },
      ],
      rows: report.areas_formacion || [],
    }],
  });

  const subjects = (report.semestres || []).flatMap((sem) => (sem.asignaturas || []).map((a) => ({
    semestre: sem.numero_semestre, origen: sem.programa_origen || program, ...a,
  })));
  sheets.push({
    name: 'Malla curricular',
    title: `Vincula · Malla curricular · ${program}`,
    subtitle: [institutionName, report.programa_previo_nombre ? `Incluye el ciclo previo: ${report.programa_previo_nombre}` : null].filter(Boolean).join(' · '),
    tables: [{
      columns: [
        { header: 'Semestre', key: 'semestre', format: 'int', width: 11 },
        { header: 'Programa de origen', key: 'origen', width: 32 },
        { header: 'Código', key: 'codigo', width: 12 },
        { header: 'Asignatura', key: 'nombre', width: 44 },
        { header: 'Créditos', key: 'creditos', format: 'int' },
        { header: 'Área', key: 'familia', width: 30 },
        { header: 'Competencias asociadas', key: 'skills', width: 44, value: (a) => joined(a.skills) },
        { header: 'Herramientas declaradas', key: 'herramientas', width: 34, value: (a) => joined(a.herramientas) },
      ],
      rows: subjects,
      totals: { semestre: 'TOTAL', creditos: subjects.reduce((sum, a) => sum + (a.creditos || 0), 0) },
    }],
  });

  return { filename: exportFilename(`Trazabilidad_${program}`, date), title: `Trazabilidad curricular · ${program}`, subtitle: institutionName, date, sheets };
}

// ───────────────────────────────────────────────────────────── Empresa

const VACANCY_STATUS = {
  open: ['Abierta', 'good'], paused: ['Pausada', 'warn'], draft: ['Borrador', 'info'], closed: ['Cerrada', undefined], disabled: ['Inhabilitada', 'bad'],
};
const MODALITY = { presencial: 'Presencial', hibrido: 'Híbrido', 'híbrido': 'Híbrido', remoto: 'Remoto' };

export function buildVacanciesReport(vacancies, { companyName, sitesById = {}, recruitersById = {} } = {}, { date = new Date() } = {}) {
  const count = (status) => vacancies.filter((v) => v.status === status).length;
  const applicants = vacancies.reduce((sum, v) => sum + (v.applicantsCount || 0), 0);
  const byStatus = Object.entries(VACANCY_STATUS).map(([status, [label]]) => ({
    label, count: count(status), applicants: vacancies.filter((v) => v.status === status).reduce((sum, v) => sum + (v.applicantsCount || 0), 0),
  })).filter((row) => row.count > 0);

  return {
    filename: exportFilename(`Vacantes_${companyName || ''}`, date),
    title: 'Vacantes',
    subtitle: companyName,
    date,
    sheets: [{
      name: 'Resumen',
      title: 'Vincula · Resumen de vacantes',
      kpis: [
        { label: 'Vacantes', value: vacancies.length, format: 'int' },
        { label: 'Abiertas', value: count('open'), format: 'int' },
        { label: 'Postulaciones recibidas', value: applicants, format: 'int' },
        { label: 'Promedio por vacante', value: vacancies.length ? applicants / vacancies.length : 0, format: 'dec' },
      ],
      tables: [{
        title: 'Vacantes por estado',
        columns: [
          { header: 'Estado', key: 'label', width: 22 },
          { header: 'Vacantes', key: 'count', format: 'int' },
          { header: 'Postulaciones', key: 'applicants', format: 'int' },
        ],
        rows: byStatus,
        totals: { label: 'TOTAL', count: vacancies.length, applicants },
      }],
    }, {
      name: 'Vacantes',
      title: 'Vincula · Detalle de vacantes',
      tables: [{
        columns: [
          { header: 'Código', key: 'code', width: 17 },
          { header: 'Vacante', key: 'title', width: 36 },
          { header: 'Estado', key: 'status', width: 13, value: (v) => (VACANCY_STATUS[v.status] || [v.status])[0], tone: (_, v) => (VACANCY_STATUS[v.status] || [])[1] },
          { header: 'Categoría', key: 'category', width: 24 },
          { header: 'Sede', key: 'site', width: 24, value: (v) => sitesById[v.siteId] || '' },
          { header: 'Responsable', key: 'owner', width: 26, value: (v) => recruitersById[v.ownerRecruiterId] || 'Sin asignar' },
          { header: 'Modalidad', key: 'modality', width: 13, value: (v) => MODALITY[v.modality] || v.modality },
          { header: 'Tipo de contrato', key: 'contractType', width: 22 },
          { header: 'Salario', key: 'salary', width: 26 },
          { header: 'Cupos', key: 'openSpots', format: 'int' },
          { header: 'Postulaciones', key: 'applicantsCount', format: 'int' },
          { header: 'Publicada', key: 'publishedAt', format: 'date', width: 13 },
          { header: 'Cierre', key: 'closingDate', format: 'date', width: 13 },
          { header: 'Programas dirigidos', key: 'targetPrograms', width: 40, value: (v) => joined(v.targetPrograms) },
          { header: 'Competencias técnicas', key: 'skillsTech', width: 44, value: (v) => joined(v.skillsTech) },
        ],
        rows: vacancies,
        totals: { code: 'TOTAL', openSpots: vacancies.reduce((s, v) => s + (v.openSpots || 0), 0), applicantsCount: applicants },
      }],
    }],
  };
}

const STAGES = [
  ['review', 'En revisión'], ['preselected', 'Preseleccionado'], ['evaluation', 'Prueba técnica'],
  ['interview', 'Entrevista'], ['offer', 'Oferta / finalista'], ['hired', 'Contratado'], ['discarded', 'Descartado'],
];

export function buildCandidatesReport(candidates, { companyName } = {}, { date = new Date() } = {}) {
  const stageLabel = Object.fromEntries(STAGES);
  const avg = candidates.filter((c) => present(c.matchPercentage));
  const averageMatch = avg.length ? avg.reduce((s, c) => s + c.matchPercentage, 0) / avg.length / 100 : null;
  const byVacancy = [...candidates.reduce((map, c) => {
    const row = map.get(c.vacancyId) || { title: c.vacancyTitle, code: c.vacancyCode, total: 0, hired: 0, matchSum: 0, matchN: 0 };
    row.total += 1;
    row.hired += c.stage === 'hired' ? 1 : 0;
    if (present(c.matchPercentage)) { row.matchSum += c.matchPercentage; row.matchN += 1; }
    return map.set(c.vacancyId, row);
  }, new Map()).values()].map((r) => ({ ...r, match: r.matchN ? r.matchSum / r.matchN / 100 : null }));
  const matchTone = (value) => (value >= 0.8 ? 'good' : value >= 0.6 ? 'warn' : 'bad');

  return {
    filename: exportFilename(`Candidatos_${companyName || ''}`, date),
    title: 'Candidatos',
    subtitle: companyName,
    date,
    sheets: [{
      name: 'Resumen',
      title: 'Vincula · Resumen de candidatos',
      kpis: [
        { label: 'Candidatos', value: candidates.length, format: 'int' },
        { label: 'Contratados', value: candidates.filter((c) => c.stage === 'hired').length, format: 'int' },
        { label: 'Descartados', value: candidates.filter((c) => c.stage === 'discarded').length, format: 'int' },
        { label: 'Afinidad promedio', value: averageMatch === null ? 'Sin datos' : averageMatch, format: averageMatch === null ? undefined : 'pct' },
      ],
      tables: [{
        title: 'Embudo por fase',
        columns: [
          { header: 'Fase', key: 'label', width: 24 },
          { header: 'Candidatos', key: 'count', format: 'int' },
          { header: '% del total', key: 'pct', format: 'pct' },
        ],
        rows: STAGES.map(([id, label]) => {
          const n = candidates.filter((c) => c.stage === id).length;
          return { label, count: n, pct: candidates.length ? n / candidates.length : null };
        }).filter((r) => r.count > 0),
        totals: { label: 'TOTAL', count: candidates.length },
      }, {
        title: 'Por vacante',
        columns: [
          { header: 'Vacante', key: 'title', width: 36 },
          { header: 'Código', key: 'code', width: 17 },
          { header: 'Candidatos', key: 'total', format: 'int' },
          { header: 'Contratados', key: 'hired', format: 'int' },
          { header: 'Afinidad promedio', key: 'match', format: 'pct', tone: (v) => (v === null ? undefined : matchTone(v)) },
        ],
        rows: byVacancy,
      }],
    }, {
      name: 'Candidatos',
      title: 'Vincula · Detalle de candidatos',
      tables: [{
        columns: [
          { header: 'Candidato', key: 'candidateName', width: 30 },
          { header: 'Correo', key: 'email', width: 30 },
          { header: 'Teléfono', key: 'phone', width: 15 },
          { header: 'Ciudad', key: 'city', width: 16 },
          { header: 'Programa', key: 'program', width: 32 },
          { header: 'Institución', key: 'institution', width: 28 },
          { header: 'Año de grado', key: 'graduationYear', width: 12, align: 'center' },
          { header: 'Vacante', key: 'vacancyTitle', width: 32 },
          { header: 'Código', key: 'vacancyCode', width: 17 },
          { header: 'Fase', key: 'stage', width: 18, value: (c) => stageLabel[c.stage] || c.stage },
          { header: 'Afinidad', key: 'matchPercentage', format: 'pct', value: (c) => fraction(c.matchPercentage), tone: (v) => (v === null ? undefined : matchTone(v)) },
          { header: 'Postulado', key: 'appliedAt', format: 'date', width: 13 },
          { header: 'Competencias cumplidas', key: 'skillsMatch', width: 40, value: (c) => joined(c.skillsMatch) },
          { header: 'Competencias faltantes', key: 'missingSkills', width: 40, value: (c) => joined(c.missingSkills) },
          { header: 'Motivo de descarte', key: 'rejectionReason', width: 36 },
        ],
        rows: candidates,
      }],
    }],
  };
}
