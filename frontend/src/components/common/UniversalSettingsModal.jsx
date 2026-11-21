import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalThemePicker from './PortalThemePicker.jsx';
import PrivacyAndDataPanel from './PrivacyAndDataPanel.jsx';
import RoleFaq from './RoleFaq.jsx';
import SecurityPanel from './SecurityPanel.jsx';
import SettingsShell from './SettingsShell.jsx';
import { createSettingsRequest } from './settingsApi.js';

const request = createSettingsRequest('/auth/cuenta/configuracion');

const securityTab = { id: 'seguridad', title: 'Seguridad', detail: 'Correo de acceso, contraseña y cuenta de Google', icon: 'bx-shield-quarter' };
const privacyTab = { id: 'privacidad', title: 'Privacidad y datos', detail: 'Descarga tus datos o elimina tu cuenta', icon: 'bx-data' };
const themeTab = { id: 'apariencia', title: 'Apariencia', detail: 'Tema y colores del portal', icon: 'bx-palette' };
const helpTab = { id: 'faq', title: 'Ayuda', detail: 'Preguntas frecuentes para tu rol', icon: 'bx-help-circle' };

const labels = {
  graduate: 'Egresado', institution_admin: 'Administrador IES', company_admin: 'Administrador de empresa',
  company_recruiter: 'Reclutador', vincula_admin: 'Superadministrador',
};
const profilePaths = { graduate: '/dashboard/perfil', institution_admin: '/institucion/admin/perfil',
  company_admin: '/empresa/admin/perfil', company_recruiter: '/empresa/reclutador/dashboard', vincula_admin: '/admin/dashboard' };

export default function UniversalSettingsModal({ isOpen, onClose, role, userName, userAvatar, userInitials }) {
  const [tab, setTab] = useState('seguridad');
  const [account, setAccount] = useState(null);
  const [message, setMessage] = useState({});
  const notify = useCallback((next) => setMessage(next), []);

  useEffect(() => {
    if (!isOpen) return undefined;
    setTab('seguridad'); setAccount(null); setMessage({});
    let cancelled = false;
    request().then((data) => { if (!cancelled) setAccount(data); })
      .catch((err) => { if (!cancelled) setMessage({ error: err.message }); });
    return () => { cancelled = true; };
  }, [isOpen]);

  const tabs = role === 'graduate' ? [securityTab, privacyTab, helpTab] : [securityTab, privacyTab, themeTab, helpTab];
  const profilePath = profilePaths[role];

  return (
    <SettingsShell open={isOpen} onClose={onClose} titleId="universal-settings-title" theme={role === 'graduate' ? 'verde-oscuro' : undefined}
      user={{ name: userName || account?.nombre || 'Mi cuenta', subtitle: labels[role] || 'Cuenta Víncula', avatar: userAvatar, initials: userInitials,
        isEntity: role === 'company_admin' || role === 'institution_admin' }}
      tabs={tabs} active={tab} onChange={(id) => { setTab(id); setMessage({}); }} error={message.error} success={message.success}
      footer={profilePath && (
        <Link to={profilePath} onClick={onClose} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-secondary no-underline hover:bg-white/70 hover:text-ink">
          <i className="bx bx-id-card text-lg" aria-hidden="true" />Ir a mi perfil
        </Link>
      )}>
      {tab === 'seguridad' && !account && !message.error && <p className="text-sm text-secondary">Cargando tu cuenta…</p>}
      {tab === 'seguridad' && account && <SecurityPanel request={request} account={account} setAccount={setAccount} notify={notify} />}
      {tab === 'privacidad' && <PrivacyAndDataPanel role={role} />}
      {tab === 'apariencia' && <PortalThemePicker />}
      {tab === 'faq' && <RoleFaq role={role} />}
    </SettingsShell>
  );
}
