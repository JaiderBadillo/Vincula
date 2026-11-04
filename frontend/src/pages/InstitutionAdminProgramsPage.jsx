import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import ProgramModal from '../components/institution/ProgramModal.jsx';
import FacultyModal from '../components/institution/FacultyModal.jsx';
import { useInstitutionPrograms } from '../hooks/useInstitutionPrograms.js';
import { useInstitutionFaculties } from '../hooks/useInstitutionFaculties.js';
import { institutionPhotos } from '../data/institutionImages.js';

const FACULTY_STATUS_TABS = [
  { id: 'all', label: 'Todas las Facultades' },
  { id: 'active', label: 'Activas' },
  { id: 'inactive', label: 'Inactivas' },
];

export default function InstitutionAdminProgramsPage() {
  const { programs, addProgram, updateProgram, deleteProgram } = useInstitutionPrograms();
  const { faculties, addFaculty, updateFaculty, deleteFaculty } = useInstitutionFaculties();

  // Vista principal: 'carreras' | 'facultades'
  const [activeView, setActiveView] = useState('carreras');

  // Estado de Carreras
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'graduates' | 'rate' | 'code'

  // Estado de Facultades
  const [facultyStatusTab, setFacultyStatusTab] = useState('all');
  const [facultySearchQuery, setFacultySearchQuery] = useState('');

  // Modals state (Programas)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [deletingProgram, setDeletingProgram] = useState(null);

  // Modals state (Facultades)
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [deletingFaculty, setDeletingFaculty] = useState(null);

  // Toast
  const [toastMessage, setToastMessage] = useState(null);

  function notify(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  // Lista de nombres de facultades disponibles
  const facultyNames = useMemo(() => {
    if (faculties.length > 0) {
      return faculties.map((f) => f.name).sort();
    }
    const set = new Set(programs.map((p) => p.faculty));
    return Array.from(set).sort();
  }, [faculties, programs]);

  // Niveles únicos
  const levels = useMemo(() => {
    const set = new Set(programs.map((p) => p.level));
    return Array.from(set).sort();
  }, [programs]);

  // Métricas de cabecera de Programas
  const programMetrics = useMemo(() => {
    const total = programs.length;
    const professional = programs.filter((p) => p.level.toLowerCase().includes('profesional')).length;
    const technological = programs.filter(
      (p) => p.level.toLowerCase().includes('tecnológico') || p.level.toLowerCase().includes('tecnología')
    ).length;
    const totalGraduates = programs.reduce((acc, p) => acc + (p.graduatesCount || 0), 0);

    return { total, professional, technological, totalGraduates };
  }, [programs]);

  // Métricas de Facultades
  const facultyMetrics = useMemo(() => {
    const total = faculties.length;
    const active = faculties.filter((f) => f.status === 'active').length;
    const totalAssignedDegrees = programs.length;

    return { total, active, totalAssignedDegrees };
  }, [faculties, programs]);

  // Filtrado y ordenamiento de Programas
  const filteredPrograms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = programs.filter((prog) => {
      if (selectedFaculty !== 'all' && prog.faculty !== selectedFaculty) return false;
      if (selectedLevel !== 'all' && prog.level !== selectedLevel) return false;

      if (q) {
        const matchName = prog.name.toLowerCase().includes(q);
        const matchCode = prog.code.toLowerCase().includes(q);
        const matchFaculty = prog.faculty.toLowerCase().includes(q);
        const matchCampus = prog.campus?.toLowerCase().includes(q);

        return matchName || matchCode || matchFaculty || matchCampus;
      }

      return true;
    });

    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    } else if (sortBy === 'graduates') {
      list.sort((a, b) => (b.graduatesCount || 0) - (a.graduatesCount || 0));
    } else if (sortBy === 'rate') {
      list.sort((a, b) => (b.employmentRate || 0) - (a.employmentRate || 0));
    } else if (sortBy === 'code') {
      list.sort((a, b) => a.code.localeCompare(b.code));
    }

    return list;
  }, [programs, selectedFaculty, selectedLevel, searchQuery, sortBy]);

  // Filtrado de Facultades
  const filteredFaculties = useMemo(() => {
    const q = facultySearchQuery.trim().toLowerCase();

    return faculties.filter((fac) => {
      if (facultyStatusTab !== 'all' && fac.status !== facultyStatusTab) return false;

      if (q) {
        const matchName = fac.name.toLowerCase().includes(q);
        const matchAcronym = fac.acronym.toLowerCase().includes(q);
        const matchCode = fac.code?.toLowerCase().includes(q);
        const matchOffice = fac.office?.toLowerCase().includes(q);

        return matchName || matchAcronym || matchCode || matchOffice;
      }

      return true;
    });
  }, [faculties, facultyStatusTab, facultySearchQuery]);

  // Program Handlers
  function handleCreateOrUpdateProgram(formData) {
    if (editingProgram) {
      updateProgram(editingProgram.id, formData);
      notify(`Programa "${formData.name}" actualizado exitosamente.`);
    } else {
      const newId = 'prog-' + Date.now();
      addProgram({
        ...formData,
        id: newId,
        graduatesCount: 0,
        employedCount: 0,
        employmentRate: 0,
        assignedAdvisors: [],
      });
      notify(`Programa "${formData.name}" registrado en la oferta institucional.`);
    }
    setEditingProgram(null);
  }

  function handleConfirmDeleteProgram() {
    if (!deletingProgram) return;
    deleteProgram(deletingProgram.id);
    notify(`Se ha eliminado la carrera "${deletingProgram.name}".`);
    setDeletingProgram(null);
  }

  // Faculty Handlers
  function handleCreateOrUpdateFaculty(formData) {
    if (editingFaculty) {
      const oldName = editingFaculty.name;
      updateFaculty(editingFaculty.id, formData);

      // Si cambió el nombre oficial de la facultad, sincronizar programas adscritos
      if (oldName !== formData.name) {
        programs.forEach((prog) => {
          if (prog.faculty === oldName) {
            updateProgram(prog.id, { faculty: formData.name });
          }
        });
      }
      notify(`Facultad "${formData.name}" actualizada con éxito.`);
    } else {
      const newId = 'fac-' + Date.now();
      addFaculty({
        ...formData,
        id: newId,
      });
      notify(`Facultad "${formData.name}" creada exitosamente.`);
    }
    setEditingFaculty(null);
  }

  function handleConfirmDeleteFaculty() {
    if (!deletingFaculty) return;
    const assigned = programs.filter((p) => p.faculty === deletingFaculty.name);
    if (assigned.length > 0) {
      notify(`No se puede eliminar la facultad porque tiene ${assigned.length} carreras asociadas.`);
      return;
    }
    deleteFaculty(deletingFaculty.id);
    notify(`Facultad "${deletingFaculty.name}" eliminada.`);
    setDeletingFaculty(null);
  }

  function handleToggleFacultyStatus(fac) {
    const nextStatus = fac.status === 'active' ? 'inactive' : 'active';
    updateFaculty(fac.id, { status: nextStatus });
    notify(`Facultad "${fac.name}" marcada como ${nextStatus === 'active' ? 'Activa' : 'Inactiva'}.`);
  }

  const deletingFacultyAssignedPrograms = useMemo(() => {
    if (!deletingFaculty) return [];
    return programs.filter((p) => p.faculty === deletingFaculty.name);
  }, [deletingFaculty, programs]);

  return (
    <InstitutionPortalLayout activePage="admin-programas" role="admin">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Banner Fotográfico con Métricas Esmeriladas */}
        <InstitutionPageHero
          photo={activeView === 'facultades' ? institutionPhotos.facultades : institutionPhotos.programas}
          title={activeView === 'carreras' ? 'Carreras y Titulaciones' : 'Facultades y Unidades Académicas'}
          subtitle={
            activeView === 'carreras'
              ? 'Catálogo oficial de titulaciones de la institución, códigos SNIES y registros calificados.'
              : 'Facultades oficiales de la institución, códigos internos, sedes y vinculación curricular.'
          }
          stats={
            activeView === 'carreras'
              ? [
                  { label: 'Titulaciones', value: programMetrics.total },
                  { label: 'Profesionales', value: programMetrics.professional },
                  { label: 'Tecnológicas', value: programMetrics.technological },
                ]
              : [
                  { label: 'Facultades', value: facultyMetrics.total },
                  { label: 'Activas', value: facultyMetrics.active },
                  { label: 'Carreras vinculadas', value: facultyMetrics.totalAssignedDegrees },
                ]
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-white/20 bg-cocoa/55 p-1 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setActiveView('carreras')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    activeView === 'carreras'
                      ? 'bg-white text-ink shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <i className="bx bxs-graduation text-sm text-terracotta" />
                  <span>Carreras ({programs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('facultades')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    activeView === 'facultades'
                      ? 'bg-white text-ink shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <i className="bx bxs-institution text-sm text-terracotta" />
                  <span>Facultades ({faculties.length})</span>
                </button>
              </div>

              {activeView === 'carreras' ? (
                <>
                  <Link
                    to="/institucion/admin/trazabilidad"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-cocoa/55 px-3.5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-cocoa/80 cursor-pointer no-underline backdrop-blur-sm"
                    title="Auditar alineación curricular vs vacantes"
                  >
                    <i className="bx bx-line-chart text-sm text-ochre" />
                    <span>Trazabilidad</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingProgram(null);
                      setIsModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-terracotta hover:bg-terracotta-dark px-4 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                  >
                    <i className="bx bx-plus text-base" />
                    <span>Nueva Carrera</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingFaculty(null);
                    setIsFacultyModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-terracotta hover:bg-terracotta-dark px-4 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                >
                  <i className="bx bx-plus text-base" />
                  <span>Nueva Facultad</span>
                </button>
              )}
            </div>
          }
        />

        {/* ══════════════════════════════════════════════════════════════
            VISTA 1: CARRERAS Y PROGRAMAS (LISTA RECTANGULAR HACIA ABAJO)
        ══════════════════════════════════════════════════════════════ */}
        {activeView === 'carreras' && (
          <div className="space-y-4">
            {/* Filtros de Programas */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <i className="bx bx-search absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-base" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, código SNIES, facultad o sede..."
                  className="w-full rounded-xl border border-sand-line bg-white py-2.5 pl-10 pr-3 text-xs text-ink placeholder:text-secondary focus:border-terracotta outline-none transition-colors"
                />
              </div>

              <div className="relative sm:w-56">
                <select
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-sand-line bg-white py-2.5 pl-3.5 pr-8 text-xs font-semibold text-ink focus:border-terracotta outline-none transition-colors cursor-pointer"
                >
                  <option value="all">Todas las facultades</option>
                  {facultyNames.map((fac) => (
                    <option key={fac} value={fac}>
                      {fac}
                    </option>
                  ))}
                </select>
                <i className="bx bx-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-base" />
              </div>

              <div className="relative sm:w-44">
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-sand-line bg-white py-2.5 pl-3.5 pr-8 text-xs font-semibold text-ink focus:border-terracotta outline-none transition-colors cursor-pointer"
                >
                  <option value="all">Todos los niveles</option>
                  {levels.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
                <i className="bx bx-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-base" />
              </div>

              <div className="relative sm:w-52">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-sand-line bg-white py-2.5 pl-3.5 pr-8 text-xs font-semibold text-ink focus:border-terracotta outline-none transition-colors cursor-pointer"
                >
                  <option value="name">Ordenar: Nombre (A-Z)</option>
                  <option value="graduates">Mayor volumen egresados</option>
                  <option value="rate">Mayor empleabilidad</option>
                  <option value="code">Código SNIES</option>
                </select>
                <i className="bx bx-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-base" />
              </div>

              {(searchQuery.trim() !== '' || selectedFaculty !== 'all' || selectedLevel !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedFaculty('all');
                    setSelectedLevel('all');
                  }}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-secondary hover:text-terracotta cursor-pointer"
                >
                  <i className="bx bx-x text-sm" />
                  Limpiar filtros
                </button>
              )}
            </div>

            <p className="m-0 text-xs text-secondary">
              Mostrando <strong className="font-bold text-ink">{filteredPrograms.length}</strong> de {programs.length} carreras
            </p>

            {/* Lista Rectangular de Carreras */}
            {filteredPrograms.length === 0 ? (
              <div className="rounded-card border border-sand-line bg-white p-12 text-center shadow-card">
                <i className="bx bxs-graduation text-4xl text-terracotta" />
                <h3 className="m-0 mt-2 font-display text-base font-bold text-ink">No se encontraron carreras</h3>
                <p className="m-0 mx-auto mt-1 max-w-sm text-xs text-secondary">
                  Intenta ajustar los filtros de búsqueda o facultad para ver más resultados.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedFaculty('all');
                    setSelectedLevel('all');
                  }}
                  className="mt-4 rounded-xl border border-sand-line bg-cream px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-sand cursor-pointer"
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {filteredPrograms.map((prog) => (
                  <li key={prog.id}>
                    <article className="flex flex-col gap-4 rounded-card border border-sand-line bg-white p-5 shadow-card transition-colors hover:border-terracotta/40 lg:flex-row lg:items-center">
                      <div className="min-w-0 flex-1">
                        <h3 className="m-0 font-display text-base font-bold leading-snug text-ink">
                          {prog.name}
                        </h3>

                        {/* Metadatos en formato tipográfico limpio con viñetas */}
                        <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-secondary">
                          <span className="font-semibold text-terracotta-dark">{prog.faculty}</span>
                          <span className="text-secondary/50">•</span>
                          <span>{prog.level}</span>
                          <span className="text-secondary/50">•</span>
                          <span className="font-mono text-ink">SNIES {prog.code}</span>
                          {prog.modality && (
                            <>
                              <span className="text-secondary/50">•</span>
                              <span>{prog.modality}</span>
                            </>
                          )}
                          {prog.campus && (
                            <>
                              <span className="text-secondary/50">•</span>
                              <span>{prog.campus}</span>
                            </>
                          )}
                        </p>

                        {prog.description && (
                          <p className="m-0 mt-2 text-xs text-secondary line-clamp-1 max-w-3xl">
                            {prog.description}
                          </p>
                        )}

                        <p className="m-0 mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink/80">
                          <span className="flex items-center gap-1.5">
                            <i className="bx bx-time-five text-sm text-terracotta" />
                            {prog.duration}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <i className="bx bx-book-open text-sm text-terracotta" />
                            {prog.credits} créditos
                          </span>
                          {prog.employmentRate && (
                            <span className="flex items-center gap-1.5">
                              <i className="bx bx-trending-up text-sm text-emerald-600" />
                              <strong className="font-bold text-emerald-800">{prog.employmentRate}%</strong> empleabilidad
                            </span>
                          )}
                          {prog.graduatesCount && (
                            <span className="flex items-center gap-1.5">
                              <i className="bx bxs-graduation text-sm text-terracotta" />
                              {prog.graduatesCount} egresados
                            </span>
                          )}
                          {prog.accreditation && (
                            <span className="flex items-center gap-1.5 text-secondary">
                              <i className="bx bx-check-shield text-sm text-ochre" />
                              {prog.accreditation}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2.5 lg:justify-end">
                        <Link
                          to={`/institucion/admin/trazabilidad?programa=${prog.id}`}
                          className="rounded-xl border border-sand-line bg-cream px-3 py-2 text-xs font-bold text-ink transition-colors hover:bg-sand cursor-pointer no-underline flex items-center gap-1.5"
                          title="Auditar alineación y pensum curricular"
                        >
                          <i className="bx bx-line-chart text-sm text-terracotta" />
                          <span>Trazabilidad</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingProgram(prog);
                            setIsModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-cocoa px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-cocoa/85 cursor-pointer"
                        >
                          <i className="bx bx-edit text-sm text-ochre" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingProgram(prog)}
                          className="grid size-8 place-items-center rounded-xl border border-sand-line text-secondary transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          title="Eliminar carrera"
                        >
                          <i className="bx bx-trash text-sm" />
                        </button>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            VISTA 2: FACULTADES (LISTA RECTANGULAR HACIA ABAJO)
        ══════════════════════════════════════════════════════════════ */}
        {activeView === 'facultades' && (
          <div className="space-y-4">
            {/* Control Bar: Status Tabs & Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
              <div className="flex items-center gap-1 rounded-xl border border-sand-line bg-white p-1">
                {FACULTY_STATUS_TABS.map((tab) => {
                  const active = facultyStatusTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFacultyStatusTab(tab.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        active ? 'bg-sand text-terracotta-dark shadow-xs' : 'text-secondary hover:text-ink'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative flex-1 sm:max-w-md">
                <i className="bx bx-search absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-base" />
                <input
                  type="search"
                  value={facultySearchQuery}
                  onChange={(e) => setFacultySearchQuery(e.target.value)}
                  placeholder="Buscar facultad por nombre, sigla o código..."
                  className="w-full rounded-xl border border-sand-line bg-white py-2 pl-10 pr-4 text-xs text-ink placeholder:text-secondary focus:border-terracotta outline-none transition-colors"
                />
              </div>
            </div>

            <p className="m-0 text-xs text-secondary">
              Mostrando <strong className="font-bold text-ink">{filteredFaculties.length}</strong> de {faculties.length} facultades
            </p>

            {/* Lista Rectangular de Facultades */}
            {filteredFaculties.length === 0 ? (
              <div className="rounded-card border border-sand-line bg-white p-12 text-center shadow-card">
                <i className="bx bxs-institution text-4xl text-terracotta" />
                <h3 className="m-0 mt-2 font-display text-base font-bold text-ink">No se encontraron facultades</h3>
                <p className="m-0 mx-auto mt-1 max-w-sm text-xs text-secondary">
                  Crea la primera facultad para estructurar las carreras académicas y titulaciones.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingFaculty(null);
                    setIsFacultyModalOpen(true);
                  }}
                  className="mt-4 rounded-xl bg-terracotta hover:bg-terracotta-dark px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                >
                  <i className="bx bx-plus text-base" />
                  <span>Nueva Facultad</span>
                </button>
              </div>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {filteredFaculties.map((fac) => {
                  const assignedPrograms = programs.filter((p) => p.faculty === fac.name);
                  const isOperational = fac.status === 'active';

                  return (
                    <li key={fac.id}>
                      <article className="flex flex-col gap-4 rounded-card border border-sand-line bg-white p-5 shadow-card transition-colors hover:border-terracotta/40 lg:flex-row lg:items-center">
                        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cocoa font-display text-sm font-bold text-ochre shadow-xs">
                          {fac.acronym || 'FAC'}
                        </span>

                        <div className="min-w-0 flex-1">
                          <h3 className="m-0 font-display text-base font-bold leading-snug text-ink">
                            {fac.name}
                          </h3>

                          <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-secondary">
                            <span className="font-mono text-terracotta-dark font-semibold">{fac.code || 'FAC-00'}</span>
                            {fac.office && (
                              <>
                                <span className="text-secondary/50">•</span>
                                <span>{fac.office}</span>
                              </>
                            )}
                            {fac.phone && (
                              <>
                                <span className="text-secondary/50">•</span>
                                <span>{fac.phone}</span>
                              </>
                            )}
                          </p>

                          {fac.description && (
                            <p className="m-0 mt-2 text-xs text-secondary line-clamp-1 max-w-3xl">
                              {fac.description}
                            </p>
                          )}

                          <div className="m-0 mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-xs font-semibold text-secondary mr-1">
                              Carreras adscritas ({assignedPrograms.length}):
                            </span>
                            {assignedPrograms.length === 0 ? (
                              <span className="text-secondary/60 italic text-xs">Sin carreras adscritas</span>
                            ) : (
                              assignedPrograms.map((p) => (
                                <span
                                  key={p.id}
                                  className="rounded-lg bg-sand/60 border border-sand-line px-2 py-0.5 text-[0.7rem] font-medium text-ink"
                                >
                                  {p.name}
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                            <span className={`size-2 rounded-full ${isOperational ? 'bg-emerald-600' : 'bg-ochre'}`} />
                            {isOperational ? 'Activa' : 'Inactiva'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleFacultyStatus(fac)}
                            className="rounded-xl border border-sand-line bg-cream px-3 py-2 text-xs font-bold text-ink transition-colors hover:bg-sand cursor-pointer"
                          >
                            {isOperational ? 'Pausar' : 'Reactivar'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingFaculty(fac);
                              setIsFacultyModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-cocoa px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-cocoa/85 cursor-pointer"
                          >
                            <i className="bx bx-edit text-sm text-ochre" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingFaculty(fac)}
                            className="grid size-8 place-items-center rounded-xl border border-sand-line text-secondary transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                            title="Eliminar facultad"
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

        {/* ─── Modal Crear / Editar Programa ─── */}
        <ProgramModal
          isOpen={isModalOpen}
          program={editingProgram}
          availableFaculties={faculties}
          onOpenNewFaculty={() => {
            setIsFacultyModalOpen(true);
          }}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProgram(null);
          }}
          onSave={handleCreateOrUpdateProgram}
        />

        {/* ─── Modal Crear / Editar Facultad ─── */}
        <FacultyModal
          isOpen={isFacultyModalOpen}
          faculty={editingFaculty}
          onClose={() => {
            setIsFacultyModalOpen(false);
            setEditingFaculty(null);
          }}
          onSave={handleCreateOrUpdateFaculty}
        />

        {/* ─── Modal Confirmar Eliminación de Programa ─── */}
        {deletingProgram && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cocoa/60 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-card border border-sand-line bg-white p-6 shadow-hero animate-rise-in space-y-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600 text-xl">
                  <i className="bx bx-trash" />
                </span>
                <div>
                  <h3 className="m-0 font-display text-base font-bold text-ink">
                    ¿Eliminar programa académico?
                  </h3>
                  <p className="m-0 text-xs text-secondary">
                    {deletingProgram.name} ({deletingProgram.code})
                  </p>
                </div>
              </div>

              <p className="m-0 text-xs text-body-muted pt-2 leading-relaxed">
                Esta acción retirará la titulación del catálogo activo de admisiones y ofertas de la institución.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-sand-line">
                <button
                  type="button"
                  onClick={() => setDeletingProgram(null)}
                  className="rounded-xl border border-sand-line px-4 py-2 text-xs font-bold text-secondary hover:bg-cream hover:text-ink cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteProgram}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer transition-colors"
                >
                  Sí, eliminar carrera
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Modal Confirmar Eliminación de Facultad ─── */}
        {deletingFaculty && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cocoa/60 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-lg rounded-card border border-sand-line bg-white p-6 shadow-hero animate-rise-in space-y-3">
              {deletingFacultyAssignedPrograms.length > 0 ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700 text-xl">
                      <i className="bx bx-error" />
                    </span>
                    <div>
                      <h3 className="m-0 font-display text-base font-bold text-ink">
                        No es posible eliminar esta facultad
                      </h3>
                      <p className="m-0 text-xs text-secondary">
                        {deletingFaculty.name}
                      </p>
                    </div>
                  </div>

                  <p className="m-0 text-xs text-body-muted pt-2 leading-relaxed">
                    La facultad cuenta con{' '}
                    <strong className="text-ink">{deletingFacultyAssignedPrograms.length} carreras académicas asociadas</strong>:
                  </p>

                  <div className="max-h-32 overflow-y-auto rounded-xl border border-sand-line bg-cream/30 p-3 space-y-1.5 text-xs">
                    {deletingFacultyAssignedPrograms.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-ink font-semibold">
                        <span>{p.name}</span>
                        <span className="text-[0.65rem] text-secondary font-mono">{p.code}</span>
                      </div>
                    ))}
                  </div>

                  <p className="m-0 text-xs text-secondary leading-relaxed">
                    Para eliminar esta facultad, primero debes reasignar estas carreras a otra facultad.
                  </p>

                  <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-sand-line">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFaculty(deletingFaculty.name);
                        setActiveView('carreras');
                        setDeletingFaculty(null);
                      }}
                      className="rounded-xl border border-sand-line bg-cream hover:bg-sand px-4 py-2 text-xs font-bold text-ink cursor-pointer"
                    >
                      Ver y reasignar carreras
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingFaculty(null)}
                      className="rounded-xl bg-cocoa hover:bg-cocoa/85 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
                    >
                      Entendido
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600 text-xl">
                      <i className="bx bx-trash" />
                    </span>
                    <div>
                      <h3 className="m-0 font-display text-base font-bold text-ink">
                        ¿Eliminar la facultad "{deletingFaculty.name}"?
                      </h3>
                      <p className="m-0 text-xs text-secondary">
                        Esta facultad no tiene carreras asignadas actualmente.
                      </p>
                    </div>
                  </div>

                  <p className="m-0 text-xs text-body-muted pt-2 leading-relaxed">
                    Al confirmar, será eliminada de la estructura institucional de forma permanente.
                  </p>

                  <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-sand-line">
                    <button
                      type="button"
                      onClick={() => setDeletingFaculty(null)}
                      className="rounded-xl border border-sand-line px-4 py-2 text-xs font-bold text-secondary hover:bg-cream hover:text-ink cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteFaculty}
                      className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer transition-colors"
                    >
                      Sí, eliminar facultad
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── Toast Notification ─── */}
        {toastMessage && (
          <div
            role="status"
            className="fixed bottom-6 right-6 z-50 rounded-2xl bg-cocoa px-4.5 py-3 text-xs font-semibold text-white shadow-card flex items-center gap-2 animate-rise-in border border-sand-line"
          >
            <i className="bx bx-check-circle text-ochre text-base" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </InstitutionPortalLayout>
  );
}
