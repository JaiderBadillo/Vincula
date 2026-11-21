import { useCallback, useEffect, useState } from 'react';
import { convenioService } from '../../services/convenioService.js';
import { authService } from '../../services/authService.js';

const date = (v) => (v ? new Date(`${String(v).slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const ESTADO = { aprobada: 'Aceptada', rechazada: 'Rechazada', retirada: 'Retirada' };
const field = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-green';
const label = 'mb-1.5 block text-[0.8rem] font-semibold text-ink';

const MODALIDAD = { presencial: 'Presencial', hibrido: 'Híbrido', remoto: 'Remoto' };
const REMUNERACION = { a_convenir: 'A convenir', remunerada: 'Remunerada', con_auxilio: 'Con auxilio de transporte o alimentación', sin_remuneracion: 'Sin remuneración' };
const COMPROMISO = {
  prioridad_egresados: 'Prioridad a los egresados en las vacantes',
  charlas_empleabilidad: 'Charlas y talleres de empleabilidad',
  ferias_visitas: 'Visitas y ferias de empleo',
  seguimiento_conjunto: 'Seguimiento conjunto de los practicantes',
};
const RELACION = { vigente: 'Ya tienen un convenio vigente', propuesta: 'Hay una propuesta en curso' };

function Block({ title, hint, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="m-0 font-display text-base font-bold text-ink">{title}</h2>
        {hint && <p className="m-0 mt-0.5 text-xs text-secondary">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
const Empty = ({ children }) => <p className="m-0 rounded-xl bg-page/60 px-4 py-5 text-center text-xs text-secondary">{children}</p>;

/** Resultado de la búsqueda: nombre, datos útiles para decidir y, si ya hay relación, por qué no se puede elegir. */
function Candidate({ o, lado, onPick }) {
  const stats = lado === 'empresa'
    ? [o.programas > 0 && `${o.programas} programa${o.programas > 1 ? 's' : ''}`, o.egresados > 0 && `${o.egresados} egresado${o.egresados > 1 ? 's' : ''} verificado${o.egresados > 1 ? 's' : ''}`]
    : [o.vacantes_abiertas > 0 ? `${o.vacantes_abiertas} vacante${o.vacantes_abiertas > 1 ? 's' : ''} abierta${o.vacantes_abiertas > 1 ? 's' : ''}` : 'Sin vacantes abiertas'];
  return (
    <li>
      <button type="button" disabled={Boolean(o.relacion)} onClick={() => onPick(o)}
        className="block w-full cursor-pointer px-4 py-3 text-left transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent">
        <span className="block text-sm font-semibold text-ink">{o.nombre}</span>
        <span className="block text-xs text-secondary">{o.detalle}{stats.filter(Boolean).length > 0 && ` · ${stats.filter(Boolean).join(' · ')}`}</span>
        {o.relacion && <span className="mt-0.5 block text-xs font-semibold text-amber-800">{RELACION[o.relacion]}</span>}
      </button>
    </li>
  );
}

/** Ventana para proponer un convenio en dos pasos: buscar a la otra parte (con filtros) y definir las condiciones. */
function ProposalModal({ lado, onClose, onSent, accent }) {
  const other = lado === 'empresa' ? 'institución' : 'empresa';
  const user = authService.getCurrentUser();
  const [step, setStep] = useState(1);
  const [filters, setFilters] = useState({ q: '', ciudad: '', sector: '', programa: '', soloVacantes: false });
  const [options, setOptions] = useState({ ciudades: [], sectores: [] });
  const [results, setResults] = useState(null);
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({
    tipo: 'Pasantía', vacantes_proyectadas: 1, duracion_anos: 1, programas: '', mensaje: '', modalidad: '', remuneracion: '',
    compromisos: [], responsable_nombre: user?.nombre || '', responsable_contacto: user?.correo || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const toggle = (key) => setForm((f) => ({ ...f, compromisos: f.compromisos.includes(key) ? f.compromisos.filter((c) => c !== key) : [...f.compromisos, key] }));

  useEffect(() => { convenioService.getCounterpartFilters().then(setOptions).catch(() => {}); }, []);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => convenioService.searchCounterparts(filters)
      .then((r) => { if (alive) { setResults(r); setError(''); } })
      .catch((e) => { if (alive) setError(e.message); }), 250);
    return () => { alive = false; clearTimeout(t); };
  }, [filters]);

  const hasFilters = Boolean(filters.q || filters.ciudad || filters.sector || filters.programa || filters.soloVacantes);

  async function submit(event) {
    event.preventDefault();
    if (!target) { setError(`Elige la ${other} a la que le propones el convenio.`); setStep(1); return; }
    setBusy(true);
    setError('');
    try {
      await convenioService.propose({
        id_contraparte: target.id, tipo: form.tipo, vacantes_proyectadas: Number(form.vacantes_proyectadas) || 1,
        duracion_anos: Number(form.duracion_anos) || 1, programas: form.programas.split(',').map((p) => p.trim()).filter(Boolean),
        mensaje: form.mensaje.trim() || null, modalidad: form.modalidad || null, remuneracion: form.remuneracion || null,
        compromisos: form.compromisos, responsable_nombre: form.responsable_nombre.trim() || null, responsable_contacto: form.responsable_contacto.trim() || null,
      });
      onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="proposal-title" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-7">
        <div className="mb-5">
          <h2 id="proposal-title" className="m-0 font-display text-xl font-semibold text-ink">Proponer un convenio</h2>
          <p className="m-0 mt-1 text-sm text-secondary">
            {step === 1 ? `Paso 1 de 2 · Elige ${lado === 'empresa' ? 'la institución' : 'la empresa'}` : 'Paso 2 de 2 · Define las condiciones'}
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <input value={filters.q} onChange={setFilter('q')} placeholder={`Buscar ${other} por nombre`} aria-label={`Buscar ${other}`} className={field} autoFocus />
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={filters.ciudad} onChange={setFilter('ciudad')} aria-label="Ciudad" className={field}>
                <option value="">Todas las ciudades</option>
                {options.ciudades.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {lado === 'empresa' ? (
                <input value={filters.programa} onChange={setFilter('programa')} placeholder="Programa que te interesa (ej. Sistemas)" aria-label="Programa" className={field} />
              ) : (
                <select value={filters.sector} onChange={setFilter('sector')} aria-label="Sector" className={field}>
                  <option value="">Todos los sectores</option>
                  {options.sectores.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>
            {lado !== 'empresa' && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={filters.soloVacantes} onChange={setFilter('soloVacantes')} className="size-4 accent-green" />
                Solo empresas con vacantes abiertas
              </label>
            )}

            <div>
              <p className="m-0 mb-2 text-xs text-secondary">
                {results === null ? 'Buscando…' : `${results.length} resultado${results.length === 1 ? '' : 's'}`}
                {hasFilters && (
                  <> · <button type="button" onClick={() => setFilters({ q: '', ciudad: '', sector: '', programa: '', soloVacantes: false })} className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-green-dark hover:underline">Limpiar filtros</button></>
                )}
              </p>
              <ul className="m-0 max-h-72 list-none divide-y divide-line-soft overflow-y-auto rounded-xl border border-line p-0">
                {results && results.length === 0
                  ? <li className="px-4 py-6 text-center text-sm text-secondary">{hasFilters ? 'Ninguna coincide con esos filtros.' : `Aún no hay ${lado === 'empresa' ? 'instituciones aprobadas' : 'empresas aprobadas'}.`}</li>
                  : (results || []).map((o) => <Candidate key={o.id} o={o} lado={lado} onPick={(x) => { setTarget(x); setStep(2); setError(''); }} />)}
              </ul>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3 rounded-xl border border-line px-4 py-3">
              <span>
                <strong className="block text-sm text-ink">{target.nombre}</strong>
                {target.detalle && <span className="text-xs text-secondary">{target.detalle}</span>}
              </span>
              <button type="button" onClick={() => setStep(1)} className="shrink-0 cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-green-dark hover:underline">Cambiar</button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className={label} htmlFor="cv-tipo">Tipo de convenio</label>
                <select id="cv-tipo" value={form.tipo} onChange={set('tipo')} className={field}>{['Pasantía', 'Aprendizaje', 'Laboral'].map((t) => <option key={t}>{t}</option>)}</select></div>
              <div><label className={label} htmlFor="cv-vac">Vacantes proyectadas</label>
                <input id="cv-vac" type="number" min="1" max="500" value={form.vacantes_proyectadas} onChange={set('vacantes_proyectadas')} className={field} /></div>
              <div><label className={label} htmlFor="cv-dur">Duración</label>
                <select id="cv-dur" value={form.duracion_anos} onChange={set('duracion_anos')} className={field}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} año{n > 1 ? 's' : ''}</option>)}</select></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={label} htmlFor="cv-mod">Modalidad de trabajo</label>
                <select id="cv-mod" value={form.modalidad} onChange={set('modalidad')} className={field}>
                  <option value="">Sin definir</option>{Object.entries(MODALIDAD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className={label} htmlFor="cv-rem">Remuneración</label>
                <select id="cv-rem" value={form.remuneracion} onChange={set('remuneracion')} className={field}>
                  <option value="">Sin definir</option>{Object.entries(REMUNERACION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            </div>
            <div><label className={label} htmlFor="cv-prog">Programas o áreas de interés (opcional)</label>
              <input id="cv-prog" value={form.programas} onChange={set('programas')} placeholder="Ej. Ingeniería de Sistemas, Ingeniería Industrial" className={field} /></div>

            <fieldset className="border-none p-0">
              <legend className={label}>Compromisos que ofrecen (opcional)</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(COMPROMISO).map(([k, v]) => (
                  <label key={k} className="flex cursor-pointer items-start gap-2 text-sm text-ink">
                    <input type="checkbox" checked={form.compromisos.includes(k)} onChange={() => toggle(k)} className="mt-0.5 size-4 shrink-0 accent-green" />{v}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={label} htmlFor="cv-rn">Responsable del convenio</label>
                <input id="cv-rn" value={form.responsable_nombre} onChange={set('responsable_nombre')} maxLength={150} placeholder="Nombre de la persona de contacto" className={field} /></div>
              <div><label className={label} htmlFor="cv-rc">Correo o teléfono</label>
                <input id="cv-rc" value={form.responsable_contacto} onChange={set('responsable_contacto')} maxLength={200} className={field} /></div>
            </div>
            <div><label className={label} htmlFor="cv-msg">Mensaje (opcional)</label>
              <textarea id="cv-msg" rows={3} maxLength={1000} value={form.mensaje} onChange={set('mensaje')} placeholder="Cuéntales qué buscan lograr juntos" className={field} /></div>
          </div>
        )}

        {error && <p className="m-0 mt-4 text-sm font-semibold text-rose-700" role="alert">{error}</p>}
        <div className="mt-6 flex items-center justify-between gap-2">
          {step === 2
            ? <button type="button" onClick={() => setStep(1)} className="cursor-pointer rounded-xl border border-line px-4 py-2 text-xs font-bold text-ink hover:bg-page">Atrás</button>
            : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="cursor-pointer rounded-xl border border-line px-4 py-2 text-xs font-bold text-ink hover:bg-page">Cancelar</button>
            {step === 2 && <button type="submit" disabled={busy} className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${accent}`}>{busy ? 'Enviando…' : 'Enviar propuesta'}</button>}
          </div>
        </div>
      </form>
    </div>
  );
}

