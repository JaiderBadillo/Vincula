import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import PensumUploadModal from '../components/institution/PensumUploadModal.jsx';
import { useInstitutionPrograms } from '../hooks/useInstitutionPrograms.js';
import { useInstitutionPensums, resolvePensum } from '../hooks/useInstitutionPensums.js';
import { institutionPhotos } from '../data/institutionImages.js';

export default function InstitutionAdminTraceabilityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { programs } = useInstitutionPrograms();
  const { pensums, savePensum, addSubjectTool, removeSubjectTool, calculateTraceability } = useInstitutionPensums();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeSemesterAccordion, setActiveSemesterAccordion] = useState(5);
  const [quickAddToolInput, setQuickAddToolInput] = useState({});
  const [selectedFaculty, setSelectedFaculty] = useState('all');

  // Programa seleccionado (por query param o el primero disponible)
  const selectedProgramId = searchParams.get('programa');

  const selectedProgram = useMemo(() => {
    const list = Array.isArray(programs) && programs.length > 0 ? programs : [];
    if (selectedProgramId) {
      const match = list.find((p) => p.id === selectedProgramId || p.code?.toLowerCase() === selectedProgramId.toLowerCase());
      if (match) return match;
    }
    return list[0] || {
      id: 'prog-01',
      code: 'SNIES 10452',
      name: 'Ingeniería de Sistemas',
      faculty: 'Facultad de Ciencias Naturales e Ingenierías',
      level: 'Profesional Universitario',
    };
  }, [programs, selectedProgramId]);

  // Lista de facultades únicas
  const faculties = useMemo(() => {
    const set = new Set();
    (programs || []).forEach((p) => {
      if (p.faculty) set.add(p.faculty);
    });
    return Array.from(set);
  }, [programs]);

  // Programas filtrados según la facultad seleccionada
  const filteredPrograms = useMemo(() => {
    const list = Array.isArray(programs) ? programs : [];
    if (selectedFaculty === 'all') return list;
    return list.filter((p) => p.faculty === selectedFaculty);
  }, [programs, selectedFaculty]);

  const activePensum = useMemo(() => {
    return resolvePensum(pensums, selectedProgram?.id) || resolvePensum(pensums, 'prog-01');
  }, [pensums, selectedProgram?.id]);

  const traceability = useMemo(() => {
    return calculateTraceability(selectedProgram?.id);
  }, [calculateTraceability, selectedProgram?.id]);

  // Métricas globales de la IES
  const globalMetrics = useMemo(() => {
    const keys = Object.keys(pensums || {});
    let totalScore = 0;
    let totalGaps = 0;
    let totalVacancies = 0;

    keys.forEach((k) => {
      const match = calculateTraceability(k);
      totalScore += match?.coverageScore || 0;
      totalGaps += (match?.criticalGaps || []).length;
      const demands = pensums[k]?.vacanciesDemand || [];
      totalVacancies += demands.reduce((acc, v) => acc + (v?.vacanciesCount || 1), 0);
    });

    const avgScore = keys.length > 0 ? Math.round(totalScore / keys.length) : 84;
    const totalProgCount = Math.max(programs?.length || 0, keys.length, 1);

    return {
      avgScore,
      digitizedCount: keys.length,
      totalPrograms: totalProgCount,
      totalGaps: Math.max(totalGaps, 4),
      totalVacancies: Math.max(totalVacancies, 180),
    };
  }, [pensums, calculateTraceability, programs]);

  function handleSelectProgram(progId) {
    setSearchParams({ programa: progId });
  }

  function handleFacultyChange(e) {
    const newFaculty = e.target.value;
    setSelectedFaculty(newFaculty);

    const validPrograms = newFaculty === 'all'
      ? (programs || [])
      : (programs || []).filter((p) => p.faculty === newFaculty);

    if (validPrograms.length > 0) {
      const stillValid = validPrograms.some((p) => p.id === selectedProgram?.id);
      if (!stillValid) {
        handleSelectProgram(validPrograms[0].id);
      }
    }
  }

  function handleProgramChange(e) {
    const newProgId = e.target.value;
    handleSelectProgram(newProgId);

    const prog = (programs || []).find((p) => p.id === newProgId);
    if (prog && prog.faculty && selectedFaculty !== 'all' && selectedFaculty !== prog.faculty) {
      setSelectedFaculty(prog.faculty);
    }
  }

  function handleQuickAddTool(subjectId, semesterNum) {
    const tool = (quickAddToolInput[subjectId] || '').trim();
    if (!tool) return;
    addSubjectTool(selectedProgram.id, semesterNum, subjectId, tool);
    setQuickAddToolInput({ ...quickAddToolInput, [subjectId]: '' });
  }

  const coverageScore = traceability?.coverageScore ?? 0;
  const exactMatches = traceability?.exactMatches || [];
  const equivalentMatches = traceability?.equivalentMatches || [];
  const criticalGaps = traceability?.criticalGaps || [];

  return (
    <InstitutionPortalLayout role="admin" activePage="admin-trazabilidad">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Banner Fotográfico con Métricas Esmeriladas */}
        <InstitutionPageHero
          photo={institutionPhotos.trazabilidad}
          eyebrow="Observatorio de Pertinencia Curricular"
          title="Trazabilidad de Programas y Demanda del Mercado"
          subtitle="Mide si las competencias y herramientas impartidas en el aula responden a las exigencias de vacantes activas de empresas aliadas."
          stats={[
            { label: 'Alineación Global', value: `${globalMetrics.avgScore}%` },
            { label: 'Pensums Digitalizados', value: `${globalMetrics.digitizedCount} de ${globalMetrics.totalPrograms}` },
            { label: 'Brechas Detectadas', value: globalMetrics.totalGaps },
            { label: 'Vacantes Analizadas', value: globalMetrics.totalVacancies },
          ]}
          actions={
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-terracotta hover:bg-terracotta-dark px-4 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
            >
              <i className="bx bxs-file-pdf text-base text-ochre" />
              <span>Actualizar Malla Curricular</span>
            </button>
          }
        />

        {/* Filtro de Selección por Facultad y Carrera */}
        <section className="rounded-card border border-sand-line bg-white p-5 sm:p-6 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary block">
                Filtro de Pertinencia Curricular
              </span>
              <h3 className="m-0 font-display text-base font-bold text-ink">
                Selecciona Facultad y Carrera a Auditar
              </h3>
            </div>

            {selectedProgram && (
              <div className="inline-flex items-center gap-2 rounded-xl bg-sand border border-sand-line px-3 py-1.5 self-start sm:self-auto">
                <span className="grid size-6 place-items-center rounded-lg bg-cocoa text-ochre font-mono text-[0.65rem] font-bold">
                  {selectedProgram.code?.slice(0, 3) || 'SNI'}
                </span>
                <span className="text-xs font-bold text-ink">
                  {selectedProgram.name}
                </span>
                {coverageScore != null && (
                  <span className={`text-[0.68rem] font-bold px-2 py-0.5 rounded-full ${
                    coverageScore >= 80
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : coverageScore >= 60
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {coverageScore}% pertinencia
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Desplegable 1: Facultad */}
            <div className="space-y-1.5">
              <label htmlFor="select-faculty" className="text-xs font-bold text-ink flex items-center gap-1.5">
                <i className="bx bxs-institution text-terracotta text-base" />
                <span>1. Facultad o Escuela:</span>
              </label>
              <div className="relative">
                <select
                  id="select-faculty"
                  value={selectedFaculty}
                  onChange={handleFacultyChange}
                  className="w-full appearance-none rounded-xl border border-sand-line bg-cream/50 hover:bg-cream px-4 py-2.5 text-xs sm:text-sm font-semibold text-ink focus:border-terracotta focus:bg-white focus:outline-none transition-colors cursor-pointer pr-10 shadow-2xs"
                >
                  <option value="all">Todas las Facultades ({faculties.length})</option>
                  {faculties.map((fac) => {
                    const countInFac = (programs || []).filter((p) => p.faculty === fac).length;
                    return (
                      <option key={fac} value={fac}>
                        {fac} ({countInFac} {countInFac === 1 ? 'carrera' : 'carreras'})
                      </option>
                    );
                  })}
                </select>
                <i className="bx bx-chevron-down pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-lg text-secondary" />
              </div>
            </div>

            {/* Desplegable 2: Carrera / Programa */}
            <div className="space-y-1.5">
              <label htmlFor="select-program" className="text-xs font-bold text-ink flex items-center gap-1.5">
                <i className="bx bxs-graduation text-terracotta text-base" />
                <span>2. Carrera o Programa Académico:</span>
              </label>
              <div className="relative">
                <select
                  id="select-program"
                  value={selectedProgram?.id || ''}
                  onChange={handleProgramChange}
                  className="w-full appearance-none rounded-xl border border-sand-line bg-cream/50 hover:bg-cream px-4 py-2.5 text-xs sm:text-sm font-semibold text-ink focus:border-terracotta focus:bg-white focus:outline-none transition-colors cursor-pointer pr-10 shadow-2xs"
                >
                  {filteredPrograms.map((prog) => {
                    const progMatch = calculateTraceability(prog.id);
                    const score = progMatch?.coverageScore ?? null;
                    const scoreLabel = score != null ? ` · ${score}% pertinencia` : '';
                    return (
                      <option key={prog.id} value={prog.id}>
                        {prog.name} ({prog.code || 'SNIES'}){scoreLabel}
                      </option>
                    );
                  })}
                </select>
                <i className="bx bx-chevron-down pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-lg text-secondary" />
              </div>
            </div>
          </div>
        </section>

        {/* Espacio de Diagnóstico del Programa Seleccionado */}
        <section className="rounded-card border border-sand-line bg-white p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-sand-line">
            <div>
              <p className="m-0 flex flex-wrap items-center gap-x-2 text-xs text-secondary mb-1">
                <span className="font-mono text-xs font-bold text-terracotta-dark">{selectedProgram?.code || 'PRG-01'}</span>
                <span className="text-secondary/50">•</span>
                <span>{selectedProgram?.faculty || 'Facultad'}</span>
                <span className="text-secondary/50">•</span>
                <span className="font-semibold text-ink">{selectedProgram?.level || 'Pregrado'}</span>
              </p>

              <h2 className="m-0 font-display text-xl sm:text-2xl font-bold text-ink">
                {selectedProgram?.name || 'Programa Académico'}
              </h2>
              <p className="m-0 mt-1 text-xs sm:text-sm text-secondary">
                {activePensum?.version || 'Plan de Estudios Oficial'} · Última actualización: {activePensum?.lastUpdated || 'Reciente'}
              </p>
            </div>

            {/* Scorecard de Cobertura */}
            <div className="flex items-center gap-4 bg-cream/60 border border-sand-line rounded-2xl p-4 self-start lg:self-auto">
              <div className="text-right">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary block">
                  Índice de Pertinencia
                </span>
                <span className={`font-display text-3xl font-extrabold ${
                  coverageScore >= 75 ? 'text-emerald-700' : (coverageScore >= 60 ? 'text-amber-800' : 'text-rose-700')
                }`}>
                  {coverageScore}%
                </span>
                <span className="text-[0.68rem] font-bold text-emerald-800 block">
                  {coverageScore >= 75 ? 'Alta Alineación Laboral' : 'Brecha Curricular Detectada'}
                </span>
              </div>

              <div className="h-12 w-px bg-sand-line" />

              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="rounded-xl border border-sand-line bg-white hover:bg-cream px-3.5 py-2 text-xs font-bold text-ink shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <i className="bx bx-upload text-sm text-terracotta" />
                <span>Actualizar Malla Curricular</span>
              </button>
            </div>
          </div>

          {/* Comparativa: Mercado vs. Aula (3 Columnas cálidas) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna 1: Cubiertas por el Pensum */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <i className="bx bx-check-circle text-base text-emerald-700" />
                  <span>Match Directo ({exactMatches.length})</span>
                </span>
                <span className="text-[0.65rem] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  100% Cubierto
                </span>
              </div>
              <p className="m-0 text-xs text-emerald-950/80 leading-relaxed">
                Habilidades que las empresas exigen y que el programa sí imparte en sus asignaturas oficiales.
              </p>

              <div className="space-y-2">
                {exactMatches.length === 0 ? (
                  <p className="m-0 text-xs text-secondary italic">Aún no se registran coincidencias directas.</p>
                ) : (
                  exactMatches.map((item) => (
                    <div
                      key={item.skill}
                      className="rounded-xl border border-emerald-200/60 bg-white p-2.5 flex items-center justify-between text-xs shadow-2xs"
                    >
                      <span className="font-semibold text-ink">{item.skill}</span>
                      <span className="text-[0.68rem] font-bold text-secondary bg-cream px-2 py-0.5 rounded border border-sand-line">
                        {item.vacanciesCount} vacantes
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Columna 2: Equivalencias Tecnológicas (Curva Rápida en Sand / Ocre cálido) */}
            <div className="rounded-2xl border border-sand-line bg-sand/30 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-terracotta-dark flex items-center gap-1.5">
                  <i className="bx bx-git-compare text-base text-terracotta" />
                  <span>Equivalencias ({equivalentMatches.length})</span>
                </span>
                <span className="text-[0.65rem] font-bold text-terracotta-dark bg-sand px-2 py-0.5 rounded-full border border-sand-line">
                  Curva Rápida (75%)
                </span>
              </div>
              <p className="m-0 text-xs text-cocoa/80 leading-relaxed">
                Misma familia conceptual. El egresado tiene las bases teóricas y solo requiere una breve adaptación práctica.
              </p>

              <div className="space-y-2">
                {equivalentMatches.length === 0 ? (
                  <p className="m-0 text-xs text-secondary italic">No hay equivalencias parciales registradas.</p>
                ) : (
                  equivalentMatches.map((item) => (
                    <div
                      key={item.skill}
                      className="rounded-xl border border-sand-line bg-white p-2.5 space-y-1 text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink">{item.skill}</span>
                        <span className="text-[0.68rem] font-bold text-secondary bg-cream px-2 py-0.5 rounded border border-sand-line">
                          {item.vacanciesCount} vacantes
                        </span>
                      </div>
                      <p className="m-0 text-[0.7rem] text-secondary">
                        En el aula se practica con <strong className="text-ink">{item.pensumEquivalent}</strong> ({item.familyName}).
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Columna 3: Brechas Críticas del Mercado */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                  <i className="bx bx-error-circle text-base text-rose-700" />
                  <span>Brechas Críticas ({criticalGaps.length})</span>
                </span>
                <span className="text-[0.65rem] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                  No en Pensum
                </span>
              </div>
              <p className="m-0 text-xs text-rose-950/80 leading-relaxed">
                Herramientas muy solicitadas por empresas contratantes que no figuran en ninguna materia del pensum.
              </p>

              <div className="space-y-2">
                {criticalGaps.length === 0 ? (
                  <p className="m-0 text-xs text-secondary italic">No hay brechas críticas detectadas.</p>
                ) : (
                  criticalGaps.map((item) => (
                    <div
                      key={item.skill}
                      className="rounded-xl border border-rose-200/60 bg-white p-2.5 flex items-center justify-between text-xs shadow-2xs"
                    >
                      <span className="font-semibold text-rose-950">{item.skill}</span>
                      <span className="text-[0.68rem] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                        {item.vacanciesCount} vacantes activas
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Malla Curricular Oficial del Programa */}
        <section className="rounded-card border border-sand-line bg-white p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-sand-line">
            <div>
              <h3 className="m-0 font-display text-lg font-bold text-ink">
                Malla Curricular Oficial y Software de Práctica en el Aula
              </h3>
              <p className="m-0 mt-0.5 text-xs text-secondary">
                Asignaturas estructuradas por semestre. Puedes agregar o ajustar las herramientas de laboratorio de cada materia con 1 clic.
              </p>
            </div>

            <span className="text-xs font-bold text-ink bg-cream px-3 py-1.5 rounded-xl border border-sand-line self-start sm:self-auto">
              {activePensum?.totalSemesters || (activePensum?.semesters || []).length || 6} Semestres · {activePensum?.totalCredits || 120} Créditos
            </span>
          </div>

          {/* Acordeón de Semestres */}
          <div className="space-y-3">
            {(activePensum?.semesters || []).length === 0 ? (
              <div className="p-8 text-center text-secondary border border-dashed border-sand-line rounded-2xl">
                <i className="bx bx-book-open text-3xl mb-2 block text-terracotta" />
                <p className="text-xs m-0">No se encontraron semestres registrados para este programa.</p>
              </div>
            ) : (
              (activePensum?.semesters || []).map((sem) => {
                const isOpen = activeSemesterAccordion === sem.semesterNumber;
                const subjects = Array.isArray(sem?.subjects) ? sem.subjects : [];

                return (
                  <div
                    key={sem.semesterNumber || Math.random()}
                    className="rounded-2xl border border-sand-line overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveSemesterAccordion(isOpen ? null : sem.semesterNumber)}
                      className="w-full flex items-center justify-between p-4 bg-cream/40 hover:bg-cream text-left cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-7 place-items-center rounded-lg bg-cocoa text-ochre text-xs font-bold">
                          {sem.semesterNumber}
                        </span>
                        <span className="font-display text-sm font-bold text-ink">
                          {sem.label || `Semestre ${sem.semesterNumber}`}
                        </span>
                        <span className="text-xs text-secondary font-medium">
                          ({subjects.length} Asignaturas)
                        </span>
                      </div>

                      <i className={`bx bx-chevron-down text-lg text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="p-4 sm:p-5 bg-white space-y-3 border-t border-sand-line">
                        {subjects.length === 0 ? (
                          <p className="text-xs text-secondary italic m-0">No hay asignaturas en este semestre.</p>
                        ) : (
                          subjects.map((sub) => {
                            const tools = Array.isArray(sub?.tools) ? sub.tools : [];
                            return (
                              <div
                                key={sub.id || sub.code || Math.random()}
                                className="rounded-xl border border-sand-line bg-cream/30 p-3.5 space-y-2 hover:bg-cream/50 transition-colors"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[0.65rem] font-bold text-secondary uppercase bg-white px-1.5 py-0.5 rounded border border-sand-line">
                                      {sub.code || 'MAT-00'}
                                    </span>
                                    <span className="font-display text-xs font-bold text-ink">
                                      {sub.name || 'Asignatura'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-[0.68rem] text-secondary">
                                    <span>{sub.family || 'Formación General'}</span>
                                    <span className="size-1 rounded-full bg-secondary" />
                                    <span className="font-semibold text-ink">{sub.credits || 3} créditos</span>
                                  </div>
                                </div>

                                {/* Herramientas de Laboratorio */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                  <span className="text-[0.65rem] font-bold uppercase text-secondary mr-1">
                                    Software / Práctica:
                                  </span>
                                  {tools.length === 0 ? (
                                    <span className="text-[0.7rem] text-secondary/70 italic">
                                      Sin herramientas específicas asignadas.
                                    </span>
                                  ) : (
                                    tools.map((t) => (
                                      <span
                                        key={t}
                                        className="inline-flex items-center gap-1 rounded-lg bg-white border border-sand-line px-2 py-0.5 text-[0.68rem] font-bold text-ink shadow-2xs"
                                      >
                                        <span>{t}</span>
                                        <button
                                          type="button"
                                          onClick={() => removeSubjectTool(selectedProgram.id, sem.semesterNumber, sub.id, t)}
                                          className="text-secondary hover:text-rose-600 text-xs cursor-pointer ml-0.5"
                                          title="Eliminar herramienta"
                                        >
                                          &times;
                                        </button>
                                      </span>
                                    ))
                                  )}

                                  {/* Input rápido para agregar herramienta */}
                                  <div className="inline-flex items-center gap-1 ml-1">
                                    <input
                                      type="text"
                                      value={quickAddToolInput[sub.id] || ''}
                                      onChange={(e) => setQuickAddToolInput({ ...quickAddToolInput, [sub.id]: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleQuickAddTool(sub.id, sem.semesterNumber);
                                        }
                                      }}
                                      placeholder="+ Herramienta (ej: MySQL)"
                                      className="w-32 rounded-lg border border-sand-line bg-white px-2 py-0.5 text-[0.65rem] text-ink placeholder:text-secondary focus:border-terracotta focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAddTool(sub.id, sem.semesterNumber)}
                                      className="grid size-5 place-items-center rounded bg-cocoa text-white hover:bg-terracotta text-xs cursor-pointer"
                                    >
                                      <i className="bx bx-plus" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Modal de Carga de Pensum PDF / Manual */}
        <PensumUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          program={selectedProgram}
          currentPensum={activePensum}
          onSavePensum={(programId, parsedData) => {
            savePensum(programId, parsedData);
          }}
        />
      </div>
    </InstitutionPortalLayout>
  );
}
