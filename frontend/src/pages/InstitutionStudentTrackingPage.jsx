import { useMemo, useState } from 'react';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import StudentTrackingDrawer from '../components/institution/StudentTrackingDrawer.jsx';
import GraduatesTrackingAnalyticsChart from '../components/institution/GraduatesTrackingAnalyticsChart.jsx';
import { graduatesTrackingData } from '../data/institutionTrackingData.js';
import { advisorPhotos } from '../data/institutionImages.js';

function getInitials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function InstitutionStudentTrackingPage() {
  const [graduates, setGraduates] = useState(graduatesTrackingData);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedCohort, setSelectedCohort] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'employed' | 'seeking'
  const [activeDrawerId, setActiveDrawerId] = useState(null);

  function handleApplyFilterFromChart({ program, cohort, status }) {
    if (program && program !== 'all') setSelectedProgram(program);
    if (cohort && cohort !== 'all') setSelectedCohort(cohort);
    if (status && status !== 'all') setSelectedStatus(status);

    const el = document.getElementById('tabla-seguimiento-egresados');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Programas únicos para el dropdown
  const programs = useMemo(() => {
    const list = [...new Set(graduatesTrackingData.map((g) => g.program))];
    return list.sort((a, b) => a.localeCompare(b, 'es'));
  }, []);

  // Cohortes únicas para el dropdown
  const cohorts = useMemo(() => {
    const list = [...new Set(graduatesTrackingData.map((g) => g.graduationPeriod))];
    return list.sort().reverse();
  }, []);

  // Métricas agregadas
  const metrics = useMemo(() => {
    const total = graduatesTrackingData.length;
    const employed = graduatesTrackingData.filter((g) => g.status === 'employed').length;
    const seeking = graduatesTrackingData.filter((g) => g.status === 'seeking').length;
    const totalApplications = graduatesTrackingData.reduce(
      (acc, g) => acc + g.applications.length,
      0
    );
    const employmentRate = total > 0 ? Math.round((employed / total) * 100) : 0;

    return { total, employed, seeking, totalApplications, employmentRate };
  }, []);

  // Filtrado reactivo inteligente
  const filteredGraduates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return graduates.filter((item) => {
      // Filtro por Estado
      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false;
      }

      // Filtro por Programa
      if (selectedProgram !== 'all' && item.program !== selectedProgram) {
        return false;
      }

      // Filtro por Cohorte
      if (selectedCohort !== 'all' && item.graduationPeriod !== selectedCohort) {
        return false;
      }

      // Barra de búsqueda rápida (nombre, cédula, código, cargo o empresa)
      if (q) {
        const nameMatch = item.studentName.toLowerCase().includes(q);
        const docMatch = item.documentId.includes(q);
        const codeMatch = item.studentCode.includes(q);
        const programMatch = item.program.toLowerCase().includes(q);
        const companyMatch =
          item.status === 'employed' &&
          item.employmentDetails?.company?.toLowerCase().includes(q);
        const jobMatch =
          item.status === 'employed' &&
          item.employmentDetails?.jobTitle?.toLowerCase().includes(q);

        return (
          nameMatch ||
          docMatch ||
          codeMatch ||
          programMatch ||
          companyMatch ||
          jobMatch
        );
      }

      return true;
    });
  }, [graduates, searchQuery, selectedProgram, selectedCohort, selectedStatus]);

  const selectedGraduate = useMemo(
    () => graduates.find((g) => g.id === activeDrawerId) || null,
    [graduates, activeDrawerId]
  );

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedProgram !== 'all' ||
    selectedCohort !== 'all' ||
    selectedStatus !== 'all';

  function handleResetFilters() {
    setSearchQuery('');
    setSelectedProgram('all');
    setSelectedCohort('all');
    setSelectedStatus('all');
  }

  return (
    <InstitutionPortalLayout activePage="estudiantes-seguimiento">
      <main className="w-full pb-16">
        <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-10 space-y-8">
          {/* ─── 1. Encabezado Hero Fotográfico y KPIs del Seguimiento ─── */}
          <InstitutionPageHero
            eyebrow="Trazabilidad & Colocación Laboral"
            title="Seguimiento Laboral de Egresados"
            subtitle="Monitorea en tiempo real el estado de inserción productiva, empresas empleadoras, aspiraciones y el avance en fases de selección de los egresados de la institución."
            photo={advisorPhotos.studentTracking}
            stats={[
              {
                value: `${metrics.employmentRate}%`,
                label: 'Tasa de Vinculación',
              },
              {
                value: metrics.employed,
                label: 'Egresados Vinculados',
              },
              {
                value: metrics.seeking,
                label: 'En Búsqueda Activa',
              },
              {
                value: metrics.totalApplications,
                label: 'Postulaciones Radicadas',
              },
            ]}
            actions={
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-lime hover:bg-lime/85 text-ink px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Imprimir o exportar listado a PDF"
              >
                <i className="bx bx-printer text-base" />
                <span>Exportar Reporte</span>
              </button>
            }
          />

          {/* ─── 2. Panel Analítico y Gráficos de Inserción Laboral ─── */}
          <GraduatesTrackingAnalyticsChart
            graduates={graduates}
            onApplyFilterToTable={handleApplyFilterFromChart}
          />

          {/* ─── 3. Barra de Búsqueda y Filtros del Directorio ─── */}
          <div
            id="tabla-seguimiento-egresados"
            className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-4 scroll-mt-24"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Barra de Búsqueda */}
              <div className="relative flex-1">
                <i className="bx bx-search absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-secondary pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, cédula, código, programa o empresa contratante..."
                  className="w-full rounded-xl border border-line bg-page/40 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-ink placeholder:text-secondary focus:border-green focus:bg-white focus:outline-none transition-all"
                  aria-label="Buscar egresado"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-ink cursor-pointer"
                    aria-label="Limpiar búsqueda"
                  >
                    <i className="bx bx-x text-lg" />
                  </button>
                )}
              </div>

              {/* Pestañas de Estado de Empleabilidad (Pills en Verde Claro UTS) */}
              <div className="flex flex-wrap items-center gap-2" role="tablist">
                <button
                  type="button"
                  onClick={() => setSelectedStatus('all')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    selectedStatus === 'all'
                      ? 'bg-lime text-ink shadow-xs'
                      : 'bg-page text-secondary hover:text-ink hover:bg-panel'
                  }`}
                >
                  <span>Todos</span>
                  <span
                    className={`rounded-full px-2 py-0.2 text-[0.62rem] font-black ${
                      selectedStatus === 'all' ? 'bg-ink text-white' : 'bg-line text-secondary'
                    }`}
                  >
                    {graduatesTrackingData.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('employed')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    selectedStatus === 'employed'
                      ? 'bg-lime text-ink shadow-xs'
                      : 'bg-page text-secondary hover:text-ink hover:bg-panel'
                  }`}
                >
                  <span>Contratados</span>
                  <span
                    className={`rounded-full px-2 py-0.2 text-[0.62rem] font-black ${
                      selectedStatus === 'employed' ? 'bg-ink text-white' : 'bg-line text-secondary'
                    }`}
                  >
                    {metrics.employed}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('seeking')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    selectedStatus === 'seeking'
                      ? 'bg-lime text-ink shadow-xs'
                      : 'bg-page text-secondary hover:text-ink hover:bg-panel'
                  }`}
                >
                  <span>En Búsqueda</span>
                  <span
                    className={`rounded-full px-2 py-0.2 text-[0.62rem] font-black ${
                      selectedStatus === 'seeking' ? 'bg-ink text-white' : 'bg-line text-secondary'
                    }`}
                  >
                    {metrics.seeking}
                  </span>
                </button>
              </div>
            </div>

            {/* Dropdowns secundarios de filtrado */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line-soft text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Filtro por Programa */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-secondary">Programa:</span>
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="rounded-lg border border-line bg-page px-2.5 py-1.5 font-medium text-ink outline-none cursor-pointer hover:border-green transition-colors"
                  >
                    <option value="all">Todos los programas ({programs.length})</option>
                    {programs.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por Corte */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-secondary">Corte:</span>
                  <select
                    value={selectedCohort}
                    onChange={(e) => setSelectedCohort(e.target.value)}
                    className="rounded-lg border border-line bg-page px-2.5 py-1.5 font-medium text-ink outline-none cursor-pointer hover:border-green transition-colors"
                  >
                    <option value="all">Todos los cortes</option>
                    {cohorts.map((c) => (
                      <option key={c} value={c}>
                        Grado {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contador de resultados y botón reset */}
              <div className="flex items-center gap-3">
                <span className="text-secondary font-medium">
                  Mostrando <strong>{filteredGraduates.length}</strong> de {graduates.length} egresados
                </span>

                {hasActiveFilters && (
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

          {/* ─── 3. Directorio Principal de Egresados ─── */}
          <section aria-labelledby="directory-section-title" className="space-y-4">
            <h2 id="directory-section-title" className="sr-only">
              Directorio de Egresados en Seguimiento Laboral
            </h2>

            {filteredGraduates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center space-y-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-panel text-secondary text-2xl mx-auto">
                  <i className="bx bx-search-alt" />
                </div>
                <h3 className="m-0 font-display text-base font-bold text-ink">
                  No se encontraron egresados con los filtros seleccionados
                </h3>
                <p className="m-0 text-xs text-secondary max-w-md mx-auto">
                  Intenta cambiar el término de búsqueda, seleccionar otro programa académico o reiniciar los filtros.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-ink text-white px-4 py-2 text-xs font-bold hover:bg-ink/80 transition-colors cursor-pointer"
                >
                  Restablecer Filtros
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-line bg-page/60 text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                        <th scope="col" className="px-5 py-3.5">Egresado & Documento</th>
                        <th scope="col" className="px-5 py-3.5">Programa & Corte</th>
                        <th scope="col" className="px-5 py-3.5">Estado Laboral</th>
                        <th scope="col" className="px-5 py-3.5">Empresa / Cargo Actual</th>
                        <th scope="col" className="px-5 py-3.5 text-center">Postulaciones</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-soft">
                      {filteredGraduates.map((grad) => {
                        const isEmployed = grad.status === 'employed';
                        const maxPhase = Math.max(...grad.applications.map((a) => a.currentPhase));

                        return (
                          <tr
                            key={grad.id}
                            className="hover:bg-page/50 transition-colors cursor-pointer group"
                            onClick={() => setActiveDrawerId(grad.id)}
                          >
                            {/* Egresado & Documento */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                {grad.avatar ? (
                                  <img
                                    src={grad.avatar}
                                    alt={grad.studentName}
                                    className="size-10 rounded-full object-cover border border-line shrink-0"
                                  />
                                ) : (
                                  <span className="grid size-10 place-items-center rounded-full bg-green/10 text-green-dark font-display text-xs font-bold border border-green/20 shrink-0">
                                    {getInitials(grad.studentName)}
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <span className="block font-display text-sm font-bold text-ink truncate group-hover:text-green-dark transition-colors">
                                    {grad.studentName}
                                  </span>
                                  <span className="block text-[0.68rem] text-secondary">
                                    {grad.documentType} {grad.documentId} · Cód: {grad.studentCode}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Programa & Corte */}
                            <td className="px-5 py-4">
                              <span className="block font-semibold text-ink truncate max-w-xs">
                                {grad.program}
                              </span>
                              <span className="block text-[0.68rem] text-secondary">
                                Grado: <strong>{grad.graduationPeriod}</strong> · {grad.campus.split('·')[0]}
                              </span>
                            </td>

                            {/* Estado Laboral Badge */}
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold ${
                                  isEmployed
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                                }`}
                              >
                                <span
                                  className={`size-1.5 rounded-full ${
                                    isEmployed ? 'bg-emerald-600' : 'bg-amber-600'
                                  }`}
                                />
                                {isEmployed ? 'Contratado' : 'En Búsqueda'}
                              </span>
                            </td>

                            {/* Empresa / Cargo Actual */}
                            <td className="px-5 py-4">
                              {isEmployed ? (
                                <div className="min-w-0 max-w-xs">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-ink truncate">
                                      {grad.employmentDetails.company}
                                    </span>
                                    {grad.employmentDetails?.placedViaVincula ? (
                                      <span
                                        className="inline-flex items-center gap-0.5 rounded bg-lime/40 border border-lime/70 px-1.5 py-0.2 text-[0.6rem] font-bold text-ink"
                                        title="Contratado a través de la Bolsa Institucional Vincula UTS"
                                      >
                                        <i className="bx bxs-bolt text-[0.7rem] text-green-dark" />
                                        Vincula UTS
                                      </span>
                                    ) : (
                                      <span
                                        className="inline-flex items-center rounded bg-page border border-line-soft px-1.5 py-0.2 text-[0.6rem] font-medium text-secondary"
                                        title="Contratado por convocatoria externa / vinculación directa"
                                      >
                                        Externo
                                      </span>
                                    )}
                                  </div>
                                  <span className="block text-[0.68rem] text-secondary truncate mt-0.5">
                                    {grad.employmentDetails.jobTitle}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-secondary text-[0.72rem] italic">
                                  <span>Sin registro de contrato</span>
                                  <span className="block text-[0.65rem] text-amber-800 not-italic font-medium">
                                    {grad.seekingDetails.targetRoles[0]}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Postulaciones */}
                            <td className="px-5 py-4 text-center">
                              <span className="inline-flex flex-col items-center">
                                <span className="rounded-full bg-panel px-2.5 py-0.5 font-bold text-ink text-xs">
                                  {grad.applications.length}
                                </span>
                                <span className="text-[0.62rem] text-secondary mt-0.5 font-medium">
                                  Fase {maxPhase} máx
                                </span>
                              </span>
                            </td>

                            {/* Botón Acción */}
                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDrawerId(grad.id);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-page px-3 py-1.5 text-xs font-bold text-ink hover:bg-green hover:text-white hover:border-green transition-all shadow-2xs cursor-pointer"
                              >
                                <span>Ver Expediente 360°</span>
                                <i className="bx bx-chevron-right text-sm" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ─── Drawer Modal de Expediente 360° ─── */}
      <StudentTrackingDrawer
        isOpen={Boolean(selectedGraduate)}
        onClose={() => setActiveDrawerId(null)}
        student={selectedGraduate}
      />
    </InstitutionPortalLayout>
  );
}
