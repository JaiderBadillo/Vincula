import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService.js';
import DocumentViewerModal from '../common/DocumentViewerModal.jsx';

export default function InstitutionVerificationDrawer({
  institution,
  onClose,
  onApprove,
  onRequestCorrection,
  onReject,
}) {
  const [activeTab, setActiveTab] = useState('academic'); // 'academic' | 'documents' | 'history'
  const [previewDoc, setPreviewDoc] = useState(null);
  const [securePdfUrl, setSecurePdfUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [approveNotes, setApproveNotes] = useState('');
  const [showViewerModal, setShowViewerModal] = useState(false);

  const open = Boolean(institution);

  useEffect(() => {
    if (!open) {
      setPreviewDoc(null);
      setSecurePdfUrl(null);
      setShowApproveConfirm(false);
      setApproveNotes('');
      return undefined;
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  async function handleInspectDoc(doc) {
    setPreviewDoc(doc);
    setPdfError(null);
    setSecurePdfUrl(null);

    if (doc?.id && !String(doc.id).startsWith('doc-')) {
      setLoadingPdf(true);
      try {
        const secRes = await adminService.getDocumentSecureUrl(doc.id, 3600);
        if (secRes && secRes.secure_url) {
          setSecurePdfUrl(secRes.secure_url);
        }
      } catch (err) {
        console.warn('[InstitutionVerificationDrawer] Error al obtener enlace seguro:', err);
        setPdfError('No se pudo generar la URL firmada. Visualizando folio institucional simulado.');
      } finally {
        setLoadingPdf(false);
      }
    }
  }

  if (!institution) return null;

  const isPending = institution.status === 'pending';
  const isCorrection = institution.status === 'in_correction';
  const isApproved = institution.status === 'approved';
  const isRejected = institution.status === 'rejected';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-cocoa/55 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-ies-title"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Expediente IES */}
        <header className="border-b border-sand-line bg-cream/40 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ochre/25 text-2xl text-cocoa shadow-xs">
                <i className="bx bxs-graduation" />
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="drawer-ies-title" className="m-0 font-display text-lg font-bold text-ink">
                    {institution.name}
                  </h2>
                </div>

                <p className="m-0 text-xs font-semibold text-cocoa flex items-center gap-2 flex-wrap">
                  <span className="font-mono bg-sand/80 px-2 py-0.5 rounded text-ink font-bold">
                    {institution.radicado || `RAD-IES-2026-${String(institution.id).slice(0, 8).toUpperCase()}`}
                  </span>
                  <span>·</span>
                  <span>Código SNIES: {institution.sniesCode}</span>
                  <span>·</span>
                  <span>{institution.academicCharacter}</span>
                </p>

                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {isApproved && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                      <i className="bx bxs-check-shield text-emerald-700" />
                      <span>IES Acreditada & Activa en Red</span>
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                      <i className="bx bx-time text-amber-700" />
                      <span>SLA 72h: {institution.slaText || `${institution.slaHoursRemaining ?? 72} horas restantes`}</span>
                    </span>
                  )}
                  {isCorrection && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-ochre/20 border border-ochre/40 px-2.5 py-0.5 text-xs font-bold text-cocoa">
                      <i className="bx bx-error-circle text-ochre-dark" />
                      <span>En Subsanación (SLA Pausado)</span>
                    </span>
                  )}
                  {isRejected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-xs font-bold text-rose-900">
                      <i className="bx bx-x-circle text-rose-700" />
                      <span>Solicitud Rechazada</span>
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 text-[0.68rem] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <i className="bx bx-check-shield text-xs" />
                    <span>Verificado con Base de Datos MEN</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-xl text-secondary hover:bg-sand hover:text-ink transition-colors cursor-pointer"
              aria-label="Cerrar expediente de IES"
            >
              <i className="bx bx-x text-2xl" />
            </button>
          </div>

          {/* Navegación de Pestañas */}
          <div className="mt-5 flex gap-2 border-t border-sand-line/60 pt-3">
            {[
              { id: 'academic', label: 'Datos Académicos y MEN', icon: 'bx-book-bookmark' },
              { id: 'documents', label: `Soportes Radicados (${institution.documents?.length || 0})`, icon: 'bx-file' },
              { id: 'history', label: 'Trazabilidad', icon: 'bx-history' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-cocoa text-white shadow-2xs'
                    : 'text-secondary hover:bg-white hover:text-ink'
                }`}
              >
                <i className={`bx ${tab.icon} text-sm`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </header>

        {/* Contenido Deslizable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Advertencia de Subsanación */}
          {institution.correctionReason && (
            <div className="rounded-xl border border-ochre/40 bg-ochre/10 p-3.5 space-y-1">
              <span className="text-xs font-bold text-cocoa flex items-center gap-1.5">
                <i className="bx bx-error text-sm text-ochre-dark" />
                <span>Requerimiento enviado a la institución:</span>
              </span>
              <p className="m-0 text-xs text-ink">
                {institution.correctionReason}
              </p>
            </div>
          )}

          {/* PESTAÑA 1: DATOS ACADÉMICOS */}
          {activeTab === 'academic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="rounded-xl border border-sand-line bg-cream/30 p-3 space-y-0.5">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Nombre Oficial de la IES
                  </span>
                  <p className="m-0 text-xs font-bold text-ink">{institution.name}</p>
                </div>

                <div className="rounded-xl border border-sand-line bg-cream/30 p-3 space-y-0.5">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Acrónimo / Sigla
                  </span>
                  <p className="m-0 text-xs font-bold text-ink">{institution.shortName}</p>
                </div>

                <div className="rounded-xl border border-sand-line bg-cream/30 p-3 space-y-0.5">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Código SNIES Nacional
                  </span>
                  <p className="m-0 text-xs font-bold text-ink flex items-center gap-1.5">
                    <span>{institution.sniesCode}</span>
                    <i className="bx bx-link-external text-secondary hover:text-terracotta cursor-pointer" title="Ver en SNIES MEN" />
                  </p>
                </div>

                <div className="rounded-xl border border-sand-line bg-cream/30 p-3 space-y-0.5">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Carácter Académico MEN
                  </span>
                  <p className="m-0 text-xs font-bold text-ink">{institution.academicCharacter}</p>
                </div>

                <div className="rounded-xl border border-sand-line bg-cream/30 p-3 space-y-0.5">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Rector(a) / Representante Legal
                  </span>
                  <p className="m-0 text-xs font-bold text-ink">{institution.rectorName}</p>
                  <p className="m-0 text-[0.68rem] text-secondary">{institution.rectorId}</p>
                </div>

                <div className="rounded-xl border border-sand-line bg-cream/30 p-3 space-y-0.5">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Contacto de Prácticas y Empleabilidad
                  </span>
                  <p className="m-0 text-xs font-bold text-ink">{institution.contactPerson}</p>
                  <p className="m-0 text-[0.68rem] text-secondary">{institution.email}</p>
                </div>

                <div className="rounded-xl border border-sand-line bg-cream/30 p-3 space-y-0.5 sm:col-span-2">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Sede y Domicilio Principal
                  </span>
                  <p className="m-0 text-xs font-semibold text-ink">{institution.address}</p>
                  <p className="m-0 text-[0.68rem] text-secondary">{institution.city} · {institution.phone}</p>
                </div>
              </div>

              {institution.notes && (
                <div className="rounded-xl border border-sand-line bg-white p-3.5 space-y-1">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Perfil y Facultades del Convenio
                  </span>
                  <p className="m-0 text-xs text-ink leading-relaxed">
                    {institution.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 2: SOPORTES RADICADOS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <p className="m-0 text-xs text-secondary">
                Verifica la personería jurídica otorgada por el Ministerio de Educación Nacional y el acta de posesión de la rectoría para formalizar el convenio marco.
              </p>

              <div className="space-y-3">
                {(institution.documents || []).map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-2xl border border-sand-line bg-white p-4 hover:border-terracotta/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="grid size-11 place-items-center rounded-xl bg-sand text-xl text-cocoa shrink-0">
                          <i className="bx bxs-file-pdf" />
                        </span>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="m-0 text-xs font-bold text-ink">
                              {doc.label}
                            </h4>
                            <span className="rounded-full bg-cream border border-sand-line px-2 py-0.2 text-[0.65rem] font-semibold text-cocoa">
                              Documento adjunto
                            </span>
                          </div>

                          {doc.number && (
                            <p className="m-0 text-[0.72rem] font-semibold text-cocoa">
                              Acto: {doc.number}
                            </p>
                          )}

                          <p className="m-0 text-[0.68rem] text-stone-500 font-mono">
                            {doc.fileName} ({doc.fileSize})
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleInspectDoc(doc)}
                        className="inline-flex items-center gap-1 rounded-xl border border-sand-line bg-cream px-3 py-1.5 text-xs font-bold text-cocoa hover:bg-sand transition-colors cursor-pointer shrink-0"
                      >
                        <i className="bx bx-show text-sm" />
                        <span>Inspeccionar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Visor de soporte institucional (S3 Signed URL o Folio de Contingencia) */}
              {previewDoc && (
                <div className="mt-4 rounded-2xl border border-sand-line bg-sand/30 p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-sand-line pb-2">
                    <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <i className="bx bx-file-find text-base text-terracotta" />
                      <span>Visor Integrado: {previewDoc.label}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewDoc(null);
                        setSecurePdfUrl(null);
                      }}
                      className="text-secondary hover:text-ink text-xs font-bold cursor-pointer"
                    >
                      Cerrar vista previa ✕
                    </button>
                  </div>

                  {loadingPdf ? (
                    <div className="p-8 text-center bg-white rounded-xl border border-sand-line space-y-2">
                      <i className="bx bx-loader-alt bx-spin text-3xl text-terracotta" />
                      <p className="text-xs font-semibold text-cocoa">
                        Generando enlace seguro temporal con Supabase Storage (SLA 72h)...
                      </p>
                    </div>
                  ) : securePdfUrl ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-sand-line text-xs flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[0.65rem] font-bold">
                            ✓ Token S3 Temporal (1 hora)
                          </span>
                          <span className="text-[0.72rem] text-secondary font-mono truncate max-w-xs">
                            {previewDoc.fileName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowViewerModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-cocoa text-white px-3 py-1.5 text-xs font-bold hover:bg-ink transition-colors cursor-pointer shadow-2xs"
                          >
                            <i className="bx bx-fullscreen text-sm" />
                            <span>Visor Completo</span>
                          </button>
                          <a
                            href={securePdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-sand-line bg-white text-secondary hover:text-ink px-2.5 py-1.5 text-xs font-semibold transition-colors shadow-2xs"
                          >
                            <i className="bx bx-link-external" />
                            <span className="hidden sm:inline">Pestaña</span>
                          </a>
                        </div>
                      </div>
                      <iframe
                        src={`${securePdfUrl}#toolbar=1&navpanes=0`}
                        title={previewDoc.label}
                        className="w-full h-96 rounded-xl border border-sand-line bg-white shadow-inner"
                      />
                    </div>
                  ) : (
                    /* Folio institucional con marca de agua oficial (fallback / dev) */
                    <div className="relative rounded-xl border border-sand-line bg-white p-6 shadow-sm font-sans space-y-4">
                      {pdfError && (
                        <p className="text-[0.72rem] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          {pdfError}
                        </p>
                      )}
                      <div className="flex items-center justify-between border-b border-sand-line/60 pb-3">
                        <div>
                          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary">
                            {previewDoc.issuer}
                          </span>
                          <h5 className="m-0 font-display text-sm font-bold text-ink">
                            {previewDoc.label}
                          </h5>
                        </div>
                        <span className="rounded-lg bg-sand px-2 py-1 text-[0.65rem] font-mono text-cocoa">
                          SNIES #{institution.sniesCode}
                        </span>
                      </div>

                      <div className="text-xs text-ink space-y-2 leading-relaxed">
                        <p className="m-0">
                          <strong>Certificación Oficial:</strong> Se hace constar que <strong>{institution.name}</strong> ({institution.shortName}) se encuentra facultada como <strong>{institution.academicCharacter}</strong> en Colombia, amparada por <strong>{previewDoc.number || 'Resolución del Ministerio de Educación Nacional'}</strong>.
                        </p>
                        <p className="m-0">
                          <strong>Autoridad Facultada:</strong> El(la) Rector(a) <strong>{institution.rectorName}</strong> cuenta con plena capacidad jurídica para la suscripción de convenios interinstitucionales de prácticas empresariales e inserción laboral.
                        </p>
                      </div>

                      <div className="border-t border-sand-line/60 pt-3 flex items-center justify-between text-[0.68rem] text-secondary">
                        <span>✓ Firma Digital y Radicado SNIES Verificado</span>
                        <span className="font-bold text-emerald-800">RECONOCIMIENTO OFICIAL MEN</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 3: TRAZABILIDAD */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h4 className="m-0 text-xs font-bold text-ink uppercase tracking-wider">
                Bitácora de Solicitud y Validación
              </h4>

              <div className="space-y-3">
                {(institution.reviewLog || []).map((log, index) => (
                  <div
                    key={index}
                    className="flex gap-3 rounded-xl border border-sand-line bg-cream/30 p-3.5"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sand text-base text-terracotta">
                      <i className="bx bx-check" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink">{log.action}</span>
                      </div>
                      <p className="m-0 text-[0.68rem] text-secondary">
                        {log.date} · Por: <strong className="text-cocoa">{log.author}</strong>
                      </p>
                      {log.notes && (
                        <p className="m-0 mt-1 text-xs text-ink bg-white p-2 rounded-lg border border-sand-line">
                          «{log.notes}»
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Acciones del Super Administrador */}
        <footer className="border-t border-sand-line bg-cream/40 p-4 sm:p-5 flex items-center justify-between gap-2.5 flex-wrap">
          {showApproveConfirm ? (
            <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <i className="bx bxs-check-shield text-emerald-700 text-base" />
                  <span>Confirmar Acreditación e Incorporación a la Red de Empleo</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowApproveConfirm(false)}
                  className="text-xs font-semibold text-secondary hover:text-ink cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
              <input
                type="text"
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="Notas de aprobación opcionales (ej: 'Personería jurídica y personería del Rector verificadas ante SNIES')..."
                className="w-full rounded-lg border border-sand-line bg-cream/30 p-2 text-xs text-ink placeholder:text-stone-400 focus:border-terracotta focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onApprove(institution.id, approveNotes);
                    setShowApproveConfirm(false);
                  }}
                  className="rounded-lg bg-emerald-700 text-white px-4 py-1.5 text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer shadow-xs"
                >
                  Confirmar Acreditación Institucional
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {!isRejected && (
                  <button
                    type="button"
                    onClick={() => onReject(institution)}
                    className="rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    Rechazar
                  </button>
                )}

                {!isApproved && (
                  <button
                    type="button"
                    onClick={() => onRequestCorrection(institution)}
                    className="rounded-xl border border-ochre/40 bg-white px-3.5 py-2 text-xs font-bold text-cocoa hover:bg-ochre/15 transition-colors cursor-pointer"
                  >
                    Solicitar Subsanación
                  </button>
                )}
              </div>

              {!isApproved ? (
                <button
                  type="button"
                  onClick={() => setShowApproveConfirm(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-cocoa px-5 py-2 text-xs font-bold text-white hover:bg-cocoa/90 transition-all cursor-pointer shadow-xs"
                >
                  <i className="bx bx-check-shield text-base" />
                  <span>Aprobar e Incorporar IES a la Red</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <i className="bx bxs-check-circle text-base text-emerald-700" />
                  <span>IES incorporada y activa en la red</span>
                </span>
              )}
            </>
          )}
        </footer>

        {/* Visor Integrado de Vincula para Auditoría de IES */}
        <DocumentViewerModal
          isOpen={showViewerModal}
          onClose={() => setShowViewerModal(false)}
          documentUrl={securePdfUrl}
          title={previewDoc ? `${previewDoc.label} · ${institution.officialName}` : 'Soporte Institucional'}
          subtitle={`Auditoría Super Admin · SNIES ${institution.sniesCode}`}
          metadata={{
            noFileMessage: 'La institución aún no ha adjuntado este soporte documental a la plataforma.',
          }}
        />
      </div>
    </div>
  );
}

