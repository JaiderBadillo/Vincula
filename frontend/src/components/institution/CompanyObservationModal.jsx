import { useEffect, useState } from 'react';

const REASONS = [
  'Certificado de Cámara de Comercio expedido hace más de 30 días',
  'RUT desactualizado o sin código CIIU de la actividad declarada',
  'Firma del representante legal ilegible o sin coincidencia en cédula',
  'Poder especial o facultades para contratar no acreditadas',
  'Minuta de convenio modificada unilateralmente o incompleta',
  'Falta certificación de pago de seguridad social y aportes parafiscales',
  'Otro motivo jurídico / documental',
];

export default function CompanyObservationModal({ isOpen, onClose, company, onConfirm }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason(REASONS[0]);
      setNotes('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !company) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Por favor detalla qué subsanación jurídica o documental debe realizar la empresa.');
      return;
    }
    onConfirm(company.id, { reason, notes: notes.trim() });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-observation-title"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 id="company-observation-title" className="m-0 font-display text-lg font-bold text-ink">
              Registrar Observación Jurídica
            </h2>
            <p className="m-0 mt-0.5 text-xs text-secondary">
              Se enviará notificación formal a <strong>{company.companyName}</strong> (NIT {company.nit}).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-secondary hover:text-ink hover:bg-page transition-colors cursor-pointer"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        <div>
          <label htmlFor="company-obs-reason" className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
            Causal de Devolución / Observación
          </label>
          <select
            id="company-obs-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border border-line bg-page px-3 py-2 text-xs font-semibold text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green cursor-pointer"
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="company-obs-notes" className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
            Detalle de la Subsanación Requerida
          </label>
          <textarea
            id="company-obs-notes"
            rows={4}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              if (error) setError('');
            }}
            placeholder="Describe con precisión qué documento debe actualizar o corregir la empresa para formalizar el convenio marco con las UTS..."
            className="w-full rounded-xl border border-line bg-page p-3 text-xs text-ink placeholder:text-secondary/60 focus:border-green focus:outline-none focus:ring-1 focus:ring-green resize-none"
          />
          {error && <p className="mt-1 text-xs font-semibold text-rose-600 m-0">{error}</p>}
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[0.72rem] text-amber-900 flex items-start gap-2">
          <i className="bx bx-info-circle text-base text-amber-600 shrink-0 mt-0.5" />
          <span>
            La solicitud pasará a la pestaña <strong>"Con observaciones"</strong>. La empresa recibirá un enlace seguro para adjuntar los documentos subsanados sin reiniciar el proceso.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-page px-4 py-2 text-xs font-semibold text-secondary hover:text-ink hover:bg-page/70 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors cursor-pointer"
          >
            Enviar Observaciones
          </button>
        </div>
      </form>
    </div>
  );
}
