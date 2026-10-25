export default function ProfileStrength({ score, checks, onAction }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const pending = checks.filter((c) => !c.done);
  const level = score >= 90 ? { label: 'Perfil estelar', cls: 'text-lime' } : score >= 70 ? { label: 'Perfil sólido', cls: 'text-sky-300' } : { label: 'En construcción', cls: 'text-amber-300' };

  return (
    <section aria-labelledby="strength-title" className="profile-card relative overflow-hidden rounded-[1.25rem] bg-ink p-6 text-white shadow-hero">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-lime/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-sky-400/15 blur-3xl" aria-hidden="true" />

      <div className="relative">
        <p className="m-0 inline-flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/60">
          <span className="size-1.5 rounded-full bg-lime" aria-hidden="true" />Fortaleza del perfil
        </p>

        <div className="mt-4 flex items-center gap-5">
          <div className="relative size-32 shrink-0">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r={radius} fill="none" stroke="url(#strength-gradient)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - score / 100)}
                className="profile-ring"
              />
              <defs>
                <linearGradient id="strength-gradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#b1cc74" />
                  <stop offset="100%" stopColor="#5eead4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <span className="block font-display text-3xl font-bold leading-none">{score}%</span>
                <span className="text-[0.6rem] font-bold uppercase tracking-wider text-white/50">completo</span>
              </div>
            </div>
          </div>
          <div>
            <h2 id="strength-title" className={`m-0 font-display text-lg font-bold ${level.cls}`}>{level.label}</h2>
            <p className="m-0 mt-1 text-xs leading-5 text-white/60">
              Los perfiles completos reciben hasta <strong className="text-white">3× más</strong> contactos de empresas.
            </p>
          </div>
        </div>

        {pending.length > 0 ? (
          <ul className="m-0 mt-5 grid list-none gap-1.5 p-0">
            {pending.slice(0, 4).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onAction(c.id)}
                  className="group flex w-full items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-3.5 py-2.5 text-left text-xs font-semibold text-white/80 transition-all hover:border-lime/40 hover:bg-white/[0.08] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <span className="grid size-5 place-items-center rounded-full border border-dashed border-white/30" aria-hidden="true" />
                    {c.label}
                  </span>
                  <span className="flex items-center gap-1 text-lime">
                    +{c.points}%<i className="bx bx-right-arrow-alt text-base transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 mt-5 flex items-center gap-2 rounded-xl border border-lime/30 bg-lime/10 px-3.5 py-3 text-xs font-semibold text-lime">
            <i className="bx bxs-badge-check text-lg" aria-hidden="true" />¡Tu perfil está completo! Mantenlo actualizado.
          </p>
        )}
      </div>
    </section>
  );
}
