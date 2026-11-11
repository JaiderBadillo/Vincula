import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { authService, extractErrorMessage } from '../../services/authService.js';

const API = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || '698543862122-050jkphuknmg709207im4lfs39744ef8.apps.googleusercontent.com';

async function settingsRequest(path = '', method = 'GET', body) {
  const response = await fetch(`${API}/auth/asesor/configuracion${path}`, {
    method, headers: { Authorization: `Bearer ${authService.getToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(extractErrorMessage(data, 'No fue posible guardar el cambio.'));
  return data;
}

const sections = [
  { id: 'cuenta', icon: 'bx-user', title: 'Cuenta', detail: 'Correo de acceso' },
  { id: 'perfil', icon: 'bx-id-card', title: 'Perfil', detail: 'Datos del asesor' },
  { id: 'seguridad', icon: 'bx-shield-quarter', title: 'Seguridad', detail: 'Contraseña y Google' },
  { id: 'notificaciones', icon: 'bx-bell', title: 'Notificaciones', detail: 'Avisos por correo' },
  { id: 'sesiones', icon: 'bx-devices', title: 'Accesos', detail: 'Historial y sesión' },
];

export default function AdvisorSettingsModal({ isOpen, onClose, userName, userAvatar, userInitials }) {
  const [section, setSection] = useState('cuenta');
  const [account, setAccount] = useState(null);
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState({ nombre_completo: '', telefono: '', cargo: '' });
  const [notifications, setNotifications] = useState({ avisar_accesos_email: false, avisar_cambios_email: true });
  const [accesses, setAccesses] = useState(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const googleSlot = useRef(null);
  const passwordRef = useRef('');

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setSection('cuenta'); setAccount(null); setAccesses(null); setError(''); setSuccess(''); setCurrent(''); setNext(''); setConfirm('');
    let cancelled = false;
    settingsRequest().then(data => { if (!cancelled) { setAccount(data); setEmail(data.correo); setProfile(data.perfil); setNotifications(data.notificaciones); } })
      .catch(err => { if (!cancelled) setError(err.message); });
    const escape = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', escape);
    return () => { cancelled = true; document.body.style.overflow = previous; window.removeEventListener('keydown', escape); };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || section !== 'sesiones' || !account) return undefined;
    let cancelled = false;
    settingsRequest('/accesos').then(data => { if (!cancelled) setAccesses(data.accesos); })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [isOpen, section, account]);

  useEffect(() => {
    if (!isOpen || section !== 'seguridad' || account?.google_vinculado || !googleSlot.current) return undefined;
    let cancelled = false;
    let timer;
    function initialize() {
      if (cancelled) return;
      if (!window.google?.accounts?.id) { timer = setTimeout(initialize, 200); return; }
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, auto_select: false, callback: async ({ credential }) => {
        if (!passwordRef.current) { setError('Escribe primero tu contraseña actual para vincular Google.'); return; }
        setBusy(true); setError(''); setSuccess('');
        try {
          const data = await settingsRequest('/google', 'POST', { credential, contrasena_actual: passwordRef.current });
          setAccount(previous => ({ ...previous, google_vinculado: true })); setCurrent(''); passwordRef.current = '';
          setSuccess(data.mensaje);
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
      }});
      window.google.accounts.id.renderButton(googleSlot.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', width: 240 });
    }
    initialize();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isOpen, section, account?.google_vinculado]);

  async function save(event, type) {
    event.preventDefault(); setError(''); setSuccess('');
    if (type === 'password' && next !== confirm) return setError('Las contraseñas nuevas no coinciden.');
    setBusy(true);
    try {
      const data = type === 'email'
        ? await settingsRequest('/correo', 'PUT', { correo: email.trim(), contrasena_actual: current })
        : await settingsRequest('/contrasena', 'PUT', { contrasena_actual: current, nueva_contrasena: next });
      setAccount(previous => ({ ...previous, ...(type === 'email' ? { correo: data.correo } : {}) }));
      if (type === 'email') {
        const user = authService.getCurrentUser();
        if (user) localStorage.setItem('vincula.auth.user', JSON.stringify({ ...user, correo: data.correo }));
      }
      setSuccess(data.mensaje); setCurrent(''); setNext(''); setConfirm(''); passwordRef.current = '';
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function saveExtra(event, type) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try {
      const data = await settingsRequest(type === 'perfil' ? '/perfil' : '/notificaciones', 'PUT', type === 'perfil' ? profile : notifications);
      if (type === 'perfil') {
        setProfile(data.perfil);
        const user = authService.getCurrentUser();
        if (user) localStorage.setItem('vincula.auth.user', JSON.stringify({ ...user, nombre: data.perfil.nombre_completo }));
        window.dispatchEvent(new Event('vincula:user-updated'));
      } else { setNotifications(data.notificaciones); }
      setSuccess(data.mensaje);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function unlink() {
    if (!current) return setError('Escribe tu contraseña actual para desvincular Google.');
    setBusy(true); setError(''); setSuccess('');
    try {
      const data = await settingsRequest('/google', 'DELETE', { contrasena_actual: current });
      setAccount(previous => ({ ...previous, google_vinculado: false }));
      setSuccess(data.mensaje); setCurrent(''); passwordRef.current = '';
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (!isOpen) return null;
  const input = 'w-full rounded-xl border border-sand-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-green focus:ring-4 focus:ring-green/10';
  const button = 'rounded-xl bg-green px-5 py-2.5 text-xs font-bold text-white hover:bg-green-dark disabled:opacity-50';
  return createPortal(<div role="dialog" aria-modal="true" aria-labelledby="advisor-settings-title" onClick={onClose}
    className="fixed inset-0 z-[10002] flex items-center justify-center overflow-y-auto bg-ink/70 p-3 backdrop-blur-xs sm:p-5">
    <div onClick={event => event.stopPropagation()} className="my-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-sand-line bg-white shadow-2xl md:grid-cols-[minmax(250px,36%)_1fr]">
      <aside className="relative flex flex-col justify-between overflow-hidden bg-cocoa p-4 text-white md:min-h-[590px] md:p-6">
        <img src="/images/profile/cover-office.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-cocoa via-cocoa/90 to-cocoa/40" />
        <div className="relative z-10">
          <p className="m-0 text-[0.7rem] font-bold uppercase tracking-widest text-white/70">Perfil en uso</p>
          <h3 className="mt-1 font-display text-lg font-bold text-white">{userName || 'Asesor IES'}</h3>
          <p className="text-xs font-semibold text-ochre">Asesor IES · {account?.institucion || 'Institución'}</p>
          <nav aria-label="Secciones de configuración" className="mt-4 grid grid-cols-3 gap-2 md:mt-7 md:grid-cols-1">
            {sections.map(item => <button type="button" key={item.id} onClick={() => { setSection(item.id); setError(''); setSuccess(''); setCurrent(''); passwordRef.current = ''; }}
              aria-current={section === item.id ? 'page' : undefined}
              className={`flex items-center justify-center gap-3 rounded-xl border px-2 py-2 text-center transition-colors md:justify-start md:px-3 md:py-3 md:text-left ${section === item.id ? 'border-lime/60 bg-white/20' : 'border-transparent hover:bg-white/10'}`}>
              <i className={`bx ${item.icon} hidden text-xl text-lime md:block`} aria-hidden="true" /><span><strong className="block text-[0.68rem] text-white md:text-xs">{item.title}</strong><small className="hidden text-[0.65rem] text-white/70 md:block">{item.detail}</small></span>
            </button>)}
          </nav>
        </div>
        <div className="relative z-10 mt-6 hidden rounded-2xl border border-white/20 bg-white/10 p-4 text-xs leading-relaxed text-white/90 md:block">
          <i className="bx bx-lock-alt mr-2 text-lg text-ochre" aria-hidden="true" />Tu cuenta está protegida. Confirma los cambios sensibles con tu contraseña actual.
        </div>
      </aside>
      <div className="flex min-h-[480px] flex-col md:min-h-[560px]">
        <header className="flex items-center justify-between gap-3 border-b border-sand-line bg-cream/50 px-6 py-5">
          <div className="flex items-center gap-3">
            {userAvatar ? <img src={userAvatar} alt="" className="size-10 rounded-xl border border-sand-line object-contain" /> : <span className="grid size-10 place-items-center rounded-xl bg-cocoa text-xs font-bold text-ochre">{userInitials || 'IES'}</span>}
            <div><h2 id="advisor-settings-title" className="m-0 font-display text-base font-bold text-ink">Configuración de cuenta</h2><p className="m-0 text-xs text-secondary">Asesor IES · {sections.find(item => item.id === section)?.title}</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar configuración" className="grid size-9 place-items-center rounded-xl text-2xl text-secondary hover:bg-sand/50"><i className="bx bx-x" /></button>
        </header>
        <div className="flex-1 space-y-5 px-6 py-6">
          {error && <p role="alert" className="rounded-xl border border-terracotta/30 bg-terracotta/10 p-3 text-xs text-terracotta-dark">{error}</p>}
          {success && <p role="status" className="rounded-xl border border-green/20 bg-green/10 p-3 text-xs text-green-dark">{success}</p>}
          {!account && !error && <p className="text-sm text-secondary">Cargando tu cuenta…</p>}
          {account && section === 'cuenta' && <form onSubmit={event => save(event, 'email')} className="grid gap-5">
            <div><h3 className="m-0 text-lg font-bold text-ink">Correo de inicio de sesión</h3><p className="mt-1 text-xs text-secondary">Usa este correo para entrar y recibir avisos de Víncula.</p></div>
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-wide text-secondary">Correo electrónico<input type="email" required className={input} value={email} onChange={event => setEmail(event.target.value)} /></label>
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-wide text-secondary">Contraseña actual<input type="password" required autoComplete="current-password" className={input} value={current} onChange={event => setCurrent(event.target.value)} /></label>
            {account.google_vinculado && <p className="rounded-xl bg-sand/60 p-3 text-xs text-cocoa">Para cambiar el correo, desvincula Google primero en Seguridad.</p>}
            <div className="flex justify-end"><button type="submit" disabled={busy || email.trim().toLowerCase() === account.correo} className={button}>Guardar correo</button></div>
          </form>}
          {account && section === 'perfil' && <form onSubmit={event => saveExtra(event, 'perfil')} className="grid gap-4">
            <div><h3 className="m-0 text-lg font-bold text-ink">Datos de perfil</h3><p className="mt-1 text-xs text-secondary">Estos datos identifican al asesor dentro de Víncula.</p></div>
            <label className="grid gap-1 text-xs font-semibold text-ink">Nombre completo<input className={input} required minLength={3} maxLength={150} value={profile.nombre_completo} onChange={event => setProfile({ ...profile, nombre_completo: event.target.value })} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold text-ink">Teléfono<input type="tel" className={input} maxLength={50} value={profile.telefono} onChange={event => setProfile({ ...profile, telefono: event.target.value })} /></label>
              <label className="grid gap-1 text-xs font-semibold text-ink">Cargo<input className={input} maxLength={100} value={profile.cargo} onChange={event => setProfile({ ...profile, cargo: event.target.value })} /></label>
            </div>
            <div className="rounded-xl bg-sand/50 p-3 text-xs text-secondary">Institución: {account.institucion} · Correo institucional: {profile.correo_institucional}</div>
            <div className="flex justify-end"><button type="submit" disabled={busy} className={button}>Guardar perfil</button></div>
          </form>}
          {account && section === 'seguridad' && <div className="grid gap-6">
            <form onSubmit={event => save(event, 'password')} className="grid gap-3 border-b border-sand-line pb-6">
              <div><h3 className="m-0 text-lg font-bold text-ink">Cambiar contraseña</h3><p className="mt-1 text-xs text-secondary">Elige una clave diferente de al menos 10 caracteres.</p></div>
              <label className="grid gap-1 text-xs font-semibold text-ink">Contraseña actual<input type="password" required autoComplete="current-password" className={input} value={current} onChange={event => { setCurrent(event.target.value); passwordRef.current = event.target.value; }} /></label>
              <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-semibold text-ink">Nueva contraseña<input type="password" required minLength={10} maxLength={72} autoComplete="new-password" className={input} value={next} onChange={event => setNext(event.target.value)} /></label>
                <label className="grid gap-1 text-xs font-semibold text-ink">Confirmar contraseña<input type="password" required minLength={10} autoComplete="new-password" className={input} value={confirm} onChange={event => setConfirm(event.target.value)} /></label></div>
              <div className="flex justify-end"><button type="submit" disabled={busy} className={button}>Actualizar contraseña</button></div>
            </form>
            <div className="grid gap-3"><div><h3 className="m-0 text-lg font-bold text-ink">Cuenta de Google</h3><p className="mt-1 text-xs text-secondary">Vincula una cuenta con el mismo correo para iniciar sesión con Google.</p></div>
              <p className="m-0 text-xs font-semibold text-ink">Estado: <span className={account.google_vinculado ? 'text-green' : 'text-secondary'}>{account.google_vinculado ? 'Vinculada' : 'Sin vincular'}</span></p>
              {account.google_vinculado ? <button type="button" disabled={busy} onClick={unlink} className="w-fit rounded-xl border border-sand-line px-4 py-2 text-xs font-semibold text-ink hover:bg-sand/50">Desvincular Google</button> : <div ref={googleSlot} aria-label="Vincular cuenta de Google" />}
              <p className="m-0 text-[0.68rem] text-secondary">Para vincular o desvincular, escribe primero tu contraseña actual en el campo de arriba.</p>
            </div>
          </div>}
          {account && section === 'notificaciones' && <form onSubmit={event => saveExtra(event, 'notificaciones')} className="grid gap-5">
            <div><h3 className="m-0 text-lg font-bold text-ink">Preferencias de notificaciones</h3><p className="mt-1 text-xs text-secondary">Elige los avisos que recibirás en tu correo de acceso.</p></div>
            <label className="flex items-start gap-3 rounded-xl border border-sand-line p-4 text-sm text-ink"><input type="checkbox" className="mt-1 accent-green" checked={notifications.avisar_accesos_email} onChange={event => setNotifications({ ...notifications, avisar_accesos_email: event.target.checked })} /><span><strong className="block">Nuevos accesos</strong><small className="text-secondary">Recibe un correo cuando alguien inicie sesión en tu cuenta.</small></span></label>
            <label className="flex items-start gap-3 rounded-xl border border-sand-line p-4 text-sm text-ink"><input type="checkbox" className="mt-1 accent-green" checked={notifications.avisar_cambios_email} onChange={event => setNotifications({ ...notifications, avisar_cambios_email: event.target.checked })} /><span><strong className="block">Cambios de cuenta</strong><small className="text-secondary">Recibe un correo al cambiar tu dirección de acceso o contraseña.</small></span></label>
            <p className="m-0 text-xs text-secondary">Los correos necesarios para recuperar la cuenta se seguirán enviando.</p>
            <div className="flex justify-end"><button type="submit" disabled={busy} className={button}>Guardar preferencias</button></div>
          </form>}
          {account && section === 'sesiones' && <div className="grid gap-4"><div><h3 className="m-0 text-lg font-bold text-ink">Accesos recientes</h3><p className="mt-1 text-xs text-secondary">Inicios de sesión exitosos registrados desde que se activó este historial.</p></div>
            <div className="rounded-2xl border border-sand-line p-4"><p className="m-0 text-sm font-bold text-ink">Sesión activa en este navegador</p><p className="mt-1 text-xs text-secondary">Correo: {account.correo}</p><p className="mt-1 text-xs text-secondary">Tu sesión termina al cerrar sesión o cuando expire el acceso.</p></div>
            <div className="max-h-60 space-y-2 overflow-y-auto" aria-live="polite">
              {accesses === null && <p className="text-xs text-secondary">Cargando accesos…</p>}
              {accesses?.length === 0 && <p className="text-xs text-secondary">Todavía no hay accesos registrados.</p>}
              {accesses?.map(access => <div key={access.id} className="flex items-start justify-between gap-3 rounded-xl border border-sand-line p-3 text-xs">
                <div><strong className="block text-ink">{access.navegador} · {access.metodo === 'google' ? 'Google' : 'Contraseña'}</strong><span className="text-secondary">{access.direccion_ip ? `IP: ${access.direccion_ip}` : 'IP no disponible'}</span></div>
                <time className="text-right text-secondary" dateTime={access.fecha}>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(access.fecha))}</time>
              </div>)}
            </div>
            <button type="button" onClick={() => { authService.logout(); window.location.assign('/login?logout=1'); }} className="w-fit rounded-xl border border-sand-line px-4 py-2 text-xs font-semibold text-ink hover:bg-sand/50">Cerrar esta sesión</button>
          </div>}
        </div>
        <footer className="flex justify-end border-t border-sand-line px-6 py-4"><button type="button" onClick={onClose} className="rounded-xl border border-sand-line px-4 py-2 text-xs font-semibold text-secondary hover:bg-sand/40">Cerrar</button></footer>
      </div>
    </div>
  </div>, document.body);
}
