import { useState } from 'react';

/**
 * Gráfico interactivo SVG de evolución mensual de postulaciones y contrataciones
 */
export function MonthlyRecruitmentChart({ data = [] }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) return null;

  const maxApplicants = Math.max(...data.map((d) => d.applicants), 350);
  const chartHeight = 180;
  const chartWidth = 520;
  const paddingX = 40;
  const paddingY = 25;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;

  // Coordenadas para la línea de tendencia de contrataciones
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * innerWidth;
    // Se escala contrataciones para visibilidad en la gráfica
    const maxHiredScale = 30;
    const y = paddingY + innerHeight - (d.hired / maxHiredScale) * innerHeight;
    return { x, y, ...d };
  });

  const linePath = points.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );

  return (
    <div className="relative w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="m-0 font-display text-sm font-bold text-ink">Evolución de atracción y cierres</h3>
          <p className="m-0 text-xs text-secondary">Postulaciones recibidas vs. contratos formalizados</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-secondary">
            <span className="size-2.5 rounded-sm bg-sand-dark" />
            Postulantes
          </span>
          <span className="flex items-center gap-1.5 text-secondary">
            <span className="size-2.5 rounded-full bg-terracotta" />
            Contratados
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full min-w-[420px] select-none"
        >
          {/* Líneas guía de fondo */}
          {[0, 0.33, 0.66, 1].map((pct, idx) => {
            const y = paddingY + innerHeight * (1 - pct);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="#e6dccd"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  fontSize="9"
                  fill="#8c7e72"
                  textAnchor="end"
                  className="font-mono font-medium"
                >
                  {Math.round(pct * maxApplicants)}
                </text>
              </g>
            );
          })}

          {/* Barras de postulaciones */}
          {data.map((d, i) => {
            const barWidth = 24;
            const x = paddingX + (i / (data.length - 1)) * innerWidth - barWidth / 2;
            const barH = (d.applicants / maxApplicants) * innerHeight;
            const y = paddingY + innerHeight - barH;
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={d.month}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx="4"
                  fill={isHovered ? '#c25e3e' : '#e3d2be'}
                  className="transition-colors duration-150"
                />
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 6}
                  fontSize="10"
                  fill={isHovered ? '#2d241e' : '#6b5e52'}
                  textAnchor="middle"
                  className="font-semibold"
                >
                  {d.short}
                </text>
              </g>
            );
          })}

          {/* Línea de contrataciones */}
          <path
            d={linePath}
            fill="none"
            stroke="#c25e3e"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Puntos de contrataciones */}
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIdx === i ? '5' : '3.5'}
              fill="#fff"
              stroke="#c25e3e"
              strokeWidth="2.5"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>
      </div>

      {/* Tooltip interactivo flotante */}
      {hoveredIdx !== null && (
        <div className="mt-2 flex items-center justify-between rounded-xl border border-sand-line bg-cream/70 px-3.5 py-2 text-xs">
          <span className="font-bold text-ink">
            {data[hoveredIdx].month} 2026:
          </span>
          <div className="flex items-center gap-4">
            <span className="text-secondary">
              Postulaciones: <strong className="text-ink">{data[hoveredIdx].applicants}</strong>
            </span>
            <span className="text-secondary">
              Contratados: <strong className="text-terracotta">{data[hoveredIdx].hired}</strong>
            </span>
            <span className="text-secondary">
              Vacantes cerradas: <strong className="text-cocoa">{data[hoveredIdx].vacancies}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Gráfico de distribución de fuentes de talento (Convenios IES vs Mercado)
 */
export function TalentSourcesCard({ sources = [] }) {
  const totalConveniosPct = sources
    .filter((s) => s.id.startsWith('ies-'))
    .reduce((acc, s) => acc + s.percentage, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="m-0 font-display text-sm font-bold text-ink">Origen del talento vinculado</h3>
          <p className="m-0 text-xs text-secondary">Impacto de convenios académicos e iniciativas de atracción</p>
        </div>
        <span className="rounded-full border border-ochre/40 bg-ochre/20 px-2.5 py-0.5 text-[0.68rem] font-bold text-cocoa">
          {totalConveniosPct}% vía IES
        </span>
      </div>

      {/* Barra segmentada horizontal con colores cálidos */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-sand/60 flex">
        {sources.map((s) => (
          <div
            key={s.id}
            className={`${s.color} transition-all duration-300`}
            style={{ width: `${s.percentage}%` }}
            title={`${s.label}: ${s.percentage}% (${s.count} postulantes)`}
          />
        ))}
      </div>

      {/* Lista rectangular de desglose de fuentes */}
      <div className="space-y-2 pt-1">
        {sources.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-xl border border-sand-line bg-white px-3 py-2 text-xs transition-colors hover:bg-sand/30"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`size-2.5 shrink-0 rounded-full ${s.color}`} />
              <span className="truncate font-semibold text-ink">{s.label}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[0.68rem] text-secondary">{s.count} postulantes</span>
              <span className="font-bold text-ink">{s.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Visualización del embudo de contratación y conversión por etapas
 */
export function FunnelConversionCard({ metrics }) {
  const stages = [
    { label: 'Postulaciones Recibidas', count: metrics.applicantsTotal, pct: 100, color: 'bg-sand-dark' },
    { label: 'Evaluados y en Filtro', count: metrics.inReview, pct: Math.round((metrics.inReview / metrics.applicantsTotal) * 100), color: 'bg-ochre' },
    { label: 'En Proceso de Entrevista', count: metrics.interviewing, pct: Math.round((metrics.interviewing / metrics.applicantsTotal) * 100), color: 'bg-terracotta' },
    { label: 'Contrataciones Formales', count: metrics.hiredMonth, pct: Math.round((metrics.hiredMonth / metrics.applicantsTotal) * 100), color: 'bg-emerald-600' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="m-0 font-display text-sm font-bold text-ink">Embudo de atracción y conversión</h3>
          <p className="m-0 text-xs text-secondary">Tasa de efectividad de las vacantes del mes</p>
        </div>
        <div className="text-right">
          <p className="m-0 font-display text-sm font-bold text-terracotta">{metrics.conversionRate}</p>
          <p className="m-0 text-[0.62rem] text-secondary">Conversión global</p>
        </div>
      </div>

      <div className="space-y-2.5 pt-2">
        {stages.map((st) => (
          <div key={st.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-ink">{st.label}</span>
              <span className="font-bold text-secondary">
                {st.count} <span className="font-normal text-[0.68rem]">({st.pct}%)</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-sand/50">
              <div
                className={`h-full rounded-full transition-all duration-500 ${st.color}`}
                style={{ width: `${st.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

