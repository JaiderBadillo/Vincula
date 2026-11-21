import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'vincula.portal.theme.v1';
const IES_KEY = 'vincula.ies.admin.theme.v2';
const LEGACY_KEY = 'vincula.institution.admin.theme';

export const PORTAL_THEMES = [
  {
    id: 'verde-oscuro',
    name: 'Verde Institucional',
    badge: 'Por defecto',
    description: 'Verde bosque y verde claro institucional, identidad base de Víncula.',
    primary: '#336f24',
    accent: '#b1cc74',
    bg: '#fbfcf9',
    cocoa: '#001a23',
  },
  {
    id: 'verde-esmeralda',
    name: 'Verde Esmeralda',
    description: 'Tono vegetal vivo, fresco y tecnológico.',
    primary: '#1e6f43',
    accent: '#6ee7b7',
    bg: '#f3f9f5',
    cocoa: '#0d281a',
  },
  {
    id: 'cafe-ebano',
    name: 'Café Ébano y Cacao',
    description: 'Roble clásico, elegante y cálido.',
    primary: '#4a2e1b',
    accent: '#ddb892',
    bg: '#f9f5f0',
    cocoa: '#24140b',
  },
  {
    id: 'ambar-dorado',
    name: 'Ámbar Dorado y Ocre',
    description: 'Tonos trigo, miel y prestigio universitario.',
    primary: '#9a6813',
    accent: '#fde047',
    bg: '#fbf8f0',
    cocoa: '#2e1d08',
  },
  {
    id: 'burdeos-academico',
    name: 'Burdeos y Caoba',
    description: 'Tradición clásica, sobria y distintiva.',
    primary: '#7a2336',
    accent: '#fbcfe8',
    bg: '#fbf5f6',
    cocoa: '#2e0d14',
  },
  {
    id: 'terracota-calido',
    name: 'Terracota y Arcilla',
    description: 'Cálido, enérgico y artesanal.',
    primary: '#c4572a',
    accent: '#fed7aa',
    bg: '#fbf6ee',
    cocoa: '#2b1a10',
  },
];

export const INSTITUTION_THEMES = PORTAL_THEMES;
const DEFAULT_THEME = 'verde-oscuro';

function readStoredTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    if (window.localStorage.getItem(LEGACY_KEY)) {
      window.localStorage.removeItem(LEGACY_KEY);
    }
    const saved =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem(IES_KEY);
    const exists = PORTAL_THEMES.some((t) => t.id === saved);
    return exists ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

const PortalThemeContext = createContext({
  theme: DEFAULT_THEME,
  defaultThemeId: DEFAULT_THEME,
  setTheme: () => {},
  currentThemeConfig: PORTAL_THEMES[0],
  availableThemes: PORTAL_THEMES,
});

export function PortalThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-ies-theme', theme);
    return () => {
      document.documentElement.removeAttribute('data-ies-theme');
    };
  }, [theme]);

  useEffect(() => {
    function handleThemeSync(event) {
      const next = event?.detail;
      if (next && PORTAL_THEMES.some((t) => t.id === next)) {
        setThemeState(next);
      }
    }
    window.addEventListener('vincula:portal-theme-changed', handleThemeSync);
    return () => window.removeEventListener('vincula:portal-theme-changed', handleThemeSync);
  }, []);

  function setTheme(newThemeId) {
    if (!PORTAL_THEMES.some((t) => t.id === newThemeId)) return;
    setThemeState(newThemeId);
    try {
      window.localStorage.setItem(STORAGE_KEY, newThemeId);
      window.localStorage.setItem(IES_KEY, newThemeId);
    } catch {
      // safe fallback
    }
    document.documentElement.setAttribute('data-ies-theme', newThemeId);
    window.dispatchEvent(new CustomEvent('vincula:portal-theme-changed', { detail: newThemeId }));
  }

  const currentThemeConfig =
    PORTAL_THEMES.find((t) => t.id === theme) || PORTAL_THEMES[0];

  return (
    <PortalThemeContext.Provider
      value={{
        theme,
        defaultThemeId: DEFAULT_THEME,
        setTheme,
        currentThemeConfig,
        availableThemes: PORTAL_THEMES,
      }}
    >
      {children}
    </PortalThemeContext.Provider>
  );
}

export function usePortalTheme() {
  return useContext(PortalThemeContext);
}

export const InstitutionThemeProvider = PortalThemeProvider;
export const useInstitutionTheme = usePortalTheme;
