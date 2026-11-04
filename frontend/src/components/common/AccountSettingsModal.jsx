import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthCredentials } from '../../hooks/useAuthCredentials.js';
import { companyPhotos } from '../../data/companyImages.js';

function computePasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 10) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

  if (score <= 1) return { score: 1, label: 'Débil', color: 'bg-terracotta', text: 'text-terracotta' };
  if (score <= 3) return { score: 2, label: 'Media', color: 'bg-ochre', text: 'text-cocoa' };
  return { score: 3, label: 'Segura', color: 'bg-emerald-600', text: 'text-emerald-700' };
}

export default function AccountSettingsModal({
  isOpen,
  onClose,
  role = 'company_admin',
  userName = '',
  userAvatar = null,
  userInitials = '',
}) {
  const { getCredentials, updateCredentials } = useAuthCredentials();
  const currentCreds = getCredentials(role);

  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bloquea el scroll del body mientras el modal esté abierto
  useEffect(() => {
    if (!isOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Carga las credenciales actuales al abrir el modal
  useEffect(() => {
    if (isOpen && currentCreds) {
      setEmail(currentCreds.email || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setError(null);
      setSuccessMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen, currentCreds]);

  // Cierre con Escape
  useEffect(() => {
    if (!isOpen) return undefined;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentCreds) return null;

  const pwdStrength = computePasswordStrength(newPassword);

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('El correo electrónico de inicio de sesión no puede estar vacío.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    // Validaciones de cambio de contraseña
    if (newPassword.trim()) {
      if (!currentPassword) {
        setError('Ingresa tu contraseña actual para autorizar el cambio.');
        return;
      }
      if (newPassword.length < 6) {
        setError('La nueva contraseña debe tener como mínimo 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('La nueva contraseña y su confirmación no coinciden.');
        return;
      }
    }

    setIsSubmitting(true);

    const result = updateCredentials(role, {
      email: trimmedEmail,
      currentPassword: currentPassword || undefined,
      newPassword: newPassword.trim() || undefined,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error || 'Ocurrió un error al actualizar las credenciales.');
      return;
    }

    setSuccessMessage('¡Credenciales actualizadas correctamente!');
    setTimeout(() => {
      onClose();
    }, 1400);
  }

  const roleBadgeStyles = {
    graduate: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    institution_advisor: 'bg-ochre/25 text-cocoa border-ochre/40',
    institution_admin: 'bg-terracotta/15 text-terracotta-dark border-terracotta/25',
    company_admin: 'bg-sand text-cocoa border-sand-line',
    company_recruiter: 'bg-ochre/30 text-cocoa border-ochre/40',
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-ink/70 backdrop-blur-xs p-3 sm:p-5 flex items-center justify-center animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-settings-title"
      onClick={onClose}
    >
      {/* Contenedor rectangular apaisado */}
      <div
        className="relative w-full max-w-4xl my-auto overflow-hidden rounded-3xl border border-sand-line bg-white shadow-2xl grid grid-cols-1 md:grid-cols-12 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Columna lateral izquierda: Panel fotográfico cálido con recordatorio */}
        <div className="relative hidden md:flex md:col-span-5 flex-col justify-between overflow-hidden bg-cocoa text-white p-6 shrink-0">
          {/* Fotografía de fondo */}
          <img
            src={
              companyPhotos.configuracion?.src ||
              'https://images.pexels.com/photos/3184454/pexels-photo-3184454.jpeg?auto=compress&cs=tinysrgb&w=900&q=80'
            }
            alt=""
            className="absolute inset-0 size-full object-cover opacity-35"
          />
          {/* Degradado cálido corporativo sobre la foto */}
          <div className="absolute inset-0 bg-gradient-to-t from-cocoa via-cocoa/85 to-cocoa/40" />

          {/* Contenido superior: Perfil en uso */}
          <div className="relative z-10 space-y-1">
            <p className="m-0 text-[0.68rem] text-white/70 uppercase tracking-wider font-semibold">
              Perfil en uso
            </p>
            <h3 className="m-0 font-display text-base font-bold text-white leading-tight">
              {userName || currentCreds.name}
            </h3>
            <p className="m-0 text-xs text-ochre font-semibold">
              {currentCreds.roleLabel}
            </p>
          </div>

          {/* Tarjeta destacada: No olvides anotar tus datos de inicio */}
          <div className="relative z-10 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-ochre text-cocoa text-base font-bold shadow-xs">
                <i className="bx bx-notepad" />
              </span>
              <p className="m-0 font-display text-xs font-bold text-white leading-snug">
                No olvides anotar tus datos de inicio
              </p>
            </div>
            <p className="m-0 text-[0.7rem] leading-relaxed text-white/90">
              Guarda tu nuevo correo y contraseña en un lugar seguro o en tu gestor de contraseñas para recordar tu acceso a la plataforma.
            </p>
            <div className="pt-2 border-t border-white/15 space-y-1 text-[0.65rem] text-white/80">
              <p className="m-0 flex items-center gap-1.5">
                <i className="bx bx-check text-ochre text-sm" />
                <span>Los cambios aplican de inmediato</span>
              </p>
              <p className="m-0 flex items-center gap-1.5">
                <i className="bx bx-check text-ochre text-sm" />
                <span>Usa una clave de al menos 6 caracteres</span>
              </p>
            </div>
          </div>
        </div>

        {/* Columna derecha: Formulario de credenciales */}
        <div className="md:col-span-7 flex flex-col justify-between bg-white min-h-0">
          {/* Cabecera del formulario */}
          <div className="flex items-start justify-between border-b border-sand-line bg-cream/50 px-6 py-4">
            <div className="flex items-center gap-3">
              {userAvatar ? (
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white p-1 border border-sand-line shadow-2xs overflow-hidden">
                  <img src={userAvatar} alt="" className="size-full object-contain" />
                </span>
              ) : (
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cocoa text-ochre font-display text-xs font-bold shadow-2xs">
                  {userInitials || 'ID'}
                </span>
              )}
              <div>
                <h2 id="account-settings-title" className="m-0 font-display text-sm sm:text-base font-bold text-ink">
                  Configuración de inicio de sesión
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`rounded-full border px-2 py-0.2 text-[0.6rem] font-bold ${
                      roleBadgeStyles[role] || 'bg-sand text-cocoa border-sand-line'
                    }`}
                  >
                    {currentCreds.roleLabel}
                  </span>
                  <span className="text-[0.65rem] text-secondary">
                    Último cambio: {currentCreds.lastChanged}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-xl text-secondary hover:bg-sand/60 hover:text-ink transition-colors cursor-pointer"
              aria-label="Cerrar modal de configuración"
            >
              <i className="bx bx-x text-2xl" />
            </button>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3.5 flex-1">
            {/* Mensajes de error o éxito */}
            {error && (
              <div className="rounded-xl border border-terracotta/30 bg-terracotta/10 px-3 py-1.5 text-xs font-medium text-terracotta-dark flex items-center gap-2">
                <i className="bx bx-error-circle text-base shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 flex items-center gap-2">
                <i className="bx bx-check-circle text-base shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Campo: Correo de inicio de sesión */}
            <div>
              <label
                htmlFor="settings-email"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-secondary"
              >
                Correo de inicio de sesión
              </label>
              <div className="relative">
                <i
                  className="bx bx-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-secondary"
                  aria-hidden="true"
                />
                <input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-sand-line bg-white pl-10 pr-4 py-2 text-xs sm:text-sm text-ink outline-none transition-all focus:border-terracotta focus:ring-3 focus:ring-terracotta/10"
                  placeholder="tu@correo.com"
                />
              </div>
              <p className="mt-1 text-[0.65rem] text-secondary">
                Este correo es tu identificador para acceder a la plataforma.
              </p>
            </div>

            {/* Sección: Cambio de contraseña */}
            <div className="pt-2 border-t border-sand-line space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="m-0 text-xs font-bold uppercase tracking-wider text-secondary">
                  Cambio de contraseña
                </p>
                <span className="text-[0.65rem] text-secondary italic">Opcional</span>
              </div>

              {/* Contraseña actual */}
              <div>
                <label
                  htmlFor="settings-current-pwd"
                  className="mb-1 block text-xs font-semibold text-ink"
                >
                  Contraseña actual
                </label>
                <div className="relative">
                  <i
                    className="bx bx-lock-alt absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-secondary"
                    aria-hidden="true"
                  />
                  <input
                    id="settings-current-pwd"
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border border-sand-line bg-white pl-10 pr-10 py-1.5 text-xs sm:text-sm text-ink outline-none transition-all focus:border-terracotta focus:ring-3 focus:ring-terracotta/10"
                    placeholder="Ingresa tu contraseña actual"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-ink cursor-pointer"
                    aria-label={showCurrent ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
                  >
                    <i className={`bx ${showCurrent ? 'bx-hide' : 'bx-show'} text-base`} />
                  </button>
                </div>
              </div>

              {/* Fila en 2 columnas: Nueva clave y Confirmar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Nueva contraseña */}
                <div>
                  <label
                    htmlFor="settings-new-pwd"
                    className="mb-1 block text-xs font-semibold text-ink"
                  >
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <i
                      className="bx bx-key absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-secondary"
                      aria-hidden="true"
                    />
                    <input
                      id="settings-new-pwd"
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-sand-line bg-white pl-10 pr-10 py-1.5 text-xs sm:text-sm text-ink outline-none transition-all focus:border-terracotta focus:ring-3 focus:ring-terracotta/10"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-ink cursor-pointer"
                      aria-label={showNew ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                    >
                      <i className={`bx ${showNew ? 'bx-hide' : 'bx-show'} text-base`} />
                    </button>
                  </div>
                  {newPassword && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="h-1 flex-1 rounded-full bg-sand overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${pwdStrength.color}`}
                          style={{ width: `${(pwdStrength.score / 3) * 100}%` }}
                        />
                      </div>
                      <span className={`text-[0.62rem] font-bold ${pwdStrength.text}`}>
                        {pwdStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirmar nueva contraseña */}
                <div>
                  <label
                    htmlFor="settings-confirm-pwd"
                    className="mb-1 block text-xs font-semibold text-ink"
                  >
                    Confirmar nueva clave
                  </label>
                  <div className="relative">
                    <i
                      className="bx bx-check-shield absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-secondary"
                      aria-hidden="true"
                    />
                    <input
                      id="settings-confirm-pwd"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-sand-line bg-white pl-10 pr-10 py-1.5 text-xs sm:text-sm text-ink outline-none transition-all focus:border-terracotta focus:ring-3 focus:ring-terracotta/10"
                      placeholder="Repite la nueva clave"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-ink cursor-pointer"
                      aria-label={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                    >
                      <i className={`bx ${showConfirm ? 'bx-hide' : 'bx-show'} text-base`} />
                    </button>
                  </div>
                  {confirmPassword && newPassword && (
                    <p
                      className={`mt-1 text-[0.62rem] font-bold ${
                        confirmPassword === newPassword ? 'text-emerald-700' : 'text-terracotta'
                      }`}
                    >
                      {confirmPassword === newPassword ? '✓ Coinciden' : '✕ No coinciden'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-sand-line">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl border border-sand-line bg-white px-4 py-2 text-xs font-semibold text-secondary hover:bg-sand/40 hover:text-ink transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-terracotta px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-terracotta-dark transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin text-sm" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <i className="bx bx-save text-sm" />
                    <span>Guardar cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
