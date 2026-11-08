import { useState, useMemo } from 'react';
import Chart from 'react-apexcharts';

/**
 * Busca si una tecnología o herramienta específica está asignada a alguna asignatura del pensum.
 */
function findSubjectForSkill(skill, pensum) {
  if (!pensum?.semesters || !skill) return null;
  const needle = skill.toLowerCase().trim();

  for (const sem of pensum.semesters) {
    const subjects = Array.isArray(sem?.subjects) ? sem.subjects : [];
    for (const sub of subjects) {
      const tools = Array.isArray(sub?.tools) ? sub.tools : [];
      const match = tools.some((t) => {
        const toolLower = String(t).toLowerCase().trim();
        return toolLower === needle || toolLower.includes(needle) || needle.includes(toolLower);
      });

      if (match) {
        return {
          subjectName: sub.name,
          subjectCode: sub.code,
          semesterNumber: sem.semesterNumber,
          semesterLabel: sem.label || `Semestre ${sem.semesterNumber}`,
        };
      }
    }
  }
  return null;
}

/**
 * Sugerencia inteligente de anclaje curricular para brechas no presentes en el pensum.
 */
function getSmartCurricularAnchor(skill) {
  const map = {
    javascript: {
      subject: 'Programación Web y Servicios REST',
      semester: 'Semestre VI',
      strategy: 'Integrar como lenguaje base en el frontend del laboratorio práctico.',
    },
    'apis rest': {
      subject: 'Arquitectura y Patrones de Software',
      semester: 'Semestre VI',
      strategy: 'Incorporar diseño de microservicios y consumo de endpoints OpenAPI.',
    },
    'power bi': {
      subject: 'Asignatura Electiva Profesional / Analítica',
      semester: 'Semestre VII - VIII',
      strategy: 'Crear electiva de Inteligencia de Negocios y Tableros de Control Empresariales.',
    },
    aws: {
      subject: 'Computación en la Nube y DevOps',
      semester: 'Semestre VII',
      strategy: 'Activar convenio AWS Academy con créditos de laboratorio para estudiantes.',
    },
    docker: {
      subject: 'Sistemas Operativos y Redes',
      semester: 'Semestre IV - V',
      strategy: 'Añadir módulo de virtualización por contenedores y despliegues CI/CD.',
    },
  };

  const key = skill.toLowerCase().trim();
  return map[key] || {
    subject: 'Electiva de Profundización Tecnológica',
    semester: 'Semestres Avanzados',
    strategy: 'Programar talleres extracurriculares o certificar competencias con convenios.',
  };
}

/**
 * Dashboard Ejecutivo Split de Pertinencia Curricular
 * Integra gráfica horizontal de demanda con ApexCharts y panel interactivo de acciones.
 */
