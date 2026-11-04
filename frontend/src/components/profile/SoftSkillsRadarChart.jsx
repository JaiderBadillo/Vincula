import { useState, useMemo } from 'react';
import { skillLevels, skillSuggestions } from '../../data/profile.js';

/**
 * Gráfico Radial (Radar/Spider Chart) y Desglose de Habilidades Blandas
 * Diseñado con la identidad visual corporativa en tono institucional #051F26.
 */
export default function SoftSkillsRadarChart({
  skills = [],
  onUpdateSkill,
  onRemoveSkill,
  onAddSkill,
  readOnly = false,
  className = '',
}) {
  const [hoveredSkill, setHoveredSkill] = useState(null);
  const [viewMode, setViewMode] = useState('both'); // 'both' | 'radar' | 'bars'

  const softSkills = useMemo(() => {
    return skills.filter((s) => s.type === 'soft');
  }, [skills]);

  // Si hay menos de 3 habilidades blandas, completamos con sugerencias benchmark para que el radar siempre tenga forma geométrica
  const chartItems = useMemo(() => {
    const defaultSuggestions = skillSuggestions.soft || [
      'Trabajo en equipo',
      'Comunicación asertiva',
      'Resolución de problemas',
      'Adaptabilidad',
      'Liderazgo',
      'Pensamiento crítico',
    ];

    if (softSkills.length >= 3) {
      return softSkills.map((s) => ({
        id: s.id,
        name: s.name,
        level: s.level || 2,
        isCustom: true,
      }));
    }

    // Combinar las que tiene el candidato con sugerencias benchmark
    const existingNames = new Set(softSkills.map((s) => s.name.toLowerCase()));
    const items = softSkills.map((s) => ({
      id: s.id,
      name: s.name,
      level: s.level || 2,
      isCustom: true,
    }));

    for (const sugg of defaultSuggestions) {
      if (items.length >= 5) break;
      if (!existingNames.has(sugg.toLowerCase())) {
        items.push({
          id: `bench-${sugg}`,
          name: sugg,
          level: 1, // Benchmark sugerido inicial
          isCustom: false,
        });
      }
    }
    return items;
  }, [softSkills]);

  // Geometría del Radar SVG
  const size = 320;
  const center = size / 2;
  const radius = 100;
  const totalAxes = chartItems.length;

  const points = useMemo(() => {
    if (totalAxes === 0) return [];
    return chartItems.map((item, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / totalAxes;
      const normalizedLevel = (item.level || 1) / 4; // Escala 1 a 4
      const r = radius * normalizedLevel;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);

      // Posición de la etiqueta exterior
      const labelDistance = radius + 28;
      const labelX = center + labelDistance * Math.cos(angle);
      const labelY = center + labelDistance * Math.sin(angle);

      // Alineación de texto
      let textAnchor = 'middle';
      if (Math.cos(angle) > 0.25) textAnchor = 'start';
      else if (Math.cos(angle) < -0.25) textAnchor = 'end';

      return {
        ...item,
        angle,
        x,
        y,
        labelX,
        labelY,
        textAnchor,
      };
    });
  }, [chartItems, totalAxes, center, radius]);

  // Coordenadas de los polígonos concéntricos (Niveles 1, 2, 3, 4)
  const gridPolygons = useMemo(() => {
    if (totalAxes === 0) return [];
    return [1, 2, 3, 4].map((lvl) => {
      const r = radius * (lvl / 4);
      const polyPoints = Array.from({ length: totalAxes }).map((_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / totalAxes;
        return `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`;
      });
      return {
        level: lvl,
        label: skillLevels[lvl - 1],
        points: polyPoints.join(' '),
      };
    });
  }, [totalAxes, center, radius]);

  // Polígono principal de las habilidades del egresado
  const activePolygonPath = useMemo(() => {
    if (points.length < 3) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  }, [points]);

  return (
    <div className={`rounded-2xl border border-line bg-gradient-to-br from-[#051F26]/[0.02] via-white to-panel/30 p-5 shadow-xs ${className}`}>
      {/* Encabezado del módulo de gráficas */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#051F26]/10 text-[#051F26] text-xl shadow-2xs">
            <i className="bx bx-radar" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="m-0 font-display text-sm font-bold text-[#051F26]">
                Matriz Radial de Competencias Blandas
              </h3>
              <span className="rounded-full bg-[#051F26]/10 px-2.5 py-0.5 text-[0.65rem] font-bold text-[#051F26]">
                {softSkills.length} registradas
              </span>
            </div>
            <p className="m-0 text-xs text-secondary">
              Mapeo gráfico de habilidades socioemocionales e interpersonales para procesos de selección.
            </p>
          </div>
        </div>

        {/* Alternador de vista */}
        <div className="inline-flex rounded-lg border border-line bg-page p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('both')}
            className={`rounded-md px-2.5 py-1 transition-all ${
              viewMode === 'both' ? 'bg-[#051F26] text-white shadow-xs font-bold' : 'text-secondary hover:text-ink'
            }`}
          >
            Completo
          </button>
          <button
            type="button"
            onClick={() => setViewMode('radar')}
            className={`rounded-md px-2.5 py-1 transition-all ${
              viewMode === 'radar' ? 'bg-[#051F26] text-white shadow-xs font-bold' : 'text-secondary hover:text-ink'
            }`}
          >
            Radar
          </button>
          <button
            type="button"
            onClick={() => setViewMode('bars')}
            className={`rounded-md px-2.5 py-1 transition-all ${
              viewMode === 'bars' ? 'bg-[#051F26] text-white shadow-xs font-bold' : 'text-secondary hover:text-ink'
            }`}
          >
            Barras
          </button>
        </div>
      </div>

      {/* Contenedor principal de visualizaciones */}
      <div className={`mt-5 grid items-center gap-6 ${
        viewMode === 'both' ? 'lg:grid-cols-12' : 'grid-cols-1'
      }`}>
        {/* GRÁFICO 1: RADAR / SPIDER CHART SVG */}
        {(viewMode === 'both' || viewMode === 'radar') && (
          <div className={`flex flex-col items-center justify-center rounded-xl border border-line-soft bg-white/95 p-4 shadow-2xs ${
            viewMode === 'both' ? 'lg:col-span-6 xl:col-span-5' : 'max-w-md mx-auto w-full'
          }`}>
            <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
              <svg
                viewBox={`0 0 ${size} ${size}`}
                className="w-full h-full overflow-visible select-none"
              >
                {/* Cuadrícula concéntrica */}
                {gridPolygons.map((g) => (
                  <polygon
                    key={g.level}
                    points={g.points}
                    fill={g.level % 2 === 0 ? 'rgba(5, 31, 38, 0.025)' : 'none'}
                    stroke="#dce4e6"
                    strokeWidth={g.level === 4 ? '1.5' : '1'}
                    strokeDasharray={g.level === 4 ? 'none' : '3 3'}
                  />
                ))}

                {/* Ejes radiales (Spokes) */}
                {points.map((p, idx) => (
                  <line
                    key={`spoke-${idx}`}
                    x1={center}
                    y1={center}
                    x2={center + radius * Math.cos(p.angle)}
                    y2={center + radius * Math.sin(p.angle)}
                    stroke="#e8edef"
                    strokeWidth="1.2"
                  />
                ))}

                {/* Polígono de datos del egresado */}
                {activePolygonPath && (
                  <path
                    d={activePolygonPath}
                    fill="rgba(5, 31, 38, 0.16)"
                    stroke="#051F26"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                  />
                )}

                {/* Vértices interactivos */}
                {points.map((p) => {
                  const isHovered = hoveredSkill?.id === p.id;
                  return (
                    <g
                      key={`vertex-${p.id}`}
                      className="cursor-pointer transition-transform"
                      onMouseEnter={() => setHoveredSkill(p)}
                      onMouseLeave={() => setHoveredSkill(null)}
                    >
                      {/* Halo al hacer hover */}
                      {isHovered && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={10}
                          fill="rgba(5, 31, 38, 0.18)"
                          className="animate-ping"
                        />
                      )}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 6 : p.isCustom ? 4.5 : 3.5}
                        fill={p.isCustom ? '#ffffff' : '#f1e7d6'}
                        stroke={p.isCustom ? '#051F26' : '#718188'}
                        strokeWidth={isHovered ? 3 : 2}
                        className="transition-all"
                      />
                    </g>
                  );
                })}

                {/* Etiquetas exteriores de habilidades */}
                {points.map((p) => {
                  const isHovered = hoveredSkill?.id === p.id;
                  return (
                    <text
                      key={`label-${p.id}`}
                      x={p.labelX}
                      y={p.labelY}
                      textAnchor={p.textAnchor}
                      dominantBaseline="central"
                      className={`text-[0.68rem] transition-colors ${
                        isHovered
                          ? 'font-black fill-[#051F26] font-display text-[0.75rem]'
                          : p.isCustom
                          ? 'font-bold fill-[#051F26]'
                          : 'fill-secondary italic'
                      }`}
                    >
                      {p.name.length > 18 ? `${p.name.substring(0, 16)}…` : p.name}
                      {!p.isCustom && ' *'}
                    </text>
                  );
                })}
              </svg>

              {/* Tooltip flotante al pasar el mouse por los puntos */}
              {hoveredSkill && (
                <div
                  className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 z-10 rounded-xl border border-line bg-[#051F26] text-white px-3 py-1.5 text-xs shadow-lg flex items-center gap-2"
                >
                  <span className="font-bold">{hoveredSkill.name}</span>
                  <span className="text-lime font-bold">
                    {skillLevels[(hoveredSkill.level || 1) - 1]} ({hoveredSkill.level}/4)
                  </span>
                </div>
              )}
            </div>

            {/* Leyenda al pie del radar */}
            <div className="mt-3 flex items-center gap-4 text-[0.7rem] text-secondary">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#051F26] inline-block" />
                Registrada ({softSkills.length})
              </span>
              {chartItems.some((s) => !s.isCustom) && (
                <span className="flex items-center gap-1.5 italic">
                  <span className="size-2.5 rounded-full border border-dashed border-secondary inline-block" />
                  * Sugerida para balance
                </span>
              )}
            </div>
          </div>
        )}

        {/* GRÁFICO 2: BARRAS HORIZONTALES CON ESCALA DE COMPETENCIA */}
        {(viewMode === 'both' || viewMode === 'bars') && (
          <div className={`space-y-3 ${
            viewMode === 'both' ? 'lg:col-span-6 xl:col-span-7' : 'w-full'
          }`}>
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-[#051F26] uppercase tracking-wider">
                Desglose y Ajuste de Nivel
              </span>
              <span className="text-[0.7rem] text-secondary">
                Haz clic en los números para graduar el nivel
              </span>
            </div>

            {softSkills.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-white/70 p-6 text-center">
                <i className="bx bx-bar-chart-alt-2 text-3xl text-secondary mb-2 block" />
                <p className="m-0 text-sm font-bold text-ink">
                  Aún no has añadido habilidades blandas
                </p>
                <p className="m-0 mt-1 text-xs text-secondary">
                  Selecciona una de las sugerencias recomendadas abajo para alimentar el gráfico.
                </p>
              </div>
            ) : (
              softSkills.map((s) => {
                const currentLevel = s.level || 2;
                const pct = (currentLevel / 4) * 100;
                const levelName = skillLevels[currentLevel - 1];

                return (
                  <div
                    key={s.id}
                    className="group rounded-xl border border-line-soft bg-white p-3 shadow-2xs hover:border-[#051F26]/40 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <i className="bx bx-check-circle text-[#051F26] text-sm" />
                        <span className="text-xs font-bold text-[#051F26]">{s.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[0.7rem] font-bold text-[#051F26] bg-[#051F26]/10 px-2.5 py-0.5 rounded-md">
                          {levelName} ({currentLevel}/4)
                        </span>

                        {!readOnly && onRemoveSkill && (
                          <button
                            type="button"
                            onClick={() => onRemoveSkill(s.id)}
                            className="size-5 grid place-items-center rounded text-secondary hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-40 group-hover:opacity-100"
                            title={`Eliminar ${s.name}`}
                          >
                            <i className="bx bx-x text-sm" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Barra de progreso interactiva */}
                    <div className="relative flex items-center gap-1.5">
                      <div className="relative h-2.5 flex-1 rounded-full bg-panel overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#051F26] transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Botones de nivel 1 a 4 */}
                      {!readOnly && onUpdateSkill && (
                        <div className="inline-flex items-center gap-1 ml-2">
                          {[1, 2, 3, 4].map((lv) => (
                            <button
                              key={lv}
                              type="button"
                              onClick={() => onUpdateSkill(s.id, { level: lv })}
                              title={`Fijar nivel en ${skillLevels[lv - 1]}`}
                              className={`size-5 rounded text-[0.65rem] font-bold transition-all ${
                                currentLevel === lv
                                  ? 'bg-[#051F26] text-white shadow-2xs scale-105'
                                  : 'bg-page border border-line text-secondary hover:text-[#051F26] hover:border-[#051F26]/30'
                              }`}
                            >
                              {lv}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Sugerencias rápidas para agregar al radar */}
            {!readOnly && onAddSkill && (
              <div className="pt-2">
                <span className="text-[0.7rem] font-bold uppercase text-secondary block mb-1.5">
                  Agregar competencias clave recomendadas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(skillSuggestions.soft || [])
                    .filter((sugg) => !softSkills.some((s) => s.name.toLowerCase() === sugg.toLowerCase()))
                    .slice(0, 5)
                    .map((sugg) => (
                      <button
                        key={sugg}
                        type="button"
                        onClick={() => onAddSkill(sugg, 2)}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#051F26]/30 bg-[#051F26]/5 px-2.5 py-1 text-xs font-semibold text-[#051F26] hover:border-solid hover:bg-[#051F26]/10 transition-colors"
                      >
                        <i className="bx bx-plus text-xs" />
                        {sugg}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
