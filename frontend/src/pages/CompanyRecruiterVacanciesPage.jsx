import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';
import CompanyPageHero from '../components/company/CompanyPageHero.jsx';
import VacancyDetailDrawer from '../components/company/VacancyDetailDrawer.jsx';
import { useCompanyVacancies } from '../hooks/useCompanyVacancies.js';
import { useCompanySites } from '../hooks/useCompanySites.js';
import { useCompanyRecruiters } from '../hooks/useCompanyRecruiters.js';
import { companyPhotos } from '../data/companyImages.js';
import { authService } from '../services/authService.js';
import {
  VACANCY_STATUS,
  VACANCY_TABS,
  VACANCY_MODALITIES,
  experienceLabel,
} from '../data/companyVacanciesData.js';
import { daysUntil, formatApplicationDate } from '../utils/formatters.js';

const selectClass =
  'w-full appearance-none rounded-xl border border-sand-line bg-white py-2.5 pl-3.5 pr-9 text-xs font-semibold text-ink outline-none transition-colors focus:border-terracotta cursor-pointer';

function ClosingBadge({ vacancy }) {
  if (vacancy.status === 'draft') {
    return <span className="text-secondary text-xs">Borrador no publicado</span>;
  }
  if (!vacancy.closingDate) {
    return <span className="text-secondary text-xs">Sin fecha límite</span>;
  }
  const days = daysUntil(vacancy.closingDate);
  const formatted = formatApplicationDate(vacancy.closingDate);

  if (vacancy.status === 'closed') {
    return <span className="text-stone-500 text-xs">Cerrada el {formatted}</span>;
  }
  if (days < 0) {
    return <span className="text-rose-600 font-semibold text-xs">Venció el {formatted}</span>;
  }
  if (days === 0) {
    return <span className="text-amber-700 font-bold text-xs">¡Cierra hoy!</span>;
  }
  return (
    <span className="text-cocoa font-medium text-xs">
      Cierra en {days} día{days === 1 ? '' : 's'} ({formatted})
    </span>
  );
}

export default function CompanyRecruiterVacanciesPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { vacancies, loading: vacanciesLoading, error: vacanciesError, updateVacancy, duplicateVacancy, deleteVacancy } = useCompanyVacancies();
  const { sites } = useCompanySites();
  const { recruiters, loading: recruitersLoading, error: recruitersError } = useCompanyRecruiters();

  const currentRecruiterId = recruiters.find((r) => r.userId === authService.getCurrentUser()?.id)?.id || null;

  // Pestaña de estado activa: 'open' | 'paused' | 'draft' | 'closed' | 'all'
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'open');
  const [query, setQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('mine'); // 'mine' | 'all'

  const [selectedDrawerId, setSelectedDrawerId] = useState(null);
  const [toast, setToast] = useState(location.state?.toast || null);

  // Limpia el toast de navegación para que no persista tras recargar
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Mapa de sedes por ID
  const siteById = useMemo(
    () => Object.fromEntries(sites.map((s) => [s.id, s])),
    [sites]
  );

  // Mis vacantes (asignadas al reclutador actual)
  const myVacancies = useMemo(
    () => vacancies.filter((v) => v.ownerRecruiterId === currentRecruiterId),
    [vacancies, currentRecruiterId]
  );

  // Vacantes base según el alcance elegido ('mine' o 'all')
  const baseVacancies = scopeFilter === 'mine' ? myVacancies : vacancies;

  // Métricas del Hero
  const heroStats = useMemo(() => {
    const total = myVacancies.length;
    const openCount = myVacancies.filter((v) => v.status === 'open').length;
    const inProgressCount = myVacancies.filter((v) => v.status === 'paused' || v.status === 'draft').length;
    const totalApplicants = myVacancies.reduce((acc, v) => acc + (v.applicantsCount || 0), 0);

    return [
      { value: String(total), label: 'Mis Vacantes' },
      { value: String(openCount), label: 'Activas' },
      { value: String(inProgressCount), label: 'En Proceso' },
      { value: String(totalApplicants), label: 'Postulantes' },
    ];
  }, [myVacancies]);

  // Conteos por pestaña
  const countsByTab = useMemo(() => {
    return {
      open: baseVacancies.filter((v) => v.status === 'open').length,
      paused: baseVacancies.filter((v) => v.status === 'paused').length,
      draft: baseVacancies.filter((v) => v.status === 'draft').length,
      closed: baseVacancies.filter((v) => v.status === 'closed').length,
      all: baseVacancies.length,
    };
  }, [baseVacancies]);

  // Filtrado final de la lista
  const filteredVacancies = useMemo(() => {
    const q = query.trim().toLowerCase();
    return baseVacancies.filter((v) => {
      if (activeTab !== 'all' && v.status !== activeTab) return false;
      if (siteFilter !== 'all' && v.siteId !== siteFilter) return false;
      if (modalityFilter !== 'all' && v.modality !== modalityFilter) return false;

      if (!q) return true;

      const inTitle = v.title.toLowerCase().includes(q);
      const inCode = v.code?.toLowerCase().includes(q);
      const inCategory = v.category?.toLowerCase().includes(q);
      const inSkills = (v.skills || []).some((s) => s.toLowerCase().includes(q));
      const inPrograms = (v.targetPrograms || []).some((p) => p.toLowerCase().includes(q));

      return inTitle || inCode || inCategory || inSkills || inPrograms;
    });
  }, [baseVacancies, activeTab, siteFilter, modalityFilter, query]);

  const selectedVacancyForDrawer = selectedDrawerId
    ? vacancies.find((v) => v.id === selectedDrawerId) || null
    : null;

  async function handleTogglePause(vacancy) {
    const nextStatus = vacancy.status === 'open' ? 'paused' : 'open';
    try {
      await updateVacancy(vacancy.id, { status: nextStatus });
      setToast(nextStatus === 'paused' ? `Vacante «${vacancy.title}» pausada.` : `Vacante «${vacancy.title}» reactivada.`);
    } catch (error) { setToast(`No se guardó el cambio: ${error.message}`); }
  }

  async function handleDuplicate(vacancy) {
    try {
      const newId = await duplicateVacancy(vacancy.id);
      setToast(`Vacante duplicada como borrador con ID ${newId}.`);
      setActiveTab('draft');
    } catch (error) { setToast(`No se pudo duplicar: ${error.message}`); }
  }

  async function handleClose(vacancy) {
    try { await updateVacancy(vacancy.id, { status: 'closed' }); setToast(`Vacante «${vacancy.title}» cerrada.`); }
    catch (error) { setToast(`No se cerró la vacante: ${error.message}`); }
  }

  return (
    <CompanyPortalLayout activePage="recruiter-vacantes" role="recruiter">
      <main className="w-full pb-20">
        {(vacanciesLoading || recruitersLoading) && <p className="mx-6 mt-6 rounded-xl bg-white p-4 text-sm" role="status">Cargando vacantes de la empresa…</p>}
        {(vacanciesError || recruitersError) && <p className="mx-6 mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800" role="alert">No se pudieron cargar las vacantes: {vacanciesError || recruitersError}</p>}
        <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-10 space-y-8">
          {/* ─── 1. Hero Showcase del Reclutador ─── */}
          <CompanyPageHero
            photo={companyPhotos.vacantes}
            title="Mis Vacantes Asignadas"
            subtitle="Crea y gestiona tus convocatorias de empleo, monitorea el volumen de egresados que aplican y avanza candidatos hacia tu embudo ATS."
            stats={heroStats}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/empresa/reclutador/vacantes/nueva"
                  className="inline-flex items-center gap-2 rounded-xl bg-ochre hover:bg-ochre-light text-cocoa font-bold px-4 py-2.5 text-xs shadow-xs transition-all no-underline cursor-pointer"
                >
                  <i className="bx bx-plus text-base" />
                  <span>Publicar Nueva Vacante</span>
                </Link>
                <Link
                  to="/empresa/reclutador/candidatos"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-xs hover:bg-white/20 no-underline transition-colors cursor-pointer"
                >
                  <i className="bx bx-user-check text-sm" />
                  <span>Ver Embudo ATS</span>
                </Link>
              </div>
            }
          />

          {/* Toast Notification */}
          {toast && (
            <div
              className="flex items-center justify-between rounded-xl border border-sand-line bg-cream px-4 py-2.5 text-xs text-ink shadow-sm animate-in fade-in"
              role="status"
            >
              <div className="flex items-center gap-2">
                <i className="bx bx-check-circle text-base text-terracotta" />
                <span>{toast}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-secondary hover:text-ink cursor-pointer"
              >
                <i className="bx bx-x text-lg" />
              </button>
            </div>
          )}

          {/* ─── 2. Pestañas de Estado & Alcance de Vacantes ─── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sand-line pb-2">
            {/* Pestañas de Estado */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'open', label: 'Abiertas', count: countsByTab.open },
                { id: 'paused', label: 'Pausadas', count: countsByTab.paused },
                { id: 'draft', label: 'Borradores', count: countsByTab.draft },
                { id: 'closed', label: 'Cerradas', count: countsByTab.closed },
                { id: 'all', label: 'Todas', count: countsByTab.all },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-cocoa text-white shadow-xs'
                        : 'text-secondary hover:text-ink hover:bg-cream'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.2 text-[0.68rem] font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-sand text-cocoa'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selector de Alcance (Mis vacantes vs Toda la empresa) */}
            <div className="flex items-center gap-1 rounded-xl border border-sand-line bg-cream/50 p-1 shadow-2xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setScopeFilter('mine')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  scopeFilter === 'mine'
                    ? 'bg-white text-ink shadow-2xs'
                    : 'text-secondary hover:text-ink'
                }`}
              >
                Mis Asignadas ({myVacancies.length})
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  scopeFilter === 'all'
                    ? 'bg-white text-ink shadow-2xs'
                    : 'text-secondary hover:text-ink'
                }`}
              >
                Toda la Empresa ({vacancies.length})
              </button>
            </div>
          </div>

          {/* ─── 3. Barra de Búsqueda y Filtros Rápidos ─── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-sand-line bg-white p-4 shadow-2xs">
            <div className="relative flex-1">
              <i
                className="bx bx-search absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-secondary"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por cargo, código, carrera requerida o tecnologías (ej: React, SQL)..."
                className="w-full rounded-xl border border-sand-line bg-cream/40 py-2.5 pl-10 pr-3.5 text-xs text-ink placeholder:text-secondary outline-none transition-colors focus:border-terracotta focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* Filtro por Sede */}
              <div className="relative w-full sm:w-52">
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className={selectClass}
                  aria-label="Filtrar por sede"
                >
                  <option value="all">Todas mis sedes</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shortName || s.name} ({s.city})
                    </option>
                  ))}
                </select>
                <i
                  className="bx bx-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-secondary"
                  aria-hidden="true"
                />
              </div>

              {/* Filtro por Modalidad */}
              <div className="relative w-full sm:w-40">
                <select
                  value={modalityFilter}
                  onChange={(e) => setModalityFilter(e.target.value)}
                  className={selectClass}
                  aria-label="Filtrar por modalidad"
                >
                  <option value="all">Cualquier modalidad</option>
                  {VACANCY_MODALITIES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <i
                  className="bx bx-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-secondary"
                  aria-hidden="true"
                />
              </div>

              {(query || siteFilter !== 'all' || modalityFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSiteFilter('all');
                    setModalityFilter('all');
                  }}
                  className="rounded-xl border border-sand-line bg-cream px-3 py-2.5 text-xs font-semibold text-secondary hover:text-ink hover:bg-sand transition-colors cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* ─── 4. Lista Rectangular de Vacantes ─── */}
          {filteredVacancies.length === 0 ? (
            <div className="rounded-2xl border border-sand-line bg-white p-12 text-center shadow-2xs">
              <span className="grid size-12 place-items-center rounded-2xl bg-sand text-2xl text-terracotta mx-auto mb-3">
                <i className="bx bx-briefcase-alt-2" />
              </span>
              <h3 className="m-0 font-display text-base font-bold text-ink">
                No hay vacantes en esta vista
              </h3>
              <p className="m-0 mt-1 text-xs text-secondary max-w-sm mx-auto">
                No encontramos ofertas con el estado o filtros seleccionados. Puedes cambiar de pestaña o publicar una nueva vacante.
              </p>
              <Link
                to="/empresa/reclutador/vacantes/nueva"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-cocoa px-4 py-2 text-xs font-bold text-white hover:bg-cocoa/90 transition-colors no-underline"
              >
                <i className="bx bx-plus" />
                <span>Publicar Nueva Vacante</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVacancies.map((vacancy) => {
                const site = siteById[vacancy.siteId];
                const statusMeta = VACANCY_STATUS[vacancy.status] || VACANCY_STATUS.open;
                const isMine = vacancy.ownerRecruiterId === currentRecruiterId;

                return (
                  <article
                    key={vacancy.id}
                    className="group rounded-2xl border border-sand-line bg-white p-5 sm:p-6 shadow-2xs hover:shadow-card hover:border-ochre/40 transition-all duration-200"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      {/* Información Principal de la Oferta */}
                      <div className="space-y-2.5 flex-1 min-w-0">
                        {/* Cabecera: Título, Código, Estado, Fecha de Cierre */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedDrawerId(vacancy.id)}
                            className="m-0 p-0 text-left font-display text-base sm:text-lg font-bold text-ink hover:text-terracotta transition-colors cursor-pointer"
                          >
                            {vacancy.title}
                          </button>

                          <span className="rounded-md border border-sand-line bg-cream px-2 py-0.5 text-[0.68rem] font-bold text-cocoa">
                            {vacancy.code}
                          </span>

                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                            <span className={`size-2 rounded-full ${statusMeta.dot}`} />
                            <span>{statusMeta.label}</span>
                          </span>

                          <span>•</span>
                          <ClosingBadge vacancy={vacancy} />

                          {!isMine && (
                            <span className="rounded-full bg-sand px-2 py-0.5 text-[0.65rem] font-bold text-secondary">
                              Reclutador externo
                            </span>
                          )}
                        </div>

                        {/* Metadatos: Ubicación, Modalidad, Nivel, Salario */}
                        <div className="flex items-center gap-2 flex-wrap text-xs text-secondary font-medium">
                          <span className="inline-flex items-center gap-1 text-ink font-semibold">
                            <i className="bx bx-map-pin text-terracotta text-sm" />
                            <span>{site ? `${site.shortName || site.name} (${site.city})` : 'Sede Corporativa'}</span>
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <i className="bx bx-laptop text-secondary" />
                            <span>{vacancy.modality}</span>
                          </span>
                          <span>•</span>
                          <span>{vacancy.contractType}</span>
                          <span>•</span>
                          <span>{experienceLabel(vacancy.experienceLevel)}</span>
                          {vacancy.salary && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-cocoa">{vacancy.salary}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{vacancy.openSpots || 1} plaza(s)</span>
                        </div>

                        {/* Programas Académicos IES Afines */}
                        {vacancy.targetPrograms && vacancy.targetPrograms.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap text-xs">
                            <span className="text-[0.68rem] uppercase font-bold tracking-wider text-secondary">
                              Egresados de:
                            </span>
                            <span className="text-cocoa font-medium">
                              {vacancy.targetPrograms.join(' • ')}
                            </span>
                          </div>
                        )}

                        {/* Habilidades requeridas (Tech + Soft) */}
                        {vacancy.skills && vacancy.skills.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            {vacancy.skills.slice(0, 5).map((skill) => (
                              <span
                                key={skill}
                                className="rounded-md border border-sand-line bg-cream/50 px-2 py-0.5 text-[0.7rem] font-medium text-cocoa"
                              >
                                {skill}
                              </span>
                            ))}
                            {vacancy.skills.length > 5 && (
                              <span className="text-[0.68rem] text-secondary font-medium">
                                +{vacancy.skills.length - 5} más
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bloque Derecho: Postulantes & Botones de Acción */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-sand-line shrink-0">
                        {/* Indicador de Postulantes en el Embudo */}
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/empresa/reclutador/candidatos?vacancy=${vacancy.id}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-terracotta/10 hover:bg-terracotta/20 border border-terracotta/30 px-3 py-1.5 text-xs font-bold text-terracotta-dark transition-all no-underline shadow-2xs"
                          >
                            <i className="bx bx-user-check text-base text-terracotta" />
                            <span>
                              {vacancy.applicantsCount || 0} postulante{(vacancy.applicantsCount || 0) === 1 ? '' : 's'}
                            </span>
                            <i className="bx bx-right-arrow-alt text-base" />
                          </Link>
                        </div>

                        {/* Acciones de Edición, Estado y Duplicación */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDrawerId(vacancy.id)}
                            className="grid size-8 place-items-center rounded-lg border border-sand-line bg-white text-secondary hover:text-ink hover:bg-cream transition-colors cursor-pointer"
                            title="Ver ficha completa"
                            aria-label={`Ver detalle de ${vacancy.title}`}
                          >
                            <i className="bx bx-show text-sm" />
                          </button>

                          <Link
                            to={`/empresa/reclutador/vacantes/${vacancy.id}/editar`}
                            className="inline-flex items-center gap-1 rounded-lg bg-cocoa px-3 py-1.5 text-xs font-bold text-white hover:bg-cocoa/90 transition-colors no-underline cursor-pointer"
                          >
                            <i className="bx bx-edit text-xs" />
                            <span>Editar</span>
                          </Link>

                          {vacancy.status !== 'closed' && (
                            <button
                              type="button"
                              onClick={() => handleTogglePause(vacancy)}
                              className="rounded-lg border border-sand-line bg-white px-2.5 py-1.5 text-xs font-semibold text-secondary hover:text-ink hover:bg-cream transition-colors cursor-pointer"
                              title={vacancy.status === 'open' ? 'Pausar postulaciones' : 'Reanudar postulaciones'}
                            >
                              {vacancy.status === 'open' ? 'Pausar' : 'Reanudar'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDuplicate(vacancy)}
                            className="rounded-lg border border-sand-line bg-white px-2.5 py-1.5 text-xs font-semibold text-secondary hover:text-ink hover:bg-cream transition-colors cursor-pointer"
                            title="Duplicar como borrador"
                          >
                            Duplicar
                          </button>

                          {vacancy.status !== 'closed' && (
                            <button
                              type="button"
                              onClick={() => handleClose(vacancy)}
                              className="grid size-8 place-items-center rounded-lg border border-sand-line text-secondary hover:text-terracotta hover:bg-cream transition-colors cursor-pointer"
                              title="Finalizar vacante"
                              aria-label={`Finalizar ${vacancy.title}`}
                            >
                              <i className="bx bx-check-circle text-sm" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel lateral con el detalle completo de la vacante */}
        <VacancyDetailDrawer
          vacancy={selectedVacancyForDrawer}
          site={selectedVacancyForDrawer ? siteById[selectedVacancyForDrawer.siteId] : null}
          recruiters={recruiters}
          onClose={() => setSelectedDrawerId(null)}
          onEdit={(vac) => {
            setSelectedDrawerId(null);
            navigate(`/empresa/reclutador/vacantes/${vac.id}/editar`);
          }}
          onCycleStatus={(vac) => {
            handleTogglePause(vac);
            setSelectedDrawerId(null);
          }}
          onCloseVacancy={(vac) => {
            handleClose(vac);
            setSelectedDrawerId(null);
          }}
          onDelete={(vac) => {
            deleteVacancy(vac.id);
            setToast(`Vacante «${vac.title}» eliminada.`);
            setSelectedDrawerId(null);
          }}
        />
      </main>
    </CompanyPortalLayout>
  );
}

