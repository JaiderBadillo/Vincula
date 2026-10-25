export default function StudentValidationDrawer({
  isOpen,
  onClose,
  student,
  onApprove,
  onOpenObservation,
  onViewDocument,
}) {
  if (!isOpen || !student) return null;

  const match = student.academicMatch;
  const matchOk = match.status === 'verified';
  const isPending = student.status === 'pending';

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-ink/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-drawer-title"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6">
          <div className="flex min-w-0 items-center gap-3.5">
            {student.avatar ? (
              <img src={student.avatar} alt="" className="size-14 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-panel text-base font-bold text-ink">
                {student.studentName
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <h2 id="student-drawer-title" className="m-0 font-display text-xl font-bold text-ink">
                {student.studentName}
              </h2>
              <p className="m-0 mt-1 text-sm text-secondary">
                {student.program} · Grado {student.graduationPeriod}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-secondary hover:bg-panel hover:text-ink cursor-pointer"
            aria-label="Cerrar"
          >
            <i className="bx bx-x text-2xl" />
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
          {student.status === 'rejected' && student.observationNotes && (
            <div className="rounded-lg border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="m-0 font-semibold">Observación enviada</p>
              <p className="m-0 mt-1 text-amber-900">{student.observationNotes}</p>
            </div>
          )}

          {/* Verificación */}
          <section>
            <h3 className="m-0 text-sm font-semibold text-ink">Verificación académica</h3>
            <p
              className={`m-0 mt-1.5 flex items-center gap-2 text-sm ${
                matchOk ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              <i className={`bx ${matchOk ? 'bx-check-circle' : 'bx-error-circle'} text-lg`} />
              {matchOk ? 'Coincide con el registro de la UTS' : match.label}
            </p>
            {match.discrepancyNote && (
              <p className="m-0 mt-2 text-sm text-body-muted">{match.discrepancyNote}</p>
            )}
          </section>

          {/* Datos */}
          <section>
            <h3 className="m-0 text-sm font-semibold text-ink">Datos</h3>
            <dl className="m-0 mt-2 grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
              <dt className="text-secondary">Documento</dt>
              <dd className="m-0 text-ink">{student.documentType} {student.documentId}</dd>
              <dt className="text-secondary">Correo</dt>
              <dd className="m-0 truncate text-ink">{student.email}</dd>
              <dt className="text-secondary">Sede</dt>
              <dd className="m-0 text-ink">{student.campus}</dd>
            </dl>
          </section>

          {/* Documentos */}
          <section>
            <h3 className="m-0 text-sm font-semibold text-ink">Documentos</h3>
            <ul className="m-0 mt-2 list-none divide-y divide-line-soft p-0">
              {student.documentsAttached.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate text-sm text-ink">{doc.name}</span>
                  <button
                    type="button"
                    onClick={() => onViewDocument(doc)}
                    className="shrink-0 text-sm font-semibold text-green-dark hover:underline cursor-pointer"
                  >
                    Ver
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {isPending && (
          <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
            <button
              type="button"
              onClick={() => onOpenObservation(student)}
              className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-page cursor-pointer"
            >
              Pedir corrección
            </button>
            <button
              type="button"
              onClick={() => onApprove(student.id)}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-soft cursor-pointer"
            >
              Aprobar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
