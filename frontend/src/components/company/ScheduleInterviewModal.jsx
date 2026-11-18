import { useState } from 'react';

const DURATIONS = [30, 45, 60, 90];
const input = 'w-full rounded-xl border border-sand-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-terracotta';
const label = 'mb-1.5 block text-[0.7rem] font-bold uppercase tracking-wider text-secondary';

const pad = (n) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

/** 600 minutos → '10:00 AM' (el formato que guarda y muestra el backend). */
function to12h(total) {
  const h = Math.floor(total / 60);
  return `${h % 12 || 12}:${pad(total % 60)} ${h < 12 ? 'AM' : 'PM'}`;
}

/** '14:30' + 60 → { range: '2:30 PM - 3:30 PM', sameDay } */
export function buildTimeRange(start, minutes) {
  const [h, m] = start.split(':').map(Number);
  const from = h * 60 + m;
  return { range: `${to12h(from)} - ${to12h((from + minutes) % 1440)}`, sameDay: from + minutes < 1440 };
}

export default function ScheduleInterviewModal({ candidate, onClose, onSubmit }) {
  const [modality, setModality] = useState('Virtual');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [ownLink, setOwnLink] = useState(false);
  const [place, setPlace] = useState('');
  const [objective, setObjective] = useState('Entrevista de selección');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const virtual = modality === 'Virtual';
  const slot = time ? buildTimeRange(time, duration) : null;
  const inPast = date === today() && time && new Date(`${date}T${time}`) < new Date();
  const problem = !date ? 'Elige la fecha.' : !time ? 'Elige la hora.' : !slot.sameDay ? 'La entrevista debe terminar el mismo día.'
    : inPast ? 'Esa hora ya pasó.' : !objective.trim() ? 'Escribe el objetivo.'
    : virtual && ownLink && !/^https?:\/\/\S+$/.test(place.trim()) ? 'Pega un enlace que empiece por https://.'
    : !virtual && place.trim().length < 5 ? 'Indica el lugar: dirección y sala.' : '';

  async function submit(event) {
    event.preventDefault();
    if (problem) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit({
        fecha_entrevista: date,
        franja_horaria: slot.range,
        modalidad: modality,
        url_reunion: virtual && !ownLink ? null : place.trim(),
        objetivo: objective.trim(),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="schedule-title">
      <div className="fixed inset-0 bg-cocoa/60" onClick={onClose} aria-hidden="true" />
      <form onSubmit={submit} className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-sand-line bg-white p-6 shadow-xl">
        <h2 id="schedule-title" className="m-0 font-display text-lg font-bold text-ink">Citar a entrevista</h2>
        <p className="m-0 mt-1 text-sm text-secondary">{candidate.candidateName} · {candidate.vacancyTitle}</p>

        <div className="mt-5 grid gap-4">
          <fieldset className="m-0 border-0 p-0">
            <legend className={label}>Modalidad</legend>
            <div className="grid grid-cols-2 gap-2">
              {[['Virtual', 'bx-video', 'Videollamada'], ['Presencial', 'bx-map', 'En un lugar']].map(([value, icon, hint]) => (
                <button key={value} type="button" onClick={() => { setModality(value); setPlace(''); setOwnLink(false); }} aria-pressed={modality === value}
                  className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-colors cursor-pointer ${modality === value ? 'border-terracotta bg-terracotta/10' : 'border-sand-line hover:border-terracotta/40'}`}>
                  <i className={`bx ${icon} text-xl text-terracotta`} aria-hidden="true" />
                  <span><strong className="block text-sm text-ink">{value}</strong><span className="text-[0.7rem] text-secondary">{hint}</span></span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <label className={label} htmlFor="iv-date">Fecha</label>
              <input id="iv-date" type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} className={input} required />
            </div>
            <div>
              <label className={label} htmlFor="iv-time">Hora de inicio</label>
              <input id="iv-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={input} required />
            </div>
            <div>
              <label className={label} htmlFor="iv-dur">Duración</label>
              <select id="iv-dur" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={input}>
                {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>
          {slot && <p className="m-0 -mt-2 text-xs text-secondary">Horario: <strong className="text-ink">{slot.range}</strong> (hora de Colombia)</p>}

          {virtual ? (
            <fieldset className="m-0 border-0 p-0">
              <legend className={label}>Enlace de la reunión</legend>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input type="radio" name="link" checked={!ownLink} onChange={() => { setOwnLink(false); setPlace(''); }} className="accent-[#c4572a]" />
                Generar un enlace automáticamente
              </label>
              <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input type="radio" name="link" checked={ownLink} onChange={() => setOwnLink(true)} className="accent-[#c4572a]" />
                Usar mi propio enlace (Meet, Zoom, Teams)
              </label>
              {ownLink && <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" aria-label="Enlace de la reunión" maxLength={300} className={`${input} mt-2`} />}
            </fieldset>
          ) : (
            <div>
              <label className={label} htmlFor="iv-place">Lugar</label>
              <input id="iv-place" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={300} placeholder="Dirección, piso y sala · Ej. Calle 5 #3-20, oficina 402" className={input} />
            </div>
          )}

          <div>
            <label className={label} htmlFor="iv-goal">Objetivo</label>
            <input id="iv-goal" value={objective} onChange={(e) => setObjective(e.target.value)} maxLength={200} className={input} />
          </div>

          <p className="m-0 rounded-xl bg-cream px-3.5 py-2.5 text-xs text-secondary">
            <i className="bx bx-envelope mr-1 align-middle text-sm text-terracotta" aria-hidden="true" />
            Se enviará un correo a <strong className="text-ink">{candidate.email || 'el egresado'}</strong> con la fecha, la hora y {virtual ? 'el enlace para unirse' : 'el lugar'}, y un botón para que <strong className="text-ink">confirme su asistencia</strong>. Tú recibirás un correo con su respuesta.
          </p>
          {(error || (problem && date)) && <p className="m-0 text-sm font-semibold text-rose-700" role="alert">{error || problem}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-sand-line bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-sand cursor-pointer">Cancelar</button>
          <button type="submit" disabled={Boolean(problem) || busy} className="rounded-xl bg-terracotta px-4 py-2 text-xs font-bold text-white hover:bg-terracotta-dark disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
            {busy ? 'Agendando…' : 'Agendar y enviar correo'}
          </button>
        </div>
      </form>
    </div>
  );
}
