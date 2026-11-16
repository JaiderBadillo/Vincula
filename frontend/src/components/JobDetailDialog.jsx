import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService.js';

export default function JobDetailDialog({ job, onClose }) {
  const dialogRef = useRef(null);
  const isAuthenticated = authService.isAuthenticated();

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
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-blue-muted">
                {job.sectorLabel}{job.category ? ` · ${job.category}` : ''}
              </p>
              <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink" id="job-detail-title">
                {job.title}
              </h2>
            </div>
            <button className="grid size-10 shrink-0 place-items-center rounded-control border border-line text-xl text-secondary hover:bg-panel" type="button" onClick={onClose} aria-label="Cerrar detalle">
              <i className="bx bx-x" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-5 text-sm font-semibold text-ink">{job.company}</p>
          <div className="my-4 flex flex-wrap gap-2">
            <span className="rounded-lg bg-panel px-3 py-1.5 text-xs font-medium text-blue-muted">{job.location}</span>
            <span className="rounded-lg bg-panel px-3 py-1.5 text-xs font-medium text-blue-muted">{job.mode}</span>
            {job.experienceLabel && job.experienceLabel !== 'Sin definir' && (
              <span className="rounded-lg bg-panel px-3 py-1.5 text-xs font-medium text-blue-muted">{job.experienceLabel}</span>
            )}
            {job.salaryFormatted && (
              <span className="rounded-lg bg-green/10 px-3 py-1.5 text-xs font-semibold text-green-dark">{job.salaryFormatted}</span>
            )}
          </div>
          <p className="whitespace-pre-line text-sm leading-6 text-body-muted" id="job-detail-description">
            {job.detail || job.description}
          </p>
          {job.skills?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {job.skills.slice(0, 6).map((skill) => (
                <span key={skill} className="rounded-lg border border-line-soft bg-page px-2.5 py-1 text-xs text-ink">
                  {skill}
                </span>
              ))}
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-5">
            <Link
              to={isAuthenticated ? '/dashboard/vacantes' : '/login'}
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-control bg-green px-4 py-2.5 text-sm font-bold text-white no-underline hover:bg-green-dark"
            >
              {isAuthenticated ? 'Postularme en el catálogo' : 'Ingresar para postularme'}
              <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />
            </Link>
            <button className="rounded-control border border-line px-4 py-2.5 text-sm font-semibold text-blue-muted hover:bg-panel" type="button" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
