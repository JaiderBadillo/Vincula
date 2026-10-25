const accentMap = {
  green: {
    iconBg: 'bg-green/10',
    iconText: 'text-green',
    progressBg: 'bg-green',
    border: 'border-green/10',
    valueTint: 'text-green',
  },
  amber: {
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    progressBg: 'bg-amber-500',
    border: 'border-amber-200/60',
    valueTint: 'text-amber-700',
  },
  blue: {
    iconBg: 'bg-sky-100',
    iconText: 'text-sky-600',
    progressBg: 'bg-sky-500',
    border: 'border-sky-200/60',
    valueTint: 'text-sky-700',
  },
};

export default function DashboardStatCard({ label, value, icon, isProgress = false, accent = 'green' }) {
  const colors = accentMap[accent] || accentMap.green;

  return (
    <article className={`group relative min-w-0 overflow-hidden rounded-card border bg-white p-5 shadow-card transition-shadow hover:shadow-hero sm:p-6 ${colors.border}`}>
      {/* Decorative accent bar at top */}
      <div className={`absolute inset-x-0 top-0 h-1 ${colors.progressBg} opacity-60`} aria-hidden="true" />

      <div className="flex items-start justify-between gap-4">
        <h3 className="max-w-[13rem] font-display text-sm font-semibold leading-5 text-body-muted">{label}</h3>
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-xl ${colors.iconBg} ${colors.iconText}`} aria-hidden="true">
          <i className={`bx ${icon}`} />
        </span>
      </div>
      <p className={`mt-5 font-display text-3xl font-semibold leading-none tracking-[-0.04em] ${colors.valueTint}`}>{value}</p>
      {isProgress && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-panel" role="progressbar" aria-label="Perfil completado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={15}>
          <span className={`block h-full w-[15%] rounded-full ${colors.progressBg} transition-all`} />
        </div>
      )}
    </article>
  );
}
