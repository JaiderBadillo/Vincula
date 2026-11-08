import { useEffect, useState } from 'react';

export default function GridVacancyDetailModal({
  job,
  isOpen,
  onClose,
  onApply,
  isApplied = false,
  isSaved = false,
  onToggleSave,
  allJobs = [],
  onSelectJob,
}) {
  const [activeTab, setActiveTab] = useState('cargo'); // 'cargo' | 'match' | 'empresa' | 'proceso'
  const [copiedLink, setCopiedLink] = useState(false);

  // Cerrar con Escape, navegación con flechas y bloqueo de scroll
  useEffect(() => {
    if (!isOpen || !job) return undefined;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        onSelectJob(prevJob);
      } else if (e.key === 'ArrowRight' && hasNext) {
        onSelectJob(nextJob);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, job, allJobs]);

  if (!isOpen || !job) return null;

  const currentIndex = allJobs.findIndex((j) => j.id === job.id);
  const total = allJobs.length;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < total - 1;
  const prevJob = hasPrev ? allJobs[currentIndex - 1] : null;
  const nextJob = hasNext ? allJobs[currentIndex + 1] : null;

  function handleCopyShare() {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-ink/75 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grid-detail-job-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-5xl h-[92vh] max-h-[92vh] rounded-3xl border border-line bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* ─── Botones Superiores Flotantes Siempre Visibles ─── */}
        <div className="absolute top-3.5 right-4 z-40 flex items-center gap-2">
          {/* Botón Guardar / Favorito */}
          <button
            type="button"
            onClick={() => onToggleSave(job.id)}
            className={`grid size-9 place-items-center rounded-xl backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-md ${
              isSaved
                ? 'bg-amber-500 text-white border-amber-400'
                : 'bg-ink/65 text-white hover:bg-white hover:text-ink'
            }`}
            title={isSaved ? 'Quitar de guardados' : 'Guardar vacante'}
          >
            <i className={`bx ${isSaved ? 'bxs-bookmark-star' : 'bx-bookmark'} text-base`} />
          </button>

          {/* Botón Compartir */}
          <button
            type="button"
            onClick={handleCopyShare}
            className="grid size-9 place-items-center rounded-xl bg-ink/65 backdrop-blur-md border border-white/20 text-white hover:bg-white hover:text-ink transition-all cursor-pointer shadow-md"
            title="Copiar enlace de la vacante"
          >
            <i className={`bx ${copiedLink ? 'bx-check text-lime' : 'bx-share-alt'} text-base`} />
          </button>

          {/* Botón Cerrar */}
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl bg-ink/70 backdrop-blur-md border border-white/25 text-white hover:bg-white hover:text-ink transition-all cursor-pointer shadow-md"
            title="Cerrar ficha (Esc)"
          >
            <i className="bx bx-x text-2xl" />
          </button>
        </div>

        {/* ─── CONTENEDOR PRINCIPAL SCROLLABLE (Todo el contenido y cabecera fluyen juntos) ─── */}
        <div className="flex-1 overflow-y-auto min-h-0 scroll-smooth">
          
          {/* 1. Header Fotográfico Inmersivo */}
          <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-ink select-none shrink-0">
            <img
              src={job.companyCover}
              alt={job.company}
              className="size-full object-cover opacity-60 transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/20" />

            {/* Badges superiores flotantes a la izquierda */}
            <div className="absolute top-4 left-5 flex flex-wrap items-center gap-2 pr-32">
              <span className="rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/25 shadow-xs">
                {job.partnershipType}
              </span>
              <span className="rounded-full bg-ink/70 backdrop-blur-md px-2.5 py-1 text-[0.7rem] font-semibold text-white/80 border border-white/15">
                Cód: {job.vacancyCode}
              </span>
            </div>

            {/* Identidad de la empresa y título */}
            <div className="absolute bottom-4 left-5 right-5 sm:right-32 flex items-end justify-between gap-4 text-white">
              <div className="flex items-center gap-3.5 min-w-0">
                <span
                  className={`grid size-12 sm:size-14 shrink-0 place-items-center rounded-2xl text-sm sm:text-base font-black shadow-xl font-display border-2 border-white/30 ${job.companyLogoBg}`}
                >
                  {job.companyShort.slice(0, 3).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="m-0 font-display text-base sm:text-lg font-bold leading-tight truncate">
                      {job.company}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold text-lime bg-lime/15 border border-lime/30 px-2 py-0.5 rounded-full">
                      <i className="bx bxs-badge-check" />
                      Convenio Institucional Activo
                    </span>
                  </div>
                  <h2
                    id="grid-detail-job-title"
                    className="m-0 mt-0.5 font-display text-lg sm:text-2xl font-extrabold text-white leading-snug drop-shadow-sm truncate"
                  >
                    {job.title}
                  </h2>
                </div>
              </div>

              {/* Match Pill */}
              <div className="hidden sm:flex flex-col items-end shrink-0">
                <span className="rounded-full bg-lime text-ink px-3 py-1 text-xs font-extrabold shadow-md inline-flex items-center gap-1.5 border border-white/30">
                  <i className="bx bxs-bolt text-sm" />
                  {job.utsMatch}% Match Perfil
                </span>
              </div>
            </div>
          </div>

          {/* 2. Franja Rápida de Condiciones (Pills) */}
          <div className="border-b border-line bg-page/50 px-5 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1 font-display text-xs font-bold text-emerald-800 border border-emerald-200">
                <i className="bx bx-credit-card-front text-sm text-green-dark" />
                {job.salaryFormatted}
              </span>

              <span className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 font-semibold text-ink border border-line shadow-2xs">
                <i className="bx bx-map-pin text-sm text-green-dark" />
                {job.city} · {job.mode}
              </span>

              <span className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 font-semibold text-ink border border-line shadow-2xs">
                <i className="bx bx-briefcase text-sm text-green-dark" />
                {job.contractType}
              </span>

              <span className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 font-semibold text-ink border border-line shadow-2xs">
                <i className="bx bx-layer text-sm text-green-dark" />
                {job.seniority}
              </span>
            </div>

            <span className="text-[0.72rem] text-secondary flex items-center gap-1">
              <i className="bx bx-time text-sm" />
              Cierra en <strong>{job.daysRemaining} días</strong> ({job.applicantsCount} postulados)
            </span>
          </div>

          {/* 3. Barra de Pestañas de Navegación - STICKY AL HACER SCROLL */}
          <div className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-md px-5 sm:px-8 shadow-2xs">
            <nav className="flex gap-2 overflow-x-auto scrollbar-none" aria-label="Detalles de la vacante">
              {[
                { id: 'cargo', label: 'Cargo & Requisitos', icon: 'bx-briefcase-alt-2' },
                { id: 'match', label: `Afinidad Curricular (${job.utsMatch}%)`, icon: 'bx-target-lock' },
                { id: 'empresa', label: 'Empresa & Beneficios', icon: 'bx-buildings' },
                { id: 'proceso', label: 'Fases de Selección', icon: 'bx-git-repo-forked' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`inline-flex items-center gap-1.5 border-b-2 px-3.5 py-3 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === t.id
                      ? 'border-green text-green-dark bg-page/40 rounded-t-lg'
                      : 'border-transparent text-secondary hover:text-ink'
                  }`}
                >
                  <i className={`bx ${t.icon} text-base`} />
                  <span>{t.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* 4. Cuerpo de Lectura Amplio y Confortable */}
          <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-6">
            
            {/* TAB 1: CARGO Y REQUISITOS */}
            {activeTab === 'cargo' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Resumen & Misión */}
                <div className="rounded-2xl border border-line bg-page/40 p-5 sm:p-6 space-y-3">
                  <h4 className="m-0 font-display text-xs font-bold uppercase tracking-wider text-secondary">
                    Propósito del Cargo
                  </h4>
                  <p className="m-0 text-sm sm:text-base text-ink leading-relaxed font-medium">
                    {job.summary}
                  </p>
                  {job.mission && (
                    <p className="m-0 text-xs sm:text-sm text-body-muted leading-relaxed pt-3 border-t border-line-soft">
                      <strong className="text-ink">Misión del puesto:</strong> {job.mission}
                    </p>
                  )}
                </div>

                {/* Lo que harás día a día */}
                {job.whatYouWillDo && job.whatYouWillDo.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="m-0 font-display text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                      <i className="bx bx-check-square text-green-dark text-lg" />
                      Responsabilidades y Entregables Clave
                    </h4>
                    <ul className="m-0 list-none p-0 space-y-2.5">
                      {job.whatYouWillDo.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-xs sm:text-sm text-ink leading-relaxed rounded-xl border border-line-soft bg-white p-3.5 shadow-2xs hover:border-green/30 transition-colors"
                        >
                          <i className="bx bx-chevron-right text-lg text-green-dark shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Requisitos Indispensables vs Deseables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 space-y-3 shadow-2xs">
                    <h4 className="m-0 font-display text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <i className="bx bx-check-shield text-base text-emerald-600" />
                      Requisitos Indispensables
                    </h4>
                    <ul className="m-0 list-none p-0 space-y-2.5">
                      {job.requirements.mandatory.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-ink leading-relaxed">
                          <i className="bx bx-check text-emerald-600 text-lg shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-line bg-page/50 p-5 sm:p-6 space-y-3">
                    <h4 className="m-0 font-display text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                      <i className="bx bx-star text-base text-amber-500" />
                      Requisitos Deseables (Plus)
                    </h4>
                    <ul className="m-0 list-none p-0 space-y-2.5">
                      {job.requirements.desirable.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-secondary leading-relaxed">
                          <i className="bx bx-plus text-secondary text-base shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Stack Tecnológico */}
                <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 space-y-3 shadow-2xs">
                  <h4 className="m-0 font-display text-xs font-bold uppercase tracking-wider text-secondary">
                    Tecnologías, Herramientas y Metodologías
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {job.stack.map((tech) => (
                      <span
                        key={tech}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-page px-3.5 py-2 text-xs font-semibold text-ink shadow-2xs"
                      >
                        <i className="bx bx-code-alt text-green-dark text-sm" />
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Condiciones y Convalidación UTS */}
                <div className="rounded-2xl border border-line-soft bg-page/40 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[0.68rem] text-secondary font-bold uppercase block">Jornada y Horario</span>
                    <span className="font-semibold text-ink mt-0.5 block">{job.workSchedule}</span>
                  </div>
                  <div>
                    <span className="text-[0.68rem] text-secondary font-bold uppercase block">Experiencia previa</span>
                    <span className="font-semibold text-ink mt-0.5 block">{job.experienceYears}</span>
                  </div>
                  <div>
                    <span className="text-[0.68rem] text-secondary font-bold uppercase block">Convalidación Académica</span>
                    <span className="font-semibold text-ink mt-0.5 block">{job.experienceEquivalence}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: AFINIDAD UTS (MATCH CURRICULAR) */}
            {activeTab === 'match' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="rounded-2xl border border-lime/40 bg-lime/10 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
                  <div className="grid size-24 shrink-0 place-items-center rounded-2xl bg-ink text-white font-display text-3xl font-black shadow-lg border-2 border-lime">
                    <span>{job.utsMatch}%</span>
                  </div>
                  <div className="space-y-2 text-center sm:text-left">
                    <h4 className="m-0 font-display text-lg font-bold text-ink">
                      Compatibilidad Alta con tu Perfil Académico
                    </h4>
                    <p className="m-0 text-xs sm:text-sm text-body-muted leading-relaxed max-w-xl">
                      Este cargo fue validado con el plan de estudios y competencias técnicas institucionales. Tu perfil cumple con los criterios solicitados por {job.company}.
                    </p>
                  </div>
                </div>

                {/* Razones del Match */}
                <div className="space-y-3">
                  <h4 className="m-0 font-display text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                    <i className="bx bx-target-lock text-green-dark text-lg" />
                    Factores de Coincidencia Analizados
                  </h4>
                  <div className="space-y-3">
                    {(job.utsMatchReasons || []).map((reason, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-line bg-white p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-800 text-sm font-bold">
                          {idx + 1}
                        </span>
                        <p className="m-0 text-xs sm:text-sm text-ink leading-relaxed font-medium">
                          {reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Competencias Coincidentes & Brechas */}
                {Array.isArray(job.skillsMatch) && job.skillsMatch.length > 0 && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
                    <h5 className="m-0 text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                      <i className="bx bx-check-circle text-emerald-700 text-base" />
                      Competencias Validadas en tu Perfil ({job.skillsMatch.length})
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {job.skillsMatch.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-2xs"
                        >
                          <i className="bx bx-check text-emerald-600 text-sm" />
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(job.missingSkills) && job.missingSkills.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 space-y-3">
                    <h5 className="m-0 text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                      <i className="bx bx-trending-up text-amber-700 text-base" />
                      Habilidades Recomendadas a Fortalecer ({job.missingSkills.length})
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {job.missingSkills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-2xs"
                        >
                          <i className="bx bx-plus text-amber-600 text-sm" />
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Garantías del Convenio UTS */}
                <div className="rounded-2xl border border-line bg-page/60 p-5 sm:p-6 space-y-2 text-xs sm:text-sm">
                  <h5 className="m-0 font-display text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                    <i className="bx bxs-shield-check text-green-dark text-base" />
                    Garantías de la Alianza Institucional
                  </h5>
                  <p className="m-0 text-body-muted leading-relaxed">
                    Las postulaciones canalizadas a través de la plataforma institucional reciben revisión preferente por la coordinación de talento humano de <strong>{job.company}</strong>, con verificación automática de títulos y expedientes académicos.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: EMPRESA, BENEFICIOS Y CULTURA */}
            {activeTab === 'empresa' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Acerca de la Empresa */}
                <div className="rounded-2xl border border-line bg-white p-6 sm:p-7 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
                    <div>
                      <h4 className="m-0 font-display text-lg sm:text-xl font-bold text-ink">
                        {job.company}
                      </h4>
                      <p className="m-0 text-xs sm:text-sm text-secondary mt-0.5">
                        {job.companySector} · {job.companySize}
                      </p>
                    </div>
                    <a
                      href={job.companyWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-page px-3.5 py-2 text-xs font-semibold text-ink hover:text-green-dark hover:border-green transition-colors no-underline self-start sm:self-auto"
                    >
                      <i className="bx bx-globe text-base text-secondary" />
                      <span>Sitio Web Oficial</span>
                    </a>
                  </div>

                  <p className="m-0 text-xs sm:text-sm text-body-muted leading-relaxed">
                    {job.companyAbout}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="rounded-xl border border-line-soft bg-page/40 p-3.5">
                      <span className="text-[0.68rem] text-secondary font-bold uppercase block">Trayectoria</span>
                      <span className="font-semibold text-ink mt-0.5 block">{job.companyFounded}</span>
                    </div>
                    <div className="rounded-xl border border-line-soft bg-page/40 p-3.5">
                      <span className="text-[0.68rem] text-secondary font-bold uppercase block">Convenio Institucional</span>
                      <span className="font-semibold text-green-dark mt-0.5 block">{job.partnershipType}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1 rounded-xl border border-line-soft bg-page/40 p-3.5">
                      <span className="text-[0.68rem] text-secondary font-bold uppercase block">Vacantes Abiertas</span>
                      <span className="font-semibold text-ink mt-0.5 block">{job.openSpots} plazas disponibles</span>
                    </div>
                  </div>
                </div>

                {/* Fotos del entorno de trabajo */}
                {job.workplacePhotos && job.workplacePhotos.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="m-0 font-display text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                      <i className="bx bx-image text-green-dark text-lg" />
                      Instalaciones y Entorno de Trabajo
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {job.workplacePhotos.map((photo, idx) => (
                        <div key={idx} className="relative h-28 sm:h-40 overflow-hidden rounded-2xl border border-line">
                          <img
                            src={photo}
                            alt={`${job.company} sede ${idx + 1}`}
                            className="size-full object-cover hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Paquete de Beneficios Corporativos */}
                {job.benefits && job.benefits.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="m-0 font-display text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                      <i className="bx bx-gift text-green-dark text-lg" />
                      Beneficios Corporativos Destacados
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {job.benefits.map((b, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-line bg-white p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs"
                        >
                          <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-xl ${b.color}`}>
                            <i className={`bx ${b.icon}`} />
                          </span>
                          <div>
                            <h5 className="m-0 text-xs sm:text-sm font-bold text-ink">
                              {b.title}
                            </h5>
                            <p className="m-0 mt-1 text-xs text-secondary leading-relaxed">
                              {b.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PROCESO DE SELECCIÓN */}
            {activeTab === 'proceso' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="rounded-2xl border border-line bg-page/40 p-5 sm:p-6 space-y-2">
                  <h4 className="m-0 font-display text-sm sm:text-base font-bold text-ink">
                    Ruta de Selección y Tiempos Estimados
                  </h4>
                  <p className="m-0 text-xs sm:text-sm text-body-muted leading-relaxed">
                    Conoce con total claridad cada fase del proceso de reclutamiento antes de enviar tu hoja de vida.
                  </p>
                </div>

                <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
                  {job.hiringProcess.map((step) => (
                    <div key={step.step} className="relative">
                      <span className="absolute -left-6 top-0 grid size-6 -translate-x-1/2 place-items-center rounded-full bg-green-dark text-[0.7rem] font-bold text-white shadow-xs">
                        {step.step}
                      </span>
                      <div className="rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-2xs space-y-1.5 ml-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h5 className="m-0 font-display text-sm font-bold text-ink">
                            {step.title}
                          </h5>
                          <span className="rounded-full bg-page px-2.5 py-0.5 text-[0.68rem] font-bold text-secondary border border-line">
                            {step.duration}
                          </span>
                        </div>
                        <p className="m-0 text-xs sm:text-sm text-body-muted leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ─── 5. Barra Inferior de Acción (Sticky Footer Compacto) ─── */}
        <div className="border-t border-line bg-white py-3 px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Navegación entre vacantes */}
          <div className="flex items-center gap-2 text-xs text-secondary self-start sm:self-auto">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={() => onSelectJob(prevJob)}
              className="inline-flex items-center gap-1 rounded-xl border border-line bg-page px-3 py-1.5 font-semibold text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors cursor-pointer"
              title="Vacante anterior (Flecha izquierda)"
            >
              <i className="bx bx-chevron-left text-base" />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            <span className="font-semibold text-ink text-[0.75rem] px-1">
              {currentIndex + 1} de {total}
            </span>

            <button
              type="button"
              disabled={!hasNext}
              onClick={() => onSelectJob(nextJob)}
              className="inline-flex items-center gap-1 rounded-xl border border-line bg-page px-3 py-1.5 font-semibold text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors cursor-pointer"
              title="Siguiente vacante (Flecha derecha)"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <i className="bx bx-chevron-right text-base" />
            </button>
          </div>

          {/* Botones de acción principal */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line bg-page px-4 py-2 text-xs font-semibold text-secondary hover:text-ink hover:bg-page/70 transition-colors cursor-pointer"
            >
              Volver a la cuadrícula
            </button>

            <button
              type="button"
              onClick={() => onApply(job)}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-6 text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer ${
                isApplied
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-green hover:bg-green-dark text-white hover:shadow-md'
              }`}
            >
              <i className={`bx ${isApplied ? 'bx-check-circle' : 'bx-send'} text-base`} />
              <span>{isApplied ? 'Ya te has postulado' : 'Postularme a esta vacante'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
