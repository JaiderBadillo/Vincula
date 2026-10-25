import { useEffect, useRef } from 'react';

export default function JobDetailDialog({ job, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    if (job && !dialog.open) dialog.showModal();
    if (!job && dialog.open) dialog.close();

    return undefined;
  }, [job]);

  function closeOnBackdrop(event) {
    if (event.target === dialogRef.current) onClose();
  }

  function closeOnEscape(event) {
    event.preventDefault();
    onClose();
  }

  return (
    <dialog ref={dialogRef} className="job-detail-dialog" aria-labelledby="job-detail-title" aria-describedby="job-detail-description" onClick={closeOnBackdrop} onCancel={closeOnEscape}>
      {job && (
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-5 border-b border-line-soft pb-5">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-blue-muted">{job.sectorLabel} · Ejemplo ilustrativo</p>
              <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink" id="job-detail-title">{job.title}</h2>
            </div>
            <button className="grid size-10 shrink-0 place-items-center rounded-control border border-line text-xl text-secondary hover:bg-panel" type="button" onClick={onClose} aria-label="Cerrar detalle"><i className="bx bx-x" aria-hidden="true" /></button>
          </div>
          <p className="mt-5 text-sm text-body-muted">{job.company}</p>
          <div className="my-4 flex flex-wrap gap-2"><span className="rounded-lg bg-panel px-3 py-2 text-xs text-blue-muted">{job.location}</span><span className="rounded-lg bg-panel px-3 py-2 text-xs text-blue-muted">{job.mode}</span></div>
          <p className="text-sm leading-6 text-body-muted" id="job-detail-description">{job.detail}</p>
          <p className="mt-5 rounded-control border border-line bg-panel p-4 text-sm leading-6 text-blue-muted">Este contenido es ilustrativo. La postulación no está conectada a un servicio real.</p>
          <div className="mt-6 flex justify-end border-t border-line-soft pt-5"><button className="rounded-control border border-line px-4 py-2.5 text-sm font-semibold text-blue-muted hover:bg-panel" type="button" onClick={onClose}>Cerrar</button></div>
        </div>
      )}
    </dialog>
  );
}
