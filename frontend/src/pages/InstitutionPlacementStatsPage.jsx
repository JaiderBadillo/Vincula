import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import {
  placementOverview,
  facultyPlacementStats,
  programPlacementRanking,
  timeToPlacementData,
  salaryDistributionData,
  contractTypesData,
  workModalityData,
  relevanceIndexData,
  topEmployingCompanies,
  historicalCohortsComparison,
} from '../data/institutionPlacementStats.js';
import {
  PlacementTrendAreaChart,
  PlacementDonutChart,
  SalaryDistributionBarChart,
  TimeToPlacementChart,
} from '../components/institution/PlacementCharts.jsx';

export default function InstitutionPlacementStatsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('2026-I');
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState('all'); // 'all' | 'ingenierias' | 'socioeconomicas'
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('all'); // 'all' | 'Profesional' | 'Tecnológico'
  const [programSearch, setProgramSearch] = useState('');
  const [sortBy, setSortBy] = useState('rate-desc'); // 'rate-desc' | 'rate-asc' | 'salary-desc' | 'time-asc'
  const [exportNotice, setExportNotice] = useState(false);

  // Filtro y ordenamiento reactivo de programas
  const filteredPrograms = useMemo(() => {
    let list = [...programPlacementRanking];

    // Búsqueda por texto
    if (programSearch.trim() !== '') {
      const q = programSearch.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.faculty.toLowerCase().includes(q) ||
          p.demandStatus.toLowerCase().includes(q)
      );
    }

    // Filtro por Facultad
    if (selectedFacultyFilter === 'ingenierias') {
      list = list.filter((p) => p.faculty.includes('Ingenierías'));
    } else if (selectedFacultyFilter === 'socioeconomicas') {
      list = list.filter((p) => p.faculty.includes('Socioeconómicas'));
    }

    // Filtro por Nivel Académico
    if (selectedLevelFilter !== 'all') {
      list = list.filter((p) => p.level === selectedLevelFilter);
    }

    // Ordenamiento
    list.sort((a, b) => {
      if (sortBy === 'rate-desc') return b.rate - a.rate;
      if (sortBy === 'rate-asc') return a.rate - b.rate;
      if (sortBy === 'time-asc') return a.avgTimeMonths - b.avgTimeMonths;
      if (sortBy === 'salary-desc') {
        const salaryA = parseInt(a.avgSalary.replace(/\D/g, ''), 10) || 0;
        const salaryB = parseInt(b.avgSalary.replace(/\D/g, ''), 10) || 0;
        return salaryB - salaryA;
      }
      return 0;
    });

    return list;
  }, [programSearch, selectedFacultyFilter, selectedLevelFilter, sortBy]);

  // Handler de exportación / impresión
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 4000);
  };

  return (
    <InstitutionPortalLayout activePage="estudiantes-estadisticas">
      <main className="w-full pb-20">
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 space-y-8">
          
          {/* ─── 1. Header Ejecutivo & Selector de Periodo ─── */}
          <div className="flex flex-col gap-5 border-b border-line pb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="max-w-3xl">
                <h1 className="m-0 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  Estadísticas y Analíticas de Empleabilidad
                </h1>
                <p className="m-0 mt-1.5 text-sm text-body-muted leading-relaxed">
                  Monitoreo de inserción laboral formal, tasa de ocupación por programa, brecha de tiempo para el primer empleo y pertinencia con el perfil de egreso en las Unidades Tecnológicas de Santander.
                </p>
              </div>

              {/* Botones de acción ejecutiva */}
              <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink shadow-2xs hover:bg-page hover:border-line-strong transition-colors cursor-pointer"
                  title="Descargar matriz en formato CSV"
                >
                  <i className="bx bx-download text-sm text-secondary" />
                  <span>Exportar Matriz</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-ink/90 transition-colors cursor-pointer"
                >
                  <i className="bx bx-printer text-sm" />
                  <span>Imprimir Reporte</span>
                </button>
              </div>
            </div>

            {/* Cohorte / Periodo selector */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-secondary">
                  Periodo de corte académico:
                </span>
                <div className="flex items-center gap-1.5 rounded-xl border border-line bg-white p-1 shadow-2xs">
                  {[
                    { id: '2026-I', label: '2026 - I (Actual)' },
                    { id: '2025-II', label: '2025 - II' },
                    { id: '2025-I', label: '2025 - I' },
                    { id: 'historico', label: 'Histórico' },
                  ].map((period) => (
                    <button
                      key={period.id}
                      type="button"
                      onClick={() => setSelectedPeriod(period.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        selectedPeriod === period.id
                          ? 'bg-green/15 text-green-dark shadow-xs font-bold border border-green/30'
                          : 'text-secondary hover:text-ink hover:bg-page'
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-xs text-secondary">
                Auditoría periódica para acreditación institucional (CNA / MEN)
              </span>
            </div>

            {/* Notificación flotante de exportación CSV */}
            {exportNotice && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900 transition-all animate-in fade-in slide-in-from-top-1">
                <i className="bx bx-check-circle text-base text-emerald-600" />
                <span>
                  <strong>Matriz de Colocación Generada:</strong> El archivo estructurado con datos anonimizados de colocación 2026-I para auditoría del Ministerio de Educación Nacional ha comenzado su descarga.
                </span>
              </div>
            )}
          </div>

          {/* ─── 2. Top 5 Tarjetas KPI Globales de Colocación ─── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* KPI 1: Tasa de Colocación */}
            <div className="rounded-2xl border border-line bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-secondary">Tasa de Colocación</span>
                <span className="grid size-8 place-items-center rounded-xl bg-green/10 text-green-dark">
                  <i className="bx bx-trending-up text-base" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold tracking-tight text-ink">
                  {placementOverview.placementRate}%
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[0.7rem] font-bold text-emerald-800">
                  <i className="bx bx-up-arrow-alt" />
                  {placementOverview.placementGrowth}
                </span>
              </div>
              <p className="mt-2 text-xs text-body-muted">
                Meta institucional (75%) superada en 3 puntos porcentuales.
              </p>
            </div>

            {/* KPI 2: Tiempo a Colocación */}
            <div className="rounded-2xl border border-line bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-secondary">Tiempo Promedio</span>
                <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <i className="bx bx-stopwatch text-base" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold tracking-tight text-ink">
                  {placementOverview.averageTimeToPlacementMonths}
                </span>
                <span className="text-sm font-semibold text-secondary">meses</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[0.7rem] font-bold text-emerald-800">
                  <i className="bx bx-down-arrow-alt" />
                  {placementOverview.timeToPlacementImprovement}
                </span>
              </div>
              <p className="mt-2 text-xs text-body-muted">
                El 44% de los graduados se vincula en menos de 90 días.
              </p>
            </div>

            {/* KPI 3: Pertinencia Curricular */}
            <div className="rounded-2xl border border-line bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-secondary">Pertinencia de Carrera</span>
                <span className="grid size-8 place-items-center rounded-xl bg-purple-50 text-purple-700">
                  <i className="bx bx-target-lock text-base" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold tracking-tight text-ink">
                  {placementOverview.relevanceRate}%
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 px-2 py-0.5 text-[0.7rem] font-bold text-purple-800">
                  Alta Afinidad
                </span>
              </div>
              <p className="mt-2 text-xs text-body-muted">
                Egresados ejerciendo directamente en el campo de su título.
              </p>
            </div>

            {/* KPI 4: Salario Promedio */}
            <div className="rounded-2xl border border-line bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-secondary">Salario Promedio</span>
                <span className="grid size-8 place-items-center rounded-xl bg-amber-50 text-amber-700">
                  <i className="bx bx-wallet text-base" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tracking-tight text-ink">
                  $ 2.84M
                </span>
                <span className="text-xs font-semibold text-secondary">COP</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-body-muted">
                <span className="rounded-md bg-amber-100/60 px-1.5 py-0.5 font-medium text-amber-900">
                  ~2.0 SMLV
                </span>
                <span>Ingreso formal mensual</span>
              </div>
            </div>

            {/* KPI 5: Cobertura de Graduados */}
            <div className="rounded-2xl border border-line bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-secondary">Total Monitoreados</span>
                <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <i className="bx bx-group text-base" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold tracking-tight text-ink">
                  {placementOverview.monitoredGraduates.toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-xs text-body-muted">
                <strong className="text-emerald-700">{placementOverview.employedGraduates.toLocaleString()}</strong> vinculados · <span className="text-secondary">{placementOverview.seekingGraduates.toLocaleString()}</span> activos
              </p>
            </div>
          </div>

          {/* ─── 3. Comparativa por Facultades (Tarjetas Grandes) ─── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {facultyPlacementStats.map((fac) => (
              <div
                key={fac.id}
                className="relative overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-2xs transition-all hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid size-12 shrink-0 place-items-center rounded-2xl border ${
                        fac.accent === 'green'
                          ? 'border-green/30 bg-green/10 text-green-dark'
                          : 'border-lime/40 bg-lime/20 text-green-dark'
                      }`}
                    >
                      <i className={`bx ${fac.icon} text-2xl`} />
                    </span>
                    <div>
                      <h3 className="m-0 font-display text-lg font-bold text-ink">
                        {fac.faculty}
                      </h3>
                      <p className="m-0 text-xs text-secondary mt-0.5">
                        {fac.programsCount} programas académicos adscritos · {fac.totalGraduates.toLocaleString()} egresados censados
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      fac.accent === 'green'
                        ? 'bg-green/15 text-green-dark border border-green/30'
                        : 'bg-lime/30 text-ink border border-lime/50'
                    }`}
                  >
                    {fac.percentage}% Colocación
                  </span>
                </div>

                {/* Barra de progreso de inserción */}
                <div className="mt-5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-secondary">
                      Egresados con empleo formal: <strong className="text-ink">{fac.employed.toLocaleString()}</strong> de {fac.totalGraduates.toLocaleString()}
                    </span>
                    <span className="font-bold text-ink">{fac.percentage}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-page border border-line/60">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        fac.accent === 'green' ? 'bg-green-dark' : 'bg-lime'
                      }`}
                      style={{ width: `${fac.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Sub-indicadores de la facultad */}
                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
                  <div className="rounded-xl bg-page/60 p-2.5">
                    <span className="block text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                      Salario Promedio
                    </span>
                    <span className="mt-1 block font-display text-sm font-bold text-ink">
                      {fac.averageSalary}
                    </span>
                  </div>
                  <div className="rounded-xl bg-page/60 p-2.5">
                    <span className="block text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                      Tiempo de Inserción
                    </span>
                    <span className="mt-1 block font-display text-sm font-bold text-ink">
                      {fac.avgTimeMonths} meses
                    </span>
                  </div>
                  <div className="rounded-xl bg-page/60 p-2.5">
                    <span className="block text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                      Afinidad Curricular
                    </span>
                    <span className="mt-1 block font-display text-sm font-bold text-ink">
                      {fac.relevanceRate}%
                    </span>
                  </div>
                </div>

                {/* Programa estrella */}
                <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-page px-3.5 py-2 text-xs">
                  <span className="text-secondary">Programa líder en inserción:</span>
                  <span className="font-semibold text-green-dark flex items-center gap-1">
                    <i className="bx bxs-award text-amber-500" />
                    {fac.topProgram}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ─── 4. Ranking Interactivo de Colocación por Programa ─── */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-2xs space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-5">
              <div>
                <h2 className="m-0 font-display text-xl font-bold tracking-tight text-ink">
                  Ranking de Colocación por Programa Académico
                </h2>
                <p className="m-0 mt-1 text-xs text-body-muted">
                  Comparativa de absorción laboral, ingresos promedio y pertinencia curricular entre programas tecnológicos y profesionales.
                </p>
              </div>

              {/* Botón de ver seguimiento */}
              <Link
                to="/institucion/estudiantes/seguimiento"
                className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-green/20 bg-green/10 px-3.5 py-2 text-xs font-bold text-green-dark hover:bg-green/20 no-underline transition-colors"
              >
                <i className="bx bx-history text-sm" />
                <span>Ver Directorio Individual (HU-27)</span>
              </Link>
            </div>

            {/* Barra de filtros interactivos */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Buscador */}
              <div className="relative">
                <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-base text-secondary" />
                <input
                  type="text"
                  value={programSearch}
                  onChange={(e) => setProgramSearch(e.target.value)}
                  placeholder="Buscar programa o palabra clave..."
                  className="w-full rounded-xl border border-line bg-white py-2 pl-9 pr-3 text-xs text-ink placeholder:text-secondary/60 focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
                />
              </div>

              {/* Filtro Facultad */}
              <div>
                <select
                  value={selectedFacultyFilter}
                  onChange={(e) => setSelectedFacultyFilter(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white py-2 px-3 text-xs text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green cursor-pointer"
                >
                  <option value="all">Todas las Facultades</option>
                  <option value="ingenierias">Ciencias Naturales e Ingenierías</option>
                  <option value="socioeconomicas">Ciencias Socioeconómicas</option>
                </select>
              </div>

              {/* Filtro Nivel */}
              <div>
                <select
                  value={selectedLevelFilter}
                  onChange={(e) => setSelectedLevelFilter(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white py-2 px-3 text-xs text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green cursor-pointer"
                >
                  <option value="all">Todos los Niveles</option>
                  <option value="Profesional">Profesional Universitario</option>
                  <option value="Tecnológico">Tecnológico</option>
                </select>
              </div>

              {/* Ordenamiento */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white py-2 px-3 text-xs text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green cursor-pointer"
                >
                  <option value="rate-desc">Mayor Tasa de Colocación</option>
                  <option value="rate-asc">Menor Tasa de Colocación</option>
                  <option value="salary-desc">Mayor Salario Promedio</option>
                  <option value="time-asc">Menor Tiempo de Inserción</option>
                </select>
              </div>
            </div>

            {/* Tabla de Ranking de Programas */}
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-xs">
                <thead className="bg-page/70 text-secondary uppercase font-semibold text-[0.68rem] tracking-wider border-b border-line">
                  <tr>
                    <th className="py-3 px-4"># Posición</th>
                    <th className="py-3 px-4">Programa Académico & Nivel</th>
                    <th className="py-3 px-4 text-center">Graduados / Colocados</th>
                    <th className="py-3 px-4">Tasa de Colocación</th>
                    <th className="py-3 px-4">Salario Promedio</th>
                    <th className="py-3 px-4 text-center">Tiempo Prom.</th>
                    <th className="py-3 px-4 text-center">Pertinencia</th>
                    <th className="py-3 px-4 text-center">Demanda Laboral</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredPrograms.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-secondary">
                        <i className="bx bx-search-alt text-2xl text-secondary/50 block mb-1" />
                        No se encontraron programas con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredPrograms.map((prog, index) => (
                      <tr key={prog.id} className="hover:bg-page/40 transition-colors">
                        {/* Posición */}
                        <td className="py-3.5 px-4 font-bold text-secondary">
                          <span className={`grid size-6 place-items-center rounded-lg text-[0.7rem] ${
                            index === 0
                              ? 'bg-amber-400 text-ink font-bold shadow-2xs'
                              : index === 1
                              ? 'bg-slate-300 text-ink font-bold shadow-2xs'
                              : index === 2
                              ? 'bg-amber-700/20 text-amber-900 font-bold'
                              : 'bg-page text-secondary'
                          }`}>
                            {index + 1}
                          </span>
                        </td>

                        {/* Nombre del Programa */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-ink">{prog.name}</div>
                          <div className="flex items-center gap-2 mt-0.5 text-[0.7rem] text-secondary">
                            <span className="font-medium text-green-dark">{prog.faculty}</span>
                            <span>•</span>
                            <span className={`px-1.5 py-0.2 rounded ${
                              prog.level === 'Profesional' ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-purple-50 text-purple-700 font-medium'
                            }`}>
                              {prog.level}
                            </span>
                          </div>
                        </td>

                        {/* Graduados / Colocados */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-ink">{prog.employed}</span>
                          <span className="text-secondary text-[0.7rem]"> / {prog.graduates}</span>
                        </td>

                        {/* Tasa de Colocación */}
                        <td className="py-3.5 px-4 min-w-[150px]">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-ink">{prog.rate}%</span>
                            <span className="text-[0.68rem] text-emerald-700 font-semibold">{prog.trend}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-page border border-line/60">
                            <div
                              className="h-full rounded-full bg-green-dark"
                              style={{ width: `${prog.rate}%` }}
                            />
                          </div>
                        </td>

                        {/* Salario Promedio */}
                        <td className="py-3.5 px-4 font-semibold text-ink whitespace-nowrap">
                          {prog.avgSalary}
                        </td>

                        {/* Tiempo */}
                        <td className="py-3.5 px-4 text-center font-medium text-ink">
                          {prog.avgTimeMonths} m
                        </td>

                        {/* Pertinencia */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.7rem] font-bold text-emerald-800">
                            {prog.relevance}%
                          </span>
                        </td>

                        {/* Estado de Demanda */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold ${
                              prog.demandStatus === 'Alta Demanda'
                                ? 'bg-green/15 text-green-dark border border-green/30'
                                : prog.demandStatus === 'Media-Alta Demanda'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {prog.demandStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── 5. Analíticas Especializadas de Inserción (Cuadrante Grid con Gráficas Interactivas) ─── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            
            {/* 5.1 Tiempos de Inserción al Primer Empleo */}
            <div className="rounded-2xl border border-line bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-700">
                    <i className="bx bx-stopwatch text-base" />
                  </span>
                  <div>
                    <h3 className="m-0 font-display text-base font-bold text-ink">
                      Tiempos de Inserción al Primer Empleo
                    </h3>
                    <p className="m-0 text-xs text-secondary">
                      Meses transcurridos entre la fecha de graduación y el primer contrato formal
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-blue-700">
                  Promedio: 3.2 meses
                </span>
              </div>

              <TimeToPlacementChart timeData={timeToPlacementData} />
            </div>

            {/* 5.2 Distribución por Rangos Salariales */}
            <div className="rounded-2xl border border-line bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-amber-50 text-amber-700">
                    <i className="bx bx-dollar-circle text-base" />
                  </span>
                  <div>
                    <h3 className="m-0 font-display text-base font-bold text-ink">
                      Distribución por Rangos Salariales (SMLV)
                    </h3>
                    <p className="m-0 text-xs text-secondary">
                      Ingresos de enganche según vigencia legal Colombia 2026
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-amber-800">
                  Media: $2.84M COP
                </span>
              </div>

              <SalaryDistributionBarChart salaryData={salaryDistributionData} />
            </div>

            {/* 5.3 Modalidad de Trabajo & Tipo de Contrato (Donut Interactivo) */}
            <div className="rounded-2xl border border-line bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-purple-50 text-purple-700">
                    <i className="bx bx-pie-chart-alt-2 text-base" />
                  </span>
                  <div>
                    <h3 className="m-0 font-display text-base font-bold text-ink">
                      Contratación y Esquema Laboral
                    </h3>
                    <p className="m-0 text-xs text-secondary">
                      Formalización contractual y presencialidad de los graduados vinculados
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-700">
                  95% Formalidad
                </span>
              </div>

              <PlacementDonutChart
                contractTypes={contractTypesData}
                workModalities={workModalityData}
              />
            </div>

            {/* 5.4 Pertinencia Curricular y Observatorio */}
            <div className="rounded-2xl border border-line bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-green/10 text-green-dark">
                    <i className="bx bx-check-shield text-base" />
                  </span>
                  <div>
                    <h3 className="m-0 font-display text-base font-bold text-ink">
                      Pertinencia con el Perfil de Egreso
                    </h3>
                    <p className="m-0 text-xs text-secondary">
                      Evaluación de correspondencia entre el currículo y las tareas laborales
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-green-dark">
                  85.6% Afín
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {relevanceIndexData.map((rel) => (
                  <div key={rel.level} className="rounded-xl border border-line bg-page/40 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-ink">{rel.level}</span>
                      <span className="font-bold text-green-dark">{rel.percentage}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white border border-line/60">
                      <div
                        className="h-full rounded-full bg-green-dark"
                        style={{ width: `${rel.percentage}%` }}
                      />
                    </div>
                    <p className="text-[0.68rem] text-body-muted m-0">{rel.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between rounded-xl bg-lime/20 border border-lime/40 p-3">
                <div className="flex items-center gap-2">
                  <i className="bx bx-radar text-lg text-green-dark" />
                  <span className="text-xs text-ink font-medium">
                    ¿Quieres ver competencias más demandadas en Santander?
                  </span>
                </div>
                <Link
                  to="/institucion/mercado-laboral/competencias"
                  className="rounded-lg bg-green-dark px-2.5 py-1 text-xs font-bold text-white hover:bg-green-dark/90 no-underline shrink-0"
                >
                  Observatorio
                </Link>
              </div>
            </div>

          </div>

          {/* ─── 6. Top Empresas Empleadoras UTS (Convenios Activos) ─── */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-2xs space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
              <div>
                <h2 className="m-0 font-display text-xl font-bold tracking-tight text-ink">
                  Principales Empresas Empleadoras de la Alianza UTS
                </h2>
                <p className="m-0 mt-1 text-xs text-body-muted">
                  Organizaciones con mayor índice de contratación de egresados y convenios marco de cooperación vigentes.
                </p>
              </div>
              <span className="self-start sm:self-auto text-xs font-medium text-secondary">
                92.4% vinculaciones con empresas aliadas
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topEmployingCompanies.map((company) => (
                <div
                  key={company.id}
                  className="rounded-2xl border border-line bg-page/30 p-4 transition-all hover:bg-white hover:shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`grid size-10 shrink-0 place-items-center rounded-xl font-display text-xs font-bold shadow-2xs ${company.logoBg}`}>
                        {company.initials}
                      </span>
                      <div>
                        <h4 className="m-0 text-sm font-bold text-ink">{company.name}</h4>
                        <span className="text-[0.7rem] text-secondary">{company.sector}</span>
                      </div>
                    </div>
                    {company.hasActiveAgreement && (
                      <span className="rounded-md bg-green/15 text-green-dark border border-green/30 px-2 py-0.5 text-[0.65rem] font-bold whitespace-nowrap">
                        Convenio Activo
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line/60 pt-3 text-center">
                    <div>
                      <span className="block text-[0.65rem] font-medium text-secondary">Contratados</span>
                      <span className="font-display text-sm font-bold text-ink">{company.totalHired}</span>
                    </div>
                    <div>
                      <span className="block text-[0.65rem] font-medium text-secondary">Rango Salarial</span>
                      <span className="font-display text-xs font-bold text-green-dark">{company.avgSalaryBracket}</span>
                    </div>
                    <div>
                      <span className="block text-[0.65rem] font-medium text-secondary">Satisfacción</span>
                      <span className="font-display text-xs font-bold text-amber-700">{company.satisfactionScore}</span>
                    </div>
                  </div>

                  <div className="mt-3 text-[0.7rem] text-body-muted bg-white/70 rounded-lg p-2 border border-line/50">
                    <strong>Facultad predominante:</strong> {company.primaryFaculty}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── 7. Comparativa Histórica por Cohortes (2024 a 2026) con Gráfica de Tendencia ─── */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-2xs space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
              <div>
                <h2 className="m-0 font-display text-xl font-bold tracking-tight text-ink">
                  Evolución Histórica de la Tasa de Colocación UTS
                </h2>
                <p className="m-0 mt-1 text-xs text-body-muted">
                  Seguimiento longitudinal del indicador de empleabilidad y salarios promedio en los últimos 4 periodos académicos.
                </p>
              </div>
              <span className="self-start sm:self-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <i className="bx bx-trending-up" />
                +6.0% de incremento acumulado
              </span>
            </div>

            {/* Gráfico de Área Interactivo con Curvas SVG */}
            <PlacementTrendAreaChart data={historicalCohortsComparison} />

            {/* Tarjetas resumen por periodo debajo del gráfico */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2">
              {historicalCohortsComparison.map((item) => (
                <div
                  key={item.period}
                  className="rounded-xl border border-line bg-page/40 p-4 space-y-2 hover:bg-page transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-ink">{item.period}</span>
                    <span className="text-xs font-bold text-green-dark bg-green/10 px-2 py-0.5 rounded border border-green/20">
                      {item.rate}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white border border-line/60">
                    <div
                      className="h-full rounded-full bg-green-dark"
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[0.72rem] text-secondary pt-1">
                    <span>{item.employed} de {item.graduates} graduados</span>
                    <strong className="text-ink">
                      ${(item.avgSalary / 1000000).toFixed(2)}M COP
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── 8. Banner Institucional de Respaldo CNA / MEN ─── */}
          <div className="rounded-2xl border border-line bg-gradient-to-r from-page via-white to-green/5 p-6 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <i className="bx bxs-badge-check text-xl text-green-dark" />
                <h4 className="m-0 font-display text-base font-bold text-ink">
                  Acreditación Institucional de Alta Calidad UTS
                </h4>
              </div>
              <p className="m-0 text-xs text-body-muted leading-relaxed">
                Los datos expuestos en este módulo son auditados por la Dirección de Extensión y Graduados conforme a los lineamientos del Sistema de Aseguramiento de la Calidad de la Educación Superior (SACES) y el Consejo Nacional de Acreditación (CNA).
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/institucion/estudiantes/seguimiento"
                className="rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-ink shadow-2xs hover:bg-page transition-colors no-underline"
              >
                Ir a Seguimiento 360°
              </Link>
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-xl bg-green-dark px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-green-dark/90 transition-colors cursor-pointer"
              >
                Descargar Certificado
              </button>
            </div>
          </div>

        </div>
      </main>
    </InstitutionPortalLayout>
  );
}