/** Condiciones de una propuesta: lo básico en una línea y, si se definieron, modalidad, remuneración, compromisos y responsable. */
function Terms({ p }) {
  const extra = [p.modalidad && `Modalidad ${MODALIDAD[p.modalidad]?.toLowerCase()}`, p.remuneracion && REMUNERACION[p.remuneracion]].filter(Boolean);
  return (
    <div className="space-y-0.5 text-xs text-secondary">
      <p className="m-0">{p.tipo} · {p.vacantes_proyectadas} vacante(s) · {p.duracion_anos} año(s){p.programas.length > 0 && <> · {p.programas.join(', ')}</>}</p>
      {extra.length > 0 && <p className="m-0">{extra.join(' · ')}</p>}
      {p.compromisos?.length > 0 && <p className="m-0">Compromisos: {p.compromisos.map((c) => COMPROMISO[c] || c).join('; ')}.</p>}
      {p.responsable && <p className="m-0">Responsable: {[p.responsable.nombre, p.responsable.contacto].filter(Boolean).join(' · ')}</p>}
    </div>
  );
}

/**
 * Propuestas y convenios de una empresa o de una IES. `lado` decide los textos; la lógica es la misma
 * porque cualquiera de las dos partes propone y la otra responde.
 * `onChange` avisa a la página cuando cambia algo (por ejemplo para refrescar contadores).
 */
