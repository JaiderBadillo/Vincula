import { useEffect, useMemo, useState } from 'react';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import { initialAdvisors, institutionPrograms } from '../data/institutionAdminData.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Initials({ name }) {
  const letters = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-panel text-xs font-bold text-ink">
      {letters}
    </span>
  );
}

export default function InstitutionAdminAdvisorsPage() {
  const [advisors, setAdvisors] = useState(initialAdvisors);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [programFilter, setProgramFilter] = useState('all');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState(null); // null if creating
  const [deletingAdvisor, setDeletingAdvisor] = useState(null);
  const [toast, setToast] = useState(null);

  // Form state
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    position: 'Asesor de Graduados',
    programs: [],
    status: 'active',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  function notify(msg) {
    setToast(msg);
  }

  // Filtered advisors list
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return advisors.filter((adv) => {
      if (statusFilter !== 'all' && adv.status !== statusFilter) return false;
      if (programFilter !== 'all' && !adv.programs.includes(programFilter)) return false;
      if (!q) return true;
      return (
        adv.fullName.toLowerCase().includes(q) ||
        adv.email.toLowerCase().includes(q) ||
        adv.position.toLowerCase().includes(q)
      );
    });
  }, [advisors, query, statusFilter, programFilter]);

  function openCreateModal() {
    setEditingAdvisor(null);
    setForm({
      fullName: '',
      email: '',
      phone: '',
      position: 'Asesor de Graduados',
      programs: [institutionPrograms[0]?.id || 'sistemas'],
      status: 'active',
    });
    setErrors({});
    setModalOpen(true);
  }

  function openEditModal(advisor) {
    setEditingAdvisor(advisor);
    setForm({
      fullName: advisor.fullName,
      email: advisor.email,
      phone: advisor.phone || '',
      position: advisor.position,
      programs: [...advisor.programs],
      status: advisor.status,
    });
    setErrors({});
    setModalOpen(true);
  }

  function handleProgramToggle(progId) {
    setForm((prev) => {
      const exists = prev.programs.includes(progId);
      if (exists) {
        return { ...prev, programs: prev.programs.filter((p) => p !== progId) };
      }
      return { ...prev, programs: [...prev.programs, progId] };
    });
  }

  function validate() {
    const next = {};
    if (!form.fullName.trim()) next.fullName = 'Escribe el nombre completo.';
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Escribe un correo electrónico válido.';
    if (form.programs.length === 0) next.programs = 'Selecciona al menos un programa académico.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSaveAdvisor(e) {
    e.preventDefault();
    if (!validate()) return;

    if (editingAdvisor) {
      // Edit
      setAdvisors((prev) =>
        prev.map((a) =>
          a.id === editingAdvisor.id
            ? {
                ...a,
                fullName: form.fullName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                position: form.position,
                programs: form.programs,
                status: form.status,
              }
            : a,
        ),
      );
      notify(`Se actualizaron los datos de ${form.fullName.trim()}.`);
    } else {
      // Create
      const newAdv = {
        id: `adv-${Date.now().toString().slice(-4)}`,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        position: form.position,
        programs: form.programs,
        status: form.status,
        lastAccess: 'Sin accesos registrados',
        avatar: null,
      };
      setAdvisors((prev) => [newAdv, ...prev]);
      notify(`Se vinculó a ${newAdv.fullName} como asesor.`);
    }

    setModalOpen(false);
  }

  function handleToggleStatus(advisor) {
    const nextStatus = advisor.status === 'active' ? 'inactive' : 'active';
    setAdvisors((prev) =>
      prev.map((a) => (a.id === advisor.id ? { ...a, status: nextStatus } : a)),
    );
    notify(
      nextStatus === 'active'
        ? `Se activó la cuenta de ${advisor.fullName}.`
        : `Se suspendió el acceso de ${advisor.fullName}.`,
    );
  }

  function handleConfirmDelete() {
    if (!deletingAdvisor) return;
    setAdvisors((prev) => prev.filter((a) => a.id !== deletingAdvisor.id));
    notify(`Se desvinculó a ${deletingAdvisor.fullName}.`);
    setDeletingAdvisor(null);
  }

  const inputClass =
    'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-body-muted outline-none focus:border-ink';

  return (
    <InstitutionPortalLayout activePage="admin-asesores" role="admin">
      <main className="w-full pb-20">
        <div className="mx-auto max-w-5xl px-5 pt-8 sm:px-8 lg:px-10">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-line pb-6">
            <div>
              <h1 className="m-0 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Asesores vinculados
              </h1>
              <p className="m-0 mt-1 text-sm text-body-muted">
                Administra los asesores que tienen permiso para validar egresados y convenios en nombre de la UTS.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-soft cursor-pointer shrink-0 transition-colors"
            >
              <i className="bx bx-plus text-base" />
              <span>Vincular asesor</span>
            </button>
          </div>

          {/* Filtros */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o correo..."
                aria-label="Buscar asesor"
                className={`${inputClass} pl-9`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2 text-secondary">
                Estado
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none focus:border-ink cursor-pointer"
                >
                  <option value="all">Todos ({advisors.length})</option>
                  <option value="active">
                    Activos ({advisors.filter((a) => a.status === 'active').length})
                  </option>
                  <option value="inactive">
                    Inactivos ({advisors.filter((a) => a.status === 'inactive').length})
                  </option>
                </select>
              </label>

              <label className="flex items-center gap-2 text-secondary">
                Programa
                <select
                  value={programFilter}
                  onChange={(e) => setProgramFilter(e.target.value)}
                  className="max-w-[14rem] rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none focus:border-ink cursor-pointer"
                >
                  <option value="all">Todos los programas</option>
                  {institutionPrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Lista de Asesores */}
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-secondary">
              <p className="m-0">No se encontraron asesores con los filtros seleccionados.</p>
              {(query || statusFilter !== 'all' || programFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('all');
                    setProgramFilter('all');
                  }}
                  className="mt-2 text-sm font-semibold text-green-dark hover:underline cursor-pointer"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <ul className="m-0 mt-6 list-none divide-y divide-line-soft border-t border-line p-0">
              {filtered.map((advisor) => {
                const isActive = advisor.status === 'active';
                const assignedPrograms = institutionPrograms.filter((p) =>
                  advisor.programs.includes(p.id),
                );

                return (
                  <li
                    key={advisor.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between -mx-2 px-2 rounded-lg hover:bg-page/50 transition-colors"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      {advisor.avatar ? (
                        <img
                          src={advisor.avatar}
                          alt=""
                          className="size-11 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <Initials name={advisor.fullName} />
                      )}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="m-0 text-sm font-semibold text-ink truncate">
                            {advisor.fullName}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.68rem] font-bold ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                isActive ? 'bg-emerald-600' : 'bg-neutral-400'
                              }`}
                            />
                            {isActive ? 'Activo' : 'Suspendido'}
                          </span>
                        </div>

                        <p className="m-0 mt-0.5 text-xs text-secondary truncate">
                          {advisor.position} · {advisor.email} {advisor.phone && `· ${advisor.phone}`}
                        </p>

                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {assignedPrograms.map((prog) => (
                            <span
                              key={prog.id}
                              className="rounded bg-panel px-2 py-0.5 text-[0.68rem] font-medium text-secondary"
                            >
                              {prog.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line-soft">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(advisor)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-secondary hover:text-ink hover:bg-panel cursor-pointer transition-colors"
                        title={isActive ? 'Suspender acceso' : 'Habilitar acceso'}
                      >
                        {isActive ? 'Suspender' : 'Activar'}
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(advisor)}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-page cursor-pointer transition-colors"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingAdvisor(advisor)}
                        className="rounded-lg px-2 py-1.5 text-xs text-secondary hover:text-rose-600 cursor-pointer transition-colors"
                        title="Desvincular asesor"
                        aria-label={`Desvincular a ${advisor.fullName}`}
                      >
                        <i className="bx bx-trash text-base" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Modal Crear / Editar Asesor */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="advisor-modal-title"
            onClick={() => setModalOpen(false)}
          >
            <form
              onSubmit={handleSaveAdvisor}
              onClick={(e) => e.stopPropagation()}
              noValidate
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 id="advisor-modal-title" className="m-0 font-display text-lg font-bold text-ink">
                    {editingAdvisor ? 'Editar asesor' : 'Vincular nuevo asesor'}
                  </h2>
                  <p className="m-0 mt-0.5 text-xs text-secondary">
                    {editingAdvisor
                      ? 'Modifica los programas asignados o el cargo del asesor.'
                      : 'Crea el perfil del asesor para que pueda acceder a validar egresados.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="grid size-8 place-items-center rounded-lg text-secondary hover:text-ink cursor-pointer"
                  aria-label="Cerrar"
                >
                  <i className="bx bx-x text-2xl" />
                </button>
              </div>

              {/* Nombre */}
              <div>
                <label htmlFor="adv-name" className="block text-sm font-semibold text-ink">
                  Nombre completo
                </label>
                <input
                  id="adv-name"
                  className={`${inputClass} mt-1`}
                  value={form.fullName}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, fullName: e.target.value }));
                    if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined }));
                  }}
                  placeholder="Ej. Camila Morales Rey"
                />
                {errors.fullName && <p className="m-0 mt-1 text-xs text-rose-600">{errors.fullName}</p>}
              </div>

              {/* Correo y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="adv-email" className="block text-sm font-semibold text-ink">
                    Correo institucional
                  </label>
                  <input
                    id="adv-email"
                    type="email"
                    className={`${inputClass} mt-1`}
                    value={form.email}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, email: e.target.value }));
                      if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                    }}
                    placeholder="usuario@correo.uts.edu.co"
                  />
                  {errors.email && <p className="m-0 mt-1 text-xs text-rose-600">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="adv-phone" className="block text-sm font-semibold text-ink">
                    Teléfono / Celular
                  </label>
                  <input
                    id="adv-phone"
                    className={`${inputClass} mt-1`}
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+57 318 000 0000"
                  />
                </div>
              </div>

              {/* Cargo y Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="adv-position" className="block text-sm font-semibold text-ink">
                    Cargo o función
                  </label>
                  <input
                    id="adv-position"
                    className={`${inputClass} mt-1`}
                    value={form.position}
                    onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                    placeholder="Ej. Asesor de Graduados"
                  />
                </div>

                <div>
                  <label htmlFor="adv-status" className="block text-sm font-semibold text-ink">
                    Estado de la cuenta
                  </label>
                  <select
                    id="adv-status"
                    className={`${inputClass} mt-1 cursor-pointer`}
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="active">Activo (permite ingreso)</option>
                    <option value="inactive">Inactivo (acceso suspendido)</option>
                  </select>
                </div>
              </div>

              {/* Programas Académicos Asignados */}
              <div>
                <label className="block text-sm font-semibold text-ink">
                  Programas asignados
                </label>
                <p className="m-0 mt-0.5 text-xs text-secondary">
                  El asesor gestionará las solicitudes y vacantes de estos programas.
                </p>

                <div className="mt-2 space-y-1.5 rounded-lg border border-line bg-page/50 p-3 max-h-40 overflow-y-auto">
                  {institutionPrograms.map((prog) => {
                    const checked = form.programs.includes(prog.id);
                    return (
                      <label
                        key={prog.id}
                        className="flex items-center gap-2.5 text-xs text-ink cursor-pointer select-none py-1"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            handleProgramToggle(prog.id);
                            if (errors.programs) setErrors((p) => ({ ...p, programs: undefined }));
                          }}
                          className="size-4 rounded border-line text-ink focus:ring-ink cursor-pointer"
                        />
                        <span>{prog.name}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.programs && <p className="m-0 mt-1 text-xs text-rose-600">{errors.programs}</p>}
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-secondary hover:text-ink cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-soft cursor-pointer"
                >
                  {editingAdvisor ? 'Guardar cambios' : 'Vincular asesor'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Confirmar Desvinculación */}
        {deletingAdvisor && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            onClick={() => setDeletingAdvisor(null)}
          >
            <div
              className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="delete-confirm-title" className="m-0 font-display text-lg font-bold text-ink">
                ¿Desvincular a {deletingAdvisor.fullName}?
              </h2>
              <p className="m-0 text-sm text-body-muted">
                Esta persona perderá el acceso al portal institucional UTS y no podrá seguir validando solicitudes ni atendiendo convenios.
              </p>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setDeletingAdvisor(null)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-secondary hover:text-ink cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 cursor-pointer"
                >
                  Sí, desvincular
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
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
