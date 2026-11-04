import { useMemo, useState } from 'react';
import VinculaAdminLayout from '../components/admin/VinculaAdminLayout.jsx';
import CompanyPageHero from '../components/company/CompanyPageHero.jsx';
import CompanyVerificationDrawer from '../components/admin/CompanyVerificationDrawer.jsx';
import CorrectionModal from '../components/admin/CorrectionModal.jsx';
import { useVinculaAdmin } from '../hooks/useVinculaAdmin.js';
import { companyPhotos } from '../data/companyImages.js';

const selectClass =
  'w-full appearance-none rounded-xl border border-sand-line bg-white py-2.5 pl-3.5 pr-9 text-xs font-semibold text-ink outline-none transition-colors focus:border-terracotta cursor-pointer';

export default function VinculaAdminCompaniesPage() {
  const {
    companies,
    metrics,
    approveCompany,
    requestCompanyCorrection,
    rejectCompany,
  } = useVinculaAdmin();

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'in_correction' | 'approved' | 'rejected' | 'all'
  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [correctionTarget, setCorrectionTarget] = useState(null);
  const [correctionMode, setCorrectionMode] = useState('correction');
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const cities = useMemo(() => {
    const list = Array.from(new Set(companies.map((c) => c.city.split(',')[0].trim())));
    return ['all', ...list];
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies.filter((comp) => {
      if (activeTab !== 'all' && comp.status !== activeTab) return false;
      if (cityFilter !== 'all' && !comp.city.toLowerCase().includes(cityFilter.toLowerCase())) return false;

      if (!q) return true;

      const inName = comp.businessName.toLowerCase().includes(q);
      const inTrade = (comp.tradeName || '').toLowerCase().includes(q);
      const inNit = comp.nit.toLowerCase().includes(q);
      const inRep = comp.legalRepName.toLowerCase().includes(q);
      const inCity = comp.city.toLowerCase().includes(q);

      return inName || inTrade || inNit || inRep || inCity;
    });
  }, [companies, activeTab, cityFilter, query]);

  const heroStats = [
    { label: 'Pendientes por Revisar', value: String(metrics.pendingCompanies) },
    { label: 'En Subsanación', value: String(metrics.correctionCompanies) },
    { label: 'Empresas Aprobadas', value: String(metrics.approvedCompanies) },
    { label: 'Total Registradas', value: String(metrics.totalCompaniesCount) },
  ];

  function handleApprove(id) {
    approveCompany(id);
    setSelectedCompany(null);
    showToast('Empresa verificada y aprobada con éxito.');
  }

  function handleOpenCorrection(target, mode = 'correction') {
    setCorrectionTarget(target);
    setCorrectionMode(mode);
  }

  function handleCorrectionSubmit(id, reason, docs) {
    if (correctionMode === 'correction') {
      requestCompanyCorrection(id, reason, docs);
      showToast('Requerimiento de subsanación enviado a la empresa.');
    } else {
      rejectCompany(id, reason);
      showToast('Solicitud rechazada formalmente.');
    }
    setSelectedCompany(null);
  }

  return (
    <VinculaAdminLayout activePage="admin-empresas">
      <main className="w-full pb-20">
        <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-10 space-y-8">
          {/* ─── Hero Showcase ─── */}
          <CompanyPageHero
            photo={companyPhotos.reclutadores}
            title="Acreditación y Validación de Empresas"
            subtitle="Inspecciona los expedientes mercantiles, certificados de existencia de Cámara de Comercio y antecedentes tributarios DIAN de nuevas empresas que solicitan vincularse a la red."
            stats={heroStats}
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

          {/* ─── Pestañas de Estado & Filtros ─── */}
          <section className="rounded-2xl border border-sand-line bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-sand-line pb-3">
              {[
                { id: 'pending', label: 'Pendientes de Validación', count: metrics.pendingCompanies, color: 'bg-amber-100 text-amber-900' },
                { id: 'in_correction', label: 'En Subsanación', count: metrics.correctionCompanies, color: 'bg-ochre/20 text-cocoa' },
                { id: 'approved', label: 'Aprobadas & Activas', count: metrics.approvedCompanies, color: 'bg-emerald-100 text-emerald-900' },
                { id: 'rejected', label: 'Rechazadas', count: companies.filter((c) => c.status === 'rejected').length, color: 'bg-rose-100 text-rose-900' },
                { id: 'all', label: 'Todas las Empresas', count: companies.length, color: 'bg-sand text-cocoa' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-cocoa text-white shadow-xs'
                        : 'text-secondary hover:bg-cream hover:text-ink'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`rounded-full px-2 py-0.2 text-[0.65rem] font-bold ${isActive ? 'bg-white/20 text-white' : tab.color}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[0.72rem] font-bold text-secondary uppercase tracking-wider">
                  Buscar por razón social, NIT o representante
                </label>
                <div className="relative">
                  <i className="bx bx-search absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-secondary" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ej. TecnoLogística, 901.442, Bucaramanga..."
                    className="w-full rounded-xl border border-sand-line bg-white py-2.5 pl-9 pr-3.5 text-xs font-medium text-ink placeholder:text-stone-400 focus:border-terracotta focus:outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-ink cursor-pointer"
                    >
                      <i className="bx bx-x text-sm" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[0.72rem] font-bold text-secondary uppercase tracking-wider">
                  Ciudad / Municipio
                </label>
                <div className="relative">
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">Todas las ciudades</option>
                    {cities.filter((c) => c !== 'all').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <i className="bx bx-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-secondary" />
                </div>
              </div>
            </div>
          </section>

          {/* ─── Listado de Empresas ─── */}
          {filteredCompanies.length === 0 ? (
            <div className="rounded-2xl border border-sand-line bg-white p-12 text-center space-y-3">
              <span className="grid size-12 place-items-center rounded-xl bg-sand text-2xl text-secondary mx-auto">
                <i className="bx bx-buildings" />
              </span>
              <h4 className="m-0 font-display text-base font-bold text-ink">
                No hay empresas en esta categoría
              </h4>
              <p className="m-0 text-xs text-secondary">
                No se encontraron solicitudes que coincidan con la pestaña o los filtros de búsqueda aplicados.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredCompanies.map((comp) => {
                const isPending = comp.status === 'pending';
                const isCorrection = comp.status === 'in_correction';
                const isApproved = comp.status === 'approved';
                const isRejected = comp.status === 'rejected';

                return (
                  <article
                    key={comp.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-sand-line bg-white p-5 shadow-2xs hover:border-terracotta/40 hover:shadow-sm transition-all"
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="grid size-10 place-items-center rounded-xl bg-sand text-terracotta text-lg shrink-0">
                          <i className="bx bxs-business" />
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="m-0 font-display text-sm font-bold text-ink truncate">
                              {comp.businessName}
                            </h4>
                            {comp.tradeName && (
                              <span className="text-xs text-secondary font-semibold">
                                ({comp.tradeName})
                              </span>
                            )}
                          </div>

                          <p className="m-0 text-xs text-secondary flex items-center gap-2 flex-wrap">
                            <span>NIT: <strong className="text-ink">{comp.nit}</strong></span>
                            <span>•</span>
                            <span>{comp.city}</span>
                            <span>•</span>
                            <span>Rep. Legal: <strong className="text-cocoa">{comp.legalRepName}</strong></span>
                          </p>
                        </div>
                      </div>

                      {/* Badges de Validación */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {isApproved && (
                          <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 text-[0.68rem] font-bold">
                            ✓ Verificada y Activa
                          </span>
                        )}
                        {isPending && (
                          <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 text-[0.68rem] font-bold">
                            ⏳ Pendiente ({comp.daysWaiting}d en espera)
                          </span>
                        )}
                        {isCorrection && (
                          <span className="rounded-full bg-ochre/25 text-cocoa border border-ochre/40 px-2.5 py-0.5 text-[0.68rem] font-bold">
                            ⚠️ En Subsanación
                          </span>
                        )}
                        {isRejected && (
                          <span className="rounded-full bg-rose-100 text-rose-900 border border-rose-300 px-2.5 py-0.5 text-[0.68rem] font-bold">
                            ✕ Rechazada
                          </span>
                        )}

                        {comp.domainValidation?.isCorporate ? (
                          <span className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <i className="bx bx-check-double text-xs" />
                            <span>Dominio Corporativo</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <i className="bx bx-error text-xs" />
                            <span>Correo Genérico ({comp.domainValidation?.domain})</span>
                          </span>
                        )}

                        <span className="text-[0.68rem] text-secondary">
                          {comp.documents?.length || 0} soportes adjuntos
                        </span>
                      </div>

                      {comp.correctionReason && (
                        <p className="m-0 text-xs text-cocoa bg-ochre/10 p-2 rounded-lg border border-ochre/30 italic">
                          «{comp.correctionReason}»
                        </p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-sand-line">
                      <button
                        type="button"
                        onClick={() => setSelectedCompany(comp)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-sand-line bg-cream px-3.5 py-2 text-xs font-bold text-cocoa hover:bg-sand transition-colors cursor-pointer w-full sm:w-auto justify-center"
                      >
                        <i className="bx bx-folder-open text-sm" />
                        <span>Revisar Expediente</span>
                      </button>

                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleApprove(comp.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-cocoa px-3.5 py-2 text-xs font-bold text-white hover:bg-cocoa/90 transition-all cursor-pointer shadow-2xs w-full sm:w-auto justify-center"
                        >
                          <i className="bx bx-check-shield text-sm" />
                          <span>Aprobar</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Drawer de Inspección */}
      <CompanyVerificationDrawer
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
        onApprove={handleApprove}
        onRequestCorrection={(comp) => handleOpenCorrection(comp, 'correction')}
        onReject={(comp) => handleOpenCorrection(comp, 'rejection')}
      />

      {/* Modal de Subsanación / Rechazo */}
      <CorrectionModal
        isOpen={Boolean(correctionTarget)}
        target={correctionTarget}
        targetType="company"
        mode={correctionMode}
        onClose={() => setCorrectionTarget(null)}
        onSubmit={handleCorrectionSubmit}
      />
    </VinculaAdminLayout>
  );
}

