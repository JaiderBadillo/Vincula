import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { authService, extractErrorMessage } from '../../services/authService.js';

const API = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || '698543862122-050jkphuknmg709207im4lfs39744ef8.apps.googleusercontent.com';
const tabs = [
  { id: 'cuenta', title: 'Cuenta', detail: 'Correo de acceso', icon: 'bx-user' },
  { id: 'perfil', title: 'Perfil', detail: 'Tu identidad', icon: 'bx-id-card' },
  { id: 'seguridad', title: 'Seguridad', detail: 'Contraseña y Google', icon: 'bx-shield-quarter' },
  { id: 'sesiones', title: 'Accesos', detail: 'Sesión y actividad', icon: 'bx-devices' },
];
const labels = {
  graduate: 'Egresado', institution_admin: 'Administrador IES', company_admin: 'Administrador de empresa',
  company_recruiter: 'Reclutador', vincula_admin: 'Superadministrador',
};
const profilePaths = { graduate: '/dashboard/perfil', institution_admin: '/institucion/admin/perfil',
  company_admin: '/empresa/admin/perfil', company_recruiter: '/empresa/reclutador/dashboard', vincula_admin: '/admin/dashboard' };
const field = 'w-full rounded-xl border border-sand-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-green';
const primary = 'rounded-xl bg-green-dark px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50';

