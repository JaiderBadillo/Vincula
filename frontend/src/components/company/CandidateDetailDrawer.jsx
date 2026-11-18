import { useEffect, useState } from 'react';
import { ATS_STAGES, DISCARD_REASONS } from '../../data/companyCandidatesData.js';
import { atsService } from '../../services/atsService.js';
import DocumentViewerModal from '../common/DocumentViewerModal.jsx';

function initialsOf(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function CandidateDetailDrawer({
  candidate,
  initialTab = 'match',
  onClose,
  onMoveStage,
  onScheduleInterview,
  onDiscard,
  onSaveNotes,
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'match' | 'cv' | 'diploma' | 'history'
  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [selectedDiscardReason, setSelectedDiscardReason] = useState(DISCARD_REASONS[0]);
  const [discardNote, setDiscardNote] = useState('');
  const [diplomaPdfUrl, setDiplomaPdfUrl] = useState(null);
  const [loadingDiplomaPdf, setLoadingDiplomaPdf] = useState(false);
  const [diplomaPdfError, setDiplomaPdfError] = useState(null);
  const [showDiplomaModal, setShowDiplomaModal] = useState(false);

  const open = Boolean(candidate);

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (showDiplomaModal) {
          setShowDiplomaModal(false);
        } else if (discardModalOpen) {
          setDiscardModalOpen(false);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, discardModalOpen, showDiplomaModal]);

  useEffect(() => {
    if (candidate) {
      setNotes(candidate.recruiterNotes || '');
      setIsEditingNotes(false);
      setDiscardModalOpen(false);
      setSelectedDiscardReason(DISCARD_REASONS[0]);
      setDiscardNote('');
      setDiplomaPdfUrl(null);
      setDiplomaPdfError(null);
      setLoadingDiplomaPdf(false);
      setShowDiplomaModal(false);
      setActiveTab(initialTab || 'match');
    }
  }, [candidate, initialTab]);

  useEffect(() => {
    if (candidate && activeTab === 'diploma' && !diplomaPdfUrl && !loadingDiplomaPdf && !diplomaPdfError) {
      handleLoadDiplomaPdf(false);
    }
  }, [candidate, activeTab]);

  if (!candidate) return null;

  const currentStage = ATS_STAGES.find((s) => s.id === candidate.stage) || ATS_STAGES[0];

  async function handleLoadDiplomaPdf(openViewer = false) {
    setActiveTab('diploma');
    if (diplomaPdfUrl) {
      if (openViewer) setShowDiplomaModal(true);
      return;
    }
    setLoadingDiplomaPdf(true);
    setDiplomaPdfError(null);
    try {
      const res = await atsService.getCandidateDiplomaUrl(candidate.id, 3600);
      if (res && res.url_segura) {
        setDiplomaPdfUrl(res.url_segura);
        if (openViewer) setShowDiplomaModal(true);
      } else {
        setDiplomaPdfError('No se recibió el enlace firmado del diploma.');
      }
    } catch (err) {
      setDiplomaPdfError(
        err.message || 'El egresado aún no ha cargado el archivo PDF de su título o diploma en la plataforma.'
      );
    } finally {
      setLoadingDiplomaPdf(false);
    }
  }

  function handleSaveNotesClick() {
    if (onSaveNotes) {
      onSaveNotes(candidate.id, notes);
    }
    setIsEditingNotes(false);
  }

  function handleConfirmDiscard() {
    if (onDiscard) {
      onDiscard(candidate.id, selectedDiscardReason, discardNote);
    }
    setDiscardModalOpen(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-cocoa/55 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="candidate-drawer-name"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Encabezado del Perfil ─── */}
        <header className="border-b border-sand-line bg-cream/40 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              {candidate.avatar ? (
                <img
                  src={candidate.avatar}
                  alt={candidate.candidateName}
                  className="size-16 shrink-0 rounded-2xl border-2 border-white object-cover shadow-sm"
                />
              ) : (
                <span className="grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-white bg-sand text-lg font-bold text-terracotta-dark shadow-sm">
                  {initialsOf(candidate.candidateName)}
                </span>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="candidate-drawer-name" className="m-0 font-display text-lg font-bold text-ink">
                    {candidate.candidateName}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-ochre/25 border border-ochre/40 px-2.5 py-0.5 text-xs font-bold text-cocoa">
                    <i className="bx bxs-badge-check text-ochre-dark" />
                    <span>{candidate.matchPercentage == null ? 'Sin puntaje calculado' : `${candidate.matchPercentage}% afinidad`}</span>
                  </span>
                  {candidate.degreeVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      <i className="bx bxs-shield-check text-emerald-600" />
                      <span>Título Verificado IES</span>
                    </span>
                  )}
                </div>

                <p className="m-0 mt-0.5 text-xs font-semibold text-cocoa">
                  {candidate.program}
                </p>

                <p className="m-0 text-xs text-secondary flex items-center gap-1.5 flex-wrap">
                  <span>{candidate.institution}</span>
                  {candidate.graduationYear && (
                    <>
                      <span>•</span>
                      <span>Graduación: {candidate.graduationYear}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{candidate.city}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-secondary hover:bg-sand hover:text-ink transition-colors cursor-pointer"
              aria-label="Cerrar ficha de candidato"
            >
              <i className="bx bx-x text-xl" />
            </button>
          </div>

          {/* Contacto directo y Etapa Actual */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-sand-line/60">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <a
                href={`mailto:${candidate.email}`}
                className="inline-flex items-center gap-1 rounded-lg border border-sand-line bg-white px-2.5 py-1 text-secondary hover:text-ink hover:bg-cream transition-colors no-underline font-medium"
              >
                <i className="bx bx-envelope text-terracotta" />
                <span>{candidate.email}</span>
              </a>

              {candidate.phone && (
                <a
                  href={`tel:${candidate.phone}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-sand-line bg-white px-2.5 py-1 text-secondary hover:text-ink hover:bg-cream transition-colors no-underline font-medium"
                >
                  <i className="bx bx-phone text-secondary" />
                  <span>{candidate.phone}</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => handleLoadDiplomaPdf(false)}
                className="inline-flex items-center gap-1 rounded-lg border border-terracotta/35 bg-white px-2.5 py-1 text-xs font-bold text-cocoa hover:bg-sand transition-colors cursor-pointer"
                title="Ver el título o diploma en PDF del egresado"
              >
                <i className="bx bxs-graduation text-terracotta text-sm" />
                <span>Ver Título / Diploma</span>
              </button>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-sand-line bg-white px-3 py-1 text-xs font-bold text-ink shadow-2xs">
              <span className={`size-2 rounded-full ${currentStage.dot}`} />
              <span>Etapa: {currentStage.label}</span>
            </div>
          </div>
        </header>

        {/* ─── Pestañas de Navegación del Drawer ─── */}
        <div className="flex border-b border-sand-line px-6 bg-cream/20 overflow-x-auto">
          {[
            { id: 'match', label: 'Match y Evaluación', icon: 'bx-radar' },
            { id: 'cv', label: 'Hoja de Vida & Perfil', icon: 'bx-id-card' },
            { id: 'diploma', label: 'Título / Diploma', icon: 'bxs-graduation' },
            { id: 'history', label: 'Historial ATS', icon: 'bx-history' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === 'diploma') {
                    handleLoadDiplomaPdf(false);
                  } else {
                    setActiveTab(tab.id);
                  }
                }}
                className={`flex items-center gap-1.5 border-b-2 py-3 px-3 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
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

        {/* ─── Contenido según Pestaña Activa ─── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'match' && (
            <div className="space-y-6">
              {/* Vacante a la que postuló */}
              <div className="rounded-2xl border border-sand-line bg-cream/30 p-4.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Vacante en Selección
                  </span>
                  <span className="rounded-md border border-sand-line bg-white px-2 py-0.5 text-[0.68rem] font-bold text-cocoa">
                    {candidate.vacancyCode}
                  </span>
                </div>
                <h3 className="m-0 font-display text-sm font-bold text-ink">
                  {candidate.vacancyTitle}
                </h3>
                <p className="m-0 text-xs text-secondary">
                  Postulado el {new Date(candidate.appliedAt).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {/* Habilidades Técnicas Coincidentes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="m-0 text-xs font-bold text-ink flex items-center gap-1.5">
                    <i className="bx bx-check-circle text-emerald-600 text-sm" />
                    <span>Habilidades Técnicas que Coinciden ({candidate.skillsMatch?.length || 0})</span>
                  </h4>
                  <span className="text-[0.7rem] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Coincidencias registradas en la vacante
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(candidate.skillsMatch || []).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-xs font-medium text-emerald-900 shadow-2xs"
                    >
                      ✓ {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Habilidades por Desarrollar o No Encontradas */}
              {candidate.missingSkills && candidate.missingSkills.length > 0 && (
                <div className="space-y-3">
                  <h4 className="m-0 text-xs font-bold text-ink flex items-center gap-1.5">
                    <i className="bx bx-info-circle text-amber-600 text-sm" />
                    <span>Habilidades Faltantes o Deseables ({candidate.missingSkills.length})</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.missingSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900"
                      >
                        • {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cita de Entrevista Programada (si aplica) */}
              {candidate.interviewDate && (
                <div className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-terracotta-dark">
                    <i className="bx bx-calendar-check text-base text-terracotta" />
                    <span>Entrevista Programada</span>
                  </div>
                  <p className="m-0 text-xs text-ink font-semibold">{candidate.interviewDate}</p>
                </div>
              )}

              {/* Notas Internas del Reclutador */}
              <div className="rounded-2xl border border-sand-line bg-white p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="recruiter-notes" className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <i className="bx bx-note text-terracotta" />
                    <span>Bitácora & Notas del Reclutador</span>
                  </label>
                  {!isEditingNotes && (
                    <button
                      type="button"
                      onClick={() => setIsEditingNotes(true)}
                      className="text-xs font-bold text-terracotta hover:underline cursor-pointer"
                    >
                      Editar nota
                    </button>
                  )}
                </div>

                {isEditingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      id="recruiter-notes"
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Escribe comentarios de la entrevista, evaluación técnica o impresiones..."
                      className="w-full rounded-xl border border-sand-line bg-cream/30 p-3 text-xs text-ink focus:border-terracotta focus:bg-white focus:outline-none transition-colors"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNotes(candidate.recruiterNotes || '');
                          setIsEditingNotes(false);
                        }}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-secondary hover:text-ink cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNotesClick}
                        className="rounded-lg bg-cocoa px-3.5 py-1.5 text-xs font-bold text-white hover:bg-cocoa/90 transition-colors cursor-pointer"
                      >
                        Guardar Nota
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="m-0 text-xs text-secondary leading-relaxed bg-cream/40 rounded-xl p-3 border border-sand-line/60">
                    {notes || 'Sin anotaciones internas registradas. Pulsa en "Editar nota" para agregar observaciones.'}
                  </p>
                )}
              </div>

              {/* Motivo de Descarte (si fue descartado) */}
              {candidate.stage === 'discarded' && candidate.rejectionReason && (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1">
                  <p className="m-0 text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <i className="bx bx-x-circle text-stone-600" />
                    <span>Motivo de Descarte:</span>
                  </p>
                  <p className="m-0 text-xs text-stone-700">{candidate.rejectionReason}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'cv' && (
            <div className="space-y-6">
              {/* Resumen de Experiencia */}
              <div className="space-y-2">
                <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary">
                  Experiencia Laboral & Práctica
                </h4>
                <div className="rounded-xl border border-sand-line bg-white p-4">
                  <p className="m-0 text-xs text-ink leading-relaxed">
                    {candidate.experienceSummary || 'Sin experiencia laboral previa registrada. Perfil enfocado en formación universitaria y etapa práctica.'}
                  </p>
                </div>
              </div>

              {/* Formación Académica y Título / Diploma */}
              <div className="space-y-2">
                <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary">
                  Formación, Título y Universidad
                </h4>
                <div className="rounded-xl border border-sand-line bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="m-0 text-xs font-bold text-ink">{candidate.program}</p>
                      {candidate.degreeLevel && (
                        <p className="m-0 text-[0.7rem] text-secondary">{candidate.degreeLevel}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {candidate.degreeVerified ? (
                        <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <i className="bx bxs-shield-check text-emerald-600" />
                          <span>Verificado por IES</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <i className="bx bx-time-five text-amber-600" />
                          <span>En revisión IES</span>
                        </span>
                      )}
                      <span className="text-[0.7rem] font-bold text-cocoa bg-sand px-2 py-0.5 rounded">
                        {candidate.graduationYear || 'Recién egresado'}
                      </span>
                    </div>
                  </div>
                  <p className="m-0 text-xs text-secondary">{candidate.institution}</p>
                  {candidate.educationSummary && (
                    <p className="m-0 mt-1 text-xs text-ink/80 italic">{candidate.educationSummary}</p>
                  )}

                  {(candidate.actaNumber || candidate.bookFolio || candidate.degreeDate) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-sand-line/60 text-[0.7rem]">
                      {candidate.actaNumber && (
                        <div>
                          <span className="text-secondary block">Acta de grado</span>
                          <strong className="text-ink">{candidate.actaNumber}</strong>
                        </div>
                      )}
                      {candidate.bookFolio && (
                        <div>
                          <span className="text-secondary block">Libro / Folio</span>
                          <strong className="text-ink">{candidate.bookFolio}</strong>
                        </div>
                      )}
                      {candidate.degreeDate && (
                        <div>
                          <span className="text-secondary block">Fecha de grado</span>
                          <strong className="text-ink">{candidate.degreeDate}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-sand-line/60 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[0.7rem] text-secondary">
                      {candidate.hasDiplomaPdf
                        ? 'El soporte original del título / diploma está disponible para revisión.'
                        : 'Consulta el soporte documental del título universitario.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLoadDiplomaPdf(false)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-cocoa px-3.5 py-2 text-xs font-bold text-white hover:bg-cocoa/90 transition-colors cursor-pointer shadow-2xs"
                    >
                      <i className="bx bxs-graduation text-sm" />
                      <span>Ver Título / Diploma (PDF)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Documentos Anexos */}
              <div className="rounded-2xl border border-dashed border-sand-line p-5 text-center bg-cream/20">
                <i className="bx bx-file-pdf text-3xl text-terracotta" />
                <p className="m-0 mt-1 text-xs font-bold text-ink">Archivo de hoja de vida</p>
                <p className="m-0 text-[0.7rem] text-secondary">No hay un documento asociado a esta postulación para abrir desde este panel.</p>
              </div>
            </div>
          )}

          {activeTab === 'diploma' && (
            <div className="space-y-4">
              {/* Estado de Verificación Institucional + Sello Digital */}
              <div
                className={`rounded-2xl border p-4 space-y-2.5 ${
                  candidate.degreeVerified
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : 'border-amber-200 bg-amber-50/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <p
                      className={`m-0 text-xs font-bold flex items-center gap-1.5 ${
                        candidate.degreeVerified ? 'text-emerald-950' : 'text-amber-950'
                      }`}
                    >
                      <i
                        className={`bx ${
                          candidate.degreeVerified
                            ? 'bxs-shield-check text-emerald-700'
                            : 'bx-time-five text-amber-700'
                        } text-base`}
                      />
                      <span>
                        {candidate.degreeVerified
                          ? 'Título Universitario Verificado por la Institución (IES)'
                          : 'Título Universitario en Proceso de Verificación por la IES'}
                      </span>
                    </p>
                    <p className="m-0 text-[0.72rem] text-secondary">
                      {candidate.program} · {candidate.institution}
                      {candidate.graduationYear ? ` (${candidate.graduationYear})` : ''}
                    </p>
                  </div>

                  {candidate.degreeVerified && (
                    <span className="rounded-md bg-emerald-200/80 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-900">
                      Sello Digital SHA-256
                    </span>
                  )}
                </div>

                {(candidate.actaNumber || candidate.bookFolio || candidate.degreeDate) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 text-[0.7rem]">
                    {candidate.actaNumber && (
                      <div>
                        <span className="text-secondary block">Acta de grado</span>
                        <strong className="text-ink">{candidate.actaNumber}</strong>
                      </div>
                    )}
                    {candidate.bookFolio && (
                      <div>
                        <span className="text-secondary block">Libro / Folio</span>
                        <strong className="text-ink">{candidate.bookFolio}</strong>
                      </div>
                    )}
                    {candidate.degreeDate && (
                      <div>
                        <span className="text-secondary block">Fecha de grado</span>
                        <strong className="text-ink">{candidate.degreeDate}</strong>
                      </div>
                    )}
                  </div>
                )}

                {candidate.digitalSeal && (
                  <p className="m-0 font-mono text-[0.65rem] text-emerald-900 bg-white/90 p-2 rounded-lg border border-emerald-200 break-all select-all">
                    {candidate.digitalSeal}
                  </p>
                )}
              </div>

              {/* Barra de controles del visor de diploma */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="m-0 text-sm font-bold text-ink flex items-center gap-1.5">
                    <i className="bx bxs-file-pdf text-terracotta text-base" />
                    <span>Diploma / Acta de Grado del Egresado</span>
                  </h3>
                  <p className="m-0 text-[0.7rem] text-secondary">
                    Visualización directa del soporte documental original cargado por el egresado.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadDiplomaPdf(true)}
                    disabled={loadingDiplomaPdf}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-cocoa hover:bg-cocoa/90 text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    <i className="bx bx-fullscreen text-sm" />
                    <span>Visor Completo</span>
                  </button>

                  {diplomaPdfUrl && (
                    <a
                      href={diplomaPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-sand-line bg-cream/50 hover:bg-sand text-ink px-2.5 py-1.5 text-xs font-semibold transition-colors no-underline cursor-pointer"
                      title="Abrir diploma en nueva pestaña"
                    >
                      <i className="bx bx-link-external text-secondary" />
                      <span>Nueva pestaña</span>
                    </a>
                  )}
                </div>
              </div>

              {loadingDiplomaPdf ? (
                <div className="h-96 flex flex-col items-center justify-center rounded-xl border border-sand-line bg-cream/20 text-secondary text-sm">
                  <i className="bx bx-loader-alt bx-spin text-3xl text-cocoa mb-2" />
                  <span>Cargando título / diploma original desde el repositorio seguro...</span>
                </div>
              ) : diplomaPdfUrl ? (
                <iframe
                  src={`${diplomaPdfUrl}#toolbar=1&navpanes=0`}
                  title={`Diploma de ${candidate.candidateName}`}
                  className="w-full h-96 rounded-xl border border-sand-line bg-white shadow-inner"
                />
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
                  <p className="m-0 font-bold flex items-center gap-1.5">
                    <i className="bx bx-info-circle text-base text-amber-700" />
                    <span>{diplomaPdfError || 'Diploma PDF no adjunto por el egresado'}</span>
                  </p>
                  <p className="m-0 text-amber-800">
                    El egresado aún no cuenta con un archivo PDF de su título o diploma cargado en el repositorio documental.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary">
                Línea de Tiempo en el Proceso
              </h4>
              <div className="relative border-l-2 border-sand-line ml-3 space-y-6 pl-5 py-2">
                <div className="relative">
                  <span className="absolute -left-[27px] top-0.5 size-3.5 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-200" />
                  <p className="m-0 text-xs font-bold text-ink">Postulación Recibida</p>
                  <p className="m-0 text-[0.7rem] text-secondary">
                    El egresado aplicó a través de la Bolsa de Empleo Institucional.
                  </p>
                  <span className="text-[0.65rem] text-secondary font-medium">
                    {new Date(candidate.appliedAt).toLocaleDateString('es-CO')}
                  </span>
                </div>

                {['preselected', 'evaluation', 'interview', 'offer', 'hired'].includes(candidate.stage) && (
                  <div className="relative">
                    <span className="absolute -left-[27px] top-0.5 size-3.5 rounded-full bg-ochre border-2 border-white ring-2 ring-ochre/30" />
                    <p className="m-0 text-xs font-bold text-ink">Filtro de Preselección Aprobado</p>
                    <p className="m-0 text-[0.7rem] text-secondary">
                      Cumplimiento de requisitos curriculares y afinidad técnica validada.
                    </p>
                  </div>
                )}

                {['evaluation', 'interview', 'offer', 'hired'].includes(candidate.stage) && (
                  <div className="relative">
                    <span className="absolute -left-[27px] top-0.5 size-3.5 rounded-full bg-amber-600 border-2 border-white ring-2 ring-amber-200" />
                    <p className="m-0 text-xs font-bold text-ink">Prueba Técnica / Psicotécnica</p>
                    <p className="m-0 text-[0.7rem] text-secondary">
                      Evaluación de competencias prácticas de la vacante.
                    </p>
                  </div>
                )}

                {['interview', 'offer', 'hired'].includes(candidate.stage) && (
                  <div className="relative">
                    <span className="absolute -left-[27px] top-0.5 size-3.5 rounded-full bg-terracotta border-2 border-white ring-2 ring-terracotta/30" />
                    <p className="m-0 text-xs font-bold text-ink">Entrevista de Selección</p>
                    <p className="m-0 text-[0.7rem] text-secondary">
                      {candidate.interviewDate ? `Fecha registrada: ${candidate.interviewDate}` : 'Los datos de la entrevista aún no están disponibles.'}
                    </p>
                  </div>
                )}

                {candidate.stage === 'hired' && (
                  <div className="relative">
                    <span className="absolute -left-[27px] top-0.5 size-3.5 rounded-full bg-emerald-700 border-2 border-white ring-2 ring-emerald-200" />
                    <p className="m-0 text-xs font-bold text-emerald-800">Contratación Confirmada</p>
                    <p className="m-0 text-[0.7rem] text-secondary">
                      La vinculación quedó registrada para el seguimiento de la institución.
                    </p>
                  </div>
                )}

                {candidate.stage === 'offer' && (
                  <div className="relative">
                    <span className="absolute -left-[27px] top-0.5 size-3.5 rounded-full bg-emerald-600 border-2 border-white ring-2 ring-emerald-200" />
                    <p className="m-0 text-xs font-bold text-emerald-800">Propuesta u Oferta Emitida</p>
                    <p className="m-0 text-[0.7rem] text-secondary">
                      Candidato finalista en fase de contratación.
                    </p>
                  </div>
                )}

                {candidate.stage === 'discarded' && (
                  <div className="relative">
                    <span className="absolute -left-[27px] top-0.5 size-3.5 rounded-full bg-stone-400 border-2 border-white ring-2 ring-stone-200" />
                    <p className="m-0 text-xs font-bold text-stone-700">Proceso Finalizado / Descartado</p>
                    <p className="m-0 text-[0.7rem] text-secondary">{candidate.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Barra de Acciones del ATS (Footer) ─── */}
        <footer className="border-t border-sand-line bg-cream/30 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Selector de Etapa Directa */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-secondary whitespace-nowrap">Mover a:</span>
              <select
                value={candidate.stage}
                onChange={(e) => (e.target.value === 'discarded' ? setDiscardModalOpen(true) : onMoveStage(candidate.id, e.target.value))}
                className="rounded-xl border border-sand-line bg-white px-3 py-2 text-xs font-bold text-ink cursor-pointer focus:border-terracotta focus:outline-none"
              >
                {ATS_STAGES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Acciones Rápidas de Flujo */}
            <div className="flex items-center gap-2 justify-end">
              {candidate.stage !== 'discarded' && (
                <button
                  type="button"
                  onClick={() => setDiscardModalOpen(true)}
                  className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  Descartar
                </button>
              )}

              {candidate.stage === 'review' && (
                <button
                  type="button"
                  onClick={() => onMoveStage(candidate.id, 'preselected')}
                  className="rounded-xl bg-cocoa px-4 py-2 text-xs font-bold text-white hover:bg-cocoa/90 transition-all cursor-pointer shadow-xs"
                >
                  Avanzar a Preselección
                </button>
              )}

              {candidate.stage === 'preselected' && (
                <button
                  type="button"
                  onClick={() => onMoveStage(candidate.id, 'evaluation')}
                  className="rounded-xl bg-cocoa px-4 py-2 text-xs font-bold text-white hover:bg-cocoa/90 transition-all cursor-pointer shadow-xs"
                >
                  Enviar a Prueba Técnica
                </button>
              )}

              {['preselected', 'evaluation'].includes(candidate.stage) && (
                <button
                  type="button"
                  onClick={() => (onScheduleInterview ? onScheduleInterview(candidate) : onMoveStage(candidate.id, 'interview'))}
                  className="rounded-xl bg-cocoa px-4 py-2 text-xs font-bold text-white hover:bg-cocoa/90 transition-all cursor-pointer shadow-xs"
                >
                  Citar a Entrevista
                </button>
              )}

              {candidate.stage === 'interview' && (
                <button
                  type="button"
                  onClick={() => onMoveStage(candidate.id, 'offer')}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-all cursor-pointer shadow-xs"
                >
                  Avanzar a Oferta / Finalista
                </button>
              )}

              {candidate.stage === 'offer' && (
                <button
                  type="button"
                  onClick={() => onMoveStage(candidate.id, 'hired')}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-all cursor-pointer shadow-xs"
                >
                  Confirmar Contratación
                </button>
              )}

              {candidate.stage === 'discarded' && (
                <button
                  type="button"
                  onClick={() => onMoveStage(candidate.id, 'preselected')}
                  className="rounded-xl bg-cocoa px-4 py-2 text-xs font-bold text-white hover:bg-cocoa/90 transition-all cursor-pointer shadow-xs"
                >
                  Reactivar Postulación
                </button>
              )}
            </div>
          </div>
        </footer>

        {/* ─── Modal Confirmar Descarte con Motivo ─── */}
        {discardModalOpen && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-cocoa/70 backdrop-blur-xs animate-in fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="discard-modal-title"
            onClick={() => setDiscardModalOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-sand-line bg-white p-6 shadow-2xl animate-in zoom-in-95 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-rose-600">
                <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-xl">
                  <i className="bx bx-user-x" />
                </span>
                <div>
                  <h3 id="discard-modal-title" className="m-0 font-display text-base font-bold text-ink">
                    Descartar Candidato
                  </h3>
                  <p className="m-0 text-xs text-secondary">
                    {candidate.candidateName} · {candidate.vacancyTitle}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="discard-reason" className="text-xs font-bold text-ink">
                  Motivo principal de descarte
                </label>
                <select
                  id="discard-reason"
                  value={selectedDiscardReason}
                  onChange={(e) => setSelectedDiscardReason(e.target.value)}
                  className="w-full rounded-xl border border-sand-line bg-cream/40 p-2.5 text-xs font-semibold text-ink focus:border-terracotta focus:outline-none cursor-pointer"
                >
                  {DISCARD_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="discard-note" className="text-xs font-bold text-ink">
                  Retroalimentación opcional
                </label>
                <textarea
                  id="discard-note"
                  rows={3}
                  value={discardNote}
                  onChange={(e) => setDiscardNote(e.target.value)}
                  placeholder="Observaciones adicionales sobre por qué no avanzó en esta convocatoria..."
                  className="w-full rounded-xl border border-sand-line bg-cream/30 p-2.5 text-xs text-ink focus:border-terracotta focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDiscardModalOpen(false)}
                  className="rounded-xl border border-sand-line bg-white px-4 py-2 text-xs font-bold text-secondary hover:bg-cream hover:text-ink cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDiscard}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-xs cursor-pointer"
                >
                  Confirmar Descarte
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Visor Integrado de Diploma / Título del Egresado ─── */}
        <DocumentViewerModal
          isOpen={showDiplomaModal}
          onClose={() => setShowDiplomaModal(false)}
          documentUrl={diplomaPdfUrl}
          title={`Título / Diploma — ${candidate.candidateName}`}
          subtitle={`${candidate.program || 'Programa académico'} · ${candidate.institution || 'IES'}`}
          metadata={{
            egresado: candidate.candidateName,
            programa: candidate.program,
            institucion: candidate.institution,
            estado: candidate.degreeVerified ? 'Verificado por la IES' : 'En revisión IES',
            acta: candidate.actaNumber || undefined,
            folio: candidate.bookFolio || undefined,
          }}
        />
      </div>
    </div>
  );
}

