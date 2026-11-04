import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import CampusModal from '../components/institution/CampusModal.jsx';
import { initialAdvisors } from '../data/institutionAdminData.js';
import { useInstitutionCampuses } from '../hooks/useInstitutionCampuses.js';
import { institutionPhotos } from '../data/institutionImages.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADVISORS_STORAGE_KEY = 'vincula.institution.advisors.v1';

export function getAdvisorCampusIds(advisor) {
  if (!advisor) return [];
  if (Array.isArray(advisor.campusIds) && advisor.campusIds.length > 0) {
    return advisor.campusIds;
  }
  if (advisor.campusId) {
    return [advisor.campusId];
  }
  return [];
}

function sanitizeAdvisorsList(list) {
  if (!Array.isArray(list)) return initialAdvisors;
  return list.map((a) => {
    const campusIds = getAdvisorCampusIds(a);
    return {
      ...a,
      campusIds: campusIds.length > 0 ? campusIds : ['sede-bga-principal'],
    };
  });
}

function readStoredAdvisors() {
  if (typeof window === 'undefined') return initialAdvisors;
  try {
    const raw = window.localStorage.getItem(ADVISORS_STORAGE_KEY);
    return raw ? sanitizeAdvisorsList(JSON.parse(raw)) : initialAdvisors;
  } catch {
    return initialAdvisors;
  }
}

function writeStoredAdvisors(data) {
  try {
    window.localStorage.setItem(ADVISORS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // safe fallback
  }
}

function Initials({ name }) {
  const letters = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sand font-display text-sm font-bold text-terracotta-dark border border-sand-line shadow-2xs">
      {letters}
    </span>
  );
}

export default function InstitutionAdminAdvisorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'sedes' ? 'sedes' : 'asesores';

  // Vista activa: 'asesores' | 'sedes'
  const [activeView, setActiveView] = useState(initialTab);

  // Campuses hook
  const { campuses, addCampus, updateCampus, deleteCampus } = useInstitutionCampuses();

  // Advisors state
  const [advisors, setAdvisors] = useState(readStoredAdvisors);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [campusFilter, setCampusFilter] = useState('all');

  // Campuses search & filters
  const [campusSearchQuery, setCampusSearchQuery] = useState('');
  const [campusCityFilter, setCampusCityFilter] = useState('all');

  // Modals state (Asesores)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState(null);
  const [deletingAdvisor, setDeletingAdvisor] = useState(null);

  // Modals state (Sedes)
  const [isCampusModalOpen, setIsCampusModalOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState(null);
  const [deletingCampus, setDeletingCampus] = useState(null);
  const [campusConflictModal, setCampusConflictModal] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  // Advisor form state (ahora con campusIds múltiple)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    position: 'Asesor de Graduados y Empleabilidad',
    campusIds: [campuses[0]?.id || 'sede-bga-principal'],
    status: 'active',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'sedes' && activeView !== 'sedes') {
      setActiveView('sedes');
    } else if (!tabParam && activeView !== 'asesores') {
      setActiveView('asesores');
    }
  }, [searchParams, activeView]);

  function notify(msg) {
    setToast(msg);
  }

  function handleViewChange(view) {
    setActiveView(view);
    setSearchParams(view === 'sedes' ? { tab: 'sedes' } : {});
  }

  // Filtrado de Asesores por múltiples sedes
  const filteredAdvisors = useMemo(() => {
    const q = query.trim().toLowerCase();
    return advisors.filter((adv) => {
      const advCampusIds = getAdvisorCampusIds(adv);

      if (statusFilter !== 'all' && adv.status !== statusFilter) return false;
      if (campusFilter !== 'all' && !advCampusIds.includes(campusFilter)) return false;
      if (!q) return true;

      const matchedCampuses = campuses.filter((c) => advCampusIds.includes(c.id));
      const campusNames = matchedCampuses
        .map((c) => `${c.name.toLowerCase()} ${c.city.toLowerCase()}`)
        .join(' ');

      return (
        adv.fullName.toLowerCase().includes(q) ||
        adv.email.toLowerCase().includes(q) ||
        adv.position.toLowerCase().includes(q) ||
        campusNames.includes(q)
      );
    });
  }, [advisors, query, statusFilter, campusFilter, campuses]);

  // Ciudades únicas para filtro de Sedes
  const campusCities = useMemo(() => {
    const citySet = new Set();
    campuses.forEach((c) => {
      if (c.city && c.city.trim()) {
        citySet.add(c.city.trim());
      }
    });
    return Array.from(citySet).sort((a, b) => a.localeCompare(b, 'es'));
  }, [campuses]);

  const campusCityCounts = useMemo(() => {
    const counts = {};
    campuses.forEach((c) => {
      const city = c.city?.trim();
      if (city) {
        counts[city] = (counts[city] || 0) + 1;
      }
    });
    return counts;
  }, [campuses]);

  // Filtrado de Sedes (por término y por ciudad)
  const filteredCampuses = useMemo(() => {
    const q = campusSearchQuery.trim().toLowerCase();
    return campuses.filter((c) => {
      if (campusCityFilter !== 'all' && c.city !== campusCityFilter) {
        return false;
      }
      if (!q) return true;
      return (
        c.name?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
      );
    });
  }, [campuses, campusSearchQuery, campusCityFilter]);

  // Métricas generales
  const metrics = useMemo(() => {
    const activeAdvisors = advisors.filter((a) => a.status === 'active').length;
    const coveredCampusIds = new Set();
    advisors.forEach((adv) => {
      getAdvisorCampusIds(adv).forEach((cid) => coveredCampusIds.add(cid));
    });
    const mainCampus = campuses.find((c) => c.isMain);

    return {
      totalAdvisors: advisors.length,
      activeAdvisors,
      totalCampuses: campuses.length,
      coveredCampusesCount: coveredCampusIds.size,
      mainCampusName: mainCampus?.name || 'Sede Principal',
      regionalCount: campuses.filter((c) => !c.isMain).length,
    };
  }, [advisors, campuses]);

  // Advisor Modal Handlers
  function openCreateAdvisorModal() {
    setEditingAdvisor(null);
    setForm({
      fullName: '',
      email: '',
      phone: '',
      position: 'Asesor de Graduados y Empleabilidad',
      campusIds: [campuses[0]?.id || 'sede-bga-principal'],
      status: 'active',
    });
    setErrors({});
    setModalOpen(true);
  }

  function openEditAdvisorModal(advisor) {
    setEditingAdvisor(advisor);
    setForm({
      fullName: advisor.fullName,
      email: advisor.email,
      phone: advisor.phone || '',
      position: advisor.position,
      campusIds: getAdvisorCampusIds(advisor),
      status: advisor.status,
    });
    setErrors({});
    setModalOpen(true);
  }

  function handleToggleFormCampus(cId) {
    setForm((prev) => {
      const exists = prev.campusIds.includes(cId);
      let next;
      if (exists) {
        next = prev.campusIds.filter((id) => id !== cId);
      } else {
        next = [...prev.campusIds, cId];
      }
      if (errors.campusIds) setErrors((p) => ({ ...p, campusIds: undefined }));
      return { ...prev, campusIds: next };
    });
  }

  function handleSelectAllCampuses() {
    setForm((prev) => ({ ...prev, campusIds: campuses.map((c) => c.id) }));
    if (errors.campusIds) setErrors((p) => ({ ...p, campusIds: undefined }));
  }

  function handleClearCampuses() {
    setForm((prev) => ({ ...prev, campusIds: [] }));
  }

  function validateAdvisor() {
    const next = {};
    if (!form.fullName.trim()) next.fullName = 'Escribe el nombre completo del asesor.';
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Escribe un correo electrónico válido.';
    if (!form.campusIds || form.campusIds.length === 0) {
      next.campusIds = 'Selecciona al menos una sede o campus para el asesor.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSaveAdvisor(e) {
    e.preventDefault();
    if (!validateAdvisor()) return;

    if (editingAdvisor) {
      const updated = advisors.map((a) =>
        a.id === editingAdvisor.id
          ? {
              ...a,
              fullName: form.fullName.trim(),
              email: form.email.trim(),
              phone: form.phone.trim(),
              position: form.position.trim(),
              campusIds: form.campusIds,
              status: form.status,
            }
          : a
      );
      setAdvisors(updated);
      writeStoredAdvisors(updated);
      notify(`Se actualizaron los datos y cobertura de ${form.fullName.trim()}.`);
    } else {
      const newAdv = {
        id: `adv-${Date.now().toString().slice(-4)}`,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        position: form.position.trim(),
        campusIds: form.campusIds,
        status: form.status,
        lastAccess: 'Sin accesos registrados',
        avatar: null,
      };
      const updated = [newAdv, ...advisors];
      setAdvisors(updated);
      writeStoredAdvisors(updated);
      notify(`Se vinculó a ${newAdv.fullName} con cobertura en ${form.campusIds.length} sede(s).`);
    }

    setModalOpen(false);
  }

  function handleToggleAdvisorStatus(advisor) {
    const nextStatus = advisor.status === 'active' ? 'inactive' : 'active';
    const updated = advisors.map((a) => (a.id === advisor.id ? { ...a, status: nextStatus } : a));
    setAdvisors(updated);
    writeStoredAdvisors(updated);
    notify(
      nextStatus === 'active'
        ? `Se activó la cuenta de ${advisor.fullName}.`
        : `Se suspendió el acceso de ${advisor.fullName}.`
    );
  }

  function handleConfirmDeleteAdvisor() {
    if (!deletingAdvisor) return;
    const updated = advisors.filter((a) => a.id !== deletingAdvisor.id);
    setAdvisors(updated);
    writeStoredAdvisors(updated);
    notify(`Se desvinculó a ${deletingAdvisor.fullName}.`);
    setDeletingAdvisor(null);
  }

  // Campus Handlers
  function handleSaveCampus(formData) {
    if (editingCampus) {
      updateCampus(editingCampus.id, formData);
      notify(`Se actualizó la información de "${formData.name}".`);
    } else {
      addCampus(formData);
      notify(`Se registró exitosamente la sede "${formData.name}".`);
    }
  }

  function handleRequestDeleteCampus(campusItem) {
    const assignedAdvisors = advisors.filter((a) => getAdvisorCampusIds(a).includes(campusItem.id));
    if (assignedAdvisors.length > 0) {
      setCampusConflictModal({
        campus: campusItem,
        assignedAdvisors,
      });
      return;
    }
    setDeletingCampus(campusItem);
  }

  function handleConfirmDeleteCampus() {
    if (!deletingCampus) return;
    deleteCampus(deletingCampus.id);
    notify(`Se eliminó la sede "${deletingCampus.name}".`);
    setDeletingCampus(null);
  }

  return (
    <InstitutionPortalLayout activePage={activeView === 'sedes' ? 'admin-sedes' : 'admin-asesores'} role="admin">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Banner Fotográfico con Métricas Esmeriladas */}
        <InstitutionPageHero
          photo={activeView === 'sedes' ? institutionPhotos.sedes : institutionPhotos.asesores}
          title={activeView === 'asesores' ? 'Asesores por Sedes' : 'Sedes y Campus Institucionales'}
          subtitle={
            activeView === 'asesores'
              ? 'Gestiona el equipo de asesores de empleabilidad con cobertura a una o varias sedes universitarias.'
              : 'Administra las sedes físicas, regionales y extensiones universitarias con su información de contacto.'
          }
          stats={
            activeView === 'asesores'
              ? [
                  { label: 'Vinculados', value: metrics.totalAdvisors },
                  { label: 'Activos', value: metrics.activeAdvisors },
                  { label: 'Sedes cubiertas', value: `${metrics.coveredCampusesCount} de ${campuses.length}` },
                ]
              : [
                  { label: 'Sedes totales', value: metrics.totalCampuses },
                  { label: 'Sede Principal', value: metrics.mainCampusName.split('-')[0].trim() },
                  { label: 'Regionales', value: metrics.regionalCount },
                ]
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-white/20 bg-cocoa/55 p-1 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => handleViewChange('asesores')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    activeView === 'asesores'
                      ? 'bg-white text-ink shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <i className="bx bx-group text-sm text-terracotta" />
                  <span>Asesores ({advisors.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange('sedes')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    activeView === 'sedes'
                      ? 'bg-white text-ink shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <i className="bx bxs-map-pin text-sm text-terracotta" />
                  <span>Sedes ({campuses.length})</span>
                </button>
              </div>

              {activeView === 'asesores' ? (
                <button
                  type="button"
                  onClick={openCreateAdvisorModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-terracotta hover:bg-terracotta-dark px-4 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                >
                  <i className="bx bx-plus text-base" />
                  <span>Vincular Nuevo Asesor</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCampus(null);
                    setIsCampusModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-terracotta hover:bg-terracotta-dark px-4 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                >
                  <i className="bx bx-plus text-base" />
                  <span>Registrar Nueva Sede</span>
                </button>
              )}
            </div>
          }
        />

        {/* ══════════════════════════════════════════════════════════════
            VISTA 1: ASESORES POR SEDES (LISTA RECTANGULAR HACIA ABAJO)
        ══════════════════════════════════════════════════════════════ */}
        {activeView === 'asesores' && (
          <div className="space-y-4">
            {/* Filtros de Asesores */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <i className="bx bx-search absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-base" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, correo, cargo o sede..."
                  className="w-full rounded-xl border border-sand-line bg-white py-2.5 pl-10 pr-3 text-xs text-ink placeholder:text-secondary focus:border-terracotta outline-none transition-colors"
                />
              </div>

              <div className="relative sm:w-56">
                <select
                  value={campusFilter}
                  onChange={(e) => setCampusFilter(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-sand-line bg-white py-2.5 pl-3.5 pr-8 text-xs font-semibold text-ink focus:border-terracotta outline-none transition-colors cursor-pointer"
                >
                  <option value="all">Todas las sedes ({campuses.length})</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
                <i className="bx bx-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-base" />
              </div>

              <div className="relative sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-sand-line bg-white py-2.5 pl-3.5 pr-8 text-xs font-semibold text-ink focus:border-terracotta outline-none transition-colors cursor-pointer"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos ({advisors.filter((a) => a.status === 'active').length})</option>
                  <option value="inactive">Suspendidos ({advisors.filter((a) => a.status === 'inactive').length})</option>
                </select>
                <i className="bx bx-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-base" />
              </div>

              {(query.trim() !== '' || statusFilter !== 'all' || campusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('all');
                    setCampusFilter('all');
                  }}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-secondary hover:text-terracotta cursor-pointer"
                >
                  <i className="bx bx-x text-sm" />
                  Limpiar filtros
                </button>
              )}
            </div>

            <p className="m-0 text-xs text-secondary">
              Mostrando <strong className="font-bold text-ink">{filteredAdvisors.length}</strong> de {advisors.length} asesores
            </p>

            {/* Lista Rectangular Descendente de Asesores */}
            {filteredAdvisors.length === 0 ? (
              <div className="rounded-card border border-sand-line bg-white p-12 text-center shadow-card">
                <i className="bx bx-user-x text-4xl text-terracotta" />
                <h3 className="m-0 mt-2 font-display text-base font-bold text-ink">No se encontraron asesores</h3>
                <p className="m-0 mx-auto mt-1 max-w-sm text-xs text-secondary">
                  Ninguna persona coincide con la búsqueda o la sede seleccionada.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('all');
                    setCampusFilter('all');
                  }}
                  className="mt-4 rounded-xl border border-sand-line bg-cream px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-sand cursor-pointer"
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {filteredAdvisors.map((advisor) => {
                  const isActive = advisor.status === 'active';
                  const advisorCampusIds = getAdvisorCampusIds(advisor);
                  const assignedCampuses = campuses.filter((c) => advisorCampusIds.includes(c.id));

                  return (
                    <li key={advisor.id}>
                      <article className="flex flex-col gap-4 rounded-card border border-sand-line bg-white p-5 shadow-card transition-colors hover:border-terracotta/40 lg:flex-row lg:items-center">
                        {advisor.avatar ? (
                          <img
                            src={advisor.avatar}
                            alt=""
                            className="size-12 shrink-0 rounded-2xl object-cover border border-sand-line shadow-2xs"
                          />
                        ) : (
                          <Initials name={advisor.fullName} />
                        )}

                        <div className="min-w-0 flex-1">
                          <h3 className="m-0 font-display text-base font-bold leading-snug text-ink">{advisor.fullName}</h3>
                          <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-secondary">
                            <span>{advisor.position || 'Asesor Institucional'}</span>
                            <span className="text-secondary/50">•</span>
                            <span className="font-semibold text-terracotta-dark">
                              {assignedCampuses.length === 1
                                ? assignedCampuses[0].name
                                : assignedCampuses.length > 1
                                ? `${assignedCampuses.map((c) => c.city).join(', ')} (${assignedCampuses.length} sedes)`
                                : 'Sin sedes asignadas'}
                            </span>
                          </p>
                          <p className="m-0 mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink/80">
                            <span className="flex items-center gap-1.5">
                              <i className="bx bx-envelope text-sm text-terracotta" />
                              {advisor.email}
                            </span>
                            {advisor.phone && (
                              <span className="flex items-center gap-1.5">
                                <i className="bx bx-phone text-sm text-terracotta" />
                                {advisor.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 text-secondary">
                              <i className="bx bx-time-five text-sm" />
                              Acceso: {advisor.lastAccess}
                            </span>
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                            <span className={`size-2 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-ochre'}`} />
                            {isActive ? 'Activo' : 'Suspendido'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleAdvisorStatus(advisor)}
                            className="rounded-xl border border-sand-line bg-cream px-3 py-2 text-xs font-bold text-ink transition-colors hover:bg-sand cursor-pointer"
                          >
                            {isActive ? 'Suspender' : 'Reactivar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditAdvisorModal(advisor)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-cocoa px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-cocoa/85 cursor-pointer"
                          >
                            <i className="bx bx-edit text-sm text-ochre" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingAdvisor(advisor)}
                            className="grid size-8 place-items-center rounded-xl border border-sand-line text-secondary transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                            title="Desvincular asesor"
                          >
                            <i className="bx bx-trash text-sm" />
                          </button>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            VISTA 2: SEDES Y CAMPUS (LISTA RECTANGULAR HACIA ABAJO)
        ══════════════════════════════════════════════════════════════ */}
        {activeView === 'sedes' && (
          <div className="space-y-4">
            {/* Filtros de Sedes: Búsqueda y Ciudad */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <i className="bx bx-search absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-base" />
                <input
                  type="search"
                  value={campusSearchQuery}
                  onChange={(e) => setCampusSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, dirección o teléfono..."
                  className="w-full rounded-xl border border-sand-line bg-white py-2.5 pl-10 pr-3 text-xs text-ink placeholder:text-secondary focus:border-terracotta outline-none transition-colors"
                />
              </div>

              <div className="relative sm:w-64">
                <select
                  value={campusCityFilter}
                  onChange={(e) => setCampusCityFilter(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-sand-line bg-white py-2.5 pl-3.5 pr-8 text-xs font-semibold text-ink focus:border-terracotta outline-none transition-colors cursor-pointer"
                >
                  <option value="all">Todas las ciudades ({campuses.length} sedes)</option>
                  {campusCities.map((city) => (
                    <option key={city} value={city}>
                      {city} ({campusCityCounts[city]} {campusCityCounts[city] === 1 ? 'sede' : 'sedes'})
                    </option>
                  ))}
                </select>
                <i className="bx bx-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-base" />
              </div>

              {(campusSearchQuery.trim() !== '' || campusCityFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setCampusSearchQuery('');
                    setCampusCityFilter('all');
                  }}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-secondary hover:text-terracotta cursor-pointer"
                >
                  <i className="bx bx-x text-sm" />
                  Limpiar filtros
                </button>
              )}
            </div>

            <p className="m-0 text-xs text-secondary">
              Mostrando <strong className="font-bold text-ink">{filteredCampuses.length}</strong> de {campuses.length} sedes
            </p>

            {/* Lista Rectangular de Sedes */}
            {filteredCampuses.length === 0 ? (
              <div className="rounded-card border border-sand-line bg-white p-12 text-center shadow-card">
                <i className="bx bx-map-pin text-4xl text-terracotta" />
                <h3 className="m-0 mt-2 font-display text-base font-bold text-ink">No se encontraron sedes</h3>
                <p className="m-0 mx-auto mt-1 max-w-sm text-xs text-secondary">
                  No hay sedes registradas que coincidan con los criterios aplicados
                  {campusCityFilter !== 'all' ? ` en ${campusCityFilter}` : ''}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCampusSearchQuery('');
                    setCampusCityFilter('all');
                  }}
                  className="mt-4 rounded-xl border border-sand-line bg-cream px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-sand cursor-pointer"
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {filteredCampuses.map((campusItem) => {
                  const assignedAdvisors = advisors.filter((a) => getAdvisorCampusIds(a).includes(campusItem.id));

                  return (
                    <li key={campusItem.id}>
                      <article className="flex flex-col gap-4 rounded-card border border-sand-line bg-white p-5 shadow-card transition-colors hover:border-terracotta/40 lg:flex-row lg:items-center">
                        <div className="min-w-0 flex-1">
                          <h3 className="m-0 font-display text-base font-bold leading-snug text-ink">
                            {campusItem.name}
                          </h3>

                          {/* Ubicación y Ciudad (formato de texto natural, sin cajas ni bordes de IA) */}
                          <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-secondary">
                            <span className="font-semibold text-ink flex items-center gap-1">
                              <i className="bx bx-map-pin text-sm text-terracotta" />
                              {campusItem.city}
                            </span>
                            <span className="text-secondary/50">•</span>
                            <span>{campusItem.address}</span>
                            {campusItem.isMain && (
                              <>
                                <span className="text-secondary/50">•</span>
                                <span className="font-semibold text-terracotta-dark">Sede Principal</span>
                              </>
                            )}
                          </p>

                          {campusItem.description && (
                            <p className="m-0 mt-2 text-xs text-secondary line-clamp-1">
                              {campusItem.description}
                            </p>
                          )}

                          <p className="m-0 mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink/80">
                            {campusItem.phone && (
                              <span className="flex items-center gap-1.5">
                                <i className="bx bx-phone text-sm text-terracotta" />
                                {campusItem.phone}
                              </span>
                            )}
                            {campusItem.email && (
                              <span className="flex items-center gap-1.5">
                                <i className="bx bx-envelope text-sm text-terracotta" />
                                {campusItem.email}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 text-ink font-medium">
                              <i className="bx bx-user-check text-sm text-terracotta" />
                              {assignedAdvisors.length > 0
                                ? `${assignedAdvisors.length} asesor(es) asignado(s)`
                                : 'Sin personal asignado'}
                            </span>
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCampus(campusItem);
                              setIsCampusModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-cocoa px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-cocoa/85 cursor-pointer"
                          >
                            <i className="bx bx-edit text-sm text-ochre" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteCampus(campusItem)}
                            className="grid size-8 place-items-center rounded-xl border border-sand-line text-secondary transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                            title="Eliminar sede"
                          >
                            <i className="bx bx-trash text-sm" />
                          </button>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* ─── Modal Vincular / Editar Asesor ─── */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa/60 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="advisor-modal-title"
          >
            <form
              onSubmit={handleSaveAdvisor}
              className="w-full max-w-lg rounded-card border border-sand-line bg-white shadow-hero animate-rise-in overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-sand-line px-6 py-4.5 bg-cream/40">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-sand text-terracotta text-xl">
                    <i className="bx bxs-user-detail" />
                  </span>
                  <div>
                    <h2 id="advisor-modal-title" className="m-0 font-display text-base font-bold text-ink">
                      {editingAdvisor ? 'Editar Datos del Asesor' : 'Vincular Nuevo Asesor Institucional'}
                    </h2>
                    <p className="m-0 text-xs text-secondary">
                      Asigna una o varias sedes donde operará y validará a los egresados
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="grid size-8 place-items-center rounded-lg text-secondary hover:bg-cream hover:text-ink transition-colors cursor-pointer"
                >
                  <i className="bx bx-x text-xl" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div>
                  <label htmlFor="adv-name" className="block text-xs font-bold text-ink mb-1">
                    Nombre Completo del Asesor <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    id="adv-name"
                    type="text"
                    value={form.fullName}
                    onChange={(e) => {
                      setForm({ ...form, fullName: e.target.value });
                      if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined }));
                    }}
                    placeholder="Ej: Lic. Mauricio Gómez Rojas"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary focus:outline-none transition-colors ${
                      errors.fullName ? 'border-rose-500 bg-rose-50/20' : 'border-sand-line bg-cream/50 focus:border-terracotta focus:bg-white'
                    }`}
                  />
                  {errors.fullName && <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.fullName}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-ink">
                      Sedes de Atención ({form.campusIds.length} seleccionada{form.campusIds.length !== 1 ? 's' : ''}) <span className="text-rose-500">*</span>:
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllCampuses}
                        className="text-[0.68rem] font-bold text-terracotta hover:underline cursor-pointer"
                      >
                        Todas
                      </button>
                      <span className="text-secondary text-[0.68rem]">·</span>
                      <button
                        type="button"
                        onClick={handleClearCampuses}
                        className="text-[0.68rem] font-bold text-secondary hover:text-ink cursor-pointer"
                      >
                        Limpiar
                      </button>
                      <span className="text-secondary text-[0.68rem]">·</span>
                      <button
                        type="button"
                        onClick={() => {
                          setModalOpen(false);
                          setEditingCampus(null);
                          setIsCampusModalOpen(true);
                        }}
                        className="text-[0.68rem] font-bold text-terracotta hover:underline cursor-pointer"
                      >
                        + Nueva Sede
                      </button>
                    </div>
                  </div>

                  <div
                    className={`space-y-1.5 rounded-xl border p-2.5 max-h-48 overflow-y-auto ${
                      errors.campusIds ? 'border-rose-500 bg-rose-50/10' : 'border-sand-line bg-cream/30'
                    }`}
                  >
                    {campuses.map((c) => {
                      const isChecked = form.campusIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center justify-between gap-3 p-2 rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked
                              ? 'bg-white border-terracotta shadow-2xs text-ink'
                              : 'bg-white/60 border-sand-line hover:border-sand-line text-secondary'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleFormCampus(c.id)}
                              className="size-4 rounded border-sand-line text-terracotta focus:ring-terracotta cursor-pointer accent-terracotta"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-ink block truncate">
                                {c.name}
                              </span>
                              <span className="text-[0.68rem] text-secondary block truncate">
                                {c.city} · {c.address}
                              </span>
                            </div>
                          </div>
                          {c.isMain && (
                            <span className="rounded-md bg-sand text-terracotta-dark px-1.5 py-0.5 text-[0.62rem] font-bold shrink-0">
                              Principal
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {errors.campusIds && (
                    <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.campusIds}</p>
                  )}
                  <p className="m-0 mt-1.5 text-[0.68rem] text-secondary">
                    Puedes marcar varias sedes si el asesor presta atención híbrida, regional o itinerante.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="adv-email" className="block text-xs font-bold text-ink mb-1">
                      Correo Institucional <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      id="adv-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => {
                        setForm({ ...form, email: e.target.value });
                        if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                      }}
                      placeholder="asesor@institucion.edu.co"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary focus:outline-none transition-colors ${
                        errors.email ? 'border-rose-500 bg-rose-50/20' : 'border-sand-line bg-cream/50 focus:border-terracotta focus:bg-white'
                      }`}
                    />
                    {errors.email && <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="adv-phone" className="block text-xs font-bold text-ink mb-1">
                      Teléfono Móvil:
                    </label>
                    <input
                      id="adv-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+57 318 450 1290"
                      className="w-full rounded-xl border border-sand-line bg-cream/50 px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary focus:border-terracotta focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="adv-position" className="block text-xs font-bold text-ink mb-1">
                      Cargo o Función:
                    </label>
                    <input
                      id="adv-position"
                      type="text"
                      value={form.position}
                      onChange={(e) => setForm({ ...form, position: e.target.value })}
                      placeholder="Ej: Asesor de Graduados"
                      className="w-full rounded-xl border border-sand-line bg-cream/50 px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary focus:border-terracotta focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="adv-status" className="block text-xs font-bold text-ink mb-1">
                      Estado de Acceso:
                    </label>
                    <select
                      id="adv-status"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full rounded-xl border border-sand-line bg-cream/50 px-3.5 py-2.5 text-xs text-ink focus:border-terracotta focus:bg-white focus:outline-none cursor-pointer transition-colors"
                    >
                      <option value="active">Activo (permite acceso)</option>
                      <option value="inactive">Suspendido (sin acceso)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 p-4.5 border-t border-sand-line bg-cream/40">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-sand-line px-4 py-2 text-xs font-bold text-secondary hover:bg-cream hover:text-ink transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-terracotta hover:bg-terracotta-dark px-5 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                >
                  {editingAdvisor ? 'Guardar Cambios' : 'Vincular Asesor'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── Modal Crear / Editar Sede ─── */}
        <CampusModal
          isOpen={isCampusModalOpen}
          onClose={() => setIsCampusModalOpen(false)}
          onSave={handleSaveCampus}
          campus={editingCampus}
        />

        {/* ─── Modal Confirmar Desvinculación de Asesor ─── */}
        {deletingAdvisor && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa/60 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-card border border-sand-line bg-white p-6 shadow-hero space-y-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600 text-xl">
                  <i className="bx bx-user-x" />
                </span>
                <div>
                  <h3 className="m-0 font-display text-base font-bold text-ink">
                    ¿Desvincular a {deletingAdvisor.fullName}?
                  </h3>
                  <p className="m-0 text-xs text-secondary">
                    Esta persona perderá el acceso a la plataforma institucional
                  </p>
                </div>
              </div>

              <p className="m-0 text-xs text-body-muted pt-2 leading-relaxed">
                El asesor ya no podrá validar egresados de sus sedes asignadas ni revisar convenios empresariales en nombre de la institución.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-sand-line">
                <button
                  type="button"
                  onClick={() => setDeletingAdvisor(null)}
                  className="rounded-xl border border-sand-line px-4 py-2 text-xs font-bold text-secondary hover:bg-cream hover:text-ink transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAdvisor}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                >
                  Sí, desvincular
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Modal Confirmar Eliminación de Sede ─── */}
        {deletingCampus && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa/60 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-card border border-sand-line bg-white p-6 shadow-hero space-y-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600 text-xl">
                  <i className="bx bx-trash" />
                </span>
                <div>
                  <h3 className="m-0 font-display text-base font-bold text-ink">
                    ¿Eliminar la sede {deletingCampus.name}?
                  </h3>
                  <p className="m-0 text-xs text-secondary">
                    Ubicación: {deletingCampus.city} · {deletingCampus.address}
                  </p>
                </div>
              </div>

              <p className="m-0 text-xs text-body-muted pt-2 leading-relaxed">
                Esta acción removerá la sede del catálogo de infraestructura institucional. No tiene asesores asignados actualmente.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-sand-line">
                <button
                  type="button"
                  onClick={() => setDeletingCampus(null)}
                  className="rounded-xl border border-sand-line px-4 py-2 text-xs font-bold text-secondary hover:bg-cream hover:text-ink transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCampus}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                >
                  Sí, eliminar sede
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Modal Conflicto al eliminar Sede con Asesores Asignados ─── */}
        {campusConflictModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa/60 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-card border border-sand-line bg-white p-6 shadow-hero space-y-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700 text-xl">
                  <i className="bx bx-error" />
                </span>
                <div>
                  <h3 className="m-0 font-display text-base font-bold text-ink">
                    No se puede eliminar la sede
                  </h3>
                  <p className="m-0 text-xs text-secondary">
                    {campusConflictModal.campus.name}
                  </p>
                </div>
              </div>

              <p className="m-0 text-xs text-body-muted pt-2 leading-relaxed">
                Esta sede tiene actualmente <strong>{campusConflictModal.assignedAdvisors.length} asesor(es)</strong> con cobertura asignada:
              </p>

              <ul className="m-0 list-disc pl-5 text-xs text-ink/80 space-y-1">
                {campusConflictModal.assignedAdvisors.map((adv) => (
                  <li key={adv.id}>
                    <strong>{adv.fullName}</strong> ({adv.position})
                  </li>
                ))}
              </ul>

              <p className="m-0 text-xs text-secondary leading-relaxed">
                Para poder eliminar esta sede, primero debes editar a estos asesores y desmarcar esta sede de su lista de cobertura.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-sand-line">
                <button
                  type="button"
                  onClick={() => setCampusConflictModal(null)}
                  className="rounded-xl bg-cocoa hover:bg-cocoa/85 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Toast ─── */}
        {toast && (
          <div
            role="status"
            className="fixed bottom-6 right-6 z-50 rounded-2xl bg-cocoa px-4.5 py-3 text-xs font-semibold text-white shadow-card flex items-center gap-2 animate-rise-in border border-sand-line"
          >
            <i className="bx bx-check-circle text-ochre text-base" />
            <span>{toast}</span>
          </div>
        )}
      </div>
    </InstitutionPortalLayout>
  );
}
