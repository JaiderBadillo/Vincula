import { Link } from 'react-router-dom';
import { useSavedJobs } from '../../hooks/useSavedJobs.js';

export default function SavedVacanciesSection({ onOpenJob, onApplyJob, appliedJobIds = new Set() }) {
  const { savedJobs, savedCount, removeSaved } = useSavedJobs();

  return (
    <section
      id="vacantes-guardadas"
      aria-labelledby="saved-vacancies-title"
      className="space-y-4 scroll-mt-24 transition-all duration-300"
    >
      {/* ─── Encabezado de la Sección ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2
              id="saved-vacancies-title"
              className="m-0 font-display text-lg sm:text-xl font-bold tracking-tight text-ink"
            >
              Vacantes Guardadas
            </h2>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
              {savedCount} {savedCount === 1 ? 'favorita' : 'favoritas'}
            </span>
          </div>
          <p className="m-0 mt-1 text-xs sm:text-sm text-body-muted">
            Oportunidades de empresas con convenio institucional que has guardado para preparar tu postulación.
          </p>
        </div>

        <Link
          to="/dashboard/vacantes"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-green-dark hover:text-green hover:underline no-underline self-start sm:self-auto shrink-0"
        >
          <span>Explorar catálogo completo</span>
          <i className="bx bx-right-arrow-alt text-base" />
        </Link>
      </div>

      {/* ─── Grid de Tarjetas de Vacantes Guardadas ─── */}
      {savedJobs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {savedJobs.map((job) => {
            const isApplied = appliedJobIds.has(job.id);

            return (
              <article
                key={job.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-card hover:shadow-hero hover:border-green/40 transition-all"
              >
                <div>
                  {/* Fila superior: Logo empresa, Alianza y Botón Quitar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`grid size-11 shrink-0 place-items-center rounded-xl text-xs font-bold font-display shadow-xs ${job.companyLogoBg}`}
                      >
                        {job.companyShort.slice(0, 3).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-display text-sm font-bold text-ink truncate">
                            {job.company}
                          </span>
                          <i className="bx bxs-badge-check text-green-dark text-xs shrink-0" title="Convenio Verificado" />
                        </div>
                        <span className="block text-[0.68rem] text-secondary truncate mt-0.5">
                          {job.city} · <strong className="text-ink font-semibold">{job.mode}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Botón para quitar de guardados */}
                    <button
                      type="button"
                      onClick={() => removeSaved(job.id)}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-amber-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                      title="Quitar de vacantes guardadas"
                    >
                      <i className="bx bxs-bookmark-star text-lg" />
                    </button>
                  </div>

                  {/* Título de la Vacante (Clickable) */}
                  <h3
                    onClick={() => onOpenJob(job)}
                    className="m-0 mt-3.5 font-display text-base font-bold text-ink group-hover:text-green-dark transition-colors line-clamp-2 cursor-pointer leading-snug"
                    title="Haz clic para ver la ficha completa"
                  >
                    {job.title}
                  </h3>

                  {/* Pills de Remuneración y Match */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[0.72rem] font-bold text-emerald-800 border border-emerald-200">
                      <i className="bx bx-credit-card-front text-xs" />
                      {job.salaryFormatted}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-lg bg-lime/25 px-2.5 py-1 text-[0.72rem] font-extrabold text-ink border border-lime/40">
                      <i className="bx bxs-bolt text-xs text-green-dark" />
                      {job.utsMatch}% Match Perfil
                    </span>
                  </div>

                  {/* Días restantes de convocatoria */}
                  <div className="mt-3 pt-3 border-t border-line-soft flex items-center justify-between text-xs text-secondary">
                    <span className="flex items-center gap-1 text-[0.7rem]">
                      <i className="bx bx-time text-xs" />
                      Cierra en <strong>{job.daysRemaining} días</strong>
                    </span>
                    <span className="text-[0.68rem] text-secondary">
                      {job.contractType}
                    </span>
                  </div>
                </div>

                {/* Acciones de Tarjeta */}
                <div className="mt-4 pt-3 border-t border-line flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenJob(job)}
                    className="flex-1 rounded-xl border border-line bg-page hover:bg-white hover:text-green-dark py-2 px-3 text-xs font-bold text-ink transition-colors cursor-pointer text-center shadow-2xs"
                  >
                    Ver ficha completa
                  </button>

                  <button
                    type="button"
                    onClick={() => onApplyJob(job)}
                    className={`rounded-xl py-2 px-3.5 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isApplied
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-green hover:bg-green-dark text-white shadow-2xs'
                    }`}
                    title={isApplied ? 'Ya te postulaste' : 'Postulación rápida con perfil verificado'}
                  >
                    <i className={`bx ${isApplied ? 'bx-check' : 'bx-send'} text-sm`} />
                    <span>{isApplied ? 'Postulado' : 'Postularme'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* ─── Estado Vacío (Empty State) ─── */
        <div className="rounded-2xl border border-line bg-white p-8 sm:p-10 text-center shadow-2xs space-y-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 mx-auto">
            <i className="bx bx-bookmark-alt text-2xl" />
          </span>
          <div>
            <h3 className="m-0 font-display text-base font-bold text-ink">
              No tienes vacantes guardadas todavía
            </h3>
            <p className="m-0 mt-1 text-xs text-body-muted max-w-md mx-auto leading-relaxed">
              Cuando encuentres ofertas interesantes en el portal de vacantes, haz clic en el icono de marcador para guardarlas aquí y revisarlas con calma.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/dashboard/vacantes"
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-ink-soft transition-colors no-underline"
            >
              <i className="bx bx-search text-base text-lime" />
              <span>Explorar Vacantes Activas</span>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
