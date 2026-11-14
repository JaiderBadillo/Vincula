import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';
import CompanyPageHero from '../components/company/CompanyPageHero.jsx';
import CandidateDetailDrawer from '../components/company/CandidateDetailDrawer.jsx';
import { useCompanyCandidates } from '../hooks/useCompanyCandidates.js';
import { useCompanyVacancies } from '../hooks/useCompanyVacancies.js';
import { useCompanySites } from '../hooks/useCompanySites.js';
import { companyPhotos } from '../data/companyImages.js';
import { ATS_STAGES } from '../data/companyCandidatesData.js';
import { useCompanyRecruiters } from '../hooks/useCompanyRecruiters.js';
import { authService } from '../services/authService.js';

const selectClass =
  'w-full appearance-none rounded-xl border border-sand-line bg-white py-2.5 pl-3.5 pr-9 text-xs font-semibold text-ink outline-none transition-colors focus:border-terracotta cursor-pointer';

function initialsOf(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function CompanyRecruiterCandidatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const vacancyParam = searchParams.get('vacancy') || '';
  const { vacancies, loading: vacanciesLoading, error: vacanciesError } = useCompanyVacancies();
  const { recruiters, loading: recruitersLoading, error: recruitersError } = useCompanyRecruiters();
  const recruiter = recruiters.find((item) => item.userId === authService.getCurrentUser()?.id);
  const assignedVacancies = useMemo(() => recruiter ? vacancies.filter((v) => v.ownerRecruiterId === recruiter.id) : [], [vacancies, recruiter]);
  const vacancyIds = useMemo(() => assignedVacancies.map((v) => v.id), [assignedVacancies]);

  const {
    candidates,
    moveCandidateStage,
    discardCandidate,
    addCandidateNote,
    loading: candidatesLoading,
    error: candidatesError,
  } = useCompanyCandidates(vacancyIds);
  const { sites } = useCompanySites();

  // Estados locales de filtrado y visualización
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [query, setQuery] = useState('');
  const [selectedVacancyFilter, setSelectedVacancyFilter] = useState(vacancyParam);
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('all');
  const [minMatchFilter, setMinMatchFilter] = useState('all'); // 'all' | '90' | '85' | '75'
  const [selectedStageTab, setSelectedStageTab] = useState('all'); // para la vista de lista

  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [toast, setToast] = useState(null);

  // Sincronizar parámetro URL si cambia
  useEffect(() => {
    if (vacancyParam !== selectedVacancyFilter) {
      setSelectedVacancyFilter(vacancyParam);
    }
  }, [vacancyParam]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Mapa de vacantes por ID
  const vacancyById = useMemo(
    () => Object.fromEntries(assignedVacancies.map((v) => [v.id, v])),
    [assignedVacancies]
  );

  // Mapa de sedes por ID
  const siteById = useMemo(
    () => Object.fromEntries(sites.map((s) => [s.id, s])),
    [sites]
  );

  const activeVacancy = selectedVacancyFilter && selectedVacancyFilter !== 'all'
    ? vacancyById[selectedVacancyFilter]
    : null;

  // Métricas del Hero
  const heroStats = useMemo(() => {
    const total = candidates.length;
    const inReview = candidates.filter((c) => c.stage === 'review').length;
    const inInterview = candidates.filter((c) => c.stage === 'interview').length;
    const inOffer = candidates.filter((c) => c.stage === 'offer').length;

    return [
      { value: String(total), label: 'Postulantes' },
      { value: String(inReview), label: 'Por Revisar' },
      { value: String(inInterview), label: 'En Entrevista' },
      { value: String(inOffer), label: 'Finalistas' },
    ];
  }, [candidates]);

  // Filtrado de candidatos
  const filteredCandidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((c) => {
      // Filtro por Vacante
      if (selectedVacancyFilter !== 'all' && c.vacancyId !== selectedVacancyFilter) return false;

      // Filtro por Sede
      if (selectedSiteFilter !== 'all' && c.siteId !== selectedSiteFilter) return false;

      // Filtro por Match mínimo
      if (minMatchFilter !== 'all') {
        const min = Number.parseInt(minMatchFilter, 10);
        if (c.matchPercentage < min) return false;
      }

      // Filtro por Etapa (en vista de lista)
      if (viewMode === 'list' && selectedStageTab !== 'all' && c.stage !== selectedStageTab) {
        return false;
      }

      if (!q) return true;

      const inName = c.candidateName.toLowerCase().includes(q);
      const inEmail = c.email?.toLowerCase().includes(q);
      const inProgram = c.program?.toLowerCase().includes(q);
      const inInstitution = c.institution?.toLowerCase().includes(q);
      const inVacancy = c.vacancyTitle?.toLowerCase().includes(q);
      const inSkills = (c.skillsMatch || []).some((s) => s.toLowerCase().includes(q));

      return inName || inEmail || inProgram || inInstitution || inVacancy || inSkills;
    });
  }, [
    candidates,
    query,
    selectedVacancyFilter,
    selectedSiteFilter,
    minMatchFilter,
    viewMode,
    selectedStageTab,
  ]);

  // Candidatos agrupados por etapa para el Tablero Kanban
  const candidatesByStage = useMemo(() => {
    const map = {};
    ATS_STAGES.forEach((st) => {
      map[st.id] = filteredCandidates.filter((c) => c.stage === st.id);
    });
    return map;
  }, [filteredCandidates]);

  const selectedCandidateForDrawer = selectedCandidateId
    ? candidates.find((c) => c.id === selectedCandidateId) || null
    : null;

  async function handleMoveStage(candidateId, newStage, notes = null) {
    const candidate = candidates.find((c) => c.id === candidateId);
    const stageObj = ATS_STAGES.find((s) => s.id === newStage);
    try {
      await moveCandidateStage(candidateId, newStage, notes);
      setToast(`${candidate ? candidate.candidateName : 'Candidato'} movido a etapa «${stageObj?.label || newStage}».`);
    } catch (error) { setToast(`No se guardó el cambio: ${error.message}`); }
  }

  async function handleDiscard(candidateId, reason, notes = null) {
    const candidate = candidates.find((c) => c.id === candidateId);
    try {
      await discardCandidate(candidateId, reason, notes);
      setToast(`${candidate ? candidate.candidateName : 'Candidato'} descartado del proceso.`);
    } catch (error) { setToast(`No se guardó el descarte: ${error.message}`); }
  }

  async function handleSaveNotes(candidateId, noteText) {
    try { await addCandidateNote(candidateId, noteText); setToast('Nota guardada en la cuenta.'); }
    catch (error) { setToast(`No se guardó la nota: ${error.message}`); }
  }

  function handleFilterVacancyChange(val) {
    setSelectedVacancyFilter(val);
    if (!val || val === '') {
      searchParams.delete('vacancy');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ vacancy: val });
    }
  }

  return (
    <CompanyPortalLayout activePage="recruiter-candidatos" role="recruiter">
      <main className="w-full pb-20">
        {(vacanciesLoading || recruitersLoading || candidatesLoading) && <p className="mx-6 mt-6 rounded-xl bg-white p-4 text-sm" role="status">Consultando vacantes y postulaciones reales…</p>}
        {(vacanciesError || recruitersError || candidatesError) && <p className="mx-6 mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800" role="alert">No se pudieron consultar las postulaciones: {vacanciesError || recruitersError || candidatesError}</p>}
        <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-10 space-y-8">
          {/* ─── 1. Hero Showcase del Embudo ATS ─── */}
          <CompanyPageHero
            photo={companyPhotos.talento || companyPhotos.reclutadores}
            title="Candidatos y Embudo de Selección"
            subtitle="Monitorea las postulaciones de egresados de universidades aliadas, califica su afinidad técnica y gestiona el flujo de avance por etapas."
            stats={heroStats}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/empresa/reclutador/vacantes"
                  className="inline-flex items-center gap-2 rounded-xl bg-ochre hover:bg-ochre-light text-cocoa font-bold px-4 py-2.5 text-xs shadow-xs transition-all no-underline cursor-pointer"
                >
                  <i className="bx bx-briefcase-alt-2 text-base" />
                  <span>Mis Vacantes Asignadas</span>
                </Link>
                <Link
                  to="/empresa/reclutador/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-xs hover:bg-white/20 no-underline transition-colors cursor-pointer"
                >
                  <i className="bx bx-home-alt-2 text-sm" />
                  <span>Panel de Inicio</span>
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

          {/* ─── 2. Barra de Búsqueda, Filtros y Conmutador de Vista ─── */}
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-sand-line bg-white p-4 shadow-2xs">
              {/* Buscador */}
              <div className="relative flex-1 min-w-[240px]">
                <i
                  className="bx bx-search absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-secondary"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por candidato, carrera, universidad o habilidad técnica (ej. React, SQL, Siigo)..."
                  className="w-full rounded-xl border border-sand-line bg-cream/40 py-2.5 pl-10 pr-3.5 text-xs text-ink placeholder:text-secondary outline-none transition-colors focus:border-terracotta focus:bg-white"
                />
              </div>

              {/* Filtros Rápidos */}
              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                {/* Filtro por Vacante */}
                <div className="relative w-full sm:w-60">
                  <select
                    value={selectedVacancyFilter}
                    onChange={(e) => handleFilterVacancyChange(e.target.value)}
                    className={`${selectClass} ${!selectedVacancyFilter ? 'font-bold text-terracotta border-terracotta/40 bg-sand/30' : ''}`}
                    aria-label="Selecciona una vacante"
                  >
                    <option value="">Selecciona una vacante...</option>
                    {assignedVacancies.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title} ({v.code})
                      </option>
                    ))}
                    <option value="all">Todas las vacantes (Vista global)</option>
                  </select>
                  <i
                    className="bx bx-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-secondary"
                    aria-hidden="true"
                  />
                </div>

                {/* Filtro por Sede */}
                <div className="relative w-full sm:w-44">
                  <select
                    value={selectedSiteFilter}
                    onChange={(e) => setSelectedSiteFilter(e.target.value)}
                    className={selectClass}
                    aria-label="Filtrar por sede"
                  >
                    <option value="all">Todas las sedes</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shortName || s.name}
                      </option>
                    ))}
                  </select>
                  <i
                    className="bx bx-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-secondary"
                    aria-hidden="true"
                  />
                </div>

                {/* Filtro por Match Mínimo */}
                <div className="relative w-full sm:w-36">
                  <select
                    value={minMatchFilter}
                    onChange={(e) => setMinMatchFilter(e.target.value)}
                    className={selectClass}
                    aria-label="Filtrar por porcentaje de match"
                  >
                    <option value="all">Cualquier match</option>
                    <option value="90">Match &gt; 90%</option>
                    <option value="85">Match &gt; 85%</option>
                    <option value="75">Match &gt; 75%</option>
                  </select>
                  <i
                    className="bx bx-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-secondary"
                    aria-hidden="true"
                  />
                </div>

                {/* Botón de Limpiar filtros */}
                {(query ||
                  selectedVacancyFilter !== 'all' ||
                  selectedSiteFilter !== 'all' ||
                  minMatchFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      handleFilterVacancyChange('all');
                      setSelectedSiteFilter('all');
                      setMinMatchFilter('all');
                    }}
                    className="rounded-xl border border-sand-line bg-cream px-3 py-2.5 text-xs font-semibold text-secondary hover:text-ink hover:bg-sand transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Limpiar
                  </button>
                )}

                {/* Conmutador de Vista (Kanban / Lista) */}
                <div className="flex items-center gap-1 rounded-xl border border-sand-line bg-cream/60 p-1 shadow-2xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('kanban')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'kanban'
                        ? 'bg-cocoa text-white shadow-xs'
                        : 'text-secondary hover:text-ink hover:bg-white'
                    }`}
                    title="Vista de Tablero Kanban / Embudo ATS"
                  >
                    <i className="bx bx-columns text-sm" />
                    <span>Embudo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-cocoa text-white shadow-xs'
                        : 'text-secondary hover:text-ink hover:bg-white'
                    }`}
                    title="Vista de Lista Rectangular ATS"
                  >
                    <i className="bx bx-list-ul text-sm" />
                    <span>Lista</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Pestañas de Etapa activas solo en Vista de Lista */}
            {viewMode === 'list' && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-sand-line">
                <button
                  type="button"
                  onClick={() => setSelectedStageTab('all')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedStageTab === 'all'
                      ? 'bg-cocoa text-white shadow-xs'
                      : 'text-secondary hover:text-ink hover:bg-cream'
                  }`}
                >
                  Todas las Etapas ({candidates.length})
                </button>

                {ATS_STAGES.map((st) => {
                  const count = candidates.filter((c) => c.stage === st.id).length;
                  const isActive = selectedStageTab === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStageTab(st.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-cocoa text-white shadow-xs'
                          : 'text-secondary hover:text-ink hover:bg-cream'
                      }`}
                    >
                      <span className={`size-2 rounded-full ${st.dot}`} />
                      <span>{st.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[0.65rem] ${
                          isActive ? 'bg-white/20 text-white' : 'bg-sand text-cocoa'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── 3. Contenedor de Vista: Selecciona una Vacante vs Embudo Kanban / Lista ─── */}
          {!selectedVacancyFilter ? (
            /* ─── 3A. PANTALLA INICIAL: SELECCIONA UNA VACANTE ─── */
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-sand-line bg-cream/40 p-6 sm:p-7 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <span className="grid size-12 place-items-center rounded-2xl bg-sand text-2xl text-terracotta shrink-0 shadow-2xs">
                      <i className="bx bx-briefcase-alt-2" />
                    </span>
                    <div>
                      <h2 className="m-0 font-display text-lg sm:text-xl font-bold text-ink">
                        Selecciona una vacante para abrir su embudo
                      </h2>
                      <p className="m-0 mt-1 text-xs text-secondary">
                        Elige una convocatoria activa para calificar a los candidatos egresados, gestionar las fases de selección y citar a entrevistas.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleFilterVacancyChange('all')}
                    className="inline-flex items-center gap-2 rounded-xl border border-sand-line bg-white px-4 py-2 text-xs font-bold text-cocoa hover:bg-sand transition-all cursor-pointer shrink-0 shadow-2xs"
                  >
                    <span>Ver todas consolidadas</span>
                    <i className="bx bx-right-arrow-alt text-base" />
                  </button>
                </div>
              </div>

              {/* Cuadrícula de Vacantes Activas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignedVacancies.map((vac) => {
                  const site = siteById[vac.siteId];
                  const candCount = candidates.filter((c) => c.vacancyId === vac.id).length;
                  const inInterviewCount = candidates.filter(
                    (c) => c.vacancyId === vac.id && c.stage === 'interview'
                  ).length;
                  const inOfferCount = candidates.filter(
                    (c) => c.vacancyId === vac.id && c.stage === 'offer'
                  ).length;

                  return (
                    <article
                      key={vac.id}
                      onClick={() => handleFilterVacancyChange(vac.id)}
                      className="group flex flex-col justify-between rounded-2xl border border-sand-line bg-white p-5 sm:p-6 shadow-2xs hover:shadow-card hover:border-ochre transition-all duration-200 cursor-pointer space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-md border border-sand-line bg-cream px-2 py-0.5 text-[0.68rem] font-bold text-cocoa">
                            {vac.code}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold text-cocoa bg-ochre/25 border border-ochre/40 px-2.5 py-0.5 rounded-full">
                            <i className="bx bx-user text-xs text-ochre-dark" />
                            <span>{candCount} candidatos</span>
                          </span>
                        </div>

                        <h3 className="m-0 font-display text-base font-bold text-ink group-hover:text-terracotta transition-colors leading-snug">
                          {vac.title}
                        </h3>

                        <p className="m-0 text-xs text-secondary flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-ink font-semibold">
                            <i className="bx bx-map-pin text-terracotta text-sm" />
                            <span>{site ? `${site.shortName || site.name} (${site.city})` : 'Sede Corporativa'}</span>
                          </span>
                          <span>•</span>
                          <span>{vac.modality}</span>
                          <span>•</span>
                          <span>{vac.openSpots} plaza(s)</span>
                        </p>
                      </div>

                      <div className="pt-3 border-t border-sand-line/60 flex items-center justify-between">
                        <span className="text-[0.7rem] text-secondary font-medium">
                          {inInterviewCount > 0
                            ? `${inInterviewCount} en entrevista`
                            : inOfferCount > 0
                            ? `${inOfferCount} en oferta final`
                            : `${candCount} en proceso`}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-terracotta group-hover:translate-x-1 transition-transform">
                          <span>Abrir embudo</span>
                          <i className="bx bx-right-arrow-alt text-base" />
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Contexto de la Vacante Activa */}
              <div className="flex items-center gap-3 rounded-2xl border border-sand-line bg-cream/40 p-4 shadow-2xs">
                <span className="grid size-10 place-items-center rounded-xl bg-cocoa text-white text-lg shrink-0 shadow-xs">
                  <i className="bx bx-briefcase-alt-2" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="m-0 font-display text-sm sm:text-base font-bold text-ink truncate">
                      {activeVacancy ? activeVacancy.title : 'Todas las vacantes consolidadas'}
                    </h2>
                    {activeVacancy && (
                      <span className="rounded-md border border-sand-line bg-white px-2 py-0.5 text-[0.68rem] font-bold text-cocoa">
                        {activeVacancy.code}
                      </span>
                    )}
                  </div>
                  <p className="m-0 text-xs text-secondary">
                    {filteredCandidates.length} candidato{filteredCandidates.length === 1 ? '' : 's'} en este proceso de selección
                  </p>
                </div>
              </div>

              {filteredCandidates.length === 0 ? (
                <div className="rounded-2xl border border-sand-line bg-white p-12 text-center shadow-2xs">
                  <span className="grid size-12 place-items-center rounded-2xl bg-sand text-2xl text-terracotta mx-auto mb-3">
                    <i className="bx bx-user-check" />
                  </span>
                  <h3 className="m-0 font-display text-base font-bold text-ink">
                    No hay postulantes con los filtros seleccionados
                  </h3>
                  <p className="m-0 mt-1 text-xs text-secondary max-w-sm mx-auto">
                    Prueba cambiando los criterios de sede, match o limpiando la barra de búsqueda.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setSelectedSiteFilter('all');
                      setMinMatchFilter('all');
                      setSelectedStageTab('all');
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-cocoa px-4 py-2 text-xs font-bold text-white hover:bg-cocoa/90 transition-colors cursor-pointer"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              ) : viewMode === 'kanban' ? (
                /* ─── 3A. VISTA DE TABLERO KANBAN / EMBUDO ATS ─── */
                <div data-tour="company-kanban" className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-w-full">
                  {ATS_STAGES.map((stage) => {
                    const stageCandidates = candidatesByStage[stage.id] || [];
                    return (
                      <section
                        key={stage.id}
                        className="flex flex-col shrink-0 w-72 sm:w-[290px] rounded-2xl border border-sand-line bg-cream/35 p-3.5 shadow-2xs"
                        aria-labelledby={`stage-title-${stage.id}`}
                      >
                        {/* Encabezado de Columna */}
                        <div className="flex items-center justify-between pb-3 border-b border-sand-line/70">
                          <div className="flex items-center gap-1.5">
                            <span className={`size-2.5 rounded-full ${stage.dot}`} />
                            <h3 id={`stage-title-${stage.id}`} className="m-0 text-xs font-bold text-ink truncate">
                              {stage.label}
                            </h3>
                          </div>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[0.68rem] font-bold text-cocoa border border-sand-line shadow-2xs">
                            {stageCandidates.length}
                          </span>
                        </div>

                        {/* Tarjetas de Candidatos en la Columna */}
                        <div className="mt-3 space-y-3 min-h-[120px]">
                          {stageCandidates.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-sand-line/80 p-4 text-center">
                              <p className="m-0 text-[0.7rem] text-secondary/70 italic">Sin candidatos en esta fase</p>
                            </div>
                          ) : (
                            stageCandidates.map((cand) => (
                              <article
                                key={cand.id}
                                onClick={() => setSelectedCandidateId(cand.id)}
                                className="group rounded-xl border border-sand-line bg-white p-3.5 shadow-2xs hover:shadow-card hover:border-terracotta/40 transition-all cursor-pointer space-y-2.5"
                              >
                                {/* Cabecera Tarjeta: Foto + Nombre + Match */}
                                <div className="flex items-start gap-2.5">
                                  {cand.avatar ? (
                                    <img
                                      src={cand.avatar}
                                      alt={cand.candidateName}
                                      className="size-9 rounded-xl object-cover shrink-0 border border-sand-line"
                                    />
                                  ) : (
                                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sand text-xs font-bold text-terracotta-dark">
                                      {initialsOf(cand.candidateName)}
                                    </span>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <h4 className="m-0 text-xs font-bold text-ink group-hover:text-terracotta transition-colors truncate">
                                      {cand.candidateName}
                                    </h4>
                                    <p className="m-0 text-[0.68rem] text-secondary truncate">
                                      {cand.program}
                                    </p>
                                  </div>
                                </div>

                                {/* Badge de Match y Vacante */}
                                <div className="flex items-center justify-between gap-1 text-[0.68rem]">
                                  <span className="inline-flex items-center gap-1 font-bold text-cocoa bg-ochre/20 border border-ochre/40 px-2 py-0.5 rounded-md">
                                    <i className="bx bxs-badge-check text-ochre-dark" />
                                    <span>{cand.matchPercentage == null ? 'Sin puntaje calculado' : `${cand.matchPercentage}% afinidad`}</span>
                                  </span>
                                  <span className="font-semibold text-secondary truncate" title={cand.vacancyTitle}>
                                    {cand.vacancyCode}
                                  </span>
                                </div>

                                {/* Chips de Habilidades Técnicas destacadas */}
                                {cand.skillsMatch && cand.skillsMatch.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {cand.skillsMatch.slice(0, 3).map((sk) => (
                                      <span
                                        key={sk}
                                        className="rounded bg-cream px-1.5 py-0.2 text-[0.65rem] font-medium text-cocoa"
                                      >
                                        {sk}
                                      </span>
                                    ))}
                                    {cand.skillsMatch.length > 3 && (
                                      <span className="text-[0.62rem] text-secondary">
                                        +{cand.skillsMatch.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Fecha o Cita */}
                                <div className="flex items-center justify-between pt-1 border-t border-sand-line/50 text-[0.65rem] text-secondary">
                                  <span>{cand.institution.includes('Santander') ? 'UTS' : 'UIS'}</span>
                                  {cand.interviewDate ? (
                                    <span className="font-semibold text-terracotta-dark truncate">
                                      {cand.interviewDate.split('(')[0]}
                                    </span>
                                  ) : (
                                    <span>{new Date(cand.appliedAt).toLocaleDateString('es-CO')}</span>
                                  )}
                                </div>
                              </article>
                            ))
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                /* ─── 3B. VISTA DE LISTA RECTANGULAR ATS ─── */
                <div className="space-y-3">
                  {filteredCandidates.map((cand) => {
                    const stage = ATS_STAGES.find((s) => s.id === cand.stage) || ATS_STAGES[0];
                    const site = siteById[cand.siteId];

                    return (
                      <article
                        key={cand.id}
                        className="group rounded-2xl border border-sand-line bg-white p-5 shadow-2xs hover:shadow-card hover:border-ochre/40 transition-all duration-200"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Información Principal del Aspirante */}
                          <div className="flex items-start gap-3.5 min-w-0 flex-1">
                            {cand.avatar ? (
                              <img
                                src={cand.avatar}
                                alt={cand.candidateName}
                                className="size-13 rounded-2xl object-cover shrink-0 border border-sand-line shadow-2xs"
                              />
                            ) : (
                              <span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-sand text-sm font-bold text-terracotta-dark shadow-2xs">
                                {initialsOf(cand.candidateName)}
                              </span>
                            )}

                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCandidateId(cand.id)}
                                  className="m-0 p-0 text-left font-display text-base font-bold text-ink hover:text-terracotta transition-colors cursor-pointer"
                                >
                                  {cand.candidateName}
                                </button>

                                <span className="inline-flex items-center gap-1 rounded-full bg-ochre/25 border border-ochre/40 px-2 py-0.2 text-[0.68rem] font-bold text-cocoa">
                                  <i className="bx bxs-badge-check text-ochre-dark" />
                                  <span>{cand.matchPercentage == null ? 'Sin puntaje calculado' : `${cand.matchPercentage}% afinidad`}</span>
                                </span>

                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary">
                                  <span className={`size-2 rounded-full ${stage.dot}`} />
                                  <span>{stage.label}</span>
                                </span>
                              </div>

                              <p className="m-0 text-xs font-semibold text-cocoa">
                                {cand.program} • <span className="text-secondary font-medium">{cand.institution}</span>
                              </p>

                              <div className="flex items-center gap-2 flex-wrap text-xs text-secondary">
                                <span className="font-semibold text-ink">
                                  Vacante: {cand.vacancyTitle} ({cand.vacancyCode})
                                </span>
                                <span>•</span>
                                <span>{site?.shortName || site?.name || 'Sede Bucaramanga'}</span>
                                <span>•</span>
                                <span>
                                  Postulado:{' '}
                                  {new Date(cand.appliedAt).toLocaleDateString('es-CO', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              </div>

                              {/* Habilidades Técnicas Coincidentes */}
                              {cand.skillsMatch && cand.skillsMatch.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                  <span className="text-[0.68rem] uppercase font-bold text-secondary">Skills:</span>
                                  {cand.skillsMatch.map((sk) => (
                                    <span
                                      key={sk}
                                      className="rounded-md border border-sand-line bg-cream/50 px-2 py-0.5 text-[0.68rem] font-medium text-cocoa"
                                    >
                                      {sk}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Botones de Acción */}
                          <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                            <button
                              type="button"
                              onClick={() => setSelectedCandidateId(cand.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-cocoa px-4 py-2 text-xs font-bold text-white hover:bg-cocoa/90 transition-all cursor-pointer shadow-xs"
                            >
                              <i className="bx bx-file-find text-sm" />
                              <span>Evaluar Ficha</span>
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Drawer Lateral de Evaluación Completa del Candidato ─── */}
        <CandidateDetailDrawer
          candidate={selectedCandidateForDrawer}
          onClose={() => setSelectedCandidateId(null)}
          onMoveStage={handleMoveStage}
          onDiscard={handleDiscard}
          onSaveNotes={handleSaveNotes}
        />
      </main>
    </CompanyPortalLayout>
  );
}

