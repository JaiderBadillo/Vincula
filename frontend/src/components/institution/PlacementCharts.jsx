import { useState } from 'react';

/**
 * 1. Gráfico de Tendencia Histórica e Inserción (Area & Line Chart Interactivo)
 */
export function PlacementTrendAreaChart({ data }) {
  const [activeMetric, setActiveMetric] = useState('rate'); // 'rate' | 'salary'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Datos extendidos para mostrar la tendencia
  const points = data || [
    { period: '2024 - I', graduates: 1680, employed: 1210, rate: 72.0, avgSalary: 2450000 },
    { period: '2024 - II', graduates: 1740, employed: 1290, rate: 74.1, avgSalary: 2580000 },
    { period: '2025 - I', graduates: 1890, employed: 1435, rate: 75.9, avgSalary: 2710000 },
    { period: '2025 - II', graduates: 1980, employed: 1544, rate: 78.0, avgSalary: 2840000 },
    { period: '2026 - I (Corte)', graduates: 2020, employed: 1606, rate: 79.5, avgSalary: 2950000 },
  ];

  // Geometría del SVG
  const width = 640;
  const height = 210;
  const padding = { top: 25, right: 35, bottom: 35, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Escalas
  const minVal = activeMetric === 'rate' ? 65 : 2200000;
  const maxVal = activeMetric === 'rate' ? 85 : 3200000;

  const getY = (val) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padding.top + chartH - ((clamped - minVal) / (maxVal - minVal)) * chartH;
  };

  const getX = (idx) => {
    return padding.left + (idx / (points.length - 1)) * chartW;
  };

  // Coordenadas
  const coords = points.map((p, idx) => ({
    x: getX(idx),
    y: getY(activeMetric === 'rate' ? p.rate : p.avgSalary),
    point: p,
  }));

  // Generador de curva Bezier suave
  const linePath = coords.reduce((acc, curr, idx, arr) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = arr[idx - 1];
    const cpX1 = prev.x + (curr.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (curr.x - prev.x) / 2;
    const cpY2 = curr.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
  }, '');

  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${padding.top + chartH} L ${coords[0].x} ${padding.top + chartH} Z`;

  // Línea de meta institucional 75% (solo para rate)
  const targetY = activeMetric === 'rate' ? getY(75) : null;

  // Ticks eje Y
  const yTicks = activeMetric === 'rate'
    ? [65, 70, 75, 80, 85]
    : [2200000, 2500000, 2800000, 3100000];

  const currentHover = hoveredIndex !== null ? coords[hoveredIndex] : coords[coords.length - 1];

  return (
    <div className="space-y-4">
      {/* Controles de métrica */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveMetric('rate')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeMetric === 'rate'
                ? 'bg-green-dark text-white shadow-2xs font-bold'
                : 'bg-page text-secondary hover:text-ink border border-line'
            }`}
          >
            Tasa de Colocación (%)
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('salary')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeMetric === 'salary'
                ? 'bg-green-dark text-white shadow-2xs font-bold'
                : 'bg-page text-secondary hover:text-ink border border-line'
            }`}
          >
            Salario Promedio Inicial (COP)
          </button>
        </div>

        {/* Resumen del punto activo */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-secondary">
            Periodo: <strong className="text-ink">{currentHover?.point.period}</strong>
          </span>
          <span className="font-bold text-green-dark bg-green/10 px-2 py-0.5 rounded border border-green/20">
            {activeMetric === 'rate'
              ? `${currentHover?.point.rate}% colocados`
              : `$ ${(currentHover?.point.avgSalary / 1000000).toFixed(2)}M COP`}
          </span>
        </div>
      </div>

      {/* Contenedor del Gráfico SVG */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="placementGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#28571d" stopOpacity="0.28" />
              <stop offset="70%" stopColor="#28571d" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#28571d" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="salaryGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b1cc74" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#b1cc74" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#b1cc74" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Líneas horizontales de guía */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e8edef"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#718188"
                  fontSize="10"
                  fontFamily="Inter, sans-serif"
                >
                  {activeMetric === 'rate' ? `${tick}%` : `$${(tick / 1000000).toFixed(1)}M`}
                </text>
              </g>
            );
          })}

          {/* Línea objetivo del 75% (CNA) */}
          {targetY && (
            <g>
              <line
                x1={padding.left}
                y1={targetY}
                x2={width - padding.right}
                y2={targetY}
                stroke="#336f24"
                strokeWidth="1.2"
                strokeDasharray="6 3"
              />
              <text
                x={width - padding.right}
                y={targetY - 5}
                textAnchor="end"
                fill="#28571d"
                fontSize="9"
                fontWeight="600"
                fontFamily="Inter, sans-serif"
              >
                Meta Acreditación CNA (75%)
              </text>
            </g>
          )}

          {/* Área sombreada */}
          <path
            d={areaPath}
            fill={activeMetric === 'rate' ? 'url(#placementGradient)' : 'url(#salaryGradient)'}
            className="transition-all duration-300"
          />

          {/* Línea de tendencia principal */}
          <path
            d={linePath}
            fill="none"
            stroke={activeMetric === 'rate' ? '#28571d' : '#336f24'}
            strokeWidth="3"
            strokeLinecap="round"
            className="transition-all duration-300"
          />

          {/* Eje X (Etiquetas de Periodos) */}
          {coords.map((c, idx) => (
            <g key={c.point.period}>
              <text
                x={c.x}
                y={height - 10}
                textAnchor="middle"
                fill={hoveredIndex === idx ? '#001a23' : '#718188'}
                fontWeight={hoveredIndex === idx ? '700' : '500'}
                fontSize="10.5"
                fontFamily="Inter, sans-serif"
              >
                {c.point.period}
              </text>

              {/* Barra vertical de hover */}
              {hoveredIndex === idx && (
                <line
                  x1={c.x}
                  y1={padding.top}
                  x2={c.x}
                  y2={padding.top + chartH}
                  stroke="#28571d"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              )}

              {/* Puntos de datos interactivos */}
              <circle
                cx={c.x}
                cy={c.y}
                r={hoveredIndex === idx ? 6.5 : 4.5}
                fill="#ffffff"
                stroke={hoveredIndex === idx ? '#336f24' : '#28571d'}
                strokeWidth={hoveredIndex === idx ? '3.5' : '2.5'}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {/* Zona sensible amplia para hover fácil */}
              <rect
                x={c.x - chartW / points.length / 2}
                y={padding.top}
                width={chartW / points.length}
                height={chartH + 20}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Nota inferior del gráfico */}
      <div className="flex items-center justify-between text-[0.72rem] text-secondary border-t border-line/60 pt-2.5">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-green-dark" />
          <span>Tendencia longitudinal calculada sobre graduados registrados en el censo UTS.</span>
        </span>
        <span className="font-semibold text-emerald-800">
          Crecimiento acumulado: +7.5% en 5 periodos
        </span>
      </div>
    </div>
  );
}

/**
 * 2. Gráfico Donut Interactivo (Modalidad de Trabajo y Tipología de Contrato)
 */
export function PlacementDonutChart({ contractTypes, workModalities }) {
  const [activeTab, setActiveTab] = useState('contracts'); // 'contracts' | 'modalities'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const contractData = contractTypes || [
    { label: 'Término Indefinido', percentage: 56, count: 3254, color: '#28571d' },
    { label: 'Término Fijo', percentage: 28, count: 1627, color: '#b1cc74' },
    { label: 'Prestación Serv. (OPS)', percentage: 11, count: 639, color: '#0b2b34' },
    { label: 'Pasantía / Convenio', percentage: 5, count: 291, color: '#94a3b8' },
  ];

  const modalityData = workModalities || [
    { label: 'Presencial', percentage: 46, count: 2673, color: '#28571d' },
    { label: 'Híbrido', percentage: 38, count: 2208, color: '#b1cc74' },
    { label: 'Remoto Total', percentage: 16, count: 930, color: '#0b2b34' },
  ];

  const currentDataset = activeTab === 'contracts' ? contractData : modalityData;
  const radius = 68;
  const circumference = 2 * Math.PI * radius; // ~427.25

  let accumulatedPercent = 0;
  const segments = currentDataset.map((item, idx) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += item.percentage;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      index: idx,
    };
  });

  const activeItem = hoveredIndex !== null ? currentDataset[hoveredIndex] : currentDataset[0];

  return (
    <div className="space-y-4">
      {/* Switcher de datos */}
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-page p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('contracts');
              setHoveredIndex(null);
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'contracts'
                ? 'bg-white text-ink shadow-2xs font-bold'
                : 'text-secondary hover:text-ink'
            }`}
          >
            Tipo de Contrato
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('modalities');
              setHoveredIndex(null);
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'modalities'
                ? 'bg-white text-ink shadow-2xs font-bold'
                : 'text-secondary hover:text-ink'
            }`}
          >
            Modalidad de Trabajo
          </button>
        </div>

        <span className="text-xs text-secondary font-medium">
          Total: <strong className="text-ink">5.811</strong> vinculados
        </span>
      </div>

      {/* Visual Donut + Leyenda */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
        {/* Donut SVG */}
        <div className="sm:col-span-5 flex justify-center relative">
          <svg viewBox="0 0 190 190" className="size-44 overflow-visible -rotate-90">
            {/* Círculo base de fondo */}
            <circle
              cx="95"
              cy="95"
              r={radius}
              fill="none"
              stroke="#e8edef"
              strokeWidth="24"
            />

            {/* Segmentos del donut */}
            {segments.map((seg) => (
              <circle
                key={seg.label}
                cx="95"
                cy="95"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={hoveredIndex === seg.index ? '28' : '24'}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(seg.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))}
          </svg>

          {/* Centro del Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="font-display text-2xl font-bold tracking-tight text-ink">
              {activeItem.percentage}%
            </span>
            <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-secondary max-w-[80px] truncate">
              {activeItem.label}
            </span>
          </div>
        </div>

        {/* Leyenda interactiva al costado */}
        <div className="sm:col-span-7 space-y-2">
          {currentDataset.map((item, idx) => (
            <div
              key={item.label}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`rounded-xl border p-2.5 transition-all cursor-pointer flex items-center justify-between ${
                hoveredIndex === idx
                  ? 'border-green/40 bg-green/5 shadow-2xs'
                  : 'border-line/70 bg-page/40 hover:bg-page'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-xs font-semibold text-ink">
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[0.7rem] text-secondary">
                  {item.count.toLocaleString()}
                </span>
                <span className="font-display text-xs font-bold text-ink">
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 3. Gráfico de Barras Verticales de Rangos Salariales (SMLV)
 */
export function SalaryDistributionBarChart({ salaryData }) {
  const [hoveredBar, setHoveredBar] = useState(null);

  const data = salaryData || [
    {
      bracket: '1 a 2 SMLV',
      rangeCOP: '$ 1.42M - $ 2.84M',
      percentage: 38,
      count: 2208,
      typicalProfile: 'Técnicos laborales y tecnólogos en primer empleo',
    },
    {
      bracket: '2 a 4 SMLV',
      rangeCOP: '$ 2.84M - $ 5.69M',
      percentage: 46,
      count: 2673,
      typicalProfile: 'Profesionales junior y tecnólogos consolidados',
      highlight: true,
    },
    {
      bracket: '4 a 6 SMLV',
      rangeCOP: '$ 5.69M - $ 8.54M',
      percentage: 12,
      count: 697,
      typicalProfile: 'Ingenieros de sistemas, datos y telecomunicaciones',
    },
    {
      bracket: '> 6 SMLV',
      rangeCOP: '> $ 8.54M COP',
      percentage: 4,
      count: 233,
      typicalProfile: 'Líderes de arquitectura e infraestructura especializada',
    },
  ];

  const maxPercent = 50;

  return (
    <div className="space-y-4">
      {/* Gráfico de barras SVG */}
      <div className="relative pt-2">
        <div className="grid grid-cols-4 gap-3 sm:gap-4 h-48 items-end border-b border-line px-2">
          {data.map((item, idx) => {
            const barHeightPercent = (item.percentage / maxPercent) * 100;
            const isHovered = hoveredBar === idx;

            return (
              <div
                key={item.bracket}
                className="flex flex-col items-center h-full justify-end cursor-pointer group"
                onMouseEnter={() => setHoveredBar(idx)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {/* Porcentaje flotante */}
                <span
                  className={`text-xs font-bold mb-1.5 transition-colors ${
                    item.highlight || isHovered ? 'text-green-dark' : 'text-secondary'
                  }`}
                >
                  {item.percentage}%
                </span>

                {/* Columna vertical */}
                <div className="w-full max-w-[54px] rounded-t-xl overflow-hidden bg-page border border-line/60 relative">
                  <div
                    className={`w-full rounded-t-xl transition-all duration-300 ${
                      item.highlight
                        ? 'bg-gradient-to-t from-green-dark to-green'
                        : isHovered
                        ? 'bg-ink'
                        : 'bg-lime/70 hover:bg-lime'
                    }`}
                    style={{ height: `${barHeightPercent * 1.5}px` }}
                  />
                </div>

                {/* Etiqueta del Rango */}
                <div className="mt-2 text-center w-full">
                  <span className="block text-[0.72rem] font-bold text-ink truncate">
                    {item.bracket}
                  </span>
                  <span className="block text-[0.65rem] text-secondary truncate">
                    {item.rangeCOP}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tarjeta de detalle interactivo */}
      {hoveredBar !== null ? (
        <div className="rounded-xl border border-green/30 bg-green/5 p-3 text-xs flex items-center justify-between animate-in fade-in">
          <div>
            <strong className="text-ink">{data[hoveredBar].bracket} ({data[hoveredBar].rangeCOP}):</strong>{' '}
            <span className="text-secondary">{data[hoveredBar].typicalProfile}</span>
          </div>
          <span className="font-bold text-green-dark whitespace-nowrap ml-2">
            {data[hoveredBar].count.toLocaleString()} graduados
          </span>
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-page/50 p-2.5 text-center text-xs text-secondary">
          Pasa el cursor por cada rango salarial para ver el perfil y volumen de graduados.
        </div>
      )}
    </div>
  );
}

/**
 * 4. Gráfico Horizontal de Tiempos de Inserción
 */
export function TimeToPlacementChart({ timeData }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const data = timeData || [
    { range: 'Menos de 3 meses', percentage: 44, count: 2557, tag: 'Inserción rápida (pasantías y convenios)', tone: '#28571d' },
    { range: 'De 3 a 6 meses', percentage: 34, count: 1976, tag: 'Intermediación estándar bolsa de empleo', tone: '#336f24' },
    { range: 'De 6 a 12 meses', percentage: 15, count: 871, tag: 'Procesos de selección especializados', tone: '#b1cc74' },
    { range: 'Más de 12 meses', percentage: 7, count: 407, tag: 'Población prioritaria para plan vocacional', tone: '#f43f5e' },
  ];

  return (
    <div className="space-y-3.5">
      {data.map((item, idx) => (
        <div
          key={item.range}
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
          className={`rounded-xl border p-3 transition-all cursor-pointer ${
            hoveredIndex === idx
              ? 'border-green/40 bg-green/5 shadow-2xs'
              : 'border-line/60 bg-page/30 hover:bg-page/70'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-ink">{item.range}</span>
            <div className="flex items-center gap-2">
              <span className="text-secondary text-[0.7rem]">
                {item.count.toLocaleString()} egresados
              </span>
              <span className="font-display font-bold text-ink">{item.percentage}%</span>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="h-3 w-full overflow-hidden rounded-full bg-white border border-line/60 relative">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: item.tone,
              }}
            />
          </div>

          <p className="mt-1.5 text-[0.68rem] text-body-muted m-0">{item.tag}</p>
        </div>
      ))}
    </div>
  );
}
