import { useState, useEffect } from 'react';

function getInitials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

const PHASES = [
  { step: 1, label: 'Aplicación', shortDesc: 'HV Radicada' },
  { step: 2, label: 'Selección', shortDesc: 'Filtro Técnico' },
  { step: 3, label: 'Entrevista', shortDesc: 'Evaluación' },
  { step: 4, label: 'Contratado', shortDesc: 'Vinculación' },
];

function PhaseStepper({ currentPhase, outcome }) {
  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between">
        {PHASES.map((phase, idx) => {
          const isCompleted = currentPhase >= phase.step;
          const isCurrent = currentPhase === phase.step;
          const isFinalHired = phase.step === 4 && outcome === 'hired';

          return (
            <div key={phase.step} className="flex flex-1 items-center">
              {/* Step Circle & Label */}
              <div className="flex flex-col items-center">
                <span
                  className={`grid size-7 place-items-center rounded-full text-xs font-bold transition-all ${
                    isFinalHired
                      ? 'bg-emerald-600 text-white shadow-xs ring-4 ring-emerald-100'
                      : isCompleted
                      ? 'bg-green-dark text-white shadow-xs'
                      : 'border border-line bg-panel text-secondary'
                  } ${isCurrent && !isFinalHired ? 'ring-3 ring-lime/40' : ''}`}
                >
                  {isCompleted ? (
                    <i className="bx bx-check text-sm font-black" />
                  ) : (
                    phase.step
                  )}
                </span>
                <span
                  className={`mt-1 text-[0.62rem] font-semibold text-center leading-tight ${
                    isCompleted ? 'text-ink' : 'text-secondary'
                  }`}
                >
                  {phase.label}
                </span>
              </div>

              {/* Connecting line between steps */}
              {idx < PHASES.length - 1 && (
                <div
                  className={`mx-1.5 h-1 flex-1 rounded-full transition-colors ${
                    currentPhase > phase.step ? 'bg-green' : 'bg-line'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StudentTrackingDrawer({ isOpen, onClose, student }) {
  const [advisorNote, setAdvisorNote] = useState('');
  const [savedNotes, setSavedNotes] = useState([]);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  // Cargar notas guardadas en localStorage para este estudiante
  useEffect(() => {
    if (!student) return;
    try {
      const stored = localStorage.getItem(`vincula.advisornotes.${student.id}`);
      if (stored) {
        setSavedNotes(JSON.parse(stored));
      } else {
        setSavedNotes([]);
      }
    } catch {
      setSavedNotes([]);
    }
  }, [student]);

  // Manejo de tecla Escape para cerrar
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !student) return null;

  function handleSaveNote(e) {
    e.preventDefault();
    if (!advisorNote.trim()) return;

    const newNote = {
      id: `note-${Date.now()}`,
      author: 'Dra. Claudia Gómez (Asesora IES)',
      date: new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date()),
      text: advisorNote.trim(),
    };

    const updated = [newNote, ...savedNotes];
    setSavedNotes(updated);
    setAdvisorNote('');

    try {
      localStorage.setItem(`vincula.advisornotes.${student.id}`, JSON.stringify(updated));
    } catch {
      // safe fallback
    }

    setNoteSavedFeedback(true);
    setTimeout(() => setNoteSavedFeedback(false), 2600);
  }

  const isEmployed = student.status === 'employed';
  const totalApps = student.applications.length;
  const hiredApps = student.applications.filter((a) => a.outcome === 'hired').length;
  const inProgressApps = student.applications.filter((a) => a.outcome === 'in_progress').length;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tracking-drawer-title"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl transition-transform duration-200 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Encabezado del Expediente 360° ─── */}
        <div className="flex items-start justify-between border-b border-line px-6 py-5 bg-page/40">
          <div className="flex min-w-0 items-center gap-3.5">
            {student.avatar ? (
              <img
                src={student.avatar}
                alt={student.studentName}
                className="size-14 shrink-0 rounded-full object-cover border-2 border-line shadow-xs"
              />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-green/10 text-green-dark text-lg font-bold border border-green/20">
                {getInitials(student.studentName)}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold uppercase tracking-wider text-green-dark">
                  <i className="bx bx-check-shield text-xs" />
                  Expediente Laboral 360°
                </span>
                <span className="text-xs text-secondary">
                  Cód: {student.studentCode}
                </span>
              </div>
              <h2 id="tracking-drawer-title" className="m-0 font-display text-lg sm:text-xl font-bold text-ink truncate">
                {student.studentName}
              </h2>
              <p className="m-0 text-xs sm:text-sm text-secondary truncate">
                {student.program} · Graduación {student.graduationPeriod}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-secondary hover:bg-page hover:text-ink transition-colors cursor-pointer border border-line"
            aria-label="Cerrar expediente"
          >
            <i className="bx bx-x text-2xl" />
          </button>
        </div>

        {/* ─── Contenido con Scroll ─── */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 scrollbar-none">
          {/* Ficha Resumen Rápida: Contacto & Datos Académicos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl border border-line bg-page/50 p-3.5 text-xs">
            <div>
              <span className="block text-[0.65rem] font-bold uppercase text-secondary">Identificación</span>
              <span className="font-semibold text-ink">{student.documentType} {student.documentId}</span>
            </div>
            <div>
              <span className="block text-[0.65rem] font-bold uppercase text-secondary">Promedio SIGA</span>
              <span className="font-bold text-green-dark">{student.gpa}</span>
            </div>
            <div>
              <span className="block text-[0.65rem] font-bold uppercase text-secondary">Sede</span>
              <span className="font-medium text-ink truncate block">{student.campus.split('·')[0]}</span>
            </div>
            <div>
              <span className="block text-[0.65rem] font-bold uppercase text-secondary">Teléfono</span>
              <a href={`tel:${student.phone}`} className="font-medium text-ink hover:underline truncate block">
                {student.phone}
              </a>
            </div>
          </div>

          {/* ─── Estado Laboral Actual ─── */}
          <section aria-labelledby="section-current-employment">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 id="section-current-employment" className="m-0 font-display text-sm font-bold uppercase tracking-wider text-secondary">
                Estado Laboral Actual
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  isEmployed
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    isEmployed ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
                  }`}
                />
                {isEmployed ? 'Contratado / Empleado' : 'En Búsqueda Activa'}
              </span>
            </div>

            {isEmployed ? (
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-white p-5 shadow-xs space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`grid size-11 place-items-center rounded-xl text-base font-bold shadow-xs ${student.employmentDetails.companyLogoBg}`}>
                      {student.employmentDetails.companyLogoInitials}
                    </span>
                    <div>
                      <h4 className="m-0 font-display text-base font-bold text-ink">
                        {student.employmentDetails.jobTitle}
                      </h4>
                      <p className="m-0 text-xs text-secondary font-medium mt-0.5">
                        {student.employmentDetails.company} · NIT: {student.employmentDetails.companyNit}
                      </p>
                      <span className="inline-block mt-1 text-[0.68rem] text-secondary bg-panel px-2 py-0.2 rounded font-medium">
                        {student.employmentDetails.companySector}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-emerald-100 text-xs">
                  <div>
                    <span className="block text-[0.65rem] uppercase font-bold text-secondary">Modalidad</span>
                    <span className="font-semibold text-ink">{student.employmentDetails.modality}</span>
                  </div>
                  <div>
                    <span className="block text-[0.65rem] uppercase font-bold text-secondary">Contrato</span>
                    <span className="font-semibold text-ink">{student.employmentDetails.contractType}</span>
                  </div>
                  <div>
                    <span className="block text-[0.65rem] uppercase font-bold text-secondary">Vinculación</span>
                    <span className="font-semibold text-ink">{student.employmentDetails.startDate}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-100 text-[0.7rem] text-secondary">
                  <span className="flex items-center gap-1 font-medium text-emerald-800">
                    <i className="bx bxs-badge-check text-base text-emerald-600" />
                    Inserción formal validada por convenio institucional
                  </span>
                  <span>Actualizado: {student.employmentDetails.lastStatusUpdate}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-white p-5 shadow-xs space-y-3.5">
                <div>
                  <h4 className="m-0 font-display text-base font-bold text-amber-950">
                    Egresado Disponible para Inserción Laboral
                  </h4>
                  <p className="m-0 text-xs text-body-muted mt-1 leading-relaxed">
                    {student.seekingDetails.notes}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-amber-100 text-xs">
                  <span className="block text-[0.68rem] uppercase font-bold text-secondary">
                    Cargos de Interés Principal:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {student.seekingDetails.targetRoles.map((role) => (
                      <span
                        key={role}
                        className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-amber-100 text-xs">
                  <div>
                    <span className="block text-[0.65rem] uppercase font-bold text-secondary">Búsqueda desde</span>
                    <span className="font-semibold text-ink">{student.seekingDetails.seekingSince}</span>
                  </div>
                  <div>
                    <span className="block text-[0.65rem] uppercase font-bold text-secondary">Aspiración</span>
                    <span className="font-semibold text-ink">{student.seekingDetails.salaryExpectation}</span>
                  </div>
                  <div>
                    <span className="block text-[0.65rem] uppercase font-bold text-secondary">Disponibilidad</span>
                    <span className="font-semibold text-emerald-700 font-bold">Inmediata</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ─── Informe Detallado de Postulaciones y Fases ─── */}
          <section aria-labelledby="section-applications-history" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 id="section-applications-history" className="m-0 font-display text-sm font-bold uppercase tracking-wider text-secondary">
                  Historial de Postulaciones en Plataforma
                </h3>
                <p className="m-0 text-xs text-secondary mt-0.5">
                  Trazabilidad de fases de selección y retroalimentación empresarial
                </p>
              </div>

              {/* Badges de conteo */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="rounded-lg bg-panel px-2.5 py-1 font-bold text-ink">
                  {totalApps} {totalApps === 1 ? 'postulación' : 'postulaciones'}
                </span>
                {hiredApps > 0 && (
                  <span className="rounded-lg bg-emerald-100 border border-emerald-300 px-2 py-1 font-bold text-emerald-800">
                    {hiredApps} contratado
                  </span>
                )}
                {inProgressApps > 0 && (
                  <span className="rounded-lg bg-lime/25 border border-lime/60 px-2 py-1 font-bold text-ink">
                    {inProgressApps} activas
                  </span>
                )}
              </div>
            </div>

            {/* Listado de Postulaciones con Stepper */}
            <div className="space-y-4">
              {student.applications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-xs space-y-3 transition-all hover:border-green/30"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <h4 className="m-0 font-display text-sm sm:text-base font-bold text-ink">
                        {app.jobTitle}
                      </h4>
                      <p className="m-0 text-xs text-secondary font-medium mt-0.5 flex items-center gap-1.5">
                        <i className="bx bx-buildings text-secondary" />
                        <strong>{app.company}</strong> · Postulado el {app.appliedDate}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 self-start rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${
                        app.outcome === 'hired'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : app.outcome === 'in_progress'
                          ? 'bg-lime/25 text-ink border border-lime/60'
                          : 'bg-page text-secondary border border-line'
                      }`}
                    >
                      {app.outcome === 'hired' && <i className="bx bx-check-double text-xs" />}
                      {app.outcome === 'in_progress' && <i className="bx bx-time text-xs" />}
                      {app.phaseLabel}
                    </span>
                  </div>

                  {/* Stepper de 4 fases */}
                  <div className="rounded-xl bg-page/60 p-3 border border-line-soft">
                    <p className="m-0 text-[0.62rem] font-bold uppercase tracking-wider text-secondary mb-1">
                      Fase máxima alcanzada en el proceso de selección:
                    </p>
                    <PhaseStepper currentPhase={app.currentPhase} outcome={app.outcome} />
                  </div>

                  {/* Retroalimentación empresarial */}
                  {app.notes && (
                    <div className="rounded-xl border border-line-soft bg-page/40 p-3 text-xs">
                      <div className="flex items-center justify-between text-[0.68rem] text-secondary font-semibold mb-1">
                        <span className="flex items-center gap-1">
                          <i className="bx bx-comment-detail text-green" />
                          Retroalimentación del Empleador:
                        </span>
                        <span>{app.feedbackDate}</span>
                      </div>
                      <p className="m-0 text-xs text-ink/90 leading-relaxed italic">
                        "{app.notes}"
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ─── Bitácora de Acompañamiento del Asesor IES ─── */}
          <section aria-labelledby="section-adviser-notes" className="space-y-3 pt-2">
            <h3 id="section-adviser-notes" className="m-0 font-display text-sm font-bold uppercase tracking-wider text-secondary">
              Bitácora de Seguimiento y Notas del Asesor
            </h3>

            <form onSubmit={handleSaveNote} className="space-y-2">
              <label htmlFor="advisor-note-input" className="sr-only">
                Registrar observación o compromiso de seguimiento
              </label>
              <textarea
                id="advisor-note-input"
                rows={2}
                value={advisorNote}
                onChange={(e) => setAdvisorNote(e.target.value)}
                placeholder="Escribe una observación, compromiso de asesoría vocacional o contacto telefónico realizado..."
                className="w-full rounded-xl border border-line bg-page/40 p-3 text-xs text-ink placeholder:text-secondary focus:border-green focus:bg-white focus:outline-none transition-all resize-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-[0.7rem] text-secondary">
                  {noteSavedFeedback && (
                    <span className="font-bold text-green-dark flex items-center gap-1">
                      <i className="bx bx-check-circle" /> Nota registrada con éxito
                    </span>
                  )}
                </span>
                <button
                  type="submit"
                  disabled={!advisorNote.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ink text-white px-3.5 py-2 text-xs font-bold transition-all hover:bg-ink/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <i className="bx bx-save text-sm" />
                  <span>Guardar Nota en Expediente</span>
                </button>
              </div>
            </form>

            {/* Listado de notas previas */}
            {savedNotes.length > 0 && (
              <div className="space-y-2 pt-2">
                {savedNotes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-line-soft bg-page/30 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[0.65rem] text-secondary">
                      <span className="font-bold text-ink">{note.author}</span>
                      <span>{note.date}</span>
                    </div>
                    <p className="m-0 text-xs text-ink/90 leading-relaxed">
                      {note.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ─── Footer con Acciones Directas ─── */}
        <div className="flex items-center justify-between border-t border-line bg-page/40 px-6 py-4">
          <div className="flex items-center gap-2">
            <a
              href={`mailto:${student.email}?subject=Seguimiento%20Laboral%20Institucional%20-%20Bolsa%20de%20Empleo&body=Estimado(a)%20${encodeURIComponent(student.studentName)},%0A%0ATe%20escribimos%20desde%20la%20Coordinaci%C3%B3n%20de%20Egresados...`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink hover:border-green hover:text-green-dark transition-colors no-underline shadow-xs"
            >
              <i className="bx bx-envelope text-sm" />
              <span>Enviar Correo</span>
            </a>
            <a
              href={`https://wa.me/57${student.phone.replace(/[^0-9]/g, '').slice(-10)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:border-emerald-400 transition-colors no-underline shadow-xs"
            >
              <i className="bx bxl-whatsapp text-sm text-emerald-600" />
              <span>WhatsApp</span>
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-panel px-4 py-2 text-xs font-bold text-ink hover:bg-line transition-colors cursor-pointer"
          >
            Cerrar Expediente
          </button>
        </div>
      </div>
    </div>
  );
}
