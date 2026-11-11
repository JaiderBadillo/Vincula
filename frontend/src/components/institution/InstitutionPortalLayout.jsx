import { useEffect, useRef, useState } from 'react';
import InstitutionSidebar from './InstitutionSidebar.jsx';
import InstitutionTopbar from './InstitutionTopbar.jsx';
import { InstitutionThemeProvider, useInstitutionTheme } from '../../context/InstitutionThemeContext.jsx';
import OnboardingTour from '../common/OnboardingTour.jsx';

const SIDEBAR_PREFERENCE_KEY = 'vincula.institution.sidebar-collapsed';

function getSavedSidebarPreference() {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === 'true';
  } catch {
    return false;
  }
}

function PortalLayoutContent({ activePage = 'dashboard', role = 'advisor', children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const menuButtonRef = useRef(null);
  const { theme } = useInstitutionTheme();

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(sidebarCollapsed));
    } catch {
      // safe fallback
    }
  }, [sidebarCollapsed]);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

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
      data-admin-ies={role === 'admin' ? 'true' : undefined}
      data-ies-portal="true"
      data-ies-theme={theme}
      className={`min-h-screen ${role === 'admin' ? 'bg-cream' : 'bg-page'} text-ink antialiased`}
    >
      <InstitutionSidebar
        activePage={activePage}
        mobileOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
        collapsed={sidebarCollapsed}
        role={role}
      />
      <div
        className={`min-h-screen transition-[margin] duration-200 ease-out ${
          sidebarCollapsed ? 'min-[1200px]:ml-[5.5rem]' : 'min-[1200px]:ml-[17.5rem]'
        }`}
      >
        <InstitutionTopbar
          menuButtonRef={menuButtonRef}
          mobileMenuOpen={mobileMenuOpen}
          onMenuToggle={() => setMobileMenuOpen((open) => !open)}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
          role={role}
        />
        {children}
      </div>
      <OnboardingTour />
    </div>
  );
}

export default function InstitutionPortalLayout({ activePage = 'dashboard', role = 'advisor', children }) {
  return (
    <InstitutionThemeProvider role={role}>
      <PortalLayoutContent activePage={activePage} role={role}>
        {children}
      </PortalLayoutContent>
    </InstitutionThemeProvider>
  );
}
