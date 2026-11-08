import { useState, useMemo } from 'react';
import Chart from 'react-apexcharts';
import * as Legacy from '../legacy_charts/LegacyPlacementCharts.jsx';

export { Legacy };

const TARGET_RATE = 75; // Meta de acreditación CNA
const fmtMoney = (v) => `$${(v / 1000000).toFixed(2)}M COP`;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Gráfico de Tendencia Histórica e Inserción (Area & Line Chart con ApexCharts)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function PlacementTrendAreaChart({ data }) {
  const [activeMetric, setActiveMetric] = useState('rate'); // 'rate' | 'salary'
  const [chartEngine, setChartEngine] = useState('apex'); // 'apex' | 'legacy'

  const points = useMemo(
    () =>
      data && data.length
        ? data
        : [
            { period: '2024 - I', graduates: 1680, employed: 1210, rate: 72.0, avgSalary: 2450000 },
            { period: '2024 - II', graduates: 1740, employed: 1290, rate: 74.1, avgSalary: 2580000 },
            { period: '2025 - I', graduates: 1890, employed: 1435, rate: 75.9, avgSalary: 2710000 },
            { period: '2025 - II', graduates: 1980, employed: 1544, rate: 78.0, avgSalary: 2840000 },
          ],
    [data]
  );

  const isRate = activeMetric === 'rate';
  const getVal = (p) => (isRate ? p.rate : p.avgSalary);

  const lastPoint = points[points.length - 1];
  const prevPoint = points.length > 1 ? points[points.length - 2] : null;
  const delta = prevPoint ? getVal(lastPoint) - getVal(prevPoint) : null;

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
        <Legacy.PlacementTrendAreaChart data={data} />
      </div>
    );
  }

  const chartOptions = useMemo(() => {
    return {
      chart: {
        id: 'placement-trend-chart',
        type: 'area',
        height: 270,
        toolbar: { show: false },
        fontFamily: 'Inter, system-ui, sans-serif',
        zoom: { enabled: false },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 600,
        },
      },
      colors: [isRate ? '#28571d' : '#d99b26'],
      dataLabels: {
        enabled: true,
        formatter: (val) => (isRate ? `${val.toFixed(1)}%` : `$${(val / 1000000).toFixed(2)}M`),
        offsetY: -6,
        style: {
          fontSize: '11px',
          fontWeight: 700,
          colors: ['#051F26'],
        },
        background: {
          enabled: true,
          foreColor: '#051F26',
          padding: 4,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: '#e2e8f0',
          opacity: 0.9,
        },
      },
      stroke: {
        curve: 'smooth',
        width: 3.5,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      xaxis: {
        categories: points.map((p) => p.period),
        labels: {
          style: { colors: '#64748b', fontSize: '12px', fontWeight: 600 },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: isRate ? Math.max(0, Math.floor(Math.min(...points.map((p) => p.rate)) - 5)) : undefined,
        max: isRate ? Math.min(100, Math.ceil(Math.max(...points.map((p) => p.rate)) + 5)) : undefined,
        labels: {
          formatter: (val) => (isRate ? `${val.toFixed(0)}%` : `$${(val / 1000000).toFixed(1)}M`),
          style: { colors: '#64748b', fontSize: '11px', fontWeight: 600 },
        },
      },
      annotations: isRate
        ? {
            yaxis: [
              {
                y: TARGET_RATE,
                borderColor: '#b45309',
                strokeDashArray: 5,
                borderWidth: 1.8,
                label: {
                  text: `Meta CNA (${TARGET_RATE}%)`,
                  position: 'left',
                  textAnchor: 'start',
                  offsetX: 10,
                  style: {
                    color: '#ffffff',
                    background: '#b45309',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: { left: 6, right: 6, top: 2, bottom: 2 },
                  },
                },
              },
            ],
          }
        : {},
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val) =>
            isRate ? `${val.toFixed(1)}% de graduados colocados` : `$${Number(val).toLocaleString('es-CO')} COP`,
        },
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 4,
        padding: { left: 10, right: 15 },
      },
      markers: {
        size: 5,
        colors: [isRate ? '#28571d' : '#d99b26'],
        strokeColors: '#ffffff',
        strokeWidth: 2,
        hover: { size: 7 },
      },
    };
  }, [points, isRate]);

  const series = useMemo(
    () => [
      {
        name: isRate ? 'Tasa de Colocación' : 'Salario Inicial Promedio',
        data: points.map(getVal),
      },
    ],
    [points, isRate]
  );

  return (
    <div className="space-y-4">
      {/* Controles + KPIs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-line pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Switcher Antes/Después */}
          <div className="inline-flex rounded-lg border border-line bg-page p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setChartEngine('apex')}
              className={`rounded-md px-2.5 py-1 font-bold transition-all cursor-pointer ${
                chartEngine === 'apex' ? 'bg-[#051F26] text-white shadow-2xs' : 'text-secondary hover:text-ink'
              }`}
              title="Versión interactiva moderna con ApexCharts"
            >
              ⚡ ApexCharts
            </button>
            <button
              type="button"
              onClick={() => setChartEngine('legacy')}
              className={`rounded-md px-2.5 py-1 font-bold transition-all cursor-pointer ${
                chartEngine === 'legacy' ? 'bg-[#051F26] text-white shadow-2xs' : 'text-secondary hover:text-ink'
              }`}
              title="Ver versión anterior construida con SVG manual"
            >
              🏛️ SVG Anterior
            </button>
          </div>

          <div role="tablist" aria-label="Métrica del gráfico" className="inline-flex rounded-xl border border-line bg-page p-1 self-start">
            {[
              { id: 'rate', label: 'Tasa de colocación (%)' },
              { id: 'salary', label: 'Salario inicial (COP)' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={activeMetric === m.id}
                onClick={() => setActiveMetric(m.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeMetric === m.id ? 'bg-green-dark text-white shadow-2xs font-bold' : 'text-secondary hover:text-ink'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-secondary font-medium">Último periodo ({lastPoint.period}):</span>
          <span className="font-display text-base font-bold text-ink">
            {isRate ? `${lastPoint.rate.toFixed(1)}%` : fmtMoney(lastPoint.avgSalary)}
          </span>
          {delta !== null && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold border ${
                delta >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {delta >= 0 ? '▲ +' : '▼ '}
              {isRate ? `${Math.abs(delta).toFixed(1)} pp` : fmtMoney(Math.abs(delta))} vs periodo anterior
            </span>
          )}
        </div>
      </div>

      {/* Render ApexCharts */}
      <div className="relative w-full rounded-2xl bg-white p-1">
        <Chart options={chartOptions} series={series} type="area" height={270} />
      </div>

      <div className="flex items-center justify-between text-[0.72rem] text-secondary border-t border-line-soft pt-2">
        <span>Fuente: Observatorio Laboral de la IES & Encuestas de Graduados</span>
        <span className="font-semibold text-green-dark">Meta CNA: 75.0% de empleabilidad formal</span>
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. Gráfico Donut de Modalidades y Contratos (ApexCharts Donut + Desglose)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function PlacementDonutChart({ contractTypes, workModalities }) {
  const [activeTab, setActiveTab] = useState('contracts'); // 'contracts' | 'modalities'
  const [chartEngine, setChartEngine] = useState('apex'); // 'apex' | 'legacy'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Paleta institucional armonizada UTS
  const contractPalette = ['#28571d', '#4d7a1f', '#d99b26', '#051F26'];
  const modalityPalette = ['#28571d', '#4d7a1f', '#051F26'];

  const normalizedContracts = useMemo(() => {
    const raw = contractTypes && contractTypes.length ? contractTypes : [
      { type: 'Término Indefinido', percentage: 56, count: 3254, icon: 'bx-check-shield' },
      { type: 'Término Fijo (Directo)', percentage: 28, count: 1627, icon: 'bx-calendar' },
      { type: 'Prestación de Servicios (OPS)', percentage: 11, count: 639, icon: 'bx-file' },
      { type: 'Convenio de Aprendizaje / Pasantía', percentage: 5, count: 291, icon: 'bx-graduation' },
    ];

    return raw.map((item, idx) => ({
      label: item.label || item.type || `Contrato ${idx + 1}`,
      percentage: item.percentage ?? 0,
      count: item.count ?? 0,
      icon: item.icon || 'bx-briefcase',
      color: item.color || contractPalette[idx % contractPalette.length],
    }));
  }, [contractTypes]);

  const normalizedModalities = useMemo(() => {
    const raw = workModalities && workModalities.length ? workModalities : [
      { modality: 'Presencial', percentage: 46, count: 2673, icon: 'bx-buildings' },
      { modality: 'Híbrido', percentage: 38, count: 2208, icon: 'bx-laptop' },
      { modality: 'Remoto Total', percentage: 16, count: 930, icon: 'bx-globe' },
    ];

    return raw.map((item, idx) => ({
      label: item.label || item.modality || `Modalidad ${idx + 1}`,
      percentage: item.percentage ?? 0,
      count: item.count ?? 0,
      icon: item.icon || 'bx-laptop',
      color: item.color || modalityPalette[idx % modalityPalette.length],
    }));
  }, [workModalities]);

  const currentDataset = activeTab === 'contracts' ? normalizedContracts : normalizedModalities;
  const total = useMemo(() => currentDataset.reduce((sum, i) => sum + (i.count || 0), 0), [currentDataset]);

  const chartOptions = useMemo(() => {
    return {
      chart: {
        type: 'donut',
        height: 280,
        fontFamily: 'Inter, system-ui, sans-serif',
        toolbar: { show: false },
        events: {
          dataPointMouseEnter: (event, chartContext, config) => {
            setHoveredIndex(config.dataPointIndex);
          },
          dataPointMouseLeave: () => {
            setHoveredIndex(null);
          },
        },
      },
      colors: currentDataset.map((d) => d.color),
      labels: currentDataset.map((d) => d.label),
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            background: 'transparent',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748b',
                offsetY: -4,
              },
              value: {
                show: true,
                fontSize: '22px',
                fontWeight: 800,
                color: '#051F26',
                offsetY: 4,
                formatter: (val) => `${Number(val).toLocaleString('es-CO')}`,
              },
              total: {
                show: true,
                label: activeTab === 'contracts' ? 'Total Vinculados' : 'Total Evaluados',
                fontSize: '10px',
                fontWeight: 700,
                color: '#64748b',
                formatter: () => `${total.toLocaleString('es-CO')}`,
              },
            },
          },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => `${val.toFixed(0)}%`,
        style: {
          fontSize: '11px',
          fontWeight: 700,
          colors: ['#ffffff'],
        },
        dropShadow: { enabled: false },
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val) => `${Number(val).toLocaleString('es-CO')} graduados (${((val / (total || 1)) * 100).toFixed(1)}%)`,
        },
      },
      stroke: {
        width: 2,
        colors: ['#ffffff'],
      },
    };
  }, [currentDataset, total, activeTab]);

  const series = useMemo(() => currentDataset.map((d) => d.count), [currentDataset]);

  if (chartEngine === 'legacy') {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50/70 p-2.5 text-xs">
          <span className="font-bold text-amber-900 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            Visualizando versión anterior (SVG Donut Manual)
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
        <Legacy.PlacementDonutChart
          contractTypes={normalizedContracts}
          workModalities={normalizedModalities}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selector de dimensión + Switcher Antes/Después */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3">
        {/* Pestañas: Tipos de Contrato / Modalidad */}
        <div role="tablist" aria-label="Tipo de distribución" className="flex items-center gap-1.5 rounded-xl border border-line bg-page p-1">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'contracts'}
            onClick={() => {
              setActiveTab('contracts');
              setHoveredIndex(null);
            }}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'contracts' ? 'bg-green-dark text-white font-bold shadow-2xs' : 'text-secondary hover:text-ink'
            }`}
          >
            Tipos de Contrato
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'modalities'}
            onClick={() => {
              setActiveTab('modalities');
              setHoveredIndex(null);
            }}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'modalities' ? 'bg-green-dark text-white font-bold shadow-2xs' : 'text-secondary hover:text-ink'
            }`}
          >
            Modalidad de Trabajo
          </button>
        </div>

        {/* Switcher Antes / Después y muestra total */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-secondary font-medium hidden md:inline">
            Muestra total: <strong className="text-ink">{total.toLocaleString('es-CO')}</strong> egresados
          </span>
          <div className="inline-flex rounded-lg border border-line bg-page p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setChartEngine('apex')}
              className={`rounded-md px-2 py-0.5 font-bold transition-all cursor-pointer ${
                chartEngine === 'apex' ? 'bg-green-dark text-white shadow-2xs' : 'text-secondary hover:text-ink'
              }`}
              title="Gráfica moderna ApexCharts"
            >
              ⚡ ApexCharts
            </button>
            <button
              type="button"
              onClick={() => setChartEngine('legacy')}
              className={`rounded-md px-2 py-0.5 font-bold transition-all cursor-pointer ${
                chartEngine === 'legacy' ? 'bg-green-dark text-white shadow-2xs' : 'text-secondary hover:text-ink'
              }`}
              title="Ver versión SVG anterior"
            >
              🏛️ SVG Anterior
            </button>
          </div>
        </div>
      </div>

      {/* Cuadrícula interactiva: Donut + Desglose detallado */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Donut interactivo */}
        <div className="md:col-span-5 flex justify-center relative bg-white rounded-2xl p-2">
          <Chart options={chartOptions} series={series} type="donut" height={270} width="100%" />
        </div>

        {/* Tarjetas de desglose enriquecidas */}
        <div className="md:col-span-7 space-y-2.5">
          {currentDataset.map((item, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <div
                key={item.label}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`group rounded-xl border p-2.5 transition-all cursor-pointer ${
                  isHovered
                    ? 'border-green-dark/40 bg-green/5 shadow-2xs scale-[1.01]'
                    : 'border-line/70 bg-page/40 hover:bg-page hover:border-line'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-6 rounded-lg grid place-items-center text-white shrink-0 text-xs shadow-2xs"
                      style={{ backgroundColor: item.color }}
                    >
                      <i className={`bx ${item.icon}`} />
                    </span>
                    <span className="truncate text-xs font-semibold text-ink">
                      {item.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[0.72rem] text-secondary">
                      {item.count.toLocaleString('es-CO')} egresados
                    </span>
                    <span
                      className="font-display text-xs font-bold px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: `${item.color}15`,
                        color: item.color,
                      }}
                    >
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                {/* Barra de progreso visual */}
                <div className="h-1.5 w-full rounded-full bg-line/60 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. Gráfico de Barras Verticales de Rangos Salariales (ApexCharts Column)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function SalaryDistributionBarChart({ salaryData }) {
  const data = salaryData || [
    {
      bracket: '1 a 2 SMLV',
      rangeCOP: '$ 1.75M - $ 3.50M',
      percentage: 38,
      count: 2208,
      typicalProfile: 'Técnicos laborales y tecnólogos en primer empleo',
    },
    {
      bracket: '2 a 4 SMLV',
      rangeCOP: '$ 3.50M - $ 7.00M',
      percentage: 46,
      count: 2673,
      typicalProfile: 'Profesionales junior y tecnólogos consolidados',
    },
    {
      bracket: '4 a 6 SMLV',
      rangeCOP: '$ 7.00M - $ 10.50M',
      percentage: 12,
      count: 697,
      typicalProfile: 'Ingenieros de sistemas, datos y telecomunicaciones',
    },
    {
      bracket: '> 6 SMLV',
      rangeCOP: '> $ 10.50M COP',
      percentage: 4,
      count: 233,
      typicalProfile: 'Líderes de arquitectura e infraestructura especializada',
    },
  ];

  const peak = Math.max(...data.map((d) => d.percentage));
  const axisMax = Math.max(10, Math.ceil((peak * 1.15) / 10) * 10);

  const chartOptions = useMemo(() => {
    return {
      chart: {
        type: 'bar',
        height: 250,
        toolbar: { show: false },
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: '42%',
          distributed: true,
          dataLabels: { position: 'top' },
        },
      },
      colors: ['#28571d', '#4d7a1f', '#d99b26', '#b45309'],
      dataLabels: {
        enabled: true,
        formatter: (val) => `${val}%`,
        offsetY: -20,
        style: {
          fontSize: '11px',
          fontWeight: 700,
          colors: ['#051F26'],
        },
      },
      legend: { show: false },
      xaxis: {
        categories: data.map((d) => d.bracket),
        labels: {
          style: { colors: '#64748b', fontSize: '11px', fontWeight: 600 },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        max: axisMax,
        labels: {
          formatter: (val) => `${val}%`,
          style: { colors: '#64748b', fontSize: '11px', fontWeight: 600 },
        },
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val, { dataPointIndex }) => {
            const item = data[dataPointIndex];
            return `${val}% (${item.count.toLocaleString('es-CO')} graduados) · Rango: ${item.rangeCOP}`;
          },
        },
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 4,
      },
    };
  }, [data, axisMax]);

  const series = useMemo(
    () => [
      {
        name: 'Distribución Porcentual',
        data: data.map((d) => d.percentage),
      },
    ],
    [data]
  );

  return (
    <div className="space-y-3">
      <div className="relative w-full rounded-2xl bg-white p-1">
        <Chart options={chartOptions} series={series} type="bar" height={250} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-line-soft text-xs text-secondary">
        {data.map((item) => (
          <div key={item.bracket} className="rounded-xl bg-page p-2 border border-line-soft">
            <span className="font-bold text-ink block">{item.bracket}</span>
            <span className="text-[0.68rem] text-secondary font-medium">{item.rangeCOP}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. Gráfico Horizontal de Tiempos de Inserción (ApexCharts Bar Horizontal)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function TimeToPlacementChart({ timeData }) {
  const toneMap = {
    emerald: '#28571d',
    lime: '#4d7a1f',
    amber: '#d99b26',
    rose: '#e11d48',
  };

  const data = useMemo(() => {
    const raw = timeData && timeData.length ? timeData : [
      { range: 'Menos de 3 meses', percentage: 44, count: 2557, tag: 'Inserción rápida (pasantías y convenios)', tone: '#28571d' },
      { range: 'De 3 a 6 meses', percentage: 34, count: 1976, tag: 'Intermediación estándar bolsa de empleo', tone: '#4d7a1f' },
      { range: 'De 6 a 12 meses', percentage: 15, count: 871, tag: 'Procesos de selección especializados', tone: '#d99b26' },
      { range: 'Más de 12 meses', percentage: 7, count: 407, tag: 'Población prioritaria para plan vocacional', tone: '#e11d48' },
    ];

    return raw.map((d) => ({
      range: d.range,
      percentage: d.percentage,
      count: d.count,
      tag: d.tag || d.description || '',
      tone: toneMap[d.tone] || (d.tone && d.tone.startsWith('#') ? d.tone : '#28571d'),
    }));
  }, [timeData]);

  const total = data.reduce((s, d) => s + d.count, 0);
  const within6 = data.slice(0, 2).reduce((s, d) => s + d.percentage, 0);
  const late = data[data.length - 1];

  const chartOptions = useMemo(() => {
    return {
      chart: {
        type: 'bar',
        height: 220,
        toolbar: { show: false },
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: '52%',
          distributed: true,
          dataLabels: { position: 'top' },
        },
      },
      colors: data.map((d) => d.tone),
      dataLabels: {
        enabled: true,
        formatter: (val) => `${val}%`,
        offsetX: 24,
        style: {
          fontSize: '11px',
          fontWeight: 700,
          colors: ['#051F26'],
        },
      },
      legend: { show: false },
      xaxis: {
        categories: data.map((d) => d.range),
        max: Math.max(...data.map((d) => d.percentage)) + 12,
        labels: {
          formatter: (val) => `${val}%`,
          style: { colors: '#64748b', fontSize: '11px', fontWeight: 600 },
        },
      },
      yaxis: {
        labels: {
          style: { colors: '#334155', fontSize: '11px', fontWeight: 600 },
        },
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val, { dataPointIndex }) => {
            const item = data[dataPointIndex];
            return `${val}% (${item.count.toLocaleString('es-CO')} personas) · ${item.tag}`;
          },
        },
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 4,
      },
    };
  }, [data]);

  const series = useMemo(
    () => [
      {
        name: 'Tiempo de Inserción',
        data: data.map((d) => d.percentage),
      },
    ],
    [data]
  );

  return (
    <div className="space-y-3.5">
      {/* Resumen ejecutivo en tarjetas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
          <p className="m-0 text-[0.65rem] font-bold uppercase tracking-wider text-secondary">
            Empleo en menos de 6 meses
          </p>
          <p className="m-0 mt-0.5 font-display text-2xl font-bold text-green-dark leading-none">
            {within6}%
          </p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
          <p className="m-0 text-[0.65rem] font-bold uppercase tracking-wider text-secondary">
            {late.range}
          </p>
          <p className="m-0 mt-0.5 font-display text-2xl font-bold text-rose-600 leading-none">
            {late.percentage}%
            <span className="ml-1.5 text-[0.7rem] font-semibold text-secondary">
              ({late.count.toLocaleString('es-CO')} de {total.toLocaleString('es-CO')})
            </span>
          </p>
        </div>
      </div>

      {/* Render ApexCharts Bar Horizontal */}
      <div className="relative w-full rounded-2xl bg-white p-1">
        <Chart options={chartOptions} series={series} type="bar" height={220} />
      </div>
    </div>
  );
}
