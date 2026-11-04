import { useEffect, useMemo, useState } from 'react';
import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';
import CompanyPageHero from '../components/company/CompanyPageHero.jsx';
import RecruiterModal from '../components/company/RecruiterModal.jsx';
import { useCompanyRecruiters } from '../hooks/useCompanyRecruiters.js';
import { countActiveVacancies, useCompanyVacancies } from '../hooks/useCompanyVacancies.js';
import { useCompanySites } from '../hooks/useCompanySites.js';
import { companyPhotos } from '../data/companyImages.js';
import { RECRUITER_STATUS } from '../data/companyRecruitersData.js';

const selectClass =
  'w-full appearance-none rounded-xl border border-sand-line bg-white py-2.5 pl-3.5 pr-9 text-xs font-semibold text-ink outline-none transition-colors focus:border-terracotta cursor-pointer';

function initialsOf(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function Avatar({ recruiter }) {
  const [failed, setFailed] = useState(false);
  if (recruiter.avatar && !failed) {
    return (
      <img
        src={recruiter.avatar}
        alt={recruiter.fullName}
        onError={() => setFailed(true)}
        className="size-14 shrink-0 rounded-full border-2 border-white object-cover shadow-card"
      />
    );
  }
  return (
    <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-white bg-sand font-display text-base font-bold text-terracotta-dark shadow-card">
      {initialsOf(recruiter.fullName)}
    </span>
  );
}

export default function CompanyAdminRecruitersPage() {
  const { recruiters, addRecruiter, updateRecruiter, deleteRecruiter } = useCompanyRecruiters();
  const { vacancies, unassignOwner } = useCompanyVacancies();
  const { sites } = useCompanySites();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const siteById = useMemo(() => Object.fromEntries(sites.map((s) => [s.id, s])), [sites]);

  const stats = useMemo(
    () => [
      { value: recruiters.length, label: 'Reclutadores' },
      { value: recruiters.filter((r) => r.status === 'active').length, label: 'Activos' },
      { value: recruiters.filter((r) => r.status === 'invited').length, label: 'Invitados' },
    ],
    [recruiters]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recruiters.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    });
  }, [recruiters, query, statusFilter]);

  const hasFilters = query.trim() !== '' || statusFilter !== 'all';

  function clearFilters() {
    setQuery('');
    setStatusFilter('all');
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(recruiter) {
    setEditing(recruiter);
    setModalOpen(true);
  }

  function handleSave(data) {
    if (editing) {
      updateRecruiter(editing.id, data);
      setToast(`Se actualizó a ${data.fullName}.`);
    } else {
      addRecruiter(data);
      setToast(`Invitación enviada a ${data.email}.`);
    }
  }

  function handleToggleSuspend(recruiter) {
    if (recruiter.status === 'invited') {
      setToast(`Invitación reenviada a ${recruiter.email}.`);
      return;
    }
    if (recruiter.status === 'active') {
      updateRecruiter(recruiter.id, { status: 'suspended' });
      setToast(`Se suspendió el acceso de ${recruiter.fullName}.`);
      return;
    }
    updateRecruiter(recruiter.id, { status: 'active' });
    setToast(`Se reactivó a ${recruiter.fullName}.`);
  }

  function handleRequestDelete(recruiter) {
    setDeleting(recruiter);
  }

  function handleConfirmDelete() {
    unassignOwner(deleting.id);
    deleteRecruiter(deleting.id);
    setToast(`Se eliminó a ${deleting.fullName} del equipo.`);
    setDeleting(null);
  }

  return (
    <CompanyPortalLayout activePage="admin-reclutadores">
      <main className="w-full pb-20">
        <div className="mx-auto max-w-6xl px-5 pt-6 sm:px-8 lg:px-10">
          <CompanyPageHero
            photo={companyPhotos.reclutadores}
            title="Reclutadores de la empresa"
            subtitle="Gestiona a tu equipo de reclutadores y las sedes en las que colabora cada persona."
            stats={stats}
            actions={
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-terracotta px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-terracotta-dark cursor-pointer"
              >
                <i className="bx bx-user-plus text-base" aria-hidden="true" />
                <span>Invitar reclutador</span>
              </button>
            }
          />

          {/* Filtros */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-md">
              <i
                className="bx bx-search pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-secondary"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, correo o cargo..."
                aria-label="Buscar reclutador"
                className="w-full rounded-xl border border-sand-line bg-white py-2.5 pl-10 pr-3 text-xs text-ink outline-none transition-colors placeholder:text-secondary focus:border-terracotta"
              />
            </div>

            <div className="relative sm:w-56">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filtrar por estado"
                className={selectClass}
              >
                <option value="all">Todos los estados</option>
                {Object.entries(RECRUITER_STATUS).map(([id, s]) => (
                  <option key={id} value={id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <i
                className="bx bx-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-secondary"
                aria-hidden="true"
              />
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-secondary hover:text-terracotta cursor-pointer"
              >
                <i className="bx bx-x text-sm" aria-hidden="true" />
                Limpiar filtros
              </button>
            )}
          </div>

          <p className="m-0 mt-4 text-xs text-secondary">
            Mostrando <strong className="font-bold text-ink">{filtered.length}</strong> de {recruiters.length} reclutadores
          </p>

          {/* Lista */}
          {filtered.length === 0 ? (
            <div className="mt-4 rounded-card border border-sand-line bg-white p-12 text-center shadow-card">
              <i className="bx bx-user-x text-4xl text-terracotta" aria-hidden="true" />
              <h3 className="m-0 mt-2 font-display text-base font-bold text-ink">
                No se encontraron reclutadores
              </h3>
              <p className="m-0 mx-auto mt-1 max-w-sm text-xs text-secondary">
                Ninguna persona coincide con la búsqueda o los filtros aplicados.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-xl border border-sand-line bg-cream px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-sand cursor-pointer"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
              {filtered.map((r) => {
                const status = RECRUITER_STATUS[r.status] || RECRUITER_STATUS.active;
                const sites = (r.siteIds || []).map((id) => siteById[id]?.city).filter(Boolean);
                const activeVacancies = countActiveVacancies(vacancies, r.id);

                return (
                  <li key={r.id}>
                    <article className="flex flex-col gap-4 rounded-card border border-sand-line bg-white p-5 shadow-card transition-colors hover:border-terracotta/40 lg:flex-row lg:items-center">
                      <Avatar recruiter={r} />

                      <div className="min-w-0 flex-1">
                        <h3 className="m-0 font-display text-base font-bold leading-snug text-ink">
                          {r.fullName}
                        </h3>
                        <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-secondary">
                          <span className="font-medium text-ink/90">Reclutador</span>
                          <span className="text-secondary/50">•</span>
                          <span>{sites.join(', ') || 'Sin sedes asignadas'}</span>
                        </p>
                        <p className="m-0 mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink/80">
                          <span className="flex items-center gap-1.5">
                            <i
                              className="bx bx-envelope text-sm text-terracotta"
                              aria-hidden="true"
                            />
                            {r.email}
                          </span>
                          {r.phone && (
                            <span className="flex items-center gap-1.5">
                              <i
                                className="bx bx-phone text-sm text-terracotta"
                                aria-hidden="true"
                              />
                              {r.phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <i
                              className="bx bx-briefcase-alt-2 text-sm text-terracotta"
                              aria-hidden="true"
                            />
                            {activeVacancies} vacante(s) activa(s)
                          </span>
                          <span className="flex items-center gap-1.5 text-secondary">
                            <i className="bx bx-time-five text-sm" aria-hidden="true" />
                            {r.lastAccess}
                          </span>
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                          <span className={`size-2 rounded-full ${status.dot}`} aria-hidden="true" />
                          {status.label}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleSuspend(r)}
                          className="rounded-xl border border-sand-line bg-cream px-3 py-2 text-xs font-bold text-ink transition-colors hover:bg-sand cursor-pointer"
                        >
                          {r.status === 'active'
                            ? 'Suspender'
                            : r.status === 'invited'
                              ? 'Reenviar'
                              : 'Reactivar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-cocoa px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-cocoa/85 cursor-pointer"
                        >
                          <i className="bx bx-edit text-sm text-ochre" aria-hidden="true" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestDelete(r)}
                          className="grid size-8 place-items-center rounded-xl border border-sand-line text-secondary transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          title="Eliminar del equipo"
                          aria-label={`Eliminar a ${r.fullName}`}
                        >
                          <i className="bx bx-trash text-sm" aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <RecruiterModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          recruiter={editing}
          availableSites={sites}
        />

        {/* Confirmar eliminación */}
        {deleting && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa/55 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-recruiter-title"
            onClick={() => setDeleting(null)}
          >
            <div
              className="w-full max-w-md rounded-card bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="delete-recruiter-title" className="m-0 font-display text-lg font-bold text-ink">
                ¿Eliminar a {deleting.fullName}?
              </h2>
              <p className="m-0 mt-2 text-sm text-body-muted">
                Perderá el acceso al portal de la empresa. Esta acción no se puede deshacer.
              </p>
              {countActiveVacancies(vacancies, deleting.id) > 0 && (
                <p className="m-0 mt-3 rounded-lg bg-ochre/15 px-3 py-2 text-xs text-cocoa">
                  Tiene <strong>{countActiveVacancies(vacancies, deleting.id)}</strong> vacante(s) activa(s). Quedarán sin responsable y podrás reasignarlas desde la sección de Vacantes.
                </p>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleting(null)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-secondary hover:text-ink cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="rounded-lg bg-terracotta px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-terracotta-dark cursor-pointer"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div
            role="status"
            className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg bg-cocoa px-4 py-3 text-sm font-medium text-white shadow-lg"
          >
            {toast}
          </div>
        )}
      </main>
    </CompanyPortalLayout>
  );
}
