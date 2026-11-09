import { useMemo, useState } from 'react';
import { MONTHLY_PERIODS_DATA, SEMESTRAL_PERIODS_DATA } from '../../data/vinculaAdminData.js';

export default function PlatformPeriodicAnalytics() {
  const [selectedRange, setSelectedRange] = useState('last6m'); // 'last6m' | 'year2026' | 'q4_2026' | 'semestral'
  const [activeDimension, setActiveDimension] = useState('all'); // 'all' | 'companies' | 'vacancies' | 'institutions' | 'graduates'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Filtro de serie de datos según el rango seleccionado
  const seriesData = useMemo(() => {
    if (selectedRange === 'semestral') {
      return SEMESTRAL_PERIODS_DATA;
    }
    if (selectedRange === 'last6m') {
      return MONTHLY_PERIODS_DATA.slice(-6);
    }
    if (selectedRange === 'q4_2026') {
      return MONTHLY_PERIODS_DATA.filter((m) => m.quarter === 'q4');
    }
    // 'year2026'
    return MONTHLY_PERIODS_DATA;
  }, [selectedRange]);

  // Totales sumados para el rango activo
  const periodTotals = useMemo(() => {
    return seriesData.reduce(
      (acc, item) => ({
        newCompanies: acc.newCompanies + item.newCompanies,
        newVacancies: acc.newVacancies + item.newVacancies,
        newInstitutions: acc.newInstitutions + item.newInstitutions,
        newGraduates: acc.newGraduates + item.newGraduates,
        totalApplications: acc.totalApplications + item.totalApplications,
      }),
      {
        newCompanies: 0,
        newVacancies: 0,
        newInstitutions: 0,
        newGraduates: 0,
        totalApplications: 0,
      }
    );
  }, [seriesData]);

  // Último corte acumulado total en la plataforma
  const latestLifetime = useMemo(() => {
    const lastItem = seriesData[seriesData.length - 1] || MONTHLY_PERIODS_DATA[0] || {};
    return {
      cumCompanies: lastItem.cumCompanies || 0,
      cumVacancies: lastItem.cumVacancies || 0,
      cumInstitutions: lastItem.cumInstitutions || 1,
      cumGraduates: lastItem.cumGraduates || 0,
    };
  }, [seriesData]);

  // Función de descarga CSV
  function handleDownloadCSV() {
    const headers = [
      'Periodo',
      'Nuevas Empresas',
      'Nuevas Vacantes',
      'Nuevas IES',
      'Nuevos Egresados',
      'Total Postulaciones',
      'Tasa Crecimiento',
    ];

    const rows = seriesData.map((d) => [
      `"${d.periodLabel}"`,
      d.newCompanies,
      d.newVacancies,
      d.newInstitutions,
      d.newGraduates,
      d.totalApplications,
      `"${d.growthRate || 'N/A'}"`,
    ]);

    const totalsRow = [
      `"TOTAL PERIODO"`,
      periodTotals.newCompanies,
      periodTotals.newVacancies,
      periodTotals.newInstitutions,
      periodTotals.newGraduates,
      periodTotals.totalApplications,
      `"-"`,
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(',')), totalsRow.join(',')].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Vincula_Metricas_Periodo_${selectedRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ── Geometría y escalas del gráfico ──
  const chartWidth = 720;
  const chartHeight = 260;
  const padding = { top: 26, right: 30, bottom: 40, left: 48 };
  const graphW = chartWidth - padding.left - padding.right;
  const graphH = chartHeight - padding.top - padding.bottom;

  const DIMS = [
    { id: 'companies', key: 'newCompanies', label: 'Nuevas Empresas', color: '#c85a32' },
    { id: 'vacancies', key: 'newVacancies', label: 'Nuevas Vacantes', color: '#d99b26' },
    { id: 'institutions', key: 'newInstitutions', label: 'Nuevas IES', color: '#2b1810' },
    { id: 'graduates', key: 'newGraduates', label: 'Nuevos Egresados', color: '#059669' },
  ];
  const isAll = activeDimension === 'all';
  const activeDim = DIMS.find((d) => d.id === activeDimension) || null;

  // Pico real de cada serie (base del índice relativo y de la escala individual)
  const peaks = DIMS.reduce(
    (acc, d) => ({ ...acc, [d.key]: Math.max(...seriesData.map((r) => r[d.key]), 1) }),
    {}
  );

  const niceMax = (v) => {
    const steps = 4;
    const rough = v / steps;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const n = rough / mag;
    const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return nice * mag * steps;
  };

  // Vista combinada = índice 0-100 (cada serie contra su propio pico, sin factores inventados)
  // Vista individual = valores reales con escala propia
  const axisMax = isAll ? 100 : niceMax(peaks[activeDim.key]);
  const stepX = graphW / Math.max(seriesData.length, 1);
  const xAt = (i) => padding.left + i * stepX + stepX / 2;
  const yAt = (v) => padding.top + graphH - (v / axisMax) * graphH;
  const valueFor = (row, dim) => (isAll ? (row[dim.key] / peaks[dim.key]) * 100 : row[dim.key]);

  const smoothPath = (pts) =>
    pts.reduce((acc, p, i, arr) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = arr[i - 1];
      const mx = (prev.x + p.x) / 2;
      return `${acc} C ${mx} ${prev.y}, ${mx} ${p.y}, ${p.x} ${p.y}`;
    }, '');

  const activeAvg =
    !isAll && seriesData.length
      ? seriesData.reduce((s, r) => s + r[activeDim.key], 0) / seriesData.length
      : 0;
  const bestIdx = !isAll
    ? seriesData.reduce((b, r, i, arr) => (r[activeDim.key] > arr[b][activeDim.key] ? i : b), 0)
    : -1;

  const hoveredRow = hoveredIndex !== null ? seriesData[hoveredIndex] : null;
  const tipLeft =
    hoveredIndex !== null ? Math.min(Math.max((xAt(hoveredIndex) / chartWidth) * 100, 16), 84) : 0;

  return (
    <section className="space-y-6">
      {/* ─── Encabezado y Control de Rango de Periodo ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-sand-line bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-ochre/25 text-cocoa text-lg">
              <i className="bx bx-bar-chart-alt-2" />
            </span>
            <h3 className="m-0 font-display text-base font-bold text-ink">
              Métricas Periódicas e Históricas de Expansión
            </h3>
          </div>
          <p className="m-0 mt-1 text-xs text-secondary">
            Analiza el crecimiento de nuevas empresas, vacantes, universidades y egresados mes a mes o por cortes semestrales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Rango */}
          <div className="flex items-center rounded-xl border border-sand-line bg-cream/60 p-1 shadow-2xs">
            {[
              { id: 'last6m', label: 'Últimos 6 meses' },
              { id: 'year2026', label: 'Año 2026' },
              { id: 'q4_2026', label: 'Trimestre Q4' },
              { id: 'semestral', label: 'Semestres' },
            ].map((rng) => (
              <button
                key={rng.id}
                type="button"
                onClick={() => setSelectedRange(rng.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  selectedRange === rng.id
                    ? 'bg-cocoa text-white shadow-xs font-bold'
                    : 'text-secondary hover:text-ink hover:bg-white'
                }`}
              >
                {rng.label}
              </button>
            ))}
          </div>

          {/* Botón de Exportar */}
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-sand-line bg-white px-3.5 py-2 text-xs font-bold text-cocoa hover:bg-sand transition-colors cursor-pointer shadow-2xs"
            title="Descargar datos en formato CSV para análisis en Excel"
          >
            <i className="bx bx-download text-sm" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* ─── 4 Tarjetas de KPIs del Periodo vs Acumulado Histórico ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Empresas */}
        <div
          onClick={() => setActiveDimension('companies')}
          className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-2xs ${
            activeDimension === 'companies'
              ? 'border-terracotta bg-terracotta/5 ring-2 ring-terracotta/20'
              : 'border-sand-line bg-white hover:border-terracotta/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-xl bg-terracotta/10 text-terracotta text-xl">
              <i className="bx bxs-business" />
            </span>
            <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 text-[0.68rem] font-bold">
              +{periodTotals.newCompanies} en periodo
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
              Nuevas Empresas Registradas
            </span>
            <p className="m-0 font-display text-2xl font-black text-ink">
              +{periodTotals.newCompanies}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-sand-line/60 flex items-center justify-between text-xs">
            <span className="text-secondary">Total acumulado en red:</span>
            <strong className="text-cocoa">{latestLifetime.cumCompanies} empresas</strong>
          </div>
        </div>

        {/* KPI 2: Vacantes */}
        <div
          onClick={() => setActiveDimension('vacancies')}
          className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-2xs ${
            activeDimension === 'vacancies'
              ? 'border-ochre bg-ochre/10 ring-2 ring-ochre/25'
              : 'border-sand-line bg-white hover:border-ochre/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-xl bg-ochre/20 text-cocoa text-xl">
              <i className="bx bx-briefcase-alt-2" />
            </span>
            <span className="rounded-full bg-ochre/25 text-cocoa border border-ochre/40 px-2 py-0.5 text-[0.68rem] font-bold">
              +{periodTotals.newVacancies} en periodo
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
              Nuevas Vacantes Creadas
            </span>
            <p className="m-0 font-display text-2xl font-black text-ink">
              +{periodTotals.newVacancies}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-sand-line/60 flex items-center justify-between text-xs">
            <span className="text-secondary">Total acumulado en red:</span>
            <strong className="text-cocoa">{latestLifetime.cumVacancies} vacantes</strong>
          </div>
        </div>

        {/* KPI 3: Universidades / IES */}
        <div
          onClick={() => setActiveDimension('institutions')}
          className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-2xs ${
            activeDimension === 'institutions'
              ? 'border-cocoa bg-cocoa/5 ring-2 ring-cocoa/20'
              : 'border-sand-line bg-white hover:border-cocoa/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-xl bg-sand text-cocoa text-xl">
              <i className="bx bxs-graduation" />
            </span>
            <span className="rounded-full bg-sand text-cocoa border border-sand-line px-2 py-0.5 text-[0.68rem] font-bold">
              +{periodTotals.newInstitutions} en periodo
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
              Nuevas IES Acreditadas
            </span>
            <p className="m-0 font-display text-2xl font-black text-ink">
              +{periodTotals.newInstitutions}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-sand-line/60 flex items-center justify-between text-xs">
            <span className="text-secondary">Total IES en convenio:</span>
            <strong className="text-cocoa">{latestLifetime.cumInstitutions} aliadas</strong>
          </div>
        </div>

        {/* KPI 4: Egresados */}
        <div
          onClick={() => setActiveDimension('graduates')}
          className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-2xs ${
            activeDimension === 'graduates'
              ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20'
              : 'border-sand-line bg-white hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800 text-xl">
              <i className="bx bx-group" />
            </span>
            <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 text-[0.68rem] font-bold">
              +{periodTotals.newGraduates} en periodo
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
              Nuevos Egresados & Practicantes
            </span>
            <p className="m-0 font-display text-2xl font-black text-ink">
              +{periodTotals.newGraduates}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-sand-line/60 flex items-center justify-between text-xs">
            <span className="text-secondary">Egresados en red total:</span>
            <strong className="text-cocoa">{latestLifetime.cumGraduates} conectados</strong>
          </div>
        </div>
      </div>

      {/* ─── Gráfico Interactivo de Progresión Periódica ─── */}
      <div className="rounded-2xl border border-sand-line bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sand-line pb-4">
          <div>
            <h4 className="m-0 font-display text-sm font-bold text-ink flex items-center gap-2">
              <i className="bx bx-line-chart text-base text-terracotta" />
              <span>Evolución Temporal del Ecosistema Vincula</span>
            </h4>
            <p className="m-0 mt-0.5 text-xs text-secondary">
              Pasa el cursor sobre cada columna para ver el desglose detallado de incorporaciones de ese corte.
            </p>
          </div>

          {/* Selector de Dimensión de Visualización */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'Todas las dimensiones' },
              { id: 'companies', label: 'Empresas' },
              { id: 'vacancies', label: 'Vacantes' },
              { id: 'institutions', label: 'Universidades' },
              { id: 'graduates', label: 'Egresados' },
            ].map((dim) => (
              <button
                key={dim.id}
                type="button"
                onClick={() => setActiveDimension(dim.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  activeDimension === dim.id
                    ? 'bg-cocoa text-white shadow-2xs font-bold'
                    : 'bg-sand/40 text-secondary hover:text-ink hover:bg-sand'
                }`}
              >
                {dim.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visualizador SVG interactivo */}
        <div className="relative w-full overflow-x-auto pb-2">
          <div className="relative min-w-[620px]">
            <style>{`
              @keyframes vcAdmCol { from { transform: scaleY(0); } to { transform: scaleY(1); } }
              @keyframes vcAdmLine { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
            `}</style>

            <svg
              key={`${selectedRange}-${activeDimension}`}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto overflow-visible select-none"
              role="img"
              aria-label="Evolución temporal de altas en la plataforma"
            >
              {/* Líneas guía + eje Y */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                const y = padding.top + graphH * (1 - pct);
                return (
                  <g key={pct}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={padding.left + graphW}
                      y2={y}
                      stroke="#f0e6dc"
                      strokeDasharray={pct === 0 ? '0' : '4 4'}
                    />
                    <text x={padding.left - 8} y={y + 3} textAnchor="end" className="fill-stone-400 text-[10px] font-mono">
                      {Math.round(axisMax * pct)}
                    </text>
                  </g>
                );
              })}

              {isAll && (
                <text x={padding.left} y={padding.top - 10} className="fill-stone-500 text-[10px] font-semibold">
                  Índice relativo · 100 = pico de cada serie (los valores reales aparecen al pasar el cursor)
                </text>
              )}

              {/* Banda resaltada */}
              {hoveredIndex !== null && (
                <rect
                  x={xAt(hoveredIndex) - stepX * 0.45}
                  y={padding.top}
                  width={stepX * 0.9}
                  height={graphH}
                  fill="rgba(217, 155, 38, 0.09)"
                  rx={8}
                />
              )}

              {/* VISTA INDIVIDUAL: columnas con valores reales */}
              {!isAll && (
                <g>
                  {seriesData.map((d, idx) => {
                    const v = d[activeDim.key];
                    const h = Math.max((v / axisMax) * graphH, v > 0 ? 3 : 0);
                    const bw = Math.min(stepX * 0.5, 46);
                    const isHover = hoveredIndex === idx;
                    return (
                      <g key={d.key}>
                        <rect
                          x={xAt(idx) - bw / 2}
                          y={padding.top + graphH - h}
                          width={bw}
                          height={h}
                          rx={6}
                          fill={activeDim.color}
                          opacity={hoveredIndex !== null && !isHover ? 0.45 : 1}
                          className="transition-opacity duration-150"
                          style={{
                            transformBox: 'fill-box',
                            transformOrigin: 'bottom',
                            animation: `vcAdmCol .55s ${idx * 0.05}s ease-out both`,
                          }}
                        />
                        <text
                          x={xAt(idx)}
                          y={padding.top + graphH - h - 6}
                          textAnchor="middle"
                          className={`text-[11px] font-bold ${isHover ? 'fill-stone-900' : 'fill-stone-600'}`}
                        >
                          {v}
                        </text>
                        {idx === bestIdx && v > 0 && (
                          <text
                            x={xAt(idx)}
                            y={padding.top + graphH - h - 20}
                            textAnchor="middle"
                            className="text-[9px] font-bold fill-amber-600"
                          >
                            ★ máx.
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Promedio del periodo */}
                  <line
                    x1={padding.left}
                    x2={padding.left + graphW}
                    y1={yAt(activeAvg)}
                    y2={yAt(activeAvg)}
                    stroke={activeDim.color}
                    strokeWidth="1.2"
                    strokeDasharray="6 4"
                    opacity="0.7"
                  />
                  <text
                    x={padding.left + graphW}
                    y={yAt(activeAvg) - 5}
                    textAnchor="end"
                    className="text-[10px] font-semibold"
                    fill={activeDim.color}
                  >
                    Promedio {activeAvg.toFixed(1)}
                  </text>
                </g>
              )}

              {/* VISTA COMBINADA: líneas sobre el mismo índice */}
              {isAll &&
                DIMS.map((dim) => {
                  const pts = seriesData.map((row, i) => ({ x: xAt(i), y: yAt(valueFor(row, dim)) }));
                  return (
                    <g key={dim.id}>
                      <path
                        d={smoothPath(pts)}
                        fill="none"
                        stroke={dim.color}
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pathLength="1"
                        strokeDasharray="1"
                        style={{ animation: 'vcAdmLine .9s ease-out both' }}
                      />
                      {pts.map((p, i) => (
                        <circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r={hoveredIndex === i ? 5.5 : 3.5}
                          fill="#fff"
                          stroke={dim.color}
                          strokeWidth="2.4"
                          className="transition-all duration-150"
                        />
                      ))}
                    </g>
                  );
                })}

              {/* Eje X + zonas sensibles (mouse + teclado) */}
              {seriesData.map((d, idx) => (
                <g key={`x-${d.key}`}>
                  <text
                    x={xAt(idx)}
                    y={padding.top + graphH + 22}
                    textAnchor="middle"
                    className={`text-[11px] font-bold ${
                      hoveredIndex === idx ? 'fill-terracotta' : 'fill-stone-600'
                    }`}
                  >
                    {d.shortLabel}
                  </text>
                  <rect
                    x={padding.left + idx * stepX}
                    y={padding.top - 6}
                    width={stepX}
                    height={graphH + 40}
                    fill="transparent"
                    tabIndex={0}
                    role="button"
                    aria-label={`${d.periodLabel}: ${d.newCompanies} empresas, ${d.newVacancies} vacantes, ${d.newInstitutions} IES, ${d.newGraduates} egresados`}
                    className="cursor-pointer outline-none"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(idx)}
                    onBlur={() => setHoveredIndex(null)}
                  />
                </g>
              ))}
            </svg>

            {/* Tooltip flotante con valores reales */}
            {hoveredRow && (
              <div
                className="pointer-events-none absolute top-2 z-10 w-52 -translate-x-1/2 rounded-xl border border-sand-line bg-white px-3 py-2.5 text-xs shadow-lg"
                style={{ left: `${tipLeft}%` }}
              >
                <p className="m-0 font-display font-bold text-cocoa">{hoveredRow.periodLabel}</p>
                <div className="mt-1.5 space-y-1">
                  {DIMS.map((dim) => (
                    <p
                      key={dim.id}
                      className={`m-0 flex items-center justify-between ${
                        !isAll && activeDimension !== dim.id ? 'opacity-50' : ''
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-secondary">
                        <span className="size-2 rounded-full" style={{ backgroundColor: dim.color }} />
                        {dim.label}
                      </span>
                      <strong className="text-ink">+{hoveredRow[dim.key]}</strong>
                    </p>
                  ))}
                  <p className="m-0 flex items-center justify-between border-t border-sand-line pt-1 mt-1">
                    <span className="text-secondary">Postulaciones</span>
                    <strong className="text-ink">{hoveredRow.totalApplications}</strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leyenda interactiva y lectura rápida */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-sand-line pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {DIMS.map((dim) => (
              <button
                key={dim.id}
                type="button"
                onClick={() => setActiveDimension(activeDimension === dim.id ? 'all' : dim.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                  activeDimension === dim.id
                    ? 'border-cocoa bg-cocoa/5 text-ink'
                    : 'border-sand-line text-ink hover:bg-sand/40'
                }`}
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: dim.color }} />
                {dim.label}
              </button>
            ))}
          </div>

          <p className="m-0 text-[0.72rem] text-secondary">
            {isAll ? (
              <>Cada línea se compara contra su propio máximo; elige una dimensión para ver cifras reales.</>
            ) : (
              <>
                Máximo: <strong className="text-ink">{seriesData[bestIdx]?.[activeDim.key]}</strong> en{' '}
                <strong className="text-ink">{seriesData[bestIdx]?.periodLabel}</strong>
              </>
            )}
          </p>
        </div>
      </div>

      {/* ─── Tabla Desglosada Mes a Mes / Periodo a Periodo ─── */}
      <div className="rounded-2xl border border-sand-line bg-white shadow-xs overflow-hidden space-y-0">
        <div className="p-5 border-b border-sand-line flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="m-0 font-display text-sm font-bold text-ink flex items-center gap-2">
              <i className="bx bx-table text-base text-terracotta" />
              <span>Tabla de Evolución Periódica y Tasas de Crecimiento</span>
            </h4>
            <p className="m-0 text-xs text-secondary">
              Desglose de altas netas en plataforma por cada corte del rango seleccionado.
            </p>
          </div>

          <span className="text-xs font-semibold text-secondary">
            {seriesData.length} cortes temporales
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-sand-line bg-cream/50 text-[0.72rem] font-bold text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">Periodo / Corte</th>
                <th className="py-3 px-4 text-center">Nuevas Empresas</th>
                <th className="py-3 px-4 text-center">Nuevas Vacantes</th>
                <th className="py-3 px-4 text-center">Nuevas IES</th>
                <th className="py-3 px-4 text-center">Nuevos Egresados</th>
                <th className="py-3 px-4 text-center">Postulaciones</th>
                <th className="py-3 px-4 text-right">Variación Crecimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-line">
              {seriesData.map((row) => (
                <tr key={row.key} className="hover:bg-cream/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-ink">
                    {row.periodLabel}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 rounded-md bg-terracotta/10 px-2 py-0.5 text-xs font-bold text-terracotta">
                      +{row.newCompanies}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 rounded-md bg-ochre/20 px-2 py-0.5 text-xs font-bold text-cocoa">
                      +{row.newVacancies}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.newInstitutions > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-cocoa/10 px-2 py-0.5 text-xs font-bold text-cocoa">
                        +{row.newInstitutions}
                      </span>
                    ) : (
                      <span className="text-stone-400 font-mono">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900">
                      +{row.newGraduates}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-cocoa">
                    {row.totalApplications}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                      <i className="bx bx-trending-up text-sm" />
                      <span>{row.growthRate}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-sand-line bg-sand/30 font-bold text-ink text-xs">
                <td className="py-3.5 px-4 uppercase tracking-wider font-display">
                  Total del Periodo:
                </td>
                <td className="py-3.5 px-4 text-center font-black text-terracotta">
                  +{periodTotals.newCompanies}
                </td>
                <td className="py-3.5 px-4 text-center font-black text-cocoa">
                  +{periodTotals.newVacancies}
                </td>
                <td className="py-3.5 px-4 text-center font-black text-cocoa">
                  +{periodTotals.newInstitutions}
                </td>
                <td className="py-3.5 px-4 text-center font-black text-emerald-900">
                  +{periodTotals.newGraduates}
                </td>
                <td className="py-3.5 px-4 text-center font-black text-cocoa">
                  {periodTotals.totalApplications}
                </td>
                <td className="py-3.5 px-4 text-right text-emerald-800">
                  Crecimiento sostenido
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}

