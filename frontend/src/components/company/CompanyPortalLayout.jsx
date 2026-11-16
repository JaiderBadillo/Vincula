import { useEffect, useRef, useState } from 'react';
import CompanySidebar from './CompanySidebar.jsx';
import CompanyTopbar from './CompanyTopbar.jsx';
import { PortalThemeProvider, usePortalTheme } from '../../context/InstitutionThemeContext.jsx';

const SIDEBAR_PREFERENCE_KEY = 'vincula.company.sidebar-collapsed';

function getSavedSidebarPreference() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === 'true';
  } catch {
    return false;
  }
}

function CompanyPortalContent({
  activePage = 'admin-perfil',
  role = 'admin',
  children,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getSavedSidebarPreference);
  const menuButtonRef = useRef(null);
  const { theme } = usePortalTheme();

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(sidebarCollapsed));
    } catch {
      // safe fallback
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  return (
    <div
      data-portal="company"
      data-company-role={role}
      data-ies-theme={theme}
      className="min-h-screen bg-cream text-ink antialiased"
    >
      <CompanySidebar
        activePage={activePage}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        collapsed={sidebarCollapsed}
        role={role}
      />
      <div
        className={`min-h-screen transition-[margin] duration-200 ease-out ${
          sidebarCollapsed ? 'min-[1200px]:ml-[5.5rem]' : 'min-[1200px]:ml-[17.5rem]'
        }`}
      >
        <CompanyTopbar
          menuButtonRef={menuButtonRef}
          mobileMenuOpen={mobileMenuOpen}
          onMenuToggle={() => setMobileMenuOpen((open) => !open)}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
          role={role}
        />
        {children}
      </div>
    </div>
  );
}

export default function CompanyPortalLayout(props) {
  return (
    <PortalThemeProvider>
      <CompanyPortalContent {...props} />
    </PortalThemeProvider>
  );
}
