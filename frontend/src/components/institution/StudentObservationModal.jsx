import { useEffect, useState } from 'react';

const REASONS = [
  'Documento ilegible o incompleto',
  'El diploma o acta no corresponde al egresado',
  'No figura en el registro de grados',
  'Falta paz y salvo',
  'Otro',
];

export default function StudentObservationModal({ isOpen, onClose, student, onConfirm }) {
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

  if (!isOpen || !student) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Escribe qué debe corregir la persona.');
      return;
    }
    onConfirm(student.id, { reason, notes: notes.trim() });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="observation-modal-title"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
      >
        <h2 id="observation-modal-title" className="m-0 font-display text-lg font-bold text-ink">
          Pedir corrección
        </h2>
        <p className="m-0 mt-1 text-sm text-secondary">
          Se enviará a {student.studentName} por correo.
        </p>

        <label htmlFor="observation-reason" className="mt-5 block text-sm font-semibold text-ink">
          Motivo
        </label>
        <select
          id="observation-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink cursor-pointer"
        >
          {REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>

        <label htmlFor="observation-notes" className="mt-4 block text-sm font-semibold text-ink">
          Mensaje
        </label>
        <textarea
          id="observation-notes"
          rows={4}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setError('');
          }}
          placeholder="Explica qué debe volver a subir o corregir."
          className="mt-1.5 w-full resize-none rounded-lg border border-line p-3 text-sm text-ink placeholder:text-body-muted outline-none focus:border-ink"
        />
        {error && <p className="m-0 mt-1 text-sm text-rose-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-secondary hover:text-ink cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-soft cursor-pointer"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
