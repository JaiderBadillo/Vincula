import { useEffect, useRef, useState } from 'react';
import { useInstitutionTheme } from '../../context/InstitutionThemeContext.jsx';

export default function InstitutionThemeSelector() {
  const { theme, setTheme, currentThemeConfig, availableThemes } = useInstitutionTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-2xs hover:border-green hover:bg-white transition-all cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Tema institucional del portal"
      >
        <span
          className="size-3 rounded-full shrink-0 ring-1 ring-black/10 shadow-xs transition-colors"
          style={{ backgroundColor: currentThemeConfig.primary }}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">Tema:</span>
        <span className="font-bold truncate max-w-[7rem] sm:max-w-[10rem]">
          {currentThemeConfig.name.split(' ')[0]} {currentThemeConfig.name.split(' ')[1] || ''}
        </span>
        <i
          className={`bx bx-chevron-down text-sm text-secondary transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-72 sm:w-80 rounded-card border border-line bg-white p-2.5 shadow-hero z-50 animate-rise-in"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-3 py-2 border-b border-line mb-1.5">
            <div className="flex items-center gap-2">
              <i className="bx bx-palette text-base text-green-dark" />
              <h4 className="m-0 font-display text-xs font-bold text-ink">
                Tema Institucional IES
              </h4>
            </div>
            <p className="m-0 mt-0.5 text-[0.7rem] text-secondary">
              Selecciona el tema visual para encabezados, botones y acentos de navegación.
            </p>
          </div>

          <div className="space-y-1 max-h-80 overflow-y-auto pr-0.5">
            {availableThemes.map((t) => {
              const isSelected = t.id === theme;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 rounded-xl p-2.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sand/60 border border-sand-line shadow-2xs'
                      : 'hover:bg-cream/60 border border-transparent'
                  }`}
                  role="menuitem"
                >
                  {/* Swatch preview with 2 dots */}
                  <span className="relative flex size-6 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-white shadow-2xs mt-0.5">
                    <span
                      className="size-3.5 rounded-full"
                      style={{ backgroundColor: t.primary }}
                    />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-1 ring-white"
                      style={{ backgroundColor: t.accent }}
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-display text-xs font-bold text-ink truncate">
                        {t.name}
                      </span>
                      {t.badge && (
                        <span className="rounded bg-sand text-terracotta-dark text-[0.6rem] font-bold px-1.5 py-0.2 shrink-0 border border-sand-line">
                          {t.badge}
                        </span>
                      )}
                    </div>
                    <p className="m-0 text-[0.68rem] text-secondary leading-snug mt-0.5">
                      {t.description}
                    </p>
                  </div>

                  {isSelected && (
                    <i className="bx bx-check text-base text-terracotta shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

