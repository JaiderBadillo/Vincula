import { useMemo, useState } from 'react';
import GraduatePortalLayout from '../components/dashboard/GraduatePortalLayout.jsx';
import { proposalJobs } from '../data/proposalJobs.js';
import { useProfile } from '../hooks/useProfile.js';

export default function VacanciesPage() {
  const { profile } = useProfile();
  const [selectedId, setSelectedId] = useState(proposalJobs[0]?.id ?? null);
  const [activeDetailTab, setActiveDetailTab] = useState('cargo'); // 'cargo' | 'match' | 'empresa' | 'proceso'
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'grid'
  const [keyword, setKeyword] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all'); // 'all' | 'private' | 'public'
  const [modeFilter, setModeFilter] = useState('all'); // 'all' | 'Remoto' | 'Híbrido' | 'Presencial'
  const [sortBy, setSortBy] = useState('match'); // 'match' | 'salary' | 'recent'
  const [applyModalJob, setApplyModalJob] = useState(null);
  const [appliedJobs, setAppliedJobs] = useState(new Set());
  const [savedJobs, setSavedJobs] = useState(new Set());
  const [applicationNote, setApplicationNote] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  function notify(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  const filteredJobs = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    let list = proposalJobs.filter((j) => {
      const matchKeyword =
        !q ||
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.city.toLowerCase().includes(q) ||
        j.stack.some((s) => s.toLowerCase().includes(q));

      const matchSector = sectorFilter === 'all' || j.sector === sectorFilter;
      const matchMode = modeFilter === 'all' || j.mode.toLowerCase() === modeFilter.toLowerCase();

      return matchKeyword && matchSector && matchMode;
    });

    if (sortBy === 'match') {
      list.sort((a, b) => b.utsMatch - a.utsMatch);
    } else if (sortBy === 'salary') {
      list.sort((a, b) => b.salaryMax - a.salaryMax);
    } else if (sortBy === 'recent') {
      list.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }

    return list;
  }, [keyword, sectorFilter, modeFilter, sortBy]);

  const selectedJob = filteredJobs.find((j) => j.id === selectedId) || filteredJobs[0] || null;

  function toggleSaveJob(id) {
    setSavedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        notify('Vacante eliminada de tus guardados.');
      } else {
        next.add(id);
        notify('Vacante guardada en tus favoritos.');
      }
      return next;
    });
  }

  function handleConfirmApply() {
    if (!applyModalJob) return;
    setAppliedJobs((prev) => new Set(prev).add(applyModalJob.id));
    notify(`¡Postulación enviada exitosamente a ${applyModalJob.company}!`);
    setApplyModalJob(null);
    setApplicationNote('');
  }

  return (
    <GraduatePortalLayout activePage="vacancies">
      <main className="w-full pb-20">
        {/* ─── Hero Header con Estadísticas Clave ─── */}
        <section className="relative isolate overflow-hidden bg-ink py-10 px-5 sm:px-8 lg:px-10 text-white">
          <div className="pointer-events-none absolute inset-0 z-0 opacity-25">
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80"
              alt=""
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/70" />
            <div className="hero-grid absolute inset-0 opacity-40" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-2xl">
                <h1 className="m-0 font-display text-[clamp(1.8rem,3.2vw,2.6rem)] font-bold tracking-tight text-white leading-tight">
                  Explorar Vacantes y Oportunidades Laborales
                </h1>
                <p className="m-0 mt-2 text-sm sm:text-base text-white/70 leading-relaxed max-w-xl">
                  Accede a convocatorias transparentes con empresas aliadas verificadas. Descubre tu porcentaje de afinidad según tu titulación y competencias curriculares.
                </p>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5">
                  <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-lime">
                    Convenios Activos
                  </span>
                  <span className="font-display text-xl font-bold text-white mt-0.5 block">
                    {proposalJobs.length} Empresas
                  </span>
                  <span className="text-[0.68rem] text-white/50">Santander & Nacional</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5">
                  <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-emerald-400">
                    Sueldo Promedio
                  </span>
                  <span className="font-display text-xl font-bold text-white mt-0.5 block">
                    $6.4M COP
                  </span>
                  <span className="text-[0.68rem] text-white/50">Hasta $8.8M mensuales</span>
                </div>

                <div className="col-span-2 sm:col-span-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5">
                  <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-sky-400">
                    Tu Afinidad Máxima
                  </span>
                  <span className="font-display text-xl font-bold text-lime mt-0.5 block">
                    96% Match
                  </span>
                  <span className="text-[0.68rem] text-white/50">Con tu perfil UTS</span>
                </div>
              </div>
            </div>

            {/* Smart Search Bar */}
            <div className="mt-8 rounded-2xl border border-white/15 bg-white/10 p-2.5 backdrop-blur-xl shadow-hero">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                <div className="relative flex items-center px-3 py-1.5">
                  <i className="bx bx-search text-xl text-lime mr-2.5" />
                  <input
                    type="search"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Buscar por cargo (ej. Datos, React), empresa (Bancolombia, Rappi) o tecnología..."
                    className="w-full bg-transparent text-sm text-white placeholder-white/50 outline-none"
                  />
                  {keyword && (
                    <button
                      type="button"
                      onClick={() => setKeyword('')}
                      className="text-white/60 hover:text-white p-1 text-sm cursor-pointer"
                    >
                      <i className="bx bx-x" />
                    </button>
                  )}
                </div>

                {/* Sector filter */}
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="rounded-xl border border-white/15 bg-ink/70 px-3.5 py-2.5 text-xs font-semibold text-white outline-none cursor-pointer"
                >
                  <option value="all">Todos los sectores</option>
                  <option value="private">Sector Privado / Tech</option>
                  <option value="public">Sector Público / Mixto</option>
                </select>

                {/* Mode filter */}
                <select
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  className="rounded-xl border border-white/15 bg-ink/70 px-3.5 py-2.5 text-xs font-semibold text-white outline-none cursor-pointer"
                >
                  <option value="all">Todas las modalidades</option>
                  <option value="Remoto">100% Remoto</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="Presencial">Presencial</option>
                </select>

                {/* Sort selector */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-lime/40 bg-lime text-ink px-3.5 py-2.5 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="match">Mayor afinidad UTS</option>
                  <option value="salary">Mayor remuneración</option>
                  <option value="recent">Más recientes</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Control Bar: Results counter + View mode switch ─── */}
        <div className="border-b border-line-soft bg-white px-5 py-3.5 sm:px-8 lg:px-10">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-body-muted">
              <span>
                Mostrando <strong className="text-ink font-bold">{filteredJobs.length}</strong> convocatorias vigentes
              </span>
              <span className="text-secondary">•</span>
              <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <i className="bx bxs-badge-check text-green text-xs mr-1" />
                Todas verificadas con NIT y Convenio UTS
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary font-medium mr-1">Visualización:</span>
              <div className="flex rounded-xl border border-line bg-page p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'split' ? 'bg-white text-ink shadow-xs' : 'text-secondary hover:text-ink'
                  }`}
                  title="Panel dividido (Lista + Ficha inmersiva)"
                >
                  <i className="bx bx-layout text-sm" />
                  Panel Dividido
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-ink shadow-xs' : 'text-secondary hover:text-ink'
                  }`}
                  title="Cuadrícula completa de tarjetas fotográficas"
                >
                  <i className="bx bx-grid-alt text-sm" />
                  Cuadrícula
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Main Content Area ─── */}
        <div className="max-w-7xl mx-auto px-5 pt-6 sm:px-8 lg:px-10">
          {filteredJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center my-6">
              <div className="grid size-16 place-items-center rounded-2xl bg-panel text-3xl text-secondary mx-auto mb-3">
                <i className="bx bx-search-alt" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink">No encontramos vacantes con esos filtros</h3>
              <p className="text-sm text-body-muted max-w-md mx-auto mt-1">
                Intenta ajustando el término de búsqueda o cambiando la modalidad para ver todas las oportunidades disponibles.
              </p>
              <button
                type="button"
                onClick={() => {
                  setKeyword('');
                  setSectorFilter('all');
                  setModeFilter('all');
                  setSortBy('match');
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-ink-soft cursor-pointer"
              >
                Restablecer todos los filtros
              </button>
            </div>
          ) : viewMode === 'split' ? (
            /* ─── Split Screen View (Interactive Feed + In-depth Detail) ─── */
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,1.25fr)] xl:gap-8">
              {/* Left Column: Rich Vacancy Feed */}
              <div className="grid gap-3.5">
                {filteredJobs.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  const isApplied = appliedJobs.has(job.id);
                  const isSaved = savedJobs.has(job.id);

                  return (
                    <article
                      key={job.id}
                      onClick={() => setSelectedId(job.id)}
                      className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-green bg-gradient-to-r from-emerald-50/50 via-white to-white shadow-card ring-2 ring-green/20'
                          : 'border-line bg-white shadow-card hover:border-green/40 hover:shadow-md'
                      }`}
                    >
                      {/* Mini top image strip preview */}
                      <div className="relative h-20 w-full overflow-hidden bg-ink">
                        <img
                          src={job.companyCover}
                          alt={job.company}
                          className="size-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />

                        {/* Badges on image */}
                        <div className="absolute top-2.5 left-3 flex items-center gap-2">
                          <span className="rounded-full bg-ink/75 backdrop-blur-md px-2.5 py-0.5 text-[0.62rem] font-bold text-white border border-white/20">
                            {job.partnershipType}
                          </span>
                        </div>

                        <div className="absolute top-2.5 right-3 flex items-center gap-1.5">
                          <span className="rounded-full bg-lime text-ink px-2.5 py-0.5 text-[0.65rem] font-bold shadow-xs">
                            <i className="bx bxs-bolt text-xs mr-0.5" />
                            {job.utsMatch}% Match
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 sm:p-5">
                        {/* Company row */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className={`grid size-9 place-items-center rounded-xl text-xs font-black shadow-xs font-display ${job.companyLogoBg}`}>
                              {job.companyShort.slice(0, 3).toUpperCase()}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-display text-sm font-bold text-ink">
                                  {job.company}
                                </span>
                                <i className="bx bxs-badge-check text-green text-sm" title="Empresa Verificada UTS" />
                              </div>
                              <span className="text-[0.68rem] text-secondary">
                                {job.companySector}
                              </span>
                            </div>
                          </div>

                          {/* Quick bookmark */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSaveJob(job.id);
                            }}
                            className={`grid size-8 place-items-center rounded-full transition-colors ${
                              isSaved ? 'text-amber-500 bg-amber-50' : 'text-secondary hover:text-ink hover:bg-page'
                            }`}
                            title={isSaved ? 'Guardada' : 'Guardar vacante'}
                          >
                            <i className={`bx ${isSaved ? 'bxs-bookmark-star' : 'bx-bookmark'} text-lg`} />
                          </button>
                        </div>

                        {/* Title */}
                        <h2 className="m-0 mt-3 font-display text-base font-bold text-ink group-hover:text-green-dark transition-colors leading-snug">
                          {job.title}
                        </h2>

                        {/* Metrics Badges */}
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            <i className="bx bx-wallet text-sm" />
                            {job.salaryFormatted}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-full bg-panel border border-line px-2.5 py-1 text-xs font-semibold text-blue-muted">
                            <i className="bx bx-buildings text-sm" />
                            {job.mode}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-full bg-page border border-line-soft px-2.5 py-1 text-xs text-secondary">
                            <i className="bx bx-map-pin text-sm" />
                            {job.city}
                          </span>
                        </div>

                        {/* Key Stack chips */}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {job.stack.slice(0, 4).map((tech) => (
                            <span key={tech} className="rounded-md bg-page px-2 py-0.5 text-[0.68rem] font-semibold text-ink border border-line-soft">
                              {tech}
                            </span>
                          ))}
                          {job.stack.length > 4 && (
                            <span className="text-[0.68rem] font-semibold text-secondary self-center px-1">
                              +{job.stack.length - 4} más
                            </span>
                          )}
                        </div>

                        {/* Footer status */}
                        <div className="mt-4 pt-3 border-t border-line-soft flex items-center justify-between text-xs text-secondary">
                          <span className="inline-flex items-center gap-1">
                            <i className="bx bx-time text-sm" />
                            Quedan {job.daysRemaining} días
                          </span>

                          {isApplied ? (
                            <span className="inline-flex items-center gap-1 text-green font-bold text-xs bg-green/10 px-2.5 py-0.5 rounded-full">
                              <i className="bx bx-check" /> Postulado
                            </span>
                          ) : (
                            <span className="font-semibold text-blue-muted group-hover:text-green-dark flex items-center gap-0.5">
                              Ver detalles completos
                              <i className="bx bx-chevron-right text-base group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Right Column: In-depth Interactive Job Details Panel */}
              <div
                className="lg:sticky self-start"
                style={{ top: 'min(5rem, calc(100vh - 100% - 2rem))' }}
              >
                {selectedJob ? (
                  <article className="overflow-hidden rounded-2xl border border-line bg-white shadow-hero">
                    {/* Header Panorámico con Foto Real de la Empresa */}
                    <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-ink">
                      <img
                        src={selectedJob.companyCover}
                        alt={`Sede de ${selectedJob.company}`}
                        className="size-full object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />

                      {/* Header Overlays */}
                      <div className="absolute top-4 left-4 flex items-center gap-2">
                        <span className="rounded-full bg-ink/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-lime border border-white/20">
                          {selectedJob.partnershipType}
                        </span>
                        <span className="rounded-full bg-white/20 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-white">
                          Cód: {selectedJob.vacancyCode}
                        </span>
                      </div>

                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSaveJob(selectedJob.id)}
                          className={`rounded-full p-2 backdrop-blur-md border border-white/30 text-white transition-colors cursor-pointer ${
                            savedJobs.has(selectedJob.id) ? 'bg-amber-500 text-white border-amber-500' : 'bg-ink/60 hover:bg-white hover:text-ink'
                          }`}
                          title="Guardar vacante"
                        >
                          <i className={`bx ${savedJobs.has(selectedJob.id) ? 'bxs-bookmark-star' : 'bx-bookmark'} text-base`} />
                        </button>
                      </div>

                      {/* Company identity over banner bottom */}
                      <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3 text-white">
                        <div className="flex items-center gap-3.5">
                          <span className={`grid size-14 place-items-center rounded-2xl text-base font-black shadow-lg font-display border-2 border-white/30 ${selectedJob.companyLogoBg}`}>
                            {selectedJob.companyShort.slice(0, 3).toUpperCase()}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h2 className="m-0 font-display text-lg sm:text-xl font-bold leading-tight">
                                {selectedJob.company}
                              </h2>
                              <i className="bx bxs-badge-check text-lime text-base" title="Convenio Oficial Verificado" />
                            </div>
                            <p className="m-0 text-xs text-white/75 mt-0.5">
                              {selectedJob.companySector} · {selectedJob.companySize}
                            </p>
                          </div>
                        </div>

                        <div className="hidden sm:block text-right">
                          <span className="rounded-full bg-lime text-ink px-3 py-1 text-xs font-bold shadow-sm inline-flex items-center gap-1">
                            <i className="bx bxs-bolt text-sm" />
                            {selectedJob.utsMatch}% Match Perfil
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Title & Quick Actions */}
                    <div className="p-5 sm:p-6 border-b border-line-soft">
                      <h3 className="m-0 font-display text-xl sm:text-2xl font-bold text-ink leading-snug">
                        {selectedJob.title}
                      </h3>
                      <p className="m-0 mt-2 text-sm text-body-muted leading-relaxed">
                        {selectedJob.summary}
                      </p>

                      {/* Metadatos rápidos en línea */}
                      <div className="mt-3.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-page px-2.5 py-1 text-xs font-semibold text-secondary border border-line-soft">
                          <i className="bx bx-map-pin text-sm text-green-dark" />
                          {selectedJob.city} · {selectedJob.mode}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-page px-2.5 py-1 text-xs font-semibold text-secondary border border-line-soft">
                          <i className="bx bx-briefcase-alt text-sm text-green-dark" />
                          {selectedJob.contractType}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-page px-2.5 py-1 text-xs font-semibold text-secondary border border-line-soft">
                          <i className="bx bx-layer text-sm text-green-dark" />
                          {selectedJob.seniority}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-page px-2.5 py-1 text-xs font-semibold text-secondary border border-line-soft">
                          <i className="bx bx-time text-sm text-secondary" />
                          Publicada hace {selectedJob.postedTime}
                        </span>
                      </div>

                      {/* CTA Buttons */}
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setApplyModalJob(selectedJob)}
                          className={`flex-1 min-w-[12rem] inline-flex items-center justify-center gap-2 rounded-xl py-3 px-5 text-sm font-bold shadow-sm transition-all cursor-pointer ${
                            appliedJobs.has(selectedJob.id)
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-green hover:bg-green-dark text-white hover:shadow-md'
                          }`}
                        >
                          <i className={`bx ${appliedJobs.has(selectedJob.id) ? 'bx-check-circle' : 'bx-send'} text-lg`} />
                          {appliedJobs.has(selectedJob.id) ? 'Ya te postulaste a esta vacante' : 'Postularme con mi perfil UTS'}
                        </button>

                        <a
                          href={selectedJob.companyWebsite}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-page px-4 py-3 text-xs font-bold text-ink hover:bg-white hover:text-green-dark transition-colors no-underline"
                        >
                          <i className="bx bx-globe text-base text-secondary" />
                          Sitio web empresa
                        </a>
                      </div>
                    </div>

                    {/* Secondary Navigation Tabs within the Job */}
                    <div className="border-b border-line-soft bg-page/60 px-5 pt-1">
                      <nav className="flex gap-2 overflow-x-auto scrollbar-none" aria-label="Detalles de la vacante">
                        {[
                          { id: 'cargo', label: 'Detalles del Cargo', icon: 'bx-briefcase-alt-2' },
                          { id: 'match', label: `Afinidad UTS (${selectedJob.utsMatch}%)`, icon: 'bx-target-lock' },
                          { id: 'empresa', label: 'Empresa & Cultura', icon: 'bx-buildings' },
                          { id: 'proceso', label: 'Proceso de Selección', icon: 'bx-git-repo-forked' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setActiveDetailTab(t.id)}
                            className={`inline-flex items-center gap-1.5 border-b-2 px-3.5 py-3 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                              activeDetailTab === t.id
                                ? 'border-green text-green-dark bg-white'
                                : 'border-transparent text-secondary hover:text-ink'
                            }`}
                          >
                            <i className={`bx ${t.icon} text-base`} />
                            {t.label}
                          </button>
                        ))}
                      </nav>
                    </div>

                    {/* Tab Contents */}
                    <div className="p-5 sm:p-6 space-y-6">
                      {/* TAB 1: DETALLES DEL CARGO */}
                      {activeDetailTab === 'cargo' && (
                        <div className="space-y-6">
                          {/* Ficha Integral de Condiciones y Compensación */}
                          <div className="rounded-2xl border border-line bg-white shadow-2xs overflow-hidden">
                            {/* Bloque Superior: Compensación y Beneficios */}
                            <div className="p-5 sm:p-6 border-b border-line-soft bg-page/40">
                              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
                                <div>
                                  <span className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                                    <i className="bx bx-credit-card-front text-base text-green-dark" />
                                    Compensación mensual estimada
                                  </span>
                                  <div className="mt-1.5 flex items-baseline gap-2">
                                    <h4 className="m-0 font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                                      {selectedJob.salaryFormatted}
                                    </h4>
                                    <span className="text-xs font-medium text-secondary">/ mes bruto</span>
                                  </div>
                                </div>
                                <div className="self-start sm:self-auto">
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/70 border border-emerald-300/80 px-3 py-1 text-xs font-bold text-emerald-800">
                                    <i className="bx bx-check-circle text-sm" />
                                    Salario en moneda legal (COP)
                                  </span>
                                </div>
                              </div>

                              {selectedJob.salaryNotes && (
                                <div className="mt-3.5 pt-3 border-t border-line-soft/80 flex items-start gap-2 text-xs text-body-muted leading-relaxed">
                                  <i className="bx bx-shield-quarter text-green-dark text-base mt-0.5 shrink-0" />
                                  <span>{selectedJob.salaryNotes}</span>
                                </div>
                              )}
                            </div>

                            {/* Matriz de Especificaciones Operativas (3 Columnas con Divisores Sutiles) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line-soft bg-white">
                              {/* 1. Modalidad & Jornada */}
                              <div className="p-4 sm:p-5 flex flex-col justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 text-secondary">
                                    <i className="bx bx-buildings text-base text-ink" />
                                    <span className="text-xs font-semibold text-secondary">Modalidad y horario</span>
                                  </div>
                                  <p className="m-0 mt-2 font-display text-sm sm:text-base font-bold text-ink">
                                    {selectedJob.mode}
                                  </p>
                                </div>
                                <p className="m-0 text-xs text-body-muted leading-relaxed">
                                  {selectedJob.workSchedule}
                                </p>
                              </div>

                              {/* 2. Tipo de Contratación & Nivel */}
                              <div className="p-4 sm:p-5 flex flex-col justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 text-secondary">
                                    <i className="bx bx-id-card text-base text-ink" />
                                    <span className="text-xs font-semibold text-secondary">Tipo de vinculación</span>
                                  </div>
                                  <p className="m-0 mt-2 font-display text-sm sm:text-base font-bold text-ink">
                                    {selectedJob.contractType}
                                  </p>
                                </div>
                                <p className="m-0 text-xs text-body-muted leading-relaxed">
                                  Nivel {selectedJob.seniority}
                                </p>
                              </div>

                              {/* 3. Experiencia Requerida */}
                              <div className="p-4 sm:p-5 flex flex-col justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 text-secondary">
                                    <i className="bx bx-user-check text-base text-ink" />
                                    <span className="text-xs font-semibold text-secondary">Experiencia requerida</span>
                                  </div>
                                  <p className="m-0 mt-2 font-display text-sm sm:text-base font-bold text-ink">
                                    {selectedJob.experienceYears}
                                  </p>
                                </div>
                                <p className="m-0 text-xs text-body-muted leading-relaxed">
                                  {selectedJob.experienceEquivalence}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Misión & El Día a Día */}
                          <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
                            <h4 className="m-0 font-display text-sm font-bold text-ink flex items-center gap-2">
                              <i className="bx bx-compass text-green text-lg" />
                              Misión del cargo en {selectedJob.company}
                            </h4>
                            <p className="m-0 mt-2 text-xs sm:text-sm text-ink/80 leading-relaxed bg-page/80 p-3 rounded-xl border border-line-soft">
                              "{selectedJob.mission}"
                            </p>

                            <h4 className="m-0 mt-5 font-display text-sm font-bold text-ink flex items-center gap-2">
                              <i className="bx bx-check-circle text-green text-lg" />
                              ¿Qué harás en tu día a día?
                            </h4>
                            <ul className="m-0 mt-2.5 list-none p-0 space-y-2">
                              {selectedJob.whatYouWillDo.map((duty, idx) => (
                                <li key={idx} className="flex items-start gap-2.5 text-xs text-ink/85 leading-normal">
                                  <span className="size-1.5 rounded-full bg-green mt-1.5 shrink-0" />
                                  <span>{duty}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Tech Stack */}
                          <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
                            <h4 className="m-0 font-display text-sm font-bold text-ink flex items-center gap-2 mb-3">
                              <i className="bx bx-code-alt text-blue-600 text-lg" />
                              Herramientas y Tecnologías clave
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedJob.stack.map((t) => (
                                <span
                                  key={t}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-page px-3 py-1.5 text-xs font-semibold text-ink"
                                >
                                  <i className="bx bx-check text-green text-sm" />
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Requisitos Indispensables vs Deseables */}
                          <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
                            <h4 className="m-0 font-display text-sm font-bold text-ink flex items-center gap-2 mb-3">
                              <i className="bx bx-list-check text-purple-600 text-lg" />
                              Requisitos del perfil
                            </h4>

                            <div className="space-y-4">
                              <div>
                                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md inline-block mb-2">
                                  Requisitos Indispensables
                                </span>
                                <ul className="m-0 list-none p-0 space-y-1.5">
                                  {selectedJob.requirements.mandatory.map((req, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-ink/85">
                                      <i className="bx bx-check text-emerald-600 text-base shrink-0 mt-0.5" />
                                      <span>{req}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="pt-3 border-t border-line-soft">
                                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md inline-block mb-2">
                                  Deseables (Suman puntos a tu postulación)
                                </span>
                                <ul className="m-0 list-none p-0 space-y-1.5">
                                  {selectedJob.requirements.desirable.map((req, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-body-muted">
                                      <i className="bx bx-plus text-sky-600 text-sm shrink-0 mt-0.5" />
                                      <span>{req}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 2: AFINIDAD CON TU PERFIL UTS */}
                      {activeDetailTab === 'match' && (
                        <div className="space-y-5">
                          <div className="rounded-2xl border border-lime/40 bg-gradient-to-br from-lime/15 via-white to-white p-5 shadow-xs">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-green-dark">
                                  Algoritmo de Compatibilidad UTS
                                </span>
                                <h4 className="m-0 font-display text-xl font-bold text-ink mt-0.5">
                                  Tu afinidad es del {selectedJob.utsMatch}%
                                </h4>
                                <p className="m-0 text-xs text-body-muted mt-1">
                                  Calculado a partir de tu titulación, competencias curriculares y aspiraciones laborales.
                                </p>
                              </div>
                              <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-ink text-lime font-display font-black text-2xl shadow-sm">
                                {selectedJob.utsMatch}%
                              </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-line-soft space-y-2">
                              {selectedJob.utsMatchReasons.map((reason, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs font-medium text-ink/90">
                                  <i className="bx bxs-badge-check text-green text-base shrink-0 mt-0.5" />
                                  <span>{reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Recomendación personalizada */}
                          <div className="rounded-2xl border border-line bg-page p-4 text-xs leading-relaxed text-ink/80">
                            <strong className="block font-bold text-ink mb-1 flex items-center gap-1.5">
                              <i className="bx bx-bulb text-amber-500 text-base" />
                              Consejo para destacar tu postulación en {selectedJob.company}:
                            </strong>
                            Asegúrate de que en la sección de <strong>Habilidades</strong> de tu perfil tengas agregadas herramientas como{' '}
                            {selectedJob.stack.slice(0, 3).join(', ')}. Las empresas aliadas filtran primero los perfiles que cuentan con certificación curricular UTS.
                          </div>
                        </div>
                      )}

                      {/* TAB 3: SOBRE LA EMPRESA & BENEFICIOS */}
                      {activeDetailTab === 'empresa' && (
                        <div className="space-y-6">
                          <div>
                            <h4 className="m-0 font-display text-sm font-bold text-ink mb-2">
                              Acerca de {selectedJob.company}
                            </h4>
                            <p className="m-0 text-xs sm:text-sm text-body-muted leading-relaxed">
                              {selectedJob.companyAbout}
                            </p>
                          </div>

                          {/* Workplace Photo Gallery */}
                          <div>
                            <h4 className="m-0 font-display text-xs font-bold uppercase tracking-wider text-secondary mb-3">
                              Espacios de trabajo e instalaciones reales
                            </h4>
                            <div className="grid grid-cols-3 gap-2.5">
                              {selectedJob.workplacePhotos.map((photo, idx) => (
                                <div key={idx} className="relative h-24 overflow-hidden rounded-xl border border-line bg-ink">
                                  <img
                                    src={photo}
                                    alt={`Instalaciones ${selectedJob.company}`}
                                    className="size-full object-cover transition-transform hover:scale-110"
                                    loading="lazy"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Benefits Grid */}
                          <div>
                            <h4 className="m-0 font-display text-sm font-bold text-ink mb-3 flex items-center gap-2">
                              <i className="bx bx-gift text-amber-500 text-base" />
                              Paquete de Beneficios & Bienestar
                            </h4>
                            <div className="grid gap-2.5 sm:grid-cols-2">
                              {selectedJob.benefits.map((b) => (
                                <div key={b.title} className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`grid size-7 place-items-center rounded-lg text-sm ${b.color}`}>
                                      <i className={`bx ${b.icon}`} />
                                    </span>
                                    <span className="font-display text-xs font-bold text-ink">{b.title}</span>
                                  </div>
                                  <p className="m-0 text-[0.72rem] text-body-muted leading-relaxed">
                                    {b.desc}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 4: PROCESO DE SELECCIÓN */}
                      {activeDetailTab === 'proceso' && (
                        <div className="space-y-5">
                          <div>
                            <h4 className="m-0 font-display text-sm font-bold text-ink">
                              Etapas del Proceso de Selección
                            </h4>
                            <p className="m-0 text-xs text-body-muted mt-1">
                              Proceso 100% transparente y directo, coordinado a través del convenio de la Bolsa de Empleo UTS.
                            </p>
                          </div>

                          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
                            {selectedJob.hiringProcess.map((step) => (
                              <div key={step.step} className="relative">
                                <span className="absolute -left-6 top-0 grid size-5 place-items-center rounded-full bg-ink text-lime text-[0.65rem] font-bold">
                                  {step.step}
                                </span>
                                <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <h5 className="m-0 font-display text-xs sm:text-sm font-bold text-ink">
                                      {step.title}
                                    </h5>
                                    <span className="rounded-full bg-panel px-2.5 py-0.5 text-[0.62rem] font-bold text-secondary">
                                      {step.duration}
                                    </span>
                                  </div>
                                  <p className="m-0 mt-1 text-xs text-body-muted leading-relaxed">
                                    {step.desc}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                ) : (
                  <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center">
                    <p className="text-sm font-semibold text-ink">Selecciona una vacante para ver la ficha completa.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ─── Grid View (Card Showcase) ─── */
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map((job) => {
                const isApplied = appliedJobs.has(job.id);
                const isSaved = savedJobs.has(job.id);

                return (
                  <article
                    key={job.id}
                    className="group overflow-hidden rounded-2xl border border-line bg-white shadow-card hover:shadow-hero hover:border-green/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Panoramic Cover */}
                      <div className="relative h-40 w-full overflow-hidden bg-ink">
                        <img
                          src={job.companyCover}
                          alt={job.company}
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />

                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="rounded-full bg-ink/75 backdrop-blur-md px-2.5 py-0.5 text-[0.62rem] font-bold text-white border border-white/20">
                            {job.partnershipType}
                          </span>
                        </div>

                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          <span className="rounded-full bg-lime text-ink px-2.5 py-0.5 text-[0.65rem] font-bold shadow-xs">
                            {job.utsMatch}% Match
                          </span>
                        </div>

                        <div className="absolute bottom-3 left-4 flex items-center gap-2.5 text-white">
                          <span className={`grid size-10 place-items-center rounded-xl text-xs font-black shadow-lg font-display ${job.companyLogoBg}`}>
                            {job.companyShort.slice(0, 3).toUpperCase()}
                          </span>
                          <div>
                            <span className="font-display text-sm font-bold text-white block">
                              {job.company}
                            </span>
                            <span className="text-[0.65rem] text-white/70 block">
                              {job.city} · {job.mode}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-5">
                        <h3 className="m-0 font-display text-base font-bold text-ink group-hover:text-green-dark transition-colors line-clamp-2">
                          {job.title}
                        </h3>

                        <p className="m-0 mt-2 text-xs text-body-muted line-clamp-2 leading-relaxed">
                          {job.summary}
                        </p>

                        <div className="mt-4 pt-3 border-t border-line-soft flex items-center justify-between">
                          <span className="font-display text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            {job.salaryFormatted}
                          </span>
                          <span className="text-[0.7rem] text-secondary">
                            {job.contractType}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1">
                          {job.stack.slice(0, 3).map((s) => (
                            <span key={s} className="rounded-md bg-page px-2 py-0.5 text-[0.65rem] font-semibold text-ink border border-line-soft">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-5 pt-0">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(job.id);
                            setViewMode('split');
                          }}
                          className="flex-1 rounded-xl border border-line bg-page hover:bg-white hover:text-green-dark py-2.5 text-xs font-bold text-ink transition-colors cursor-pointer text-center"
                        >
                          Ver ficha completa
                        </button>
                        <button
                          type="button"
                          onClick={() => setApplyModalJob(job)}
                          className="rounded-xl bg-ink hover:bg-ink-soft py-2.5 px-3.5 text-xs font-bold text-white transition-colors cursor-pointer"
                          title="Postulación rápida"
                        >
                          <i className="bx bx-send text-sm" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ─── Interactive Quick Application Modal ─── */}
      {applyModalJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-hero animate-rise-in">
            <div className="flex items-start justify-between gap-3 border-b border-line-soft pb-4">
              <div className="flex items-center gap-3">
                <span className={`grid size-11 place-items-center rounded-xl text-xs font-bold font-display ${applyModalJob.companyLogoBg}`}>
                  {applyModalJob.companyShort.slice(0, 3).toUpperCase()}
                </span>
                <div>
                  <h3 className="m-0 font-display text-base font-bold text-ink">
                    Postularme a {applyModalJob.title}
                  </h3>
                  <p className="m-0 text-xs text-body-muted">{applyModalJob.company} · {applyModalJob.city}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApplyModalJob(null)}
                className="text-secondary hover:text-ink text-xl p-1 cursor-pointer"
              >
                <i className="bx bx-x" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs">
                <span className="font-bold text-emerald-900 block flex items-center gap-1.5 mb-1">
                  <i className="bx bxs-badge-check text-green text-sm" />
                  Convenio Institucional de Egresados UTS
                </span>
                Tu postulación se enviará directamente con tu perfil verificado de <strong>{profile.fullName}</strong> y tu código de egresado UTS.
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Mensaje o nota breve para el equipo de selección de {applyModalJob.company} (Opcional):
                </label>
                <textarea
                  rows={3}
                  value={applicationNote}
                  onChange={(e) => setApplicationNote(e.target.value)}
                  placeholder="Ej: Estimado equipo, me entusiasma esta oportunidad debido a mi formación en analítica y proyectos de desarrollo en las UTS..."
                  className="w-full rounded-xl border border-line p-3 text-xs text-ink outline-none focus:border-green"
                />
              </div>

              <div className="rounded-xl border border-line bg-page p-3 text-[0.72rem] text-body-muted flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <i className="bx bx-file text-base text-secondary" />
                  {profile.cvFile ? profile.cvFile.name : 'Hoja de Vida UTS (Perfil Digital)'}
                </span>
                <span className="text-emerald-700 font-bold">Adjunto</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line-soft pt-4">
              <button
                type="button"
                onClick={() => setApplyModalJob(null)}
                className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-secondary hover:text-ink cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                className="rounded-xl bg-green hover:bg-green-dark px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <i className="bx bx-send" />
                Confirmar y enviar postulación
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