export default function TraceabilityCurriculumViews({
  exactMatches = [],
  equivalentMatches = [],
  criticalGaps = [],
  coverageScore = 69,
  deanshipRecommendations = [],
  activePensum = null,
  onOpenUploadModal,
  onFocusSemester,
}) {
  const [filterTab, setFilterTab] = useState('gaps'); // 'gaps' | 'matches' | 'equivalents' | 'all'

  // Lista unificada de todas las habilidades con metadatos y trazabilidad
  const allSkillsList = useMemo(() => {
    const list = [
      ...criticalGaps.map((item) => ({
        ...item,
        status: 'gap',
        statusLabel: 'Brecha Crítica (No en Pensum)',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
        color: '#e11d48',
        anchor: getSmartCurricularAnchor(item.skill),
        subjectInfo: null,
      })),
      ...exactMatches.map((item) => ({
        ...item,
        status: 'exact',
        statusLabel: 'Match Directo (En Pensum)',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        color: '#28571d',
        subjectInfo: findSubjectForSkill(item.skill, activePensum),
        anchor: null,
      })),
      ...equivalentMatches.map((item) => ({
        ...item,
        status: 'equivalent',
        statusLabel: 'Equivalencia Conceptual (75%)',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        color: '#d99b26',
        subjectInfo: findSubjectForSkill(item.pensumEquivalent || item.skill, activePensum),
        anchor: null,
      })),
    ];

    // Ordenar de mayor a menor demanda de vacantes del mercado
    return list.sort((a, b) => (b.vacanciesCount || 0) - (a.vacanciesCount || 0));
  }, [exactMatches, equivalentMatches, criticalGaps, activePensum]);

  // Totales y estadísticas del mercado laboral
  const totalMarketVacancies = useMemo(() => {
    return allSkillsList.reduce((sum, item) => sum + (item.vacanciesCount || 0), 0) || 365;
  }, [allSkillsList]);

  const coveredVacancies = useMemo(() => {
    return exactMatches.reduce((sum, item) => sum + (item.vacanciesCount || 0), 0) || 252;
  }, [exactMatches]);

  const gapVacancies = useMemo(() => {
    return criticalGaps.reduce((sum, item) => sum + (item.vacanciesCount || 0), 0) || 113;
  }, [criticalGaps]);

  const coveredPercentage = totalMarketVacancies > 0
    ? Math.round((coveredVacancies / totalMarketVacancies) * 100)
    : coverageScore;

  const gapPercentage = 100 - coveredPercentage;

  // Filtrado de habilidades para el panel de tarjetas
  const filteredSkills = useMemo(() => {
    if (filterTab === 'gaps') return allSkillsList.filter((s) => s.status === 'gap');
    if (filterTab === 'matches') return allSkillsList.filter((s) => s.status === 'exact');
    if (filterTab === 'equivalents') return allSkillsList.filter((s) => s.status === 'equivalent');
    return allSkillsList;
  }, [filterTab, allSkillsList]);

  // Configuración de ApexCharts para la gráfica de demanda laboral
  const chartOptions = useMemo(() => {
    const categories = allSkillsList.map((item) => item.skill);
    const colors = allSkillsList.map((item) => item.color);

    return {
      chart: {
        type: 'bar',
        height: 380,
        toolbar: { show: false },
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: '62%',
          distributed: true,
          dataLabels: { position: 'right' },
        },
      },
      colors: colors,
      dataLabels: {
        enabled: true,
        formatter: (val) => `${val} vac.`,
        offsetX: 24,
        style: {
          fontSize: '11px',
          fontWeight: 700,
          colors: ['#051F26'],
        },
      },
      legend: { show: false },
      xaxis: {
        categories: categories,
        max: Math.max(...allSkillsList.map((d) => d.vacanciesCount || 0), 60) + 14,
        labels: {
          formatter: (val) => `${val}`,
          style: { colors: '#64748b', fontSize: '11px', fontWeight: 600 },
        },
      },
      yaxis: {
        labels: {
          style: { colors: '#051F26', fontSize: '11px', fontWeight: 700 },
        },
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val, { dataPointIndex }) => {
            const item = allSkillsList[dataPointIndex];
            const pct = totalMarketVacancies > 0 ? ((val / totalMarketVacancies) * 100).toFixed(1) : 0;
            return `${val} vacantes activas (${pct}% del mercado) · ${item?.statusLabel || ''}`;
          },
        },
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 4,
      },
    };
  }, [allSkillsList, totalMarketVacancies]);

  const series = useMemo(
    () => [
      {
        name: 'Demanda del Mercado',
        data: allSkillsList.map((d) => d.vacanciesCount || 0),
      },
    ],
    [allSkillsList]
  );

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────────────────────
          DASHBOARD SPLIT: GRÁFICA APEXCHARTS + TARJETAS INTELIGENTES
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Panel Izquierdo: Gráfica de Demanda con ApexCharts */}
        <div className="lg:col-span-5 rounded-2xl border border-sand-line bg-white p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-sand-line pb-3">
            <div>
              <h4 className="m-0 font-display text-sm font-bold text-ink">
                Demanda Real de Empresas
              </h4>
              <p className="m-0 text-[0.72rem] text-secondary">
                {totalMarketVacancies} vacantes activas · Ordenadas por demanda
              </p>
            </div>

            {/* Leyenda cromática */}
            <div className="flex items-center gap-2 text-[0.68rem] font-bold">
              <span className="flex items-center gap-1 text-emerald-800">
                <span className="size-2 rounded-full bg-[#28571d]" /> Pensum ({coveredVacancies})
              </span>
              <span className="flex items-center gap-1 text-rose-800">
                <span className="size-2 rounded-full bg-[#e11d48]" /> Brecha ({gapVacancies})
              </span>
            </div>
          </div>

          <div className="relative w-full">
            <Chart options={chartOptions} series={series} type="bar" height={380} width="100%" />
          </div>

          <div className="rounded-xl bg-cream/60 border border-sand-line p-3 text-[0.72rem] text-secondary leading-relaxed">
            <strong className="text-ink">Lectura Ejecutiva:</strong> Las barras rojas representan vacantes que las empresas están publicando actualmente pero que los egresados no tienen en su malla oficial.
          </div>
        </div>

        {/* Panel Derecho: Pestañas Interactivas y Tarjetas Inteligentes */}
        <div className="lg:col-span-7 rounded-2xl border border-sand-line bg-white p-5 shadow-2xs space-y-4">
          {/* Cabecera con selector de Pestañas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sand-line pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterTab('gaps')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'gaps'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <i className="bx bx-error-circle text-sm" />
                <span>Brechas Críticas</span>
                <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[0.65rem]">
                  {criticalGaps.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('matches')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'matches'
                    ? 'bg-green-dark text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <i className="bx bx-check-circle text-sm" />
                <span>Match Directo</span>
                <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[0.65rem]">
                  {exactMatches.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('equivalents')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'equivalents'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <i className="bx bx-git-compare text-sm" />
                <span>Equivalencias</span>
                <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[0.65rem]">
                  {equivalentMatches.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-ink text-white shadow-2xs'
                    : 'text-secondary hover:text-ink'
                }`}
              >
                Todas ({allSkillsList.length})
              </button>
            </div>

            <span className="text-xs text-secondary font-medium hidden sm:inline">
              {filteredSkills.length} mostradas
            </span>
          </div>

          {/* Lista interactiva de tarjetas enriquecidas */}
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredSkills.length === 0 ? (
              <div className="rounded-xl border border-dashed border-sand-line p-8 text-center text-secondary">
                <i className="bx bx-check-double text-3xl text-emerald-600 mb-2 block" />
                <p className="m-0 text-xs font-bold text-ink">
                  No se registran elementos en esta categoría
                </p>
                <p className="m-0 mt-1 text-[0.72rem]">
                  El plan de estudios no presenta desajustes en este segmento.
                </p>
              </div>
            ) : (
              filteredSkills.map((item) => {
                const isGap = item.status === 'gap';
                const isMatch = item.status === 'exact';

                return (
                  <div
                    key={item.skill}
                    className={`rounded-xl border p-3.5 transition-all space-y-2 ${
                      isGap
                        ? 'border-rose-200 bg-rose-50/30 hover:bg-rose-50/60 shadow-2xs'
                        : isMatch
                        ? 'border-emerald-200/70 bg-emerald-50/20 hover:bg-emerald-50/50 shadow-2xs'
                        : 'border-sand-line bg-sand/20 hover:bg-sand/40'
                    }`}
                  >
                    {/* Fila principal */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`size-8 rounded-lg grid place-items-center text-white shrink-0 shadow-2xs ${
                            isGap ? 'bg-rose-600' : isMatch ? 'bg-green-dark' : 'bg-amber-600'
                          }`}
                        >
                          <i
                            className={`bx ${
                              isGap ? 'bx-error-circle' : isMatch ? 'bx-check-circle' : 'bx-git-compare'
                            } text-base`}
                          />
                        </span>
                        <div className="min-w-0">
                          <span className="font-display text-sm font-bold text-ink block truncate">
                            {item.skill}
                          </span>
                          <span className="text-[0.68rem] font-semibold text-secondary">
                            {item.vacanciesCount} vacantes activas en empresas aliadas
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[0.68rem] font-bold px-2 py-0.5 rounded-md border ${item.badgeColor}`}>
                          {isGap ? 'No en Pensum' : isMatch ? '100% Cubierto' : 'Curva Rápida (75%)'}
                        </span>
                      </div>
                    </div>

                    {/* Detalles contextuales según el estado */}
                    {isGap && item.anchor && (
                      <div className="rounded-lg bg-white/90 border border-rose-200/80 p-2.5 text-xs space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[0.7rem] font-bold text-rose-900 flex items-center gap-1">
                            <i className="bx bx-bulb text-amber-600 text-sm" />
                            <span>Sugerencia del Motor IA para la Malla:</span>
                          </span>
                          <span className="text-[0.65rem] font-bold text-secondary bg-cream px-1.5 py-0.5 rounded border border-sand-line">
                            {item.anchor.semester}
                          </span>
                        </div>
                        <p className="m-0 text-[0.72rem] text-ink/80 leading-relaxed">
                          Vincular a <strong className="text-ink">{item.anchor.subject}</strong>. {item.anchor.strategy}
                        </p>

                        <div className="pt-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={onOpenUploadModal}
                            className="text-[0.7rem] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <i className="bx bx-plus-circle" />
                            <span>Incorporar herramienta a esta materia &rarr;</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {isMatch && (
                      <div className="flex items-center justify-between text-xs text-secondary bg-white/80 rounded-lg px-2.5 py-1.5 border border-emerald-200/50">
                        <span className="flex items-center gap-1.5">
                          <i className="bx bxs-book-content text-emerald-700" />
                          <span>
                            {item.subjectInfo ? (
                              <>
                                Impartida en: <strong className="text-ink">{item.subjectInfo.subjectName}</strong> ({item.subjectInfo.semesterLabel})
                              </>
                            ) : (
                              <>Validada en asignaturas troncales del pensum oficial.</>
                            )}
                          </span>
                        </span>
                        <span className="text-[0.68rem] font-bold text-emerald-800">
                          Alineado CNA
                        </span>
                      </div>
                    )}

                    {!isGap && !isMatch && (
                      <div className="text-xs text-secondary bg-white/80 rounded-lg p-2 border border-sand-line">
                        <span>
                          Equivalencia conceptual con <strong className="text-ink">{item.pensumEquivalent || 'tecnología base'}</strong> ({item.familyName || 'Área troncal'}).
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. Recomendaciones del Motor IA para la Decanatura y Comité Curricular
          ───────────────────────────────────────────────────────────────────────────── */}
      {Array.isArray(deanshipRecommendations) && deanshipRecommendations.length > 0 && (
        <div className="rounded-2xl border border-sand-line bg-gradient-to-r from-cream via-sand/40 to-cream p-5 space-y-3">
          <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-terracotta-dark flex items-center gap-2">
            <i className="bx bx-bulb text-base text-ochre" />
            <span>Recomendaciones del Motor IA para la Decanatura y Comité Curricular</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {deanshipRecommendations.map((rec, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 text-xs text-ink/90 bg-white/90 rounded-xl p-3 border border-sand-line/60 shadow-2xs"
              >
                <span className="grid size-5 shrink-0 place-items-center rounded bg-terracotta/10 text-terracotta font-bold text-[0.68rem] mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
