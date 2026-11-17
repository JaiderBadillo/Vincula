import { useState } from 'react';
import { Field, Modal, PrimaryButton, SecondaryButton, inputClass } from '../profile/ui.jsx';
import { moderationService } from '../../services/moderationService.js';

const MOTIVOS = [
  { id: 'fraude_o_estafa', label: 'Parece un fraude o una estafa' },
  { id: 'cobro_indebido', label: 'Piden dinero para postularse o contratar' },
  { id: 'informacion_falsa', label: 'Información falsa o engañosa' },
  { id: 'discriminacion', label: 'Discriminación' },
  { id: 'contenido_inapropiado', label: 'Contenido inapropiado' },
  { id: 'otro', label: 'Otro motivo' },
];

export default function ReportVacancyModal({ job, onClose }) {
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  async function submit() {
    setSending(true);
    setError('');
    try {
      const res = await moderationService.reportVacancy(job.id, motivo, detalle.trim());
      setDone(res.mensaje);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      title="Reportar esta vacante"
      subtitle={job.title}
      onClose={onClose}
      size="max-w-lg"
      footer={done ? (
        <PrimaryButton onClick={onClose}>Cerrar</PrimaryButton>
      ) : (
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={submit} disabled={!motivo || sending}>{sending ? 'Enviando…' : 'Enviar reporte'}</PrimaryButton>
        </>
      )}
    >
      {done ? (
        <p className="m-0 flex items-start gap-2 text-sm text-ink" role="status">
          <i className="bx bx-check-circle mt-0.5 text-xl text-green" aria-hidden="true" />
          {done}
        </p>
      ) : (
        <div className="grid gap-4">
          <p className="m-0 text-sm text-body-muted">
            Tu reporte es revisado por el equipo de Vincula. La empresa no ve quién reportó.
          </p>
          <fieldset className="m-0 grid gap-2 border-0 p-0">
            <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary">¿Qué pasa con esta vacante?</legend>
            {MOTIVOS.map((m) => (
              <label key={m.id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${motivo === m.id ? 'border-ink bg-page font-semibold text-ink' : 'border-line text-blue-muted hover:border-ink/40'}`}>
                <input type="radio" name="motivo" value={m.id} checked={motivo === m.id} onChange={() => setMotivo(m.id)} className="accent-[#336f24]" />
                {m.label}
              </label>
            ))}
          </fieldset>
          <Field label="Cuéntanos más (opcional)" hint={`${detalle.length}/1000`}>
            <textarea className={`${inputClass} min-h-24 resize-y`} maxLength={1000} value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Qué viste, qué te pidieron, enlaces o mensajes relevantes" />
          </Field>
          {error && <p className="m-0 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800" role="alert">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
