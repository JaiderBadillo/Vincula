import { useMemo, useState } from 'react';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import CompanyObservationModal from '../components/institution/CompanyObservationModal.jsx';
import CompanyValidationDrawer from '../components/institution/CompanyValidationDrawer.jsx';
import { companyValidationRequests } from '../data/institutionCompanyValidationData.js';

const tabs = [
  { id: 'pending', label: 'Pendientes de Validación' },
  { id: 'approved', label: 'Convenios Vigentes' },
  { id: 'rejected', label: 'Con Observaciones' },
];

export default function InstitutionCompanyValidationPage() {
  const [requests, setRequests] = useState(companyValidationRequests);
  const [tab, setTab] = useState('pending');
  const [query, setQuery] = useState('');
  const [selectedConvenioType, setSelectedConvenioType] = useState('all');
  const [selectedSector, setSelectedSector] = useState('all');
  const [order, setOrder] = useState('recent'); // 'recent' | 'oldest'
  const [drawerId, setDrawerId] = useState(null);
  const [observationId, setObservationId] = useState(null);
  const [toast, setToast] = useState(null);

  function notify(message) {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }

  // Contadores reactivos
  const counts = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    }),
    [requests]
  );

  // Tipos de convenios únicos para filtro
  const convenioTypes = useMemo(() => {
    const set = new Set(requests.map((r) => r.convenioType));
    return Array.from(set).sort();
  }, [requests]);

  // Sectores económicos únicos para filtro
  const sectors = useMemo(() => {
    const set = new Set(requests.map((r) => r.sector.split(',')[0].split('&')[0].trim()));
    return Array.from(set).sort();
  }, [requests]);

  // Métricas rápidas de cabecera
  const metrics = useMemo(() => {
    const totalPending = counts.pending;
    const totalApproved = counts.approved;
    const totalVacancies = requests.reduce((acc, r) => acc + (r.vacanciesProjected || 0), 0);
    return { totalPending, totalApproved, totalVacancies };
  }, [counts, requests]);

  // Filtrado y ordenamiento reactivo
  const visibleRequests = useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = requests.filter((r) => {
      if (r.status !== tab) return false;
      if (selectedConvenioType !== 'all' && r.convenioType !== selectedConvenioType) return false;
      if (selectedSector !== 'all' && !r.sector.toLowerCase().includes(selectedSector.toLowerCase())) return false;
      if (!q) return true;
      return (
        r.companyName.toLowerCase().includes(q) ||
        r.commercialName.toLowerCase().includes(q) ||
        r.nit.includes(q) ||
        r.legalRepresentative.name.toLowerCase().includes(q) ||
        r.sector.toLowerCase().includes(q)
      );
    });

    return order === 'oldest' ? [...list].reverse() : list;
  }, [requests, tab, query, selectedConvenioType, selectedSector, order]);

  const drawerCompany = requests.find((r) => r.id === drawerId) || null;
  const observationCompany = requests.find((r) => r.id === observationId) || null;

  function handleApprove(id) {
    const target = requests.find((r) => r.id === id);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'approved',
              approvedAt: 'Hoy, ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
              reviewedBy: 'Dra. Camila Morales Rey',
            }
          : r
      )
    );
    setDrawerId(null);
    notify(`El convenio marco con ${target.companyName} ha sido aprobado y formalizado con éxito.`);
  }

  function handleObservation(id, { reason, notes }) {
    const target = requests.find((r) => r.id === id);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'rejected',
              observationReason: reason,
              observationNotes: notes,
              reviewedAt: 'Hoy, ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
              reviewedBy: 'Dra. Camila Morales Rey',
            }
          : r
      )
    );
    setObservationId(null);
    setDrawerId(null);
    notify(`Se ha registrado la observación legal y notificado a ${target.companyName}.`);
  }

  return (
    <InstitutionPortalLayout activePage="empresas-solicitudes">
      <main className="w-full pb-16">
        <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-10 space-y-6">
          
          {/* ─── Encabezado Principal ─── */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b border-line pb-6">
            <div className="max-w-3xl">
              <h1 className="m-0 font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                Validación de Empresas y Convenios
              </h1>
              <p className="m-0 mt-1.5 text-sm text-body-muted leading-relaxed">
                Verifica la documentación jurídica, el NIT en Cámara de Comercio y formaliza los convenios marco de cooperación y prácticas académicas con las Unidades Tecnológicas de Santander.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start lg:self-auto shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink shadow-2xs hover:bg-page transition-colors cursor-pointer"
              >
                <i className="bx bx-printer text-sm text-secondary" />
                <span>Imprimir Listado</span>
              </button>
            </div>
          </div>

          {/* ─── Resumen Rápido de Solicitudes ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-secondary">Pendientes de Revisión</span>
                <span className="mt-1 block font-display text-2xl font-bold text-ink">
                  {metrics.totalPending} empresas
                </span>
                <span className="text-[0.7rem] text-purple-700 font-medium">Requieren cotejo jurídico</span>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-purple-700">
                <i className="bx bx-buildings text-xl" />
              </span>
            </div>

            <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-secondary">Convenios Activos 2026</span>
                <span className="mt-1 block font-display text-2xl font-bold text-ink">
                  {metrics.totalApproved} formalizados
                </span>
                <span className="text-[0.7rem] text-emerald-700 font-medium">Alianzas vigentes UTS</span>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-green/10 text-green-dark">
                <i className="bx bx-check-shield text-xl" />
              </span>
            </div>

            <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-secondary">Vacantes Proyectadas</span>
                <span className="mt-1 block font-display text-2xl font-bold text-ink">
                  {metrics.totalVacancies} plazas
                </span>
                <span className="text-[0.7rem] text-secondary">Capacidad de absorción anual</span>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
                <i className="bx bx-briefcase-alt-2 text-xl" />
              </span>
            </div>
          </div>

          {/* ─── Pestañas de Estado (Tabs) ─── */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-line pt-2">
            <div className="flex items-center gap-6" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`-mb-px border-b-2 pb-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
                    tab === t.id
                      ? 'border-ink text-ink font-bold'
                      : 'border-transparent text-secondary hover:text-ink'
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.68rem] font-bold ${
                      tab === t.id
                        ? t.id === 'pending'
                          ? 'bg-purple-100 text-purple-900'
                          : t.id === 'approved'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-rose-100 text-rose-900'
                        : 'bg-page text-secondary'
                    }`}
                  >
                    {counts[t.id]}
                  </span>
                </button>
              ))}
            </div>

            <span className="text-xs text-secondary pb-3">
              Mostrando <strong>{visibleRequests.length}</strong> de {requests.length} organizaciones
            </span>
          </div>

          {/* ─── Barra de Búsqueda y Filtros Inteligentes ─── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Buscador */}
            <div className="relative">
              <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-base text-secondary" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por empresa, NIT o representante..."
                className="w-full rounded-xl border border-line bg-white py-2 pl-9 pr-3 text-xs text-ink placeholder:text-secondary/60 focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
              />
            </div>

            {/* Filtro Tipo de Convenio */}
            <div>
              <select
                value={selectedConvenioType}
                onChange={(e) => setSelectedConvenioType(e.target.value)}
                className="w-full rounded-xl border border-line bg-white py-2 px-3 text-xs text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green cursor-pointer"
              >
                <option value="all">Todos los convenios</option>
                {convenioTypes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Sector */}
            <div>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full rounded-xl border border-line bg-white py-2 px-3 text-xs text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green cursor-pointer"
              >
                <option value="all">Todos los sectores económicos</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Ordenamiento */}
            <div>
              <select
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className="w-full rounded-xl border border-line bg-white py-2 px-3 text-xs text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green cursor-pointer"
              >
                <option value="recent">Más recientes primero</option>
                <option value="oldest">Más antiguos primero</option>
              </select>
            </div>
          </div>

          {/* ─── Listado Principal de Empresas y Convenios ─── */}
          {visibleRequests.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-2xs space-y-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-page text-secondary mx-auto">
                <i className="bx bx-buildings text-2xl" />
              </span>
              <div>
                <h3 className="m-0 font-display text-base font-bold text-ink">
                  No hay solicitudes en esta sección
                </h3>
                <p className="m-0 mt-1 text-xs text-body-muted max-w-sm mx-auto">
                  No se encontraron organizaciones que coincidan con la pestaña y los filtros seleccionados.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleRequests.map((comp) => {
                const verifiedDocsCount = comp.documents.filter((d) => d.verified).length;
                const totalDocs = comp.documents.length;

                return (
                  <div
                    key={comp.id}
                    className="rounded-2xl border border-line bg-white p-5 shadow-2xs hover:shadow-xs transition-all space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      
                      {/* Empresa y Datos Clave */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <span
                          className={`grid size-12 shrink-0 place-items-center rounded-xl font-display text-xs font-black shadow-xs ${comp.logoBg}`}
                        >
                          {comp.logoInitials}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="m-0 font-display text-base font-bold text-ink truncate">
                              {comp.companyName}
                            </h3>
                            <span className="rounded-md bg-page px-2 py-0.5 text-[0.68rem] font-bold text-secondary border border-line">
                              NIT {comp.nit}
                            </span>
                          </div>

                          <p className="m-0 text-xs text-secondary mt-1">
                            {comp.sector} · <span className="text-ink font-medium">{comp.city}</span>
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.72rem] text-secondary">
                            <span>
                              Representante: <strong className="text-ink">{comp.legalRepresentative.name}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Contacto RRHH: <strong className="text-ink">{comp.contactPerson.name}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Convenio & Vacantes */}
                      <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 lg:gap-6 self-start lg:self-auto shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-line/60">
                        <div className="text-left lg:text-right">
                          <span className="block text-xs font-bold text-green-dark">
                            {comp.convenioType}
                          </span>
                          <span className="text-[0.68rem] text-secondary mt-0.5 block">
                            Vigencia: {comp.agreementDurationYears} años · Radicado: {comp.requestedAt}
                          </span>
                        </div>

                        {/* Vacantes Proyectadas */}
                        <div className="text-center rounded-xl bg-page p-2 border border-line min-w-[70px]">
                          <span className="block font-display text-base font-bold text-ink">
                            {comp.vacanciesProjected}
                          </span>
                          <span className="block text-[0.65rem] font-semibold text-secondary uppercase">
                            Vacantes
                          </span>
                        </div>

                        {/* Documentos */}
                        <div className="text-center rounded-xl bg-page p-2 border border-line min-w-[80px]">
                          <span className="block font-display text-xs font-bold text-ink">
                            {verifiedDocsCount}/{totalDocs}
                          </span>
                          <span className="block text-[0.65rem] font-semibold text-secondary uppercase">
                            Archivos
                          </span>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex items-center gap-2">
                          {comp.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(comp.id)}
                                className="rounded-xl bg-green-dark px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-green-dark/90 transition-colors cursor-pointer"
                                title="Aprobar convenio directamente"
                              >
                                Aprobar
                              </button>
                              <button
                                type="button"
                                onClick={() => setObservationId(comp.id)}
                                className="rounded-xl border border-line bg-page px-3 py-2 text-xs font-semibold text-secondary hover:text-ink hover:border-amber-400 hover:text-amber-800 transition-colors cursor-pointer"
                                title="Registrar observación o pedir corrección"
                              >
                                Observar
                              </button>
                            </>
                          ) : comp.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                              <i className="bx bx-check-circle" />
                              Vigente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                              <i className="bx bx-error" />
                              Con Observación
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setDrawerId(comp.id)}
                            className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink hover:border-green hover:text-green-dark transition-colors cursor-pointer shadow-2xs"
                          >
                            Ver expediente
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Nota de observación visible si está rechazada */}
                    {comp.status === 'rejected' && comp.observationNotes && (
                      <div className="rounded-xl bg-rose-50/70 border border-rose-200 p-3 text-xs text-rose-900 flex items-start gap-2">
                        <i className="bx bx-error-circle text-base text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Motivo: {comp.observationReason}.</strong>{' '}
                          <span className="text-rose-800">{comp.observationNotes}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── Drawer Lateral de Inspección 360° ─── */}
          <CompanyValidationDrawer
            company={drawerCompany}
            isOpen={Boolean(drawerId)}
            onClose={() => setDrawerId(null)}
            onApprove={handleApprove}
            onOpenObservation={(id) => {
              setDrawerId(null);
              setObservationId(id);
            }}
          />

          {/* ─── Modal de Observaciones Jurídicas ─── */}
          <CompanyObservationModal
            company={observationCompany}
            isOpen={Boolean(observationId)}
            onClose={() => setObservationId(null)}
            onConfirm={handleObservation}
          />

          {/* ─── Toast de Notificación Flotante ─── */}
          {toast && (
            <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-950 text-white px-5 py-3 shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
              <i className="bx bx-check-circle text-lg text-lime" />
              <span>{toast}</span>
            </div>
          )}

        </div>
      </main>
    </InstitutionPortalLayout>
  );
}
