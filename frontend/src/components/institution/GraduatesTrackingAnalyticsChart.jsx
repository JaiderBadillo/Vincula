import { useMemo, useState } from 'react';

export default function GraduatesTrackingAnalyticsChart({
  graduates = [],
  onApplyFilterToTable,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState('byProgram'); // 'byProgram' | 'byCohort' | 'vinculaImpact'

  // Filtros internos del módulo gráfico
  const [chartCohort, setChartCohort] = useState('all');
  const [chartProgram, setChartProgram] = useState('all');
  const [chartChannel, setChartChannel] = useState('all'); // 'all' | 'vincula' | 'external'
  const [chartStatus, setChartStatus] = useState('all'); // 'all' | 'employed' | 'seeking'

  const [hoveredItem, setHoveredItem] = useState(null);

  // Listas únicas para dropdowns
  const availableCohorts = useMemo(() => {
    const list = [...new Set(graduates.map((g) => g.graduationPeriod))];
    return list.sort().reverse();
  }, [graduates]);

  const availablePrograms = useMemo(() => {
    const list = [...new Set(graduates.map((g) => g.program))];
    return list.sort((a, b) => a.localeCompare(b, 'es'));
  }, [graduates]);

  // Filtro reactivo de la muestra analizada en el gráfico
  const filteredData = useMemo(() => {
    return graduates.filter((g) => {
      // Filtro por cohorte
      if (chartCohort !== 'all' && g.graduationPeriod !== chartCohort) return false;

      // Filtro por programa
      if (chartProgram !== 'all' && g.program !== chartProgram) return false;

      // Filtro por estado laboral
      if (chartStatus !== 'all' && g.status !== chartStatus) return false;

      // Filtro por canal (Vincula vs Externo)
      if (chartChannel !== 'all') {
        const isEmployed = g.status === 'employed';
        const isVincula =
          isEmployed &&
          (g.employmentDetails?.placedViaVincula ??
            g.applications?.some((a) => a.outcome === 'hired'));

        if (chartChannel === 'vincula' && !isVincula) return false;
        if (chartChannel === 'external' && (!isEmployed || isVincula)) return false;
      }

      return true;
    });
  }, [graduates, chartCohort, chartProgram, chartStatus, chartChannel]);

  // Métricas agregadas de la muestra filtrada
  const stats = useMemo(() => {
    const total = filteredData.length;
    const employed = filteredData.filter((g) => g.status === 'employed');
    const seeking = filteredData.filter((g) => g.status === 'seeking');

    const vinculaPlaced = employed.filter(
      (g) =>
        g.employmentDetails?.placedViaVincula ??
        g.applications?.some((a) => a.outcome === 'hired')
    );
    const externalPlaced = employed.filter(
      (g) =>
        !(
          g.employmentDetails?.placedViaVincula ??
          g.applications?.some((a) => a.outcome === 'hired')
        )
    );

    const employmentRate = total > 0 ? Math.round((employed.length / total) * 100) : 0;
    const vinculaShareOfEmployed =
      employed.length > 0
        ? Math.round((vinculaPlaced.length / employed.length) * 100)
        : 0;

    return {
      total,
      employedCount: employed.length,
      seekingCount: seeking.length,
      vinculaCount: vinculaPlaced.length,
      externalCount: externalPlaced.length,
      employmentRate,
      vinculaShareOfEmployed,
    };
  }, [filteredData]);

  // Agrupamiento 1: Por Programa Académico
  const programGroups = useMemo(() => {
    const map = new Map();

    filteredData.forEach((g) => {
      if (!map.has(g.program)) {
        map.set(g.program, {
          name: g.program,
          total: 0,
          employed: 0,
          seeking: 0,
          vincula: 0,
          external: 0,
        });
      }
      const entry = map.get(g.program);
      entry.total += 1;
      if (g.status === 'employed') {
        entry.employed += 1;
        const isVincula =
          g.employmentDetails?.placedViaVincula ??
          g.applications?.some((a) => a.outcome === 'hired');
        if (isVincula) {
          entry.vincula += 1;
        } else {
          entry.external += 1;
        }
      } else {
        entry.seeking += 1;
      }
    });

    const list = Array.from(map.values());
    return list.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'es'));
  }, [filteredData]);

  // Agrupamiento 2: Por Cohorte / Corte de Graduación
  const cohortGroups = useMemo(() => {
    const map = new Map();

    filteredData.forEach((g) => {
      if (!map.has(g.graduationPeriod)) {
        map.set(g.graduationPeriod, {
          cohort: g.graduationPeriod,
          total: 0,
          employed: 0,
          seeking: 0,
          vincula: 0,
          external: 0,
        });
      }
      const entry = map.get(g.graduationPeriod);
      entry.total += 1;
      if (g.status === 'employed') {
        entry.employed += 1;
        const isVincula =
          g.employmentDetails?.placedViaVincula ??
          g.applications?.some((a) => a.outcome === 'hired');
        if (isVincula) {
          entry.vincula += 1;
        } else {
          entry.external += 1;
        }
      } else {
        entry.seeking += 1;
      }
    });

    const list = Array.from(map.values());
    return list.sort((a, b) => a.cohort.localeCompare(b.cohort, 'es'));
  }, [filteredData]);

  const activeFiltersCount =
    (chartCohort !== 'all' ? 1 : 0) +
    (chartProgram !== 'all' ? 1 : 0) +
    (chartChannel !== 'all' ? 1 : 0) +
    (chartStatus !== 'all' ? 1 : 0);

  function handleResetFilters() {
    setChartCohort('all');
    setChartProgram('all');
    setChartChannel('all');
    setChartStatus('all');
  }

  return (
    <section
      aria-label="Analítica de inserción laboral de egresados"
      className="rounded-2xl border border-line bg-white shadow-xs overflow-hidden transition-all duration-300"
    >
      {/* ─── Encabezado Principal y Toggle Expandir/Contraer ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:px-6 border-b border-line-soft bg-page/40">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-ink text-lime text-xl shrink-0 shadow-xs">
            <i className="bx bx-bar-chart-alt-2" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="m-0 font-display text-base sm:text-lg font-bold text-ink">
                Analítica de Inserción Laboral y Efectividad Vincula
              </h2>
              <span className="rounded-full bg-lime/25 border border-lime/60 px-2.5 py-0.5 text-[0.62rem] font-bold text-ink">
                En vivo
              </span>
            </div>
            <p className="m-0 text-xs text-body-muted mt-0.5">
              Comparativa de egresados con empleo vs búsqueda activa, desglose por carrera, cortes y colocación institucional.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Pestañas de modo de visualización */}
          <div className="flex rounded-xl border border-line bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setViewMode('byProgram');
                if (!isExpanded) setIsExpanded(true);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'byProgram' && isExpanded
                  ? 'bg-ink text-white font-bold shadow-xs'
                  : 'text-secondary hover:text-ink'
              }`}
              title="Ver gráfico comparativo por Carreras / Programas"
            >
              <i className="bx bx-book mr-1" />
              Por Carrera
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('byCohort');
                if (!isExpanded) setIsExpanded(true);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'byCohort' && isExpanded
                  ? 'bg-ink text-white font-bold shadow-xs'
                  : 'text-secondary hover:text-ink'
              }`}
              title="Ver gráfico comparativo por Cortes / Cohortes de graduación"
            >
              <i className="bx bx-calendar mr-1" />
              Por Cohorte
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('vinculaImpact');
                if (!isExpanded) setIsExpanded(true);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'vinculaImpact' && isExpanded
                  ? 'bg-ink text-white font-bold shadow-xs'
                  : 'text-secondary hover:text-ink'
              }`}
              title="Ver impacto del canal Vincula UTS (Bolsa de Empleo)"
            >
              <i className="bx bx-pie-chart-alt-2 mr-1" />
              Canal Vincula
            </button>
          </div>

          {/* Toggle colapsar/expandir */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="grid size-9 place-items-center rounded-xl border border-line bg-white text-secondary hover:text-ink hover:bg-page transition-colors cursor-pointer shadow-2xs"
            title={isExpanded ? 'Contraer panel de gráficos' : 'Expandir panel de gráficos'}
          >
            <i className={`bx ${isExpanded ? 'bx-chevron-up' : 'bx-chevron-down'} text-xl`} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* ─── Barra de Filtros Dedicada de la Gráfica ─── */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-page/60 p-3.5 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-ink inline-flex items-center gap-1.5 text-xs">
                <i className="bx bx-filter text-green-dark text-base" />
                Filtrar analítica:
              </span>

              {/* Filtro por Cohorte */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="chart-cohort-select" className="text-secondary font-medium">
                  Corte:
                </label>
                <select
                  id="chart-cohort-select"
                  value={chartCohort}
                  onChange={(e) => setChartCohort(e.target.value)}
                  className="rounded-lg border border-line bg-white px-2.5 py-1.5 font-semibold text-ink outline-none cursor-pointer hover:border-green focus:border-green shadow-2xs"
                >
                  <option value="all">Todas las cohortes ({availableCohorts.length})</option>
                  {availableCohorts.map((c) => (
                    <option key={c} value={c}>
                      Cohorte {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Carrera / Programa */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="chart-program-select" className="text-secondary font-medium">
                  Carrera:
                </label>
                <select
                  id="chart-program-select"
                  value={chartProgram}
                  onChange={(e) => setChartProgram(e.target.value)}
                  className="max-w-[14rem] truncate rounded-lg border border-line bg-white px-2.5 py-1.5 font-semibold text-ink outline-none cursor-pointer hover:border-green focus:border-green shadow-2xs"
                >
                  <option value="all">Todas las carreras ({availablePrograms.length})</option>
                  {availablePrograms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Canal de Colocación (Vincula vs Externo) */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="chart-channel-select" className="text-secondary font-medium">
                  Canal:
                </label>
                <select
                  id="chart-channel-select"
                  value={chartChannel}
                  onChange={(e) => setChartChannel(e.target.value)}
                  className="rounded-lg border border-line bg-white px-2.5 py-1.5 font-semibold text-ink outline-none cursor-pointer hover:border-green focus:border-green shadow-2xs"
                >
                  <option value="all">Todos los canales</option>
                  <option value="vincula">Colocados vía Vincula UTS</option>
                  <option value="external">Colocación Externa / Directa</option>
                </select>
              </div>

              {/* Filtro por Estado */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="chart-status-select" className="text-secondary font-medium">
                  Estado:
                </label>
                <select
                  id="chart-status-select"
                  value={chartStatus}
                  onChange={(e) => setChartStatus(e.target.value)}
                  className="rounded-lg border border-line bg-white px-2.5 py-1.5 font-semibold text-ink outline-none cursor-pointer hover:border-green focus:border-green shadow-2xs"
                >
                  <option value="all">Todos los estados</option>
                  <option value="employed">Solo con Empleo</option>
                  <option value="seeking">Solo en Búsqueda</option>
                </select>
              </div>
            </div>

            {/* Acciones de Reseteo y Sincronización */}
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 underline font-semibold cursor-pointer"
                >
                  <i className="bx bx-x text-sm" />
                  <span>Restablecer ({activeFiltersCount})</span>
                </button>
              )}

              {onApplyFilterToTable && (
                <button
                  type="button"
                  onClick={() =>
                    onApplyFilterToTable({
                      program: chartProgram,
                      cohort: chartCohort,
                      status: chartStatus,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink hover:bg-ink-soft text-lime px-3 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer ml-1"
                  title="Aplica los filtros de este gráfico a la tabla inferior de egresados"
                >
                  <i className="bx bx-transfer-alt text-sm" />
                  <span>Sincronizar con tabla</span>
                </button>
              )}
            </div>
          </div>

          {/* ─── Fila de Mini-KPIs Dinámicos de la Muestra Filtrada ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Analizados */}
            <div className="rounded-xl border border-line bg-page/30 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary block">
                  Muestra Analizada
                </span>
                <span className="text-2xl font-black font-display text-ink block mt-0.5">
                  {stats.total}
                </span>
                <span className="text-[0.65rem] text-body-muted">egresados registrados</span>
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-panel text-ink text-lg">
                <i className="bx bx-group" />
              </div>
            </div>

            {/* Con Empleo (Tasa General) */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-emerald-800 block">
                  Con Empleo ({stats.employmentRate}%)
                </span>
                <span className="text-2xl font-black font-display text-emerald-900 block mt-0.5">
                  {stats.employedCount}
                </span>
                <span className="text-[0.65rem] text-emerald-700 font-medium">vinculados al mercado</span>
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800 text-lg">
                <i className="bx bx-briefcase-alt-2" />
              </div>
            </div>

            {/* Colocados por Vincula UTS */}
            <div className="rounded-xl border border-lime/70 bg-gradient-to-br from-lime/15 via-white to-white p-3.5 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-green-dark block flex items-center gap-1">
                  <i className="bx bxs-badge-check text-green" />
                  Vía Vincula UTS
                </span>
                <span className="text-2xl font-black font-display text-ink block mt-0.5">
                  {stats.vinculaCount}
                </span>
                <span className="text-[0.65rem] text-body-muted">
                  <strong className="text-green-dark">{stats.vinculaShareOfEmployed}%</strong> de los colocados
                </span>
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-ink text-lime text-lg">
                <i className="bx bxs-bolt" />
              </div>
            </div>

            {/* En Búsqueda Activa */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-amber-800 block">
                  En Búsqueda ({100 - stats.employmentRate}%)
                </span>
                <span className="text-2xl font-black font-display text-amber-900 block mt-0.5">
                  {stats.seekingCount}
                </span>
                <span className="text-[0.65rem] text-amber-700 font-medium">requieren intermediación</span>
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-800 text-lg">
                <i className="bx bx-user-voice" />
              </div>
            </div>
          </div>

          {/* ─── Leyenda Semántica Institucional ─── */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-secondary border-t border-line-soft">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-semibold text-ink text-xs">Convención de colores:</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-lime border border-ink/40 shadow-2xs" />
                <span className="text-ink font-semibold">Conseguido por Vincula UTS</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-emerald-600" />
                <span className="text-ink font-semibold">Con Empleo (Canal Externo/Directo)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-amber-500" />
                <span className="text-ink font-semibold">En Búsqueda Activa</span>
              </span>
            </div>

            <span className="text-[0.68rem] text-secondary italic">
              Pasa el cursor sobre las barras o segmentos para inspeccionar detalles numéricos.
            </span>
          </div>

          {/* ─── ÁREA DEL GRÁFICO SVG INTERACTIVO ─── */}

          {/* VISTA 1: BARRAS COMPARATIVAS POR CARRERA / PROGRAMA */}
          {viewMode === 'byProgram' && (
            <div className="space-y-4">
              {programGroups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line bg-page/40 p-8 text-center text-xs text-secondary">
                  No hay egresados que coincidan con la combinación de filtros seleccionada.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {programGroups.map((p) => {
                    const rate = p.total > 0 ? Math.round((p.employed / p.total) * 100) : 0;
                    const vinculaPct = p.total > 0 ? (p.vincula / p.total) * 100 : 0;
                    const externalPct = p.total > 0 ? (p.external / p.total) * 100 : 0;
                    const seekingPct = p.total > 0 ? (p.seeking / p.total) * 100 : 0;

                    const isHovered = hoveredItem === p.name;

                    return (
                      <div
                        key={p.name}
                        onMouseEnter={() => setHoveredItem(p.name)}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`rounded-xl border p-4 transition-all duration-200 ${
                          isHovered
                            ? 'border-green-dark bg-emerald-50/20 shadow-xs'
                            : 'border-line bg-white hover:border-line-soft'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-sm font-bold text-ink">
                              {p.name}
                            </span>
                            <span className="rounded-full bg-page border border-line px-2 py-0.2 text-[0.65rem] font-bold text-secondary">
                              {p.total} {p.total === 1 ? 'egresado' : 'egresados'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-secondary font-medium">
                              Tasa de Empleo: <strong className="text-ink">{rate}%</strong>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-lime/30 px-2 py-0.5 text-[0.68rem] font-bold text-ink border border-lime/60">
                              <i className="bx bxs-bolt text-xs" />
                              {p.vincula} vía Vincula
                            </span>
                          </div>
                        </div>

                        {/* Barra Apilada Proporcional */}
                        <div
                          className="relative h-6 w-full rounded-lg bg-page overflow-hidden flex shadow-inner cursor-pointer"
                          title={`${p.name}: ${p.vincula} por Vincula, ${p.external} externos, ${p.seeking} en búsqueda`}
                        >
                          {/* Segmento 1: Vincula UTS (Verde Lima) */}
                          {vinculaPct > 0 && (
                            <div
                              style={{ width: `${vinculaPct}%` }}
                              className="h-full bg-lime border-r border-ink/20 flex items-center justify-center text-[0.65rem] font-black text-ink transition-all duration-500 hover:brightness-105"
                            >
                              {vinculaPct >= 12 && `${p.vincula} Vincula`}
                            </div>
                          )}

                          {/* Segmento 2: Externo (Verde Esmeralda) */}
                          {externalPct > 0 && (
                            <div
                              style={{ width: `${externalPct}%` }}
                              className="h-full bg-emerald-600 border-r border-white/20 flex items-center justify-center text-[0.65rem] font-bold text-white transition-all duration-500 hover:brightness-105"
                            >
                              {externalPct >= 12 && `${p.external} Ext.`}
                            </div>
                          )}

                          {/* Segmento 3: En Búsqueda (Ámbar) */}
                          {seekingPct > 0 && (
                            <div
                              style={{ width: `${seekingPct}%` }}
                              className="h-full bg-amber-500 flex items-center justify-center text-[0.65rem] font-bold text-white transition-all duration-500 hover:brightness-105"
                            >
                              {seekingPct >= 12 && `${p.seeking} Buscando`}
                            </div>
                          )}
                        </div>

                        {/* Resumen al pie de la barra */}
                        <div className="mt-2 flex items-center justify-between text-[0.7rem] text-secondary">
                          <div className="flex items-center gap-3">
                            <span className="text-ink">
                              <strong>{p.employed}</strong> con trabajo ({p.vincula} Vincula · {p.external} externo)
                            </span>
                            <span>•</span>
                            <span className="text-amber-700">
                              <strong>{p.seeking}</strong> en búsqueda activa
                            </span>
                          </div>

                          {onApplyFilterToTable && (
                            <button
                              type="button"
                              onClick={() => onApplyFilterToTable({ program: p.name })}
                              className="text-xs text-green-dark hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>Ver egresados en tabla</span>
                              <i className="bx bx-right-arrow-alt" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VISTA 2: BARRAS POR COHORTES / CORTES DE GRADUACIÓN */}
          {viewMode === 'byCohort' && (
            <div className="space-y-4">
              {cohortGroups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line bg-page/40 p-8 text-center text-xs text-secondary">
                  No hay egresados que coincidan con los filtros seleccionados.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {cohortGroups.map((c) => {
                    const rate = c.total > 0 ? Math.round((c.employed / c.total) * 100) : 0;
                    const vinculaPct = c.employed > 0 ? Math.round((c.vincula / c.employed) * 100) : 0;

                    return (
                      <div
                        key={c.cohort}
                        className="rounded-xl border border-line bg-white p-4 shadow-2xs hover:shadow-xs hover:border-green-dark transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 border-b border-line-soft pb-2.5">
                            <div>
                              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block">
                                Período de Grado
                              </span>
                              <span className="font-display text-base font-bold text-ink block">
                                Cohorte {c.cohort}
                              </span>
                            </div>
                            <span className="rounded-full bg-ink text-lime px-2.5 py-1 text-xs font-black font-display shadow-2xs">
                              {rate}%
                            </span>
                          </div>

                          <div className="mt-3.5 space-y-2 text-xs">
                            <div className="flex items-center justify-between text-secondary">
                              <span>Total egresados corte:</span>
                              <strong className="text-ink">{c.total}</strong>
                            </div>
                            <div className="flex items-center justify-between text-emerald-800">
                              <span className="flex items-center gap-1">
                                <span className="size-2 rounded-full bg-emerald-600" />
                                Con Empleo:
                              </span>
                              <strong>{c.employed}</strong>
                            </div>
                            <div className="flex items-center justify-between text-ink pl-3 border-l-2 border-lime">
                              <span className="text-[0.68rem] text-secondary">Vía Vincula UTS:</span>
                              <span className="font-bold text-xs bg-lime/30 px-1.5 py-0.2 rounded text-ink border border-lime/60">
                                {c.vincula} ({vinculaPct}%)
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-amber-800">
                              <span className="flex items-center gap-1">
                                <span className="size-2 rounded-full bg-amber-500" />
                                En Búsqueda:
                              </span>
                              <strong>{c.seeking}</strong>
                            </div>
                          </div>

                          {/* Mini barra de progreso */}
                          <div className="mt-4 h-2.5 w-full rounded-full bg-page overflow-hidden flex">
                            <div
                              style={{ width: `${(c.vincula / c.total) * 100}%` }}
                              className="bg-lime h-full"
                              title={`Vincula: ${c.vincula}`}
                            />
                            <div
                              style={{ width: `${(c.external / c.total) * 100}%` }}
                              className="bg-emerald-600 h-full"
                              title={`Externo: ${c.external}`}
                            />
                            <div
                              style={{ width: `${(c.seeking / c.total) * 100}%` }}
                              className="bg-amber-500 h-full"
                              title={`Buscando: ${c.seeking}`}
                            />
                          </div>
                        </div>

                        {onApplyFilterToTable && (
                          <button
                            type="button"
                            onClick={() => onApplyFilterToTable({ cohort: c.cohort })}
                            className="mt-4 pt-2.5 border-t border-line-soft text-xs text-green-dark hover:underline font-semibold cursor-pointer inline-flex items-center justify-between w-full"
                          >
                            <span>Filtrar tabla por corte {c.cohort}</span>
                            <i className="bx bx-right-arrow-alt" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VISTA 3: CANAL DE VINCULACIÓN & EFECTIVIDAD VINCULA UTS */}
          {viewMode === 'vinculaImpact' && (
            <div className="grid gap-6 lg:grid-cols-12 items-center">
              {/* Gráfico Donut SVG */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl border border-line bg-page/30">
                <div className="relative size-56 sm:size-60">
                  <svg className="size-full -rotate-90 transform" viewBox="0 0 100 100">
                    {/* Donut Background Circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="text-page stroke-current"
                      strokeWidth="15"
                      fill="transparent"
                    />

                    {/* Segmento 1: Vincula UTS */}
                    {stats.total > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#D2F800"
                        strokeWidth="15"
                        fill="transparent"
                        strokeDasharray={`${(stats.vinculaCount / stats.total) * 251.32} 251.32`}
                        strokeDashoffset="0"
                        className="transition-all duration-700 ease-out"
                      />
                    )}

                    {/* Segmento 2: Externo */}
                    {stats.total > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#10B981"
                        strokeWidth="15"
                        fill="transparent"
                        strokeDasharray={`${(stats.externalCount / stats.total) * 251.32} 251.32`}
                        strokeDashoffset={`-${(stats.vinculaCount / stats.total) * 251.32}`}
                        className="transition-all duration-700 ease-out"
                      />
                    )}

                    {/* Segmento 3: En Búsqueda */}
                    {stats.total > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#F59E0B"
                        strokeWidth="15"
                        fill="transparent"
                        strokeDasharray={`${(stats.seekingCount / stats.total) * 251.32} 251.32`}
                        strokeDashoffset={`-${((stats.vinculaCount + stats.externalCount) / stats.total) * 251.32}`}
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                  </svg>

                  {/* Centro del Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <span className="text-[0.62rem] font-bold uppercase tracking-wider text-secondary">
                      Impacto Vincula
                    </span>
                    <span className="font-display text-3xl font-black text-ink leading-none mt-1">
                      {stats.vinculaShareOfEmployed}%
                    </span>
                    <span className="text-[0.65rem] text-body-muted mt-1">
                      de los contratados
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lime/30 border border-lime/70 px-3 py-1 text-xs font-bold text-ink">
                    <i className="bx bxs-award text-sm text-green-dark" />
                    Bolsa de Empleo UTS Líder
                  </span>
                </div>
              </div>

              {/* Tarjetas Descriptivas de Resultados */}
              <div className="lg:col-span-7 space-y-3.5">
                <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="m-0 font-display text-sm font-bold text-ink">
                        Colocación Directa por la Plataforma Vincula
                      </h4>
                      <p className="m-0 text-xs text-body-muted mt-1 leading-relaxed">
                        <strong>{stats.vinculaCount} egresados</strong> fueron vinculados gracias a convenios marco institucionales y postulaciones dentro de Vincula UTS, representando el <strong>{stats.vinculaShareOfEmployed}%</strong> de todas las contrataciones registradas.
                      </p>
                    </div>
                    <span className="rounded-xl bg-ink text-lime text-base font-black px-2.5 py-1.5 font-display shrink-0">
                      {stats.vinculaCount}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="m-0 font-display text-sm font-bold text-ink">
                        Inserción por Canales Externos o Iniciativa Propia
                      </h4>
                      <p className="m-0 text-xs text-body-muted mt-1 leading-relaxed">
                        <strong>{stats.externalCount} egresados</strong> consiguieron vinculación por convocatorias públicas externas, emprendimientos o continuidad directa de su práctica empresarial.
                      </p>
                    </div>
                    <span className="rounded-xl bg-emerald-100 text-emerald-900 text-base font-black px-2.5 py-1.5 font-display shrink-0">
                      {stats.externalCount}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="m-0 font-display text-sm font-bold text-ink">
                        Egresados en Acompañamiento y Búsqueda Activa
                      </h4>
                      <p className="m-0 text-xs text-body-muted mt-1 leading-relaxed">
                        <strong>{stats.seekingCount} egresados</strong> cuentan con postulaciones abiertas o en espera de validación de hoja de vida institucional.
                      </p>
                    </div>
                    <span className="rounded-xl bg-amber-100 text-amber-900 text-base font-black px-2.5 py-1.5 font-display shrink-0">
                      {stats.seekingCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
