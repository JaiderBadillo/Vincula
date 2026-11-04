import { useState } from 'react';
import { languageLevels, skillLevels, skillSuggestions } from '../../data/profile.js';
import { SectionCard, inputClass } from './ui.jsx';
import SoftSkillsRadarChart from './SoftSkillsRadarChart.jsx';

const MAX_SKILLS = 20;

function LevelBars({ level, onChange, name }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="group" aria-label={`Nivel de ${name}`}>
      {[1, 2, 3, 4].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          title={skillLevels[n - 1]}
          aria-label={`${skillLevels[n - 1]}`}
          aria-pressed={level === n}
          className={`h-3 w-1.5 rounded-full transition-colors ${
            n <= level ? 'bg-[#051F26]' : 'bg-line hover:bg-[#051F26]/40'
          }`}
        />
      ))}
    </span>
  );
}

export default function SkillsEditor({ profile, updateProfile, notify }) {
  const [tab, setTab] = useState('soft'); // Por defecto 'soft' para destacar las gráficas solicitadas
  const [name, setName] = useState('');
  const [level, setLevel] = useState(2);
  const [langName, setLangName] = useState('');
  const [langLevel, setLangLevel] = useState('B1');

  const skills = profile.skills ?? [];
  const visible = skills.filter((s) => s.type === tab);
  const existing = new Set(skills.map((s) => s.name.toLowerCase()));
  const suggestions = (skillSuggestions[tab] || []).filter((s) => !existing.has(s.toLowerCase())).slice(0, 6);

  function addSkill(skillName = name, skillLevel = level, skillType = tab) {
    const clean = skillName.trim();
    if (!clean) return;
    if (existing.has(clean.toLowerCase())) {
      return notify ? notify('Esa habilidad ya está en tu perfil.', 'error') : null;
    }
    if (skills.length >= MAX_SKILLS) {
      return notify ? notify(`Máximo ${MAX_SKILLS} habilidades permitidas.`, 'error') : null;
    }
    updateProfile((p) => ({
      ...p,
      skills: [...p.skills, { id: `s-${Date.now()}`, name: clean, level: skillLevel, type: skillType }],
    }));
    setName('');
  }

  const updateSkill = (id, changes) =>
    updateProfile((p) => ({
      ...p,
      skills: p.skills.map((s) => (s.id === id ? { ...s, ...changes } : s)),
    }));

  const removeSkill = (id) =>
    updateProfile((p) => ({
      ...p,
      skills: p.skills.filter((s) => s.id !== id),
    }));

  function addLanguage() {
    const clean = langName.trim();
    if (!clean) return;
    if (profile.languages.some((l) => l.name.toLowerCase() === clean.toLowerCase())) {
      return notify ? notify('Ese idioma ya está agregado.', 'error') : null;
    }
    updateProfile((p) => ({
      ...p,
      languages: [...p.languages, { id: `l-${Date.now()}`, name: clean, level: langLevel }],
    }));
    setLangName('');
  }

  return (
    <SectionCard
      icon="bx-bolt-circle"
      tone="ink"
      title="Habilidades e idiomas"
      subtitle="Las empresas filtran candidatos por estas palabras clave. Analiza tus competencias blandas con el radar interactivo."
      action={
        <span className="hidden rounded-full bg-[#051F26]/10 px-3 py-1 text-xs font-bold text-[#051F26] sm:inline">
          {skills.length}/{MAX_SKILLS} habilidades
        </span>
      }
    >
      {/* Selector de pestañas */}
      <div className="mb-5 inline-flex rounded-full border border-line bg-page p-1" role="tablist" aria-label="Tipo de habilidad">
        {[
          { id: 'soft', label: 'Blandas (Con Gráficas)', icon: 'bx-radar' },
          { id: 'tech', label: 'Técnicas', icon: 'bx-code-alt' },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              tab === t.id ? 'bg-[#051F26] text-white shadow-sm' : 'text-secondary hover:text-ink'
            }`}
          >
            <i className={`bx ${t.icon} text-sm`} aria-hidden="true" />
            {t.label}
            <span
              className={`rounded-full px-2 py-0.5 text-[0.62rem] font-bold ${
                tab === t.id ? 'bg-white/20 text-white' : 'bg-line text-secondary'
              }`}
            >
              {skills.filter((s) => s.type === t.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* CONTENIDO PESTAÑA: HABILIDADES BLANDAS CON GRÁFICAS */}
      {tab === 'soft' && (
        <div className="space-y-6">
          {/* Componente Gráfico Radar + Barras de Habilidades Blandas */}
          <SoftSkillsRadarChart
            skills={skills}
            onUpdateSkill={updateSkill}
            onRemoveSkill={removeSkill}
            onAddSkill={(skillName, lvl) => addSkill(skillName, lvl, 'soft')}
            readOnly={false}
          />

          {/* Formulario para agregar una habilidad blanda personalizada */}
          <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
            <span className="text-xs font-bold uppercase tracking-wider text-[#051F26] block mb-2">
              Añadir otra habilidad blanda
            </span>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                addSkill(name, level, 'soft');
              }}
            >
              <input
                className={`${inputClass} sm:flex-1`}
                placeholder="Ej.: Negociación, Inteligencia emocional, Liderazgo de equipos…"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                aria-label="Nueva habilidad blanda"
              />
              <select
                className={`${inputClass} sm:w-36`}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                aria-label="Nivel de dominio"
              >
                {skillLevels.map((l, i) => (
                  <option key={l} value={i + 1}>
                    {l} ({i + 1}/4)
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-control bg-[#051F26] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0b2b34] shadow-xs"
              >
                <i className="bx bx-plus text-base" aria-hidden="true" />
                Agregar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA: HABILIDADES TÉCNICAS */}
      {tab === 'tech' && (
        <div className="space-y-4">
          {/* Lista de chips de habilidades técnicas */}
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {visible.length === 0 && (
              <li className="text-sm text-body-muted py-2">
                Aún no has agregado herramientas técnicas a tu perfil.
              </li>
            )}
            {visible.map((s) => (
              <li
                key={s.id}
                className="profile-chip group inline-flex items-center gap-2.5 rounded-xl border border-line bg-white py-2 pl-3 pr-1.5 shadow-xs transition-all hover:border-[#051F26]/40 hover:shadow-sm"
              >
                <span className="text-sm font-semibold text-ink">{s.name}</span>
                <LevelBars level={s.level} name={s.name} onChange={(lv) => updateSkill(s.id, { level: lv })} />
                <span className="hidden text-[0.65rem] font-bold uppercase text-secondary sm:inline">
                  {skillLevels[s.level - 1]}
                </span>
                <button
                  type="button"
                  onClick={() => removeSkill(s.id)}
                  className="grid size-6 place-items-center rounded-md text-secondary opacity-60 transition-all hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                  aria-label={`Eliminar ${s.name}`}
                >
                  <i className="bx bx-x text-base" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          {/* Formulario de agregar habilidad técnica */}
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              addSkill(name, level, 'tech');
            }}
          >
            <input
              className={`${inputClass} sm:flex-1`}
              placeholder="Ej.: Python, React, PostgreSQL, Docker, AutoCAD, Siigo…"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              aria-label="Nueva habilidad técnica"
            />
            <select
              className={`${inputClass} sm:w-36`}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              aria-label="Nivel"
            >
              {skillLevels.map((l, i) => (
                <option key={l} value={i + 1}>
                  {l}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-control bg-[#051F26] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0b2b34] shadow-xs"
            >
              <i className="bx bx-plus text-base" aria-hidden="true" />
              Agregar
            </button>
          </form>

          {suggestions.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold text-secondary">
                <i className="bx bxs-magic-wand text-[#051F26]" aria-hidden="true" />
                Sugeridas para ti:
              </span>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addSkill(s, 2, 'tech')}
                  className="rounded-full border border-dashed border-[#051F26]/30 bg-[#051F26]/5 px-2.5 py-1 text-xs font-semibold text-[#051F26] transition-colors hover:border-solid hover:bg-[#051F26]/10"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Idiomas */}
      <div className="mt-8 border-t border-line pb-2 pt-5">
        <h3 className="m-0 mb-3 flex items-center gap-2 font-display text-sm font-bold text-ink">
          <i className="bx bx-world text-lg text-[#051F26]" aria-hidden="true" />
          Idiomas y Nivel de Suficiencia
        </h3>
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
          {profile.languages.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-line bg-page px-3 py-2 shadow-2xs"
            >
              <span className="text-sm font-semibold text-ink">{l.name}</span>
              <span className="flex items-center gap-1">
                <select
                  className="rounded-lg border border-line bg-white px-2 py-1 text-xs font-bold text-[#051F26] outline-none focus:border-[#051F26]"
                  value={l.level}
                  onChange={(e) =>
                    updateProfile((p) => ({
                      ...p,
                      languages: p.languages.map((x) => (x.id === l.id ? { ...x, level: e.target.value } : x)),
                    }))
                  }
                  aria-label={`Nivel de ${l.name}`}
                >
                  {languageLevels.map((lv) => (
                    <option key={lv}>{lv}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="grid size-7 place-items-center rounded-md text-secondary hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  onClick={() =>
                    updateProfile((p) => ({
                      ...p,
                      languages: p.languages.filter((x) => x.id !== l.id),
                    }))
                  }
                  aria-label={`Eliminar ${l.name}`}
                >
                  <i className="bx bx-x" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addLanguage();
          }}
        >
          <input
            className={`${inputClass} flex-1`}
            placeholder="Agregar nuevo idioma (Ej.: Inglés, Francés, Alemán…)"
            value={langName}
            onChange={(e) => setLangName(e.target.value)}
            aria-label="Nuevo idioma"
          />
          <select
            className={`${inputClass} w-28`}
            value={langLevel}
            onChange={(e) => setLangLevel(e.target.value)}
            aria-label="Nivel del idioma"
          >
            {languageLevels.map((lv) => (
              <option key={lv}>{lv}</option>
            ))}
          </select>
          <button
            type="submit"
            className="grid w-11 place-items-center rounded-control bg-[#051F26] text-lg text-white hover:bg-[#0b2b34] shadow-xs transition-colors"
            aria-label="Agregar idioma"
          >
            <i className="bx bx-plus" aria-hidden="true" />
          </button>
        </form>
      </div>
    </SectionCard>
  );
}
