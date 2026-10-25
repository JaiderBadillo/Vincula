import { useState } from 'react';
import { Field, GhostButton, Modal, PrimaryButton, SecondaryButton, SectionCard, inputClass } from './ui.jsx';

const typeMeta = {
  work: { label: 'Empleo', icon: 'bx-briefcase-alt-2', cls: 'bg-ink text-lime' },
  practice: { label: 'Práctica', icon: 'bx-rocket', cls: 'bg-amber-100 text-amber-700' },
  education: { label: 'Formación', icon: 'bx-graduation', cls: 'bg-sky-100 text-sky-700' },
  certification: { label: 'Certificación', icon: 'bx-award', cls: 'bg-violet-100 text-violet-700' },
};

const emptyItem = { type: 'work', role: '', company: '', start: '', end: '', current: false, description: '' };

function formatMonth(value) {
  if (!value) return '';
  const [y, m] = value.split('-');
  return new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(+y, +m - 1, 1)));
}

function ExperienceModal({ item, onSave, onClose }) {
  const [draft, setDraft] = useState(item ?? emptyItem);
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const valid = draft.role.trim() && draft.company.trim() && draft.start && (draft.current || draft.end) && (draft.current || draft.end >= draft.start);

  return (
    <Modal
      title={item ? 'Editar registro' : 'Agregar a tu trayectoria'}
      subtitle="Incluye empleos, prácticas, formación o certificaciones relevantes."
      onClose={onClose}
      footer={(
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton icon="bx-check" disabled={!valid} onClick={() => onSave(draft)}>Guardar</PrimaryButton>
        </>
      )}
    >
      <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de registro">
        {Object.entries(typeMeta).map(([key, meta]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={draft.type === key}
            onClick={() => setDraft((d) => ({ ...d, type: key }))}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-all ${draft.type === key ? 'border-ink bg-ink text-white' : 'border-line text-blue-muted hover:border-ink/40'}`}
          >
            <i className={`bx ${meta.icon}`} aria-hidden="true" />{meta.label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={draft.type === 'education' ? 'Título / programa' : draft.type === 'certification' ? 'Nombre del certificado' : 'Cargo'}>
          <input className={inputClass} value={draft.role} onChange={set('role')} />
        </Field>
        <Field label={draft.type === 'education' || draft.type === 'certification' ? 'Institución' : 'Empresa'}>
          <input className={inputClass} value={draft.company} onChange={set('company')} />
        </Field>
        <Field label="Inicio"><input type="month" className={inputClass} value={draft.start} onChange={set('start')} /></Field>
        <Field label="Fin"><input type="month" className={inputClass} value={draft.end} onChange={set('end')} disabled={draft.current} /></Field>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink sm:col-span-2">
          <input type="checkbox" className="size-4 accent-green-700" checked={draft.current} onChange={set('current')} />
          {draft.type === 'education' ? 'Actualmente estudio aquí' : 'Actualmente trabajo aquí'}
        </label>
        <div className="sm:col-span-2">
          <Field label="Descripción y logros" hint="Usa verbos de acción y resultados medibles.">
            <textarea rows={3} maxLength={400} className={`${inputClass} resize-y`} value={draft.description} onChange={set('description')} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export default function ExperienceSection({ profile, updateProfile, notify }) {
  const [editing, setEditing] = useState(null); // null | 'new' | item
  const items = [...(profile.experience ?? [])].sort((a, b) => (b.current - a.current) || (b.start ?? '').localeCompare(a.start ?? ''));

  function save(draft) {
    if (editing === 'new') {
      updateProfile((p) => ({ ...p, experience: [...p.experience, { ...draft, id: `e-${Date.now()}` }] }));
      notify('Registro agregado a tu trayectoria.');
    } else {
      updateProfile((p) => ({ ...p, experience: p.experience.map((x) => (x.id === draft.id ? draft : x)) }));
      notify('Registro actualizado.');
    }
    setEditing(null);
  }

  return (
    <SectionCard
      icon="bx-git-commit"
      tone="sky"
      title="Trayectoria"
      subtitle="Experiencia laboral, prácticas, formación y certificaciones."
      action={<GhostButton icon="bx-plus" onClick={() => setEditing('new')}>Agregar</GhostButton>}
    >
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-page p-6 text-center text-sm text-body-muted">
          ¿Hiciste prácticas o proyectos? Agrégalos: cuentan como experiencia para muchas empresas.
        </div>
      ) : (
        <ol className="profile-timeline relative m-0 list-none p-0">
          {items.map((item) => {
            const meta = typeMeta[item.type] ?? typeMeta.work;
            return (
              <li key={item.id} className="group relative flex gap-4 pb-6 last:pb-0">
                <span className={`relative z-10 grid size-11 shrink-0 place-items-center rounded-xl text-xl shadow-sm ${meta.cls}`} aria-hidden="true">
                  <i className={`bx ${meta.icon}`} />
                </span>
                <div className="min-w-0 flex-1 rounded-xl border border-transparent p-2 -m-2 transition-colors group-hover:border-line group-hover:bg-page">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="m-0 font-display text-sm font-bold text-ink sm:text-base">{item.role}</p>
                        {item.type === 'education' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-700">
                            <i className="bx bxs-badge-check text-xs text-green" aria-hidden="true" />
                            Educación Verificada UTS
                          </span>
                        )}
                      </div>
                      <p className="m-0 text-sm font-semibold text-blue-muted">{item.company}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <button type="button" onClick={() => setEditing(item)} className="grid size-8 place-items-center rounded-lg text-secondary hover:bg-white hover:text-ink" aria-label={`Editar ${item.role}`}>
                        <i className="bx bx-pencil" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { updateProfile((p) => ({ ...p, experience: p.experience.filter((x) => x.id !== item.id) })); notify('Registro eliminado.'); }}
                        className="grid size-8 place-items-center rounded-lg text-secondary hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Eliminar ${item.role}`}
                      >
                        <i className="bx bx-trash" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <p className="m-0 mt-1 flex flex-wrap items-center gap-2 text-xs text-secondary">
                    <span className="rounded-full border border-line bg-white px-2 py-0.5 font-bold">{meta.label}</span>
                    {formatMonth(item.start)} — {item.current ? <strong className="text-green-dark">Actualidad</strong> : formatMonth(item.end)}
                  </p>
                  {item.description && <p className="m-0 mt-2 text-sm leading-6 text-body-muted">{item.description}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {editing && <ExperienceModal item={editing === 'new' ? null : editing} onSave={save} onClose={() => setEditing(null)} />}
    </SectionCard>
  );
}
