import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AccountSettingsModal from './AccountSettingsModal.jsx';
import { useAuthCredentials } from '../../hooks/useAuthCredentials.js';
import { authService } from '../../services/authService.js';

export default function UserAccountDropdown({
  role = 'company_admin',
  userName = '',
  userSubtitle = '',
  userAvatar = null,
  userInitials = '',
  borderClass = 'border-sand-line',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { getCredentials } = useAuthCredentials();

  const currentCreds = getCredentials(role);
  const currentUser = authService.getCurrentUser();
  const effectiveUserName = userName || currentUser?.nombre || currentCreds?.name || 'Usuario';
  const effectiveInitials = userInitials || effectiveUserName.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'ID';

  // Cierre al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Cierre con Escape
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function handleLogout() {
    authService.logout();
    setIsOpen(false);
    navigate('/login?logout=1');
  }

  function handleOpenSettings() {
    setIsOpen(false);
    setIsModalOpen(true);
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Botón trigger: conserva exactamente la estética corporativa del topbar */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex items-center gap-2.5 pl-3 border-l ${borderClass} shrink-0 text-left rounded-2xl py-1.5 pr-2.5 transition-all hover:bg-sand/30 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Menú de usuario para ${effectiveUserName}`}
      >
        {/* Avatar / Logo */}
        {userAvatar ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white p-1 border border-sand-line shadow-2xs overflow-hidden">
            <img
              src={userAvatar}
              alt=""
              className="size-full object-contain"
            />
          </span>
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cocoa text-ochre font-display text-xs font-bold shadow-2xs">
            {effectiveInitials}
          </span>
        )}

        {/* Nombre y Rol / NIT */}
        <div className="hidden lg:block text-left min-w-0">
          <p className="m-0 font-display text-xs font-bold text-ink leading-tight truncate max-w-[190px]">
            {effectiveUserName}
          </p>
          <p className="m-0 text-[0.62rem] text-secondary truncate max-w-[190px]">
            {userSubtitle || currentCreds?.roleLabel}
          </p>
        </div>

        {/* Flecha indicadora de dropdown */}
        <i
          className={`bx bx-chevron-down text-secondary text-base transition-transform duration-200 ml-0.5 group-hover:text-ink ${
            isOpen ? 'rotate-180 text-terracotta' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Menú desplegable */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2 w-56 origin-top-right rounded-2xl border border-sand-line bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1"
        >
          {/* Opción 1: Configuración */}
          <button
            type="button"
            role="menuitem"
            onClick={handleOpenSettings}
            className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-ink hover:bg-cream hover:text-cocoa transition-colors cursor-pointer"
          >
            <span className="grid size-7 place-items-center rounded-lg bg-sand/60 text-secondary group-hover:bg-sand group-hover:text-cocoa transition-colors">
              <i className="bx bx-cog text-base" />
            </span>
            <span>Configuración</span>
          </button>

          {/* Opción 2: Salir */}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-terracotta hover:bg-terracotta/10 transition-colors cursor-pointer"
          >
            <span className="grid size-7 place-items-center rounded-lg bg-terracotta/10 text-terracotta group-hover:bg-terracotta/20 transition-colors">
              <i className="bx bx-log-out text-base" />
            </span>
            <span>Salir</span>
          </button>
        </div>
      )}

      {/* Modal rectangular de configuración de credenciales */}
      <AccountSettingsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        role={role}
        userName={userName}
        userAvatar={userAvatar}
        userInitials={userInitials}
      />
    </div>
  );
}
