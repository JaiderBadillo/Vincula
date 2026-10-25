import { availabilityOptions, cityOptions, contractTypes, workModes } from '../../data/profile.js';
import { Pill, SectionCard, Toggle } from './ui.jsx';

const modeIcons = { Remoto: 'bx-wifi', Híbrido: 'bx-transfer-alt', Presencial: 'bx-buildings' };
const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function toggleIn(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function JobPreferences({ profile, updateProfile }) {
  const prefs = profile.preferences;
  const set = (changes) => updateProfile((p) => ({ ...p, preferences: { ...p.preferences, ...changes } }));

  function setSalary(key, raw) {
    const value = Number(String(raw).replace(/\D/g, '')) || 0;
    set({ [key]: value });
  }

  const salaryError = prefs.salaryMax > 0 && prefs.salaryMin > prefs.salaryMax;

  return (
    <SectionCard
      id="preferencias"
      icon="bx-target-lock"
      tone="amber"
      title="Preferencias laborales"
      subtitle="Usamos esto para recomendarte vacantes y para que los reclutadores sepan qué buscas."
    >
      <div className="space-y-5">
        {/* Salary */}
        <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-800">
              <i className="bx bx-wallet text-base" aria-hidden="true" />Aspiración salarial mensual
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'salaryMin', label: 'Desde' },
              { key: 'salaryMax', label: 'Hasta' },
            ].map(({ key, label }) => (
              <label key={key} className="block">
                <span className="mb-1 block text-[0.65rem] font-bold uppercase text-secondary">{label}</span>
                <input
                  inputMode="numeric"
                  className={`w-full rounded-lg border bg-white px-3 py-2 font-display text-sm font-bold text-ink outline-none focus:ring-4 focus:ring-amber-100 ${salaryError ? 'border-rose-400' : 'border-amber-200 focus:border-amber-400'}`}
                  value={prefs[key] ? currency.format(prefs[key]) : ''}
                  placeholder="$ 0"
                  onChange={(e) => setSalary(key, e.target.value)}
                />
              </label>
            ))}
          </div>
          {salaryError && <p className="m-0 mt-1.5 text-xs font-bold text-rose-600">El valor mínimo no puede superar al máximo.</p>}
          <div className="mt-3">
            <Toggle
              label="Mostrar a reclutadores"
              description="Si lo ocultas, solo se usa para tus recomendaciones."
              checked={prefs.showSalary}
              onChange={(v) => set({ showSalary: v })}
            />
          </div>
        </div>

        {/* Mode */}
        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-secondary">Modalidad</span>
          <div className="flex flex-wrap gap-2">
            {workModes.map((m) => (
              <Pill key={m} icon={modeIcons[m]} active={prefs.modes.includes(m)} onClick={() => set({ modes: toggleIn(prefs.modes, m) })}>{m}</Pill>
            ))}
          </div>
        </div>

        {/* Contract */}
        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-secondary">Tipo de contrato</span>
          <div className="flex flex-wrap gap-2">
            {contractTypes.map((c) => (
              <Pill key={c} icon="bx-file" active={prefs.contracts.includes(c)} onClick={() => set({ contracts: toggleIn(prefs.contracts, c) })}>{c}</Pill>
            ))}
          </div>
        </div>

        {/* Cities */}
        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-secondary">Ciudades de interés</span>
          <div className="flex flex-wrap gap-1.5">
            {cityOptions.map((c) => {
              const active = prefs.cities.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set({ cities: toggleIn(prefs.cities, c) })}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${active ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-line text-secondary hover:border-sky-200 hover:text-ink'}`}
                >
                  {active && <i className="bx bx-map-pin mr-0.5" aria-hidden="true" />}{c}
                </button>
              );
            })}
          </div>
          <div className="mt-3">
            <Toggle label="Dispuesto a reubicarme" checked={prefs.relocate} onChange={(v) => set({ relocate: v })} />
          </div>
        </div>

        {/* Availability */}
        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-secondary">Disponibilidad para iniciar</span>
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-page p-1">
            {availabilityOptions.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={prefs.availability === a}
                onClick={() => set({ availability: a })}
                className={`rounded-lg py-2 text-xs font-bold transition-all ${prefs.availability === a ? 'bg-white text-ink shadow-sm ring-1 ring-line' : 'text-secondary hover:text-ink'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
