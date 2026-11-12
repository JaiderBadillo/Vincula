import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService.js';
import DocumentViewerModal from '../common/DocumentViewerModal.jsx';

export default function CompanyVerificationDrawer({
  company,
  onClose,
  onApprove,
  onRequestCorrection,
  onReject,
}) {
  const [activeTab, setActiveTab] = useState('legal'); // 'legal' | 'documents' | 'history'
  const [previewDoc, setPreviewDoc] = useState(null);
  const [securePdfUrl, setSecurePdfUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [approveNotes, setApproveNotes] = useState('');
  const [showViewerModal, setShowViewerModal] = useState(false);

  const open = Boolean(company);

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

    if (doc?.id && doc?.urlArchivo && !String(doc.id).startsWith('doc-')) {
      setLoadingPdf(true);
      try {
        const secRes = await adminService.getDocumentSecureUrl(doc.id, 3600);
        if (secRes && secRes.secure_url) {
          setSecurePdfUrl(secRes.secure_url);
        } else {
          setPdfError('El servidor no devolvió un enlace al archivo original.');
        }
      } catch (err) {
        console.warn('[CompanyVerificationDrawer] Error al obtener enlace seguro:', err);
        setPdfError('No se pudo abrir el archivo original. Solicita que se vuelva a cargar.');
      } finally {
        setLoadingPdf(false);
      }
    } else {
      setPdfError('No hay archivo original disponible para este documento.');
    }
  }

  if (!company) return null;

  const isPending = company.status === 'pending';
  const isCorrection = company.status === 'in_correction';
  const isApproved = company.status === 'approved';
  const isRejected = company.status === 'rejected';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-cocoa/55 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-company-title"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Expediente */}
        <header className="border-b border-sand-line bg-cream/40 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-sand text-2xl text-terracotta shadow-xs">
                <i className="bx bxs-business" />
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="drawer-company-title" className="m-0 font-display text-lg font-bold text-ink">
                    {company.businessName}
                  </h2>
                </div>

                <p className="m-0 text-xs font-semibold text-cocoa flex items-center gap-2 flex-wrap">
                  <span className="font-mono bg-sand/80 px-2 py-0.5 rounded text-ink font-bold">
                    {company.radicado || `RAD-EMP-2026-${String(company.id).slice(0, 8).toUpperCase()}`}
                  </span>
                  <span>·</span>
                  <span>NIT: {company.nit}</span>
                  <span>·</span>
                  <span>{company.city}</span>
                </p>

                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {isApproved && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                      <i className="bx bxs-check-shield text-emerald-700" />
                      <span>Empresa Verificada & Activa</span>
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                      <i className="bx bx-time text-amber-700" />
                      <span>SLA 72h: {company.slaText || `${company.slaHoursRemaining ?? 72} horas restantes`}</span>
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

                  {company.domainValidation?.isCorporate ? (
                    <span className="inline-flex items-center gap-1 text-[0.68rem] text-emerald-700 font-semibold">
                      <i className="bx bx-check-double text-xs" />
                      <span>Dominio Corporativo Validado</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[0.68rem] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <i className="bx bx-error text-xs" />
                      <span>Correo Genérico ({company.domainValidation?.domain})</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-xl text-secondary hover:bg-sand hover:text-ink transition-colors cursor-pointer"
              aria-label="Cerrar expediente"
            >
              <i className="bx bx-x text-2xl" />
            </button>
          </div>

          {/* Navegación de Pestañas */}
          <div className="mt-5 flex gap-2 border-t border-sand-line/60 pt-3">
            {[
              { id: 'legal', label: 'Datos Jurídicos y RUES', icon: 'bx-buildings' },
              { id: 'documents', label: `Documentos Radicados (${company.documents?.length || 0})`, icon: 'bx-file' },
              { id: 'history', label: 'Trazabilidad y Auditoría', icon: 'bx-history' },
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
          {company.correctionReason && (
            <div className="rounded-xl border border-ochre/40 bg-ochre/10 p-3.5 space-y-1">
              <span className="text-xs font-bold text-cocoa flex items-center gap-1.5">
                <i className="bx bx-error text-sm text-ochre-dark" />
                <span>Subsanación solicitada a la empresa:</span>
              </span>
              <p className="m-0 text-xs text-ink">
                {company.correctionReason}
              </p>
            </div>
          )}

          {/* Alerta de dominio no corporativo */}
          {company.domainValidation?.warning && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 space-y-1">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <i className="bx bx-shield-quarter text-sm text-amber-700" />
                <span>Aviso de Verificación:</span>
              </span>
              <p className="m-0 text-xs text-amber-950 leading-relaxed">
                {company.domainValidation.warning}
              </p>
            </div>
          )}

          {/* PESTAÑA 1: DATOS JURÍDICOS */}
          {activeTab === 'legal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="rounded-xl border border-sand-line bg-cream/30 p-3 space-y-0.5">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Razón Social Completa
                  </span>
                  <p className="m-0 text-xs font-bold text-ink">{company.businessName}</p>
                </div>

                <div className="rounded-xl border border-sand-line bg-cream/30 p-3 space-y-0.5">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Nombre Comercial / Marca
                  </span>
                  <p className="m-0 text-xs font-bold text-ink">{company.tradeName || 'Igual a la razón social'}</p>
                </div>

                <div className="rounded-xl border border-sand-line bg-cream/30 p-3 space-y-0.5">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Identificación Tributaria (NIT)
                  </span>
                  <p className="m-0 text-xs font-bold text-ink">{company.nit}</p>
                </div>

                <div className="rounded-xl border border-sand-line bg-cream/30 p-3 space-y-0.5">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Representante Legal
                  </span>
                  <p className="m-0 text-xs font-bold text-ink">{company.legalRepName}</p>
                  <p className="m-0 text-[0.68rem] text-secondary">{company.legalRepId}</p>
                </div>

                <div className="rounded-xl border border-sand-line bg-cream/30 p-3 space-y-0.5 sm:col-span-2">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Actividad Económica CIIU
                  </span>
                  <p className="m-0 text-xs font-bold text-ink">
                    Código {company.ciiuCode}: {company.ciiuDescription}
                  </p>
                </div>

                <div className="rounded-xl border border-sand-line bg-cream/30 p-3 space-y-0.5">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Ubicación y Sede Principal
                  </span>
                  <p className="m-0 text-xs font-semibold text-ink">{company.address}</p>
                  <p className="m-0 text-[0.68rem] text-secondary">{company.city}</p>
                </div>

                <div className="rounded-xl border border-sand-line bg-cream/30 p-3 space-y-0.5">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Contacto Corporativo
                  </span>
                  <p className="m-0 text-xs font-semibold text-ink">{company.email}</p>
                  <p className="m-0 text-[0.68rem] text-secondary">{company.phone}</p>
                </div>
              </div>

              {company.notes && (
                <div className="rounded-xl border border-sand-line bg-white p-3.5 space-y-1">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    Propósito de Vinculación y Notas Iniciales
                  </span>
                  <p className="m-0 text-xs text-ink leading-relaxed">
                    {company.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 2: DOCUMENTOS RADICADOS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <p className="m-0 text-xs text-secondary">
                Inspecciona los soportes legales adjuntos para verificar la coincidencia del NIT, la razón social y la persona facultada para la representación legal.
              </p>

              <div className="space-y-3">
                {(company.documents || []).map((doc) => (
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

                          <p className="m-0 text-[0.72rem] text-secondary">
                            Emisor declarado: <strong className="text-cocoa">{doc.issuer}</strong>
                          </p>

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

              {/* Visor de documento seleccionado (S3 Signed URL o Folio de Contingencia) */}
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
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-900" role="alert">
                      {pdfError || 'No hay archivo original disponible para inspeccionar. Solicita que se vuelva a cargar.'}
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
                Bitácora de Registro y Decisiones
              </h4>

              <div className="space-y-3">
                {(company.reviewLog || []).map((log, index) => (
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

        {/* Footer: Acciones del Administrador de Vincula */}
        <footer className="border-t border-sand-line bg-cream/40 p-4 sm:p-5 flex items-center justify-between gap-2.5 flex-wrap">
          {showApproveConfirm ? (
            <div className="w-full bg-white rounded-xl border border-emerald-300 p-3.5 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <i className="bx bxs-check-shield text-emerald-700 text-base" />
                  <span>Confirmar Aprobación Oficial y Levantamiento de Cuarentena</span>
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
                placeholder="Notas de aprobación opcionales (ej: 'Documentación legal verificada en RUES y DIAN')..."
                className="w-full rounded-lg border border-sand-line bg-cream/30 p-2 text-xs text-ink placeholder:text-stone-400 focus:border-terracotta focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onApprove(company.id, approveNotes);
                    setShowApproveConfirm(false);
                  }}
                  className="rounded-lg bg-emerald-700 text-white px-4 py-1.5 text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer shadow-xs"
                >
                  Confirmar Aprobación Definitiva
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {!isRejected && (
                  <button
                    type="button"
                    onClick={() => onReject(company)}
                    className="rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    Rechazar
                  </button>
                )}

                {!isApproved && (
                  <button
                    type="button"
                    onClick={() => onRequestCorrection(company)}
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
                  <span>Aprobar y Habilitar Empresa</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <i className="bx bxs-check-circle text-base text-emerald-700" />
                  <span>Empresa ya verificada</span>
                </span>
              )}
            </>
          )}
        </footer>

        {/* Visor Integrado de Vincula para Auditoría de Empresas */}
        <DocumentViewerModal
          isOpen={showViewerModal}
          onClose={() => setShowViewerModal(false)}
          documentUrl={securePdfUrl}
          title={previewDoc ? `${previewDoc.label} · ${company.businessName}` : 'Documento de Auditoría'}
          subtitle={`Auditoría Super Admin · NIT ${company.nit}`}
          metadata={{
            noFileMessage: 'La empresa aún no ha adjuntado este soporte documental a la plataforma.',
          }}
        />
      </div>
    </div>
  );
}

