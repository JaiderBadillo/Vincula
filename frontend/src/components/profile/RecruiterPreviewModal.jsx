import { useEffect, useState } from 'react';
import { getInitials } from '../../hooks/useProfile.js';
import { skillLevels } from '../../data/profile.js';
import { formatApplicationDate } from '../../utils/formatters.js';
import SoftSkillsRadarChart from './SoftSkillsRadarChart.jsx';

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const typeLabels = {
  work: { label: 'Experiencia laboral', icon: 'bx-briefcase-alt-2', cls: 'bg-ink text-lime' },
  practice: { label: 'Práctica empresarial', icon: 'bx-rocket', cls: 'bg-[#051F26]/10 text-[#051F26]' },
};

function formatMonth(value) {
  if (!value) return '';
  const [y, m] = value.split('-');
  return new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(+y, +m - 1, 1)));
}

export default function RecruiterPreviewModal({ profile, onClose }) {
  // 'applicant': empresa donde ya te postulaste (acceso a contacto y CV)
  // 'directory': empresa buscando en el banco general de talento UTS
  const [perspective, setPerspective] = useState('applicant');
  const [contactFeedback, setContactFeedback] = useState('');

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const primaryCv = profile.cvs?.find((c) => c.primary) || profile.cvs?.[0] || null;
  const prefs = profile.preferences || {};
  const privacy = profile.privacy || {};
  const links = profile.links || {};

  // Determinar visibilidad de contacto según la perspectiva y configuración
  const canSeeContact =
    privacy.showContact === 'all' ||
    (privacy.showContact === 'applications' && perspective === 'applicant');

  const showOpenToWork =
    profile.openToWork &&
    (profile.openToWorkVisibility === 'all' || profile.openToWorkVisibility === 'recruiters');

  function handleSimulateAction(actionName) {
    setContactFeedback(`Acción simulada: El reclutador ejecutó "${actionName}".`);
    setTimeout(() => setContactFeedback(''), 4000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recruiter-preview-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Preview Container */}
      <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-page shadow-hero">
        
        {/* ─── Top Control Header (Perspective Bar) ─── */}
        <div className="relative z-10 border-b border-line bg-ink px-5 py-3.5 text-white sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-lime/20 text-xl text-lime" aria-hidden="true">
                <i className="bx bx-show" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-lime">
                    Simulador de vista de reclutador
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] font-medium text-white/70">
                    Solo lectura
                  </span>
                </div>
                <h2 id="recruiter-preview-title" className="m-0 font-display text-sm font-bold sm:text-base">
                  Así ven tu perfil las empresas de la red institucional
                </h2>
              </div>
            </div>

            {/* Perspective Switcher + Close */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-white/15 bg-white/5 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPerspective('applicant')}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                    perspective === 'applicant'
                      ? 'bg-lime text-ink font-bold shadow-xs'
                      : 'text-white/70 hover:text-white'
                  }`}
                  title="Simula la vista de una empresa donde te postulaste a una vacante"
                >
                  Empresa donde te postulaste
                </button>
                <button
                  type="button"
                  onClick={() => setPerspective('directory')}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                    perspective === 'directory'
                      ? 'bg-lime text-ink font-bold shadow-xs'
                      : 'text-white/70 hover:text-white'
                  }`}
                  title="Simula la vista de una empresa que busca en el banco general de talento"
                >
                  Banco general de talento
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="grid size-8 place-items-center rounded-lg border border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Cerrar vista previa"
                title="Volver a modo edición"
              >
                <i className="bx bx-x text-xl" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Banner notification on simulation feedback */}
          {contactFeedback && (
            <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-lime/20 px-3 py-1.5 text-xs font-semibold text-lime">
              <i className="bx bx-check-circle" aria-hidden="true" />
              {contactFeedback}
            </div>
          )}
        </div>

        {/* ─── Scrollable Recruiter View Canvas ─── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">

          {/* 1. Candidate Hero Header */}
          <div className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            {/* Cover */}
            <div className="relative h-36 sm:h-44 bg-gradient-to-r from-ink via-blue-muted to-ink">
              <img
                src={profile.cover || '/images/profile/cover-office.jpg'}
                alt=""
                className="size-full object-cover object-center opacity-45"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              
              <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 px-3 py-1 text-[0.68rem] font-bold text-white">
                <i className="bx bxs-badge-check text-lime text-sm" aria-hidden="true" />
                Candidato Verificado
              </div>
            </div>

            {/* Candidate Identity Block */}
            <div className="px-5 pb-6 sm:px-7">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                {/* Avatar: ONLY this element has negative top margin */}
                <div className="relative -mt-14 sm:-mt-16 z-10 w-fit">
                  <div className={`rounded-full p-1 ${showOpenToWork ? 'bg-gradient-to-tr from-lime via-green to-emerald-400' : 'bg-white'}`}>
                    <div className="grid size-24 sm:size-28 place-items-center overflow-hidden rounded-full border-4 border-white bg-panel shadow-md">
                      {profile.photo ? (
                        <img src={profile.photo} alt={profile.fullName} className="size-full object-cover" />
                      ) : (
                        <span className="font-display text-3xl font-bold text-green-dark">
                          {getInitials(profile.fullName)}
                        </span>
                      )}
                    </div>
                  </div>
                  {showOpenToWork && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-white bg-green px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-white shadow">
                      #Disponible
                    </span>
                  )}
                </div>

                {/* Recruiter Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateAction('Descargar CV')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-xs hover:bg-panel transition-all"
                  >
                    <i className="bx bx-download text-base text-green" aria-hidden="true" />
                    Descargar CV ({primaryCv ? primaryCv.label : 'PDF'})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateAction('Contactar candidato')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-green px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-green-dark transition-all"
                  >
                    <i className="bx bx-envelope text-base" aria-hidden="true" />
                    Contactar candidato
                  </button>
                </div>
              </div>

              {/* Names, titles & LinkedIn-style University highlight */}
              <div className="mt-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="m-0 font-display text-xl sm:text-2xl font-bold text-ink">
                        {profile.fullName}
                      </h1>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[0.65rem] font-bold text-emerald-700">
                        <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        En búsqueda activa
                      </span>
                    </div>

                    <p className="m-0 mt-1 font-display text-sm sm:text-base font-semibold text-blue-muted">
                      {profile.headline}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-body-muted">
                      <span className="inline-flex items-center gap-1 font-medium text-ink/80">
                        <i className="bx bx-map text-secondary text-sm" aria-hidden="true" />
                        {profile.location}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium text-ink/80">
                        <i className="bx bx-envelope text-secondary text-sm" aria-hidden="true" />
                        {profile.email}
                      </span>
                    </div>
                  </div>

                  {/* Tarjeta de Educación UTS */}
                  <div className="shrink-0 flex items-center sm:items-start gap-2.5 rounded-xl border border-line bg-page p-3 text-xs shadow-2xs max-w-xs">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-ink text-lime font-display font-bold text-xs shadow-xs">
                      <i className="bx bxs-graduation text-base" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="m-0 font-display font-bold text-ink truncate text-xs">
                          {profile.institution || profile.university || 'Institución Universitaria'}
                        </p>
                        <i className="bx bxs-badge-check text-green text-sm shrink-0" aria-hidden="true" />
                      </div>
                      <p className="m-0 text-[0.68rem] font-semibold text-blue-muted truncate">
                        {profile.program}
                      </p>
                      <p className="m-0 mt-0.5 text-[0.65rem] text-secondary">
                        Graduado {profile.graduationYear} · Título Oficial
                      </p>
                    </div>
                  </div>
                </div>

                {/* Professional Links as seen by recruiter */}
                {Object.values(links).some(Boolean) && (
                  <div className="mt-3.5 flex flex-wrap gap-2 pt-3 border-t border-line-soft">
                    {links.linkedin && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-page px-3 py-1 text-xs font-semibold text-[#0a66c2]">
                        <i className="bx bxl-linkedin-square text-sm" aria-hidden="true" />
                        {links.linkedin}
                      </span>
                    )}
                    {links.github && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-page px-3 py-1 text-xs font-semibold text-ink">
                        <i className="bx bxl-github text-sm" aria-hidden="true" />
                        {links.github}
                      </span>
                    )}
                    {links.portfolio && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-page px-3 py-1 text-xs font-semibold text-green-dark">
                        <i className="bx bx-globe text-sm" aria-hidden="true" />
                        {links.portfolio}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Grid with Profile Details & Side Info */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.85fr)]">

            {/* Left Column: About, Experience, Skills */}
            <div className="space-y-6">

              {/* Sobre el candidato */}
              <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
                <h3 className="m-0 mb-2.5 font-display text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                  <i className="bx bx-user-circle text-base text-green" aria-hidden="true" />
                  Perfil profesional
                </h3>
                <p className="m-0 text-sm leading-relaxed text-ink/85 whitespace-pre-line">
                  {profile.about || 'El egresado aún no ha redactado su resumen profesional.'}
                </p>
              </div>

              {/* Hoja de vida adjunta que la empresa evalúa */}
              <div className="rounded-xl border border-green/25 bg-gradient-to-br from-green/[0.04] to-white p-5 shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-green-dark">
                      Documento de postulación
                    </span>
                    <h3 className="m-0 mt-0.5 font-display text-sm font-bold text-ink">
                      Hoja de Vida ({primaryCv ? primaryCv.label : 'CV Principal'})
                    </h3>
                  </div>
                  <span className="rounded-full bg-green/10 border border-green/20 px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-green-dark">
                    Principal
                  </span>
                </div>

                {primaryCv ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600 text-lg" aria-hidden="true">
                        <i className="bx bxs-file-pdf" />
                      </span>
                      <div className="min-w-0">
                        <p className="m-0 truncate text-xs font-bold text-ink">{primaryCv.fileName}</p>
                        <p className="m-0 text-[0.65rem] text-secondary">
                          Actualizado el {formatApplicationDate(primaryCv.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSimulateAction('Previsualizar CV')}
                      className="inline-flex items-center gap-1 rounded-md bg-panel px-2.5 py-1.5 text-xs font-bold text-ink hover:bg-line transition-colors shrink-0"
                    >
                      <i className="bx bx-show" aria-hidden="true" />
                      Ver archivo
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-secondary italic">
                    Sin hoja de vida principal adjunta actualmente.
                  </p>
                )}
                <p className="m-0 mt-2 text-[0.68rem] text-secondary">
                  * Las empresas solo ven tu CV principal, no tienen acceso a tus borradores internos.
                </p>
              </div>

              {/* Habilidades & Competencias */}
              <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
                <h3 className="m-0 mb-3 font-display text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                  <i className="bx bx-bolt-circle text-base text-violet-600" aria-hidden="true" />
                  Habilidades técnicas y competencias
                </h3>

                {profile.skills?.length > 0 ? (
                  <div className="space-y-3">
                    <div>
                      <span className="text-[0.68rem] font-bold uppercase text-secondary block mb-1.5">Habilidades Técnicas:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.skills.filter(s => s.type === 'tech').map((s) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-page px-2.5 py-1 text-xs font-semibold text-ink"
                          >
                            <span>{s.name}</span>
                            <span className="text-[0.6rem] font-bold text-[#051F26] bg-[#051F26]/10 px-1 rounded">
                              {skillLevels[s.level - 1]}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {profile.skills.some((s) => s.type === 'soft') && (
                      <div className="pt-3 border-t border-line-soft">
                        <SoftSkillsRadarChart
                          skills={profile.skills}
                          readOnly={true}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-body-muted">No hay habilidades registradas.</p>
                )}

                {/* Idiomas */}
                {profile.languages?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-line-soft">
                    <span className="text-[0.68rem] font-bold uppercase text-secondary block mb-1.5">Idiomas:</span>
                    <div className="flex flex-wrap gap-2">
                      {profile.languages.map((l) => (
                        <span key={l.id} className="inline-flex items-center gap-1.5 rounded-md bg-panel px-2.5 py-1 text-xs font-semibold text-blue-muted">
                          <i className="bx bx-world text-sky-600" aria-hidden="true" />
                          {l.name} · <strong className="text-ink">{l.level}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Formación Académica UTS */}
              <div className="rounded-xl border border-line bg-gradient-to-br from-white via-page/30 to-emerald-50/20 p-5 shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink text-lime font-display font-black text-sm shadow-xs border border-white/10" aria-hidden="true">
                      <i className="bx bxs-graduation text-xl" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="m-0 font-display text-sm font-bold text-ink">
                          {profile.institution || profile.university || 'Institución Universitaria'}
                        </h4>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[0.62rem] font-bold text-emerald-800">
                          <i className="bx bxs-badge-check text-green text-xs" /> Formación Acreditada
                        </span>
                      </div>
                      <p className="m-0 mt-0.5 text-xs font-semibold text-blue-muted">
                        {profile.program}
                      </p>
                      <p className="m-0 mt-0.5 text-[0.7rem] text-secondary">
                        {profile.faculty || 'Facultad de Ciencias Naturales e Ingenierías'} · Graduado {profile.graduationYear}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-green/10 border border-green/20 px-2.5 py-0.5 text-[0.62rem] font-bold text-green-dark">
                    Título Oficial
                  </span>
                </div>

                {profile.thesis && (
                  <div className="mt-3 rounded-lg border border-line-soft bg-white p-3 text-xs text-ink/80 leading-relaxed">
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block mb-0.5">
                      Proyecto de grado / Tesis:
                    </span>
                    {profile.thesis}
                  </div>
                )}

                {/* Especializaciones y Certificaciones en Educación */}
                {profile.otherEducation?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-line-soft space-y-2">
                    <span className="text-[0.68rem] font-bold uppercase text-secondary block">
                      Especializaciones y Certificaciones ({profile.otherEducation.length}):
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {profile.otherEducation.map((edu) => (
                        <div key={edu.id} className="rounded-lg border border-line-soft bg-white p-2.5 shadow-2xs flex items-start gap-2.5">
                          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#051F26]/10 text-[#051F26] text-sm">
                            <i className={edu.type === 'Certificación' ? 'bx bx-award' : 'bx bx-book-bookmark'} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="m-0 font-display text-xs font-bold text-ink truncate">{edu.degree}</p>
                            <p className="m-0 text-[0.68rem] font-medium text-blue-muted truncate">{edu.institution}</p>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="rounded bg-page border border-line-soft px-1.5 py-0.2 text-[0.6rem] font-bold text-secondary">
                                {edu.type}
                              </span>
                              {edu.year && <span className="text-[0.65rem] text-secondary">{edu.year}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Trayectoria / Experiencia Laboral */}
              <div className="rounded-xl border border-line bg-white p-5 shadow-2xs">
                <h3 className="m-0 mb-3 font-display text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                  <i className="bx bx-briefcase-alt-2 text-base text-[#051F26]" aria-hidden="true" />
                  Trayectoria laboral y prácticas
                </h3>

                {(profile.experience || []).filter((x) => x.type === 'work' || x.type === 'practice').length > 0 ? (
                  <ol className="m-0 list-none p-0 space-y-4">
                    {(profile.experience || [])
                      .filter((x) => x.type === 'work' || x.type === 'practice')
                      .map((item) => {
                      const meta = typeLabels[item.type] || typeLabels.work;
                      return (
                        <li key={item.id} className="relative flex gap-3 text-xs">
                          <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-base shadow-2xs ${meta.cls}`} aria-hidden="true">
                            <i className={`bx ${meta.icon}`} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-1">
                              <h4 className="m-0 font-display text-sm font-bold text-ink">
                                {item.role}
                              </h4>
                              <span className="text-[0.65rem] font-semibold text-secondary">
                                {formatMonth(item.start)} — {item.current ? 'Actualidad' : formatMonth(item.end)}
                              </span>
                            </div>
                            <p className="m-0 mt-0.5 font-semibold text-blue-muted">{item.company}</p>
                            <span className="inline-block mt-0.5 rounded bg-page border border-line-soft px-1.5 py-0.2 text-[0.62rem] font-bold text-secondary">
                              {meta.label}
                            </span>
                            {item.description && (
                              <p className="m-0 mt-1.5 text-xs leading-relaxed text-body-muted">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="text-xs text-body-muted">Sin registros de trayectoria aún.</p>
                )}
              </div>
            </div>

            {/* Right Column: Work Preferences, Contact Info, What's Hidden */}
            <div className="space-y-6">

              {/* Preferencias de contratación (Lo que la empresa usa para el Match) */}
              <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-amber-100 text-amber-800 text-sm" aria-hidden="true">
                    <i className="bx bx-target-lock" />
                  </span>
                  <h3 className="m-0 font-display text-xs font-bold uppercase tracking-wider text-amber-900">
                    Condiciones y Disponibilidad
                  </h3>
                </div>

                {/* Aspiración salarial */}
                <div className="rounded-lg border border-line-soft bg-white p-3">
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block mb-1">
                    Aspiración salarial
                  </span>
                  {prefs.showSalary && prefs.salaryMin ? (
                    <div>
                      <span className="font-display text-base font-bold text-ink">
                        {currency.format(prefs.salaryMin)} {prefs.salaryMax ? `— ${currency.format(prefs.salaryMax)}` : ''} COP
                      </span>
                      <span className="block text-[0.65rem] text-emerald-700 font-semibold mt-0.5">
                        ✓ Visible a reclutadores
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-display text-sm font-bold text-ink/80">
                        A convenir / No divulgada
                      </span>
                      <span className="block text-[0.65rem] text-secondary mt-0.5">
                        🔒 Protegido según tu configuración (la empresa negociará en la oferta)
                      </span>
                    </div>
                  )}
                </div>

                {/* Modalidad y Contratos */}
                <div className="grid gap-2 text-xs">
                  <div>
                    <span className="text-[0.65rem] font-bold uppercase text-secondary block mb-1">Modalidad deseada:</span>
                    <div className="flex flex-wrap gap-1">
                      {prefs.modes?.map((m) => (
                        <span key={m} className="rounded-md border border-line bg-white px-2 py-0.5 font-semibold text-ink">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[0.65rem] font-bold uppercase text-secondary block mb-1">Disponibilidad de ingreso:</span>
                    <span className="font-bold text-ink bg-white border border-line px-2 py-0.5 rounded-md inline-block">
                      {prefs.availability || 'Inmediata'}
                    </span>
                  </div>

                  {prefs.cities?.length > 0 && (
                    <div>
                      <span className="text-[0.65rem] font-bold uppercase text-secondary block mb-1">Ubicaciones de interés:</span>
                      <span className="text-body-muted font-medium">
                        {prefs.cities.join(', ')} {prefs.relocate ? '(Dispuesto a reubicación)' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Información de Contacto según regla de privacidad */}
              <div className="rounded-xl border border-line bg-white p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="m-0 font-display text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                    <i className="bx bx-phone-call text-base text-green" aria-hidden="true" />
                    Datos de contacto
                  </h3>
                  <span className={`rounded-full px-2 py-0.5 text-[0.62rem] font-bold ${canSeeContact ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                    {canSeeContact ? 'Acceso concedido' : 'Protegido'}
                  </span>
                </div>

                {canSeeContact ? (
                  <div className="space-y-2 text-xs">
                    <div className="rounded-lg border border-line-soft bg-page p-2.5">
                      <span className="text-[0.65rem] font-bold uppercase text-secondary block">Correo electrónico</span>
                      <a href={`mailto:${profile.email}`} className="font-semibold text-green-dark hover:underline truncate block">
                        {profile.email}
                      </a>
                    </div>
                    <div className="rounded-lg border border-line-soft bg-page p-2.5">
                      <span className="text-[0.65rem] font-bold uppercase text-secondary block">Teléfono / Celular</span>
                      <a href={`tel:${profile.phone}`} className="font-semibold text-ink hover:underline block">
                        {profile.phone}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-line bg-page p-3 text-xs text-secondary leading-relaxed">
                    <i className="bx bx-lock-alt text-base text-amber-600 mr-1 align-text-bottom" aria-hidden="true" />
                    Tus datos de contacto están protegidos. La empresa debe invitarte o recibir tu postulación formal para ver tu correo y teléfono.
                  </div>
                )}
              </div>

              {/* Caja de tranquilidad: Lo que la empresa NO puede ver */}
              <div className="rounded-xl border border-line bg-ink/[0.03] p-4 text-xs leading-relaxed space-y-2">
                <div className="flex items-center gap-1.5 font-display font-bold text-ink">
                  <i className="bx bx-shield-quarter text-base text-green" aria-hidden="true" />
                  Lo que las empresas NUNCA pueden ver:
                </div>
                <ul className="m-0 list-none p-0 space-y-1 text-secondary text-[0.72rem]">
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span>Tu puntaje de "Fortaleza del perfil" ni tareas pendientes.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span>Otras versiones de tu CV que no hayas seleccionado.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span>Tu historial de postulaciones activas a otras empresas.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span>Tu frecuencia de alertas ni empresas que tienes ocultas.</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </div>

        {/* ─── Footer Controls ─── */}
        <div className="border-t border-line-soft bg-page px-5 py-3.5 sm:px-6 flex items-center justify-between">
          <p className="m-0 text-xs text-body-muted hidden sm:block">
            Estás visualizando tu perfil como candidato verificado de la institución.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-5 py-2 font-display text-xs font-bold text-white hover:bg-ink-soft transition-colors shadow-xs"
            >
              <i className="bx bx-edit-alt text-lime text-sm" aria-hidden="true" />
              Volver a editar mi perfil
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
