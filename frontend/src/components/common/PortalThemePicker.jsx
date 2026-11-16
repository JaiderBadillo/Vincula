import { usePortalTheme } from '../../context/InstitutionThemeContext.jsx';

export default function PortalThemePicker() {
  const { theme, setTheme, availableThemes, defaultThemeId } = usePortalTheme();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="m-0 text-lg font-bold text-ink">Tema visual del portal</h3>
          <p className="mt-1 text-xs text-secondary">
            Personaliza la paleta de colores para barras, botones, tarjetas y degradados sobre imágenes.
          </p>
        </div>
        {theme !== defaultThemeId && (
          <button
            type="button"
            onClick={() => setTheme(defaultThemeId)}
            className="rounded-xl border border-sand-line bg-cream px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-sand cursor-pointer"
          >
            Restablecer verde por defecto
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Temas visuales del portal">
        {availableThemes.map((t) => {
          const isSelected = t.id === theme;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setTheme(t.id)}
              className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-terracotta bg-sand/60 shadow-2xs ring-2 ring-terracotta/15'
                  : 'border-sand-line bg-white hover:bg-cream/60'
              }`}
            >
              <span
                className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-black/10 shadow-2xs"
                style={{ backgroundColor: t.bg }}
                aria-hidden="true"
              >
                <span
                  className="size-4.5 rounded-full"
                  style={{ backgroundColor: t.primary }}
                />
                <span
                  className="absolute -bottom-1 -right-1 size-3 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: t.accent }}
                />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-display text-xs font-bold text-ink truncate">
                    {t.name}
                  </span>
                  {t.badge && (
                    <span className="shrink-0 rounded-md border border-sand-line bg-cream px-1.5 py-0.5 text-[0.6rem] font-bold text-terracotta-dark">
                      {t.badge}
                    </span>
                  )}
                </div>
                <p className="m-0 mt-1 text-[0.7rem] leading-snug text-secondary">
                  {t.description}
                </p>
              </div>

              {isSelected && (
                <i className="bx bxs-check-circle text-lg text-terracotta shrink-0 mt-0.5" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      <p className="m-0 rounded-xl border border-sand-line bg-cream/60 p-3 text-xs text-secondary">
        El cambio se aplica al instante en tu panel (Empresa, Reclutamiento, Institución y Administración) sin modificar la vista del Egresado.
      </p>
    </div>
  );
}
