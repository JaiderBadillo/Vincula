import { useState, useMemo } from 'react';
import Chart from 'react-apexcharts';
import { skillLevels, skillSuggestions } from '../../data/profile.js';
import LegacySoftSkillsRadarChart from '../legacy_charts/LegacySoftSkillsRadarChart.jsx';

export { LegacySoftSkillsRadarChart };

/**
 * Divide de forma equilibrada etiquetas largas en 2 renglones para evitar
 * desbordamientos del contenedor en gráficos de radar.
 */
function formatRadarCategory(name, isCustom) {
  const tag = isCustom ? '' : ' *';
  const words = name.trim().split(' ');
  if (words.length === 1) {
    return name + tag;
  }
  if (words.length === 2) {
    return [words[0], words[1] + tag];
  }
  if (words.length === 3) {
    return [`${words[0]} ${words[1]}`, words[2] + tag];
  }
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ') + tag];
}

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
  const [viewMode, setViewMode] = useState('both'); // 'both' | 'radar' | 'bars'
  const [chartEngine, setChartEngine] = useState('apex'); // 'apex' | 'legacy'

  const softSkills = useMemo(() => {
    return skills.filter((s) => s.type === 'soft');
  }, [skills]);

  if (chartEngine === 'legacy') {
    return (
      <div className={`space-y-3 ${className}`}>
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
        <LegacySoftSkillsRadarChart
          skills={skills}
          onUpdateSkill={onUpdateSkill}
          onRemoveSkill={onRemoveSkill}
          onAddSkill={onAddSkill}
          readOnly={readOnly}
          className=""
        />
      </div>
    );
  }

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
          level: 0, // Sugerida: sin dato registrado (no infla el polígono)
          isCustom: false,
        });
      }
    }
    return items;
  }, [softSkills]);

  const radarSeries = useMemo(() => {
    return [
      {
        name: 'Nivel Registrado',
        data: chartItems.map((item) => item.level || 0),
      },
    ];
  }, [chartItems]);

  const radarOptions = useMemo(() => {
    return {
      chart: {
        type: 'radar',
        height: 290,
        toolbar: { show: false },
        fontFamily: 'inherit',
        parentHeightOffset: 0,
        dropShadow: {
          enabled: true,
          blur: 3,
          left: 1,
          top: 1,
          opacity: 0.08,
        },
      },
      colors: ['#051F26'],
      stroke: {
        width: 2.5,
        colors: ['#051F26'],
      },
      fill: {
        opacity: 0.22,
        colors: ['#051F26'],
      },
      markers: {
        size: 4,
        colors: ['#ffffff'],
        strokeColors: '#051F26',
        strokeWidth: 2,
        hover: { size: 6.5 },
      },
      xaxis: {
        categories: chartItems.map((item) => formatRadarCategory(item.name, item.isCustom)),
        labels: {
          show: true,
          style: {
            colors: chartItems.map((item) => (item.isCustom ? '#051F26' : '#718188')),
            fontSize: '9.5px',
            fontWeight: 600,
            fontFamily: 'inherit',
          },
        },
      },
      yaxis: {
        min: 0,
        max: 4,
        tickAmount: 4,
        show: false,
      },
      plotOptions: {
        radar: {
          size: 58,
          polygons: {
            strokeColors: '#e2e8f0',
            connectorColors: '#e2e8f0',
            fill: {
              colors: ['#f8fafc', '#ffffff'],
            },
          },
        },
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val, { dataPointIndex }) => {
            const item = chartItems[dataPointIndex];
            if (!val || val === 0) return 'Sin registrar (sugerida)';
            const lvlName = skillLevels[val - 1] || `Nivel ${val}`;
            return `${lvlName} (${val} de 4)`;
          },
        },
      },
    };
  }, [chartItems]);

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

        {/* Controles: Switcher Antes/Después + Alternador de vista */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Switcher Antes/Después */}
          <div className="inline-flex rounded-lg border border-line bg-page p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setChartEngine('apex')}
              className={`rounded-md px-2.5 py-1 font-bold transition-all cursor-pointer ${
                chartEngine === 'apex' ? 'bg-[#051F26] text-white shadow-2xs' : 'text-secondary hover:text-ink'
              }`}
              title="Versión moderna interactiva con ApexCharts"
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

          {/* Alternador de vista */}
          <div className="inline-flex rounded-lg border border-line bg-page p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                viewMode === 'both' ? 'bg-[#051F26] text-white shadow-xs font-bold' : 'text-secondary hover:text-ink'
              }`}
            >
              Completo
            </button>
            <button
              type="button"
              onClick={() => setViewMode('radar')}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                viewMode === 'radar' ? 'bg-[#051F26] text-white shadow-xs font-bold' : 'text-secondary hover:text-ink'
              }`}
            >
              Radar
            </button>
            <button
              type="button"
              onClick={() => setViewMode('bars')}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                viewMode === 'bars' ? 'bg-[#051F26] text-white shadow-xs font-bold' : 'text-secondary hover:text-ink'
              }`}
            >
              Barras
            </button>
          </div>
        </div>
      </div>

      {/* Resumen calculado del perfil */}
      {softSkills.length > 0 &&
        (() => {
          const levels = softSkills.map((s) => s.level || 2);
          const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
          const top = softSkills.reduce((b, s) => ((s.level || 2) > (b.level || 2) ? s : b), softSkills[0]);
          const low = softSkills.reduce((b, s) => ((s.level || 2) < (b.level || 2) ? s : b), softSkills[0]);
          return (
            <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-xl border border-line-soft bg-white px-3 py-2">
                <p className="m-0 text-[0.65rem] font-bold uppercase tracking-wider text-secondary">Nivel promedio</p>
                <p className="m-0 mt-0.5 font-display text-base font-bold text-[#051F26]">
                  {avg.toFixed(1)}<span className="text-xs font-semibold text-secondary"> / 4</span>
                </p>
              </div>
              <div className="rounded-xl border border-line-soft bg-white px-3 py-2">
                <p className="m-0 text-[0.65rem] font-bold uppercase tracking-wider text-secondary">Mayor fortaleza</p>
                <p className="m-0 mt-0.5 truncate font-bold text-[#051F26]">{top.name}</p>
              </div>
              <div className="rounded-xl border border-line-soft bg-white px-3 py-2">
                <p className="m-0 text-[0.65rem] font-bold uppercase tracking-wider text-secondary">A fortalecer</p>
                <p className="m-0 mt-0.5 truncate font-bold text-[#051F26]">
                  {softSkills.length > 1 && low.id !== top.id ? low.name : '—'}
                </p>
              </div>
            </div>
          );
        })()}

      {/* Contenedor principal de visualizaciones */}
      <div className={`mt-5 grid items-center gap-6 ${
        viewMode === 'both' ? 'lg:grid-cols-12' : 'grid-cols-1'
      }`}>
        {/* GRÁFICO 1: RADAR / SPIDER CHART CON APEXCHARTS */}
        {(viewMode === 'both' || viewMode === 'radar') && (
          <div className={`flex flex-col items-center justify-between rounded-xl border border-line-soft bg-white/95 p-3 sm:p-4 shadow-2xs ${
            viewMode === 'both' ? 'lg:col-span-5 xl:col-span-5' : 'max-w-md mx-auto w-full'
          }`}>
            <div className="relative w-full flex items-center justify-center py-1">
              <Chart options={radarOptions} series={radarSeries} type="radar" height={290} width="100%" />

              {softSkills.length === 0 && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="rounded-lg border border-line bg-white/90 px-3 py-1.5 text-[0.7rem] font-semibold text-secondary shadow-xs">
                    Agrega competencias para calibrar tu perfil
                  </span>
                </div>
              )}
            </div>

            {/* Leyenda al pie del radar */}
            <div className="mt-2 flex items-center gap-4 text-[0.7rem] text-secondary">
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
            viewMode === 'both' ? 'lg:col-span-7 xl:col-span-7' : 'w-full'
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
