import { useState, useMemo } from 'react';
import Chart from 'react-apexcharts';
import * as LegacyActivity from '../legacy_charts/LegacyActivityCharts.jsx';

export { LegacyActivity };

/**
 * Utilidad matemática para redondear escalas a números legibles (50, 100, 200, etc.)
 */
function niceCeil(value, steps = 4) {
  if (value <= 0) return steps;
  const rough = value / steps;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag * steps;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Gráfico de Evolución Mensual (MonthlyRecruitmentChart) con ApexCharts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rediseño con Combo Chart moderno (Columnas para Postulantes + Spline Area para Contratados):
 *  - Doble eje Y dinámico sincronizado
 *  - Tooltip interactivo con tasa de conversión automática
 *  - Filtro interactivo de métricas (Ambas / Solo Postulantes / Solo Contratos)
 *  - Resumen KPI inferior con mes récord y promedio
 */
export function MonthlyRecruitmentChart({ data = [] }) {
  const [activeMetricFilter, setActiveMetricFilter] = useState('all'); // 'all' | 'applicants' | 'hired'
  const [chartEngine, setChartEngine] = useState('apex'); // 'apex' | 'legacy'

  if (!data || data.length === 0) return null;

  if (chartEngine === 'legacy') {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50/70 p-2.5 text-xs">
          <span className="font-bold text-amber-900 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            Visualizando versión anterior (SVG Puro Manual)
          </span>
          <div className="inline-flex rounded-lg border border-amber-300 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setChartEngine('apex')}
              className="rounded-md px-2.5 py-1 text-xs font-bold text-ink hover:bg-amber-100 transition-all cursor-pointer"
            >
              ⚡ Ver versión ApexCharts (Nueva)
            </button>
            <button
              type="button"
              onClick={() => setChartEngine('legacy')}
              className="rounded-md bg-amber-600 text-white px-2.5 py-1 text-xs font-bold cursor-pointer shadow-2xs"
            >
              🏛️ SVG Anterior
            </button>
          </div>
        </div>
        <LegacyActivity.MonthlyRecruitmentChart data={data} />
      </div>
    );
  }

  const totalApplicants = data.reduce((s, d) => s + (d.applicants || 0), 0);
  const totalHired = data.reduce((s, d) => s + (d.hired || 0), 0);
  const avgConversion = totalApplicants > 0 ? ((totalHired / totalApplicants) * 100).toFixed(1) : '0.0';
  const peakMonth = [...data].sort((a, b) => (b.hired || 0) - (a.hired || 0))[0] || { month: '—', hired: 0 };

  const series = useMemo(() => {
    if (activeMetricFilter === 'applicants') {
      return [
        {
          name: 'Postulantes',
          type: 'column',
          data: data.map((d) => d.applicants || 0),
        },
      ];
    }
    if (activeMetricFilter === 'hired') {
      return [
        {
          name: 'Contratados',
          type: 'area',
          data: data.map((d) => d.hired || 0),
        },
      ];
    }
    return [
      {
        name: 'Postulantes',
        type: 'column',
        data: data.map((d) => d.applicants || 0),
      },
      {
        name: 'Contratados',
        type: 'area',
        data: data.map((d) => d.hired || 0),
      },
    ];
  }, [data, activeMetricFilter]);

  const options = useMemo(() => {
    const isBoth = activeMetricFilter === 'all';
    const isApplicants = activeMetricFilter === 'applicants';

    return {
      chart: {
        type: 'line',
        height: 280,
        toolbar: { show: false },
        fontFamily: 'inherit',
        zoom: { enabled: false },
      },
      stroke: {
        width: isApplicants ? [0] : isBoth ? [0, 3] : [3],
        curve: 'smooth',
      },
      plotOptions: {
        bar: {
          columnWidth: '40%',
          borderRadius: 6,
          borderRadiusApplication: 'end',
        },
      },
      colors: isApplicants ? ['#d97706'] : isBoth ? ['#d97706', '#059669'] : ['#059669'],
      fill: {
        type: isApplicants ? ['solid'] : isBoth ? ['solid', 'gradient'] : ['gradient'],
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.5,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      markers: {
        size: isApplicants ? [0] : isBoth ? [0, 5] : [5],
        strokeColors: '#ffffff',
        strokeWidth: 2,
        hover: { size: 7 },
      },
      xaxis: {
        categories: data.map((d) => d.short || d.month),
        labels: {
          style: {
            colors: '#786c5e',
            fontSize: '11px',
            fontWeight: 600,
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: isBoth
        ? [
            {
              title: {
                text: 'Postulantes',
                style: { color: '#d97706', fontSize: '11px', fontWeight: 600 },
              },
              labels: {
                style: { colors: '#785938', fontSize: '11px', fontWeight: 600 },
                formatter: (val) => Math.round(val),
              },
            },
            {
              opposite: true,
              title: {
                text: 'Contratados',
                style: { color: '#059669', fontSize: '11px', fontWeight: 600 },
              },
              labels: {
                style: { colors: '#047857', fontSize: '11px', fontWeight: 600 },
                formatter: (val) => Math.round(val),
              },
            },
          ]
        : [
            {
              labels: {
                style: { colors: '#786c5e', fontSize: '11px', fontWeight: 600 },
                formatter: (val) => Math.round(val),
              },
            },
          ],
      tooltip: {
        shared: true,
        intersect: false,
        theme: 'light',
        y: {
          formatter: (val, { seriesIndex, dataPointIndex }) => {
            if (val === undefined || val === null) return '';
            const item = data[dataPointIndex];
            if (isBoth && seriesIndex === 1 && item && item.applicants > 0) {
              const convRate = ((item.hired / item.applicants) * 100).toFixed(1);
              return `${val} contratados (${convRate}% conversión)`;
            }
            if (!isBoth && !isApplicants && item && item.applicants > 0) {
              const convRate = ((item.hired / item.applicants) * 100).toFixed(1);
              return `${val} contratados (${convRate}% conversión)`;
            }
            return `${val} candidatos`;
          },
        },
      },
      grid: {
        borderColor: '#f1e7d6',
        strokeDashArray: 4,
        padding: { left: 10, right: 10, top: 0, bottom: 0 },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '12px',
        fontWeight: 600,
        markers: { radius: 12 },
        itemMargin: { horizontal: 8, vertical: 0 },
      },
    };
  }, [data, activeMetricFilter]);

  return (
    <div className="relative w-full space-y-4">
      {/* Cabecera Ejecutiva con Filtro de Métricas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sand-line pb-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-terracotta/15 text-terracotta text-sm">
              <i className="bx bx-line-chart" />
            </span>
            <h3 className="m-0 font-display text-sm sm:text-base font-bold text-ink">
              Evolución de Reclutamiento y Cierres
            </h3>
          </div>
          <p className="m-0 text-xs text-secondary">
            Comparativa interactiva de volumen de postulaciones recibidas vs contrataciones efectivas
          </p>
        </div>

        {/* Controles: Switcher Antes/Después + Selector de Métricas */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Switcher Antes/Después */}
          <div className="inline-flex rounded-lg border border-sand-line bg-cream/70 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setChartEngine('apex')}
              className={`rounded-md px-2.5 py-1 font-bold text-[0.68rem] transition-all cursor-pointer ${
                chartEngine === 'apex' ? 'bg-[#051F26] text-white shadow-2xs' : 'text-secondary hover:text-ink'
              }`}
              title="Versión moderna interactiva con ApexCharts"
            >
              ⚡ ApexCharts
            </button>
            <button
              type="button"
              onClick={() => setChartEngine('legacy')}
              className={`rounded-md px-2.5 py-1 font-bold text-[0.68rem] transition-all cursor-pointer ${
                chartEngine === 'legacy' ? 'bg-[#051F26] text-white shadow-2xs' : 'text-secondary hover:text-ink'
              }`}
              title="Ver versión anterior con SVG manual"
            >
              🏛️ SVG Anterior
            </button>
          </div>

          {/* Selector de visualización tipo Pill Switcher */}
          <div className="flex items-center gap-1 rounded-xl border border-sand-line bg-cream/70 p-1">
            <button
              type="button"
              onClick={() => setActiveMetricFilter('all')}
              className={`rounded-lg px-2.5 py-1 text-[0.68rem] font-bold transition-all cursor-pointer ${
                activeMetricFilter === 'all'
                  ? 'bg-cocoa text-white shadow-xs'
                  : 'text-secondary hover:text-ink hover:bg-white'
              }`}
            >
              Ambas métricas
            </button>
            <button
              type="button"
              onClick={() => setActiveMetricFilter('applicants')}
              className={`rounded-lg px-2.5 py-1 text-[0.68rem] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeMetricFilter === 'applicants'
                  ? 'bg-ochre text-cocoa shadow-xs'
                  : 'text-secondary hover:text-ink hover:bg-white'
              }`}
            >
              <span className="size-1.5 rounded-full bg-ochre" />
              Postulantes
            </button>
            <button
              type="button"
              onClick={() => setActiveMetricFilter('hired')}
              className={`rounded-lg px-2.5 py-1 text-[0.68rem] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeMetricFilter === 'hired'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-secondary hover:text-ink hover:bg-white'
              }`}
            >
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Contratados
            </button>
          </div>
        </div>
      </div>

      {/* Resumen numérico rápido en badges */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-ochre/30 bg-ochre/10 px-3 py-1 text-xs font-bold text-cocoa">
          <i className="bx bx-group text-sm text-ochre" />
          <span>{totalApplicants.toLocaleString('es-CO')} postulantes totales</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
          <i className="bx bx-check-double text-sm text-emerald-600" />
          <span>{totalHired} contratos formalizados</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-sand-line bg-cream px-3 py-1 text-xs font-bold text-secondary">
          <i className="bx bx-trending-up text-sm text-terracotta" />
          <span>{avgConversion}% efectividad global</span>
        </span>
      </div>

      {/* Contenedor ApexCharts Interactivo */}
      <div className="w-full pt-1">
        <Chart options={options} series={series} type="line" height={280} />
      </div>

      {/* Banner de Conclusiones Ejecutivas Inferior */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sand-line bg-gradient-to-r from-cream via-white to-sand/20 p-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md bg-ochre/25 text-cocoa">
            <i className="bx bxs-trophy text-sm" />
          </span>
          <span className="text-secondary">
            Mes récord de vinculaciones:{' '}
            <strong className="text-ink">{peakMonth.month}</strong> con{' '}
            <strong className="text-emerald-700">{peakMonth.hired} contrataciones</strong>.
          </span>
        </div>
        <span className="text-[0.68rem] font-bold text-terracotta">
          Promedio mensual: ~{Math.round(totalApplicants / data.length)} candidatos
        </span>
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. Embudo de Selección y Conversión (FunnelConversionCard)
 * ─────────────────────────────────────────────────────────────────────────────
 * Rediseño visual como embudo ejecutivo conectado por etapas:
 *  - 4 etapas secuenciales estilizadas con barras de ancho proporcional
 *  - Conectores de flujo dinámicos indicando tasa de pase (%) y fuga de candidatos
 *  - Indicadores de mayor punto de fuga y tiempo promedio de cierre
 */
export function FunnelConversionCard({ metrics }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const base = metrics.applicantsTotal || 0;
  const safePct = (n) => (base > 0 ? (n / base) * 100 : 0);

  const stages = [
    {
      id: 'step-1',
      stepNum: '01',
      label: 'Postulaciones Recibidas',
      sublabel: 'Ingreso total de candidatos por todas las fuentes',
      count: metrics.applicantsTotal,
      icon: 'bx-group',
      accentColor: 'from-amber-500 to-amber-600',
      textColor: 'text-amber-800',
      bgColor: 'bg-amber-50 border-amber-200',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    {
      id: 'step-2',
      stepNum: '02',
      label: 'Filtro y Evaluación de Hoja de Vida',
      sublabel: 'Candidatos que cumplen requisitos mínimos',
      count: metrics.inReview,
      icon: 'bx-filter-alt',
      accentColor: 'from-orange-500 to-orange-600',
      textColor: 'text-orange-800',
      bgColor: 'bg-orange-50 border-orange-200',
      badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
    },
    {
      id: 'step-3',
      stepNum: '03',
      label: 'Entrevistas Técnicas y de Ajuste',
      sublabel: 'Citaciones presenciales o virtuales activas',
      count: metrics.interviewing,
      icon: 'bx-conversation',
      accentColor: 'from-terracotta to-terracotta-dark',
      textColor: 'text-terracotta-dark',
      bgColor: 'bg-terracotta/5 border-terracotta/20',
      badgeBg: 'bg-terracotta/15 text-terracotta border-terracotta/30',
    },
    {
      id: 'step-4',
      stepNum: '04',
      label: 'Contrataciones Formalizadas',
      sublabel: 'Ofertas laborales aceptadas y legalizadas',
      count: metrics.hiredMonth,
      icon: 'bx-check-double',
      accentColor: 'from-emerald-500 to-emerald-700',
      textColor: 'text-emerald-900',
      bgColor: 'bg-emerald-50 border-emerald-300',
      badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    },
  ].map((st, i, arr) => {
    const prev = i > 0 ? arr[i - 1].count : null;
    return {
      ...st,
      pctOfTotal: safePct(st.count),
      stepConv: prev ? (st.count / prev) * 100 : 100,
      droppedCount: prev !== null ? prev - st.count : 0,
      droppedPct: prev !== null ? ((prev - st.count) / prev) * 100 : 0,
    };
  });

  const overall = safePct(metrics.hiredMonth);
  // Identifica la etapa con mayor porcentaje de deserción / caída
  const highestDropStage = stages.slice(1).reduce((max, st) => (st.droppedPct > max.droppedPct ? st : max), stages[1]);

  const hasTime = metrics.avgTimeToHireDays && metrics.targetTimeToHireDays;
  const onTarget = hasTime && metrics.avgTimeToHireDays <= metrics.targetTimeToHireDays;

  return (
    <div className="space-y-4">
      {/* Cabecera del Embudo */}
      <div className="flex items-center justify-between gap-3 border-b border-sand-line pb-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-sand text-cocoa text-sm">
            <i className="bx bx-filter text-base" />
          </span>
          <div>
            <h3 className="m-0 font-display text-sm sm:text-base font-bold text-ink">
              Embudo de Atracción y Selección
            </h3>
            <p className="m-0 text-xs text-secondary">
              Tasa de retención y conversión entre cada fase del proceso
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-xs font-bold text-emerald-900">
            <i className="bx bx-check-shield text-sm" />
            <span>{overall.toFixed(1)}% final</span>
          </div>
        </div>
      </div>

      {/* Flujo de Etapas del Embudo */}
      <div className="space-y-2 pt-1">
        {stages.map((st, i) => {
          const isHovered = hoveredIdx === i;
          return (
            <div key={st.id} className="space-y-1.5">
              {/* Conector de Flujo con Deserción */}
              {i > 0 && (
                <div className="flex items-center justify-center gap-2 py-0.5 text-[0.68rem] text-secondary">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sand-line to-transparent" />
                  <span className="inline-flex items-center gap-1 rounded-full border border-sand-line bg-cream px-2 py-0.5 font-bold text-cocoa">
                    <i className="bx bx-down-arrow-alt text-xs text-terracotta" />
                    <span>{st.stepConv.toFixed(0)}% avanza</span>
                    <span className="text-[0.62rem] font-normal text-secondary">
                      ({st.droppedCount} descartados)
                    </span>
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sand-line to-transparent" />
                </div>
              )}

              {/* Tarjeta de Etapa */}
              <div
                tabIndex={0}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onFocus={() => setHoveredIdx(i)}
                onBlur={() => setHoveredIdx(null)}
                className={`relative overflow-hidden rounded-2xl border p-3.5 transition-all duration-200 cursor-pointer outline-none ${
                  isHovered
                    ? 'border-terracotta/50 shadow-md scale-[1.01] bg-white'
                    : 'border-sand-line bg-white hover:border-sand-dark'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-sand/60 font-display text-xs font-black text-cocoa">
                      {st.stepNum}
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 font-display text-xs font-bold text-ink truncate flex items-center gap-1.5">
                        <i className={`bx ${st.icon} text-sm text-secondary`} />
                        <span>{st.label}</span>
                      </p>
                      <p className="m-0 text-[0.68rem] text-secondary truncate">{st.sublabel}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="m-0 font-display text-base font-extrabold text-ink leading-none">
                      {st.count}
                    </p>
                    <p className="m-0 mt-0.5 text-[0.65rem] font-bold text-secondary">
                      {st.pctOfTotal.toFixed(0)}% del total
                    </p>
                  </div>
                </div>

                {/* Barra de progreso visual con gradiente */}
                <div className="mt-2.5 h-2 w-full rounded-full bg-sand/30 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${st.accentColor} transition-all duration-500`}
                    style={{ width: `${Math.max(st.pctOfTotal, 3)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicadores de Rendimiento y Fricción Inferiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs">
        <div className="rounded-xl border border-sand-line bg-cream/70 p-3 flex items-start gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-rose-100 text-rose-700">
            <i className="bx bx-error-circle text-base" />
          </span>
          <div>
            <p className="m-0 text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
              Mayor punto de filtro
            </p>
            <p className="m-0 mt-0.5 font-bold text-ink text-xs">
              {highestDropStage.label}
            </p>
            <p className="m-0 mt-0.5 text-[0.68rem] text-rose-700 font-semibold">
              Descartados: {highestDropStage.droppedCount} ({highestDropStage.droppedPct.toFixed(0)}% de fuga)
            </p>
          </div>
        </div>

        {hasTime && (
          <div
            className={`rounded-xl border p-3 flex items-start gap-2.5 ${
              onTarget ? 'border-emerald-300 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'
            }`}
          >
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-lg ${
                onTarget ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              <i className="bx bx-stopwatch text-base" />
            </span>
            <div>
              <p className="m-0 text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                Velocidad de contratación
              </p>
              <p className="m-0 mt-0.5 font-bold text-ink text-xs">
                {metrics.avgTimeToHireDays} días promedio
              </p>
              <p
                className={`m-0 mt-0.5 text-[0.68rem] font-semibold ${
                  onTarget ? 'text-emerald-800' : 'text-rose-700'
                }`}
              >
                {onTarget
                  ? `Cumple meta (${metrics.targetTimeToHireDays} días máximo)`
                  : `Supera meta por ${metrics.avgTimeToHireDays - metrics.targetTimeToHireDays} días`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. Origen del Talento y Convenios (TalentSourcesCard)
 * ─────────────────────────────────────────────────────────────────────────────
 * Rediseño visual:
 *  - Comparativa visual Convenios IES vs Mercado Abierto en barra doble
 *  - Lista de instituciones con chips y barras de progreso por cada fuente
 */
export function TalentSourcesCard({ sources = [] }) {
  const [hoveredId, setHoveredId] = useState(null);

  const total = sources.reduce((acc, s) => acc + (s.count || 0), 0);
  const rows = sources
    .map((s) => ({ ...s, pct: total > 0 ? (s.count / total) * 100 : s.percentage || 0 }))
    .sort((a, b) => b.count - a.count);

  const iesRows = rows.filter((s) => s.id.startsWith('ies-'));
  const iesPct = iesRows.reduce((acc, s) => acc + s.pct, 0);
  const iesCount = iesRows.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-3 border-b border-sand-line pb-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-ochre/25 text-cocoa text-sm">
            <i className="bx bx-buildings text-base" />
          </span>
          <div>
            <h3 className="m-0 font-display text-sm sm:text-base font-bold text-ink">
              Origen del Talento Vinculado
            </h3>
            <p className="m-0 text-xs text-secondary">
              Efectividad de convenios con universidades vs convocatorias abiertas
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-ochre/40 bg-ochre/20 px-2.5 py-1 text-xs font-bold text-cocoa">
          {Math.round(iesPct)}% vía IES
        </span>
      </div>

      {/* Barra segmentada comparativa con diseño pulido */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[0.68rem] font-bold text-secondary">
          <span>Convenios IES ({iesCount} candidatos)</span>
          <span>Otros canales ({total - iesCount} candidatos)</span>
        </div>
        <div className="flex h-4 w-full gap-1 overflow-hidden rounded-full bg-sand/50 p-0.5">
          {rows.map((s) => (
            <div
              key={s.id}
              role="img"
              aria-label={`${s.label}: ${s.pct.toFixed(1)}%`}
              title={`${s.label}: ${s.pct.toFixed(1)}% (${s.count} postulantes)`}
              onMouseEnter={() => setHoveredId(s.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`${s.color} cursor-pointer rounded-full transition-all duration-300 ${
                hoveredId && hoveredId !== s.id ? 'opacity-35 scale-y-90' : 'opacity-100'
              }`}
              style={{ width: `${s.pct}%` }}
            />
          ))}
        </div>
      </div>

      {/* Lista detallada con micro-barras */}
      <div className="space-y-2 pt-1">
        {rows.map((s) => {
          const isSelected = hoveredId === s.id;
          const isIes = s.id.startsWith('ies-');
          return (
            <div
              key={s.id}
              tabIndex={0}
              onMouseEnter={() => setHoveredId(s.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(s.id)}
              onBlur={() => setHoveredId(null)}
              className={`rounded-xl border p-2.5 text-xs transition-all outline-none cursor-pointer ${
                isSelected
                  ? 'border-terracotta bg-white shadow-xs scale-[1.01]'
                  : 'border-sand-line bg-white/70 hover:bg-white'
              } ${hoveredId && !isSelected ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`size-2.5 shrink-0 rounded-full ${s.color}`} />
                  <span className="truncate font-bold text-ink">{s.label}</span>
                  {isIes && (
                    <span className="rounded bg-ochre/20 px-1 py-0.2 text-[0.58rem] font-bold text-cocoa">
                      IES
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[0.68rem] text-secondary font-mono">{s.count} postulantes</span>
                  <span className="w-12 text-right font-mono font-bold text-ink">
                    {s.pct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Mini barra de llenado individual */}
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-sand/30 overflow-hidden">
                <div
                  className={`h-full rounded-full ${s.color} transition-all duration-500`}
                  style={{ width: `${s.pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Conclusión ejecutiva */}
      <div className="rounded-xl border border-sand-line bg-cream/60 p-3 text-xs text-secondary flex items-center gap-2">
        <i className="bx bx-bulb text-base text-ochre shrink-0" />
        <span>
          <strong>{Math.round(iesPct)}% del talento</strong> proviene directamente de convenios universitarios validados en Vincula.
        </span>
      </div>
    </div>
  );
}
