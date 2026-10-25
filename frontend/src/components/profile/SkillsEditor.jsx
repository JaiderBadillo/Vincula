import { useState } from 'react';
import { languageLevels, skillLevels, skillSuggestions } from '../../data/profile.js';
import { SectionCard, inputClass } from './ui.jsx';

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
          className={`h-3 w-1.5 rounded-full transition-colors ${n <= level ? 'bg-green' : 'bg-line hover:bg-green/40'}`}
        />
      ))}
    </span>
  );
}

export default function SkillsEditor({ profile, updateProfile, notify }) {
  const [tab, setTab] = useState('tech');
  const [name, setName] = useState('');
  const [level, setLevel] = useState(2);
  const [langName, setLangName] = useState('');
  const [langLevel, setLangLevel] = useState('B1');

  const skills = profile.skills ?? [];
  const visible = skills.filter((s) => s.type === tab);
  const existing = new Set(skills.map((s) => s.name.toLowerCase()));
  const suggestions = skillSuggestions[tab].filter((s) => !existing.has(s.toLowerCase())).slice(0, 6);

  function addSkill(skillName = name, skillLevel = level) {
    const clean = skillName.trim();
    if (!clean) return;
    if (existing.has(clean.toLowerCase())) return notify('Esa habilidad ya está en tu perfil.', 'error');
    if (skills.length >= MAX_SKILLS) return notify(`Máximo ${MAX_SKILLS} habilidades.`, 'error');
    updateProfile((p) => ({ ...p, skills: [...p.skills, { id: `s-${Date.now()}`, name: clean, level: skillLevel, type: tab }] }));
    setName('');
  }

  const updateSkill = (id, changes) => updateProfile((p) => ({ ...p, skills: p.skills.map((s) => (s.id === id ? { ...s, ...changes } : s)) }));
  const removeSkill = (id) => updateProfile((p) => ({ ...p, skills: p.skills.filter((s) => s.id !== id) }));

  function addLanguage() {
    const clean = langName.trim();
    if (!clean) return;
    if (profile.languages.some((l) => l.name.toLowerCase() === clean.toLowerCase())) return notify('Ese idioma ya está agregado.', 'error');
    updateProfile((p) => ({ ...p, languages: [...p.languages, { id: `l-${Date.now()}`, name: clean, level: langLevel }] }));
    setLangName('');
  }

  return (
    <SectionCard
      icon="bx-bolt-circle"
      tone="violet"
      title="Habilidades e idiomas"
      subtitle="Las empresas filtran candidatos por estas palabras clave. Ajusta el nivel tocando las barras."
      action={<span className="hidden rounded-full bg-panel px-3 py-1 text-xs font-bold text-blue-muted sm:inline">{skills.length}/{MAX_SKILLS}</span>}
    >
      {/* Tabs */}
      <div className="mb-4 inline-flex rounded-full border border-line bg-page p-1" role="tablist" aria-label="Tipo de habilidad">
        {[
          { id: 'tech', label: 'Técnicas', icon: 'bx-code-alt' },
          { id: 'soft', label: 'Blandas', icon: 'bx-heart' },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${tab === t.id ? 'bg-ink text-white shadow-sm' : 'text-secondary hover:text-ink'}`}
          >
            <i className={`bx ${t.icon} text-sm`} aria-hidden="true" />
            {t.label}
            <span className={`rounded-full px-1.5 text-[0.62rem] ${tab === t.id ? 'bg-white/15' : 'bg-line'}`}>{skills.filter((s) => s.type === t.id).length}</span>
          </button>
        ))}
      </div>

      {/* Skill chips */}
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {visible.length === 0 && <li className="text-sm text-body-muted">Aún no agregas habilidades de este tipo.</li>}
        {visible.map((s) => (
          <li key={s.id} className="profile-chip group inline-flex items-center gap-2.5 rounded-xl border border-line bg-white py-2 pl-3 pr-1.5 shadow-xs transition-all hover:border-violet-300 hover:shadow-sm">
            <span className="text-sm font-semibold text-ink">{s.name}</span>
            <LevelBars level={s.level} name={s.name} onChange={(lv) => updateSkill(s.id, { level: lv })} />
            <span className="hidden text-[0.65rem] font-bold uppercase text-secondary sm:inline">{skillLevels[s.level - 1]}</span>
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

      {/* Add skill */}
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => { e.preventDefault(); addSkill(); }}
      >
        <input
          className={`${inputClass} sm:flex-1`}
          placeholder={tab === 'tech' ? 'Ej.: Python, Power BI, AutoCAD…' : 'Ej.: Liderazgo, Negociación…'}
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nueva habilidad"
        />
        <select className={`${inputClass} sm:w-36`} value={level} onChange={(e) => setLevel(Number(e.target.value))} aria-label="Nivel">
          {skillLevels.map((l, i) => <option key={l} value={i + 1}>{l}</option>)}
        </select>
        <button type="submit" className="inline-flex items-center justify-center gap-1.5 rounded-control bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700">
          <i className="bx bx-plus text-base" aria-hidden="true" />Agregar
        </button>
      </form>

      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold text-secondary">
            <i className="bx bxs-magic-wand text-violet-500" aria-hidden="true" />Sugeridas para ti:
          </span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addSkill(s, 2)}
              className="rounded-full border border-dashed border-violet-300 bg-violet-50/60 px-2.5 py-1 text-xs font-semibold text-violet-700 transition-colors hover:border-solid hover:bg-violet-100"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {/* Languages */}
      <div className="mt-6 border-t border-line-soft pt-5">
        <h3 className="m-0 mb-3 flex items-center gap-2 font-display text-sm font-bold text-ink">
          <i className="bx bx-world text-lg text-sky-600" aria-hidden="true" />Idiomas
        </h3>
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
          {profile.languages.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-page px-3 py-2">
              <span className="text-sm font-semibold text-ink">{l.name}</span>
              <span className="flex items-center gap-1">
                <select
                  className="rounded-lg border border-line bg-white px-2 py-1 text-xs font-bold text-sky-700 outline-none focus:border-sky-400"
                  value={l.level}
                  onChange={(e) => updateProfile((p) => ({ ...p, languages: p.languages.map((x) => (x.id === l.id ? { ...x, level: e.target.value } : x)) }))}
                  aria-label={`Nivel de ${l.name}`}
                >
                  {languageLevels.map((lv) => <option key={lv}>{lv}</option>)}
                </select>
                <button
                  type="button"
                  className="grid size-7 place-items-center rounded-md text-secondary hover:bg-rose-50 hover:text-rose-600"
                  onClick={() => updateProfile((p) => ({ ...p, languages: p.languages.filter((x) => x.id !== l.id) }))}
                  aria-label={`Eliminar ${l.name}`}
                >
                  <i className="bx bx-x" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); addLanguage(); }}>
          <input className={`${inputClass} flex-1`} placeholder="Agregar idioma" value={langName} onChange={(e) => setLangName(e.target.value)} aria-label="Nuevo idioma" />
          <select className={`${inputClass} w-24`} value={langLevel} onChange={(e) => setLangLevel(e.target.value)} aria-label="Nivel del idioma">
            {languageLevels.map((lv) => <option key={lv}>{lv}</option>)}
          </select>
          <button type="submit" className="grid w-11 place-items-center rounded-control border border-line text-lg text-ink hover:bg-panel" aria-label="Agregar idioma">
            <i className="bx bx-plus" aria-hidden="true" />
          </button>
        </form>
      </div>
    </SectionCard>
  );
}
