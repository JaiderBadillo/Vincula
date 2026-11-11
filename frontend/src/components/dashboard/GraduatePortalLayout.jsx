import { useEffect, useRef, useState } from 'react';
import DashboardSidebar from './DashboardSidebar.jsx';
import DashboardTopbar from './DashboardTopbar.jsx';
import GraduateChatbot from './GraduateChatbot.jsx';

const SIDEBAR_PREFERENCE_KEY = 'vincula.dashboard.sidebar-collapsed';

function getSavedSidebarPreference() {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function GraduatePortalLayout({ activePage = 'home', children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getSavedSidebarPreference);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(sidebarCollapsed));
    } catch {
      // La preferencia sigue funcionando aunque el navegador bloquee el almacenamiento.
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
    <div className="min-h-screen bg-page text-ink">
      <DashboardSidebar
        activePage={activePage}
        mobileOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
        collapsed={sidebarCollapsed}
      />
      <div className={`min-h-screen transition-[margin] duration-200 ease-out ${sidebarCollapsed ? 'min-[1200px]:ml-[5.5rem]' : 'min-[1200px]:ml-[17rem]'}`}>
        <DashboardTopbar
          menuButtonRef={menuButtonRef}
          mobileMenuOpen={mobileMenuOpen}
          onMenuToggle={() => setMobileMenuOpen((open) => !open)}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
        />
        {children}
      </div>
      <GraduateChatbot />
    </div>
  );
}
