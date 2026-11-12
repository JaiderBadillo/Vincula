import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import StudentObservationModal from '../components/institution/StudentObservationModal.jsx';
import StudentValidationDrawer from '../components/institution/StudentValidationDrawer.jsx';
import { advisorPhotos } from '../data/institutionImages.js';
import { institutionService } from '../services/institutionService.js';

const tabs = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'approved', label: 'Aprobados' },
  { id: 'rejected', label: 'Con observaciones' },
];

function initials(name) {
  return (name || 'EG')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function InstitutionGraduateValidationPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendCounts, setBackendCounts] = useState(null);
  const [tab, setTab] = useState('pending');
  const [query, setQuery] = useState('');
  const [program, setProgram] = useState('all');
  const [order, setOrder] = useState('recent'); // 'recent' | 'oldest'
  const [drawerId, setDrawerId] = useState(null);
  const [observationId, setObservationId] = useState(null);
  const [toast, setToast] = useState(null);

  function notify(message) {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }

  // Cargar datos reales desde el backend de Fase 3
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const estadoApi =
          tab === 'pending'
            ? 'pendiente'
            : tab === 'approved'
            ? 'aprobado'
            : tab === 'rejected'
            ? 'rechazado'
            : 'todos';

        const res = await institutionService.getPendingGraduates({
          estado: estadoApi,
          busqueda: query.trim() || undefined,
          idPrograma: program !== 'all' ? program : undefined,
          page: 1,
          limit: 50,
        });

        if (isMounted && res && Array.isArray(res.items)) {
          if (res.items.length > 0) {
            const mapped = res.items.map((it) => ({
              id: it.id_academico,
              id_academico: it.id_academico,
              id_egresado: it.id_egresado,
              studentName: it.nombre_completo,
              studentCode: it.codigo_estudiantil || null,
              documentType: it.tipo_documento || 'CC',
              documentId: it.numero_documento,
              email: it.correo_personal || null,
              phone: it.telefono || null,
              faculty: null,
              program: it.carrera || it.nombre_programa || null,
              degreeLevel: it.nivel_formacion,
              graduationYear: it.ano_graduacion,
              graduationPeriod: it.periodo_graduacion || null,
              campus: null,
              status:
                it.estado_verificacion === 'aprobado'
                  ? 'approved'
                  : it.estado_verificacion === 'rechazado'
                  ? 'rejected'
                  : 'pending',
              requestedAt: it.creado_en
                ? new Date(it.creado_en).toLocaleDateString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null,
              priority: null,
              academicMatch: {
                status:
                  it.validado_por_ies || it.estado_verificacion === 'aprobado'
                    ? 'verified'
                    : 'pending',
                label:
                  it.validado_por_ies || it.estado_verificacion === 'aprobado'
                    ? 'Verificado por la IES'
                    : 'Pendiente de Cotejo Institucional',
                bookFolio: it.numero_libro_folio || null,
                diplomaNumber: it.numero_acta_grado || null,
                lastGpa: it.promedio_ponderado
                  ? `${it.promedio_ponderado} / 5.0`
                  : null,
                discrepancyNote: null,
              },
              documentsAttached: it.url_diploma_pdf && !/^\/(mock|storage\/)/.test(it.url_diploma_pdf) ? [
                {
                  id: it.id_academico,
                  name: it.nombre_archivo_diploma,
                  type: 'diploma',
                  verified: it.validado_por_ies,
                },
              ] : [],
              avatar: null,
              observationReason: null,
              observationNotes: it.motivo_rechazo || null,
              motivo_rechazo: it.motivo_rechazo || null,
              numero_acta_grado: it.numero_acta_grado,
              numero_libro_folio: it.numero_libro_folio,
              fecha_grado: it.fecha_grado,
              sello_digital: it.sello_digital,
              url_diploma_pdf: it.url_diploma_pdf,
              codigo_snies: it.codigo_snies,
              promedio_ponderado: it.promedio_ponderado,
            }));
            setRequests(mapped);
          } else {
            // Si el backend no tiene registros para este filtro, mostramos lista vacía
            setRequests([]);
          }

          if (res.resumen_estados) {
            setBackendCounts({
              pending: res.resumen_estados.pendientes || 0,
              approved: res.resumen_estados.aprobados || 0,
              rejected: res.resumen_estados.rechazados || 0,
            });
          }
        }
      } catch (err) {
        console.warn('[InstitutionGraduateValidationPage] No se pudieron cargar los expedientes:', err);
        if (isMounted) setRequests([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [tab, query, program]);

  const counts = useMemo(() => {
    if (backendCounts) return backendCounts;
    return {
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    };
  }, [requests, backendCounts]);

  const programs = useMemo(
    () => [...new Set(requests.map((r) => r.program).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [requests],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = requests.filter((r) => {
      if (r.status !== tab) return false;
      if (program !== 'all' && r.program !== program) return false;
      if (!q) return true;
      return (
        (r.studentName || '').toLowerCase().includes(q) ||
        (r.documentId || '').includes(q) ||
        (r.program || '').toLowerCase().includes(q)
      );
    });
    return order === 'oldest' ? [...list].reverse() : list;
  }, [requests, tab, query, program, order]);

  const drawerStudent = requests.find((r) => r.id === drawerId) || null;
  const observationStudent = requests.find((r) => r.id === observationId) || null;

  async function handleApprove(id, approvalData = {}) {
    const target = requests.find((r) => r.id === id);
    try {
      const res = await institutionService.validateGraduateDiploma(id, {
        numero_acta_grado: approvalData.numero_acta_grado,
        numero_libro_folio: approvalData.numero_libro_folio || undefined,
        fecha_grado: approvalData.fecha_grado || undefined,
        observaciones: approvalData.observaciones || undefined,
      });

      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: 'approved',
                sello_digital: res.sello_digital,
                numero_acta_grado: res.numero_acta_grado,
                numero_libro_folio: res.numero_libro_folio,
                fecha_grado: res.fecha_grado,
              }
            : r
        )
      );
      setDrawerId(null);
      notify(`✓ Diploma validado para ${target?.studentName || 'el egresado'}. Sello Digital expedido.`);
      window.dispatchEvent(new CustomEvent('vincula:graduate-validated'));
    } catch (err) {
      console.warn('Error al validar diploma:', err);
      if (err.details?.codigo === 'DIPLOMA_YA_APROBADO') {
        notify(`Información: ${err.message}`);
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r))
        );
        setDrawerId(null);
      } else {
        notify(`No se pudo validar el diploma: ${err.message}`);
      }
    }
  }

  async function handleObservation(id, { reason, notes }) {
    const target = requests.find((r) => r.id === id);
    const motivo = reason ? `${reason}: ${notes}` : notes;
    try {
      await institutionService.rejectGraduateDiploma(id, {
        motivo_rechazo: motivo,
        observaciones: notes,
      });

      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: 'rejected',
                observationReason: reason,
                observationNotes: notes,
                motivo_rechazo: motivo,
              }
            : r
        )
      );
      setObservationId(null);
      setDrawerId(null);
      notify(`Observación formal remitida a ${target?.studentName || 'el egresado'}.`);
      window.dispatchEvent(new CustomEvent('vincula:graduate-validated'));
    } catch (err) {
      console.warn('Error al observar diploma:', err);
      notify(`No se pudo registrar la observación: ${err.message}`);
    }
  }

  const hasFilters = query.trim() !== '' || program !== 'all';

  function handleResetFilters() {
    setQuery('');
    setProgram('all');
    setOrder('recent');
  }

  return (
    <InstitutionPortalLayout activePage="estudiantes-solicitudes">
      <main className="w-full pb-20">
        <div className="max-w-7xl mx-auto px-5 pt-6 sm:px-8 lg:px-10 space-y-6">
          {/* ─── Hero Fotográfico con Identidad Asesor UTS ─── */}
          <InstitutionPageHero
            photo={advisorPhotos.graduateValidation}
            eyebrow="Validación de Títulos & Egresados"
            title="Validar Egresados Institucionales"
            subtitle="Revisa la autenticidad académica, folios de acta y documentos oficiales en Supabase Storage para expedir el Sello Digital Institucional."
            stats={[
              { value: counts.pending, label: 'Pendientes' },
              { value: counts.approved, label: 'Aprobados' },
              { value: counts.rejected, label: 'Observaciones' },
            ]}
            actions={
              <Link
                to="/institucion/estudiantes/seguimiento"
                className="inline-flex items-center gap-1.5 rounded-xl bg-lime hover:bg-lime/85 text-ink px-4 py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer no-underline"
              >
                <i className="bx bx-history text-base" />
                <span>Ver Seguimiento Laboral</span>
              </Link>
            }
          />

          {/* ─── Filtros y Pestañas Tipo Pills (Fijo / Sticky al hacer scroll) ─── */}
          <div className="sticky top-[4.75rem] z-10 flex flex-col gap-3.5 rounded-2xl border border-line bg-white/95 backdrop-blur-md p-4 shadow-card sm:p-5 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Pestañas de Estado */}
              <div className="flex flex-wrap items-center gap-2" role="tablist">
                {tabs.map((t) => {
                  const isActive = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setTab(t.id)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-lime text-ink shadow-xs'
                          : 'bg-page text-secondary hover:text-ink hover:bg-panel'
                      }`}
                    >
                      <span>{t.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.2 text-[0.62rem] font-black ${
                          isActive ? 'bg-ink text-white' : 'bg-line text-secondary'
                        }`}
                      >
                        {counts[t.id]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Buscador Rápido */}
              <div className="relative md:w-72">
                <i className="bx bx-search absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-secondary pointer-events-none" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar egresado, cédula o carrera..."
                  aria-label="Buscar egresado"
                  className="w-full rounded-xl border border-line bg-page py-2 pl-10 pr-3 text-xs text-ink placeholder:text-secondary outline-none focus:border-green focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Subfiltros por Carrera y Orden */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line-soft text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 font-semibold text-secondary">
                  <span>Carrera:</span>
                  <select
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    className="rounded-lg border border-line bg-page px-2.5 py-1.5 text-xs font-semibold text-ink outline-none hover:border-green focus:border-green cursor-pointer"
                  >
                    <option value="all">Todas las carreras ({programs.length})</option>
                    {programs.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-1.5 font-semibold text-secondary">
                  <span>Fecha:</span>
                  <select
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    className="rounded-lg border border-line bg-page px-2.5 py-1.5 text-xs font-semibold text-ink outline-none hover:border-green focus:border-green cursor-pointer"
                  >
                    <option value="recent">Más reciente primero</option>
                    <option value="oldest">Más antigua primero</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-secondary font-medium">
                  Mostrando <strong>{visible.length}</strong> solicitudes
                </span>

                {hasFilters && (
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

          {/* ─── Lista de Egresados / Solicitudes ─── */}
          {loading ? (
            <div className="rounded-2xl border border-line bg-white p-12 text-center">
              <i className="bx bx-loader-alt bx-spin text-3xl text-ink" />
              <p className="mt-3 text-sm font-semibold text-secondary">
                Consultando bandeja institucional de egresados y diplomas...
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-panel text-2xl text-secondary mx-auto">
                <i className="bx bx-check-double" />
              </span>
              <h3 className="m-0 mt-3 font-display text-base font-bold text-ink">
                No hay solicitudes en esta sección
              </h3>
              <p className="m-0 mt-1 text-xs text-secondary max-w-sm mx-auto">
                {hasFilters
                  ? 'No se encontraron egresados con los filtros aplicados. Intenta restablecer los filtros.'
                  : tab === 'pending'
                  ? '¡Al día! No tienes diplomas pendientes por cotejar o validar.'
                  : tab === 'approved'
                  ? 'Aún no has aprobado diplomas institucionales en este periodo.'
                  : 'No hay expedientes con observaciones pendientes de corrección.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3.5 list-none p-0 m-0">
              {visible.map((student) => {
                const isVerified = student.academicMatch.status === 'verified';
                return (
                  <li key={student.id}>
                    <article className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5 shadow-card hover:shadow-card-hover hover:border-green/40 transition-all">
                      {/* Avatar e Información Principal */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          {student.avatar ? (
                            <img
                              src={student.avatar}
                              alt=""
                              className="size-11 shrink-0 rounded-full object-cover border border-line"
                            />
                          ) : (
                            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-panel text-sm font-bold text-ink">
                              {initials(student.studentName)}
                            </span>
                          )}

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="m-0 font-display text-base font-bold text-ink truncate">
                                {student.studentName}
                              </h3>
                              {student.studentCode && (
                                <span className="rounded-md bg-panel px-2 py-0.5 font-mono text-[0.68rem] text-secondary">
                                  {student.studentCode}
                                </span>
                              )}
                              {student.status === 'approved' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[0.65rem] font-bold">
                                  <i className="bx bxs-shield-check text-xs text-emerald-600" />
                                  <span>Sello Digital Activo</span>
                                </span>
                              )}
                              {student.status === 'rejected' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 text-[0.65rem] font-bold">
                                  <i className="bx bx-error-circle text-xs text-amber-600" />
                                  <span>Con Observaciones</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="m-0 mt-2 text-xs text-secondary flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold text-green-dark">{student.program}</span>
                          <span className="text-secondary/50">•</span>
                          <span>Grado {student.graduationYear} ({student.graduationPeriod})</span>
                          <span className="text-secondary/50">•</span>
                          <span>{student.documentType} {student.documentId}</span>
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink/80">
                          <span className="flex items-center gap-1.5 text-secondary">
                            <i className="bx bx-time-five text-sm text-green" aria-hidden="true" />
                            <span>Radicado: {student.requestedAt}</span>
                          </span>

                          <span className="flex items-center gap-1.5 text-secondary">
                            <i className="bx bx-file text-sm text-green" aria-hidden="true" />
                            <span>{student.documentsAttached?.length || 0} diploma PDF</span>
                          </span>

                          {/* Cruce Académico Badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold ${
                              isVerified
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-panel text-ink border border-line'
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                isVerified ? 'bg-emerald-600' : 'bg-slate-400'
                              }`}
                            />
                            {student.academicMatch.label}
                          </span>
                        </div>
                      </div>

                      {/* Acciones Rápidas */}
                      <div data-tour="ies-validar-sello" className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end pt-2 lg:pt-0 border-t border-line lg:border-t-0">
                        {tab === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setDrawerId(student.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-lime hover:bg-lime/85 text-ink px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-xs"
                              title="Validar y expedir Sello Digital"
                            >
                              <i className="bx bxs-check-shield text-base" />
                              <span>Validar & Sello</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setObservationId(student.id)}
                              className="inline-flex items-center gap-1 rounded-xl border border-line bg-white hover:bg-panel text-secondary hover:text-ink px-3 py-2 text-xs font-semibold transition-colors cursor-pointer"
                              title="Enviar observaciones sobre el diploma"
                            >
                              <i className="bx bx-message-error text-base text-amber-600" />
                              <span>Observar</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => setDrawerId(student.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-page hover:bg-white text-ink px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                          title="Abrir expediente completo y verificar folios"
                        >
                          <i className="bx bx-folder-open text-base text-green-dark" />
                          <span>Ver Expediente</span>
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <StudentValidationDrawer
          isOpen={Boolean(drawerStudent)}
          student={drawerStudent}
          onClose={() => setDrawerId(null)}
          onApprove={handleApprove}
          onOpenObservation={(st) => setObservationId(st.id)}
          onViewDocument={(doc) => notify(`Inspeccionando ${doc.name} en Supabase Storage…`)}
        />

        <StudentObservationModal
          isOpen={Boolean(observationStudent)}
          student={observationStudent}
          onClose={() => setObservationId(null)}
          onConfirm={handleObservation}
        />

        {toast && (
          <div
            role="status"
            className="fixed bottom-6 right-6 z-50 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-hero flex items-center gap-2 animate-rise-in border border-line"
          >
            <i className="bx bx-check-circle text-lime text-lg" />
            <span>{toast}</span>
          </div>
        )}
      </main>
    </InstitutionPortalLayout>
  );
}
