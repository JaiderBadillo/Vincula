const accentMap = {
  green: {
    iconBg: 'bg-green/10',
    iconText: 'text-green',
    progressBg: 'bg-green',
    border: 'border-green/10',
    hoverBorder: 'hover:border-green/50',
    valueTint: 'text-green',
  },
  // Tonos de la paleta Vincula: verde de marca, lima/oliva y azul petróleo (los nombres amber/blue se conservan por los llamadores)
  amber: {
    iconBg: 'bg-lime/30',
    iconText: 'text-green-dark',
    progressBg: 'bg-lime',
    border: 'border-lime/50',
    hoverBorder: 'hover:border-lime',
    valueTint: 'text-green-dark',
  },
  blue: {
    iconBg: 'bg-blue-muted/10',
    iconText: 'text-blue-muted',
    progressBg: 'bg-blue-muted',
    border: 'border-blue-muted/15',
    hoverBorder: 'hover:border-blue-muted/50',
    valueTint: 'text-blue-muted',
  },
};

export default function DashboardStatCard({
  label,
  value,
  icon,
  isProgress = false,
  progressValue,
  accent = 'green',
  onClick,
  actionText = 'Ver sección',
}) {
  const colors = accentMap[accent] || accentMap.green;
  const parsedPercent = progressValue ?? (isProgress ? parseInt(value, 10) || 85 : 0);

  return (
    <article
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative min-w-0 overflow-hidden rounded-card border bg-white p-5 shadow-card transition-all duration-200 sm:p-6 ${
        colors.border
      } ${
        onClick
          ? `cursor-pointer hover:shadow-hero hover:-translate-y-1 active:translate-y-0 ${colors.hoverBorder} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime`
          : 'hover:shadow-hero'
      }`}
    >
      {/* Decorative accent bar at top */}
      <div className={`absolute inset-x-0 top-0 h-1 ${colors.progressBg} opacity-60`} aria-hidden="true" />

      <div className="flex items-start justify-between gap-4">
        <h3 className="max-w-[13rem] font-display text-sm font-semibold leading-5 text-body-muted group-hover:text-ink transition-colors">
          {label}
        </h3>
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-xl text-xl transition-transform duration-200 group-hover:scale-110 ${colors.iconBg} ${colors.iconText}`}
          aria-hidden="true"
        >
          <i className={`bx ${icon}`} />
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-2">
        <p className={`font-display text-3xl font-semibold leading-none tracking-[-0.04em] ${colors.valueTint}`}>
          {value}
        </p>

        {onClick && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary opacity-65 transition-all duration-200 group-hover:opacity-100 group-hover:text-ink">
            <span>{actionText}</span>
            <i className="bx bx-down-arrow-alt text-base transition-transform duration-200 group-hover:translate-y-0.5" />
          </span>
        )}
      </div>

      {isProgress && (
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-panel"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={parsedPercent}
        >
          <span
            className={`block h-full rounded-full ${colors.progressBg} transition-all duration-500`}
            style={{ width: `${Math.min(100, Math.max(0, parsedPercent))}%` }}
          />
        </div>
      )}
    </article>
  );
}
