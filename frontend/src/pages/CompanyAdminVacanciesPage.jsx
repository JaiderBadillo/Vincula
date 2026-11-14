import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';
import CompanyPageHero from '../components/company/CompanyPageHero.jsx';
import VacancyDetailDrawer from '../components/company/VacancyDetailDrawer.jsx';
import { useCompanyRecruiters } from '../hooks/useCompanyRecruiters.js';
import { useCompanyVacancies } from '../hooks/useCompanyVacancies.js';
import { useCompanySites } from '../hooks/useCompanySites.js';
import { companyPhotos } from '../data/companyImages.js';
import { VACANCY_STATUS, VACANCY_TABS, experienceLabel } from '../data/companyVacanciesData.js';
import { daysUntil, formatApplicationDate } from '../utils/formatters.js';

const selectClass =
  'w-full appearance-none rounded-xl border border-sand-line bg-white py-2.5 pl-3.5 pr-9 text-xs font-semibold text-ink outline-none transition-colors focus:border-terracotta cursor-pointer';

/** Texto corto de la columna «Cierre» según el estado y la fecha. */
function ClosingCell({ vacancy }) {
  if (vacancy.status === 'draft') {
    return <span className="text-secondary">Sin publicar</span>;
  }
  if (!vacancy.closingDate) {
    return <span className="text-secondary">Sin fecha</span>;
  }
  const days = daysUntil(vacancy.closingDate);
  const date = formatApplicationDate(vacancy.closingDate);
  if (vacancy.status === 'closed' || days < 0) {
    return <span className="text-secondary">{date}</span>;
  }
  const urgent = days <= 7;
  return (
    <span className="grid">
      <span className="text-ink">{date}</span>
      <span className={`text-[0.68rem] ${urgent ? 'font-semibold text-terracotta' : 'text-secondary'}`}>
        {days === 0 ? 'Cierra hoy' : `Faltan ${days} día${days === 1 ? '' : 's'}`}
      </span>
    </span>
  );
}

