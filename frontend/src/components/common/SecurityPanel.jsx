import { useEffect, useRef, useState } from 'react';
import { authService } from '../../services/authService.js';
import { GOOGLE_CLIENT_ID, formatDateTime } from './settingsApi.js';

const field = 'w-full rounded-xl border border-sand-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-green focus:ring-4 focus:ring-green/10';
const primary = 'rounded-xl bg-green-dark px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer';
const ghost = 'rounded-xl border border-sand-line bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-sand/50 cursor-pointer disabled:opacity-50';

function Row({ title, value, action, open, children }) {
  return (
    <div className="py-5">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-semibold text-ink">{title}</p>
          <p className="m-0 mt-0.5 truncate text-sm text-secondary">{value}</p>
        </div>
        {action}
      </div>
      {open && <div className="mt-4 rounded-xl bg-cream/60 p-4">{children}</div>}
    </div>
  );
}

/**
 * Seguridad de la cuenta: correo de acceso, contraseña, Google y sesión.
 * `request` es el cliente de createSettingsRequest; `notify({ error, success })` muestra el resultado en el marco.
 */
export default function SecurityPanel({ request, account, setAccount, notify }) {
  const [open, setOpen] = useState(null);
  const [email, setEmail] = useState(account.correo);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const googleSlot = useRef(null);
  const passwordRef = useRef('');

  function toggle(id) {
    setOpen((previous) => (previous === id ? null : id));
    setCurrent(''); setNext(''); setConfirmation(''); setEmail(account.correo); passwordRef.current = '';
    notify({});
  }

  function setPassword(value) { setCurrent(value); passwordRef.current = value; }

  async function run(action, onDone) {
    setBusy(true); notify({});
    try { const result = await action(); onDone?.(result); notify({ success: result.mensaje }); setOpen(null); setCurrent(''); setNext(''); setConfirmation(''); passwordRef.current = ''; }
    catch (err) { notify({ error: err.message }); }
    finally { setBusy(false); }
  }

  const saveEmail = (event) => {
    event.preventDefault();
    run(() => request('/correo', 'PUT', { correo: email.trim(), contrasena_actual: current }), (result) => {
      setAccount((old) => ({ ...old, correo: result.correo }));
      const user = authService.getCurrentUser();
      if (user) localStorage.setItem('vincula.auth.user', JSON.stringify({ ...user, correo: result.correo }));
    });
  };

  const savePassword = (event) => {
    event.preventDefault();
    if (next !== confirmation) { notify({ error: 'Las contraseñas no coinciden.' }); return; }
    run(() => request('/contrasena', 'PUT', { contrasena_actual: current, nueva_contrasena: next }));
  };

  const unlinkGoogle = (event) => {
    event.preventDefault();
    run(() => request('/google', 'DELETE', { contrasena_actual: current }), () => setAccount((old) => ({ ...old, google_vinculado: false })));
  };

  useEffect(() => {
    if (open !== 'google' || account.google_vinculado || !googleSlot.current) return undefined;
    let cancelled = false;
    let timer;
    function initialize() {
      if (cancelled) return;
      if (!window.google?.accounts?.id) { timer = setTimeout(initialize, 250); return; }
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, auto_select: false, callback: async ({ credential }) => {
        if (!passwordRef.current) { notify({ error: 'Escribe primero tu contraseña actual para vincular Google.' }); return; }
        setBusy(true); notify({});
        try {
          const result = await request('/google', 'POST', { credential, contrasena_actual: passwordRef.current });
          setAccount((old) => ({ ...old, google_vinculado: true }));
          notify({ success: result.mensaje }); setOpen(null); setCurrent(''); passwordRef.current = '';
        } catch (err) { notify({ error: err.message }); }
        finally { setBusy(false); }
      } });
      window.google.accounts.id.renderButton(googleSlot.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', width: 240 });
    }
    initialize();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, account.google_vinculado]); // eslint-disable-line react-hooks/exhaustive-deps

  const passwordField = (
    <label className="grid gap-1 text-xs font-semibold text-ink">Contraseña actual
      <input type="password" required autoComplete="current-password" className={field} value={current} onChange={(event) => setPassword(event.target.value)} />
    </label>
  );
  const toggleButton = (id, label) => <button type="button" className={ghost} aria-expanded={open === id} onClick={() => toggle(id)}>{open === id ? 'Cancelar' : label}</button>;

  return (
    <div className="divide-y divide-sand-line border-y border-sand-line">
      <Row title="Correo de acceso" value={account.correo} open={open === 'correo'} action={toggleButton('correo', 'Cambiar')}>
        {account.google_vinculado
          ? <p className="m-0 text-xs text-secondary">Tu cuenta está vinculada con Google. Desvincúlala aquí abajo antes de cambiar el correo.</p>
          : <form onSubmit={saveEmail} className="grid gap-3">
            <label className="grid gap-1 text-xs font-semibold text-ink">Nuevo correo
              <input type="email" required className={field} value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            {passwordField}
            <div className="flex justify-end"><button type="submit" disabled={busy || email.trim().toLowerCase() === account.correo} className={primary}>Guardar correo</button></div>
          </form>}
      </Row>

      <Row title="Contraseña" value="Mínimo 10 caracteres" open={open === 'clave'} action={toggleButton('clave', 'Cambiar')}>
        <form onSubmit={savePassword} className="grid gap-3">
          {passwordField}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold text-ink">Nueva contraseña
              <input type="password" required minLength={10} maxLength={72} autoComplete="new-password" className={field} value={next} onChange={(event) => setNext(event.target.value)} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-ink">Confirmar contraseña
              <input type="password" required minLength={10} autoComplete="new-password" className={field} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </label>
          </div>
          <div className="flex justify-end"><button type="submit" disabled={busy} className={primary}>Actualizar contraseña</button></div>
        </form>
      </Row>

      <Row title="Inicio de sesión con Google" value={account.google_vinculado ? 'Cuenta vinculada' : 'Sin vincular'} open={open === 'google'}
        action={toggleButton('google', account.google_vinculado ? 'Desvincular' : 'Vincular')}>
        {account.google_vinculado
          ? <form onSubmit={unlinkGoogle} className="grid gap-3">
            {passwordField}
            <div className="flex justify-end"><button type="submit" disabled={busy} className={primary}>Desvincular Google</button></div>
          </form>
          : <div className="grid gap-3">
            <p className="m-0 text-xs text-secondary">Usa una cuenta de Google con el mismo correo. Escribe tu contraseña actual y luego elige la cuenta.</p>
            {passwordField}
            <div ref={googleSlot} aria-label="Vincular cuenta de Google" />
          </div>}
      </Row>

      <Row title="Sesión en este navegador"
        value={account.ultimo_acceso ? `Último acceso: ${formatDateTime(account.ultimo_acceso)}` : 'Sesión activa'}
        action={<button type="button" className={ghost} onClick={() => { authService.logout(); window.location.assign('/login?logout=1'); }}>Cerrar sesión</button>} />
    </div>
  );
}
