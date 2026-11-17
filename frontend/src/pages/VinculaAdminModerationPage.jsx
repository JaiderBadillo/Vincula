import { useCallback, useEffect, useState } from 'react';
import VinculaAdminLayout from '../components/admin/VinculaAdminLayout.jsx';
import { moderationService } from '../services/moderationService.js';
import { formatApplicationDate } from '../utils/formatters.js';

const TABS = [
  { id: 'reportes', label: 'Reportes' },
  { id: 'inhabilitadas', label: 'Vacantes inhabilitadas' },
  { id: 'cuentas', label: 'Cuentas' },
  { id: 'historial', label: 'Historial' },
];

const ACCION = {
  vacante_inhabilitada: 'Vacante inhabilitada',
  vacante_rehabilitada: 'Vacante rehabilitada',
  reportes_descartados: 'Reportes descartados',
  cuenta_suspendida: 'Cuenta suspendida',
  cuenta_reactivada: 'Cuenta reactivada',
  empresa_suspendida: 'Empresa suspendida',
  empresa_reactivada: 'Empresa reactivada',
};

const ESTADO_VACANTE = { abierta: 'Abierta', pausada: 'Pausada', cerrada: 'Cerrada', borrador: 'Borrador', inhabilitada: 'Inhabilitada' };
const btn = 'rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';
const btnDanger = `${btn} bg-rose-700 text-white hover:bg-rose-800`;
const btnQuiet = `${btn} border border-sand-line bg-white text-ink hover:bg-sand`;

