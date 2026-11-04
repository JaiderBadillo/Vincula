import { useEffect, useState } from 'react';
import { AGREEMENT_STATUS } from '../../data/companyAgreementsData.js';
import { daysUntil, formatApplicationDate } from '../../utils/formatters.js';

function Section({ title, icon, children }) {
  return (
    <section className="border-t border-sand-line px-6 py-5">
      <h3 className="m-0 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-secondary">
        {icon && <i className={`bx ${icon} text-base text-terracotta`} aria-hidden="true" />}
        <span>{title}</span>
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function AgreementDetailDrawer({
  agreement,
  onClose,
  onRequestRenewal,
  onUploadDocument,
  onCancelRequest,
}) {
  const open = Boolean(agreement);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('Anexo Legal');
  const [downloadSuccess, setDownloadSuccess] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleEscape(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!agreement) return null;

  const statusCfg = AGREEMENT_STATUS[agreement.status] || AGREEMENT_STATUS.vigente;
  const daysLeft = agreement.expiresAt ? daysUntil(agreement.expiresAt) : null;

  const handleSimulateDownload = (doc) => {
    setDownloadSuccess(doc.id);
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!docTitle.trim()) return;
    onUploadDocument(agreement.id, {
      title: docTitle.trim(),
      type: docType,
      fileName: `${docTitle.trim().replace(/\s+/g, '_')}_Cenit.pdf`,
      fileSize: '1.9 MB',
    });
    setDocTitle('');
    setShowUploadForm(false);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-cocoa/40 backdrop-blur-xs transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:max-w-2xl ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agreement-drawer-title"
      >
        {/* Cabecera del drawer */}
        <header className="flex items-start justify-between gap-4 border-b border-sand-line bg-cream px-6 py-5">
          <div className="flex items-start gap-3.5">
            {agreement.institutionLogo ? (
              <img
                src={agreement.institutionLogo}
                alt={agreement.institutionName}
                className="size-12 shrink-0 rounded-xl border border-sand-line bg-white object-contain p-1 shadow-2xs"
              />
            ) : (
              <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-terracotta/20 bg-sand font-display text-sm font-bold text-terracotta shadow-2xs">
                {agreement.institutionShort}
              </span>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-xs font-semibold uppercase tracking-wider text-secondary">
                  {agreement.institutionName}
                </span>
                <span className="text-secondary/50">•</span>
                <span className="text-xs font-mono text-secondary">{agreement.agreementCode}</span>
              </div>
              <h2 id="agreement-drawer-title" className="m-0 mt-1 font-display text-lg font-bold text-ink">
                {agreement.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-sand-line bg-white text-secondary transition-colors hover:bg-sand hover:text-ink"
            aria-label="Cerrar panel de convenio"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </header>

        {/* Notificación de descarga simulada */}
        {downloadSuccess && (
          <div className="flex items-center gap-2 border-b border-sand-line bg-emerald-50 px-6 py-2.5 text-xs font-medium text-emerald-800">
            <i className="bx bx-check-circle text-base text-emerald-600" />
            <span>Documento descargado correctamente para consulta local.</span>
          </div>
        )}

        {/* Cuerpo desplazable */}
        <div className="flex-1 overflow-y-auto">
          {/* Bloque de Vigencia y Estado */}
          <div className="px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sand-line bg-sand/35 p-4">
              <div className="flex items-center gap-2.5">
                <span className={`inline-block size-2.5 rounded-full ${statusCfg.dotColor}`} />
                <span className="font-display text-sm font-semibold text-ink">{statusCfg.label}</span>
                <span className="text-xs text-secondary">({statusCfg.description})</span>
              </div>

              {agreement.expiresAt && (
                <div className="text-right">
                  <span className="text-xs font-medium text-secondary">Vence: </span>
                  <span className="font-display text-xs font-bold text-ink">
                    {formatApplicationDate(agreement.expiresAt)}
                  </span>
                  {daysLeft !== null && (
                    <span
                      className={`ml-2 inline-block rounded-md px-2 py-0.5 text-[0.7rem] font-semibold ${
                        daysLeft <= 60
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-cream text-secondary border border-sand-line'
                      }`}
                    >
                      {daysLeft > 0 ? `Quedan ${daysLeft} días` : 'Expirado'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {agreement.status === 'por_renovar' && (
              <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-900">
                <i className="bx bx-alarm-exclamation text-base shrink-0 text-amber-700 mt-0.5" />
                <p className="m-0">
                  Este convenio requiere renovación formal. Puedes radicar la solicitud de prórroga ahora mismo
                  para mantener la vinculación directa de egresados y pasantes sin interrupciones.
                </p>
              </div>
            )}

            {agreement.status === 'en_revision' && (
              <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-sand-line bg-cream p-3 text-xs leading-relaxed text-cocoa">
                <i className="bx bx-time text-base shrink-0 text-terracotta mt-0.5" />
                <p className="m-0">
                  Solicitud en trámite de validación jurídica e institucional ante la IES. Fecha de radicación:{' '}
                  <strong>{formatApplicationDate(agreement.requestedAt)}</strong>. Vigencia estimada:{' '}
                  <strong>{agreement.requestedDurationYears} años</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Métricas del convenio */}
          {agreement.status !== 'en_revision' && (
            <Section title="Impacto y Métricas en la Empresa" icon="bx-bar-chart-alt-2">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-sand-line bg-cream/60 p-3 text-center">
                  <span className="block font-display text-2xl font-bold text-terracotta">
                    {agreement.metrics?.hiredGraduates || 0}
                  </span>
                  <span className="text-[0.7rem] font-medium text-secondary">Egresados contratados</span>
                </div>
                <div className="rounded-xl border border-sand-line bg-cream/60 p-3 text-center">
                  <span className="block font-display text-2xl font-bold text-ink">
                    {agreement.metrics?.activeVacancies || 0}
                  </span>
                  <span className="text-[0.7rem] font-medium text-secondary">Vacantes vinculadas</span>
                </div>
                <div className="rounded-xl border border-sand-line bg-cream/60 p-3 text-center">
                  <span className="block font-display text-2xl font-bold text-ochre">
                    {agreement.metrics?.internsCount || 0}
                  </span>
                  <span className="text-[0.7rem] font-medium text-secondary">Pasantes activos</span>
                </div>
                <div className="rounded-xl border border-sand-line bg-cream/60 p-3 text-center">
                  <span className="block font-display text-2xl font-bold text-emerald-700">
                    {agreement.metrics?.retentionRate || 0}%
                  </span>
                  <span className="text-[0.7rem] font-medium text-secondary">Tasa de retención</span>
                </div>
              </div>
            </Section>
          )}

          {/* Coordinador y contacto en la Universidad */}
          {agreement.coordinatorIES && (
            <Section title="Punto de Contacto en la Institución (IES)" icon="bx-id-card">
              <div className="rounded-xl border border-sand-line bg-cream/40 p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="m-0 font-display text-sm font-bold text-ink">
                    {agreement.coordinatorIES.name}
                  </h4>
                  <span className="text-xs font-medium text-terracotta">
                    {agreement.coordinatorIES.role}
                  </span>
                </div>
                {agreement.coordinatorIES.office && (
                  <p className="m-0 mt-1.5 flex items-center gap-1.5 text-xs text-secondary">
                    <i className="bx bx-map-pin text-sm text-secondary" />
                    <span>{agreement.coordinatorIES.office}</span>
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-sand-line/70 pt-3">
                  <a
                    href={`mailto:${agreement.coordinatorIES.email}`}
                    className="flex items-center gap-1.5 rounded-lg border border-sand-line bg-white px-3 py-1.5 text-xs font-semibold text-cocoa no-underline transition-colors hover:bg-sand"
                  >
                    <i className="bx bx-envelope text-sm text-terracotta" />
                    <span>{agreement.coordinatorIES.email}</span>
                  </a>
                  <a
                    href={`tel:${agreement.coordinatorIES.phone}`}
                    className="flex items-center gap-1.5 rounded-lg border border-sand-line bg-white px-3 py-1.5 text-xs font-semibold text-cocoa no-underline transition-colors hover:bg-sand"
                  >
                    <i className="bx bx-phone text-sm text-terracotta" />
                    <span>{agreement.coordinatorIES.phone}</span>
                  </a>
                </div>
              </div>
            </Section>
          )}

          {/* Programas Académicos Contemplados */}
          <Section title="Programas Académicos Contemplados" icon="bx-book-reader">
            <div className="flex flex-wrap gap-2">
              {agreement.targetPrograms?.map((prog) => (
                <span
                  key={prog}
                  className="rounded-lg border border-sand-line bg-cream px-3 py-1.5 text-xs font-medium text-ink shadow-2xs"
                >
                  {prog}
                </span>
              ))}
            </div>
          </Section>

          {/* Descripción del Convenio */}
          {agreement.description && (
            <Section title="Alcance y Beneficios del Acuerdo" icon="bx-info-circle">
              <p className="m-0 text-xs leading-relaxed text-secondary">{agreement.description}</p>
            </Section>
          )}

          {/* Documentos Legales y Soportes */}
          <Section title="Documentos y Expediente Legal" icon="bx-folder">
            <div className="flex flex-col gap-2.5">
              {agreement.documents?.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col gap-2 rounded-xl border border-sand-line bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-sand-line bg-cream text-terracotta">
                      <i className="bx bxs-file-pdf text-lg" />
                    </span>
                    <div>
                      <h5 className="m-0 text-xs font-bold text-ink">{doc.title}</h5>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.7rem] text-secondary">
                        <span className="font-mono">{doc.fileName}</span>
                        <span>•</span>
                        <span>{doc.fileSize}</span>
                        {doc.uploadDate && (
                          <>
                            <span>•</span>
                            <span>{formatApplicationDate(doc.uploadDate)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[0.65rem] font-semibold ${
                        doc.status === 'aprobado'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-sand/60 text-cocoa border border-sand-line'
                      }`}
                    >
                      {doc.status === 'aprobado' ? 'Validado' : 'En revisión'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSimulateDownload(doc)}
                      className="flex items-center gap-1 rounded-lg border border-sand-line bg-cream px-2.5 py-1 text-xs font-semibold text-cocoa transition-colors hover:bg-sand"
                      title="Descargar documento legal"
                    >
                      <i className="bx bx-download text-sm text-terracotta" />
                      <span>Descargar</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Botón y formulario para subir anexo */}
              {!showUploadForm ? (
                <button
                  type="button"
                  onClick={() => setShowUploadForm(true)}
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-sand-line bg-sand/20 py-3 text-xs font-semibold text-cocoa transition-colors hover:border-terracotta hover:bg-sand/40"
                >
                  <i className="bx bx-cloud-upload text-base text-terracotta" />
                  <span>Adjuntar nuevo soporte o anexo legal</span>
                </button>
              ) : (
                <form
                  onSubmit={handleUploadSubmit}
                  className="mt-2 rounded-xl border border-sand-line bg-cream/70 p-4"
                >
                  <h5 className="m-0 text-xs font-bold text-ink">Adjuntar anexo al convenio</h5>
                  <div className="mt-3 flex flex-col gap-3">
                    <div>
                      <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-secondary">
                        Nombre del documento
                      </label>
                      <input
                        type="text"
                        required
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder="Ej: Certificado de Póliza de Práctica 2026-II"
                        className="mt-1 w-full rounded-lg border border-sand-line bg-white px-3 py-2 text-xs text-ink focus:border-terracotta focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-secondary">
                        Tipo de soporte
                      </label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-sand-line bg-white px-3 py-2 text-xs text-ink focus:border-terracotta focus:outline-hidden"
                      >
                        <option value="Anexo Legal">Anexo Legal</option>
                        <option value="Póliza">Póliza de Seguro</option>
                        <option value="Acta de Concertación">Acta de Concertación</option>
                        <option value="Certificado">Certificado de Cumplimiento</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowUploadForm(false)}
                        className="rounded-lg border border-sand-line bg-white px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-sand"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-terracotta px-3 py-1.5 text-xs font-semibold text-white hover:bg-terracotta-dark"
                      >
                        Subir documento
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </Section>

          {/* Historial de eventos */}
          {agreement.timeline && agreement.timeline.length > 0 && (
            <Section title="Historial del Convenio" icon="bx-history">
              <div className="relative border-l-2 border-sand-line pl-4">
                {agreement.timeline.map((item, idx) => (
                  <div key={idx} className="relative mb-4 last:mb-0">
                    <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-terracotta" />
                    <span className="text-[0.68rem] font-bold text-secondary">
                      {formatApplicationDate(item.date)}
                    </span>
                    <p className="m-0 mt-0.5 text-xs text-ink">{item.event}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Barra inferior de acciones */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-sand-line bg-cream px-6 py-4">
          <div>
            {agreement.status === 'en_revision' && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Deseas desistir y cancelar esta solicitud de convenio?')) {
                    onCancelRequest(agreement.id);
                    onClose();
                  }
                }}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100"
              >
                Cancelar solicitud
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-sand-line bg-white px-4 py-2 text-xs font-semibold text-secondary transition-colors hover:bg-sand hover:text-ink"
            >
              Cerrar
            </button>

            {(agreement.status === 'por_renovar' || agreement.status === 'vigente') && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestRenewal(agreement);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-terracotta px-4 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-terracotta-dark"
              >
                <i className="bx bx-revision text-sm" />
                <span>Solicitar renovación</span>
              </button>
            )}
          </div>
        </footer>
      </aside>
    </>
  );
}

