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
          {recruiters.length} {recruiters.length === 1 ? 'reclutador activo' : 'reclutadores activos'}
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
                      {rec.avatar ? (
                        <img src={rec.avatar} alt="" className="size-8 rounded-full object-cover border border-sand-line shrink-0" />
                      ) : (
                        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-sand text-[0.68rem] font-bold text-cocoa">
                          {rec.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="m-0 font-bold text-ink">{rec.fullName}</p>
                        <span className="text-[0.62rem] text-secondary">Reclutador</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-secondary text-[0.7rem] max-w-[140px] truncate">
                    {rec.sites || 'Sin sede'}
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
                    {rec.avgDaysToFill === null ? '—' : <><span className="font-semibold text-ink">{rec.avgDaysToFill}</span> d</>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-sand/60">
                        <div
                          className="h-full rounded-full bg-terracotta"
                          style={{ width: `${rec.effectivenessRate ?? 0}%` }}
                        />
                      </div>
                      <span className="font-bold text-ink">{rec.effectivenessRate === null ? '—' : `${rec.effectivenessRate}%`}</span>
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

const LOG_CATEGORIES = {
  vacantes: { label: 'Vacantes', icon: 'bx-briefcase-alt-2', color: 'bg-ochre text-cocoa' },
  contrataciones: { label: 'Contrataciones', icon: 'bx-user-check', color: 'bg-green text-white' },
  postulaciones: { label: 'Postulaciones', icon: 'bx-user-voice', color: 'bg-cocoa text-white' },
};

/**
 * Bitácora rectangular cronológica de actividades del portal
 */
export function ActivityLogSection({ log = [] }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [{ id: 'all', label: 'Todas las acciones' }, ...Object.entries(LOG_CATEGORIES)
    .filter(([id]) => log.some((item) => item.category === id))
    .map(([id, c]) => ({ id, label: c.label }))];

  const filteredLog = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return log.filter((item) =>
      (selectedCategory === 'all' || item.category === selectedCategory)
      && (!term || `${item.action} ${item.detail} ${item.user || ''}`.toLowerCase().includes(term)));
  }, [log, selectedCategory, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="m-0 font-display text-sm font-bold text-ink">Bitácora de actividad y trazabilidad</h3>
          <p className="m-0 text-xs text-secondary">Últimos movimientos de tus vacantes y postulaciones</p>
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
            <p className="m-0">{log.length ? 'No se encontraron eventos con los filtros seleccionados.' : 'Aún no hay movimientos registrados.'}</p>
          </div>
        ) : (
          filteredLog.map((event) => (
            <div
              key={event.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-sand-line bg-white p-3.5 shadow-2xs transition-all hover:border-terracotta/30 hover:bg-cream/30"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-xl text-base font-bold shadow-2xs ${LOG_CATEGORIES[event.category].color}`}
                >
                  <i className={`bx ${LOG_CATEGORIES[event.category].icon}`} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-xs font-bold text-ink leading-tight">
                      {event.action}
                    </span>
                    {event.user && (
                      <span className="text-[0.68rem] text-secondary">
                        por <strong className="text-ink font-semibold">{event.user}</strong>{event.role ? ` (${event.role})` : ''}
                      </span>
                    )}
                  </div>
                  <p className="m-0 mt-0.5 text-xs text-secondary leading-snug">
                    {event.detail}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="m-0 text-[0.7rem] font-bold text-ink">{new Date(event.at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</p>
                <p className="m-0 text-[0.62rem] text-secondary">{new Date(event.at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

