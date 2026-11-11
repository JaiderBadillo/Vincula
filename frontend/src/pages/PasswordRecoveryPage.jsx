import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { extractErrorMessage } from '../services/authService.js';

const API_BASE = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function submit(path, body) {
  let response;
  try {
    response = await fetch(`${API_BASE}/auth/recuperar-contrasena/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  } catch {
    throw new Error('No fue posible conectar con el servidor. Intenta nuevamente.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(extractErrorMessage(data, 'No pudimos completar la solicitud.'));
  return data;
}

export default function PasswordRecoveryPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('correo') || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [step, setStep] = useState('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function requestCode(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const result = await submit('solicitar', { correo: email.trim().toLowerCase() });
      setNotice(result.mensaje);
      setStep('code');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function changePassword(event) {
    event.preventDefault(); setError('');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setBusy(true);
    try {
      await submit('confirmar', { correo: email.trim().toLowerCase(), codigo: code, nueva_contrasena: password });
      setStep('done'); setPassword(''); setConfirm(''); setCode(''); setNotice('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const field = 'min-h-12 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-green focus:ring-4 focus:ring-green/10';
  return <main className="flex min-h-screen items-center justify-center bg-page px-4 py-10 text-ink">
    <div className="w-full max-w-md rounded-3xl border border-line bg-white p-7 shadow-hero sm:p-10">
      <Link to="/login" className="text-sm font-semibold text-green no-underline hover:underline">← Volver a iniciar sesión</Link>
      <div className="mt-7 grid size-12 place-items-center rounded-2xl bg-green/10 text-green"><i className="bx bx-lock-alt text-2xl" /></div>
      <h1 className="mt-5 font-display text-2xl font-semibold">Recupera tu contraseña</h1>
      <p className="mt-2 text-sm leading-relaxed text-secondary">
        {step === 'email' && 'Escribe el correo de tu cuenta y te enviaremos un código de seis dígitos.'}
        {step === 'code' && 'Escribe el código recibido y elige tu nueva contraseña. El código dura 10 minutos.'}
        {step === 'done' && 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.'}
      </p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-xl bg-green/10 p-3 text-sm text-green-dark">{notice}</p>}
      {step === 'email' && <form onSubmit={requestCode} className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm font-semibold">Correo electrónico
          <input className={field} type="email" autoComplete="email" required maxLength={255} value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" />
        </label>
        <button type="submit" disabled={busy} className="rounded-xl bg-green px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Enviando…' : 'Enviar código'}</button>
      </form>}
      {step === 'code' && <form onSubmit={changePassword} className="mt-6 grid gap-4">
        <p className="m-0 text-sm text-secondary">Correo: <strong>{email}</strong> <button type="button" onClick={() => { setStep('email'); setError(''); setNotice(''); }} className="ml-2 text-green underline">Cambiar</button></p>
        <label className="grid gap-2 text-sm font-semibold">Código de seis dígitos
          <input className={field} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">Nueva contraseña
          <input className={field} type="password" autoComplete="new-password" minLength={10} maxLength={72} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 10 caracteres" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">Confirmar contraseña
          <input className={field} type="password" autoComplete="new-password" minLength={10} maxLength={72} required value={confirm} onChange={e => setConfirm(e.target.value)} />
        </label>
        <button type="submit" disabled={busy} className="rounded-xl bg-green px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Guardando…' : 'Restablecer contraseña'}</button>
        <button type="button" disabled={busy} onClick={requestCode} className="text-sm font-semibold text-green disabled:opacity-60">Enviar otro código</button>
      </form>}
      {step === 'done' && <Link to="/login" className="mt-6 block rounded-xl bg-green px-5 py-3 text-center font-semibold text-white no-underline">Ir a iniciar sesión</Link>}
    </div>
  </main>;
}
