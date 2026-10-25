import { Toggle } from './ui.jsx';

export default function VisibilityCard({ profile, updateProfile, notify }) {
  const setPrivacy = (changes) => updateProfile((p) => ({ ...p, privacy: { ...p.privacy, ...changes } }));

  function toggleOpenToWork(value) {
    updateProfile((p) => ({ ...p, openToWork: value }));
    notify(value ? 'Ahora las empresas saben que estás disponible.' : 'Ocultaste tu disponibilidad.');
  }

  return (
    <section id="visibilidad" aria-labelledby="visibility-title" className="profile-card overflow-hidden rounded-[1.25rem] border border-line bg-white shadow-card">
      {/* Image header */}
      <div className="relative h-44 overflow-hidden bg-ink">
        <img src="/images/profile/open-to-work.jpg" alt="" className="profile-zoom-img absolute inset-0 size-full object-cover object-[60%_30%]" loading="lazy" decoding="async" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white">
          <div>
            <p className="m-0 mb-1 inline-flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white/80">
              <span className={`size-2 rounded-full ${profile.openToWork ? 'animate-pulse bg-lime' : 'bg-white/40'}`} aria-hidden="true" />
              {profile.openToWork ? 'Visible para empresas' : 'No disponible'}
            </p>
            <h2 id="visibility-title" className="m-0 font-display text-lg font-semibold leading-tight">Disponible para trabajar</h2>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer" aria-label="Disponible para trabajar">
            <input type="checkbox" role="switch" className="peer sr-only" checked={profile.openToWork} onChange={(e) => toggleOpenToWork(e.target.checked)} />
            <span className="h-7 w-12 rounded-full border border-white/30 bg-white/20 backdrop-blur transition-colors peer-checked:border-lime peer-checked:bg-lime" />
            <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5 peer-checked:bg-ink" />
          </label>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {profile.openToWork && (
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-secondary">¿Quién ve tu disponibilidad?</legend>
            <div className="grid gap-2">
              {[
                { id: 'recruiters', icon: 'bx-lock-alt', title: 'Solo reclutadores', desc: 'Discreto: tu empleador actual no lo verá.' },
                { id: 'all', icon: 'bx-globe', title: 'Todos', desc: 'Muestra el anillo #Disponible en tu foto.' },
              ].map((opt) => {
                const active = profile.openToWorkVisibility === opt.id;
                return (
                  <label key={opt.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${active ? 'border-green bg-green/[0.05] ring-1 ring-green/20' : 'border-line hover:border-ink/25'}`}>
                    <input type="radio" name="otw-visibility" className="sr-only" checked={active} onChange={() => updateProfile((p) => ({ ...p, openToWorkVisibility: opt.id }))} />
                    <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-base ${active ? 'bg-green text-white' : 'bg-panel text-blue-muted'}`} aria-hidden="true">
                      <i className={`bx ${opt.icon}`} />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-ink">{opt.title}</span>
                      <span className="block text-xs text-body-muted">{opt.desc}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="space-y-4 border-t border-line-soft pt-4">
          <Toggle
            label="Perfil visible en búsquedas"
            description="Las empresas aliadas pueden encontrarte aunque no te hayas postulado."
            checked={profile.privacy.visibleToCompanies}
            onChange={(v) => setPrivacy({ visibleToCompanies: v })}
          />
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-ink">Mostrar mis datos de contacto</span>
            <select
              className="w-full rounded-control border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-green"
              value={profile.privacy.showContact}
              onChange={(e) => setPrivacy({ showContact: e.target.value })}
            >
              <option value="applications">Solo a empresas donde me postulé</option>
              <option value="all">A todas las empresas verificadas</option>
              <option value="none">A nadie (me contactan por la plataforma)</option>
            </select>
          </div>
          <Toggle
            label="Alertas de vacantes compatibles"
            description="Te avisamos por correo cuando haya ofertas que encajen con tus preferencias."
            checked={profile.alerts.enabled}
            onChange={(v) => updateProfile((p) => ({ ...p, alerts: { ...p.alerts, enabled: v } }))}
          />
          {profile.alerts.enabled && (
            <div className="flex gap-1.5 rounded-full bg-page p-1" role="radiogroup" aria-label="Frecuencia de alertas">
              {['Inmediata', 'Diaria', 'Semanal'].map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={profile.alerts.frequency === f}
                  onClick={() => updateProfile((p) => ({ ...p, alerts: { ...p.alerts, frequency: f } }))}
                  className={`flex-1 rounded-full py-1.5 text-xs font-bold transition-all ${profile.alerts.frequency === f ? 'bg-white text-ink shadow-sm' : 'text-secondary hover:text-ink'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
