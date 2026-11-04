import { useMemo, useState } from 'react';
import VinculaAdminLayout from '../components/admin/VinculaAdminLayout.jsx';
import CompanyPageHero from '../components/company/CompanyPageHero.jsx';
import InstitutionVerificationDrawer from '../components/admin/InstitutionVerificationDrawer.jsx';
import CorrectionModal from '../components/admin/CorrectionModal.jsx';
import { useVinculaAdmin } from '../hooks/useVinculaAdmin.js';
import { companyPhotos } from '../data/companyImages.js';

export default function VinculaAdminInstitutionsPage() {
  const {
    institutions,
    metrics,
    approveInstitution,
    requestInstitutionCorrection,
    rejectInstitution,
  } = useVinculaAdmin();

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'in_correction' | 'approved' | 'rejected' | 'all'
  const [query, setQuery] = useState('');

  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [correctionTarget, setCorrectionTarget] = useState(null);
  const [correctionMode, setCorrectionMode] = useState('correction');
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const filteredInstitutions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return institutions.filter((ies) => {
      if (activeTab !== 'all' && ies.status !== activeTab) return false;

      if (!q) return true;

      const inName = ies.name.toLowerCase().includes(q);
      const inShort = ies.shortName.toLowerCase().includes(q);
      const inSnies = ies.sniesCode.toLowerCase().includes(q);
      const inRector = ies.rectorName.toLowerCase().includes(q);
      const inCity = ies.city.toLowerCase().includes(q);

      return inName || inShort || inSnies || inRector || inCity;
    });
  }, [institutions, activeTab, query]);

  const heroStats = [
    { label: 'IES Pendientes', value: String(metrics.pendingInstitutions) },
    { label: 'IES Acreditadas Activas', value: String(metrics.approvedInstitutions) },
    { label: 'Convenios Marco', value: String(metrics.activeAgreements) },
    { label: 'Total en Plataforma', value: String(metrics.totalInstitutionsCount) },
  ];

  function handleApprove(id) {
    approveInstitution(id);
    setSelectedInstitution(null);
    showToast('Institución incorporada a la red Vincula exitosamente.');
  }

  function handleOpenCorrection(target, mode = 'correction') {
    setCorrectionTarget(target);
    setCorrectionMode(mode);
  }

  function handleCorrectionSubmit(id, reason, docs) {
    if (correctionMode === 'correction') {
      requestInstitutionCorrection(id, reason, docs);
      showToast('Requerimiento de subsanación enviado a la IES.');
    } else {
      rejectInstitution(id, reason);
      showToast('Solicitud rechazada formalmente.');
    }
    setSelectedInstitution(null);
  }

  return (
    <VinculaAdminLayout activePage="admin-instituciones">
      <main className="w-full pb-20">
        <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-10 space-y-8">
          {/* ─── Hero Showcase ─── */}
          <CompanyPageHero
            photo={companyPhotos.convenios}
            title="Acreditación de Instituciones de Educación Superior"
            subtitle="Valida el reconocimiento institucional del Ministerio de Educación Nacional (MEN), registros SNIES vigentes y actos de posesión rectoral para la suscripción de convenios marco de prácticas y empleo."
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
                { id: 'pending', label: 'Pendientes de Validación', count: metrics.pendingInstitutions, color: 'bg-amber-100 text-amber-900' },
                { id: 'in_correction', label: 'En Subsanación', count: metrics.correctionInstitutions, color: 'bg-ochre/20 text-cocoa' },
                { id: 'approved', label: 'Acreditadas en Red', count: metrics.approvedInstitutions, color: 'bg-emerald-100 text-emerald-900' },
                { id: 'rejected', label: 'Rechazadas', count: institutions.filter((i) => i.status === 'rejected').length, color: 'bg-rose-100 text-rose-900' },
                { id: 'all', label: 'Todas las IES', count: institutions.length, color: 'bg-sand text-cocoa' },
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

            <div className="space-y-1">
              <label className="text-[0.72rem] font-bold text-secondary uppercase tracking-wider">
                Buscar por nombre de IES, código SNIES o ciudad
              </label>
              <div className="relative">
                <i className="bx bx-search absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-secondary" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ej. UNIPAZ, 4812, Barrancabermeja, UTS..."
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
          </section>

          {/* ─── Listado de IES ─── */}
          {filteredInstitutions.length === 0 ? (
            <div className="rounded-2xl border border-sand-line bg-white p-12 text-center space-y-3">
              <span className="grid size-12 place-items-center rounded-xl bg-sand text-2xl text-secondary mx-auto">
                <i className="bx bx-graduation" />
              </span>
              <h4 className="m-0 font-display text-base font-bold text-ink">
                No hay instituciones en esta categoría
              </h4>
              <p className="m-0 text-xs text-secondary">
                No se encontraron solicitudes que coincidan con la pestaña seleccionada.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredInstitutions.map((ies) => {
                const isPending = ies.status === 'pending';
                const isCorrection = ies.status === 'in_correction';
                const isApproved = ies.status === 'approved';
                const isRejected = ies.status === 'rejected';

                return (
                  <article
                    key={ies.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-sand-line bg-white p-5 shadow-2xs hover:border-terracotta/40 hover:shadow-sm transition-all"
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="grid size-10 place-items-center rounded-xl bg-ochre/25 text-cocoa text-lg shrink-0">
                          <i className="bx bxs-graduation" />
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="m-0 font-display text-sm font-bold text-ink truncate">
                              {ies.name}
                            </h4>
                            <span className="text-xs text-secondary font-bold">
                              ({ies.shortName})
                            </span>
                          </div>

                          <p className="m-0 text-xs text-secondary flex items-center gap-2 flex-wrap">
                            <span>Código SNIES: <strong className="text-ink">{ies.sniesCode}</strong></span>
                            <span>•</span>
                            <span>{ies.academicCharacter}</span>
                            <span>•</span>
                            <span>{ies.city}</span>
                            <span>•</span>
                            <span>Rector(a): <strong className="text-cocoa">{ies.rectorName}</strong></span>
                          </p>
                        </div>
                      </div>

                      {/* Badges de Validación */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {isApproved && (
                          <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 text-[0.68rem] font-bold">
                            ✓ Acreditada e Incorporada
                          </span>
                        )}
                        {isPending && (
                          <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 text-[0.68rem] font-bold">
                            ⏳ Pendiente ({ies.daysWaiting}d en espera)
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

                        <span className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <i className="bx bx-check-shield text-xs" />
                          <span>SNIES Oficial Activo</span>
                        </span>

                        <span className="text-[0.68rem] text-secondary">
                          {ies.programsCount} programas de formación · {ies.documents?.length || 0} soportes radicados
                        </span>
                      </div>

                      {ies.correctionReason && (
                        <p className="m-0 text-xs text-cocoa bg-ochre/10 p-2 rounded-lg border border-ochre/30 italic">
                          «{ies.correctionReason}»
                        </p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-sand-line">
                      <button
                        type="button"
                        onClick={() => setSelectedInstitution(ies)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-sand-line bg-cream px-3.5 py-2 text-xs font-bold text-cocoa hover:bg-sand transition-colors cursor-pointer w-full sm:w-auto justify-center"
                      >
                        <i className="bx bx-folder-open text-sm" />
                        <span>Revisar Expediente</span>
                      </button>

                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleApprove(ies.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-cocoa px-3.5 py-2 text-xs font-bold text-white hover:bg-cocoa/90 transition-all cursor-pointer shadow-2xs w-full sm:w-auto justify-center"
                        >
                          <i className="bx bx-check-shield text-sm" />
                          <span>Aprobar IES</span>
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

      {/* Drawer de Inspección IES */}
      <InstitutionVerificationDrawer
        institution={selectedInstitution}
        onClose={() => setSelectedInstitution(null)}
        onApprove={handleApprove}
        onRequestCorrection={(ies) => handleOpenCorrection(ies, 'correction')}
        onReject={(ies) => handleOpenCorrection(ies, 'rejection')}
      />

      {/* Modal de Subsanación / Rechazo */}
      <CorrectionModal
        isOpen={Boolean(correctionTarget)}
        target={correctionTarget}
        targetType="institution"
        mode={correctionMode}
        onClose={() => setCorrectionTarget(null)}
        onSubmit={handleCorrectionSubmit}
      />
    </VinculaAdminLayout>
  );
}

