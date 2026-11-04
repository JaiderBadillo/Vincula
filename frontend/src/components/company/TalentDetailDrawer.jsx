import { useEffect, useState } from 'react';
import { TALENT_STATUSES } from '../../data/companyTalentPoolData.js';

function initialsOf(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function TalentDetailDrawer({
  talent,
  onClose,
  onOpenInvite,
  onToggleBookmark,
}) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'skills' | 'contact'

  const open = Boolean(talent);

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!talent) return null;

  const statusMeta = TALENT_STATUSES.find((s) => s.id === talent.status) || TALENT_STATUSES[1];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-cocoa/55 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="talent-drawer-name"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Encabezado del Egresado ─── */}
        <header className="border-b border-sand-line bg-cream/40 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              {talent.avatar ? (
                <img
                  src={talent.avatar}
                  alt={talent.fullName}
                  className="size-16 shrink-0 rounded-2xl border-2 border-white object-cover shadow-sm"
                />
              ) : (
                <span className="grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-white bg-sand text-lg font-bold text-terracotta-dark shadow-sm">
                  {initialsOf(talent.fullName)}
                </span>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="talent-drawer-name" className="m-0 font-display text-lg font-bold text-ink">
                    {talent.fullName}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.2 text-[0.68rem] font-bold text-emerald-900">
                    <i className="bx bxs-check-shield text-xs text-emerald-700" />
                    <span>Perfil Verificado por IES</span>
                  </span>
                </div>

                <p className="m-0 mt-0.5 text-xs font-semibold text-cocoa">
                  {talent.program}
                </p>

                <p className="m-0 text-xs text-secondary flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-ink">{talent.institutionShort}</span>
                  <span>•</span>
                  <span>{talent.campus}</span>
                  <span>•</span>
                  <span>{talent.city}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onToggleBookmark(talent.id)}
                className={`grid size-9 place-items-center rounded-xl border transition-colors cursor-pointer ${
                  talent.isBookmarked
                    ? 'border-amber-300 bg-amber-50 text-amber-600'
                    : 'border-sand-line bg-white text-secondary hover:text-ink hover:bg-cream'
                }`}
                title={talent.isBookmarked ? 'Quitar de guardados' : 'Guardar en talentos favoritos'}
              >
                <i className={`bx ${talent.isBookmarked ? 'bxs-star text-lg' : 'bx-star text-lg'}`} />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="grid size-9 place-items-center rounded-xl text-secondary hover:bg-sand hover:text-ink transition-colors cursor-pointer"
                aria-label="Cerrar perfil de talento"
              >
                <i className="bx bx-x text-xl" />
              </button>
            </div>
          </div>

          {/* Estado Formativo & Promedio Ponderado */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-sand-line/60">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusMeta.badge}`}>
                <span>{statusMeta.label}</span>
              </span>
              <span className="text-xs text-secondary">
                {talent.graduationTerm}
              </span>
            </div>

            {talent.gpa && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-sand-line bg-white px-3 py-1 text-xs font-bold text-cocoa shadow-2xs">
                <i className="bx bx-award text-ochre-dark text-sm" />
                <span>Promedio: {talent.gpa}</span>
              </div>
            )}
          </div>
        </header>

        {/* ─── Pestañas de Navegación ─── */}
        <div className="flex border-b border-sand-line px-6 bg-cream/20">
          {[
            { id: 'profile', label: 'Formación & Perfil', icon: 'bx-id-card' },
            { id: 'skills', label: 'Competencias Verificadas', icon: 'bx-badge-check' },
            { id: 'contact', label: 'Contacto & Portafolio', icon: 'bx-link-alt' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 border-b-2 py-3 px-3 text-xs font-bold transition-colors cursor-pointer ${
                  isActive
                    ? 'border-terracotta text-terracotta'
                    : 'border-transparent text-secondary hover:text-ink'
                }`}
              >
                <i className={`bx ${tab.icon} text-sm`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── Contenido ─── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Bio o Perfil Profesional */}
              <div className="space-y-2">
                <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary">
                  Resumen de Perfil Egresado
                </h4>
                <div className="rounded-xl border border-sand-line bg-white p-4">
                  <p className="m-0 text-xs text-ink leading-relaxed">
                    {talent.bio}
                  </p>
                </div>
              </div>

              {/* Proyecto de Grado / Tesis */}
              {talent.capstoneProject && (
                <div className="space-y-2">
                  <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary">
                    Proyecto de Grado / Práctica Destacada
                  </h4>
                  <div className="rounded-xl border border-ochre/30 bg-sand/20 p-4 space-y-1">
                    <p className="m-0 text-xs font-bold text-cocoa flex items-center gap-1.5">
                      <i className="bx bx-book-open text-terracotta text-sm" />
                      <span>{talent.capstoneProject}</span>
                    </p>
                    <p className="m-0 text-[0.7rem] text-secondary">
                      Aprobado por el comité curricular de {talent.institutionShort}
                    </p>
                  </div>
                </div>
              )}

              {/* Modalidad y Disponibilidad */}
              <div className="space-y-2">
                <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary">
                  Disponibilidad y Modalidad
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-sand-line bg-cream/30 p-3.5 space-y-1">
                    <span className="text-[0.68rem] text-secondary font-medium">Modalidad de Interés:</span>
                    <p className="m-0 text-xs font-bold text-ink">
                      {talent.modality?.join(', ') || 'Presencial'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-sand-line bg-cream/30 p-3.5 space-y-1">
                    <span className="text-[0.68rem] text-secondary font-medium">Disponibilidad de Traslado:</span>
                    <p className="m-0 text-xs font-bold text-ink">
                      {talent.relocationReady ? '✓ Disponible para traslado regional' : 'Solo en su ciudad de residencia'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invitaciones previas a convocatorias */}
              {talent.invitedVacancies && talent.invitedVacancies.length > 0 && (
                <div className="rounded-xl border border-sand-line bg-cream/40 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cocoa">
                    <i className="bx bx-mail-send text-terracotta text-sm" />
                    <span>Invitaciones emitidas por Cenit Transporte</span>
                  </div>
                  <p className="m-0 text-xs text-secondary">
                    Ya has invitado a este egresado a {talent.invitedVacancies.length} convocatoria(s) activa(s).
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-6">
              {/* Habilidades Técnicas Verificadas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="m-0 text-xs font-bold text-ink flex items-center gap-1.5">
                    <i className="bx bx-check-double text-emerald-600 text-sm" />
                    <span>Habilidades Técnicas Avaladas por Pensum</span>
                  </h4>
                  <span className="text-[0.7rem] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    Cotejo IES Oficial
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {talent.skills.map((skill) => {
                    const isVerified = (talent.skillsVerified || []).includes(skill);
                    return (
                      <span
                        key={skill}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                          isVerified
                            ? 'border-emerald-300 bg-emerald-50/80 text-emerald-950 shadow-2xs'
                            : 'border-sand-line bg-cream/40 text-ink'
                        }`}
                      >
                        {isVerified && <i className="bx bxs-badge-check text-emerald-600 text-sm" />}
                        <span>{skill}</span>
                        {isVerified && <span className="text-[0.62rem] text-emerald-700 font-bold uppercase">(Verificada)</span>}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Habilidades Blandas */}
              {talent.softSkills && talent.softSkills.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="m-0 text-xs font-bold text-ink flex items-center gap-1.5">
                    <i className="bx bx-user-check text-terracotta text-sm" />
                    <span>Competencias Socioemocionales e Interpersonales</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {talent.softSkills.map((sk) => (
                      <span
                        key={sk}
                        className="rounded-lg border border-sand-line bg-white px-2.5 py-1 text-xs font-medium text-cocoa"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Idiomas */}
              {talent.languages && (
                <div className="rounded-xl border border-sand-line bg-cream/20 p-4 space-y-1">
                  <h4 className="m-0 text-xs font-bold text-ink flex items-center gap-1.5">
                    <i className="bx bx-globe text-secondary text-sm" />
                    <span>Dominio de Idiomas</span>
                  </h4>
                  <p className="m-0 text-xs font-semibold text-cocoa">{talent.languages}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-6">
              {/* Enlaces de contacto */}
              <div className="space-y-3">
                <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary">
                  Canales Oficiales de Comunicación
                </h4>
                <div className="space-y-2">
                  <a
                    href={`mailto:${talent.email}`}
                    className="flex items-center justify-between rounded-xl border border-sand-line bg-white p-3.5 hover:bg-cream transition-colors no-underline group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-lg bg-sand text-terracotta">
                        <i className="bx bx-envelope text-base" />
                      </span>
                      <div>
                        <p className="m-0 text-xs font-bold text-ink">Correo Institucional</p>
                        <p className="m-0 text-xs text-secondary">{talent.email}</p>
                      </div>
                    </div>
                    <i className="bx bx-link-external text-secondary group-hover:text-terracotta" />
                  </a>

                  {talent.phone && (
                    <a
                      href={`tel:${talent.phone}`}
                      className="flex items-center justify-between rounded-xl border border-sand-line bg-white p-3.5 hover:bg-cream transition-colors no-underline group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-lg bg-sand text-secondary">
                          <i className="bx bx-phone text-base" />
                        </span>
                        <div>
                          <p className="m-0 text-xs font-bold text-ink">Teléfono / Celular</p>
                          <p className="m-0 text-xs text-secondary">{talent.phone}</p>
                        </div>
                      </div>
                      <i className="bx bx-phone-call text-secondary group-hover:text-terracotta" />
                    </a>
                  )}
                </div>
              </div>

              {/* Portafolio & Perfiles Profesionales */}
              <div className="space-y-3">
                <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary">
                  Portafolio y Redes Profesionales
                </h4>
                <div className="space-y-2">
                  {talent.portfolioUrl && (
                    <a
                      href={talent.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl border border-sand-line bg-white p-3.5 hover:bg-cream transition-colors no-underline group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-lg bg-sand text-cocoa">
                          <i className="bx bxl-github text-lg" />
                        </span>
                        <div>
                          <p className="m-0 text-xs font-bold text-ink">Repositorio / Portafolio</p>
                          <p className="m-0 text-xs text-secondary">{talent.portfolioUrl}</p>
                        </div>
                      </div>
                      <i className="bx bx-link-external text-secondary group-hover:text-terracotta" />
                    </a>
                  )}

                  {talent.linkedinUrl && (
                    <a
                      href={talent.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl border border-sand-line bg-white p-3.5 hover:bg-cream transition-colors no-underline group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-lg bg-sand text-cocoa">
                          <i className="bx bxl-linkedin-square text-lg" />
                        </span>
                        <div>
                          <p className="m-0 text-xs font-bold text-ink">Perfil LinkedIn</p>
                          <p className="m-0 text-xs text-secondary">{talent.linkedinUrl}</p>
                        </div>
                      </div>
                      <i className="bx bx-link-external text-secondary group-hover:text-terracotta" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer: Acciones Principales del Reclutador ─── */}
        <footer className="border-t border-sand-line bg-cream/30 p-4 sm:p-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onToggleBookmark(talent.id)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-sand-line bg-white px-3.5 py-2 text-xs font-bold text-secondary hover:text-ink hover:bg-cream transition-colors cursor-pointer"
          >
            <i className={`bx ${talent.isBookmarked ? 'bxs-star text-amber-500' : 'bx-star'}`} />
            <span>{talent.isBookmarked ? 'Guardado en Favoritos' : 'Guardar en Reserva'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenInvite(talent)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cocoa px-5 py-2 text-xs font-bold text-white hover:bg-cocoa/90 transition-all cursor-pointer shadow-xs"
          >
            <i className="bx bx-paper-plane text-sm" />
            <span>Invitar a Convocatoria</span>
          </button>
        </footer>
      </div>
    </div>
  );
}

