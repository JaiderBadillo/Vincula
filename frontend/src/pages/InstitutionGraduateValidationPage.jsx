import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import StudentObservationModal from '../components/institution/StudentObservationModal.jsx';
import StudentValidationDrawer from '../components/institution/StudentValidationDrawer.jsx';
import { studentValidationRequests } from '../data/institutionData.js';
import { advisorPhotos } from '../data/institutionImages.js';

const tabs = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'approved', label: 'Aprobados' },
  { id: 'rejected', label: 'Con observaciones' },
];

function initials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function InstitutionGraduateValidationPage() {
  const [requests, setRequests] = useState(studentValidationRequests);
  const [tab, setTab] = useState('pending');
  const [query, setQuery] = useState('');
  const [program, setProgram] = useState('all');
  const [order, setOrder] = useState('recent'); // 'recent' | 'oldest'
  const [drawerId, setDrawerId] = useState(null);
  const [observationId, setObservationId] = useState(null);
  const [toast, setToast] = useState(null);

  function notify(message) {
    setToast(message);
    setTimeout(() => setToast(null), 3200);
  }

  const counts = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    }),
    [requests],
  );

  const programs = useMemo(
    () => [...new Set(requests.map((r) => r.program))].sort((a, b) => a.localeCompare(b, 'es')),
    [requests],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = requests.filter((r) => {
      if (r.status !== tab) return false;
      if (program !== 'all' && r.program !== program) return false;
      if (!q) return true;
      return (
        r.studentName.toLowerCase().includes(q) ||
        r.documentId.includes(q) ||
        r.program.toLowerCase().includes(q)
      );
    });
    return order === 'oldest' ? [...list].reverse() : list;
  }, [requests, tab, query, program, order]);

  const drawerStudent = requests.find((r) => r.id === drawerId) || null;
  const observationStudent = requests.find((r) => r.id === observationId) || null;

  function handleApprove(id) {
    const target = requests.find((r) => r.id === id);
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));
    setDrawerId(null);
    notify(`${target.studentName} fue aprobado.`);
  }

  function handleObservation(id, { reason, notes }) {
    const target = requests.find((r) => r.id === id);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: 'rejected', observationReason: reason, observationNotes: notes }
          : r,
      ),
    );
    setObservationId(null);
    setDrawerId(null);
    notify(`Se envió la observación a ${target.studentName}.`);
  }

  const hasFilters = query.trim() !== '' || program !== 'all';

  function handleResetFilters() {
    setQuery('');
    setProgram('all');
    setOrder('recent');
  }

  return (
    <InstitutionPortalLayout activePage="estudiantes-solicitudes">
      <main className="w-full pb-20">
        <div className="max-w-7xl mx-auto px-5 pt-6 sm:px-8 lg:px-10 space-y-6">
          {/* ─── Hero Fotográfico con Identidad Asesor UTS ─── */}
          <InstitutionPageHero
            photo={advisorPhotos.graduateValidation}
            eyebrow="Validación de Títulos & Egresados"
            title="Validar Egresados Institucionales"
            subtitle="Revisa la autenticidad académica, folios de acta y documentos oficiales para habilitar el perfil de egresados en la bolsa de empleo."
            stats={[
              { value: counts.pending, label: 'Pendientes' },
              { value: counts.approved, label: 'Aprobados' },
              { value: counts.rejected, label: 'Observaciones' },
            ]}
            actions={
              <Link
                to="/institucion/estudiantes/seguimiento"
                className="inline-flex items-center gap-1.5 rounded-xl bg-lime hover:bg-lime/85 text-ink px-4 py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer no-underline"
              >
                <i className="bx bx-history text-base" />
                <span>Ver Seguimiento Laboral</span>
              </Link>
            }
          />

          {/* ─── Filtros y Pestañas Tipo Pills (Fijo / Sticky al hacer scroll) ─── */}
          <div className="sticky top-[4.75rem] z-10 flex flex-col gap-3.5 rounded-2xl border border-line bg-white/95 backdrop-blur-md p-4 shadow-card sm:p-5 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Pestañas de Estado */}
              <div className="flex flex-wrap items-center gap-2" role="tablist">
                {tabs.map((t) => {
                  const isActive = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setTab(t.id)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-lime text-ink shadow-xs'
                          : 'bg-page text-secondary hover:text-ink hover:bg-panel'
                      }`}
                    >
                      <span>{t.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.2 text-[0.62rem] font-black ${
                          isActive ? 'bg-ink text-white' : 'bg-line text-secondary'
                        }`}
                      >
                        {counts[t.id]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Buscador Rápido */}
              <div className="relative md:w-72">
                <i className="bx bx-search absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-secondary pointer-events-none" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar egresado, cédula o carrera..."
                  aria-label="Buscar egresado"
                  className="w-full rounded-xl border border-line bg-page py-2 pl-10 pr-3 text-xs text-ink placeholder:text-secondary outline-none focus:border-green focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Subfiltros por Carrera y Orden */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line-soft text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 font-semibold text-secondary">
                  <span>Carrera:</span>
                  <select
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    className="rounded-lg border border-line bg-page px-2.5 py-1.5 text-xs font-semibold text-ink outline-none hover:border-green focus:border-green cursor-pointer"
                  >
                    <option value="all">Todas las carreras ({programs.length})</option>
                    {programs.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-1.5 font-semibold text-secondary">
                  <span>Fecha:</span>
                  <select
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    className="rounded-lg border border-line bg-page px-2.5 py-1.5 text-xs font-semibold text-ink outline-none hover:border-green focus:border-green cursor-pointer"
                  >
                    <option value="recent">Más reciente primero</option>
                    <option value="oldest">Más antigua primero</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-secondary font-medium">
                  Mostrando <strong>{visible.length}</strong> solicitudes
                </span>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-green-dark hover:underline font-bold text-xs cursor-pointer flex items-center gap-1"
                  >
                    <i className="bx bx-reset" />
                    <span>Limpiar filtros</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ─── Lista de Tarjetas Rectangulares de Solicitudes ─── */}
          {visible.length === 0 ? (
            <div className="rounded-card border border-dashed border-line bg-white p-12 text-center shadow-card space-y-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-panel text-secondary text-2xl mx-auto">
                <i className="bx bx-user-x" />
              </div>
              <h3 className="m-0 font-display text-base font-bold text-ink">
                No hay solicitudes en esta sección
              </h3>
              <p className="m-0 text-xs text-secondary max-w-sm mx-auto">
                Ninguna solicitud de egresado coincide con la pestaña o los filtros aplicados.
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-lime px-4 py-2 text-xs font-bold text-ink hover:bg-lime/85 transition-colors cursor-pointer"
                >
                  Restablecer Filtros
                </button>
              )}
            </div>
          ) : (
            <ul className="m-0 list-none p-0 flex flex-col gap-3.5">
              {visible.map((student) => {
                const isVerified = student.academicMatch.status === 'verified';

                return (
                  <li key={student.id}>
                    <article className="flex flex-col gap-4 rounded-card border border-line bg-white p-5 shadow-card transition-all hover:border-green/40 lg:flex-row lg:items-center">
                      {/* Avatar */}
                      {student.avatar ? (
                        <img
                          src={student.avatar}
                          alt={student.studentName}
                          className="size-14 shrink-0 rounded-full border-2 border-white object-cover shadow-card"
                        />
                      ) : (
                        <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-white bg-lime/20 font-display text-base font-bold text-green-dark shadow-card">
                          {initials(student.studentName)}
                        </span>
                      )}

                      {/* Información Principal */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <h3 className="m-0 font-display text-base font-bold leading-snug text-ink">
                            {student.studentName}
                          </h3>
                          <span className="rounded-full bg-panel px-2.5 py-0.5 text-[0.62rem] font-bold text-ink">
                            Cód: {student.studentCode}
                          </span>
                        </div>

                        <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2 text-xs text-secondary">
                          <span className="font-semibold text-green-dark">{student.program}</span>
                          <span className="text-secondary/50">•</span>
                          <span>Grado {student.graduationYear} ({student.graduationPeriod})</span>
                          <span className="text-secondary/50">•</span>
                          <span>{student.documentType} {student.documentId}</span>
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink/80">
                          <span className="flex items-center gap-1.5 text-secondary">
                            <i className="bx bx-time-five text-sm text-green" aria-hidden="true" />
                            <span>Solicitado: {student.requestedAt}</span>
                          </span>

                          <span className="flex items-center gap-1.5 text-secondary">
                            <i className="bx bx-file text-sm text-green" aria-hidden="true" />
                            <span>{student.documentsAttached?.length || 0} documento(s) adjuntos</span>
                          </span>

                          {/* Cruce Académico Badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold ${
                              isVerified
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-panel text-ink border border-line'
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                isVerified ? 'bg-emerald-600' : 'bg-slate-400'
                              }`}
                            />
                            {student.academicMatch.label}
                          </span>
                        </div>
                      </div>

                      {/* Acciones Rápidas */}
                      <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end pt-2 lg:pt-0 border-t border-line lg:border-t-0">
                        {tab === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(student.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-lime hover:bg-lime/85 text-ink px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-xs"
                              title="Aprobar solicitud y activar egresado"
                            >
                              <i className="bx bx-check text-base" />
                              <span>Aprobar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setObservationId(student.id)}
                              className="inline-flex items-center gap-1 rounded-xl border border-line bg-white hover:bg-panel text-secondary hover:text-ink px-3 py-2 text-xs font-semibold transition-colors cursor-pointer"
                              title="Enviar observaciones sobre documentos"
                            >
                              <i className="bx bx-message-error text-base" />
                              <span>Observación</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => setDrawerId(student.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-page hover:bg-white text-ink px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                          title="Abrir expediente completo y verificar folios"
                        >
                          <i className="bx bx-folder-open text-base text-green-dark" />
                          <span>Ver Expediente</span>
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <StudentValidationDrawer
          isOpen={Boolean(drawerStudent)}
          student={drawerStudent}
          onClose={() => setDrawerId(null)}
          onApprove={handleApprove}
          onOpenObservation={(st) => setObservationId(st.id)}
          onViewDocument={(doc) => notify(`Abriendo ${doc.name}…`)}
        />

        <StudentObservationModal
          isOpen={Boolean(observationStudent)}
          student={observationStudent}
          onClose={() => setObservationId(null)}
          onConfirm={handleObservation}
        />

        {toast && (
          <div
            role="status"
            className="fixed bottom-6 right-6 z-50 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-hero flex items-center gap-2 animate-rise-in"
          >
            <i className="bx bx-check-circle text-lime text-lg" />
            <span>{toast}</span>
          </div>
        )}
      </main>
    </InstitutionPortalLayout>
  );
}
