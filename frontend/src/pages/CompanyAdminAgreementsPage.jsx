import { useEffect, useMemo, useState } from 'react';
import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';
import CompanyPageHero from '../components/company/CompanyPageHero.jsx';
import AgreementDetailDrawer from '../components/company/AgreementDetailDrawer.jsx';
import AgreementRequestModal from '../components/company/AgreementRequestModal.jsx';
import { companyPhotos } from '../data/companyImages.js';
import { AGREEMENT_STATUS, REGIONAL_INSTITUTIONS } from '../data/companyAgreementsData.js';
import { useCompanyAgreements } from '../hooks/useCompanyAgreements.js';
import { daysUntil, formatApplicationDate } from '../utils/formatters.js';

const TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'vigente', label: 'Vigentes' },
  { id: 'por_renovar', label: 'Por renovar' },
  { id: 'en_revision', label: 'En revisión' },
];

export default function CompanyAdminAgreementsPage() {
  const {
    agreements,
    requestAgreement,
    requestRenewal,
    uploadDocument,
    cancelRequest,
  } = useCompanyAgreements();

  const [activeTab, setActiveTab] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('todas');
  const [selectedAgreementId, setSelectedAgreementId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [renewalAgreement, setRenewalAgreement] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Cálculo de métricas para el Hero
  const stats = useMemo(() => {
    const vigentes = agreements.filter((a) => a.status === 'vigente').length;
    const porRenovar = agreements.filter((a) => a.status === 'por_renovar').length;
    const enRevision = agreements.filter((a) => a.status === 'en_revision').length;
    const egresados = agreements.reduce((acc, a) => acc + (a.metrics?.hiredGraduates || 0), 0);

    return [
      { label: 'Convenios vigentes', value: vigentes },
      { label: 'Por renovar (<60 d)', value: porRenovar },
      { label: 'En revisión IES', value: enRevision },
      { label: 'Egresados vinculados', value: egresados },
    ];
  }, [agreements]);

  // Contadores por pestaña
  const tabCounts = useMemo(() => {
    return {
      todos: agreements.length,
      vigente: agreements.filter((a) => a.status === 'vigente').length,
      por_renovar: agreements.filter((a) => a.status === 'por_renovar').length,
      en_revision: agreements.filter((a) => a.status === 'en_revision').length,
    };
  }, [agreements]);

  // Filtrado de convenios
  const filteredAgreements = useMemo(() => {
    return agreements.filter((agr) => {
      if (activeTab !== 'todos' && agr.status !== activeTab) return false;
      if (institutionFilter !== 'todas' && agr.institutionId !== institutionFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = agr.title.toLowerCase().includes(query);
        const matchInst = agr.institutionName.toLowerCase().includes(query) || agr.institutionShort.toLowerCase().includes(query);
        const matchCode = agr.agreementCode.toLowerCase().includes(query);
        const matchPrograms = (agr.targetPrograms || []).some((p) => p.toLowerCase().includes(query));
        if (!matchTitle && !matchInst && !matchCode && !matchPrograms) return false;
      }

      return true;
    });
  }, [agreements, activeTab, institutionFilter, searchQuery]);

  const selectedAgreement = useMemo(() => {
    return agreements.find((a) => a.id === selectedAgreementId) || null;
  }, [agreements, selectedAgreementId]);

  const handleOpenNewModal = () => {
    setRenewalAgreement(null);
    setIsModalOpen(true);
  };

  const handleOpenRenewalModal = (agr) => {
    setRenewalAgreement(agr);
    setIsModalOpen(true);
  };

  const handleModalSubmit = (payload) => {
    if (payload.renewalAgreementId) {
      requestRenewal(payload.renewalAgreementId, {
        durationYears: payload.durationYears,
        notes: payload.notes,
        additionalDocs: payload.additionalDocs,
      });
      setToast('Solicitud formal de renovación radicada exitosamente ante la IES.');
    } else {
      const created = requestAgreement(payload);
      setToast(`Solicitud de convenio (${created.agreementCode}) radicada ante la IES.`);
    }
  };

  const handleUploadDocument = (agreementId, docData) => {
    uploadDocument(agreementId, docData);
    setToast('Documento anexo adjuntado al expediente del convenio.');
  };

  const handleCancelRequest = (agreementId) => {
    cancelRequest(agreementId);
    setToast('Solicitud de convenio cancelada.');
    if (selectedAgreementId === agreementId) {
      setSelectedAgreementId(null);
    }
  };

  return (
    <CompanyPortalLayout activePage="admin-convenios">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        {/* Banner Hero */}
        <CompanyPageHero
          photo={companyPhotos.convenios}
          title="Convenios con Instituciones (IES)"
          subtitle="Gestiona las alianzas académicas, vigencias de prácticas y vinculación preferente con las universidades de la región."
          stats={stats}
          actions={
            <button
              type="button"
              onClick={handleOpenNewModal}
              className="flex items-center gap-2 rounded-xl bg-terracotta px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-terracotta-dark"
            >
              <i className="bx bx-plus text-base" />
              <span>Solicitar nuevo convenio</span>
            </button>
          }
        />

        {/* Pestañas de estado */}
        <nav
          aria-label="Pestañas de convenios"
          className="flex flex-wrap items-center gap-2 border-b border-sand-line pb-2"
        >
          {TABS.map((tab) => {
            const count = tabCounts[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-cocoa text-white shadow-xs'
                    : 'text-secondary hover:bg-sand/40 hover:text-ink'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-sand text-cocoa'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Barra de Búsqueda y Filtros */}
        <div className="flex flex-col gap-3 rounded-xl border border-sand-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-base text-secondary" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por universidad, tipo de convenio, código o programa..."
              className="w-full rounded-lg border border-sand-line bg-cream/30 py-2 pl-9 pr-3 text-xs text-ink placeholder:text-secondary/70 focus:border-terracotta focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2">
              <label htmlFor="inst-filter" className="text-[0.7rem] font-bold uppercase tracking-wider text-secondary whitespace-nowrap">
                Institución:
              </label>
              <select
                id="inst-filter"
                value={institutionFilter}
                onChange={(e) => setInstitutionFilter(e.target.value)}
                className="rounded-lg border border-sand-line bg-white px-3 py-1.5 text-xs text-ink focus:border-terracotta focus:outline-hidden"
              >
                <option value="todas">Todas las instituciones</option>
                {REGIONAL_INSTITUTIONS.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.shortName} · {inst.cityKey || inst.city}
                  </option>
                ))}
              </select>
            </div>

            {(searchQuery || institutionFilter !== 'todas' || activeTab !== 'todos') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setInstitutionFilter('todas');
                  setActiveTab('todos');
                }}
                className="text-xs font-semibold text-terracotta hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Lista rectangular de convenios */}
        <div className="flex flex-col gap-3.5">
          {filteredAgreements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-sand-line bg-white p-12 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-sand-line bg-cream text-2xl text-secondary">
                <i className="bx bx-folder-open" />
              </span>
              <h3 className="m-0 mt-3 font-display text-base font-bold text-ink">No se encontraron convenios</h3>
              <p className="m-0 mt-1 text-xs text-secondary">
                No hay convenios que coincidan con los filtros o el término de búsqueda ingresado.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setInstitutionFilter('todas');
                  setActiveTab('todos');
                }}
                className="mt-4 rounded-xl border border-sand-line bg-cream px-4 py-2 text-xs font-semibold text-cocoa hover:bg-sand"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            filteredAgreements.map((agr) => {
              const statusCfg = AGREEMENT_STATUS[agr.status] || AGREEMENT_STATUS.vigente;
              const daysLeft = agr.expiresAt ? daysUntil(agr.expiresAt) : null;

              return (
                <article
                  key={agr.id}
                  className="group relative flex flex-col justify-between gap-4 rounded-xl border border-sand-line bg-white p-4 transition-all hover:border-terracotta/40 hover:shadow-xs sm:flex-row sm:items-center sm:p-5"
                >
                  {/* Lado izquierdo: Logo + Datos principales */}
                  <div className="flex items-start gap-4">
                    {agr.institutionLogo ? (
                      <img
                        src={agr.institutionLogo}
                        alt={agr.institutionName}
                        className="size-14 shrink-0 rounded-xl border border-sand-line bg-white object-contain p-1.5 shadow-2xs"
                      />
                    ) : (
                      <span className="grid size-14 shrink-0 place-items-center rounded-xl border border-terracotta/20 bg-sand font-display text-sm font-bold text-terracotta shadow-2xs">
                        {agr.institutionShort}
                      </span>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
                        <span className="font-display font-semibold uppercase tracking-wider text-ink">
                          {agr.institutionName}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[0.7rem]">{agr.agreementCode}</span>
                        <span>•</span>
                        <span className="text-[0.72rem] text-terracotta font-medium">{agr.typeLabel}</span>
                      </div>

                      <h2 className="m-0 mt-1 font-display text-base font-bold text-ink">
                        {agr.title}
                      </h2>

                      {/* Información de Vigencia y Cobertura */}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-secondary">
                        {agr.expiresAt ? (
                          <div className="flex items-center gap-1.5">
                            <i className="bx bx-calendar text-sm text-terracotta" />
                            <span>
                              Vence:{' '}
                              <strong className="text-ink font-semibold">
                                {formatApplicationDate(agr.expiresAt)}
                              </strong>
                            </span>
                            {daysLeft !== null && (
                              <span
                                className={`ml-1 rounded px-1.5 py-0.2 text-[0.68rem] font-semibold ${
                                  daysLeft <= 60
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-sand/60 text-cocoa'
                                }`}
                              >
                                {daysLeft > 0 ? `${daysLeft} días restantes` : 'Expirado'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <i className="bx bx-time text-sm text-terracotta" />
                            <span>
                              Radicado el:{' '}
                              <strong className="text-ink font-semibold">
                                {formatApplicationDate(agr.requestedAt)}
                              </strong>
                            </span>
                          </div>
                        )}

                        <span>•</span>

                        {/* Programas destacados */}
                        <div className="flex items-center gap-1.5">
                          <i className="bx bx-graduation text-sm text-secondary" />
                          <span>
                            {agr.targetPrograms?.length || 0} programa{agr.targetPrograms?.length === 1 ? '' : 's'}{' '}
                            vinculado{agr.targetPrograms?.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        {agr.metrics?.hiredGraduates > 0 && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                              <i className="bx bx-user-check text-sm text-emerald-700" />
                              <span>{agr.metrics.hiredGraduates} egresados vinculados</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lado derecho: Estado y Acciones */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sand-line/60 pt-3 sm:border-t-0 sm:pt-0 sm:justify-end">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block size-2 rounded-full ${statusCfg.dotColor}`} />
                      <span className="font-display text-xs font-semibold text-ink">{statusCfg.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedAgreementId(agr.id)}
                        className="rounded-lg border border-sand-line bg-white px-3.5 py-1.5 text-xs font-semibold text-cocoa shadow-2xs transition-colors hover:bg-sand hover:text-ink"
                      >
                        Ver detalle
                      </button>

                      {agr.status === 'por_renovar' && (
                        <button
                          type="button"
                          onClick={() => handleOpenRenewalModal(agr)}
                          className="flex items-center gap-1 rounded-lg bg-terracotta px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-terracotta-dark"
                        >
                          <i className="bx bx-revision text-sm" />
                          <span>Renovar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Drawer lateral de detalle */}
        <AgreementDetailDrawer
          agreement={selectedAgreement}
          onClose={() => setSelectedAgreementId(null)}
          onRequestRenewal={handleOpenRenewalModal}
          onUploadDocument={handleUploadDocument}
          onCancelRequest={handleCancelRequest}
        />

        {/* Modal de nueva solicitud o renovación */}
        <AgreementRequestModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleModalSubmit}
          renewalAgreement={renewalAgreement}
        />

        {/* Toast de confirmación accesible */}
        {toast && (
          <div
            role="status"
            className="fixed bottom-6 right-6 z-70 max-w-sm rounded-xl bg-cocoa px-4 py-3 text-xs font-medium text-white shadow-xl"
          >
            {toast}
          </div>
        )}
      </main>
    </CompanyPortalLayout>
  );
}

