import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';
import CompanyPageHero from '../components/company/CompanyPageHero.jsx';
import SiteModal from '../components/company/SiteModal.jsx';
import { useCompanySites } from '../hooks/useCompanySites.js';
import { useCompanyRecruiters } from '../hooks/useCompanyRecruiters.js';
import { useCompanyVacancies } from '../hooks/useCompanyVacancies.js';
import { companyPhotos } from '../data/companyImages.js';
import { COMPANY_SITE_STATUS, AVAILABLE_CITIES } from '../data/companySitesData.js';

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

export default function CompanyAdminSitesPage() {
  const { sites, addSite, updateSite, deleteSite, toggleSiteStatus, setMainSite } = useCompanySites();
  const { recruiters, removeSiteFromAllRecruiters } = useCompanyRecruiters();
  const { vacancies } = useCompanyVacancies();

  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [deletingSite, setDeletingSite] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Mapa de reclutadores asignados por ID de sede
  const recruitersBySiteId = useMemo(() => {
    const map = {};
    sites.forEach((site) => {
      map[site.id] = recruiters.filter((r) => (r.siteIds || []).includes(site.id));
    });
    return map;
  }, [sites, recruiters]);

  // Mapa de vacantes activas por ID de sede
  const activeVacanciesBySiteId = useMemo(() => {
    const map = {};
    sites.forEach((site) => {
      map[site.id] = vacancies.filter((v) => v.siteId === site.id && v.status === 'open').length;
    });
    return map;
  }, [sites, vacancies]);

  // Métricas generales para el Hero banner
  const heroStats = useMemo(() => {
    const activeCount = sites.filter((s) => s.status === 'active').length;
    const totalRecruitersAssigned = recruiters.filter((r) => (r.siteIds || []).length > 0).length;
    const totalDepartments = new Set(sites.flatMap((s) => s.departments || [])).size;

    return [
      { value: String(sites.length), label: 'Sedes Totales' },
      { value: String(activeCount), label: 'Sedes Activas' },
      { value: String(totalRecruitersAssigned), label: 'Reclutadores' },
      { value: String(totalDepartments), label: 'Áreas Únicas' },
    ];
  }, [sites, recruiters]);

  // Filtrado de la lista
  const filteredSites = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sites.filter((site) => {
      if (cityFilter !== 'all' && site.city !== cityFilter) return false;
      if (statusFilter !== 'all' && site.status !== statusFilter) return false;

      if (!q) return true;

      const inName = site.name.toLowerCase().includes(q);
      const inShort = site.shortName?.toLowerCase().includes(q);
      const inCity = site.city.toLowerCase().includes(q);
      const inAddress = site.address?.toLowerCase().includes(q);
      const inManager = site.manager?.toLowerCase().includes(q);
      const inDepartments = (site.departments || []).some((d) => d.toLowerCase().includes(q));

      return inName || inShort || inCity || inAddress || inManager || inDepartments;
    });
  }, [sites, query, cityFilter, statusFilter]);

  function handleOpenCreate() {
    setEditingSite(null);
    setModalOpen(true);
  }

  function handleOpenEdit(site) {
    setEditingSite(site);
    setModalOpen(true);
  }

  function handleSaveSite(payload, existingId) {
    if (existingId) {
      updateSite(existingId, payload);
      setToast(`Sede "${payload.name}" actualizada con éxito.`);
      return existingId;
    }
    const createdId = addSite(payload);
    setToast(`Sede "${payload.name}" creada con éxito.`);
    return createdId;
  }

  function handleConfirmDelete() {
    if (!deletingSite) return;

    // Validación: No permitir borrar la sede principal
    if (deletingSite.isMain && sites.length > 1) {
      setToast('No puedes eliminar la sede principal. Asigna otra sede como principal primero.');
      setDeletingSite(null);
      return;
    }

    // Validación: advertir si tiene vacantes abiertas
    const openVacancies = activeVacanciesBySiteId[deletingSite.id] || 0;
    if (openVacancies > 0) {
      setToast(`No se puede eliminar: tiene ${openVacancies} vacante(s) activa(s) asignadas.`);
      setDeletingSite(null);
      return;
    }

    // Remover la sede de todos los reclutadores que la tenían
    removeSiteFromAllRecruiters(deletingSite.id);
    deleteSite(deletingSite.id);
    setToast(`Sede "${deletingSite.name}" eliminada.`);
    setDeletingSite(null);
  }

  return (
    <CompanyPortalLayout activePage="admin-sedes" role="admin">
      <main className="w-full pb-20">
        <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-10 space-y-8">
          {/* ─── 1. Hero Showcase de Sedes y Áreas ─── */}
          <CompanyPageHero
            photo={companyPhotos.sedes}
            title="Sedes y Áreas de la Empresa"
            subtitle="Gestiona las sedes físicas, plantas de operaciones y áreas funcionales donde opera tu organización y asocia los reclutadores encargados."
            stats={heroStats}
            actions={
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-ochre hover:bg-ochre-light text-cocoa font-bold px-4 py-2.5 text-xs shadow-xs transition-all cursor-pointer"
              >
                <i className="bx bx-plus text-base" />
                <span>Nueva Sede</span>
              </button>
            }
          />

          {/* Toast Notification */}
          {toast && (
            <div
              className="flex items-center justify-between rounded-xl border border-sand-line bg-cream px-4 py-2.5 text-xs text-ink shadow-sm animate-in fade-in"
              role="status"
            >
              <div className="flex items-center gap-2">
                <i className="bx bx-check-circle text-base text-terracotta" />
                <span>{toast}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-secondary hover:text-ink cursor-pointer"
              >
                <i className="bx bx-x text-lg" />
              </button>
            </div>
          )}

          {/* ─── 2. Barra de Búsqueda y Filtros ─── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-sand-line bg-white p-4 shadow-2xs">
            <div className="relative flex-1">
              <i
                className="bx bx-search absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-secondary"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre de sede, ciudad, dirección, responsable o área..."
                className="w-full rounded-xl border border-sand-line bg-cream/40 py-2.5 pl-10 pr-3.5 text-xs text-ink placeholder:text-secondary outline-none transition-colors focus:border-terracotta focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* Filtro por Ciudad */}
              <div className="relative w-full sm:w-48">
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className={selectClass}
                  aria-label="Filtrar por ciudad"
                >
                  <option value="all">Todas las ciudades</option>
                  {AVAILABLE_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <i
                  className="bx bx-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-secondary"
                  aria-hidden="true"
                />
              </div>

              {/* Filtro por Estado */}
              <div className="relative w-full sm:w-36">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={selectClass}
                  aria-label="Filtrar por estado"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activas</option>
                  <option value="inactive">Inactivas</option>
                </select>
                <i
                  className="bx bx-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-secondary"
                  aria-hidden="true"
                />
              </div>

              {(query || cityFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setCityFilter('all');
                    setStatusFilter('all');
                  }}
                  className="rounded-xl border border-sand-line bg-cream px-3 py-2.5 text-xs font-semibold text-secondary hover:text-ink hover:bg-sand transition-colors cursor-pointer"
                  title="Limpiar filtros"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* ─── 3. Listado Rectangular de Sedes ─── */}
          {filteredSites.length === 0 ? (
            <div className="rounded-2xl border border-sand-line bg-white p-12 text-center shadow-2xs">
              <span className="grid size-12 place-items-center rounded-2xl bg-sand text-2xl text-terracotta mx-auto mb-3">
                <i className="bx bx-map-pin" />
              </span>
              <h3 className="m-0 font-display text-base font-bold text-ink">
                No se encontraron sedes
              </h3>
              <p className="m-0 mt-1 text-xs text-secondary max-w-sm mx-auto">
                No hay sedes u oficinas que coincidan con los filtros aplicados. Puedes limpiar los criterios o crear una nueva.
              </p>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-cocoa px-4 py-2 text-xs font-bold text-white hover:bg-cocoa/90 transition-colors cursor-pointer"
              >
                <i className="bx bx-plus" />
                <span>Crear Sede</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSites.map((site) => {
                const assignedRecruiters = recruitersBySiteId[site.id] || [];
                const activeVacanciesCount = activeVacanciesBySiteId[site.id] || 0;
                const statusConfig = COMPANY_SITE_STATUS[site.status] || COMPANY_SITE_STATUS.active;

                return (
                  <article
                    key={site.id}
                    className="group rounded-2xl border border-sand-line bg-white p-5 sm:p-6 shadow-2xs hover:shadow-card hover:border-ochre/40 transition-all duration-200"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      {/* Información Principal de la Sede */}
                      <div className="space-y-2.5 flex-1 min-w-0">
                        {/* Cabecera: Nombre, Badge Principal, Estado */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="m-0 font-display text-base sm:text-lg font-bold text-ink">
                            {site.name}
                          </h3>

                          {site.isMain && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-ochre/25 border border-ochre/50 px-2.5 py-0.5 text-[0.68rem] font-bold text-cocoa shadow-2xs">
                              <i className="bx bxs-star text-xs text-ochre-dark" />
                              <span>Sede Principal</span>
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary ml-1">
                            <span className={`size-2 rounded-full ${statusConfig.dot}`} />
                            <span>{statusConfig.label}</span>
                          </span>
                        </div>

                        {/* Ubicación y Dirección */}
                        <div className="flex items-center gap-2 flex-wrap text-xs text-secondary font-medium">
                          <span className="inline-flex items-center gap-1 text-ink font-semibold">
                            <i className="bx bx-map text-terracotta text-sm" />
                            <span>{site.city}, {site.department}</span>
                          </span>
                          <span>•</span>
                          <span>{site.address}</span>
                          {site.phone && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1">
                                <i className="bx bx-phone text-secondary" />
                                <span>{site.phone}</span>
                              </span>
                            </>
                          )}
                          {site.headcount > 0 && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1">
                                <i className="bx bx-user text-secondary" />
                                <span>{site.headcount} colaboradores</span>
                              </span>
                            </>
                          )}
                        </div>

                        {/* Áreas y Departamentos en Chips */}
                        {site.departments && site.departments.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[0.68rem] uppercase font-bold tracking-wider text-secondary">
                              Áreas:
                            </span>
                            {site.departments.map((dept) => (
                              <span
                                key={dept}
                                className="rounded-md border border-sand-line bg-cream/50 px-2 py-0.5 text-[0.7rem] font-medium text-cocoa"
                              >
                                {dept}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Reclutadores Asociados a esta Sede */}
                        <div className="flex items-center gap-3 pt-1 text-xs">
                          <span className="text-secondary font-medium">Reclutadores asignados:</span>
                          {assignedRecruiters.length === 0 ? (
                            <span className="text-amber-800 text-[0.75rem] font-medium italic">
                              Sin reclutadores vinculados
                            </span>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex -space-x-1.5 overflow-hidden">
                                {assignedRecruiters.map((r) => (
                                  <span
                                    key={r.id}
                                    title={`${r.fullName} (${r.email})`}
                                    className="grid size-6 place-items-center rounded-full border-2 border-white bg-sand text-[0.62rem] font-bold text-terracotta-dark shadow-2xs"
                                  >
                                    {initialsOf(r.fullName)}
                                  </span>
                                ))}
                              </div>
                              <span className="font-semibold text-ink text-xs">
                                {assignedRecruiters.map((r) => r.fullName.split(' ')[0]).join(', ')}
                              </span>
                              <span className="text-[0.68rem] text-secondary">
                                ({assignedRecruiters.length})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bloque Derecho: Vacantes Activas & Botones de Acción */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-sand-line shrink-0">
                        {/* Vacantes Activas */}
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/empresa/admin/vacantes?site=${site.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-sand-line bg-cream/40 px-3 py-1.5 text-xs font-semibold text-cocoa hover:bg-sand transition-colors no-underline"
                            title="Ver vacantes de esta sede"
                          >
                            <i className="bx bx-briefcase-alt-2 text-terracotta" />
                            <span>
                              {activeVacanciesCount} {activeVacanciesCount === 1 ? 'vacante activa' : 'vacantes activas'}
                            </span>
                          </Link>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex items-center gap-1.5">
                          {!site.isMain && (
                            <button
                              type="button"
                              onClick={() => {
                                setMainSite(site.id);
                                setToast(`"${site.name}" establecida como Sede Principal.`);
                              }}
                              className="rounded-lg border border-sand-line bg-white px-2.5 py-1.5 text-xs font-semibold text-secondary hover:text-ink hover:bg-cream transition-colors cursor-pointer"
                              title="Marcar como sede principal"
                            >
                              Hacer Principal
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleSiteStatus(site.id)}
                            className="rounded-lg border border-sand-line bg-white px-2.5 py-1.5 text-xs font-semibold text-secondary hover:text-ink hover:bg-cream transition-colors cursor-pointer"
                          >
                            {site.status === 'active' ? 'Pausar' : 'Activar'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(site)}
                            className="inline-flex items-center gap-1 rounded-lg bg-cocoa px-3 py-1.5 text-xs font-bold text-white hover:bg-cocoa/90 transition-colors cursor-pointer"
                          >
                            <i className="bx bx-edit text-xs" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingSite(site)}
                            className="grid size-8 place-items-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar sede"
                            aria-label={`Eliminar ${site.name}`}
                          >
                            <i className="bx bx-trash text-sm" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal de Crear / Editar Sede */}
        <SiteModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveSite}
          site={editingSite}
        />

        {/* Modal de Confirmación de Eliminación */}
        {deletingSite && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cocoa/60 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-site-dialog-title"
            onClick={() => setDeletingSite(null)}
          >
            <div
              className="relative w-full max-w-md rounded-2xl border border-sand-line bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-rose-600 mb-3">
                <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-xl">
                  <i className="bx bx-error-circle" />
                </span>
                <h3 id="delete-site-dialog-title" className="m-0 font-display text-base font-bold text-ink">
                  ¿Eliminar esta sede?
                </h3>
              </div>

              <p className="m-0 text-xs text-secondary leading-relaxed">
                Estás a punto de eliminar la sede <strong>{deletingSite.name}</strong> ({deletingSite.city}).
                Los reclutadores vinculados a esta sede perderán la asociación a la misma.
              </p>

              {(activeVacanciesBySiteId[deletingSite.id] || 0) > 0 && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="m-0 font-bold flex items-center gap-1.5">
                    <i className="bx bx-warning text-base text-amber-600" />
                    <span>Atención: tiene {activeVacanciesBySiteId[deletingSite.id]} vacante(s) activa(s)</span>
                  </p>
                  <p className="m-0 mt-1 text-[0.7rem] text-amber-800">
                    Se recomienda reasignar las vacantes a otra sede antes de proceder.
                  </p>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingSite(null)}
                  className="rounded-xl border border-sand-line bg-white px-4 py-2 text-xs font-bold text-secondary hover:bg-cream hover:text-ink transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-xs transition-colors cursor-pointer"
                >
                  Sí, eliminar sede
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </CompanyPortalLayout>
  );
}

