import { useEffect, useRef, useState } from 'react';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import { useInstitutionProfile } from '../hooks/useInstitutionProfile.js';

const NIT_PATTERN = /^\d{3}\.?\d{3}\.?\d{3}-?\d$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="m-0 mt-1 text-xs text-rose-600">{error}</p>
      ) : (
        hint && <p className="m-0 mt-1 text-xs text-secondary">{hint}</p>
      )}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-body-muted outline-none focus:border-ink';

export default function InstitutionAdminProfilePage() {
  const { institutionProfile, updateInstitutionProfile } = useInstitutionProfile();
  const [saved, setSaved] = useState(institutionProfile);
  const [form, setForm] = useState(institutionProfile);
  const [errors, setErrors] = useState({});
  const [logoError, setLogoError] = useState('');
  const [confirmNit, setConfirmNit] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  const isDirty = JSON.stringify(form) !== JSON.stringify(saved);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setLogoError('Usa una imagen PNG, JPG o WebP.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('La imagen pesa más de 2 MB.');
      return;
    }

    setLogoError('');
    const reader = new FileReader();
    reader.onload = () => update('logo', reader.result);
    reader.readAsDataURL(file);
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = 'Escribe el nombre de la institución.';
    if (!form.legalName.trim()) next.legalName = 'Escribe la razón social.';
    if (!NIT_PATTERN.test(form.nit.trim())) next.nit = 'El NIT debe verse así: 890.201.213-4';
    if (!EMAIL_PATTERN.test(form.contactEmail.trim())) next.contactEmail = 'Escribe un correo válido.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function persist() {
    updateInstitutionProfile(form);
    setSaved(form);
    setConfirmNit(false);
    setToast('Los datos de la institución se guardaron.');
  }

  function handleSave(event) {
    event.preventDefault();
    if (!validate()) return;
    if (form.nit.trim() !== saved.nit) {
      setConfirmNit(true);
      return;
    }
    persist();
  }

  function handleDiscard() {
    setForm(saved);
    setErrors({});
    setLogoError('');
  }

  return (
    <InstitutionPortalLayout activePage="admin-perfil" role="admin">
      <main className="w-full pb-28">
        <form onSubmit={handleSave} noValidate className="mx-auto max-w-3xl px-5 pt-8 sm:px-8 lg:px-10">
          <h1 className="m-0 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Datos de la institución
          </h1>
          <p className="m-0 mt-1 text-sm text-body-muted">
            Esta información aparece en el perfil público y en los convenios con empresas.
          </p>

          {/* Logo */}
          <section className="mt-8 flex flex-wrap items-center gap-5 border-t border-line pt-6">
            {form.logo ? (
              <span className="grid size-24 place-items-center rounded-2xl border border-line bg-white p-2 overflow-hidden shadow-xs">
                <img src={form.logo} alt="Logo de la institución" className="size-full object-contain" />
              </span>
            ) : (
              <span
                className="grid size-24 place-items-center rounded-2xl bg-ink font-display text-2xl font-bold text-lime"
                aria-label="Sin logo, se muestran las siglas"
              >
                {form.acronym || '—'}
              </span>
            )}
            <div>
              <p className="m-0 text-sm font-semibold text-ink">Imagen de la institución</p>
              <p className="m-0 mt-0.5 text-xs text-secondary">PNG, JPG o WebP. Máximo 2 MB. Mejor si es cuadrada.</p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-lg border border-line px-3.5 py-1.5 text-sm font-semibold text-ink hover:bg-page cursor-pointer"
                >
                  {form.logo ? 'Cambiar imagen' : 'Subir imagen'}
                </button>
                {form.logo && (
                  <button
                    type="button"
                    onClick={() => update('logo', null)}
                    className="text-sm font-semibold text-secondary hover:text-rose-600 cursor-pointer"
                  >
                    Quitar
                  </button>
                )}
              </div>
              {logoError && <p className="m-0 mt-2 text-xs text-rose-600">{logoError}</p>}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} className="sr-only" tabIndex={-1} />
            </div>
          </section>

          {/* Identificación */}
          <section className="mt-8 border-t border-line pt-6">
            <h2 className="m-0 font-display text-lg font-bold text-ink">Identificación</h2>
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field id="inst-name" label="Nombre" error={errors.name}>
                <input id="inst-name" className={inputClass} value={form.name} onChange={(e) => update('name', e.target.value)} />
              </Field>
              <Field id="inst-acronym" label="Siglas" hint="Se muestran si no hay imagen.">
                <input id="inst-acronym" className={inputClass} maxLength={6} value={form.acronym} onChange={(e) => update('acronym', e.target.value.toUpperCase())} />
              </Field>
              <Field id="inst-legal" label="Razón social" error={errors.legalName}>
                <input id="inst-legal" className={inputClass} value={form.legalName} onChange={(e) => update('legalName', e.target.value)} />
              </Field>
              <Field
                id="inst-nit"
                label="NIT"
                error={errors.nit}
                hint={form.nit.trim() !== saved.nit ? 'Vas a cambiar el NIT. Te pediremos confirmarlo al guardar.' : undefined}
              >
                <input id="inst-nit" className={inputClass} inputMode="numeric" value={form.nit} onChange={(e) => update('nit', e.target.value)} />
              </Field>
              <Field id="inst-type" label="Tipo de institución">
                <input id="inst-type" className={inputClass} value={form.institutionType} onChange={(e) => update('institutionType', e.target.value)} />
              </Field>
              <Field id="inst-rep" label="Representante legal">
                <input id="inst-rep" className={inputClass} value={form.legalRepresentative} onChange={(e) => update('legalRepresentative', e.target.value)} />
              </Field>
            </div>
          </section>

          {/* Contacto */}
          <section className="mt-8 border-t border-line pt-6">
            <h2 className="m-0 font-display text-lg font-bold text-ink">Contacto</h2>
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field id="inst-city" label="Ciudad">
                <input id="inst-city" className={inputClass} value={form.city} onChange={(e) => update('city', e.target.value)} />
              </Field>
              <Field id="inst-dept" label="Departamento">
                <input id="inst-dept" className={inputClass} value={form.department} onChange={(e) => update('department', e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field id="inst-address" label="Dirección">
                  <input id="inst-address" className={inputClass} value={form.address} onChange={(e) => update('address', e.target.value)} />
                </Field>
              </div>
              <Field id="inst-phone" label="Teléfono">
                <input id="inst-phone" className={inputClass} value={form.phone} onChange={(e) => update('phone', e.target.value)} />
              </Field>
              <Field id="inst-email" label="Correo de contacto" error={errors.contactEmail}>
                <input id="inst-email" type="email" className={inputClass} value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field id="inst-web" label="Sitio web">
                  <input id="inst-web" className={inputClass} value={form.website} onChange={(e) => update('website', e.target.value)} />
                </Field>
              </div>
            </div>
          </section>

          {/* Descripción */}
          <section className="mt-8 border-t border-line pt-6">
            <h2 className="m-0 font-display text-lg font-bold text-ink">Presentación</h2>
            <div className="mt-4">
              <Field id="inst-desc" label="Descripción corta" hint="Dos o tres frases para que las empresas conozcan la institución.">
                <textarea
                  id="inst-desc"
                  rows={3}
                  className={`${inputClass} resize-none`}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                />
              </Field>
            </div>
          </section>

          {/* Barra de guardado: solo aparece si hay cambios */}
          {isDirty && (
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur-sm min-[1200px]:left-[17.5rem]">
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:px-10">
                <p className="m-0 text-sm text-secondary">Tienes cambios sin guardar.</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDiscard}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-secondary hover:text-ink cursor-pointer"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-soft cursor-pointer"
                  >
                    Guardar cambios
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Confirmación al cambiar el NIT */}
        {confirmNit && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nit-confirm-title"
            onClick={() => setConfirmNit(false)}
          >
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 id="nit-confirm-title" className="m-0 font-display text-lg font-bold text-ink">
                ¿Cambiar el NIT?
              </h2>
              <p className="m-0 mt-2 text-sm text-body-muted">
                El NIT identifica legalmente a la institución y aparece en los convenios con empresas.
              </p>
              <dl className="m-0 mt-4 grid grid-cols-[4.5rem_1fr] gap-y-1.5 text-sm">
                <dt className="text-secondary">Antes</dt>
                <dd className="m-0 font-mono text-ink">{saved.nit}</dd>
                <dt className="text-secondary">Ahora</dt>
                <dd className="m-0 font-mono font-semibold text-ink">{form.nit.trim()}</dd>
              </dl>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmNit(false)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-secondary hover:text-ink cursor-pointer"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={persist}
                  className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-soft cursor-pointer"
                >
                  Sí, cambiar NIT
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div role="status" className="fixed bottom-20 right-6 z-50 rounded-lg bg-ink px-4 py-3 text-sm font-medium text-white shadow-lg">
            {toast}
          </div>
        )}
      </main>
    </InstitutionPortalLayout>
  );
}
