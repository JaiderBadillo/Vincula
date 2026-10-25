import { useEffect, useMemo, useState } from 'react';
import GraduatePortalLayout from '../components/dashboard/GraduatePortalLayout.jsx';
import { phaseDefinitions, proposalApplications, proposalInterviews } from '../data/proposalApplications.js';

const phaseOptions = [
  { value: 'all', label: 'Todas las fases', shortLabel: 'Todas' },
  { value: '1', label: 'Fase 1: Postulación recibida', shortLabel: 'Fase 1', dot: 'bg-amber-500' },
  { value: '2', label: 'Fase 2: Revisión curricular', shortLabel: 'Fase 2', dot: 'bg-sky-500' },
  { value: '3', label: 'Fase 3: Entrevista técnica', shortLabel: 'Fase 3', dot: 'bg-purple-500' },
  { value: '4', label: 'Fase 4: Oferta y contratación', shortLabel: 'Fase 4', dot: 'bg-emerald-500' },
];

export default function MyApplicationsPage() {
  const [phaseFilter, setPhaseFilter] = useState('all'); // 'all' | '1' | '2' | '3' | '4'
  const [companyFilter, setCompanyFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [selectedAppId, setSelectedAppId] = useState(proposalApplications[0]?.id || null);
  const [inspectingPhase, setInspectingPhase] = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [withdrawnApps, setWithdrawnApps] = useState(new Set());
  const [toastMessage, setToastMessage] = useState(null);

  function notify(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  // Active applications excluding withdrawn
  const activeApplications = useMemo(
    () => proposalApplications.filter((a) => !withdrawnApps.has(a.id)),
    [withdrawnApps],
  );

  const companyOptions = useMemo(
    () => [...new Set(activeApplications.map((a) => a.companyName))].sort(),
    [activeApplications],
  );

  // Filtered applications based on search, phase buttons and company dropdown
  const filteredApplications = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return activeApplications.filter((app) => {
      const matchKeyword =
        !q ||
        app.vacancyTitle.toLowerCase().includes(q) ||
        app.companyName.toLowerCase().includes(q) ||
        app.applicationCode.toLowerCase().includes(q);

      const matchPhase = phaseFilter === 'all' || app.phase === Number(phaseFilter);
      const matchCompany = companyFilter === 'all' || app.companyName === companyFilter;

      return matchKeyword && matchPhase && matchCompany;
    });
  }, [activeApplications, keyword, phaseFilter, companyFilter]);

  // Selected application for detail pane
  const selectedApp = useMemo(() => {
    if (selectedAppId) {
      const found = filteredApplications.find((a) => a.id === selectedAppId);
      if (found) return found;
    }
    return filteredApplications[0] || null;
  }, [selectedAppId, filteredApplications]);

  // Sync inspecting phase whenever selected application changes
  useEffect(() => {
    if (selectedApp) {
      setInspectingPhase(selectedApp.phase);
    }
  }, [selectedApp?.id, selectedApp?.phase]);

  // Interview associated with selected application
  const selectedInterview = useMemo(
    () => (selectedApp ? proposalInterviews.find((i) => i.applicationId === selectedApp.id) : null),
    [selectedApp],
  );

  // Next imminent upcoming interview
  const nextInterview = useMemo(
    () => proposalInterviews.find((i) => i.isUpcoming && !withdrawnApps.has(i.applicationId)),
    [withdrawnApps],
  );

  // Quick pipeline activity counts
  const inReviewCount = useMemo(
    () => activeApplications.filter((a) => a.phase <= 2).length,
    [activeApplications],
  );
  const interviewsCount = useMemo(
    () => proposalInterviews.filter((i) => i.isUpcoming && !withdrawnApps.has(i.applicationId)).length,
    [withdrawnApps],
  );
  const offersCount = useMemo(
    () => activeApplications.filter((a) => a.phase === 4).length,
    [activeApplications],
  );

  function handleSelectApp(id) {
    setSelectedAppId(id);
    setMobileDetailOpen(true);
  }

  function handleWithdraw(appId, companyName) {
    setWithdrawnApps((prev) => new Set(prev).add(appId));
    setMobileDetailOpen(false);
    notify(`Has retirado tu postulación en ${companyName}.`);
  }

  function getPhaseBadge(phaseNum) {
    const p = phaseDefinitions.find((def) => def.number === phaseNum) || phaseDefinitions[0];
    return p;
  }

  return (
    <GraduatePortalLayout activePage="applications">
      <main className="w-full pb-16">
        {/* ─── Header Limpio y Espacioso ─── */}
        <header className="border-b border-line-soft bg-white px-5 py-6 sm:px-8 lg:px-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="m-0 font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                  Mis Postulaciones
                </h1>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  {activeApplications.length} activas
                </span>
              </div>
              <p className="m-0 mt-1 text-xs sm:text-sm text-body-muted">
                Seguimiento en tiempo real de tus procesos de selección en empresas aliadas.
              </p>
            </div>

            {/* Cápsula interactiva de actividad en el pipeline (Diseño orgánico y no formulaico) */}
            <div className="flex items-center">
              <nav
                aria-label="Resumen rápido de fases activas"
                className="inline-flex items-center rounded-2xl border border-line bg-page/90 p-1 shadow-2xs backdrop-blur-xs divide-x divide-line/60"
              >
                {/* En Revisión */}
                <button
                  type="button"
                  onClick={() => setPhaseFilter((prev) => (prev === '2' ? 'all' : '2'))}
                  aria-pressed={phaseFilter === '1' || phaseFilter === '2'}
                  className={`group inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    phaseFilter === '1' || phaseFilter === '2'
                      ? 'bg-white text-ink shadow-xs border border-line/60'
                      : 'text-secondary hover:text-ink hover:bg-white/60'
                  }`}
                  title="Filtrar postulaciones en revisión curricular"
                >
                  <span className="size-2 rounded-full bg-sky-500 shrink-0" />
                  <span className="text-xs">En revisión</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[0.68rem] font-bold ${
                      phaseFilter === '1' || phaseFilter === '2'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-panel text-secondary group-hover:bg-sky-50 group-hover:text-sky-700'
                    }`}
                  >
                    {inReviewCount}
                  </span>
                </button>

                {/* Entrevistas */}
                <button
                  type="button"
                  onClick={() => setPhaseFilter((prev) => (prev === '3' ? 'all' : '3'))}
                  aria-pressed={phaseFilter === '3'}
                  className={`group inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    phaseFilter === '3'
                      ? 'bg-white text-ink shadow-xs border border-line/60'
                      : 'text-secondary hover:text-ink hover:bg-white/60'
                  }`}
                  title="Filtrar postulaciones en fase de entrevistas"
                >
                  <span className="relative flex size-2 shrink-0">
                    {interviewsCount > 0 && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                    )}
                    <span className="relative inline-flex rounded-full size-2 bg-purple-600" />
                  </span>
                  <span className="text-xs">Entrevistas</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[0.68rem] font-bold ${
                      phaseFilter === '3'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-panel text-secondary group-hover:bg-purple-50 group-hover:text-purple-700'
                    }`}
                  >
                    {interviewsCount}
                  </span>
                </button>

                {/* Ofertas */}
                <button
                  type="button"
                  onClick={() => setPhaseFilter((prev) => (prev === '4' ? 'all' : '4'))}
                  aria-pressed={phaseFilter === '4'}
                  className={`group inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    phaseFilter === '4'
                      ? 'bg-white text-ink shadow-xs border border-line/60'
                      : 'text-secondary hover:text-ink hover:bg-white/60'
                  }`}
                  title="Filtrar ofertas laborales y contratación"
                >
                  <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs">Ofertas</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[0.68rem] font-bold ${
                      phaseFilter === '4'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-panel text-secondary group-hover:bg-emerald-50 group-hover:text-emerald-700'
                    }`}
                  >
                    {offersCount}
                  </span>
                </button>
              </nav>
            </div>
          </div>
        </header>

        {/* ─── Contenedor Principal ─── */}
        <div className="max-w-7xl mx-auto px-5 pt-5 sm:px-8 lg:px-10 space-y-5">
          {/* ─── Aviso Compacto de Próxima Entrevista (Solo si hay una vigente) ─── */}
          {nextInterview && (
            <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/80 via-white to-purple-50/40 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-purple-700 text-white text-lg shrink-0 shadow-xs">
                  <i className="bx bx-video" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-950">
                      Próxima Entrevista: {nextInterview.dateFormatted} ({nextInterview.timeFormatted})
                    </span>
                    <span className="rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-[0.62rem] font-bold">
                      {nextInterview.platform}
                    </span>
                  </div>
                  <p className="m-0 text-xs text-body-muted mt-0.5">
                    <strong>{nextInterview.companyName}</strong> · {nextInterview.vacancyTitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleSelectApp(nextInterview.applicationId)}
                  className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink hover:text-purple-700 cursor-pointer"
                >
                  Ver postulación
                </button>
                <a
                  href={nextInterview.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs transition-colors no-underline"
                >
                  <span>Entrar a la sala</span>
                  <i className="bx bx-link-external text-xs" />
                </a>
              </div>
            </div>
          )}

          {/* ─── Bloque de Filtros y Navegación por Fases (Estilo Fiel a la Primera Versión) ─── */}
          <section
            className="rounded-2xl border border-lime/40 bg-gradient-to-r from-lime/15 via-white to-lime/10 p-4 sm:p-5 shadow-xs"
            aria-label="Filtros de postulaciones"
          >
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6">
              {/* Filtro por Empresa */}
              <div className="w-full lg:w-64 shrink-0">
                <label htmlFor="application-company-filter" className="block font-display text-xs sm:text-sm font-bold text-ink mb-1.5">
                  Empresa
                </label>
                <div className="relative">
                  <select
                    id="application-company-filter"
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="w-full min-h-[3rem] appearance-none rounded-xl border border-line bg-white px-3.5 pr-8 text-xs sm:text-sm font-semibold text-ink shadow-2xs outline-none transition-all hover:border-green/50 focus:border-green focus:ring-2 focus:ring-green/20 cursor-pointer"
                  >
                    <option value="all">Todas las empresas ({activeApplications.length})</option>
                    {companyOptions.map((companyName) => (
                      <option key={companyName} value={companyName}>{companyName}</option>
                    ))}
                  </select>
                  <i className="bx bx-chevron-down absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary text-lg" />
                </div>
              </div>

              {/* Botones para Navegar por Fases (Estilo Primera Versión) */}
              <fieldset className="m-0 p-0 border-0 flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <legend className="float-none font-display text-xs sm:text-sm font-bold text-ink p-0 m-0">
                    Fase
                  </legend>
                  <span className="text-[0.7rem] text-secondary font-medium hidden sm:inline">
                    Haz clic en una fase para navegar y filtrar
                  </span>
                </div>

                <div
                  className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-lime/25 border border-lime/35 overflow-x-auto scrollbar-none"
                  role="group"
                  aria-label="Filtrar por fase"
                >
                  {phaseOptions.map(({ value, shortLabel }) => {
                    const isSelected = phaseFilter === value;
                    const count = value === 'all'
                      ? activeApplications.length
                      : activeApplications.filter((a) => a.phase === Number(value)).length;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPhaseFilter(value)}
                        aria-pressed={isSelected}
                        className={`min-h-[3rem] px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2 shrink-0 ${
                          isSelected
                            ? 'bg-green text-white border border-green shadow-md shadow-green/25 ring-2 ring-green/20 font-bold'
                            : 'bg-white text-blue-muted border border-line hover:border-green/50 hover:bg-lime/15 hover:text-green-dark'
                        }`}
                      >
                        <span>{shortLabel}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[0.68rem] font-bold ${
                            isSelected ? 'bg-white/25 text-white' : 'bg-panel text-secondary'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Buscador de apoyo & Botón Limpiar */}
              <div className="w-full lg:w-56 shrink-0 flex items-end gap-2">
                <div className="relative flex-1">
                  <label htmlFor="vacancy-search-input" className="block font-display text-xs sm:text-sm font-bold text-ink mb-1.5">
                    Buscar
                  </label>
                  <div className="relative">
                    <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm" />
                    <input
                      id="vacancy-search-input"
                      type="search"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="Cargo o código..."
                      className="w-full min-h-[3rem] rounded-xl border border-line bg-white pl-8 pr-2.5 text-xs text-ink shadow-2xs outline-none transition-all hover:border-green/50 focus:border-green focus:ring-2 focus:ring-green/20"
                    />
                  </div>
                </div>

                {(phaseFilter !== 'all' || companyFilter !== 'all' || keyword) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhaseFilter('all');
                      setCompanyFilter('all');
                      setKeyword('');
                    }}
                    className="min-h-[3rem] px-3 rounded-xl border border-line bg-white text-secondary hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                    title="Restablecer todos los filtros"
                    aria-label="Restablecer todos los filtros"
                  >
                    <i className="bx bx-trash text-base" />
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ─── Estructura Maestro - Detalle ─── */}
          {filteredApplications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center my-6">
              <div className="grid size-14 place-items-center rounded-2xl bg-panel text-2xl text-secondary mx-auto mb-3">
                <i className="bx bx-search-alt" />
              </div>
              <h3 className="font-display text-base font-bold text-ink">No hay postulaciones en esta fase o filtro</h3>
              <p className="text-xs text-body-muted max-w-sm mx-auto mt-1">
                Selecciona otra fase en los botones superiores para ver tus demás postulaciones.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPhaseFilter('all');
                  setCompanyFilter('all');
                  setKeyword('');
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-ink-soft cursor-pointer"
              >
                Ver todas las fases
              </button>
            </div>
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]">
              {/* ─── Columna Izquierda: Lista de Postulaciones ─── */}
              <div className="space-y-3">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary px-1 block">
                  {filteredApplications.length} {filteredApplications.length === 1 ? 'postulación' : 'postulaciones'} en esta vista
                </span>

                <div className="space-y-2.5">
                  {filteredApplications.map((app) => {
                    const isSelected = selectedApp?.id === app.id;
                    const phase = getPhaseBadge(app.phase);
                    const hasInterview = proposalInterviews.some((i) => i.applicationId === app.id && i.isUpcoming);

                    return (
                      <div
                        key={app.id}
                        onClick={() => handleSelectApp(app.id)}
                        className={`group rounded-2xl border p-4 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-green bg-gradient-to-r from-emerald-50/50 via-white to-white shadow-card ring-2 ring-green/20'
                            : 'border-line bg-white shadow-2xs hover:border-green/40 hover:shadow-xs'
                        }`}
                      >
                        {/* Company header row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold font-display shadow-2xs ${app.companyLogoBg}`}>
                              {app.companyShort.slice(0, 3)}
                            </span>
                            <div className="min-w-0">
                              <span className="font-display text-xs font-bold text-ink truncate block">
                                {app.companyName}
                              </span>
                              <span className="text-[0.65rem] text-secondary truncate block">
                                {app.location}
                              </span>
                            </div>
                          </div>

                          {/* Phase Pill */}
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.62rem] font-bold ${phase.badgeColor}`}>
                            <span className={`inline-block size-1.5 rounded-full ${phase.dotColor} mr-1`} />
                            Fase {app.phase}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="m-0 mt-2.5 font-display text-sm font-bold text-ink group-hover:text-green-dark transition-colors line-clamp-1">
                          {app.vacancyTitle}
                        </h3>

                        {/* Quick Conditions Strip */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.7rem] text-body-muted">
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {app.salary.split('COP')[0]}
                          </span>
                          <span>•</span>
                          <span>{app.workMode}</span>
                        </div>

                        {/* Footer snippet */}
                        <div className="mt-3 pt-2.5 border-t border-line-soft flex items-center justify-between text-[0.68rem] text-secondary">
                          <span>Postulado: {app.appliedAt}</span>

                          {app.phase === 4 ? (
                            <span className="font-bold text-emerald-700 flex items-center gap-0.5">
                              <i className="bx bx-award text-xs" /> Oferta lista
                            </span>
                          ) : hasInterview ? (
                            <span className="font-bold text-purple-700 flex items-center gap-0.5">
                              <i className="bx bx-video text-xs" /> Entrevista
                            </span>
                          ) : (
                            <span className="text-blue-muted group-hover:text-green-dark font-medium flex items-center">
                              Ver ficha →
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ─── Columna Derecha: Panel de Detalle Enfocado (Desktop) ─── */}
              <div className="hidden lg:block sticky top-20">
                {selectedApp ? (
                  <article className="overflow-hidden rounded-2xl border border-line bg-white shadow-card space-y-0">
                    {/* Header Panorámico con Foto de Sede */}
                    <div className="relative h-36 w-full overflow-hidden bg-ink">
                      <img
                        src={selectedApp.companyCover}
                        alt={selectedApp.companyName}
                        className="size-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />

                      <div className="absolute top-3 left-4 flex items-center gap-2">
                        <span className="rounded-full bg-ink/80 backdrop-blur-md px-2.5 py-0.5 text-[0.65rem] font-bold text-lime border border-white/20">
                          {selectedApp.partnershipType}
                        </span>
                        <span className="rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[0.65rem] font-medium text-white">
                          Cód: {selectedApp.applicationCode}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
                        <div className="flex items-center gap-3">
                          <span className={`grid size-12 place-items-center rounded-xl text-xs font-bold font-display shadow-lg border border-white/30 ${selectedApp.companyLogoBg}`}>
                            {selectedApp.companyShort.slice(0, 3)}
                          </span>
                          <div>
                            <div className="flex items-center gap-1">
                              <h2 className="m-0 font-display text-base font-bold leading-tight">
                                {selectedApp.companyName}
                              </h2>
                              <i className="bx bxs-badge-check text-lime text-sm" />
                            </div>
                            <span className="text-xs text-white/70 block">
                              {selectedApp.companySector} · {selectedApp.location}
                            </span>
                          </div>
                        </div>

                        <span className="rounded-full bg-lime text-ink px-3 py-1 text-xs font-bold shadow-xs">
                          Fase {selectedApp.phase} de 4
                        </span>
                      </div>
                    </div>

                    {/* Contenido del Panel */}
                    <div className="p-5 sm:p-6 space-y-6 max-h-[42rem] overflow-y-auto">
                      {/* Título de la Vacante & Condiciones */}
                      <div>
                        <h3 className="m-0 font-display text-lg sm:text-xl font-bold text-ink">
                          {selectedApp.vacancyTitle}
                        </h3>

                        {/* Condiciones clave de la vacante */}
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-page px-2.5 py-1 text-ink font-semibold">
                            <i className="bx bx-dollar-circle text-secondary text-sm" />
                            <span>{selectedApp.salary}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-page px-2.5 py-1 text-ink font-medium">
                            <i className="bx bx-laptop text-secondary text-sm" />
                            <span>{selectedApp.workMode}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-page px-2.5 py-1 text-secondary font-medium">
                            <i className="bx bx-briefcase-alt-2 text-secondary text-sm" />
                            <span>{selectedApp.contractType}</span>
                          </span>
                        </div>
                      </div>

                      {/* Stepper Visual de 4 Fases con Navegación Interactiva */}
                      <div className="rounded-2xl border border-line bg-page/70 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary block">
                            Embudo de Selección (Fase actual: {selectedApp.phase} de 4)
                          </span>
                          <span className="text-[0.65rem] text-secondary hidden sm:inline">
                            Toca cada fase para explorar su progreso
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center" role="group" aria-label="Navegar por las 4 fases de la postulación">
                          {phaseDefinitions.map((def) => {
                            const isCompleted = def.number < selectedApp.phase;
                            const isCurrent = def.number === selectedApp.phase;
                            const isInspecting = inspectingPhase === def.number;

                            return (
                              <button
                                key={def.number}
                                type="button"
                                onClick={() => setInspectingPhase(def.number)}
                                className={`group p-2 rounded-xl transition-all cursor-pointer text-center border ${
                                  isInspecting
                                    ? 'bg-white border-green shadow-xs ring-2 ring-green/20'
                                    : 'border-transparent hover:bg-white/60'
                                }`}
                                title={`Ver detalles de ${def.label}: ${def.name}`}
                              >
                                <div
                                  className={`size-8 mx-auto rounded-full grid place-items-center text-xs font-bold transition-all ${
                                    isCurrent
                                      ? 'bg-green text-white shadow-xs ring-2 ring-green/30'
                                      : isCompleted
                                      ? 'bg-green/15 text-green-dark border border-green/30'
                                      : 'bg-panel text-secondary border border-line'
                                  }`}
                                >
                                  {isCompleted ? <i className="bx bx-check text-base font-bold" /> : def.number}
                                </div>
                                <span className={`block text-[0.65rem] font-semibold leading-tight mt-1.5 truncate ${isInspecting ? 'text-green-dark font-bold' : isCompleted ? 'text-ink' : 'text-secondary'}`}>
                                  {def.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tarjeta Informativa si se inspecciona una fase distinta a la actual */}
                      {inspectingPhase && inspectingPhase !== selectedApp.phase && (
                        <div className="rounded-2xl border border-line bg-page p-3.5 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-ink flex items-center gap-1.5">
                              <i className="bx bx-info-circle text-green" />
                              Detalle de {phaseDefinitions.find((d) => d.number === inspectingPhase)?.label}: {phaseDefinitions.find((d) => d.number === inspectingPhase)?.name}
                            </span>
                            <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full ${
                              inspectingPhase < selectedApp.phase
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-secondary'
                            }`}>
                              {inspectingPhase < selectedApp.phase ? 'Superada con éxito' : 'Próxima etapa'}
                            </span>
                          </div>
                          <p className="m-0 text-body-muted text-xs">
                            {phaseDefinitions.find((d) => d.number === inspectingPhase)?.shortDescription}
                          </p>
                          <button
                            type="button"
                            onClick={() => setInspectingPhase(selectedApp.phase)}
                            className="text-[0.7rem] text-green-dark font-bold hover:underline pt-1 inline-block"
                          >
                            Volver a fase actual activa (Fase {selectedApp.phase})
                          </button>
                        </div>
                      )}

                      {/* Tarjeta de Retroalimentación Oficial */}
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-1.5">
                        <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <i className="bx bxs-message-square-dots text-green text-base" />
                          Última actualización: {selectedApp.phaseStatusLabel}
                        </span>
                        <p className="m-0 text-xs text-ink/85 leading-relaxed bg-white/80 p-3 rounded-xl border border-emerald-200/50">
                          "{selectedApp.phaseFeedback}"
                        </p>
                        {selectedApp.estimatedStartDate && (
                          <span className="text-[0.72rem] text-emerald-800 font-semibold block pt-1">
                            📅 Fecha estimada de ingreso: <strong>{selectedApp.estimatedStartDate}</strong>
                          </span>
                        )}
                      </div>

                      {/* Tarjeta de Entrevista (Si aplica a esta postulación) */}
                      {selectedInterview && (
                        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/50 via-white to-white p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                              <i className="bx bx-video text-purple-700 text-base" />
                              Entrevista Programada
                            </span>
                            <span className="rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-[0.62rem] font-bold">
                              {selectedInterview.platform}
                            </span>
                          </div>

                          <div className="rounded-xl border border-line-soft bg-page p-3 text-xs flex items-center justify-between">
                            <span className="font-semibold text-ink">
                              {selectedInterview.dateFormatted} ({selectedInterview.timeFormatted})
                            </span>
                            {selectedInterview.meetingUrl && (
                              <a
                                href={selectedInterview.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white px-3 py-1 font-bold no-underline"
                              >
                                <span>Entrar</span>
                                <i className="bx bx-link-external text-xs" />
                              </a>
                            )}
                          </div>
                          <p className="m-0 text-[0.72rem] text-body-muted">
                            <strong>Enfoque:</strong> {selectedInterview.objective}
                          </p>
                        </div>
                      )}

                      {/* Contacto Directo del Reclutador */}
                      <div className="rounded-2xl border border-line bg-page p-4">
                        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block mb-2.5">
                          Reclutador asignado por {selectedApp.companyName}
                        </span>
                        <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-line-soft">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={selectedApp.recruiter.avatar}
                              alt={selectedApp.recruiter.name}
                              className="size-9 rounded-full object-cover border border-line"
                            />
                            <div>
                              <span className="font-bold text-xs text-ink block">{selectedApp.recruiter.name}</span>
                              <span className="text-[0.68rem] text-secondary">{selectedApp.recruiter.role}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={`mailto:${selectedApp.recruiter.email}?subject=Consulta%20Postulacion%20${selectedApp.applicationCode}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-line bg-page px-2.5 py-1 text-xs font-semibold text-ink hover:bg-white no-underline"
                              title="Enviar correo"
                            >
                              <i className="bx bx-envelope" /> Email
                            </a>
                            <a
                              href={`https://wa.me/57${selectedApp.recruiter.phone.replace(/\D/g, '').slice(-10)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-xs font-semibold hover:bg-emerald-700 no-underline"
                              title="Chat WhatsApp"
                            >
                              <i className="bx bxl-whatsapp" /> WhatsApp
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Documento Enviado */}
                      <div className="rounded-xl border border-line p-3 flex items-center justify-between text-xs bg-page/50">
                        <div className="flex items-center gap-2">
                          <i className="bx bxs-file-pdf text-red-600 text-xl" />
                          <span className="font-semibold text-ink truncate max-w-[14rem]">
                            {selectedApp.submittedDocument.fileName}
                          </span>
                        </div>
                        <span className="rounded-full bg-lime/20 text-green-dark px-2 py-0.5 text-[0.62rem] font-bold">
                          {selectedApp.submittedDocument.matchScore}% Match UTS
                        </span>
                      </div>

                      {/* Botón Discreto de Retiro */}
                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Deseas retirar tu postulación a ${selectedApp.vacancyTitle} en ${selectedApp.companyName}?`)) {
                              handleWithdraw(selectedApp.id, selectedApp.companyName);
                            }
                          }}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                        >
                          Retirar mi postulación de este proceso
                        </button>
                      </div>
                    </div>
                  </article>
                ) : (
                  <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-xs text-secondary">
                    Selecciona una postulación para ver los detalles.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── Drawer Modal de Detalle para Móviles (< lg) ─── */}
      {mobileDetailOpen && selectedApp && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/75 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-line bg-white shadow-hero animate-rise-in p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-line-soft pb-3">
              <div className="flex items-center gap-2.5">
                <span className={`grid size-9 place-items-center rounded-xl text-xs font-bold ${selectedApp.companyLogoBg}`}>
                  {selectedApp.companyShort.slice(0, 3)}
                </span>
                <div>
                  <h3 className="m-0 font-display text-sm font-bold text-ink">{selectedApp.companyName}</h3>
                  <span className="text-[0.65rem] text-secondary">{selectedApp.location}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="grid size-8 place-items-center rounded-full bg-page text-secondary text-lg cursor-pointer"
              >
                <i className="bx bx-x" />
              </button>
            </div>

            <div>
              <h4 className="m-0 font-display text-base font-bold text-ink">{selectedApp.vacancyTitle}</h4>
              <p className="m-0 mt-1 text-xs text-emerald-800 font-bold">{selectedApp.salary}</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs space-y-1">
              <strong className="block text-emerald-950">Estado: {selectedApp.phaseStatusLabel}</strong>
              <p className="m-0 text-ink/80 leading-relaxed">"{selectedApp.phaseFeedback}"</p>
            </div>

            {selectedInterview && (
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 text-xs flex items-center justify-between">
                <span>{selectedInterview.dateFormatted}</span>
                {selectedInterview.meetingUrl && (
                  <a
                    href={selectedInterview.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-purple-700 text-white px-3 py-1 font-bold no-underline"
                  >
                    Entrar a la sala
                  </a>
                )}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-line-soft">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Retirar postulación de ${selectedApp.companyName}?`)) {
                    handleWithdraw(selectedApp.id, selectedApp.companyName);
                  }
                }}
                className="text-xs text-rose-600 font-semibold"
              >
                Retirar postulación
              </button>
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="rounded-xl bg-ink text-white px-4 py-2 text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-hero">
            <i className="bx bxs-check-circle text-lime text-lg" />
            {toastMessage}
          </div>
        </div>
      )}
    </GraduatePortalLayout>
  );
}
