import { useCallback, useEffect, useState } from 'react';

export const money = (v) => (v == null ? 'Sin datos' : `$ ${(v / 1e6).toFixed(2)}M`);
export const pct = (v) => (v == null ? 'Sin datos' : `${v}%`);
export const days = (v) => (v == null ? 'Sin datos' : `${v} días`);
export const shortDate = (v) => (v ? new Date(v).toLocaleDateString('es-CO') : '—');

/** Carga datos reales: { data, error, loading, reload }. `load` debe ser estable (módulo o useCallback). */
export function useLoad(load) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    return load()
      .then((data) => setState({ data, error: '', loading: false }))
      .catch((e) => setState({ data: null, error: e.message || 'No se pudo cargar la información.', loading: false }));
  }, [load]);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

export function Empty({ children }) {
  return <p className="m-0 rounded-xl bg-page/60 px-4 py-6 text-center text-xs text-secondary">{children}</p>;
}

export function LoadState({ loading, error, data, children }) {
  if (error) return <p className="m-0 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" role="alert">{error}</p>;
  if (loading && !data) return <Empty>Cargando…</Empty>;
  return data ? children : null;
}

export function Card({ title, note, children, action }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-2xs space-y-4">
      <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h2 className="m-0 font-display text-base font-bold text-ink">{title}</h2>
          {note && <p className="m-0 mt-0.5 text-xs text-secondary">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Kpi({ label, value, hint, icon }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-secondary">{label}</span>
        {icon && <i className={`bx ${icon} text-xl text-green-dark`} aria-hidden="true" />}
      </div>
      <p className="m-0 mt-2 font-display text-3xl font-bold tracking-tight text-ink">{value}</p>
      {hint && <p className="m-0 mt-1.5 text-xs text-body-muted">{hint}</p>}
    </div>
  );
}

export function Bar({ value, tone = 'bg-green-dark' }) {
  return (
    <div className="h-2 overflow-hidden rounded-full border border-line/60 bg-page">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, value || 0)}%` }} />
    </div>
  );
}

/** Barras horizontales: [{ etiqueta, cantidad, porcentaje }] */
export function Bars({ rows, empty }) {
  if (!rows?.length) return <Empty>{empty}</Empty>;
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.etiqueta}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-semibold text-ink">{r.etiqueta}</span>
            <span className="text-secondary"><strong className="text-ink">{r.cantidad}</strong> · {r.porcentaje}%</span>
          </div>
          <Bar value={r.porcentaje} />
        </div>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
      className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:border-green focus:outline-none" />
  );
}

export const coverageTone = (v) => (v == null ? { bar: 'bg-line', text: 'text-secondary' }
  : v >= 75 ? { bar: 'bg-emerald-600', text: 'text-emerald-700' }
  : v >= 60 ? { bar: 'bg-amber-500', text: 'text-amber-700' } : { bar: 'bg-rose-500', text: 'text-rose-700' });
