import { useMemo, useState } from 'react';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import StudentObservationModal from '../components/institution/StudentObservationModal.jsx';
import StudentValidationDrawer from '../components/institution/StudentValidationDrawer.jsx';
import { studentValidationRequests } from '../data/institutionData.js';

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
    // El listado original ya viene de más reciente a más antiguo
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

  return (
    <InstitutionPortalLayout activePage="estudiantes-solicitudes">
      <main className="w-full pb-16">
        <div className="max-w-5xl mx-auto px-5 pt-8 sm:px-8 lg:px-10">
          <h1 className="m-0 font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            Validar egresados
          </h1>
          <p className="m-0 mt-1 text-sm text-body-muted">
            Revisa los documentos de cada solicitud y confirma que la persona es egresada de la UTS.
          </p>

          {/* Pestañas simples + búsqueda */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-line">
            <div className="flex items-center gap-6" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors cursor-pointer ${
                    tab === t.id
                      ? 'border-ink text-ink'
                      : 'border-transparent text-secondary hover:text-ink'
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 text-xs font-medium text-secondary">{counts[t.id]}</span>
                </button>
              ))}
            </div>

            <div className="relative pb-2 sm:w-64">
              <i className="bx bx-search absolute left-3 top-[0.7rem] text-secondary pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar egresado"
                aria-label="Buscar egresado"
                className="w-full rounded-lg border border-line bg-white py-1.5 pl-9 pr-3 text-sm text-ink placeholder:text-body-muted outline-none focus:border-ink"
              />
            </div>
          </div>

          {/* Filtrar por carrera y ordenar por fecha */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <label className="flex items-center gap-2 text-secondary">
              Carrera
              <select
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="max-w-[16rem] rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none focus:border-ink cursor-pointer"
              >
                <option value="all">Todas</option>
                {programs.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-secondary">
              Fecha
              <select
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none focus:border-ink cursor-pointer"
              >
                <option value="recent">Más reciente primero</option>
                <option value="oldest">Más antigua primero</option>
              </select>
            </label>

            {program !== 'all' && (
              <button
                type="button"
                onClick={() => setProgram('all')}
                className="font-semibold text-green-dark hover:underline cursor-pointer"
              >
                Quitar filtro
              </button>
            )}
          </div>

          {/* Lista */}
          {visible.length === 0 ? (
            <p className="py-16 text-center text-sm text-secondary">
              No hay solicitudes en esta pestaña.
            </p>
          ) : (
            <ul className="m-0 list-none p-0 divide-y divide-line-soft">
              {visible.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    onClick={() => setDrawerId(student.id)}
                    className="flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-page/70 px-2 -mx-2 rounded-lg cursor-pointer"
                  >
                    {student.avatar ? (
                      <img
                        src={student.avatar}
                        alt=""
                        className="size-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-panel text-xs font-bold text-ink">
                        {initials(student.studentName)}
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {student.studentName}
                      </span>
                      <span className="block truncate text-xs text-secondary">
                        {student.program} · Grado {student.graduationYear}
                      </span>
                    </span>

                    {student.academicMatch.status !== 'verified' && tab === 'pending' && (
                      <span className="hidden sm:inline text-xs font-medium text-amber-700">
                        Revisar datos
                      </span>
                    )}

                    <span className="hidden sm:block text-xs text-secondary shrink-0">
                      {student.requestedAt}
                    </span>
                    <i className="bx bx-chevron-right text-xl text-secondary shrink-0" />
                  </button>
                </li>
              ))}
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
            className="fixed bottom-6 right-6 z-50 rounded-lg bg-ink px-4 py-3 text-sm font-medium text-white shadow-lg"
          >
            {toast}
          </div>
        )}
      </main>
    </InstitutionPortalLayout>
  );
}
