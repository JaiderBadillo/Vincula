import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { extractErrorMessage } from '../services/authService.js';
import { isPastInterview } from '../utils/formatters.js';
import BrandMark from '../components/common/BrandMark.jsx';

const API = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function call(path, options) {
  const res = await fetch(`${API}/entrevistas/respuesta${path}`, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractErrorMessage(body, 'No se pudo procesar tu respuesta.'));
  return body;
}

const longDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const STATUS = {
  programada: ['Pendiente de tu confirmación', 'text-amber-700'],
  confirmada: ['Asistencia confirmada', 'text-emerald-700'],
  reprogramada: ['Pediste otra fecha', 'text-amber-700'],
  cancelada: ['Cancelada por la empresa', 'text-rose-700'],
  realizada: ['Realizada', 'text-secondary'],
};

/** Página pública (sin sesión) a la que lleva el correo de la cita. */
export default function InterviewResponsePage() {
  const token = useSearchParams()[0].get('token') || '';
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(token ? '' : 'Este enlace no es válido. Usa el botón del correo que te enviamos.');
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  useEffect(() => {
    if (!token) return;
    call(`?token=${encodeURIComponent(token)}`).then(setInfo).catch((e) => setError(e.message));
  }, [token]);

  async function answer(accion) {
    setBusy(true);
    setError('');
    try {
      const next = await call('', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, accion, motivo: reason.trim() || null }),
      });
      setInfo(next);
      setDone(accion === 'confirmar'
        ? '¡Listo! Confirmaste tu asistencia y avisamos al reclutador.'
        : 'Avisamos al reclutador que no puedes asistir. La empresa te propondrá otra fecha.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const past = isPastInterview(info?.fecha);
  const [statusText, statusTone] = (past ? ['Esta entrevista ya pasó', 'text-secondary'] : STATUS[info?.estado]) || ['', ''];
  const open = info && !past && ['programada', 'confirmada', 'reprogramada'].includes(info.estado);
  const rows = info ? [
    ['Vacante', info.vacante], ['Empresa', info.empresa], ['Fecha', longDate(info.fecha)], ['Hora', `${info.franja} (hora de Colombia)`],
    ['Modalidad', info.modalidad], [info.modalidad === 'Virtual' ? 'Enlace' : 'Lugar', info.lugar_o_enlace || 'Por confirmar'],
    ['Objetivo', info.objetivo], ['Te entrevista', info.reclutador],
  ] : [];

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-sand-line bg-white p-6 shadow-xl sm:p-8">
        <BrandMark className="h-10" />
        <p className="sr-only">Vincula</p>
        <h1 className="m-0 mt-1 font-display text-2xl font-bold text-ink">Tu entrevista</h1>

        {error && <p className="m-0 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" role="alert">{error}</p>}
        {!info && !error && <p className="m-0 mt-4 text-sm text-secondary">Cargando…</p>}

        {info && (
          <>
            <p className={`m-0 mt-2 text-sm font-bold ${statusTone}`}>{statusText}</p>
            <dl className="m-0 mt-4 divide-y divide-sand-line rounded-xl border border-sand-line text-sm">
              {rows.filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex gap-3 px-4 py-2.5">
                  <dt className="w-28 shrink-0 text-secondary">{k}</dt>
                  <dd className="m-0 min-w-0 break-words font-semibold text-ink">
                    {k === 'Enlace' && !past && /^https?:\/\//.test(v) ? <a href={v} target="_blank" rel="noreferrer noopener" className="text-terracotta">{v}</a> : v}
                  </dd>
                </div>
              ))}
            </dl>

            {done && <p className="m-0 mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">{done}</p>}

            {open && !done && (declining ? (
              <div className="mt-5 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary" htmlFor="why">¿Qué pasó? (opcional)</label>
                <textarea id="why" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3}
                  placeholder="Ej. Tengo un examen ese día; podría el jueves."
                  className="w-full rounded-xl border border-sand-line p-3 text-sm text-ink outline-none focus:border-terracotta" />
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => answer('no_puedo')} className="rounded-xl bg-terracotta px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 cursor-pointer">Enviar</button>
                  <button type="button" onClick={() => setDeclining(false)} className="rounded-xl border border-sand-line px-4 py-2.5 text-sm font-bold text-ink cursor-pointer">Volver</button>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap gap-2">
                {info.estado !== 'confirmada' && (
                  <button type="button" disabled={busy} onClick={() => answer('confirmar')} className="rounded-xl bg-terracotta px-5 py-2.5 text-sm font-bold text-white hover:bg-terracotta-dark disabled:opacity-50 cursor-pointer">Confirmar asistencia</button>
                )}
                <button type="button" onClick={() => setDeclining(true)} className="rounded-xl border border-sand-line px-5 py-2.5 text-sm font-bold text-ink hover:bg-sand cursor-pointer">No puedo asistir</button>
              </div>
            ))}
          </>
        )}
        <p className="m-0 mt-6 text-center text-xs"><Link to="/" className="text-secondary">Ir a Vincula</Link></p>
      </section>
    </main>
  );
}
