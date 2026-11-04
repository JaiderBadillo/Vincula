import { useState } from 'react';
import { Field, GhostButton, Modal, PrimaryButton, SecondaryButton, SectionCard, inputClass } from './ui.jsx';

const typeMeta = {
  work: { label: 'Empleo / Trabajo formal', icon: 'bx-briefcase-alt-2', cls: 'bg-ink text-lime' },
  practice: { label: 'Práctica empresarial', icon: 'bx-rocket', cls: 'bg-[#051F26]/10 text-[#051F26]' },
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
      title={item ? 'Editar experiencia' : 'Agregar experiencia laboral'}
      subtitle="Registra tus empleos formales, puestos actuales o prácticas empresariales realizadas."
      onClose={onClose}
      footer={(
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton icon="bx-check" disabled={!valid} onClick={() => onSave(draft)}>Guardar</PrimaryButton>
        </>
      )}
    >
      <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de experiencia">
        {Object.entries(typeMeta).map(([key, meta]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={draft.type === key}
            onClick={() => setDraft((d) => ({ ...d, type: key }))}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-all ${
              draft.type === key ? 'border-[#051F26] bg-[#051F26] text-white shadow-xs' : 'border-line text-blue-muted hover:border-[#051F26]/40'
            }`}
          >
            <i className={`bx ${meta.icon}`} aria-hidden="true" />
            {meta.label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cargo / Rol desempeñado">
          <input className={inputClass} placeholder="Ej. Desarrollador Junior, Practicante de Sistemas..." value={draft.role} onChange={set('role')} />
        </Field>
        <Field label="Empresa u Organización">
          <input className={inputClass} placeholder="Ej. Tech Solutions S.A.S., Ecopetrol..." value={draft.company} onChange={set('company')} />
        </Field>
        <Field label="Fecha de inicio">
          <input type="month" className={inputClass} value={draft.start} onChange={set('start')} />
        </Field>
        <Field label="Fecha de finalización">
          <input type="month" className={inputClass} value={draft.end} onChange={set('end')} disabled={draft.current} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink sm:col-span-2 cursor-pointer">
          <input type="checkbox" className="size-4 accent-[#051F26]" checked={draft.current} onChange={set('current')} />
          Actualmente trabajo aquí
        </label>
        <div className="sm:col-span-2">
          <Field label="Descripción de funciones y logros" hint="Usa verbos de acción y resultados concretos.">
            <textarea rows={3} maxLength={400} className={`${inputClass} resize-y`} placeholder="Describe brevemente tus responsabilidades principales y logros..." value={draft.description} onChange={set('description')} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export default function ExperienceSection({ profile, updateProfile, notify }) {
  const [editing, setEditing] = useState(null); // null | 'new' | item

  // Filtramos para que estrictamente solo figuren items de tipo laboral o práctica
  const items = [...(profile.experience ?? [])]
    .filter((x) => x.type === 'work' || x.type === 'practice')
    .sort((a, b) => (b.current - a.current) || (b.start ?? '').localeCompare(a.start ?? ''));

  function save(draft) {
    if (editing === 'new') {
      updateProfile((p) => ({ ...p, experience: [...(p.experience ?? []), { ...draft, id: `e-${Date.now()}` }] }));
      notify('Experiencia agregada a tu trayectoria laboral.');
    } else {
      updateProfile((p) => ({ ...p, experience: (p.experience ?? []).map((x) => (x.id === draft.id ? draft : x)) }));
      notify('Experiencia actualizada.');
    }
    setEditing(null);
  }

  return (
    <SectionCard
      id="trayectoria"
      icon="bx-briefcase-alt-2"
      tone="ink"
      title="Trayectoria Laboral"
      subtitle="Experiencias laborales formales y prácticas empresariales."
      action={<GhostButton icon="bx-plus" onClick={() => setEditing('new')}>Agregar experiencia</GhostButton>}
    >
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-page p-6 text-center text-sm text-body-muted">
          ¿Tienes experiencia laboral o prácticas empresariales? Agrégalas aquí: cuentan como experiencia calificada para los reclutadores.
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
                    {formatMonth(item.start)} — {item.current ? <strong className="text-emerald-800">Actualidad</strong> : formatMonth(item.end)}
                  </p>
                  {item.description && <p className="m-0 mt-2 text-xs text-body-muted leading-relaxed">{item.description}</p>}
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