async function request(path = '', method = 'GET', payload) {
  const response = await fetch(`${API}/auth/cuenta/configuracion${path}`, {
    method,
    headers: { Authorization: `Bearer ${authService.getToken()}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(extractErrorMessage(data, 'No se pudo guardar el cambio.'));
  return data;
}

export default function UniversalSettingsModal({ isOpen, onClose, role, userName, userAvatar, userInitials }) {
  const [tab, setTab] = useState('cuenta');
  const [account, setAccount] = useState(null);
  const [email, setEmail] = useState('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const googleSlot = useRef(null);
  const passwordRef = useRef('');

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTab('cuenta'); setAccount(null); setError(''); setSuccess('');
    setCurrent(''); setNext(''); setConfirmation(''); passwordRef.current = '';
    let cancelled = false;
    request().then(data => { if (!cancelled) { setAccount(data); setEmail(data.correo); } })
      .catch(err => { if (!cancelled) setError(err.message); });
    const escape = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', escape);
    return () => { cancelled = true; document.body.style.overflow = previous; window.removeEventListener('keydown', escape); };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || tab !== 'seguridad' || !account || account.google_vinculado || !googleSlot.current) return undefined;
    let cancelled = false;
    let timer;
    function initialize() {
      if (cancelled) return;
      if (!window.google?.accounts?.id) { timer = setTimeout(initialize, 250); return; }
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, auto_select: false, callback: async ({ credential }) => {
        if (!passwordRef.current) { setError('Escribe primero tu contraseña actual para vincular Google.'); return; }
        setBusy(true); setError('');
        try {
          const result = await request('/google', 'POST', { credential, contrasena_actual: passwordRef.current });
          setAccount(old => ({ ...old, google_vinculado: true }));
          setSuccess(result.mensaje); setCurrent(''); passwordRef.current = '';
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
      }});
      window.google.accounts.id.renderButton(googleSlot.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', width: 240 });
    }
    initialize();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isOpen, tab, account?.google_vinculado]);

  async function save(event, type) {
    event.preventDefault(); setError(''); setSuccess('');
    if (type === 'password' && next !== confirmation) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try {
      const result = type === 'email'
        ? await request('/correo', 'PUT', { correo: email.trim(), contrasena_actual: current })
        : await request('/contrasena', 'PUT', { contrasena_actual: current, nueva_contrasena: next });
      if (type === 'email') {
        setAccount(old => ({ ...old, correo: result.correo }));
        const user = authService.getCurrentUser();
        if (user) localStorage.setItem('vincula.auth.user', JSON.stringify({ ...user, correo: result.correo }));
      }
      setSuccess(result.mensaje); setCurrent(''); setNext(''); setConfirmation(''); passwordRef.current = '';
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function unlink() {
    if (!current) { setError('Escribe tu contraseña actual para desvincular Google.'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      const result = await request('/google', 'DELETE', { contrasena_actual: current });
      setAccount(old => ({ ...old, google_vinculado: false }));
      setSuccess(result.mensaje); setCurrent(''); passwordRef.current = '';
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (!isOpen) return null;
  return createPortal(<div role="dialog" aria-modal="true" aria-labelledby="universal-settings-title" onClick={onClose}
    className="fixed inset-0 z-[10002] flex items-center justify-center overflow-y-auto bg-ink/70 p-3 backdrop-blur-xs sm:p-5">
    <div onClick={event => event.stopPropagation()} className="my-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-sand-line bg-white shadow-2xl md:grid-cols-[minmax(250px,36%)_1fr]">
      <aside className="relative flex flex-col justify-between overflow-hidden bg-cocoa p-4 text-white md:min-h-[590px] md:p-6">
        <img src="/images/profile/cover-office.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-cocoa via-cocoa/90 to-cocoa/40" />
        <div className="relative z-10">
          <p className="m-0 text-[0.7rem] font-bold uppercase tracking-widest text-white/70">Perfil en uso</p>
          <h3 className="mt-1 font-display text-lg font-bold text-white">{userName || account?.nombre || 'Mi cuenta'}</h3>
          <p className="text-xs font-semibold text-ochre">{labels[role] || 'Cuenta Víncula'}</p>
          <nav aria-label="Secciones de configuración" className="mt-4 grid grid-cols-2 gap-2 md:mt-7 md:grid-cols-1">
            {tabs.map(item => <button key={item.id} type="button" aria-current={tab === item.id ? 'page' : undefined}
              onClick={() => { setTab(item.id); setError(''); setSuccess(''); setCurrent(''); passwordRef.current = ''; }}
              className={`flex items-center justify-center gap-3 rounded-xl border px-2 py-2 text-center md:justify-start md:px-3 md:py-3 md:text-left ${tab === item.id ? 'border-lime/60 bg-white/20' : 'border-transparent hover:bg-white/10'}`}>
              <i className={`bx ${item.icon} hidden text-xl text-lime md:block`} aria-hidden="true" />
              <span><strong className="block text-[0.68rem] text-white md:text-xs">{item.title}</strong><small className="hidden text-[0.65rem] text-white/70 md:block">{item.detail}</small></span>
            </button>)}
          </nav>
        </div>
        <div className="relative z-10 mt-6 hidden rounded-2xl border border-white/20 bg-white/10 p-4 text-xs text-white/90 md:block">Confirma los cambios de acceso con tu contraseña actual.</div>
      </aside>
      <div className="flex min-h-[480px] flex-col md:min-h-[560px]">
        <header className="flex items-center justify-between gap-3 border-b border-sand-line bg-cream/50 px-6 py-5">
          <div className="flex items-center gap-3">
            {userAvatar ? <img src={userAvatar} alt="" className="size-10 rounded-xl border border-sand-line object-contain" /> : <span className="grid size-10 place-items-center rounded-xl bg-cocoa text-xs font-bold text-ochre">{userInitials || 'ID'}</span>}
            <div><h2 id="universal-settings-title" className="m-0 font-display text-base font-bold text-ink">Configuración de cuenta</h2><p className="m-0 text-xs text-secondary">{labels[role] || 'Cuenta'} · {tabs.find(item => item.id === tab)?.title}</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar configuración" className="grid size-9 place-items-center rounded-xl text-2xl text-secondary hover:bg-sand/50"><i className="bx bx-x" /></button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          {error && <p role="alert" className="rounded-xl border border-terracotta/30 bg-terracotta/10 p-3 text-xs text-terracotta-dark">{error}</p>}
          {success && <p role="status" className="rounded-xl border border-green/20 bg-green/10 p-3 text-xs text-green-dark">{success}</p>}
          {!account && !error && <p className="text-sm text-secondary">Cargando tu cuenta…</p>}
          {account && tab === 'cuenta' && <form onSubmit={event => save(event, 'email')} className="grid gap-5">
            <div><h3 className="text-lg font-bold text-ink">Correo de inicio de sesión</h3><p className="mt-1 text-xs text-secondary">Este es el correo registrado para entrar a Víncula.</p></div>
            <label className="grid gap-2 text-xs font-semibold text-secondary">Correo electrónico<input type="email" required className={field} value={email} onChange={event => setEmail(event.target.value)} /></label>
            <label className="grid gap-2 text-xs font-semibold text-secondary">Contraseña actual<input type="password" required autoComplete="current-password" className={field} value={current} onChange={event => setCurrent(event.target.value)} /></label>
            {account.google_vinculado && <p className="rounded-xl bg-sand/60 p-3 text-xs text-cocoa">Desvincula Google en Seguridad antes de cambiar el correo.</p>}
            <div className="flex justify-end"><button type="submit" disabled={busy || email.trim().toLowerCase() === account.correo} className={primary}>Guardar correo</button></div>
          </form>}
          {account && tab === 'perfil' && <div className="grid gap-4">
            <h3 className="text-lg font-bold text-ink">Datos del perfil</h3>
            <div className="rounded-xl border border-sand-line p-4 text-sm"><p><strong>Nombre:</strong> {account.nombre}</p><p className="mt-2"><strong>Correo:</strong> {account.correo}</p><p className="mt-2"><strong>Rol:</strong> {labels[role] || account.rol}</p></div>
            <a href={profilePaths[role] || '/dashboard'} className="w-fit rounded-xl border border-sand-line px-4 py-2 text-xs font-bold text-ink hover:bg-sand/50">Ir a mi perfil</a>
          </div>}
          {account && tab === 'seguridad' && <div className="grid gap-6">
            <form onSubmit={event => save(event, 'password')} className="grid gap-3 border-b border-sand-line pb-6">
              <div><h3 className="text-lg font-bold text-ink">Cambiar contraseña</h3><p className="mt-1 text-xs text-secondary">La nueva contraseña debe tener al menos 10 caracteres.</p></div>
              <label className="grid gap-1 text-xs font-semibold">Contraseña actual<input type="password" required autoComplete="current-password" className={field} value={current} onChange={event => { setCurrent(event.target.value); passwordRef.current = event.target.value; }} /></label>
              <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-semibold">Nueva contraseña<input type="password" required minLength={10} maxLength={72} autoComplete="new-password" className={field} value={next} onChange={event => setNext(event.target.value)} /></label>
                <label className="grid gap-1 text-xs font-semibold">Confirmar contraseña<input type="password" required minLength={10} autoComplete="new-password" className={field} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label></div>
              <div className="flex justify-end"><button type="submit" disabled={busy} className={primary}>Actualizar contraseña</button></div>
            </form>
            <div className="grid gap-3"><h3 className="text-lg font-bold text-ink">Cuenta de Google</h3><p className="text-sm">Estado: {account.google_vinculado ? 'Vinculada' : 'Sin vincular'}</p>
              {account.google_vinculado ? <button type="button" disabled={busy} onClick={unlink} className="w-fit rounded-xl border border-sand-line px-4 py-2 text-xs font-semibold">Desvincular Google</button> : <div ref={googleSlot} aria-label="Vincular cuenta de Google" />}
              <p className="text-xs text-secondary">Escribe tu contraseña actual arriba antes de vincular o desvincular Google.</p>
            </div>
          </div>}
          {account && tab === 'sesiones' && <div className="grid gap-4"><h3 className="text-lg font-bold text-ink">Acceso a tu cuenta</h3>
            <div className="rounded-xl border border-sand-line p-4 text-sm"><strong>Sesión activa en este navegador</strong><p className="mt-2 text-secondary">{account.correo}</p></div>
            {account.ultimo_acceso && <p className="text-sm text-secondary">Último acceso registrado: {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(account.ultimo_acceso))}</p>}
            <button type="button" onClick={() => { authService.logout(); window.location.assign('/login?logout=1'); }} className="w-fit rounded-xl border border-sand-line px-4 py-2 text-xs font-semibold">Cerrar esta sesión</button>
          </div>}
        </div>
        <footer className="flex justify-end border-t border-sand-line px-6 py-4"><button type="button" onClick={onClose} className="rounded-xl border border-sand-line px-4 py-2 text-xs font-semibold text-secondary">Cerrar</button></footer>
      </div>
    </div>
  </div>, document.body);
}