export default function CompanyAdminVacanciesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { vacancies, updateVacancy, deleteVacancy } = useCompanyVacancies();
  const { recruiters } = useCompanyRecruiters();
  const { sites } = useCompanySites();

  const [activeTab, setActiveTab] = useState(location.state?.tab || 'open');
  const [query, setQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [recruiterFilter, setRecruiterFilter] = useState('all');

  const [selectedId, setSelectedId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(location.state?.toast || null);

  // Limpia el estado de navegación (toast del editor) para que no reaparezca al recargar.
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const siteById = useMemo(
    () => Object.fromEntries(sites.map((s) => [s.id, s])),
    [sites]
  );
  const recruiterById = useMemo(
    () => Object.fromEntries(recruiters.map((r) => [r.id, r])),
    [recruiters]
  );

  const selected = selectedId ? vacancies.find((v) => v.id === selectedId) || null : null;

  const stats = useMemo(
    () => [
      { value: vacancies.filter((v) => v.status === 'open').length, label: 'Abiertas' },
      {
        value: vacancies
          .filter((v) => v.status !== 'closed')
          .reduce((acc, v) => acc + (v.applicantsCount || 0), 0),
        label: 'Postulantes activos',
      },
      {
        value: vacancies.filter((v) => {
          if (v.status !== 'open' || !v.closingDate) return false;
          const d = daysUntil(v.closingDate);
          return d >= 0 && d <= 7;
        }).length,
        label: 'Cierran esta semana',
      },
    ],
    [vacancies]
  );

  // Filtros comunes (búsqueda, sede, responsable) antes de separar por pestaña.
  const baseFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vacancies.filter((v) => {
      if (siteFilter !== 'all' && v.siteId !== siteFilter) return false;
      if (recruiterFilter === 'unassigned' && v.ownerRecruiterId) return false;
      if (
        recruiterFilter !== 'all' &&
        recruiterFilter !== 'unassigned' &&
        v.ownerRecruiterId !== recruiterFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        v.title.toLowerCase().includes(q) ||
        (v.code || '').toLowerCase().includes(q) ||
        (v.category || '').toLowerCase().includes(q)
      );
    });
  }, [vacancies, query, siteFilter, recruiterFilter]);

  const countsByTab = useMemo(
    () =>
      Object.fromEntries(
        VACANCY_TABS.map((tab) => [tab, baseFiltered.filter((v) => v.status === tab).length])
      ),
    [baseFiltered]
  );

  const rows = useMemo(
    () => baseFiltered.filter((v) => v.status === activeTab),
    [baseFiltered, activeTab]
  );

  const hasFilters = query.trim() !== '' || siteFilter !== 'all' || recruiterFilter !== 'all';

  function clearFilters() {
    setQuery('');
    setSiteFilter('all');
    setRecruiterFilter('all');
  }

  function goToEditor(vacancy) {
    navigate(vacancy ? `/empresa/admin/vacantes/${vacancy.id}/editar` : '/empresa/admin/vacantes/nueva');
  }

  async function handleReassignOwner(vacancy, newOwnerId) {
    const ownerId = newOwnerId || null;
    try { await updateVacancy(vacancy.id, { ownerRecruiterId: ownerId }); }
    catch (error) { setToast(`No se guardó la asignación: ${error.message}`); return; }
    const ownerName = ownerId ? recruiterById[ownerId]?.fullName : null;
    setToast(
      ownerName
        ? `«${vacancy.title}» quedó a cargo de ${ownerName}.`
        : `«${vacancy.title}» quedó sin responsable asignado.`
    );
  }

  async function handleCycleStatus(vacancy) {
    try {
      await updateVacancy(vacancy.id, { status: vacancy.status === 'open' ? 'paused' : 'open' });
      setToast(`Estado de «${vacancy.title}» guardado.`);
    } catch (error) { setToast(`No se guardó el estado: ${error.message}`); }
  }

  async function handleCloseVacancy(vacancy) {
    try { await updateVacancy(vacancy.id, { status: 'closed' }); setToast(`Se cerró la convocatoria «${vacancy.title}».`); }
    catch (error) { setToast(`No se cerró la vacante: ${error.message}`); }
  }

  async function handleConfirmDelete() {
    try {
      await deleteVacancy(deleting.id);
      setToast(`Se cerró la vacante «${deleting.title}». Se conserva en el historial.`);
      setDeleting(null);
    } catch (error) { setToast(`No se cerró la vacante: ${error.message}`); }
  }

  return (
    <CompanyPortalLayout activePage="admin-vacantes">
      <main className="w-full pb-20">
        <div className="mx-auto max-w-6xl px-5 pt-6 sm:px-8 lg:px-10">
          <CompanyPageHero
            photo={companyPhotos.vacantes}
            title="Vacantes de la empresa"
            subtitle="Publica nuevas ofertas, sigue cada convocatoria y decide quién del equipo la lleva."
            stats={stats}
            actions={
              <button
                type="button"
                data-tour="company-publicar-vacante"
                onClick={() => goToEditor(null)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-terracotta px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-terracotta-dark cursor-pointer"
              >
                <i className="bx bx-plus text-base" aria-hidden="true" />
                <span>Nueva vacante</span>
              </button>
            }
          />

          {/* Pestañas por estado */}
          <div
            className="mt-6 flex gap-1 overflow-x-auto border-b border-sand-line scrollbar-none"
            role="tablist"
            aria-label="Estado de las vacantes"
          >
            {VACANCY_TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab)}
                  className={`relative -mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors cursor-pointer ${
                    active
                      ? 'border-terracotta font-bold text-cocoa'
                      : 'border-transparent font-medium text-secondary hover:text-cocoa'
                  }`}
                >
                  {VACANCY_STATUS[tab].plural}
                  <span className={`text-xs ${active ? 'text-terracotta' : 'text-secondary/70'}`}>
                    {countsByTab[tab]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filtros */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative flex-1 sm:min-w-[15rem] sm:max-w-xs">
              <i
                className="bx bx-search pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-secondary"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por cargo, código o área..."
                aria-label="Buscar vacante"
                className="w-full rounded-xl border border-sand-line bg-white py-2.5 pl-10 pr-3 text-xs text-ink outline-none transition-colors placeholder:text-secondary focus:border-terracotta"
              />
            </div>

            <div className="relative sm:w-52">
              <select
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                aria-label="Filtrar por sede"
                className={selectClass}
              >
                <option value="all">Todas las sedes</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.city})
                  </option>
                ))}
              </select>
              <i
                className="bx bx-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-secondary"
                aria-hidden="true"
              />
            </div>

            <div className="relative sm:w-56">
              <select
                value={recruiterFilter}
                onChange={(e) => setRecruiterFilter(e.target.value)}
                aria-label="Filtrar por reclutador responsable"
                className={selectClass}
              >
                <option value="all">Todos los responsables</option>
                <option value="unassigned">Sin responsable asignado</option>
                {recruiters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName}
                  </option>
                ))}
              </select>
              <i
                className="bx bx-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-secondary"
                aria-hidden="true"
              />
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-secondary hover:text-terracotta cursor-pointer"
              >
                <i className="bx bx-x text-sm" aria-hidden="true" />
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Lista compacta */}
          {rows.length === 0 ? (
            <div className="mt-4 rounded-card border border-sand-line bg-white p-12 text-center shadow-card">
              <i className="bx bx-briefcase-alt-2 text-4xl text-terracotta" aria-hidden="true" />
              <h3 className="m-0 mt-2 font-display text-base font-bold text-ink">
                {hasFilters
                  ? 'Ninguna vacante coincide con los filtros'
                  : `No hay vacantes ${VACANCY_STATUS[activeTab].plural.toLowerCase()}`}
              </h3>
              <p className="m-0 mx-auto mt-1 max-w-sm text-xs text-secondary">
                {hasFilters
                  ? 'Prueba con otra búsqueda o limpia los filtros.'
                  : activeTab === 'draft'
                    ? 'Los borradores que guardes desde el editor aparecerán aquí.'
                    : 'Cuando una vacante pase a este estado la verás en esta pestaña.'}
              </p>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-xl border border-sand-line bg-cream px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-sand cursor-pointer"
                >
                  Restablecer filtros
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => goToEditor(null)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-terracotta px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-terracotta-dark cursor-pointer"
                >
                  <i className="bx bx-plus text-sm" aria-hidden="true" />
                  Crear vacante
                </button>
              )}
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-card border border-sand-line bg-white shadow-card">
              {/* Encabezado de columnas (escritorio) */}
              <div className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_5.5rem_minmax(0,1.1fr)_1.5rem] gap-4 border-b border-sand-line bg-cream/70 px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-secondary lg:grid">
                <span>Cargo</span>
                <span>Sede</span>
                <span>Responsable</span>
                <span className="text-right">Postulantes</span>
                <span>Cierre</span>
                <span />
              </div>

              <ul className="m-0 list-none divide-y divide-sand-line p-0">
                {rows.map((v) => {
                  const site = siteById[v.siteId];
                  const owner = v.ownerRecruiterId ? recruiterById[v.ownerRecruiterId] : null;
                  const isSelected = selectedId === v.id;

                  return (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(v.id)}
                        className={`grid w-full gap-x-4 gap-y-1.5 px-5 py-4 text-left transition-colors cursor-pointer lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_5.5rem_minmax(0,1.1fr)_1.5rem] lg:items-center ${
                          isSelected ? 'bg-sand/60' : 'hover:bg-cream'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-display text-sm font-bold text-ink">{v.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-secondary">
                            {v.category}
                            <span className="mx-1.5 text-secondary/50">•</span>
                            {experienceLabel(v.experienceLevel)}
                            <span className="mx-1.5 text-secondary/50">•</span>
                            {v.modality}
                            {v.openSpots > 1 && (
                              <>
                                <span className="mx-1.5 text-secondary/50">•</span>
                                <span className="font-semibold text-cocoa">{v.openSpots} plazas</span>
                              </>
                            )}
                          </span>
                        </span>

                        <span className="min-w-0 truncate text-xs text-ink/80">
                          <span className="text-secondary lg:hidden">Sede: </span>
                          {site ? site.city : 'Sin sede'}
                        </span>

                        <span className="min-w-0 truncate text-xs">
                          <span className="text-secondary lg:hidden">Responsable: </span>
                          {owner ? (
                            <span className={owner.status === 'suspended' ? 'text-terracotta' : 'text-ink/80'}>
                              {owner.fullName}
                              {owner.status === 'suspended' ? ' (suspendido)' : ''}
                            </span>
                          ) : (
                            <span className="font-semibold text-terracotta">Sin asignar</span>
                          )}
                        </span>

                        <span className="text-xs lg:text-right">
                          <span className="text-secondary lg:hidden">Postulantes: </span>
                          <span className="font-display text-sm font-bold text-cocoa">{v.applicantsCount || 0}</span>
                        </span>

                        <span className="text-xs">
                          <ClosingCell vacancy={v} />
                        </span>

                        <i
                          className="bx bx-chevron-right hidden text-xl text-secondary lg:block"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <VacancyDetailDrawer
          vacancy={selected}
          site={selected ? siteById[selected.siteId] : null}
          recruiters={recruiters}
          onClose={() => setSelectedId(null)}
          onEdit={goToEditor}
          onCycleStatus={handleCycleStatus}
          onCloseVacancy={handleCloseVacancy}
          onDelete={setDeleting}
          onReassign={handleReassignOwner}
        />

        {/* Confirmar eliminación */}
        {deleting && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-cocoa/55 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-vacancy-title"
            onClick={() => setDeleting(null)}
          >
            <div
              className="w-full max-w-md rounded-card bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="delete-vacancy-title" className="m-0 font-display text-lg font-bold text-ink">
                ¿Cerrar «{deleting.title}»?
              </h2>
              <p className="m-0 mt-2 text-sm text-body-muted">
                La vacante ({deleting.code}) dejará de recibir postulaciones y quedará en el historial. Si solo quieres pausarla,
                puedes pausarla o cerrar la convocatoria.
              </p>
              {deleting.applicantsCount > 0 && (
                <p className="m-0 mt-3 rounded-lg bg-ochre/15 px-3 py-2 text-xs text-cocoa">
                  Tiene <strong>{deleting.applicantsCount}</strong> postulante(s) registrado(s).
                </p>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleting(null)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-secondary hover:text-ink cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="rounded-lg bg-terracotta px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-terracotta-dark cursor-pointer"
                >
                  Sí, cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div
            role="status"
            className="fixed bottom-6 right-6 z-[70] max-w-sm rounded-lg bg-cocoa px-4 py-3 text-sm font-medium text-white shadow-lg"
          >
            {toast}
          </div>
        )}
      </main>
    </CompanyPortalLayout>
  );
}