export default function ConveniosPanel({ lado, accent = 'bg-green-dark hover:bg-green-dark/90', onChange }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(() => convenioService.getMine().then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function respond(id, accion, notas) {
    setBusy(true);
    setError('');
    try {
      await convenioService.respond(id, accion, notas);
      setRejecting(null);
      setReason('');
      setNotice(accion === 'aceptar' ? 'Convenio aceptado: ya está vigente.' : accion === 'rechazar' ? 'Propuesta rechazada.' : 'Propuesta retirada.');
      await load();
      onChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) return <p className="m-0 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" role="alert">{error}</p>;
  if (!data) return <Empty>Cargando convenios…</Empty>;

  const open = data.propuestas.filter((p) => ['pendiente', 'en_revision'].includes(p.estado));
  const received = open.filter((p) => p.direccion === 'recibida');
  const sent = open.filter((p) => p.direccion === 'enviada');
  const history = data.propuestas.filter((p) => !['pendiente', 'en_revision'].includes(p.estado));
  const other = lado === 'empresa' ? 'la institución' : 'la empresa';

  return (
    <div className="space-y-9">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 max-w-xl text-sm text-secondary">
          Un convenio formaliza el trabajo conjunto entre {lado === 'empresa' ? 'tu empresa y una institución' : 'tu institución y una empresa'}.
          {lado === 'empresa' && ' Con un convenio vigente puedes publicar vacantes exclusivas para sus egresados.'}
        </p>
        <button type="button" onClick={() => { setNotice(''); setModal(true); }} className={`rounded-xl px-4 py-2.5 text-xs font-bold text-white cursor-pointer ${accent}`}>Proponer convenio</button>
      </div>
      {notice && <p className="m-0 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800" role="status">{notice}</p>}
      {error && <p className="m-0 text-sm font-semibold text-rose-700" role="alert">{error}</p>}

      <Block title="Propuestas recibidas" hint={`Te las envió ${other}: acéptalas o recházalas con un motivo.`}>
        {received.length === 0 ? <Empty>No tienes propuestas por responder.</Empty> : (
          <ul className="m-0 list-none space-y-3 p-0">
            {received.map((p) => (
              <li key={p.id} className="rounded-2xl border border-line bg-white p-5 shadow-2xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><h3 className="m-0 font-display text-sm font-bold text-ink">{p.contraparte.nombre}</h3><p className="m-0 text-xs text-secondary">{p.contraparte.detalle}</p></div>
                  <span className="text-xs text-secondary">{date(p.creada_en)}</span>
                </div>
                <div className="mt-2"><Terms p={p} /></div>
                {p.mensaje && <p className="m-0 mt-3 rounded-xl bg-page/70 px-3.5 py-2.5 text-sm text-ink">{p.mensaje}</p>}
                {rejecting === p.id ? (
                  <div className="mt-4 space-y-2">
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={1000} aria-label="Motivo del rechazo" placeholder="Cuéntales por qué (obligatorio)" className={field} />
                    <div className="flex gap-2">
                      <button type="button" disabled={busy || !reason.trim()} onClick={() => respond(p.id, 'rechazar', reason)} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer">Rechazar</button>
                      <button type="button" onClick={() => { setRejecting(null); setReason(''); }} className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-ink cursor-pointer">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <button type="button" disabled={busy} onClick={() => respond(p.id, 'aceptar')} className={`rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer ${accent}`}>Aceptar</button>
                    <button type="button" disabled={busy} onClick={() => setRejecting(p.id)} className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-ink hover:bg-page cursor-pointer">Rechazar</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Convenios vigentes">
        {data.convenios.length === 0 ? <Empty>Aún no tienes convenios. Propón uno o acepta una propuesta.</Empty> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.convenios.map((c) => (
              <div key={c.id} className="rounded-2xl border border-line bg-white p-5 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="m-0 font-display text-sm font-bold text-ink">{c.contraparte.nombre}</h3>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold ${c.vigente ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-line bg-page text-secondary'}`}>{c.vigente ? 'Vigente' : 'Vencido'}</span>
                </div>
                <p className="m-0 mt-0.5 text-xs text-secondary">{c.tipo} · {c.codigo}</p>
                <p className="m-0 mt-3 text-xs text-secondary">Vence el <strong className="text-ink">{date(c.vence)}</strong> · <strong className="text-ink">{c.vacantes}</strong> vacante(s) exclusiva(s)</p>
              </div>
            ))}
          </div>
        )}
      </Block>

      {sent.length > 0 && (
        <Block title="Propuestas enviadas" hint="Esperando la respuesta de la otra parte.">
          <ul className="m-0 list-none space-y-3 p-0">
            {sent.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-2xs">
                <div><h3 className="m-0 font-display text-sm font-bold text-ink">{p.contraparte.nombre}</h3><Terms p={p} /></div>
                <div className="flex items-center gap-3 text-xs text-secondary"><span>{date(p.creada_en)}</span>
                  <button type="button" disabled={busy} onClick={() => respond(p.id, 'retirar')} className="font-bold text-rose-600 hover:underline cursor-pointer disabled:opacity-50">Retirar</button></div>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {history.length > 0 && (
        <Block title="Historial">
          <ul className="m-0 list-none divide-y divide-line-soft rounded-2xl border border-line bg-white p-0">
            {history.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span><strong className="text-ink">{p.contraparte.nombre}</strong> <span className="text-xs text-secondary">· {p.direccion === 'enviada' ? 'enviada' : 'recibida'} · {date(p.respondida_en || p.creada_en)}</span>
                  {p.respuesta && <span className="block text-xs text-secondary">«{p.respuesta}»</span>}</span>
                <span className={`text-xs font-bold ${p.estado === 'aprobada' ? 'text-emerald-700' : 'text-secondary'}`}>{ESTADO[p.estado] || p.estado}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {modal && <ProposalModal lado={lado} accent={accent} onClose={() => setModal(false)} onSent={() => { setModal(false); setNotice('Propuesta enviada. Le avisamos por correo.'); load(); onChange?.(); }} />}
    </div>
  );
}
