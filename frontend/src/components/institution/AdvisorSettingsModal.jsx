import { useCallback, useEffect, useState } from 'react';
import { authService } from '../../services/authService.js';
import PortalThemePicker from '../common/PortalThemePicker.jsx';
import PrivacyAndDataPanel from '../common/PrivacyAndDataPanel.jsx';
import RoleFaq from '../common/RoleFaq.jsx';
import SecurityPanel from '../common/SecurityPanel.jsx';
import SettingsShell from '../common/SettingsShell.jsx';
import { createSettingsRequest, formatDateTime } from '../common/settingsApi.js';

const request = createSettingsRequest('/auth/asesor/configuracion');

const tabs = [
  { id: 'perfil', icon: 'bx-id-card', title: 'Mi perfil', detail: 'Datos con los que te identificas en Víncula' },
  { id: 'seguridad', icon: 'bx-shield-quarter', title: 'Seguridad', detail: 'Correo de acceso, contraseña y cuenta de Google' },
  { id: 'notificaciones', icon: 'bx-bell', title: 'Notificaciones', detail: 'Avisos que recibes por correo' },
  { id: 'accesos', icon: 'bx-time-five', title: 'Accesos', detail: 'Inicios de sesión recientes' },
  { id: 'privacidad', icon: 'bx-data', title: 'Privacidad y datos', detail: 'Descarga tus datos o elimina tu cuenta' },
  { id: 'apariencia', icon: 'bx-palette', title: 'Apariencia', detail: 'Tema y colores del portal' },
  { id: 'faq', icon: 'bx-help-circle', title: 'Ayuda', detail: 'Preguntas frecuentes para asesores' },
];

const input = 'w-full rounded-xl border border-sand-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-green focus:ring-4 focus:ring-green/10';
const button = 'rounded-xl bg-green-dark px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer';

