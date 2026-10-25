import { useState } from 'react';

const TABS = [
  { id: 'resumen', label: 'Resumen & Convenio', icon: 'bx-file-blank' },
  { id: 'egresados', label: 'Egresados Vinculados', icon: 'bx-user-check' },
  { id: 'evaluacion', label: 'Satisfacción & Pertinencia', icon: 'bx-star' },
  { id: 'bitacora', label: 'Bitácora de Trazabilidad', icon: 'bx-history' },
];

export default function CompanyTrackingDrawer({
  company,
  isOpen,
  onClose,
  onOpenInteractionModal,
}) {
  const [activeTab, setActiveTab] = useState('resumen');

  if (!isOpen || !company) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-ink/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-company-title"
    >
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <aside className="relative flex w-screen max-w-2xl flex-col bg-white shadow-2xl animate-slide-in-right">
          {/* ─── Drawer Top Header ─── */}
          <div className="border-b border-line-soft bg-page/70 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <span className={`grid size-13 shrink-0 place-items-center rounded-2xl font-display text-base font-bold shadow-xs ${company.logoBg}`}>
                  {company.logoInitials}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 id="drawer-company-title" className="m-0 font-display text-lg font-bold text-ink leading-tight truncate">
                      {company.commercialName || company.companyName}
                    </h2>
                    {company.agreementStatus === 'vigente' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[0.68rem] font-bold text-emerald-800">
                        <i className="bx bxs-check-shield text-xs text-green" />
                        Convenio Vigente
                      </span>
                    )}
                    {company.agreementStatus === 'por_renovar' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-[0.68rem] font-bold text-amber-900 animate-pulse">
                        <i className="bx bx-alarm-exclamation text-xs text-amber-700" />
                        Por Renovar ({company.daysToExpiry} días)
                      </span>
                    )}
                    {company.agreementStatus === 'en_seguimiento' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-[0.68rem] font-bold text-purple-800">
                        <i className="bx bx-sync text-xs text-purple-600" />
                        En Formalización
                      </span>
                    )}
                  </div>
                  <p className="m-0 text-xs text-secondary truncate">
                    {company.companyName} · NIT {company.nit}
                  </p>
                  <p className="m-0 text-xs text-body-muted mt-0.5 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <i className="bx bx-map text-secondary" />
                      {company.city}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <i className="bx bx-briefcase text-secondary" />
                      {company.sector}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="grid size-9 place-items-center rounded-xl border border-line bg-white text-secondary hover:bg-page hover:text-ink transition-colors cursor-pointer"
                aria-label="Cerrar ficha de empresa"
              >
                <i className="bx bx-x text-xl" />
              </button>
            </div>

            {/* Quick KPI Bar */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-3.5 border-t border-line-soft text-center">
              <div className="rounded-xl border border-line-soft bg-white p-2">
                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block">Egresados UTS</span>
                <span className="font-display text-base font-bold text-ink mt-0.5 block">{company.totalGraduatesHired}</span>
              </div>
              <div className="rounded-xl border border-line-soft bg-white p-2">
                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block">Vacantes Activas</span>
                <span className="font-display text-base font-bold text-green-dark mt-0.5 block">{company.activeVacanciesCount}</span>
              </div>
              <div className="rounded-xl border border-line-soft bg-white p-2">
                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block">Satisfacción</span>
                <span className="font-display text-base font-bold text-amber-700 mt-0.5 block flex items-center justify-center gap-1">
                  <i className="bx bxs-star text-xs text-amber-500" />
                  {company.satisfactionScore}
                </span>
              </div>
              <div className="rounded-xl border border-line-soft bg-white p-2">
                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block">Retención 1 Año</span>
                <span className="font-display text-base font-bold text-ink mt-0.5 block">{company.retentionRate}%</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto mt-4 scrollbar-none">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-ink text-white shadow-xs'
                        : 'text-secondary hover:bg-white hover:text-ink'
                    }`}
                  >
                    <i className={`bx ${tab.icon} text-sm ${active ? 'text-lime' : ''}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Drawer Scrollable Content ─── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB 1: RESUMEN & CONVENIO */}
            {activeTab === 'resumen' && (
              <div className="space-y-6 animate-rise-in">
                {/* Convenio Marco */}
                <div className="rounded-2xl border border-line p-4.5 bg-page/40">
                  <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary mb-3 flex items-center gap-2">
                    <i className="bx bx-award text-base text-green-dark" />
                    Condiciones del Convenio Institucional UTS
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-secondary block">Modalidad de Convenio:</span>
                      <strong className="text-ink font-semibold mt-0.5 block">{company.agreementType}</strong>
                    </div>
                    <div>
                      <span className="text-secondary block">Vigencia y Vencimiento:</span>
                      <strong className="text-ink font-semibold mt-0.5 block">
                        {company.agreementSignedAt} → {company.agreementExpiresAt}
                      </strong>
                    </div>
                    <div>
                      <span className="text-secondary block">Salario Promedio Ofrecido:</span>
                      <strong className="text-emerald-800 font-bold mt-0.5 block">
                        {company.avgSalary} ({company.avgSalaryBracket})
                      </strong>
                    </div>
                    <div>
                      <span className="text-secondary block">Contrato & Modalidad Habitual:</span>
                      <strong className="text-ink font-semibold mt-0.5 block">
                        {company.dominantContract} · {company.dominantModality}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Contactos Corporativos Clave */}
                <div className="rounded-2xl border border-line p-4.5 bg-white">
                  <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary mb-3 flex items-center gap-2">
                    <i className="bx bx-user-pin text-base text-green-dark" />
                    Interlocutores Empresariales
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Gestión Humana */}
                    <div className="rounded-xl border border-line-soft bg-page/60 p-3.5">
                      <span className="text-[0.65rem] font-bold uppercase tracking-wider text-green-dark block">
                        Contacto Talento Humano / Selección
                      </span>
                      <strong className="text-xs font-bold text-ink block mt-1">{company.contactPerson.name}</strong>
                      <span className="text-[0.72rem] text-secondary block">{company.contactPerson.role}</span>
                      <div className="mt-2.5 space-y-1 text-xs">
                        <p className="m-0 text-body-muted flex items-center gap-1.5">
                          <i className="bx bx-envelope text-secondary" />
                          <a href={`mailto:${company.contactPerson.email}`} className="text-green-dark hover:underline">
                            {company.contactPerson.email}
                          </a>
                        </p>
                        <p className="m-0 text-body-muted flex items-center gap-1.5">
                          <i className="bx bx-phone text-secondary" />
                          {company.contactPerson.phone}
                        </p>
                      </div>
                    </div>

                    {/* Representante Legal */}
                    <div className="rounded-xl border border-line-soft bg-page/60 p-3.5">
                      <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block">
                        Representación Legal
                      </span>
                      <strong className="text-xs font-bold text-ink block mt-1">{company.legalRepresentative.name}</strong>
                      <span className="text-[0.72rem] text-secondary block">{company.legalRepresentative.role}</span>
                      <p className="m-0 mt-2 text-xs text-body-muted">
                        Doc. Identidad: <span className="text-ink font-medium">{company.legalRepresentative.documentId}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Programas Académicos Más Demandados */}
                <div className="rounded-2xl border border-line p-4.5 bg-white">
                  <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary mb-3 flex items-center gap-2">
                    <i className="bx bxs-graduation text-base text-green-dark" />
                    Programas UTS Más Contratados por la Empresa
                  </h3>
                  <div className="space-y-2.5">
                    {company.topProgramsHired.map((item) => {
                      const max = Math.max(...company.topProgramsHired.map((p) => p.count));
                      const pct = Math.round((item.count / max) * 100);
                      return (
                        <div key={item.program} className="text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-ink">{item.program}</span>
                            <span className="font-bold text-green-dark">{item.count} egresados</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-page overflow-hidden">
                            <div className="h-full rounded-full bg-green transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EGRESADOS VINCULADOS */}
            {activeTab === 'egresados' && (
              <div className="space-y-4 animate-rise-in">
                <div className="flex items-center justify-between">
                  <p className="m-0 text-xs text-secondary">
                    Egresados UTS actualmente contratados en <strong>{company.commercialName}</strong> ({company.hiredGraduatesSample.length} en muestra verificada):
                  </p>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[0.68rem] font-bold text-emerald-800">
                    {company.totalGraduatesHired} Vinculaciones Totales
                  </span>
                </div>

                <div className="space-y-3">
                  {company.hiredGraduatesSample.map((grad) => (
                    <article key={grad.id} className="rounded-2xl border border-line p-4 bg-white shadow-2xs hover:border-line-soft transition-all">
                      <div className="flex items-start gap-3.5">
                        <img
                          src={grad.avatar}
                          alt={grad.name}
                          className="size-11 rounded-full object-cover border-2 border-line-soft"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <h4 className="m-0 font-display text-sm font-bold text-ink">{grad.name}</h4>
                            <span className="font-display text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              {grad.salary}
                            </span>
                          </div>
                          <p className="m-0 text-xs font-semibold text-green-dark mt-0.5">{grad.jobTitle}</p>
                          <p className="m-0 text-[0.72rem] text-secondary mt-0.5">{grad.program}</p>
                          <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-line-soft text-[0.7rem] text-body-muted">
                            <span>Ingreso: <strong className="text-ink">{grad.hiredDate}</strong></span>
                            <span>•</span>
                            <span>Contrato: <strong className="text-ink">{grad.contractType}</strong></span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: SATISFACCIÓN & PERTINENCIA */}
            {activeTab === 'evaluacion' && (
              <div className="space-y-6 animate-rise-in">
                {/* Score Card */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="grid size-16 place-items-center rounded-2xl bg-amber-500 text-white font-display text-2xl font-bold shadow-xs">
                      {company.satisfactionScore}
                    </div>
                    <div>
                      <span className="text-[0.68rem] font-bold uppercase tracking-wider text-amber-800 block">
                        Calificación del Empleador
                      </span>
                      <h4 className="m-0 font-display text-lg font-bold text-ink">
                        Nivel {company.satisfactionLevel}
                      </h4>
                      <p className="m-0 text-xs text-secondary mt-0.5">
                        Basado en encuesta anual de competencias y clima laboral UTS
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 text-xl">
                    <i className="bx bxs-star" />
                    <i className="bx bxs-star" />
                    <i className="bx bxs-star" />
                    <i className="bx bxs-star" />
                    <i className="bx bxs-star-half" />
                  </div>
                </div>

                {/* Fortalezas Destacadas */}
                <div className="rounded-2xl border border-line p-4.5 bg-white">
                  <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 flex items-center gap-1.5">
                    <i className="bx bxs-check-circle text-base text-green" />
                    Fortalezas Reconocidas en el Talento UTS
                  </h4>
                  <ul className="m-0 list-none p-0 space-y-2">
                    {company.skillsFeedback.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-ink leading-relaxed">
                        <i className="bx bx-check text-green text-base mt-0.5 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Sugerencias de Pertinencia Curricular */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4.5">
                  <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-blue-900 mb-3 flex items-center gap-1.5">
                    <i className="bx bx-bulb text-base text-blue-600" />
                    Recomendaciones para Actualización Curricular UTS
                  </h4>
                  <ul className="m-0 list-none p-0 space-y-2">
                    {company.skillsFeedback.improvementOpportunities.map((o, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-ink leading-relaxed">
                        <i className="bx bx-right-arrow-alt text-blue-600 text-base mt-0.5 shrink-0" />
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 4: BITÁCORA DE TRAZABILIDAD */}
            {activeTab === 'bitacora' && (
              <div className="space-y-4 animate-rise-in">
                <div className="flex items-center justify-between">
                  <p className="m-0 text-xs text-secondary">
                    Historial de gestiones y contactos institucionales UTS - {company.commercialName}:
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenInteractionModal(company)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-green-dark hover:bg-green px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <i className="bx bx-plus text-sm" />
                    <span>Registrar Gestión</span>
                  </button>
                </div>

                {company.interactionLogs && company.interactionLogs.length > 0 ? (
                  <div className="relative pl-6 space-y-5 border-l-2 border-line-soft ml-3 mt-4">
                    {company.interactionLogs.map((log) => {
                      const icons = {
                        reunion: 'bx-group text-blue-600 bg-blue-100',
                        visita: 'bx-buildings text-purple-600 bg-purple-100',
                        llamada: 'bx-phone-call text-emerald-600 bg-emerald-100',
                        evaluacion: 'bx-star text-amber-600 bg-amber-100',
                        convenio: 'bx-file text-teal-600 bg-teal-100',
                      };
                      return (
                        <div key={log.id} className="relative group">
                          {/* Timeline Dot */}
                          <div className={`absolute -left-[1.85rem] top-1 grid size-7 place-items-center rounded-full border-2 border-white shadow-xs ${icons[log.type] || 'bx-bookmark text-ink bg-page'}`}>
                            <i className={`bx ${icons[log.type]?.split(' ')[0] || 'bx-check'} text-xs`} />
                          </div>

                          <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                              <span className="text-[0.68rem] font-bold text-secondary uppercase tracking-wider">
                                {log.date} · Asesor: {log.advisorName}
                              </span>
                            </div>
                            <h4 className="m-0 font-display text-sm font-bold text-ink">{log.title}</h4>
                            <p className="m-0 mt-1.5 text-xs text-body-muted leading-relaxed">{log.summary}</p>
                            {log.nextAction && (
                              <div className="mt-2.5 pt-2 border-t border-line-soft text-xs text-green-dark font-medium flex items-center gap-1.5">
                                <i className="bx bx-time text-sm" />
                                <span>Próximo compromiso: <strong className="font-semibold text-ink">{log.nextAction}</strong></span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-line p-8 text-center text-xs text-secondary">
                    No hay gestiones registradas aún para esta empresa. Haz clic en "Registrar Gestión" para añadir la primera.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Drawer Bottom Actions ─── */}
          <div className="border-t border-line-soft bg-page/80 px-6 py-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-bold text-secondary hover:text-ink cursor-pointer transition-colors"
            >
              Cerrar Ficha
            </button>

            <button
              type="button"
              onClick={() => onOpenInteractionModal(company)}
              className="rounded-xl bg-green-dark hover:bg-green px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <i className="bx bx-edit text-sm" />
              <span>Nueva Nota de Seguimiento</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
