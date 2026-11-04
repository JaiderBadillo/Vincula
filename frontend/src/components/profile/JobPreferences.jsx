import { useState } from 'react';
import {
  contractTypes,
  workModes,
  COLOMBIAN_LOCATIONS,
} from '../../data/profile.js';
import { Pill, SectionCard, Toggle, inputClass } from './ui.jsx';

const modeIcons = { Remoto: 'bx-wifi', Híbrido: 'bx-transfer-alt', Presencial: 'bx-buildings' };
const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function toggleIn(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function JobPreferences({ profile, updateProfile }) {
  const prefs = profile.preferences;
  const set = (changes) => updateProfile((p) => ({ ...p, preferences: { ...p.preferences, ...changes } }));

  const [selectedDept, setSelectedDept] = useState('Santander');
  const [selectedCity, setSelectedCity] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [isManualInput, setIsManualInput] = useState(false);

  const departments = Object.keys(COLOMBIAN_LOCATIONS);
  const availableCities = selectedDept ? COLOMBIAN_LOCATIONS[selectedDept] || [] : [];

  function setSalary(key, raw) {
    const value = Number(String(raw).replace(/\D/g, '')) || 0;
    set({ [key]: value });
  }

  function handleAddCity(cityToAdd = selectedCity) {
    const clean = String(cityToAdd).trim();
    if (!clean) return;
    if (!prefs.cities.includes(clean)) {
      set({ cities: [...prefs.cities, clean] });
    }
    setSelectedCity('');
    setCustomCity('');
  }

  function handleRemoveCity(cityToRemove) {
    set({ cities: prefs.cities.filter((c) => c !== cityToRemove) });
  }

  const salaryError = prefs.salaryMax > 0 && prefs.salaryMin > prefs.salaryMax;

  // Ciudades sugeridas rápidas para añadir con 1 clic si no están seleccionadas
  const quickSuggestions = [
    'Bucaramanga',
    'Floridablanca',
    'Girón',
    'Piedecuesta',
    'Barrancabermeja',
    'Bogotá D.C.',
    'Medellín',
    'Cali',
    'Barranquilla',
    'Cúcuta',
  ]
    .filter((c) => !prefs.cities.includes(c))
    .slice(0, 5);

  return (
    <SectionCard
      id="preferencias"
      icon="bx-target-lock"
      tone="amber"
      title="Preferencias laborales"
      subtitle="Configura tus expectativas salariales, modalidades y ubicaciones geográficas de interés."
    >
      <div className="space-y-6">
        {/* Aspiración Salarial */}
        <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-4 shadow-2xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-800">
              <i className="bx bx-wallet text-base" aria-hidden="true" />
              Aspiración salarial mensual
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
                  className={`w-full rounded-lg border bg-white px-3 py-2 font-display text-sm font-bold text-ink outline-none focus:ring-4 focus:ring-amber-100 ${
                    salaryError ? 'border-rose-400' : 'border-amber-200 focus:border-amber-400'
                  }`}
                  value={prefs[key] ? currency.format(prefs[key]) : ''}
                  placeholder="$ 0"
                  onChange={(e) => setSalary(key, e.target.value)}
                />
              </label>
            ))}
          </div>
          {salaryError && (
            <p className="m-0 mt-1.5 text-xs font-bold text-rose-600">
              El valor mínimo no puede superar al máximo.
            </p>
          )}
          <div className="mt-3">
            <Toggle
              label="Mostrar a reclutadores"
              description="Si lo ocultas, solo se usará internamente para calcular compatibilidad con ofertas."
              checked={prefs.showSalary}
              onChange={(v) => set({ showSalary: v })}
            />
          </div>
        </div>

        {/* Modalidad de Trabajo */}
        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-secondary">
            Modalidad de trabajo deseada
          </span>
          <div className="flex flex-wrap gap-2">
            {workModes.map((m) => (
              <Pill
                key={m}
                icon={modeIcons[m]}
                active={prefs.modes.includes(m)}
                onClick={() => set({ modes: toggleIn(prefs.modes, m) })}
              >
                {m}
              </Pill>
            ))}
          </div>
        </div>

        {/* Tipo de Contrato */}
        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-secondary">
            Tipo de contrato de interés
          </span>
          <div className="flex flex-wrap gap-2">
            {contractTypes.map((c) => (
              <Pill
                key={c}
                icon="bx-file"
                active={prefs.contracts.includes(c)}
                onClick={() => set({ contracts: toggleIn(prefs.contracts, c) })}
              >
                {c}
              </Pill>
            ))}
          </div>
        </div>

        {/* CIUDADES DE INTERÉS CON LISTA DESPLEGABLE (DEPARTAMENTO Y CIUDAD) */}
        <div className="rounded-2xl border border-line bg-page p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#051F26]">
              <i className="bx bx-map-pin text-base text-[#051F26]" aria-hidden="true" />
              Ciudades de interés para trabajar
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-800 border border-emerald-200">
                <i className="bx bx-check-circle" />
                32 Dptos + Bogotá D.C.
              </span>
              <span className="text-[0.68rem] font-bold text-secondary">
                {prefs.cities.length} seleccionada{prefs.cities.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <p className="m-0 text-xs text-secondary mb-3">
            Filtra por departamento para desplegar todos sus municipios o escribe una ubicación personalizada para postularte.
          </p>

          {/* Formulario desplegable: Departamento y Ciudad */}
          <div className="grid gap-2 sm:grid-cols-12 items-end">
            <div className="sm:col-span-5">
              <label className="block">
                <span className="mb-1 block text-[0.65rem] font-bold uppercase text-secondary">
                  Departamento
                </span>
                <select
                  className={`${inputClass} text-xs font-semibold`}
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setSelectedCity('');
                  }}
                  aria-label="Seleccionar departamento"
                >
                  <option value="">Selecciona departamento...</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="sm:col-span-5">
              {isManualInput ? (
                <label className="block">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[0.65rem] font-bold uppercase text-secondary">
                      Municipio / Vereda manual
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsManualInput(false)}
                      className="text-[0.65rem] font-semibold text-[#051F26] hover:underline"
                    >
                      Volver a la lista
                    </button>
                  </div>
                  <input
                    type="text"
                    className={`${inputClass} text-xs font-semibold`}
                    placeholder={`Ej: ${selectedDept ? selectedDept + ' - ' : ''}Municipio o vereda...`}
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customCity.trim()) handleAddCity(customCity);
                      }
                    }}
                    aria-label="Escribir municipio manualmente"
                  />
                </label>
              ) : (
                <label className="block">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[0.65rem] font-bold uppercase text-secondary">
                      Ciudad / Municipio
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsManualInput(true)}
                      className="text-[0.65rem] font-semibold text-secondary hover:text-[#051F26] hover:underline"
                    >
                      + Escribir otro
                    </button>
                  </div>
                  <select
                    className={`${inputClass} text-xs font-semibold`}
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    disabled={!selectedDept}
                    aria-label="Seleccionar ciudad"
                  >
                    <option value="">
                      {selectedDept
                        ? `Selecciona municipio de ${selectedDept}...`
                        : 'Primero elige departamento...'}
                    </option>
                    {selectedDept && (
                      <option value={`Todo el departamento (${selectedDept})`}>
                        Todo el departamento ({selectedDept})
                      </option>
                    )}
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                disabled={isManualInput ? !customCity.trim() : !selectedCity}
                onClick={() => handleAddCity(isManualInput ? customCity : selectedCity)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-control bg-[#051F26] px-3.5 py-2.5 text-xs font-bold text-white transition-all hover:bg-[#0b2b34] disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                <i className="bx bx-plus text-base" />
                Agregar
              </button>
            </div>
          </div>

          {/* Chips de Ciudades Seleccionadas */}
          <div className="mt-4 pt-3 border-t border-line-soft">
            <span className="block text-[0.68rem] font-bold uppercase text-secondary mb-2">
              Tus ciudades guardadas:
            </span>
            {prefs.cities.length === 0 ? (
              <p className="m-0 text-xs text-body-muted italic">
                Aún no has agregado ciudades. Si no seleccionas ninguna, se considerará disponibilidad para cualquier ciudad del país.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {prefs.cities.map((city) => (
                  <span
                    key={city}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-[#051F26] shadow-2xs group"
                  >
                    <i className="bx bx-map-pin text-[#051F26]" />
                    <span>{city}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCity(city)}
                      className="ml-1 grid size-4.5 place-items-center rounded-full text-secondary hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title={`Eliminar ${city}`}
                      aria-label={`Eliminar ${city}`}
                    >
                      <i className="bx bx-x text-sm" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Accesos rápidos sugeridos */}
            {quickSuggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[0.68rem] font-semibold text-secondary mr-1">
                  Sugeridas frecuentes:
                </span>
                {quickSuggestions.map((sugg) => (
                  <button
                    key={sugg}
                    type="button"
                    onClick={() => handleAddCity(sugg)}
                    className="rounded-full border border-dashed border-line bg-white px-2.5 py-0.5 text-[0.7rem] font-medium text-secondary hover:border-[#051F26]/40 hover:text-[#051F26] transition-colors"
                  >
                    + {sugg}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle de Reubicación */}
          <div className="mt-4 pt-3 border-t border-line-soft">
            <Toggle
              label="Dispuesto a reubicarme geográficamente"
              description="Indica a las empresas de otras regiones que estás abierto a trasladarte de ciudad."
              checked={prefs.relocate}
              onChange={(v) => set({ relocate: v })}
            />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
