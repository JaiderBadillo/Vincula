import { useEffect, useState } from 'react';
import { phaseDefinitions } from '../../data/my-applications.js';
import { formatApplicationDate, formatInterviewDate, formatInterviewTime } from '../../utils/formatters.js';

export default function ApplicationDetailModal({ application, interview, onClose }) {
  const [retireConfirmation, setRetireConfirmation] = useState(false);
  const [retired, setRetired] = useState(false);

  // Close on Escape key and prevent background scroll
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  if (!application) return null;

  const currentPhaseNum = parseInt(application.phase, 10) || 1;

  const sectorColors = application.sector === 'public'
    ? {
        badge: 'bg-sky-50 text-sky-700 border-sky-200',
        dot: 'bg-sky-500',
        logoBg: 'bg-sky-100 text-sky-700 border-sky-200',
      }
    : {
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        logoBg: 'bg-amber-50 text-amber-700 border-amber-200',
      };

  const getModeBadge = (mode = '') => {
    if (mode.toLowerCase().includes('remot')) {
      return { label: 'Remoto 100%', icon: 'bx-wifi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (mode.toLowerCase().includes('presencial')) {
      return { label: 'Presencial', icon: 'bx-buildings', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
    return { label: 'Híbrido', icon: 'bx-transfer-alt', color: 'bg-purple-50 text-purple-700 border-purple-200' };
  };

  const modeBadge = getModeBadge(application.workMode || application.mode);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-vacancy-title"
    >
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-ink/65 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl transition-all">
        {/* Top Header */}
        <div className="relative border-b border-line-soft bg-gradient-to-r from-page via-white to-page px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span
                className={`grid size-14 shrink-0 place-items-center rounded-xl border font-display text-sm font-bold tracking-wide shadow-xs ${sectorColors.logoBg}`}
                aria-hidden="true"
              >
                {application.companyLogo}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide ${sectorColors.badge}`}>
                    <span className={`size-1.5 rounded-full ${sectorColors.dot}`} aria-hidden="true" />
                    {application.sectorLabel}
                  </span>
                  <span className="text-xs font-mono text-secondary">
                    {application.vacancyCode || application.id}
                  </span>
                </div>
                <h2
                  id="modal-vacancy-title"
                  className="font-display mt-1 text-lg font-bold leading-snug text-ink sm:text-2xl"
                >
                  {application.vacancyTitle}
                </h2>
                <p className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-body-muted sm:text-sm">
                  <span className="font-semibold text-ink/80">{application.companyName}</span>
                  <span className="text-secondary">·</span>
                  <span className="inline-flex items-center gap-1">
                    <i className="bx bx-map text-sm" aria-hidden="true" />
                    {application.location}
                  </span>
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-white text-secondary transition-colors hover:bg-panel hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green"
              onClick={onClose}
              aria-label="Cerrar detalles de la postulación"
            >
              <i className="bx bx-x text-2xl" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 space-y-6">

          {/* ─── Upcoming Interview Banner (if applicable) ─── */}
          {interview && (
            <div className="rounded-xl border border-green/30 bg-gradient-to-r from-green/10 via-lime/10 to-transparent p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-green text-xl text-white shadow-xs" aria-hidden="true">
                    <i className="bx bx-calendar-event" />
                  </span>
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green/20 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-green-dark">
                      <span className="size-1.5 animate-pulse rounded-full bg-green-dark" />
                      Entrevista Agendada
                    </span>
                    <h3 className="font-display mt-0.5 text-sm font-bold text-ink sm:text-base">
                      {formatInterviewDate(interview.interviewAt)} · {formatInterviewTime(interview.interviewAt)}
                    </h3>
                    <p className="mt-0.5 text-xs text-body-muted">
                      <strong>Modalidad:</strong> {interview.modality || 'Virtual'} · <strong>Con:</strong> {interview.interviewer || 'Equipo de selección'}
                    </p>
                    {interview.objective && (
                      <p className="mt-1 text-xs text-body-muted/90 italic">
                        "{interview.objective}"
                      </p>
                    )}
                  </div>
                </div>

                {interview.meetingUrl ? (
                  <a
                    href={interview.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-green px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-green-dark no-underline shrink-0"
                  >
                    Unirse a la reunión
                    <i className="bx bx-link-external text-sm" aria-hidden="true" />
                  </a>
                ) : (
                  <span className="rounded-lg bg-white/70 px-3 py-1.5 text-xs text-secondary border border-line/60">
                    Enlace disponible 15 min antes
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ─── Phase Tracker Pipeline ─── */}
          <div className="rounded-xl border border-line bg-page/40 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
              <div>
                <span className="text-[0.7rem] font-bold uppercase tracking-wider text-secondary">
                  Estado de tu postulación
                </span>
                <h4 className="font-display text-sm font-bold text-ink sm:text-base">
                  {application.phaseStatusLabel || `Fase ${application.phase}: En evaluación`}
                </h4>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-green/30 bg-green/10 px-3 py-1 text-xs font-bold text-green-dark">
                <span className="size-2 rounded-full bg-green animate-ping" />
                Fase {application.phase} de 4
              </span>
            </div>

            {/* Stepper bar */}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {phaseDefinitions.map((def) => {
                const stepNum = parseInt(def.number, 10);
                const isPassed = stepNum < currentPhaseNum;
                const isCurrent = stepNum === currentPhaseNum;

                return (
                  <div
                    key={def.number}
                    className={`flex flex-col rounded-xl border p-3 transition-colors ${
                      isCurrent
                        ? 'border-green bg-white shadow-sm ring-1 ring-green/20'
                        : isPassed
                        ? 'border-green/20 bg-green/5'
                        : 'border-line/60 bg-white/60 opacity-65'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[0.65rem] font-bold uppercase tracking-wider ${isCurrent ? 'text-green-dark' : isPassed ? 'text-green' : 'text-secondary'}`}>
                        Fase {def.number}
                      </span>
                      {isPassed && <i className="bx bxs-check-circle text-base text-green" aria-label="Completada" />}
                      {isCurrent && <span className="size-2 rounded-full bg-green animate-pulse" />}
                    </div>
                    <span className="font-display mt-1 text-xs font-semibold leading-tight text-ink line-clamp-1">
                      {def.name}
                    </span>
                    <span className="mt-1 text-[0.65rem] text-secondary line-clamp-2">
                      {def.shortDescription}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Recruiter feedback quote */}
            {application.phaseFeedback && (
              <div className="mt-3 rounded-lg border border-line-soft bg-white p-3 text-xs leading-relaxed text-body-muted">
                <i className="bx bx-chat mr-1.5 text-sm text-green align-text-bottom" aria-hidden="true" />
                <strong>Mensaje del equipo de selección:</strong> {application.phaseFeedback}
              </div>
            )}
          </div>

          {/* ─── Ficha Integral de Condiciones Laborales ─── */}
          <div>
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-secondary mb-3">
              Condiciones de la vacante
            </h3>
            <div className="rounded-2xl border border-line bg-white shadow-2xs overflow-hidden">
              {/* Bloque Superior: Compensación */}
              <div className="p-4 sm:p-5 border-b border-line-soft bg-page/40">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                      <i className="bx bx-credit-card-front text-base text-green-dark" />
                      Compensación mensual estimada
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <h4 className="m-0 font-display text-xl sm:text-2xl font-extrabold text-ink tracking-tight">
                        {application.salary || 'A convenir según experiencia'}
                      </h4>
                      <span className="text-xs font-medium text-secondary">/ mes bruto</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/70 border border-emerald-300/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800 self-start sm:self-auto">
                    <i className="bx bx-check-circle text-sm" />
                    Vinculación formal
                  </span>
                </div>
                {application.salaryNotes && (
                  <p className="m-0 mt-2.5 pt-2.5 border-t border-line-soft/80 text-xs text-body-muted flex items-start gap-1.5">
                    <i className="bx bx-shield-quarter text-green-dark text-sm mt-0.5 shrink-0" />
                    <span>{application.salaryNotes}</span>
                  </p>
                )}
              </div>

              {/* Matriz de Especificaciones: Modalidad, Experiencia, Contrato */}
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line-soft bg-white">
                {/* 1. Modalidad */}
                <div className="p-4 flex flex-col justify-between gap-1.5">
                  <div>
                    <div className="flex items-center gap-1.5 text-secondary">
                      <i className="bx bx-buildings text-base text-ink" />
                      <span className="text-xs font-semibold text-secondary">Modalidad de trabajo</span>
                    </div>
                    <div className="mt-1.5 font-display text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                      <span>{application.workMode || 'Modalidad estándar'}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[0.62rem] font-bold uppercase ${modeBadge.color}`}>
                        {modeBadge.label}
                      </span>
                    </div>
                  </div>
                  <p className="m-0 text-xs text-body-muted leading-relaxed">
                    {application.workModeDetail || application.location}
                  </p>
                </div>

                {/* 2. Contrato y Horario */}
                <div className="p-4 flex flex-col justify-between gap-1.5">
                  <div>
                    <div className="flex items-center gap-1.5 text-secondary">
                      <i className="bx bx-id-card text-base text-ink" />
                      <span className="text-xs font-semibold text-secondary">Tipo de vinculación</span>
                    </div>
                    <p className="m-0 mt-1.5 font-display text-sm sm:text-base font-bold text-ink">
                      {application.contractType || 'Término indefinido'}
                    </p>
                  </div>
                  <p className="m-0 text-xs text-body-muted leading-relaxed">
                    {application.workSchedule || 'Lunes a Viernes · Jornada completa'}
                  </p>
                </div>

                {/* 3. Experiencia */}
                <div className="p-4 flex flex-col justify-between gap-1.5">
                  <div>
                    <div className="flex items-center gap-1.5 text-secondary">
                      <i className="bx bx-user-check text-base text-ink" />
                      <span className="text-xs font-semibold text-secondary">Experiencia requerida</span>
                    </div>
                    <p className="m-0 mt-1.5 font-display text-sm sm:text-base font-bold text-ink">
                      {application.experienceLevel || 'Primer empleo / Recién egresados'}
                    </p>
                  </div>
                  <p className="m-0 text-xs text-body-muted leading-relaxed">
                    {application.experienceDetail || 'Se valora formación técnica y proyectos de grado de las UTS.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Responsabilidades: ¿Qué hará dentro de la empresa? ─── */}
          <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-2 text-ink mb-3">
              <span className="grid size-7 place-items-center rounded-lg bg-green/10 text-green-dark text-base" aria-hidden="true">
                <i className="bx bx-task" />
              </span>
              <h3 className="font-display text-base font-bold text-ink">
                ¿Qué harás dentro de la empresa?
              </h3>
            </div>
            {application.detail && (
              <p className="text-xs leading-relaxed text-body-muted sm:text-sm mb-3">
                {application.detail}
              </p>
            )}

            {Array.isArray(application.responsibilities) && application.responsibilities.length > 0 ? (
              <ul className="space-y-2.5 pl-0 list-none m-0">
                {application.responsibilities.map((task, index) => (
                  <li key={index} className="flex items-start gap-2.5 text-xs text-ink/90 sm:text-sm">
                    <i className="bx bx-check-circle text-green text-base mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-body-muted">{application.description}</p>
            )}
          </div>

          {/* ─── Perfil y Requisitos ─── */}
          <div className="rounded-xl border border-line bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-ink">
              <span className="grid size-7 place-items-center rounded-lg bg-sky-50 text-sky-700 text-base" aria-hidden="true">
                <i className="bx bx-check-shield" />
              </span>
              <h3 className="font-display text-base font-bold text-ink">
                Requisitos y competencias solicitadas
              </h3>
            </div>

            <div>
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-secondary block mb-1">
                Nivel académico
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink">
                <i className="bx bx-graduation text-sm text-green" aria-hidden="true" />
                {application.studyLevel || 'Tecnólogo o Profesional'}
              </span>
            </div>

            {Array.isArray(application.requirements) && application.requirements.length > 0 && (
              <ul className="space-y-2 pl-0 list-none m-0">
                {application.requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-body-muted sm:text-sm">
                    <span className="size-1.5 rounded-full bg-secondary mt-2 shrink-0" aria-hidden="true" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Skills Badges */}
            {Array.isArray(application.skills) && application.skills.length > 0 && (
              <div>
                <span className="text-[0.7rem] font-bold uppercase tracking-wider text-secondary block mb-2">
                  Herramientas y habilidades clave
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {application.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="rounded-full border border-line bg-page px-3 py-1 text-xs font-semibold text-ink/80 transition-colors hover:border-green/40 hover:bg-green/5"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── Beneficios Ofrecidos ─── */}
          {Array.isArray(application.benefits) && application.benefits.length > 0 && (
            <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
              <div className="flex items-center gap-2 text-ink mb-3">
                <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-700 text-base" aria-hidden="true">
                  <i className="bx bx-gift" />
                </span>
                <h3 className="font-display text-base font-bold text-ink">
                  Beneficios y compensaciones adicionales
                </h3>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {application.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-2 rounded-lg border border-line-soft bg-page/50 p-2.5 text-xs text-body-muted">
                    <i className="bx bx-star text-amber-500 text-sm mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Datos de la postulación (Documentos y Reclutador) ─── */}
          <div className="rounded-xl border border-line bg-page/60 p-4 sm:p-5">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-secondary mb-3">
              Datos del registro de postulación
            </h3>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              {/* Documento adjunto */}
              <div className="rounded-lg border border-line bg-white p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600 text-lg" aria-hidden="true">
                    <i className="bx bxs-file-pdf" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate m-0">
                      {application.submittedDocument?.fileName || 'Hoja_de_Vida_UTS.pdf'}
                    </p>
                    <span className="text-[0.68rem] text-secondary">
                      {application.submittedDocument?.fileSize || '320 KB'} · Postulado el {formatApplicationDate(application.appliedAt)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-line p-1.5 text-secondary hover:bg-panel hover:text-ink"
                  title="Descargar copia del CV enviado"
                  onClick={() => alert(`Descargando copia de: ${application.submittedDocument?.fileName || 'Hoja_de_Vida.pdf'}`)}
                >
                  <i className="bx bx-download text-base" aria-hidden="true" />
                </button>
              </div>

              {/* Reclutador asignado */}
              <div className="rounded-lg border border-line bg-white p-3 flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-panel text-sm font-bold text-green-dark" aria-hidden="true">
                  {application.recruiter?.name ? application.recruiter.name.split(' ').map(w => w[0]).join('').slice(0, 2) : 'RH'}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-ink truncate m-0">
                    {application.recruiter?.name || 'Comité de Selección'}
                  </p>
                  <span className="text-[0.68rem] text-secondary block truncate">
                    {application.recruiter?.role || 'Atracción de Talento'}
                  </span>
                  {application.recruiter?.email && (
                    <span className="text-[0.68rem] text-green-dark hover:underline block truncate">
                      {application.recruiter.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Retiro de postulación modal alert */}
          {retired ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
              <i className="bx bx-info-circle mr-1" aria-hidden="true" />
              Has retirado tu postulación a esta vacante. El equipo de selección ha sido notificado.
            </div>
          ) : retireConfirmation ? (
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 text-xs">
              <p className="font-bold text-red-800 m-0 mb-1">¿Estás seguro de que deseas retirar tu postulación?</p>
              <p className="text-red-700 m-0 mb-3">Si te retiras, tu perfil saldrá del proceso de selección actual y no podrás recuperar tu turno en esta convocatoria.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white hover:bg-red-700"
                  onClick={() => {
                    setRetired(true);
                    setRetireConfirmation(false);
                  }}
                >
                  Sí, retirar postulación
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-line bg-white px-3 py-1.5 font-semibold text-ink hover:bg-panel"
                  onClick={() => setRetireConfirmation(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}

        </div>

        {/* Modal Footer Controls */}
        <div className="border-t border-line-soft bg-page/80 px-6 py-4 sm:px-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!retired && !retireConfirmation && (
              <button
                type="button"
                className="text-xs font-semibold text-secondary hover:text-red-600 transition-colors"
                onClick={() => setRetireConfirmation(true)}
              >
                Retirar mi postulación
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-xl border border-line bg-white px-5 py-2.5 font-display text-xs sm:text-sm font-semibold text-ink shadow-2xs hover:bg-panel transition-colors"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
