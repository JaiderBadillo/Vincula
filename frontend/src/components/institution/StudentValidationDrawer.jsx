import { useState, useEffect } from 'react';
import { institutionService } from '../../services/institutionService.js';

export default function StudentValidationDrawer({
  isOpen,
  onClose,
  student,
  onApprove,
  onOpenObservation,
  onViewDocument,
}) {
  const [activeTab, setActiveTab] = useState('expediente'); // 'expediente' | 'visor_pdf'
  const [securePdfUrl, setSecurePdfUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  // Campos de validación y Sello Digital
  const [actaNumber, setActaNumber] = useState('');
  const [bookFolio, setBookFolio] = useState('');
  const [degreeDate, setDegreeDate] = useState('');
  const [validationNotes, setValidationNotes] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);

  useEffect(() => {
    if (!isOpen || !student) {
      setSecurePdfUrl(null);
      setPdfError(null);
      setActiveTab('expediente');
      setSubmittingApproval(false);
      return;
    }

    // Inicializar valores desde el estudiante o defaults
    const match = student.academicMatch || {};
    setActaNumber(
      student.numero_acta_grado ||
      match.diplomaNumber ||
      `ACTA-${new Date().getFullYear()}-${String(student.documentId || '').replace(/\D/g, '').slice(-4) || '0842'}`
    );
    setBookFolio(
      student.numero_libro_folio ||
      match.bookFolio ||
      `Libro 48, Folio ${String(student.documentId || '').replace(/\D/g, '').slice(-3) || '112'}`
    );
    setDegreeDate(
      student.fecha_grado ||
      `${student.graduationYear || new Date().getFullYear()}-12-15`
    );
    setValidationNotes('');
    setPdfError(null);
    setSecurePdfUrl(null);
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const match = student.academicMatch || {
    status: student.validado_por_ies || student.status === 'approved' ? 'verified' : 'pending',
    label: student.validado_por_ies || student.status === 'approved' ? '100% Coincidente en SIGA' : 'Pendiente de Cotejo Institucional',
  };
  const matchOk = match.status === 'verified' || student.validado_por_ies || student.status === 'approved';
  const isPending = student.status === 'pending' || student.estado_verificacion === 'pendiente';
  const isApproved = student.status === 'approved' || student.estado_verificacion === 'aprobado';
  const isRejected = student.status === 'rejected' || student.estado_verificacion === 'rechazado';

  async function handleLoadSecurePdf() {
    setActiveTab('visor_pdf');
    if (securePdfUrl) return;

    setLoadingPdf(true);
    setPdfError(null);

    const targetId = student.id_academico || student.id;
    try {
      const res = await institutionService.getDiplomaSecureUrl(targetId, 3600);
      if (res && res.url_segura) {
        setSecurePdfUrl(res.url_segura);
      } else {
        setPdfError('No se recibió la URL firmada del servidor.');
      }
    } catch (err) {
      console.warn('[StudentValidationDrawer] Error cargando URL firmada:', err);
      // Si el egresado tiene una URL directa o simulada, fallback
      if (student.url_diploma_pdf) {
        setSecurePdfUrl(student.url_diploma_pdf);
      } else {
        setPdfError(err.message || 'No fue posible generar la URL temporal de Supabase Storage.');
      }
    } finally {
      setLoadingPdf(false);
    }
  }

  async function handleConfirmApprove(e) {
    if (e) e.preventDefault();
    if (!actaNumber.trim()) {
      alert('Por favor digita el número de acta oficial de grado.');
      return;
    }

    setSubmittingApproval(true);
    try {
      await onApprove(student.id_academico || student.id, {
        numero_acta_grado: actaNumber.trim(),
        numero_libro_folio: bookFolio.trim() || undefined,
        fecha_grado: degreeDate || undefined,
        observaciones: validationNotes.trim() || undefined,
      });
    } finally {
      setSubmittingApproval(false);
    }
  }

  const docs = student.documentsAttached || [
    {
      id: 'doc-diploma',
      name: student.nombre_archivo_diploma || 'Diploma_Oficial_Grado.pdf',
      size: '2.4 MB',
      type: 'diploma',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-ink/40 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-drawer-title"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Drawer */}
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
          <div className="flex min-w-0 items-center gap-3.5">
            {student.avatar ? (
              <img src={student.avatar} alt="" className="size-14 shrink-0 rounded-full object-cover border border-line" />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-panel text-base font-bold text-ink">
                {(student.studentName || student.nombre_completo || 'EG')
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="student-drawer-title" className="m-0 font-display text-lg font-bold text-ink truncate">
                  {student.studentName || student.nombre_completo}
                </h2>
                {isApproved && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[0.68rem] font-bold">
                    <i className="bx bxs-badge-check text-xs text-emerald-600" />
                    <span>Sello Activo</span>
                  </span>
                )}
                {isRejected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 text-[0.68rem] font-bold">
                    <i className="bx bx-error-circle text-xs text-amber-600" />
                    <span>Observado</span>
                  </span>
                )}
              </div>
              <p className="m-0 mt-0.5 text-xs text-secondary truncate">
                {student.program || student.carrera || student.nombre_programa} · Grado {student.graduationYear || student.ano_graduacion} ({student.graduationPeriod || student.periodo_graduacion || 'Oficial'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-secondary hover:bg-panel hover:text-ink cursor-pointer transition-colors"
            aria-label="Cerrar"
          >
            <i className="bx bx-x text-2xl" />
          </button>
        </div>

        {/* Pestañas de Navegación Interna */}
        <div className="flex border-b border-line bg-page px-6 gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('expediente')}
            className={`py-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'expediente'
                ? 'border-ink text-ink font-bold'
                : 'border-transparent text-secondary hover:text-ink'
            }`}
          >
            <i className="bx bx-id-card mr-1.5" />
            <span>Expediente Académico</span>
          </button>
          <button
            type="button"
            onClick={handleLoadSecurePdf}
            className={`py-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'visor_pdf'
                ? 'border-ink text-ink font-bold'
                : 'border-transparent text-secondary hover:text-ink'
            }`}
          >
            <i className="bx bxs-file-pdf mr-1.5 text-terracotta" />
            <span>Visor Seguro Diploma (Supabase)</span>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {activeTab === 'visor_pdf' ? (
            /* ================= VISOR SEGURO DE DIPLOMA ================= */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="m-0 text-sm font-bold text-ink flex items-center gap-1.5">
                    <i className="bx bxs-lock-alt text-emerald-700" />
                    <span>Diploma Oficial Resguardado en Supabase Storage</span>
                  </h3>
                  <p className="m-0 text-[0.7rem] text-secondary">
                    URL firmada temporal con expiración criptográfica de 3600 segundos (1 hora).
                  </p>
                </div>
                {securePdfUrl && (
                  <a
                    href={securePdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-xs font-bold transition-colors no-underline cursor-pointer shadow-xs"
                  >
                    <i className="bx bx-link-external" />
                    <span>Abrir en pestaña</span>
                  </a>
                )}
              </div>

              {loadingPdf ? (
                <div className="h-80 flex flex-col items-center justify-center rounded-xl border border-line bg-page text-secondary text-sm">
                  <i className="bx bx-loader-alt bx-spin text-3xl text-ink mb-2" />
                  <span>Obteniendo enlace firmado desde Supabase Storage...</span>
                </div>
              ) : securePdfUrl ? (
                <iframe
                  src={`${securePdfUrl}#toolbar=1&navpanes=0`}
                  title="Diploma Egresado"
                  className="w-full h-96 rounded-xl border border-line bg-white shadow-inner"
                />
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
                  <p className="m-0 font-bold flex items-center gap-1.5">
                    <i className="bx bx-info-circle text-base text-amber-700" />
                    <span>{pdfError || 'Documento en simulación local'}</span>
                  </p>
                  <p className="m-0 text-amber-800">
                    El egresado radicó el archivo soporte <strong>{student.nombre_archivo_diploma || 'Diploma_Oficial.pdf'}</strong>. Puedes aprobar o solicitar corrección si requieres nuevo PDF.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ================= PESTAÑA EXPEDIENTE ================= */
            <>
              {/* Alerta de Observación Previa si fue rechazado */}
              {isRejected && (student.observationNotes || student.motivo_rechazo) && (
                <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50 p-4 text-xs text-amber-950 space-y-1">
                  <p className="m-0 font-bold flex items-center gap-1.5">
                    <i className="bx bx-message-error text-amber-700 text-base" />
                    <span>Observación Formal Radicada:</span>
                  </p>
                  <p className="m-0 text-amber-900 leading-relaxed font-sans">
                    {student.observationNotes || student.motivo_rechazo}
                  </p>
                </div>
              )}

              {/* Sello Digital Expedido (si ya está aprobado) */}
              {isApproved && (student.sello_digital || student.selloDigital) && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <i className="bx bxs-shield-check text-emerald-700 text-base" />
                      <span>Sello Digital Institucional Expedido</span>
                    </span>
                    <span className="text-[0.65rem] font-bold text-emerald-800 bg-emerald-200/80 rounded px-1.5 py-0.5">
                      SHA-256
                    </span>
                  </div>
                  <p className="m-0 font-mono text-[0.68rem] text-emerald-900 bg-white/90 p-2 rounded-lg border border-emerald-200 break-all select-all">
                    {student.sello_digital || student.selloDigital}
                  </p>
                  <div className="flex items-center justify-between text-[0.7rem] text-emerald-900 pt-1">
                    <span>Acta: <strong>{student.numero_acta_grado || student.academicMatch?.bookFolio || 'N/A'}</strong></span>
                    <span>Libro/Folio: <strong>{student.numero_libro_folio || 'Oficial'}</strong></span>
                  </div>
                </div>
              )}

              {/* Cotejo Académico con el Sistema de Admisiones */}
              <section className="space-y-2">
                <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary">
                  Cotejo de Registro Académico (SIGA / SNIES)
                </h3>
                <div className="rounded-xl border border-line bg-page p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                      matchOk ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      <i className={`bx ${matchOk ? 'bxs-check-circle' : 'bxs-error-circle'} text-base`} />
                      <span>{match.label || 'Registro Cotejado'}</span>
                    </span>
                    <span className="text-[0.68rem] font-mono font-bold text-secondary">
                      SNIES: {student.codigo_snies || '103241'}
                    </span>
                  </div>
                  {match.discrepancyNote && (
                    <p className="m-0 text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                      {match.discrepancyNote}
                    </p>
                  )}
                  {student.promedio_ponderado && (
                    <p className="m-0 text-xs text-ink">
                      Promedio acumulado de grado: <strong>{student.promedio_ponderado} / 5.0</strong>
                    </p>
                  )}
                </div>
              </section>

              {/* Datos Personales y de Identidad */}
              <section className="space-y-2">
                <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary">
                  Información del Egresado
                </h3>
                <dl className="m-0 grid grid-cols-[8rem_1fr] gap-y-2 text-xs border border-line rounded-xl p-3.5 bg-white">
                  <dt className="text-secondary font-medium">Documento de Identidad:</dt>
                  <dd className="m-0 font-bold text-ink">
                    {student.documentType || student.tipo_documento || 'CC'} {student.documentId || student.numero_documento}
                  </dd>

                  <dt className="text-secondary font-medium">Código Estudiantil:</dt>
                  <dd className="m-0 text-ink">{student.studentCode || student.codigo_estudiantil || 'N/A'}</dd>

                  <dt className="text-secondary font-medium">Correo Electrónico:</dt>
                  <dd className="m-0 truncate text-ink">{student.email || student.correo_personal || 'N/A'}</dd>

                  <dt className="text-secondary font-medium">Teléfono de Contacto:</dt>
                  <dd className="m-0 text-ink">{student.phone || student.telefono || 'N/A'}</dd>

                  <dt className="text-secondary font-medium">Nivel de Formación:</dt>
                  <dd className="m-0 text-ink">{student.degreeLevel || student.nivel_formacion || 'Profesional Universitario'}</dd>
                </dl>
              </section>

              {/* Documentos Adjuntos */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary">
                    Documentos Oficiales Radicados
                  </h3>
                  <button
                    type="button"
                    onClick={handleLoadSecurePdf}
                    className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <i className="bx bx-show" />
                    <span>Ver Diploma en Storage</span>
                  </button>
                </div>
                <ul className="m-0 list-none divide-y divide-line rounded-xl border border-line bg-white p-0">
                  {docs.map((doc, idx) => (
                    <li key={doc.id || idx} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-2.5 truncate">
                        <i className="bx bxs-file-pdf text-xl text-terracotta shrink-0" />
                        <span className="truncate text-xs font-semibold text-ink">{doc.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewDocument) onViewDocument(doc);
                            handleLoadSecurePdf();
                          }}
                          className="rounded-lg bg-page hover:bg-panel text-ink px-2.5 py-1 text-xs font-bold cursor-pointer border border-line transition-colors"
                        >
                          Inspeccionar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Formulario de Aprobación Formal cuando está pendiente */}
              {isPending && (
                <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                  <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                    <i className="bx bxs-certification text-emerald-700 text-sm" />
                    <span>Datos de Certificación para el Sello Digital</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-ink mb-1">
                        Número de Acta de Grado <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={actaNumber}
                        onChange={(e) => setActaNumber(e.target.value)}
                        placeholder="Ej: ACTA-2026-4892"
                        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink outline-none focus:border-ink font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-ink mb-1">
                        Libro y Folio de Registro
                      </label>
                      <input
                        type="text"
                        value={bookFolio}
                        onChange={(e) => setBookFolio(e.target.value)}
                        placeholder="Ej: Libro 48, Folio 112"
                        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink outline-none focus:border-ink"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-ink mb-1">
                        Fecha Oficial de Otorgamiento
                      </label>
                      <input
                        type="date"
                        value={degreeDate}
                        onChange={(e) => setDegreeDate(e.target.value)}
                        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink outline-none focus:border-ink"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-ink mb-1">
                        Notas de Secretaría General
                      </label>
                      <input
                        type="text"
                        value={validationNotes}
                        onChange={(e) => setValidationNotes(e.target.value)}
                        placeholder="Opcional (ej: Con Mención de Honor)"
                        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink outline-none focus:border-ink"
                      />
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer: Acciones del Auditor IES */}
        {isPending && (
          <div className="flex items-center justify-between border-t border-line bg-page px-6 py-4">
            <button
              type="button"
              onClick={() => onOpenObservation(student)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-secondary hover:text-ink hover:bg-panel cursor-pointer transition-colors shadow-2xs"
            >
              <i className="bx bx-message-error text-base text-amber-600" />
              <span>Pedir Corrección</span>
            </button>

            <button
              type="button"
              disabled={submittingApproval}
              onClick={handleConfirmApprove}
              className="inline-flex items-center gap-2 rounded-xl bg-ink hover:bg-ink-soft text-white px-5 py-2.5 text-xs font-bold cursor-pointer transition-all shadow-xs disabled:opacity-50"
            >
              {submittingApproval ? (
                <>
                  <i className="bx bx-loader-alt bx-spin text-sm" />
                  <span>Emitiendo Sello Digital...</span>
                </>
              ) : (
                <>
                  <i className="bx bxs-check-shield text-lime text-base" />
                  <span>Validar Título y Otorgar Sello</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
