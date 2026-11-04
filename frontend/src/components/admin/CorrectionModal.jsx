import { useState, useEffect } from 'react';

export default function CorrectionModal({
  isOpen,
  target,
  targetType = 'company', // 'company' | 'institution'
  mode = 'correction', // 'correction' | 'rejection'
  onClose,
  onSubmit,
}) {
  const [reason, setReason] = useState('');
  const [selectedDocs, setSelectedDocs] = useState([]);

  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setSelectedDocs([]);
      return;
    }

    if (mode === 'correction') {
      if (targetType === 'company') {
        setReason(
          'El Certificado de Existencia y Representación Legal adjunto presenta inconsistencias o requiere actualización. Por favor adjunta una versión emitida por la Cámara de Comercio correspondiente.'
        );
        setSelectedDocs(['camara_comercio']);
      } else {
        setReason(
          'Se requiere adjuntar copia reciente del acto administrativo de nombramiento o posesión de la Rectoría para completar la firma del convenio marco.'
        );
        setSelectedDocs(['acto_posesion']);
      }
    } else {
      setReason(
        'La información fiscal o corporativa registrada no pudo ser validada ante los registros oficiales del RUES / DIAN.'
      );
      setSelectedDocs([]);
    }
  }, [isOpen, target, targetType, mode]);

  if (!isOpen || !target) return null;

  function toggleDoc(docType) {
    setSelectedDocs((prev) =>
      prev.includes(docType) ? prev.filter((d) => d !== docType) : [...prev, docType]
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!reason.trim()) return;
    onSubmit(target.id, reason.trim(), selectedDocs);
    onClose();
  }

  const isCorrection = mode === 'correction';
  const title = isCorrection
    ? targetType === 'company'
      ? 'Solicitar Subsanación a la Empresa'
      : 'Solicitar Subsanación a la Institución'
    : targetType === 'company'
      ? 'Rechazar Solicitud de Empresa'
      : 'Rechazar Solicitud de IES';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cocoa/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-sand-line bg-white p-6 shadow-2xl animate-in zoom-in-95 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-sand-line pb-3.5">
          <div className="flex items-center gap-3">
            <span
              className={`grid size-11 place-items-center rounded-xl text-2xl shrink-0 shadow-2xs ${
                isCorrection
                  ? 'bg-ochre/25 text-cocoa'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              <i className={`bx ${isCorrection ? 'bx-error-circle' : 'bx-x-circle'}`} />
            </span>
            <div>
              <h3 className="m-0 font-display text-base font-bold text-ink">
                {title}
              </h3>
              <p className="m-0 text-xs text-secondary truncate max-w-xs">
                {target.businessName || target.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-secondary hover:bg-sand hover:text-ink transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Documentos a subsanar si aplica */}
          {isCorrection && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-ink block">
                Selecciona los documentos que requieren corrección:
              </label>
              <div className="space-y-1.5 rounded-xl border border-sand-line bg-cream/40 p-3">
                {(targetType === 'company'
                  ? [
                      { id: 'camara_comercio', label: 'Cámara de Comercio (Requiere actualización o no legible)' },
                      { id: 'rut', label: 'RUT DIAN (Requiere actualización o verificación)' },
                      { id: 'cedula_rep_legal', label: 'Cédula del Representante Legal' },
                      { id: 'carta_autorizacion', label: 'Carta de Autorización / Delegación de Talento' },
                    ]
                  : [
                      { id: 'resolucion_men', label: 'Resolución de Reconocimiento MEN' },
                      { id: 'snies', label: 'Certificado de Registro Activo SNIES' },
                      { id: 'rut', label: 'RUT Institucional de la Universidad' },
                      { id: 'acto_posesion', label: 'Acto de Posesión de Rectoría' },
                    ]
                ).map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer hover:text-terracotta"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                      className="accent-terracotta size-4 rounded cursor-pointer"
                    />
                    <span>{doc.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Motivo detallado */}
          <div className="space-y-1.5">
            <label htmlFor="correction-reason" className="text-xs font-bold text-ink block">
              {isCorrection ? 'Observaciones para la entidad (notificación oficial):' : 'Motivo formal de rechazo:'}
            </label>
            <textarea
              id="correction-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-sand-line bg-cream/30 p-3 text-xs text-ink placeholder:text-stone-400 focus:border-terracotta focus:outline-none"
              placeholder="Describe con claridad el motivo para que la organización pueda subsanar..."
              required
            />
            <p className="m-0 text-[0.68rem] text-secondary">
              Este mensaje será enviado al correo institucional registrado ({target.email}).
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-sand-line">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-sand-line bg-white px-4 py-2 text-xs font-bold text-secondary hover:text-ink hover:bg-cream transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer ${
                isCorrection
                  ? 'bg-ochre-dark hover:bg-cocoa'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isCorrection ? 'Enviar Solicitud de Subsanación' : 'Confirmar Rechazo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

