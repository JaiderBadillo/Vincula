import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Marco común de la configuración (todos los roles): menú lateral con las secciones y panel de contenido.
 * `user`: { name, subtitle, avatar, initials, isEntity } · `tabs`: [{ id, title, detail, icon }]
 */
export default function SettingsShell({ open, onClose, titleId, user, tabs, active, onChange, theme, error, success, footer, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', escape); };
  }, [open, onClose]);

  if (!open) return null;
  const current = tabs.find((tab) => tab.id === active) || tabs[0];

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={onClose} data-ies-theme={theme}
      className="fixed inset-0 z-[10002] flex items-center justify-center overflow-y-auto bg-ink/60 p-3 backdrop-blur-xs sm:p-6">
      <div onClick={(event) => event.stopPropagation()}
        className="my-auto grid w-full max-w-4xl overflow-hidden rounded-3xl border border-sand-line bg-white shadow-2xl md:grid-cols-[250px_1fr]">
        <aside className="flex flex-col border-b border-sand-line bg-cream/70 p-4 md:border-b-0 md:border-r md:p-5">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <span className={`grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border border-sand-line bg-white ${user.isEntity ? 'p-1' : ''}`}>
                <img src={user.avatar} alt="" className={`size-full ${user.isEntity ? 'object-contain' : 'object-cover object-center'}`} />
              </span>
            ) : (
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-cocoa text-xs font-bold text-ochre">{user.initials || 'ID'}</span>
            )}
            <div className="min-w-0">
              <p className="m-0 truncate font-display text-sm font-bold text-ink">{user.name}</p>
              <p className="m-0 truncate text-[0.7rem] text-secondary">{user.subtitle}</p>
            </div>
          </div>

          <nav aria-label="Secciones de configuración" className="-mx-1 mt-4 flex gap-1 overflow-x-auto px-1 md:mx-0 md:mt-6 md:flex-col md:overflow-visible md:px-0">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" aria-current={active === tab.id ? 'page' : undefined} onClick={() => onChange(tab.id)}
                className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors ${active === tab.id ? 'bg-white text-green-dark shadow-xs ring-1 ring-sand-line' : 'text-secondary hover:bg-white/70 hover:text-ink'}`}>
                <i className={`bx ${tab.icon} text-lg`} aria-hidden="true" />
                <span>{tab.title}</span>
              </button>
            ))}
          </nav>
          {footer && <div className="mt-auto hidden pt-6 md:block">{footer}</div>}
        </aside>

        <section className="flex min-h-[480px] min-w-0 flex-col md:min-h-[560px]">
          <header className="flex items-start justify-between gap-3 border-b border-sand-line px-6 py-5">
            <div>
              <h2 id={titleId} className="m-0 font-display text-lg font-bold text-ink">{current.title}</h2>
              <p className="m-0 mt-0.5 text-xs text-secondary">{current.detail}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar configuración"
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl text-2xl text-secondary hover:bg-sand/50"><i className="bx bx-x" /></button>
          </header>
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
            {error && <p role="alert" className="rounded-xl border border-terracotta/30 bg-terracotta/10 p-3 text-xs text-terracotta-dark">{error}</p>}
            {success && <p role="status" className="rounded-xl border border-green/20 bg-green/10 p-3 text-xs text-green-dark">{success}</p>}
            {children}
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
