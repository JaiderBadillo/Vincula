import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import PensumUploadModal from '../components/institution/PensumUploadModal.jsx';
import TraceabilityCurriculumViews from '../components/institution/TraceabilityCurriculumViews.jsx';
import TraceabilityOutcomes from '../components/institution/TraceabilityOutcomes.jsx';
import { useInstitutionPrograms } from '../hooks/useInstitutionPrograms.js';
import { institutionPhotos } from '../data/institutionImages.js';
import { aiService } from '../services/aiService.js';

const selectClass =
  'w-full appearance-none rounded-xl border border-sand-line bg-cream/50 hover:bg-cream px-4 py-2.5 pr-10 text-sm font-semibold text-ink focus:border-terracotta focus:bg-white focus:outline-none transition-colors cursor-pointer';

/** Malla del informe en la forma que edita el modal. */
function toEditablePensum(report) {
  if (!report?.pensum_registrado) return null;
  return {
    programName: report.programa_nombre,
    version: report.pensum_version || '',
    semesters: report.semestres.filter((sem) => !sem.programa_origen).map((sem) => ({
      semesterNumber: sem.numero_semestre,
      label: sem.etiqueta,
      subjects: sem.asignaturas.map((sub) => ({
        id: sub.id,
        code: sub.codigo,
        name: sub.nombre,
        credits: sub.creditos,
        family: sub.familia,
        tools: sub.herramientas || [],
      })),
    })),
  };
}

export default function InstitutionAdminTraceabilityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { programs: allPrograms } = useInstitutionPrograms();
  // Solo programas registrados en el backend: los de demostración no tienen malla ni vacantes.
  const programs = useMemo(() => (allPrograms || []).filter((p) => p.source === 'api'), [allPrograms]);

  const [selectedFaculty, setSelectedFaculty] = useState('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [openSemester, setOpenSemester] = useState(null);
  const [report, setReport] = useState(null);
  const [outcomes, setOutcomes] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const faculties = useMemo(() => [...new Set(programs.map((p) => p.faculty).filter(Boolean))], [programs]);
  const filteredPrograms = useMemo(
    () => (selectedFaculty === 'all' ? programs : programs.filter((p) => p.faculty === selectedFaculty)),
    [programs, selectedFaculty]
  );

  const selectedProgramId = searchParams.get('programa');
  const selectedProgram = useMemo(
    () => filteredPrograms.find((p) => p.id === selectedProgramId) || filteredPrograms[0] || null,
    [filteredPrograms, selectedProgramId]
  );

  const loadReport = useCallback(async (programId) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [pertinencia, resultados] = await Promise.all([
        aiService.getProgramPertinence(programId),
        aiService.getProgramOutcomes(programId),
      ]);
      setReport(pertinencia);
      setOutcomes(resultados);
    } catch (err) {
      setReport(null);
      setOutcomes(null);
      setLoadError(err.message || 'No se pudo consultar la pertinencia del programa.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProgram?.id) loadReport(selectedProgram.id);
    else setReport(null);
  }, [selectedProgram?.id, loadReport]);

  const editablePensum = useMemo(() => toEditablePensum(report), [report]);

  async function handlePreviousProgramChange(previousId) {
    setLoadError('');
    try {
      setReport(await aiService.setPreviousProgram(selectedProgram.id, previousId));
    } catch (err) {
      setLoadError(err.message || 'No se pudo guardar el programa previo.');
    }
  }
  const brechas = (report?.demanda || []).filter((d) => d.categoria !== 'blanda' && d.cobertura === 'brecha').length;
  const actualizado = report?.pensum_actualizado_en
    ? new Date(report.pensum_actualizado_en).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const uploadButton = (
    <button
      type="button"
      onClick={() => setIsUploadModalOpen(true)}
      disabled={!selectedProgram}
      className="inline-flex items-center gap-2 rounded-xl bg-terracotta hover:bg-terracotta-dark px-4 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
    >
      <i className="bx bxs-file-pdf text-base" aria-hidden="true" />
      <span>{report?.pensum_registrado ? 'Actualizar malla curricular' : 'Cargar malla curricular'}</span>
    </button>
  );

  return (
    <InstitutionPortalLayout role="admin" activePage="admin-trazabilidad">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <InstitutionPageHero
          photo={institutionPhotos.trazabilidad}
          eyebrow="Observatorio de Pertinencia Curricular"
          title="Trazabilidad de Programas y Demanda del Mercado"
          subtitle="Compara la malla de cada programa con las competencias que exigen las vacantes abiertas dirigidas a él."
          stats={report ? [
            { label: 'Alineación malla–demanda', value: report.indice_pertinencia == null ? 'Sin datos' : `${Math.round(report.indice_pertinencia)}%` },
            { label: 'Vacantes analizadas', value: report.total_vacantes_analizadas },
            { label: 'Competencias exigidas', value: report.demanda.length },
            { label: 'Brechas', value: brechas },
          ] : []}
          actions={uploadButton}
        />

        {/* Selección de facultad y programa */}
        <section data-tour="ies-trazabilidad-grafica" className="rounded-card border border-sand-line bg-white p-5 sm:p-6 shadow-card">
          {programs.length === 0 ? (
            <p className="m-0 text-sm text-secondary">
              No se encontraron programas registrados en el servidor. Si ya creaste programas, revisa que el backend esté en línea y recarga la página; los que se crean sin conexión quedan solo en este navegador.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="select-faculty" className="text-xs font-bold text-ink">Facultad o escuela</label>
                <div className="relative">
                  <select id="select-faculty" value={selectedFaculty} onChange={(e) => setSelectedFaculty(e.target.value)} className={selectClass}>
                    <option value="all">Todas las facultades ({faculties.length})</option>
                    {faculties.map((fac) => <option key={fac} value={fac}>{fac}</option>)}
                  </select>
                  <i className="bx bx-chevron-down pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-lg text-secondary" aria-hidden="true" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="select-program" className="text-xs font-bold text-ink">Programa académico</label>
                <div className="relative">
                  <select
                    id="select-program"
                    value={selectedProgram?.id || ''}
                    onChange={(e) => setSearchParams({ programa: e.target.value })}
                    className={selectClass}
                  >
                    {filteredPrograms.map((prog) => (
                      <option key={prog.id} value={prog.id}>{prog.name} ({prog.code || 'sin código'})</option>
                    ))}
                  </select>
                  <i className="bx bx-chevron-down pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-lg text-secondary" aria-hidden="true" />
                </div>
              </div>
            </div>
          )}
        </section>

        {selectedProgram && (
          <section className="rounded-card border border-sand-line bg-white p-6 sm:p-8 shadow-card space-y-6" aria-busy={isLoading}>
            <div className="flex flex-col gap-4 border-b border-sand-line pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="m-0 mb-1 text-xs text-secondary">
                  <span className="font-mono font-bold text-terracotta-dark">{selectedProgram.code}</span>
                  {' · '}{selectedProgram.faculty}{' · '}{selectedProgram.level}
                </p>
                <h2 className="m-0 font-display text-xl sm:text-2xl font-bold text-ink">{selectedProgram.name}</h2>
                <p className="m-0 mt-1 text-sm text-secondary">
                  {report?.pensum_registrado
                    ? `${report.pensum_version || 'Malla registrada'} · ${report.total_asignaturas} asignaturas en ${report.total_semestres} semestres${actualizado ? ` · actualizada el ${actualizado}` : ''}`
                    : 'Sin malla curricular registrada'}
                </p>
              </div>
            </div>

            {report && (
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <label htmlFor="select-previous-program" className="text-xs font-bold text-ink">
                  Ciclo propedéutico: programa previo requerido
                </label>
                <select
                  id="select-previous-program"
                  value={report.programa_previo_id || ''}
                  onChange={(e) => handlePreviousProgramChange(e.target.value)}
                  className="rounded-xl border border-sand-line bg-white px-3 py-2 text-xs font-semibold text-ink focus:border-terracotta focus:outline-none cursor-pointer"
                >
                  <option value="">Ninguno (programa independiente)</option>
                  {programs.filter((p) => p.id !== selectedProgram.id).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {report.programa_previo_nombre && (
                  <span className="text-xs text-secondary">Su malla también cuenta para medir este programa.</span>
                )}
              </div>
            )}

            {isLoading && <p className="m-0 text-sm text-secondary" role="status">Consultando el informe…</p>}
            {loadError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
                <strong className="block font-bold">No se pudo cargar el informe</strong>
                <span>{loadError}</span>
                <button type="button" onClick={() => loadReport(selectedProgram.id)} className="ml-2 cursor-pointer font-bold underline">
                  Reintentar
                </button>
              </div>
            )}
            {!isLoading && !loadError && (
              <>
                <div className="space-y-4">
                  <div>
                    <h3 className="m-0 font-display text-lg font-bold text-ink">Resultados de egresados</h3>
                    <p className="m-0 mt-0.5 text-sm text-secondary">
                      Qué pasa con las postulaciones de los egresados de este programa. Son hechos registrados en la plataforma.
                    </p>
                  </div>
                  <TraceabilityOutcomes outcomes={outcomes} />
                </div>
                <div className="space-y-4 border-t border-sand-line pt-6">
                  <div>
                    <h3 className="m-0 font-display text-lg font-bold text-ink">Alineación malla–demanda</h3>
                    <p className="m-0 mt-0.5 text-sm text-secondary">
                      Qué piden las vacantes dirigidas al programa y qué respalda la malla. Ayuda a explicar los resultados.
                    </p>
                  </div>
                  <TraceabilityCurriculumViews report={report} onOpenUploadModal={() => setIsUploadModalOpen(true)} />
                </div>
              </>
            )}
          </section>
        )}

        {/* Malla curricular guardada */}
        {report?.pensum_registrado && (
          <section className="rounded-card border border-sand-line bg-white p-6 sm:p-8 shadow-card space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="m-0 font-display text-lg font-bold text-ink">Malla curricular</h3>
                <p className="m-0 mt-0.5 text-sm text-secondary">
                  El área de cada asignatura se deduce de su nombre. Las herramientas las declara la institución y cuentan como cobertura directa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-xl border border-sand-line bg-white px-3.5 py-2 text-xs font-bold text-ink transition-colors hover:bg-cream"
              >
                <i className="bx bx-edit text-sm text-terracotta" aria-hidden="true" />
                <span>Editar malla y herramientas</span>
              </button>
            </div>

            <div className="space-y-3">
              {report.semestres.map((sem) => {
                const semKey = `${sem.programa_origen || ''}-${sem.numero_semestre}`;
                const isOpen = openSemester === semKey;
                return (
                  <div key={semKey} className="overflow-hidden rounded-2xl border border-sand-line">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenSemester(isOpen ? null : semKey)}
                      className="flex w-full cursor-pointer items-center justify-between bg-cream/40 p-4 text-left transition-colors hover:bg-cream"
                    >
                      <span className="flex items-center gap-3">
                        <span className="grid size-7 place-items-center rounded-lg bg-cocoa text-xs font-bold text-white">{sem.numero_semestre}</span>
                        <span className="font-display text-sm font-bold text-ink">{sem.etiqueta}</span>
                        <span className="text-xs text-secondary">{sem.asignaturas.length} asignaturas</span>
                        {sem.programa_origen && (
                          <span className="rounded-lg border border-sand-line bg-white px-2 py-0.5 text-xs font-semibold text-secondary">
                            Ciclo previo: {sem.programa_origen}
                          </span>
                        )}
                      </span>
                      <i className={`bx bx-chevron-down text-lg text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                    {isOpen && (
                      <ul className="m-0 list-none divide-y divide-sand-line border-t border-sand-line p-0">
                        {sem.asignaturas.map((sub) => (
                          <li key={sub.id} className="flex flex-col gap-1.5 p-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="m-0 text-sm font-bold text-ink">
                                <span className="mr-2 font-mono text-xs font-bold text-secondary">{sub.codigo}</span>
                                {sub.nombre}
                              </p>
                              <p className="m-0 mt-0.5 text-xs text-secondary">{sub.familia}</p>
                              {sub.herramientas.length > 0 && (
                                <p className="m-0 mt-1.5 flex flex-wrap gap-1.5">
                                  {sub.herramientas.map((t) => (
                                    <span key={t} className="rounded-lg border border-sand-line bg-cream px-2 py-0.5 text-xs font-semibold text-ink">{t}</span>
                                  ))}
                                </p>
                              )}
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-secondary">{sub.creditos} créditos</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <PensumUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          program={selectedProgram}
          currentPensum={editablePensum}
          onSavePensum={async (programId, pensum) => setReport(await aiService.savePensum(programId, pensum))}
        />
      </div>
    </InstitutionPortalLayout>
  );
}
