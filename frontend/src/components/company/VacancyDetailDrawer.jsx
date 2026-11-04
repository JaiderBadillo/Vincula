import { useEffect } from 'react';
import { VACANCY_STATUS, experienceLabel } from '../../data/companyVacanciesData.js';
import { daysUntil, formatApplicationDate } from '../../utils/formatters.js';

function closingText(vacancy) {
  if (!vacancy.closingDate) return 'Sin fecha de cierre';
  const days = daysUntil(vacancy.closingDate);
  const date = formatApplicationDate(vacancy.closingDate);
  if (vacancy.status === 'closed') return `Cerró el ${date}`;
  if (days < 0) return `Venció el ${date}`;
  if (days === 0) return `Cierra hoy (${date})`;
  return `Cierra el ${date} · faltan ${days} día${days === 1 ? '' : 's'}`;
}

function Section({ title, icon, children }) {
  return (
    <section className="border-t border-sand-line px-6 py-5">
      <h3 className="m-0 flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-secondary">
        {icon && <i className={`bx ${icon} text-sm text-terracotta`} aria-hidden="true" />}
        <span>{title}</span>
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Panel lateral con el detalle completo de una vacante:
 * Incluye habilidades técnicas, habilidades blandas, programas académicos afines, horario y plazas.
 */
export default function VacancyDetailDrawer({
  vacancy,
  site,
  recruiters = [],
  onClose,
  onEdit,
  onCycleStatus,
  onCloseVacancy,
  onDelete,
  onReassign,
}) {
  const open = Boolean(vacancy);

  useEffect(() => {
    if (!open) return undefined;
    function handleEscape(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  const status = vacancy ? VACANCY_STATUS[vacancy.status] || VACANCY_STATUS.open : null;
  const owner = vacancy?.ownerRecruiterId
    ? recruiters.find((r) => r.id === vacancy.ownerRecruiterId)
    : null;

  const primaryLabel = !vacancy
    ? ''
    : vacancy.status === 'open'
      ? 'Pausar'
      : vacancy.status === 'paused'
        ? 'Reanudar'
        : vacancy.status === 'draft'
          ? 'Publicar'
          : 'Reabrir';

  const techSkills = vacancy?.skillsTech?.length
    ? vacancy.skillsTech
    : (vacancy?.skills || []).filter(
        (s) =>
          !['Trabajo en equipo', 'Comunicación asertiva', 'Liderazgo', 'Pensamiento crítico', 'Resolución de problemas', 'Adaptabilidad'].includes(s)
      );

  const softSkills = vacancy?.skillsSoft?.length
    ? vacancy.skillsSoft
    : (vacancy?.skills || []).filter((s) =>
        ['Trabajo en equipo', 'Comunicación asertiva', 'Liderazgo', 'Pensamiento crítico', 'Resolución de problemas', 'Adaptabilidad'].includes(s)
      );

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-cocoa/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        className={`fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[32rem] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vacancy-drawer-title"
        aria-hidden={!open}
      >
        {vacancy && (
          <>
            {/* Encabezado */}
            <header className="bg-cocoa px-6 pb-5 pt-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[0.68rem] tracking-wider text-white/80">
                  {vacancy.code}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="-mr-2 -mt-1 grid size-8 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                  aria-label="Cerrar detalle"
                >
                  <i className="bx bx-x text-2xl" aria-hidden="true" />
                </button>
              </div>

              <h2 id="vacancy-drawer-title" className="m-0 mt-2 font-display text-xl font-bold leading-snug">
                {vacancy.title}
              </h2>

              <p className="m-0 mt-1.5 text-xs text-white/70">
                {vacancy.category}
                <span className="mx-1.5 text-white/40">•</span>
                {site ? `${site.name}, ${site.city}` : 'Sin sede'}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span className={`size-2 rounded-full ${status.dot}`} aria-hidden="true" />
                  {status.label}
                </span>
                <span className="text-white/80">
                  <strong className="font-display text-base text-white">{vacancy.applicantsCount || 0}</strong>{' '}
                  postulante(s)
                </span>
                <span className="rounded-md bg-ochre/25 px-2 py-0.5 text-[0.7rem] font-bold text-ochre">
                  {vacancy.openSpots || 1} {vacancy.openSpots === 1 ? 'plaza disponible' : 'plazas disponibles'}
                </span>
              </div>
            </header>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto">
              <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-4 px-6 py-5 text-sm">
                <div>
                  <dt className="text-xs text-secondary">Modalidad</dt>
                  <dd className="m-0 mt-0.5 font-semibold text-ink">{vacancy.modality}</dd>
                </div>
                <div>
                  <dt className="text-xs text-secondary">Contrato</dt>
                  <dd className="m-0 mt-0.5 font-semibold text-ink">{vacancy.contractType}</dd>
                </div>
                <div>
                  <dt className="text-xs text-secondary">Nivel de experiencia</dt>
                  <dd className="m-0 mt-0.5 font-semibold text-ink">{experienceLabel(vacancy.experienceLevel)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-secondary">Salario / Remuneración</dt>
                  <dd className="m-0 mt-0.5 font-semibold text-ink">{vacancy.salary || 'A convenir'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-secondary">Jornada y Horario</dt>
                  <dd className="m-0 mt-0.5 text-xs font-medium text-ink">
                    {vacancy.workSchedule || 'Lunes a Viernes'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-secondary">Idiomas requeridos</dt>
                  <dd className="m-0 mt-0.5 text-xs font-medium text-ink">
                    {vacancy.languages || 'No requerido'}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-secondary">Convocatoria</dt>
                  <dd className="m-0 mt-0.5 text-ink">
                    {vacancy.publishedAt
                      ? `Publicada el ${formatApplicationDate(vacancy.publishedAt)}`
                      : 'Borrador sin publicar'}
                    <span className="block text-xs text-secondary">{closingText(vacancy)}</span>
                  </dd>
                </div>
              </dl>

              {/* Programas académicos afines */}
              {vacancy.targetPrograms?.length > 0 && (
                <Section title="Programas académicos afines" icon="bxs-graduation">
                  <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                    {vacancy.targetPrograms.map((prog) => (
                      <li
                        key={prog}
                        className="rounded-lg border border-line bg-page px-2.5 py-1 text-xs font-semibold text-ink"
                      >
                        {prog}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Habilidades Técnicas */}
              <Section title="Habilidades Técnicas y Herramientas" icon="bx-code-alt">
                {techSkills.length > 0 ? (
                  <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                    {techSkills.map((skill) => (
                      <li
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-lg bg-cocoa px-2.5 py-1 text-xs font-medium text-white shadow-2xs"
                      >
                        <i className="bx bx-check text-xs text-lime" aria-hidden="true" />
                        <span>{skill}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-sm text-secondary">Sin habilidades técnicas especificadas.</p>
                )}
              </Section>

              {/* Habilidades Blandas */}
              <Section title="Habilidades Blandas y Competencias" icon="bx-heart">
                {softSkills.length > 0 ? (
                  <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                    {softSkills.map((skill) => (
                      <li
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-lg border border-sand-line bg-sand/80 px-2.5 py-1 text-xs font-semibold text-cocoa"
                      >
                        <i className="bx bxs-star text-xs text-ochre" aria-hidden="true" />
                        <span>{skill}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-sm text-secondary">Sin habilidades blandas especificadas.</p>
                )}
              </Section>

              {/* Descripción */}
              <Section title="Propósito del cargo" icon="bx-align-left">
                {vacancy.description ? (
                  <p className="m-0 whitespace-pre-line text-sm leading-relaxed text-ink/85">{vacancy.description}</p>
                ) : (
                  <p className="m-0 text-sm text-secondary">Esta vacante aún no tiene descripción.</p>
                )}
              </Section>

              {/* Responsabilidades */}
              {vacancy.responsibilities?.length > 0 && (
                <Section title="Responsabilidades y Funciones" icon="bx-list-check">
                  <ul className="m-0 grid list-none gap-2 p-0">
                    {vacancy.responsibilities.map((resp, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-ink/85 leading-relaxed">
                        <i className="bx bx-chevron-right text-base text-terracotta shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Requisitos */}
              {vacancy.requirements?.length > 0 && (
                <Section title="Requisitos del Aspirante" icon="bx-check-shield">
                  <ul className="m-0 grid list-none gap-2 p-0">
                    {vacancy.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-ink/85 leading-relaxed">
                        <i className="bx bx-check text-base text-green shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Beneficios */}
              <Section title="Beneficios Corporativos" icon="bx-gift">
                {vacancy.benefits?.length ? (
                  <ul className="m-0 grid list-none gap-1.5 p-0">
                    {vacancy.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-center gap-2 text-sm text-ink/85">
                        <i className="bx bx-check text-base text-terracotta" aria-hidden="true" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-sm text-secondary">Sin beneficios registrados.</p>
                )}
              </Section>

              {/* Responsable */}
              <Section title="Reclutador Responsable" icon="bx-user-check">
                <div className="relative">
                  <select
                    value={vacancy.ownerRecruiterId || ''}
                    onChange={(e) => onReassign(vacancy, e.target.value)}
                    aria-label="Reclutador responsable"
                    className="w-full appearance-none rounded-xl border border-sand-line bg-cream/60 py-2.5 pl-3.5 pr-9 text-sm font-semibold text-ink outline-none transition-colors focus:border-terracotta cursor-pointer"
                  >
                    <option value="">Sin asignar</option>
                    {recruiters.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.fullName}
                        {r.status === 'suspended' ? ' (suspendido)' : ''}
                      </option>
                    ))}
                  </select>
                  <i
                    className="bx bx-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-secondary"
                    aria-hidden="true"
                  />
                </div>
                {owner?.status === 'suspended' && (
                  <p className="m-0 mt-2 text-xs font-semibold text-terracotta">
                    El responsable está suspendido. Considera reasignar la vacante.
                  </p>
                )}
              </Section>
            </div>

            {/* Acciones */}
            <footer className="flex flex-wrap items-center gap-2 border-t border-sand-line bg-cream/60 px-6 py-4">
              <button
                type="button"
                onClick={() => onEdit(vacancy)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-terracotta px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-terracotta-dark cursor-pointer"
              >
                <i className="bx bx-edit text-sm" aria-hidden="true" />
                <span>Editar</span>
              </button>
              <button
                type="button"
                onClick={() => onCycleStatus(vacancy)}
                className="rounded-xl border border-sand-line bg-white px-3.5 py-2 text-xs font-bold text-ink transition-colors hover:bg-sand cursor-pointer"
              >
                {primaryLabel}
              </button>
              {(vacancy.status === 'open' || vacancy.status === 'paused') && (
                <button
                  type="button"
                  onClick={() => onCloseVacancy(vacancy)}
                  className="rounded-xl border border-sand-line bg-white px-3.5 py-2 text-xs font-semibold text-secondary transition-colors hover:bg-sand hover:text-ink cursor-pointer"
                >
                  Cerrar convocatoria
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(vacancy)}
                className="ml-auto grid size-8 place-items-center rounded-xl border border-sand-line bg-white text-secondary transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                title="Eliminar vacante"
                aria-label={`Eliminar ${vacancy.title}`}
              >
                <i className="bx bx-trash text-sm" aria-hidden="true" />
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