/** Diálogo que pide el motivo (obligatorio al restringir; opcional al revertir o descartar). */
function ReasonDialog({ dialog, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const missing = dialog.required && reason.trim().length < 5;
  async function confirm() {
    setBusy(true);
    try { await onConfirm(reason.trim()); } finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="mod-dialog-title">
      <div className="fixed inset-0 bg-cocoa/60" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl border border-sand-line bg-white p-6 shadow-xl">
        <h2 id="mod-dialog-title" className="m-0 font-display text-lg font-bold text-ink">{dialog.title}</h2>
        <p className="m-0 mt-1.5 text-sm text-secondary">{dialog.description}</p>
        <label className="mt-4 block text-[0.72rem] font-bold uppercase tracking-wider text-secondary" htmlFor="mod-reason">
          {dialog.required ? 'Motivo (queda en el historial)' : 'Nota (opcional)'}
        </label>
        <textarea
          id="mod-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} autoFocus
          className="mt-1.5 w-full rounded-xl border border-sand-line p-3 text-sm text-ink outline-none focus:border-terracotta"
          placeholder={dialog.required ? 'Ej. Cobra dinero a los candidatos por postularse' : ''}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnQuiet}>Cancelar</button>
          <button type="button" onClick={confirm} disabled={missing || busy} className={dialog.danger ? btnDanger : `${btn} bg-cocoa text-white hover:bg-ink`}>
            {busy ? 'Guardando…' : dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Empty({ children }) {
  return <p className="m-0 rounded-xl border border-dashed border-sand-line bg-cream/50 px-4 py-8 text-center text-sm text-secondary">{children}</p>;
}

export default function VinculaAdminModerationPage() {
  const [tab, setTab] = useState('reportes');
  const [reportFilter, setReportFilter] = useState('pendiente');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [dialog, setDialog] = useState(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (tab === 'cuentas') return;
    setLoading(true);
    setError('');
    try {
      const loaders = {
        reportes: () => moderationService.listReports(reportFilter),
        inhabilitadas: () => moderationService.listDisabledVacancies(),
        historial: () => moderationService.listHistory(),
      };
      setData(await loaders[tab]());
    } catch (err) {
      setData(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, reportFilter]);

  useEffect(() => { setData(null); void load(); }, [load]);

  async function search(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try { setData(await moderationService.searchAccounts(query)); }
    catch (err) { setData(null); setError(err.message); }
    finally { setLoading(false); }
  }

  /** Abre el diálogo y, al confirmar, ejecuta la acción, avisa y recarga la vista. */
  function ask(config, action) {
    setDialog({
      ...config,
      run: async (reason) => {
        try {
          const res = await action(reason);
          setToast(res.mensaje);
          setDialog(null);
          if (tab === 'cuentas' && query.trim().length >= 3) setData(await moderationService.searchAccounts(query));
          else await load();
        } catch (err) {
          setToast(`No se pudo completar: ${err.message}`);
          setDialog(null);
        }
      },
    });
  }

  const disableVacancy = (v) => ask(
    { title: 'Inhabilitar vacante', description: `«${v.titulo}» dejará de ser visible y no recibirá postulaciones. Se avisa a la empresa por correo.`, required: true, danger: true, confirmLabel: 'Inhabilitar' },
    (motivo) => moderationService.disableVacancy(v.id_vacante, motivo));
  const suspendCompany = (id, nombre) => ask(
    { title: 'Suspender empresa', description: `Se suspenden todas las cuentas de ${nombre} y se inhabilitan sus vacantes abiertas o pausadas.`, required: true, danger: true, confirmLabel: 'Suspender empresa' },
    (motivo) => moderationService.suspendCompany(id, motivo));
  const dismiss = (v) => ask(
    { title: 'Descartar reportes', description: `Los reportes de «${v.titulo}» se cierran sin acción: no se encontró irregularidad.`, required: false, confirmLabel: 'Descartar' },
    (nota) => moderationService.dismissReports(v.id_vacante, nota));
  const enableVacancy = (v) => ask(
    { title: 'Rehabilitar vacante', description: `«${v.titulo}» vuelve en estado pausada; la empresa decide cuándo reabrirla.`, required: false, confirmLabel: 'Rehabilitar' },
    (nota) => moderationService.enableVacancy(v.id_vacante, nota));
  const suspendAccount = (a) => ask(
    { title: 'Suspender cuenta', description: `${a.correo} no podrá iniciar sesión y se cierran sus sesiones abiertas.`, required: true, danger: true, confirmLabel: 'Suspender cuenta' },
    (motivo) => moderationService.suspendAccount(a.id, motivo));
  const reactivateAccount = (a) => ask(
    { title: 'Reactivar cuenta', description: `${a.correo} podrá volver a iniciar sesión.`, required: false, confirmLabel: 'Reactivar' },
    (nota) => moderationService.reactivateAccount(a.id, nota));
  const reactivateCompany = (a) => ask(
    { title: 'Reactivar empresa', description: `Se reactivan las cuentas suspendidas de ${a.empresa}. Sus vacantes se rehabilitan una a una.`, required: false, confirmLabel: 'Reactivar empresa' },
    (nota) => moderationService.reactivateCompany(a.id_empresa, nota));

  return (
    <VinculaAdminLayout activePage="admin-moderacion">
      <main className="w-full pb-20">
        <div className="mx-auto max-w-7xl space-y-6 px-5 pt-8 sm:px-8 lg:px-10">
          <header>
            <h1 className="m-0 font-display text-2xl font-bold text-ink sm:text-3xl">Moderación de contenido</h1>
            <p className="m-0 mt-1.5 max-w-3xl text-sm text-secondary">
              Revisa las vacantes que los usuarios reportaron como irregulares e inhabilita ofertas o cuentas. Cada acción queda en el historial con su motivo.
            </p>
          </header>

          {toast && (
            <div className="flex items-center justify-between rounded-xl border border-sand-line bg-cream px-4 py-2.5 text-xs text-ink" role="status">
              <span>{toast}</span>
              <button type="button" onClick={() => setToast('')} className="cursor-pointer text-secondary hover:text-ink" aria-label="Cerrar aviso"><i className="bx bx-x text-lg" /></button>
            </div>
          )}

          <section className="space-y-4 rounded-2xl border border-sand-line bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-sand-line pb-3" role="tablist">
              {TABS.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${tab === t.id ? 'bg-cocoa text-white' : 'text-secondary hover:bg-cream hover:text-ink'}`}>
                  {t.label}
                </button>
              ))}
              {tab === 'reportes' && (
                <select value={reportFilter} onChange={(e) => setReportFilter(e.target.value)} aria-label="Estado de los reportes"
                  className="ml-auto rounded-xl border border-sand-line bg-white px-3 py-2 text-xs font-semibold text-ink">
                  <option value="pendiente">Pendientes</option>
                  <option value="resuelto">Resueltos</option>
                  <option value="descartado">Descartados</option>
                  <option value="todos">Todos</option>
                </select>
              )}
            </div>

            {error && <p className="m-0 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</p>}
            {loading && <p className="m-0 text-sm text-secondary" role="status">Cargando…</p>}

            {/* ─── Reportes ─── */}
            {tab === 'reportes' && data && !loading && (data.items.length === 0 ? (
              <Empty>{reportFilter === 'pendiente' ? 'No hay reportes pendientes.' : 'No hay reportes con este estado.'}</Empty>
            ) : (
              <ul className="m-0 grid list-none gap-4 p-0">
                {data.items.map((v) => (
                  <li key={v.id_vacante} className="rounded-2xl border border-sand-line p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="m-0 text-base font-bold text-ink">{v.titulo}</h3>
                        <p className="m-0 mt-0.5 text-xs text-secondary">{v.codigo_vacante} · {v.empresa} · {ESTADO_VACANTE[v.estado_vacante] || v.estado_vacante}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[0.7rem] font-bold text-rose-900">
                            {v.total_reportes} {v.total_reportes === 1 ? 'reporte' : 'reportes'}
                          </span>
                          {Object.entries(v.motivos).map(([m, n]) => (
                            <span key={m} className="rounded-full bg-sand px-2.5 py-0.5 text-[0.7rem] font-semibold text-cocoa">
                              {v.reportes.find((r) => r.motivo === m)?.motivo_etiqueta} · {n}
                            </span>
                          ))}
                        </div>
                      </div>
                      {v.reportes.some((r) => r.estado === 'pendiente') && v.estado_vacante !== 'inhabilitada' && (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => disableVacancy(v)} className={btnDanger}>Inhabilitar vacante</button>
                          <button type="button" onClick={() => suspendCompany(v.id_empresa, v.empresa)} className={btnQuiet}>Suspender empresa</button>
                          <button type="button" onClick={() => dismiss(v)} className={btnQuiet}>Descartar reportes</button>
                        </div>
                      )}
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-bold text-terracotta">Ver detalle de los reportes</summary>
                      <ul className="m-0 mt-2 grid list-none gap-2 p-0">
                        {v.reportes.map((r) => (
                          <li key={r.id} className="rounded-xl bg-cream/60 px-3.5 py-2.5 text-xs text-ink">
                            <p className="m-0 font-bold">{r.motivo_etiqueta} <span className="font-normal text-secondary">· {r.estado}</span></p>
                            {r.detalle && <p className="m-0 mt-1">{r.detalle}</p>}
                            <p className="m-0 mt-1 text-secondary">{r.reportante} ({r.rol_reportante}) · {formatApplicationDate(r.creado_en)}</p>
                            {r.nota_admin && <p className="m-0 mt-1 text-secondary">Resolución: {r.nota_admin}</p>}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
            ))}

            {/* ─── Vacantes inhabilitadas ─── */}
            {tab === 'inhabilitadas' && data && !loading && (data.items.length === 0 ? (
              <Empty>No hay vacantes inhabilitadas.</Empty>
            ) : (
              <ul className="m-0 grid list-none gap-3 p-0">
                {data.items.map((v) => (
                  <li key={v.id_vacante} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-line p-4">
                    <div className="min-w-0">
                      <h3 className="m-0 text-sm font-bold text-ink">{v.titulo}</h3>
                      <p className="m-0 mt-0.5 text-xs text-secondary">{v.codigo_vacante} · {v.empresa} · desde {formatApplicationDate(v.inhabilitada_en)}</p>
                      {v.motivo && <p className="m-0 mt-1 text-xs text-ink">Motivo: {v.motivo}</p>}
                    </div>
                    <button type="button" onClick={() => enableVacancy(v)} className={btnQuiet}>Rehabilitar</button>
                  </li>
                ))}
              </ul>
            ))}

            {/* ─── Cuentas ─── */}
            {tab === 'cuentas' && (
              <div className="space-y-4">
                <form onSubmit={search} className="flex flex-wrap gap-2">
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Correo de la cuenta (mínimo 3 caracteres)" aria-label="Buscar cuenta por correo"
                    className="min-w-64 flex-1 rounded-xl border border-sand-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-terracotta" />
                  <button type="submit" disabled={query.trim().length < 3} className={`${btn} bg-cocoa text-white hover:bg-ink`}>Buscar</button>
                </form>
                {data?.items && !loading && (data.items.length === 0 ? <Empty>Sin resultados.</Empty> : (
                  <ul className="m-0 grid list-none gap-3 p-0">
                    {data.items.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-line p-4">
                        <div className="min-w-0">
                          <p className="m-0 text-sm font-bold text-ink">{a.correo}</p>
                          <p className="m-0 mt-0.5 text-xs text-secondary">
                            {a.rol}{a.empresa ? ` · ${a.empresa}` : ''} ·{' '}
                            <span className={a.estado === 'suspendido' ? 'font-bold text-rose-700' : ''}>{a.estado}</span>
                          </p>
                        </div>
                        {!a.rol.startsWith('superadmin') && (
                          <div className="flex flex-wrap gap-2">
                            {a.estado === 'suspendido'
                              ? <button type="button" onClick={() => reactivateAccount(a)} className={btnQuiet}>Reactivar cuenta</button>
                              : <button type="button" onClick={() => suspendAccount(a)} className={btnDanger}>Suspender cuenta</button>}
                            {a.id_empresa && (a.estado === 'suspendido'
                              ? <button type="button" onClick={() => reactivateCompany(a)} className={btnQuiet}>Reactivar empresa</button>
                              : <button type="button" onClick={() => suspendCompany(a.id_empresa, a.empresa)} className={btnQuiet}>Suspender empresa</button>)}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            )}

            {/* ─── Historial ─── */}
            {tab === 'historial' && data && !loading && (data.items.length === 0 ? (
              <Empty>Aún no hay acciones de moderación.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-sand-line text-[0.68rem] uppercase tracking-wider text-secondary">
                      <th className="py-2 pr-3 font-bold">Fecha</th><th className="py-2 pr-3 font-bold">Acción</th>
                      <th className="py-2 pr-3 font-bold">Motivo</th><th className="py-2 font-bold">Administrador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((h) => (
                      <tr key={h.id} className="border-b border-sand-line/60 align-top">
                        <td className="py-2.5 pr-3 whitespace-nowrap text-secondary">{formatApplicationDate(h.creado_en)}</td>
                        <td className="py-2.5 pr-3 font-semibold text-ink">{ACCION[h.accion] || h.accion}</td>
                        <td className="py-2.5 pr-3 text-ink">{h.motivo}</td>
                        <td className="py-2.5 text-secondary">{h.administrador || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </section>
        </div>
      </main>
      {dialog && <ReasonDialog dialog={dialog} onClose={() => setDialog(null)} onConfirm={dialog.run} />}
    </VinculaAdminLayout>
  );
}
