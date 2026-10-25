import { useMemo, useState } from 'react';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import CompanyTrackingDrawer from '../components/institution/CompanyTrackingDrawer.jsx';
import CompanyInteractionModal from '../components/institution/CompanyInteractionModal.jsx';
import { trackedCompaniesData } from '../data/institutionCompanyTrackingData.js';

const STATUS_TABS = [
  { id: 'all', label: 'Todas las Empresas' },
  { id: 'vigente', label: 'Convenios Vigentes' },
  { id: 'por_renovar', label: 'Por Renovar (<90 días)' },
  { id: 'hired_high', label: 'Mayor Contratación (+70)' },
];

export default function InstitutionCompanyTrackingPage() {
  const [companies, setCompanies] = useState(trackedCompaniesData);
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [sortBy, setSortBy] = useState('hired'); // 'hired' | 'rating' | 'expiry' | 'name'
  const [selectedDrawerCompanyId, setSelectedDrawerCompanyId] = useState(null);
  const [selectedModalCompany, setSelectedModalCompany] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  function notify(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  // Sectores únicos
  const sectors = useMemo(() => {
    const set = new Set(companies.map((c) => c.sector.split(',')[0].split('&')[0].trim()));
    return Array.from(set).sort();
  }, [companies]);

  // Métricas globales agregadas
  const metrics = useMemo(() => {
    const totalCompanies = companies.length;
    const totalHired = companies.reduce((acc, c) => acc + (c.totalGraduatesHired || 0), 0);
    const avgScore = (
      companies.reduce((acc, c) => acc + (c.satisfactionScore || 0), 0) / (totalCompanies || 1)
    ).toFixed(1);
    const expiringSoon = companies.filter((c) => c.agreementStatus === 'por_renovar' || c.daysToExpiry < 90).length;
    const totalActiveVacancies = companies.reduce((acc, c) => acc + (c.activeVacanciesCount || 0), 0);

    return { totalCompanies, totalHired, avgScore, expiringSoon, totalActiveVacancies };
  }, [companies]);

  // Filtrado y ordenamiento reactivo
  const filteredCompanies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = companies.filter((c) => {
      // Filtro de Pestaña de Estado
      if (activeStatusTab === 'vigente' && c.agreementStatus !== 'vigente') return false;
      if (activeStatusTab === 'por_renovar' && c.agreementStatus !== 'por_renovar' && c.daysToExpiry >= 90) return false;
      if (activeStatusTab === 'hired_high' && c.totalGraduatesHired < 70) return false;

      // Filtro por Sector
      if (selectedSector !== 'all' && !c.sector.toLowerCase().includes(selectedSector.toLowerCase())) {
        return false;
      }

      // Buscador
      if (q) {
        const matchName = c.companyName.toLowerCase().includes(q) || c.commercialName.toLowerCase().includes(q);
        const matchNit = c.nit.includes(q);
        const matchSector = c.sector.toLowerCase().includes(q);
        const matchCity = c.city.toLowerCase().includes(q);
        const matchProgram = c.topProgramsHired.some((p) => p.program.toLowerCase().includes(q));
        const matchContact = c.contactPerson.name.toLowerCase().includes(q);

        return matchName || matchNit || matchSector || matchCity || matchProgram || matchContact;
      }

      return true;
    });

    // Ordenamiento
    if (sortBy === 'hired') {
      list.sort((a, b) => b.totalGraduatesHired - a.totalGraduatesHired);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.satisfactionScore - a.satisfactionScore);
    } else if (sortBy === 'expiry') {
      list.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.commercialName.localeCompare(b.commercialName, 'es'));
    }

    return list;
  }, [companies, activeStatusTab, selectedSector, searchQuery, sortBy]);

  const activeDrawerCompany = companies.find((c) => c.id === selectedDrawerCompanyId) || null;

  function handleSaveInteraction(newLog) {
    if (!selectedModalCompany) return;

    setCompanies((prev) =>
      prev.map((c) => {
        if (c.id === selectedModalCompany.id) {
          return {
            ...c,
            interactionLogs: [newLog, ...(c.interactionLogs || [])],
          };
        }
        return c;
      })
    );

    notify(`Se ha guardado la gestión de seguimiento para ${selectedModalCompany.commercialName}.`);
    setSelectedModalCompany(null);
  }

  function handleExportReport() {
    notify('Generando informe ejecutivo de convenios y seguimiento empresarial UTS...');
    setTimeout(() => {
      notify('¡Informe consolidado generado exitosamente en formato Excel / PDF!');
    }, 1500);
  }

  return (
    <InstitutionPortalLayout activePage="empresas-seguimiento">
      <main className="w-full pb-20">
        {/* ─── Hero Header Institucional (Sin oval pills) ─── */}
        <section className="border-b border-line-soft bg-white px-5 py-8 sm:px-8 lg:px-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-3xl">
              <h1 className="m-0 font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink leading-tight">
                Seguimiento a Empresas Empleadoras & Convenios UTS
              </h1>
              <p className="m-0 mt-2 text-sm sm:text-base text-secondary leading-relaxed">
                Monitorea la inserción laboral de egresados, la satisfacción de empleadores aliados, la vigencia legal de convenios marco y la trazabilidad institucional.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleExportReport}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-page hover:bg-white hover:text-green-dark px-4 py-2.5 text-xs font-bold text-ink shadow-2xs transition-colors cursor-pointer"
              >
                <i className="bx bx-download text-base" />
                <span>Exportar Informe</span>
              </button>
            </div>
          </div>

          {/* ─── KPI Metric Cards Strip ─── */}
          <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-8">
            <div className="rounded-2xl border border-line bg-page/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">Empresas Aliadas</span>
                <span className="grid size-8 place-items-center rounded-lg bg-green/10 text-green-dark text-base">
                  <i className="bx bx-buildings" />
                </span>
              </div>
              <span className="font-display text-2xl font-bold text-ink mt-2 block">
                {metrics.totalCompanies}
              </span>
              <span className="text-xs text-secondary mt-0.5 block">100% con convenio activo</span>
            </div>

            <div className="rounded-2xl border border-line bg-page/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">Egresados Vinculados</span>
                <span className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-emerald-800 text-base">
                  <i className="bx bx-user-check" />
                </span>
              </div>
              <span className="font-display text-2xl font-bold text-emerald-800 mt-2 block">
                {metrics.totalHired}
              </span>
              <span className="text-xs text-secondary mt-0.5 block">Contratados en empresas aliadas</span>
            </div>

            <div className="rounded-2xl border border-line bg-page/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">Satisfacción Empleadora</span>
                <span className="grid size-8 place-items-center rounded-lg bg-amber-100 text-amber-800 text-base">
                  <i className="bx bxs-star" />
                </span>
              </div>
              <span className="font-display text-2xl font-bold text-amber-700 mt-2 block flex items-baseline gap-1">
                {metrics.avgScore} <span className="text-xs font-normal text-secondary">/ 5.0</span>
              </span>
              <span className="text-xs text-secondary mt-0.5 block">Encuesta de pertinencia UTS</span>
            </div>

            <div className="rounded-2xl border border-line bg-page/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">Convenios por Renovar</span>
                <span className="grid size-8 place-items-center rounded-lg bg-rose-100 text-rose-800 text-base">
                  <i className="bx bx-alarm-exclamation" />
                </span>
              </div>
              <span className="font-display text-2xl font-bold text-rose-700 mt-2 block">
                {metrics.expiringSoon}
              </span>
              <span className="text-xs text-secondary mt-0.5 block">Vencimiento en menos de 90 días</span>
            </div>
          </div>
        </section>

        {/* ─── Control Bar: Tabs, Search & Filters ─── */}
        <section className="border-b border-line-soft bg-white px-5 py-4 sm:px-8 lg:px-10">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Top row: Status Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-line bg-page p-1">
                {STATUS_TABS.map((tab) => {
                  const active = activeStatusTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveStatusTab(tab.id)}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-white text-ink shadow-xs'
                          : 'text-secondary hover:text-ink'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <span className="text-xs text-secondary">
                Mostrando <strong className="text-ink font-bold">{filteredCompanies.length}</strong> empresas aliadas
              </span>
            </div>

            {/* Bottom row: Search input + Sector dropdown + Sort dropdown */}
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              {/* Search input */}
              <div className="relative min-w-0">
                <i className="bx bx-search absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-secondary" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por empresa, NIT, sector, programa contratado o contacto..."
                  className="w-full rounded-xl border border-line bg-page py-2.5 pl-10 pr-4 text-xs text-ink placeholder:text-secondary focus:border-green focus:bg-white focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-ink p-1 cursor-pointer"
                  >
                    <i className="bx bx-x text-base" />
                  </button>
                )}
              </div>

              {/* Sector dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-secondary hidden md:inline">Sector:</span>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="rounded-xl border border-line bg-page px-3 py-2.5 text-xs font-semibold text-ink focus:border-green focus:outline-none cursor-pointer"
                >
                  <option value="all">Todos los sectores</option>
                  {sectors.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-secondary hidden md:inline">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-line bg-page px-3 py-2.5 text-xs font-semibold text-ink focus:border-green focus:outline-none cursor-pointer"
                >
                  <option value="hired">Mayor contratación de egresados</option>
                  <option value="rating">Mejor calificación de satisfacción</option>
                  <option value="expiry">Vencimiento más próximo</option>
                  <option value="name">Alfabético (A - Z)</option>
                </select>
              </div>
            </div>

            {(searchQuery || selectedSector !== 'all' || activeStatusTab !== 'all') && (
              <div className="flex items-center gap-2 pt-1 text-xs text-secondary">
                <span>Filtros activos:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSector('all');
                    setActiveStatusTab('all');
                  }}
                  className="text-green-dark hover:underline font-semibold cursor-pointer"
                >
                  Restablecer todos los filtros
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ─── Grid de Tarjetas de Empresas Aliadas ─── */}
        <section className="px-5 py-8 sm:px-8 lg:px-10">
          <div className="max-w-7xl mx-auto">
            {filteredCompanies.length === 0 ? (
              <div className="rounded-3xl border border-line bg-white p-12 text-center shadow-xs">
                <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-page text-secondary text-2xl mb-4">
                  <i className="bx bx-buildings" />
                </div>
                <h3 className="m-0 font-display text-base font-bold text-ink">
                  No se encontraron empresas con los criterios seleccionados
                </h3>
                <p className="m-0 mt-2 text-xs text-secondary max-w-md mx-auto">
                  Prueba cambiando el término de búsqueda o restableciendo los filtros de sector y estado de convenio.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSector('all');
                    setActiveStatusTab('all');
                  }}
                  className="mt-5 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-ink-soft cursor-pointer"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {filteredCompanies.map((comp) => {
                  const lastLog = comp.interactionLogs?.[0] || null;

                  return (
                    <article
                      key={comp.id}
                      className="group flex flex-col justify-between rounded-3xl border border-line bg-white p-6 shadow-xs hover:border-line-soft hover:shadow-hero transition-all"
                    >
                      <div>
                        {/* Header: Logo, Name, Agreement Status & Rating */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5 min-w-0">
                            <span className={`grid size-12 shrink-0 place-items-center rounded-2xl font-display text-sm font-bold shadow-2xs ${comp.logoBg}`}>
                              {comp.logoInitials}
                            </span>
                            <div className="min-w-0">
                              <h3 className="m-0 font-display text-base font-bold text-ink group-hover:text-green-dark transition-colors truncate">
                                {comp.commercialName || comp.companyName}
                              </h3>
                              <p className="m-0 text-xs text-secondary truncate">
                                NIT {comp.nit} · {comp.city.split('·')[0]}
                              </p>
                              <span className="text-[0.72rem] text-body-muted block mt-0.5 truncate">
                                {comp.sector}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {comp.agreementStatus === 'vigente' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[0.65rem] font-bold text-emerald-800">
                                <i className="bx bxs-check-shield text-xs text-green" />
                                Vigente
                              </span>
                            )}
                            {comp.agreementStatus === 'por_renovar' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-[0.65rem] font-bold text-amber-900">
                                <i className="bx bx-alarm-exclamation text-xs text-amber-700" />
                                Vence en {comp.daysToExpiry} d
                              </span>
                            )}
                            {comp.agreementStatus === 'en_seguimiento' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-[0.65rem] font-bold text-purple-800">
                                <i className="bx bx-sync text-xs text-purple-600" />
                                En Trámite
                              </span>
                            )}

                            <span className="inline-flex items-center gap-1 text-[0.72rem] font-bold text-amber-700 mt-1">
                              <i className="bx bxs-star text-amber-500 text-xs" />
                              {comp.satisfactionScore} / 5.0
                            </span>
                          </div>
                        </div>

                        {/* Metric Strip */}
                        <div className="grid grid-cols-3 gap-2 mt-5 p-3 rounded-2xl bg-page/70 border border-line-soft text-center">
                          <div>
                            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block">
                              Egresados
                            </span>
                            <span className="font-display text-base font-bold text-ink mt-0.5 block">
                              {comp.totalGraduatesHired}
                            </span>
                            <span className="text-[0.62rem] text-secondary">Contratados</span>
                          </div>
                          <div>
                            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block">
                              Vacantes
                            </span>
                            <span className="font-display text-base font-bold text-green-dark mt-0.5 block">
                              {comp.activeVacanciesCount}
                            </span>
                            <span className="text-[0.62rem] text-secondary">Convocatorias</span>
                          </div>
                          <div>
                            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block">
                              Sueldo Prom.
                            </span>
                            <span className="font-display text-xs font-bold text-emerald-800 mt-1 block">
                              {comp.avgSalary.split(' ')[1]}M COP
                            </span>
                            <span className="text-[0.62rem] text-secondary">{comp.avgSalaryBracket}</span>
                          </div>
                        </div>

                        {/* Programas UTS más contratados */}
                        <div className="mt-4">
                          <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary block mb-2">
                            Talento UTS más demandado:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {comp.topProgramsHired.slice(0, 3).map((item) => (
                              <span
                                key={item.program}
                                className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-[0.68rem] font-semibold text-ink"
                              >
                                <span>{item.program}</span>
                                <strong className="text-green-dark">({item.count})</strong>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Última interacción registrada */}
                        {lastLog && (
                          <div className="mt-4 pt-3 border-t border-line-soft text-xs text-body-muted">
                            <span className="text-secondary block text-[0.68rem]">
                              Último contacto institucional ({lastLog.date}):
                            </span>
                            <p className="m-0 font-medium text-ink truncate mt-0.5">
                              {lastLog.title}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-5 pt-4 border-t border-line-soft flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDrawerCompanyId(comp.id)}
                          className="flex-1 rounded-xl bg-ink hover:bg-ink-soft py-2.5 px-4 text-xs font-bold text-white transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                        >
                          <i className="bx bx-show text-sm text-lime" />
                          <span>Ver Ficha 360°</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedModalCompany(comp)}
                          className="rounded-xl border border-line bg-page hover:bg-white hover:text-green-dark py-2.5 px-3.5 text-xs font-bold text-ink transition-colors cursor-pointer"
                          title="Registrar nueva interacción o seguimiento"
                        >
                          <i className="bx bx-edit text-base" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ─── Drawer Lateral 360° de la Empresa ─── */}
        <CompanyTrackingDrawer
          company={activeDrawerCompany}
          isOpen={Boolean(activeDrawerCompany)}
          onClose={() => setSelectedDrawerCompanyId(null)}
          onOpenInteractionModal={(comp) => setSelectedModalCompany(comp)}
        />

        {/* ─── Modal para Registrar Interacción ─── */}
        <CompanyInteractionModal
          company={selectedModalCompany}
          isOpen={Boolean(selectedModalCompany)}
          onClose={() => setSelectedModalCompany(null)}
          onSave={handleSaveInteraction}
        />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-hero animate-rise-in">
              <i className="bx bxs-check-circle text-lime text-lg" />
              {toastMessage}
            </div>
          </div>
        )}
      </main>
    </InstitutionPortalLayout>
  );
}
