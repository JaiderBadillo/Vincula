import { useState } from 'react';
import { Link } from 'react-router-dom';
import VinculaAdminLayout from '../components/admin/VinculaAdminLayout.jsx';
import CompanyPageHero from '../components/company/CompanyPageHero.jsx';
import PlatformPeriodicAnalytics from '../components/admin/PlatformPeriodicAnalytics.jsx';
import CompanyVerificationDrawer from '../components/admin/CompanyVerificationDrawer.jsx';
import InstitutionVerificationDrawer from '../components/admin/InstitutionVerificationDrawer.jsx';
import CorrectionModal from '../components/admin/CorrectionModal.jsx';
import { useVinculaAdmin } from '../hooks/useVinculaAdmin.js';
import { companyPhotos } from '../data/companyImages.js';

export default function VinculaAdminDashboardPage() {
  const {
    companies,
    institutions,
    metrics,
    approveCompany,
    requestCompanyCorrection,
    rejectCompany,
    approveInstitution,
    requestInstitutionCorrection,
    rejectInstitution,
  } = useVinculaAdmin();

  // Drawers y Modales
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [correctionTarget, setCorrectionTarget] = useState(null);
  const [correctionType, setCorrectionType] = useState('company');
  const [correctionMode, setCorrectionMode] = useState('correction');
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // Solicitudes prioritarias pendientes
  const pendingCompanies = companies.filter((c) => c.status === 'pending');
  const pendingInstitutions = institutions.filter((i) => i.status === 'pending');

  const heroStats = [
    { label: 'Empresas Activas', value: String(metrics.activeCompanies) },
    { label: 'IES en Red', value: String(metrics.activeInstitutions) },
    { label: 'Solicitudes en Cola', value: String(metrics.totalPendingOverall) },
    { label: 'Convenios Marco', value: String(metrics.activeAgreements) },
  ];

  function handleApproveCompany(id) {
    approveCompany(id);
    setSelectedCompany(null);
    showToast('Empresa aprobada exitosamente y notificada.');
  }

  function handleApproveInstitution(id) {
    approveInstitution(id);
    setSelectedInstitution(null);
    showToast('Institución incorporada a la red Vincula.');
  }

  function handleOpenCorrection(target, type, mode = 'correction') {
    setCorrectionTarget(target);
    setCorrectionType(type);
    setCorrectionMode(mode);
  }

  function handleCorrectionSubmit(id, reason, docs) {
    if (correctionType === 'company') {
      if (correctionMode === 'correction') {
        requestCompanyCorrection(id, reason, docs);
        showToast('Requerimiento de subsanación enviado a la empresa.');
      } else {
        rejectCompany(id, reason);
        showToast('Solicitud de empresa rechazada.');
      }
      setSelectedCompany(null);
    } else {
      if (correctionMode === 'correction') {
        requestInstitutionCorrection(id, reason, docs);
        showToast('Requerimiento de subsanación enviado a la IES.');
      } else {
        rejectInstitution(id, reason);
        showToast('Solicitud de IES rechazada.');
      }
      setSelectedInstitution(null);
    }
  }

  return (
    <VinculaAdminLayout activePage="admin-dashboard">
      <main className="w-full pb-20">
        <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-10 space-y-8">
          {/* ─── 1. Hero Showcase del Super Admin ─── */}
          <CompanyPageHero
            photo={companyPhotos.actividad}
            title="Panel Central de Administración"
            subtitle="Supervisa el ecosistema de Vincula, valida la documentación legal de nuevas empresas y gestiona la acreditación de instituciones de educación superior para garantizar la seguridad de los egresados."
            stats={heroStats}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/admin/empresas"
                  className="inline-flex items-center gap-2 rounded-xl bg-ochre hover:bg-ochre-light text-cocoa font-bold px-4 py-2.5 text-xs shadow-xs transition-all no-underline cursor-pointer"
                >
                  <i className="bx bx-buildings text-base" />
                  <span>Aprobar Empresas ({metrics.pendingCompanies})</span>
                </Link>
                <Link
                  to="/admin/instituciones"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-xs hover:bg-white/20 no-underline transition-colors cursor-pointer"
                >
                  <i className="bx bx-graduation text-sm" />
                  <span>Aprobar IES ({metrics.pendingInstitutions})</span>
                </Link>
              </div>
            }
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

          {/* ─── 2. Analítica Periódica y de Crecimiento por Meses / Semestres ─── */}
          <PlatformPeriodicAnalytics />

          {/* ─── 3. Bandeja de Atención Prioritaria (Pendientes de Validación) ─── */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="m-0 font-display text-base font-bold text-ink flex items-center gap-2">
                  <i className="bx bx-shield-quarter text-lg text-terracotta" />
                  <span>Bandeja de Validación Prioritaria</span>
                </h3>
                <p className="m-0 text-xs text-secondary">
                  Nuevas solicitudes radicadas que requieren inspección documental previa para ingresar a la plataforma.
                </p>
              </div>

              <span className="text-xs font-bold text-cocoa bg-ochre/20 px-3 py-1 rounded-full border border-ochre/30 self-start sm:self-auto">
                {metrics.totalPendingOverall} solicitudes pendientes
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Empresas Pendientes */}
              <div className="rounded-2xl border border-sand-line bg-white p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-sand-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-lg bg-sand text-terracotta text-base">
                      <i className="bx bx-buildings" />
                    </span>
                    <h4 className="m-0 font-display text-xs font-bold text-ink">
                      Empresas por Validar ({pendingCompanies.length})
                    </h4>
                  </div>
                  <Link
                    to="/admin/empresas"
                    className="text-[0.72rem] font-bold text-terracotta hover:underline no-underline"
                  >
                    Ver todas →
                  </Link>
                </div>

                {pendingCompanies.length === 0 ? (
                  <p className="text-xs text-secondary italic py-4 text-center">
                    No hay empresas pendientes de validación en este momento.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {pendingCompanies.slice(0, 3).map((comp) => (
                      <div
                        key={comp.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-sand-line bg-cream/30 p-3 hover:bg-cream transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h5 className="m-0 font-display text-xs font-bold text-ink truncate">
                              {comp.businessName}
                            </h5>
                            <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 text-[0.62rem] font-bold">
                              {comp.daysWaiting}d en espera
                            </span>
                          </div>
                          <p className="m-0 text-[0.68rem] text-secondary">
                            NIT: {comp.nit} · {comp.city}
                          </p>
                          <p className="m-0 text-[0.68rem] text-cocoa">
                            {comp.documents?.length || 0} documentos adjuntos
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedCompany(comp)}
                          className="rounded-xl border border-sand-line bg-white px-3 py-1.5 text-xs font-bold text-cocoa hover:bg-sand transition-colors cursor-pointer shrink-0 shadow-2xs"
                        >
                          Inspeccionar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* IES Pendientes */}
              <div className="rounded-2xl border border-sand-line bg-white p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-sand-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-lg bg-ochre/25 text-cocoa text-base">
                      <i className="bx bx-graduation" />
                    </span>
                    <h4 className="m-0 font-display text-xs font-bold text-ink">
                      Instituciones IES por Validar ({pendingInstitutions.length})
                    </h4>
                  </div>
                  <Link
                    to="/admin/instituciones"
                    className="text-[0.72rem] font-bold text-terracotta hover:underline no-underline"
                  >
                    Ver todas →
                  </Link>
                </div>

                {pendingInstitutions.length === 0 ? (
                  <p className="text-xs text-secondary italic py-4 text-center">
                    No hay instituciones pendientes de acreditación.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {pendingInstitutions.slice(0, 3).map((ies) => (
                      <div
                        key={ies.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-sand-line bg-cream/30 p-3 hover:bg-cream transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h5 className="m-0 font-display text-xs font-bold text-ink truncate">
                              {ies.shortName} · {ies.name}
                            </h5>
                            <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 text-[0.62rem] font-bold">
                              {ies.daysWaiting}d en espera
                            </span>
                          </div>
                          <p className="m-0 text-[0.68rem] text-secondary">
                            SNIES: {ies.sniesCode} · {ies.city}
                          </p>
                          <p className="m-0 text-[0.68rem] text-cocoa">
                            {ies.academicCharacter} ({ies.programsCount} programas)
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedInstitution(ies)}
                          className="rounded-xl border border-sand-line bg-white px-3 py-1.5 text-xs font-bold text-cocoa hover:bg-sand transition-colors cursor-pointer shrink-0 shadow-2xs"
                        >
                          Inspeccionar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Drawer de Empresa */}
      <CompanyVerificationDrawer
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
        onApprove={handleApproveCompany}
        onRequestCorrection={(comp) => handleOpenCorrection(comp, 'company', 'correction')}
        onReject={(comp) => handleOpenCorrection(comp, 'company', 'rejection')}
      />

      {/* Drawer de IES */}
      <InstitutionVerificationDrawer
        institution={selectedInstitution}
        onClose={() => setSelectedInstitution(null)}
        onApprove={handleApproveInstitution}
        onRequestCorrection={(ies) => handleOpenCorrection(ies, 'institution', 'correction')}
        onReject={(ies) => handleOpenCorrection(ies, 'institution', 'rejection')}
      />

      {/* Modal de Subsanación / Rechazo */}
      <CorrectionModal
        isOpen={Boolean(correctionTarget)}
        target={correctionTarget}
        targetType={correctionType}
        mode={correctionMode}
        onClose={() => setCorrectionTarget(null)}
        onSubmit={handleCorrectionSubmit}
      />
    </VinculaAdminLayout>
  );
}

