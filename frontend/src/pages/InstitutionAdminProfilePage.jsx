import { useEffect, useRef, useState } from 'react';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import { useInstitutionProfile } from '../hooks/useInstitutionProfile.js';
import { institutionPhotos } from '../data/institutionImages.js';

const NIT_PATTERN = /^\d{3}\.?\d{3}\.?\d{3}-?\d$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const inputClass =
  'w-full rounded-lg border border-sand-line bg-cream/60 px-3 py-2 text-sm text-ink placeholder:text-body-muted outline-none transition-colors focus:border-terracotta focus:bg-white';

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

function Card({ title, description, children }) {
  return (
    <section className="rounded-card border border-sand-line bg-white p-6 shadow-card sm:p-7">
      <h2 className="m-0 font-display text-lg font-bold text-ink">{title}</h2>
      <span className="mt-2 block h-[3px] w-9 rounded-full bg-terracotta" aria-hidden="true" />
      {description && <p className="m-0 mt-3 text-xs text-secondary">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PublicPreview({ form }) {
  const coverSrc = form.coverImage || institutionPhotos.perfilCover.src;

  return (
    <aside className="lg:sticky lg:top-24 self-start" aria-label="Vista previa del perfil institucional">
      <p className="m-0 mb-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-terracotta">
        Así ven la institución egresados y empresas
      </p>
      <article className="overflow-hidden rounded-card border border-sand-line bg-white shadow-card">
        <div className="showcase-card relative isolate h-32 bg-[#0e2216]">
          <img
            src={coverSrc}
            alt=""
            className="absolute inset-0 z-0 size-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="ies-shade--bottom absolute inset-0 z-10" aria-hidden="true" />
        </div>
        <div className="relative px-5 pb-5">
          <div className="-mt-7 flex items-end gap-3">
            <span className="rounded-2xl bg-white p-1 shadow-card">
              {form.logo ? (
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-sand-line bg-white p-1">
                  <img src={form.logo} alt={form.name} className="size-full object-contain" />
                </span>
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-terracotta font-display text-base font-bold text-white shadow-2xs">
                  {form.acronym || 'IES'}
                </span>
              )}
            </span>
          </div>
          <h3 className="m-0 mt-3 font-display text-base font-bold leading-snug text-ink">
            {form.name || 'Nombre de la Institución'}
          </h3>
          <p className="m-0 mt-0.5 text-xs text-secondary">
            {form.institutionType || 'Educación Superior'}
            <span className="mx-1.5 text-secondary/50">•</span>
            {form.city || 'Ciudad'}
          </p>
          <ul className="m-0 mt-4 grid list-none gap-2 border-t border-sand-line p-0 pt-4 text-xs text-ink/80">
            <li className="flex items-center gap-2">
              <i className="bx bx-id-card text-sm text-terracotta" aria-hidden="true" />
              <span className="truncate">NIT {form.nit || '—'}</span>
            </li>
            <li className="flex items-center gap-2">
              <i className="bx bx-globe text-sm text-terracotta" aria-hidden="true" />
              <span className="truncate">{form.website || 'Sin sitio web'}</span>
            </li>
            <li className="flex items-center gap-2">
              <i className="bx bx-envelope text-sm text-terracotta" aria-hidden="true" />
              <span className="truncate">{form.contactEmail || 'Sin correo'}</span>
            </li>
            <li className="flex items-center gap-2">
              <i className="bx bx-map-pin text-sm text-terracotta" aria-hidden="true" />
              <span className="truncate">{form.address || 'Sin dirección'}</span>
            </li>
          </ul>
        </div>
      </article>
    </aside>
  );
}

export default function InstitutionAdminProfilePage() {
  const { institutionProfile, updateInstitutionProfile, loading, loadError } = useInstitutionProfile();
  const [saved, setSaved] = useState(institutionProfile);
  const [form, setForm] = useState(institutionProfile);
  const [errors, setErrors] = useState({});
  const [logoError, setLogoError] = useState('');
  const [coverError, setCoverError] = useState('');
  const [confirmNit, setConfirmNit] = useState(false);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const coverFileRef = useRef(null);

  const isDirty = JSON.stringify(form) !== JSON.stringify(saved);

  useEffect(() => {
    if (!loading && !isDirty) {
      setSaved(institutionProfile);
      setForm(institutionProfile);
    }
  }, [institutionProfile, loading]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value, ...(['name', 'legalName'].includes(field) ? { name: value, legalName: value } : {}) }));
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

  function handleCover(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setCoverError('Usa una imagen PNG, JPG o WebP.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setCoverError('La portada pesa más de 2 MB.');
      return;
    }

    setCoverError('');
    const reader = new FileReader();
    reader.onload = () => update('coverImage', reader.result);
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

  async function persist() {
    setSaving(true);
    try {
      const result = await updateInstitutionProfile(form);
      setSaved(result);
      setForm(result);
      setConfirmNit(false);
      setToast('Los datos de la institución se guardaron exitosamente.');
    } catch (error) {
      setConfirmNit(false);
      setToast(error.message || 'No se pudieron guardar los datos.');
    } finally {
      setSaving(false);
    }
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
    setCoverError('');
  }

  return (
    <InstitutionPortalLayout activePage="admin-perfil" role="admin">
      <main className="w-full pb-28">
        {loading && <p role="status" className="mx-auto max-w-6xl px-5 pt-6 text-sm text-secondary">Cargando los datos de tu institución…</p>}
        {loadError && <p role="alert" className="mx-auto max-w-6xl px-5 pt-6 text-sm text-rose-600">{loadError}. Recarga la página para volver a intentarlo.</p>}
        {!loading && !loadError && (
        <form onSubmit={handleSave} noValidate className="mx-auto max-w-6xl px-5 pt-6 sm:px-8 lg:px-10">
          <InstitutionPageHero
            photo={institutionPhotos.perfil}
            eyebrow="Mi institución"
            title="Datos de la Institución"
            subtitle="Esta información oficial identifica a la institución en convenios empresariales, títulos y auditorías curriculares."
            stats={[
              { value: form.acronym || 'IES', label: 'Siglas' },
              { value: form.city || 'Santander', label: 'Sede Principal' },
            ]}
          />

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div data-tour="ies-admin-perfil" className="space-y-6">
              {/* Imagen, Logo y Portada Institucional */}
              <Card
                title="Imagen, Logo y Portada Institucional"
                description="Personaliza los elementos gráficos oficiales de la institución. Estos identifican a la universidad ante egresados, empresas y en convenios."
              >
                <div className="space-y-6">
                  {/* 1. Logo Institucional */}
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2.5">
                      1. Logo Oficial de la Institución
                    </span>
                    <div className="flex flex-wrap items-center gap-5">
                      {form.logo ? (
                        <span className="grid size-24 place-items-center rounded-2xl border border-sand-line bg-white p-2 overflow-hidden shadow-xs">
                          <img src={form.logo} alt="Logo de la institución" className="size-full object-contain" />
                        </span>
                      ) : (
                        <span
                          className="grid size-24 place-items-center rounded-2xl bg-terracotta font-display text-2xl font-bold text-white shadow-2xs"
                          aria-label="Sin logo, se muestran las siglas"
                        >
                          {form.acronym || 'IES'}
                        </span>
                      )}
                      <div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-sand-line bg-cream px-3.5 py-2 text-xs font-bold text-ink hover:bg-sand cursor-pointer transition-colors"
                          >
                            <i className="bx bx-upload text-sm text-terracotta" />
                            <span>{form.logo ? 'Cambiar logo' : 'Subir logo'}</span>
                          </button>
                          {form.logo && (
                            <button
                              type="button"
                              onClick={() => update('logo', null)}
                              className="text-xs font-semibold text-secondary hover:text-rose-600 cursor-pointer"
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                        <p className="m-0 mt-1.5 text-xs text-secondary">
                          PNG, JPG o WebP. Máx 2 MB. Proporción cuadrada o con fondo transparente.
                        </p>
                        {logoError && <p className="m-0 mt-1 text-xs text-rose-600">{logoError}</p>}
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleLogo}
                          className="sr-only"
                          tabIndex={-1}
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="border-sand-line/70 my-2" />

                  {/* 2. Foto de Portada / Banner Institucional */}
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2.5">
                      2. Foto de Portada / Banner Institucional
                    </span>
                    <div className="space-y-3">
                      <div className="relative isolate h-36 sm:h-44 w-full overflow-hidden rounded-xl border border-sand-line bg-[#0e2216] shadow-2xs">
                        <img
                          src={form.coverImage || institutionPhotos.perfilCover.src}
                          alt="Portada institucional"
                          className="absolute inset-0 size-full object-cover"
                        />
                        <div className="ies-shade--bottom absolute inset-0 z-10" aria-hidden="true" />

                        <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-2">
                          <span className="text-[0.7rem] font-bold text-white/95 bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/20">
                            {form.coverImage ? 'Portada personalizada' : 'Portada académica sugerida'}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => coverFileRef.current?.click()}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 hover:bg-white text-ink px-3 py-1.5 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              <i className="bx bx-camera text-sm text-terracotta" />
                              <span>{form.coverImage ? 'Cambiar portada' : 'Subir portada'}</span>
                            </button>

                            {form.coverImage && (
                              <button
                                type="button"
                                onClick={() => update('coverImage', null)}
                                className="inline-flex items-center gap-1 rounded-lg bg-cocoa/80 hover:bg-rose-600 text-white px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                                title="Restablecer portada sugerida"
                              >
                                <i className="bx bx-trash text-xs" />
                                <span className="hidden sm:inline">Restablecer</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="m-0 text-xs text-secondary">
                        PNG, JPG o WebP. Máx 2 MB. Proporción panorámica sugerida (1200 × 400 px). Se muestra como encabezado del perfil público que ven empresas y graduados.
                      </p>
                      {coverError && <p className="m-0 mt-1 text-xs text-rose-600">{coverError}</p>}
                      <input
                        ref={coverFileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleCover}
                        className="sr-only"
                        tabIndex={-1}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Identificación */}
              <Card title="Identificación Institucional">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field id="inst-name" label="Nombre Oficial" error={errors.name}>
                    <input id="inst-name" className={inputClass} value={form.name} readOnly={form.verificationStatus === 'aprobado'} onChange={(e) => update('name', e.target.value)} />
                  </Field>
                  <Field id="inst-acronym" label="Siglas" hint="Se muestran si no hay imagen.">
                    <input id="inst-acronym" className={inputClass} maxLength={6} value={form.acronym} onChange={(e) => update('acronym', e.target.value.toUpperCase())} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field id="inst-legal" label="Razón Social Legal" error={errors.legalName}>
                      <input id="inst-legal" className={inputClass} value={form.legalName} readOnly={form.verificationStatus === 'aprobado'} onChange={(e) => update('legalName', e.target.value)} />
                    </Field>
                  </div>
                  <Field
                    id="inst-nit"
                    label="NIT"
                    error={errors.nit}
                    hint={form.nit.trim() !== saved.nit ? 'Vas a cambiar el NIT. Te pediremos confirmarlo al guardar.' : undefined}
                  >
                    <input id="inst-nit" className={inputClass} inputMode="numeric" value={form.nit} readOnly={form.verificationStatus === 'aprobado'} onChange={(e) => update('nit', e.target.value)} />
                  </Field>
                  <Field id="inst-type" label="Tipo de Institución">
                    <input id="inst-type" className={inputClass} value={form.institutionType} onChange={(e) => update('institutionType', e.target.value)} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field id="inst-rep" label="Representante Legal o Rector">
                      <input id="inst-rep" className={inputClass} value={form.legalRepresentative} readOnly={form.verificationStatus === 'aprobado'} onChange={(e) => update('legalRepresentative', e.target.value)} />
                    </Field>
                  </div>
                </div>
              </Card>

              {/* Contacto y Ubicación */}
              <Card title="Contacto y Ubicación">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field id="inst-city" label="Ciudad">
                    <input id="inst-city" className={inputClass} value={form.city} onChange={(e) => update('city', e.target.value)} />
                  </Field>
                  <Field id="inst-dept" label="Departamento">
                    <input id="inst-dept" className={inputClass} value={form.department} onChange={(e) => update('department', e.target.value)} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field id="inst-address" label="Dirección Sede Central">
                      <input id="inst-address" className={inputClass} value={form.address} onChange={(e) => update('address', e.target.value)} />
                    </Field>
                  </div>
                  <Field id="inst-phone" label="Teléfono de Atención">
                    <input id="inst-phone" className={inputClass} value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                  </Field>
                  <Field id="inst-email" label="Correo Electrónico Institucional" error={errors.contactEmail}>
                    <input id="inst-email" type="email" className={inputClass} value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field id="inst-web" label="Sitio Web Oficial">
                      <input id="inst-web" className={inputClass} value={form.website} onChange={(e) => update('website', e.target.value)} />
                    </Field>
                  </div>
                </div>
              </Card>

            </div>

            <PublicPreview form={form} />
          </div>

          {/* Barra de guardado */}
          {isDirty && (
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-line bg-white/95 backdrop-blur-sm min-[1200px]:left-[17.5rem]">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:px-10">
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
                    className="rounded-lg bg-terracotta px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-terracotta-dark cursor-pointer shadow-xs"
                  >
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
        )}

        {/* Modal confirmación NIT */}
        {confirmNit && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa/55 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nit-confirm-title"
            onClick={() => setConfirmNit(false)}
          >
            <div className="w-full max-w-md rounded-card bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
                  className="rounded-lg bg-terracotta px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-terracotta-dark cursor-pointer shadow-xs"
                >
                  Sí, cambiar NIT
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div role="status" className="fixed bottom-20 right-6 z-50 rounded-lg bg-cocoa px-4 py-3 text-sm font-medium text-white shadow-lg">
            {toast}
          </div>
        )}
      </main>
    </InstitutionPortalLayout>
  );
}
