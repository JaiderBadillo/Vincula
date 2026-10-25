import { useState } from 'react';

export default function CompanyValidationDrawer({
  company,
  isOpen,
  onClose,
  onApprove,
  onOpenObservation,
}) {
  const [activeDocPreview, setActiveDocPreview] = useState(null);

  if (!isOpen || !company) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-ink/40 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200"
      >
        {/* ─── Header del Drawer ─── */}
        <div className="border-b border-line p-6 bg-page/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-2xl font-display text-sm font-black shadow-xs ${company.logoBg}`}
              >
                {company.logoInitials}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="m-0 font-display text-lg font-bold text-ink">
                    {company.companyName}
                  </h2>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[0.65rem] font-bold ${
                      company.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : company.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {company.status === 'approved'
                      ? 'Convenio Vigente'
                      : company.status === 'rejected'
                      ? 'Con Observaciones'
                      : 'Solicitud Pendiente'}
                  </span>
                </div>
                <p className="m-0 text-xs text-secondary mt-0.5">
                  NIT: <strong className="text-ink">{company.nit}</strong> · {company.sector}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-xl text-secondary hover:text-ink hover:bg-white border border-transparent hover:border-line transition-colors cursor-pointer"
              title="Cerrar expediente"
            >
              <i className="bx bx-x text-2xl" />
            </button>
          </div>

          {/* Acciones principales fijas en el encabezado */}
          {company.status === 'pending' && (
            <div className="mt-5 flex items-center gap-3 pt-4 border-t border-line/70">
              <button
                type="button"
                onClick={() => onApprove(company.id)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-dark px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-green-dark/90 transition-colors cursor-pointer"
              >
                <i className="bx bx-check-circle text-base" />
                <span>Aprobar y Formalizar Convenio</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenObservation(company.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <i className="bx bx-message-error text-base text-amber-600" />
                <span>Registrar Observación</span>
              </button>
            </div>
          )}
        </div>

        {/* ─── Contenido Scrolleable ─── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Alerta de Observaciones si está rechazada */}
          {company.status === 'rejected' && company.observationNotes && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <i className="bx bx-error-circle text-base text-rose-600" />
                <span>Observación Legal Registrada ({company.reviewedAt})</span>
              </div>
              <p className="text-xs font-semibold text-rose-950 m-0">
                {company.observationReason}
              </p>
              <p className="text-xs text-rose-800 m-0 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-rose-200/60">
                {company.observationNotes}
              </p>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => onApprove(company.id)}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors"
                >
                  Marcar Subsanado y Aprobar
                </button>
              </div>
            </div>
          )}

          {/* 1. Datos Jurídicos de la Empresa */}
          <div className="space-y-3">
            <h3 className="m-0 font-display text-sm font-bold text-ink uppercase tracking-wider text-secondary">
              Información Jurídica y Domicilio
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-line bg-page/40 p-3 space-y-0.5">
                <span className="text-[0.68rem] font-bold uppercase text-secondary">Ciudad & Sede</span>
                <p className="m-0 font-semibold text-ink">{company.city}</p>
                <p className="m-0 text-secondary text-[0.7rem]">{company.address}</p>
              </div>
              <div className="rounded-xl border border-line bg-page/40 p-3 space-y-0.5">
                <span className="text-[0.68rem] font-bold uppercase text-secondary">Tamaño & Sector</span>
                <p className="m-0 font-semibold text-ink">{company.companySize}</p>
                <p className="m-0 text-secondary text-[0.7rem]">{company.sector}</p>
              </div>
            </div>
          </div>

          {/* 2. Representante Legal & Contacto */}
          <div className="space-y-3">
            <h3 className="m-0 font-display text-sm font-bold text-ink uppercase tracking-wider text-secondary">
              Representación Legal y Gestión de Talento
            </h3>
            <div className="rounded-2xl border border-line bg-white p-4 space-y-3 text-xs">
              <div className="flex items-start justify-between border-b border-line pb-3">
                <div>
                  <span className="text-[0.68rem] font-bold uppercase text-secondary block">
                    Representante Legal Principal
                  </span>
                  <span className="font-bold text-ink text-sm block mt-0.5">
                    {company.legalRepresentative.name}
                  </span>
                  <span className="text-secondary text-[0.7rem]">
                    {company.legalRepresentative.documentType} {company.legalRepresentative.documentId} · {company.legalRepresentative.role}
                  </span>
                </div>
                <a
                  href={`mailto:${company.legalRepresentative.email}`}
                  className="rounded-lg border border-line px-2.5 py-1 text-[0.7rem] font-semibold text-ink hover:bg-page no-underline flex items-center gap-1"
                >
                  <i className="bx bx-envelope" />
                  Contactar
                </a>
              </div>

              <div className="flex items-start justify-between pt-1">
                <div>
                  <span className="text-[0.68rem] font-bold uppercase text-secondary block">
                    Contacto de Selección / Talento
                  </span>
                  <span className="font-semibold text-ink block mt-0.5">
                    {company.contactPerson.name}
                  </span>
                  <span className="text-secondary text-[0.7rem]">
                    {company.contactPerson.role} · Tel: {company.contactPerson.phone}
                  </span>
                </div>
                <a
                  href={`mailto:${company.contactPerson.email}`}
                  className="rounded-lg border border-line px-2.5 py-1 text-[0.7rem] font-semibold text-ink hover:bg-page no-underline flex items-center gap-1"
                >
                  <i className="bx bx-envelope" />
                  Escribir
                </a>
              </div>
            </div>
          </div>

          {/* 3. Condiciones del Convenio Solicitado */}
          <div className="space-y-3">
            <h3 className="m-0 font-display text-sm font-bold text-ink uppercase tracking-wider text-secondary">
              Términos del Convenio Solicitado
            </h3>
            <div className="rounded-2xl border border-green/20 bg-green/5 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-green-dark text-sm">
                  {company.convenioType}
                </span>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-[0.7rem] font-bold text-ink border border-green/20">
                  Vigencia: {company.agreementDurationYears} años
                </span>
              </div>

              <div className="flex items-center gap-4 text-ink pt-1 border-t border-green/15">
                <div>
                  <span className="text-secondary text-[0.68rem] block">Vacantes Proyectadas</span>
                  <strong className="text-base text-ink font-display">{company.vacanciesProjected}</strong>
                  <span className="text-secondary text-[0.7rem]"> plazas / año</span>
                </div>
                <div className="border-l border-green/15 pl-4">
                  <span className="text-secondary text-[0.68rem] block">Fecha de Solicitud</span>
                  <strong className="text-ink">{company.requestedAt}</strong>
                </div>
              </div>

              {company.targetPrograms && company.targetPrograms.length > 0 && (
                <div className="pt-2 border-t border-green/15">
                  <span className="text-secondary text-[0.68rem] font-bold uppercase block mb-1.5">
                    Programas Académicos UTS Beneficiados
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {company.targetPrograms.map((prog) => (
                      <span
                        key={prog}
                        className="rounded-lg bg-white px-2 py-0.5 text-[0.7rem] font-semibold text-ink border border-green/20"
                      >
                        {prog}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. Documentación Legal Adjunta */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="m-0 font-display text-sm font-bold text-ink uppercase tracking-wider text-secondary">
                Documentación Jurídica Radicada ({company.documents.length})
              </h3>
              <span className="text-[0.7rem] text-secondary">
                Todos los archivos deben verificarse antes de la firma
              </span>
            </div>

            <div className="space-y-2.5">
              {company.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl border border-line bg-page/40 p-3.5 flex items-center justify-between gap-3 hover:bg-page transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                      <i className="bx bxs-file-pdf text-xl" />
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 font-semibold text-xs text-ink truncate">
                        {doc.title}
                      </p>
                      <p className="m-0 text-[0.68rem] text-secondary truncate mt-0.5">
                        {doc.issuer} · {doc.issueDate} · {doc.fileSize}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {doc.verified ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-800 border border-emerald-200">
                        <i className="bx bx-check" />
                        Verificado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[0.65rem] font-bold text-amber-800 border border-amber-200">
                        <i className="bx bx-time" />
                        Pendiente
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveDocPreview(doc)}
                      className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:border-green hover:text-green-dark transition-colors cursor-pointer"
                    >
                      Ver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal flotante simulador de vista previa de documento */}
          {activeDocPreview && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
              onClick={() => setActiveDocPreview(null)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <i className="bx bxs-file-pdf text-2xl text-rose-600" />
                    <div>
                      <h4 className="m-0 text-sm font-bold text-ink">
                        {activeDocPreview.title}
                      </h4>
                      <p className="m-0 text-xs text-secondary">
                        {activeDocPreview.fileName} · {activeDocPreview.fileSize}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveDocPreview(null)}
                    className="grid size-8 place-items-center rounded-lg text-secondary hover:text-ink hover:bg-page"
                  >
                    <i className="bx bx-x text-xl" />
                  </button>
                </div>

                <div className="rounded-xl border border-line bg-page p-8 text-center space-y-3">
                  <i className="bx bx-check-shield text-4xl text-green-dark" />
                  <div>
                    <strong className="block text-sm text-ink">
                      Documento Oficial Cotejado
                    </strong>
                    <span className="text-xs text-secondary mt-1 block">
                      Emisor: {activeDocPreview.issuer} ({activeDocPreview.issueDate})
                    </span>
                  </div>
                  <p className="text-[0.72rem] text-body-muted max-w-md mx-auto">
                    El documento cuenta con firma digital y código de verificación QR verificado en el sistema RUES / DIAN.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setActiveDocPreview(null)}
                    className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-ink/90"
                  >
                    Cerrar Visor
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
