import { useMemo, useState } from 'react';

/**
 * Tabla rectangular de desempeño por reclutador
 */
export function RecruiterPerformanceTable({ recruiters = [] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="m-0 font-display text-sm font-bold text-ink">Desempeño del equipo de selección</h3>
          <p className="m-0 text-xs text-secondary">Métricas de carga de vacantes, velocidad de cobertura y contrataciones</p>
        </div>
        <span className="text-xs text-secondary font-medium">
          {recruiters.length} reclutadores activos
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-sand-line bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink min-w-[620px]">
            <thead className="border-b border-sand-line bg-cream/60 text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
              <tr>
                <th className="px-4 py-3">Reclutador</th>
                <th className="px-3 py-3">Sedes</th>
                <th className="px-3 py-3 text-center">Vacantes</th>
                <th className="px-3 py-3 text-center">Evaluados</th>
                <th className="px-3 py-3 text-center">Contratados</th>
                <th className="px-3 py-3 text-center">Tiempo prom.</th>
                <th className="px-4 py-3 text-right">Efectividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-line/60">
              {recruiters.map((rec) => (
                <tr key={rec.recruiterId} className="transition-colors hover:bg-cream/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={rec.avatar}
                        alt=""
                        className="size-8 rounded-full object-cover border border-sand-line shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="m-0 font-bold text-ink truncate">{rec.fullName}</p>
                        <span className="text-[0.62rem] text-secondary">Reclutador</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-secondary text-[0.7rem] max-w-[140px] truncate">
                    {rec.sites}
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-ink">
                    {rec.activeVacancies}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-secondary">
                    {rec.screenedApplicants}
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-terracotta">
                    {rec.hiresMonth}
                  </td>
                  <td className="px-3 py-3 text-center text-secondary">
                    <span className="font-semibold text-ink">{rec.avgDaysToFill}</span> d
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-sand/60">
                        <div
                          className="h-full rounded-full bg-terracotta"
                          style={{ width: `${rec.effectivenessRate}%` }}
                        />
                      </div>
                      <span className="font-bold text-ink">{rec.effectivenessRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Bitácora rectangular cronológica de actividades del portal
 */
export function ActivityLogSection({ log = [] }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'all', label: 'Todas las acciones' },
    { id: 'vacantes', label: 'Vacantes' },
    { id: 'contrataciones', label: 'Contrataciones' },
    { id: 'convenios', label: 'Convenios IES' },
    { id: 'postulaciones', label: 'Postulaciones' },
    { id: 'seguridad', label: 'Seguridad' },
  ];

  const filteredLog = useMemo(() => {
    return log.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        searchTerm.trim() === '' ||
        item.detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [log, selectedCategory, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="m-0 font-display text-sm font-bold text-ink">Bitácora de actividad y trazabilidad</h3>
          <p className="m-0 text-xs text-secondary">Registro de cambios en vacantes, convenios, contrataciones y accesos</p>
        </div>
        <div className="relative w-full sm:w-64">
          <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secondary" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en el registro..."
            className="w-full rounded-xl border border-sand-line bg-white py-1.5 pl-8 pr-3 text-xs text-ink outline-none transition-all focus:border-terracotta focus:ring-2 focus:ring-terracotta/10"
          />
        </div>
      </div>

      {/* Pestañas de categorías */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-sand-line pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`rounded-xl px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-cocoa text-white shadow-2xs'
                : 'bg-sand/40 text-secondary hover:bg-sand hover:text-ink'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Lista rectangular de eventos */}
      <div className="space-y-2">
        {filteredLog.length === 0 ? (
          <div className="rounded-2xl border border-sand-line bg-white p-8 text-center text-xs text-secondary">
            <i className="bx bx-info-circle text-2xl text-secondary mb-1" />
            <p className="m-0">No se encontraron eventos con los filtros seleccionados.</p>
          </div>
        ) : (
          filteredLog.map((event) => (
            <div
              key={event.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-sand-line bg-white p-3.5 shadow-2xs transition-all hover:border-terracotta/30 hover:bg-cream/30"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-xl text-base font-bold shadow-2xs ${event.iconColor}`}
                >
                  <i className={`bx ${event.icon}`} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-xs font-bold text-ink leading-tight">
                      {event.action}
                    </span>
                    <span className="text-[0.68rem] text-secondary">
                      por <strong className="text-ink font-semibold">{event.user}</strong> ({event.role})
                    </span>
                  </div>
                  <p className="m-0 mt-0.5 text-xs text-secondary leading-snug">
                    {event.detail}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="m-0 text-[0.7rem] font-bold text-ink">{event.timestamp}</p>
                <p className="m-0 text-[0.62rem] text-secondary">{event.exactTime}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

