import { useEffect, useId } from 'react';

const toneMap = {
  green: 'bg-green/10 text-green-dark',
  sky: 'bg-sky-50 text-sky-700',
  amber: 'bg-amber-50 text-amber-700',
  violet: 'bg-violet-50 text-violet-700',
  rose: 'bg-rose-50 text-rose-700',
  ink: 'bg-ink text-lime',
  terracotta: 'bg-terracotta/10 text-terracotta',
  ochre: 'bg-ochre/15 text-ochre',
};

export function SectionCard({ id, icon, tone = 'green', title, subtitle, action, children, className = '' }) {
  const headingId = useId();
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`profile-card rounded-[1.25rem] border border-line bg-white p-5 shadow-card sm:p-6 ${className}`}
    >
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-xl ${toneMap[tone]}`} aria-hidden="true">
            <i className={`bx ${icon}`} />
          </span>
          <div>
            <h2 id={headingId} className="m-0 font-display text-base font-bold tracking-[-0.02em] text-ink sm:text-lg">{title}</h2>
            {subtitle && <p className="m-0 mt-0.5 text-xs text-body-muted sm:text-sm">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function GhostButton({ icon = 'bx-pencil', children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink transition-all hover:-translate-y-px hover:border-ink hover:bg-ink hover:text-white ${className}`}
      {...props}
    >
      <i className={`bx ${icon} text-sm`} aria-hidden="true" />
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label, description, id }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-5 text-body-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-green peer-focus-visible:ring-4 peer-focus-visible:ring-lime/50" />
        <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function Pill({ active, onClick, children, icon }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-all ${
        active
          ? 'border-ink bg-ink text-white shadow-sm'
          : 'border-line bg-white text-blue-muted hover:border-ink/40 hover:text-ink'
      }`}
    >
      {icon && <i className={`bx ${active ? 'bx-check' : icon} text-sm`} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Modal({ title, subtitle, onClose, children, footer, size = 'max-w-2xl' }) {
  const titleId = useId();

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="fixed inset-0 bg-ink/65 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className={`profile-modal relative flex max-h-[92vh] w-full ${size} flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-hero`}>
        <div className="flex items-start justify-between gap-4 border-b border-line-soft px-6 py-5">
          <div>
            <h2 id={titleId} className="m-0 font-display text-lg font-bold text-ink">{title}</h2>
            {subtitle && <p className="m-0 mt-1 text-xs text-body-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-line text-secondary hover:bg-panel hover:text-ink"
            aria-label="Cerrar"
          >
            <i className="bx bx-x text-2xl" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line-soft bg-page px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export const inputClass =
  'w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10';

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-secondary">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.7rem] text-secondary">{hint}</span>}
    </label>
  );
}

export function PrimaryButton({ children, icon, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-control bg-green px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {icon && <i className={`bx ${icon} text-base`} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-control border border-line bg-white px-5 py-2.5 font-display text-sm font-semibold text-ink transition-colors hover:bg-panel ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
