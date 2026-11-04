import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'vincula.ies.admin.theme.v2';
const LEGACY_KEY = 'vincula.institution.admin.theme';

export const INSTITUTION_THEMES = [
  {
    id: 'verde-oscuro',
    name: 'Verde Institucional UTS',
    badge: 'Por defecto',
    description: 'Verde bosque y verde claro UTS, formal y académico.',
    primary: '#1b4d2e',
    accent: '#b1cc74',
    bg: '#fbfcf9',
    cocoa: '#12281c',
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
    description: 'Tradición doctoral clásica, sobria y distintiva.',
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

const DEFAULT_THEME = 'verde-oscuro';

function readStoredTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    // Limpiar claves legacy que pudieran tener terracota guardado
    if (window.localStorage.getItem(LEGACY_KEY)) {
      window.localStorage.removeItem(LEGACY_KEY);
    }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const exists = INSTITUTION_THEMES.some((t) => t.id === saved);
    return exists ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

const InstitutionThemeContext = createContext({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  currentThemeConfig: INSTITUTION_THEMES[0],
  availableThemes: INSTITUTION_THEMES,
});

export function InstitutionThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-ies-theme', theme);
    return () => {
      document.documentElement.removeAttribute('data-ies-theme');
    };
  }, [theme]);

  function setTheme(newThemeId) {
    if (!INSTITUTION_THEMES.some((t) => t.id === newThemeId)) return;
    setThemeState(newThemeId);
    try {
      window.localStorage.setItem(STORAGE_KEY, newThemeId);
    } catch {
      // safe fallback
    }
    document.documentElement.setAttribute('data-ies-theme', newThemeId);
  }

  const currentThemeConfig =
    INSTITUTION_THEMES.find((t) => t.id === theme) || INSTITUTION_THEMES[0];

  return (
    <InstitutionThemeContext.Provider
      value={{
        theme,
        setTheme,
        currentThemeConfig,
        availableThemes: INSTITUTION_THEMES,
      }}
    >
      {children}
    </InstitutionThemeContext.Provider>
  );
}

export function useInstitutionTheme() {
  return useContext(InstitutionThemeContext);
}