export default function AdvisorSettingsModal({ isOpen, onClose, userName, userAvatar, userInitials }) {
  const [tab, setTab] = useState('perfil');
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState({ nombre_completo: '', telefono: '', cargo: '' });
  const [notifications, setNotifications] = useState({ avisar_accesos_email: false, avisar_cambios_email: true });
  const [accesses, setAccesses] = useState(null);
  const [message, setMessage] = useState({});
  const [busy, setBusy] = useState(false);
  const notify = useCallback((next) => setMessage(next), []);

  useEffect(() => {
    if (!isOpen) return undefined;
    setTab('perfil'); setAccount(null); setAccesses(null); setMessage({});
    let cancelled = false;
    request().then((data) => { if (!cancelled) { setAccount(data); setProfile(data.perfil); setNotifications(data.notificaciones); } })
      .catch((err) => { if (!cancelled) setMessage({ error: err.message }); });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || tab !== 'accesos' || !account) return undefined;
    let cancelled = false;
    request('/accesos').then((data) => { if (!cancelled) setAccesses(data.accesos); })
      .catch((err) => { if (!cancelled) setMessage({ error: err.message }); });
    return () => { cancelled = true; };
  }, [isOpen, tab, account]);

  async function save(event, type) {
    event.preventDefault(); setBusy(true); setMessage({});
    try {
      const data = await request(type === 'perfil' ? '/perfil' : '/notificaciones', 'PUT', type === 'perfil' ? profile : notifications);
      if (type === 'perfil') {
        setProfile(data.perfil);
        const user = authService.getCurrentUser();
        if (user) localStorage.setItem('vincula.auth.user', JSON.stringify({ ...user, nombre: data.perfil.nombre_completo }));
        window.dispatchEvent(new Event('vincula:user-updated'));
      } else { setNotifications(data.notificaciones); }
      setMessage({ success: data.mensaje });
    } catch (err) { setMessage({ error: err.message }); }
    finally { setBusy(false); }
  }

  const needsAccount = ['perfil', 'seguridad', 'notificaciones', 'accesos'].includes(tab);

  return (
    <SettingsShell open={isOpen} onClose={onClose} titleId="advisor-settings-title"
      user={{ name: userName || 'Asesor IES', subtitle: `Asesor IES · ${account?.institucion || 'Institución'}`, avatar: userAvatar, initials: userInitials || 'IES' }}
      tabs={tabs} active={tab} onChange={(id) => { setTab(id); setMessage({}); }} error={message.error} success={message.success}>
      {needsAccount && !account && !message.error && <p className="text-sm text-secondary">Cargando tu cuenta…</p>}

      {account && tab === 'perfil' && (
        <form onSubmit={(event) => save(event, 'perfil')} className="grid gap-4">
          <label className="grid gap-1 text-xs font-semibold text-ink">Nombre completo
            <input className={input} required minLength={3} maxLength={150} value={profile.nombre_completo} onChange={(event) => setProfile({ ...profile, nombre_completo: event.target.value })} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold text-ink">Teléfono
              <input type="tel" className={input} maxLength={50} value={profile.telefono} onChange={(event) => setProfile({ ...profile, telefono: event.target.value })} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-ink">Cargo
              <input className={input} maxLength={100} value={profile.cargo} onChange={(event) => setProfile({ ...profile, cargo: event.target.value })} />
            </label>
          </div>
          <p className="m-0 rounded-xl bg-sand/50 p-3 text-xs text-secondary">Institución: {account.institucion} · Correo institucional: {profile.correo_institucional}</p>
          <div className="flex justify-end"><button type="submit" disabled={busy} className={button}>Guardar perfil</button></div>
        </form>
      )}

      {account && tab === 'seguridad' && <SecurityPanel request={request} account={account} setAccount={setAccount} notify={notify} />}

      {account && tab === 'notificaciones' && (
        <form onSubmit={(event) => save(event, 'notificaciones')} className="grid gap-4">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand-line p-4 text-sm text-ink">
            <input type="checkbox" className="mt-1 accent-green" checked={notifications.avisar_accesos_email} onChange={(event) => setNotifications({ ...notifications, avisar_accesos_email: event.target.checked })} />
            <span><strong className="block">Nuevos accesos</strong><small className="text-secondary">Recibe un correo cuando alguien inicie sesión en tu cuenta.</small></span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand-line p-4 text-sm text-ink">
            <input type="checkbox" className="mt-1 accent-green" checked={notifications.avisar_cambios_email} onChange={(event) => setNotifications({ ...notifications, avisar_cambios_email: event.target.checked })} />
            <span><strong className="block">Cambios de cuenta</strong><small className="text-secondary">Recibe un correo al cambiar tu dirección de acceso o tu contraseña.</small></span>
          </label>
          <p className="m-0 text-xs text-secondary">Los correos necesarios para recuperar la cuenta se seguirán enviando.</p>
          <div className="flex justify-end"><button type="submit" disabled={busy} className={button}>Guardar preferencias</button></div>
        </form>
      )}

      {account && tab === 'accesos' && (
        <div className="grid gap-2" aria-live="polite">
          {accesses === null && <p className="text-xs text-secondary">Cargando accesos…</p>}
          {accesses?.length === 0 && <p className="text-xs text-secondary">Todavía no hay accesos registrados.</p>}
          {accesses?.map((access) => (
            <div key={access.id} className="flex items-start justify-between gap-3 rounded-xl border border-sand-line p-3 text-xs">
              <div>
                <strong className="block text-ink">{access.navegador} · {access.metodo === 'google' ? 'Google' : 'Contraseña'}</strong>
                <span className="text-secondary">{access.direccion_ip ? `IP: ${access.direccion_ip}` : 'IP no disponible'}</span>
              </div>
              <time className="text-right text-secondary" dateTime={access.fecha}>{formatDateTime(access.fecha)}</time>
            </div>
          ))}
        </div>
      )}

      {tab === 'privacidad' && <PrivacyAndDataPanel role="institution_advisor" />}
      {tab === 'apariencia' && <PortalThemePicker />}
      {tab === 'faq' && <RoleFaq role="institution_advisor" />}
    </SettingsShell>
  );
}
