import { useEffect, useRef, useState } from 'react';
import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';
import CompanyPageHero from '../components/company/CompanyPageHero.jsx';
import CompanyLogo from '../components/company/CompanyLogo.jsx';
import { useCompanyProfile } from '../hooks/useCompanyProfile.js';
import { COMPANY_SECTORS, COMPANY_SIZES } from '../data/companyAdminData.js';
import { companyPhotos } from '../data/companyImages.js';

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

/** Vista previa en vivo de la tarjeta que ven los egresados. */
function PublicPreview({ form }) {
  const coverSrc = form.coverImage || companyPhotos.perfilCover.src;

  return (
    <aside className="lg:sticky lg:top-24 self-start" aria-label="Vista previa del perfil público">
      <p className="m-0 mb-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-terracotta">
        Así te ven los egresados
      </p>
      <article className="overflow-hidden rounded-card border border-sand-line bg-white shadow-card">
        <div className="showcase-card relative isolate h-32 bg-cocoa">
          <img
            src={coverSrc}
            alt=""
            className="absolute inset-0 z-0 size-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="company-shade--bottom absolute inset-0 z-10" aria-hidden="true" />
        </div>
        <div className="relative px-5 pb-5">
          <div className="-mt-7 flex items-end gap-3">
            <span className="rounded-2xl bg-white p-1 shadow-card">
              <CompanyLogo profile={form} size="size-14" />
            </span>
          </div>
          <h3 className="m-0 mt-3 font-display text-base font-bold leading-snug text-ink">
            {form.name || form.commercialName || 'Nombre de la empresa'}
          </h3>
          <p className="m-0 mt-0.5 text-xs text-secondary">
            {form.sector}
            <span className="mx-1.5 text-secondary/50">•</span>
            {form.city || 'Ciudad'}
          </p>
          <p className="m-0 mt-3 line-clamp-4 text-xs leading-relaxed text-body-muted">
            {form.description || 'Escribe una descripción para que los egresados conozcan a tu empresa.'}
          </p>
          <ul className="m-0 mt-4 grid list-none gap-2 border-t border-sand-line p-0 pt-4 text-xs text-ink/80">
            <li className="flex items-center gap-2">
              <i className="bx bx-group text-sm text-terracotta" aria-hidden="true" />
              <span className="truncate">{form.size}</span>
            </li>
            <li className="flex items-center gap-2">
              <i className="bx bx-globe text-sm text-terracotta" aria-hidden="true" />
              <span className="truncate">{form.website || 'Sin sitio web'}</span>
            </li>
            <li className="flex items-center gap-2">
              <i className="bx bx-envelope text-sm text-terracotta" aria-hidden="true" />
              <span className="truncate">{form.contactEmail || 'Sin correo'}</span>
            </li>
          </ul>
        </div>
      </article>
    </aside>
  );
}

export default function CompanyAdminProfilePage() {
  const { companyProfile, updateCompanyProfile } = useCompanyProfile();
  const [saved, setSaved] = useState(companyProfile);
  const [form, setForm] = useState(companyProfile);
  const [errors, setErrors] = useState({});
  const [logoError, setLogoError] = useState('');
  const [coverError, setCoverError] = useState('');
  const [confirmNit, setConfirmNit] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);
  const coverFileRef = useRef(null);

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

  function updateRep(field, value) {
    setForm((prev) => ({ ...prev, legalRepresentative: { ...prev.legalRepresentative, [field]: value } }));
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
    if (!form.name.trim()) next.name = 'Escribe el nombre de la empresa.';
    if (!form.legalName.trim()) next.legalName = 'Escribe la razón social.';
    if (!NIT_PATTERN.test(form.nit.trim())) next.nit = 'El NIT debe verse así: 900.531.210-3';
    if (!EMAIL_PATTERN.test(form.contactEmail.trim())) next.contactEmail = 'Escribe un correo válido.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function persist() {
    updateCompanyProfile(form);
    setSaved(form);
    setConfirmNit(false);
    setToast('Los datos de la empresa se guardaron.');
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
    <CompanyPortalLayout activePage="admin-perfil">
      <main className="w-full pb-28">
        <form onSubmit={handleSave} noValidate className="mx-auto max-w-6xl px-5 pt-6 sm:px-8 lg:px-10">
          <CompanyPageHero
            photo={companyPhotos.perfil}
            title="Datos de la empresa"
            subtitle="Esta información aparece en tus vacantes, en los convenios con instituciones y en el perfil que ven los egresados."
            stats={[
              { value: form.sector || '—', label: 'Sector' },
              { value: form.city || '—', label: 'Sede principal' },
            ]}
          />

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div data-tour="company-admin-perfil" className="space-y-6">
              {/* Imagen, Logo y Portada Corporativa */}
              <Card
                title="Imagen, Logo y Portada Corporativa"
                description="Personaliza los elementos visuales oficiales de la empresa. Estos identifican a tu organización ante los egresados en convocatorias y en convenios institucionales."
              >
                <div className="space-y-6">
                  {/* 1. Logotipo Corporativo */}
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2.5">
                      1. Logotipo Corporativo
                    </span>
                    <div className="flex flex-wrap items-center gap-5">
                      <CompanyLogo profile={form} size="size-24" />
                      <div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="rounded-lg border border-sand-line bg-cream px-3.5 py-1.5 text-sm font-semibold text-ink hover:bg-sand cursor-pointer transition-colors"
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

                  {/* 2. Foto de Portada / Banner Corporativo */}
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2.5">
                      2. Foto de Portada / Banner Corporativo
                    </span>
                    <div className="space-y-3">
                      <div className="relative isolate h-36 sm:h-44 w-full overflow-hidden rounded-xl border border-sand-line bg-cocoa shadow-2xs">
                        <img
                          src={form.coverImage || companyPhotos.perfilCover.src}
                          alt="Portada corporativa de la empresa"
                          className="absolute inset-0 size-full object-cover"
                        />
                        <div className="company-shade--bottom absolute inset-0 z-10" aria-hidden="true" />

                        <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-2">
                          <span className="text-[0.7rem] font-bold text-white/95 bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/20">
                            {form.coverImage ? 'Portada personalizada' : 'Portada corporativa sugerida'}
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
                        PNG, JPG o WebP. Máx 2 MB. Proporción panorámica sugerida (1200 × 400 px). Se muestra como encabezado del perfil que ven los egresados en convocatorias y búsquedas de talento.
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
              <Card title="Identificación">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field id="co-name" label="Nombre de la empresa" error={errors.name}>
                    <input id="co-name" className={inputClass} value={form.name} onChange={(e) => update('name', e.target.value)} />
                  </Field>
                  <Field id="co-commercial" label="Nombre comercial">
                    <input id="co-commercial" className={inputClass} value={form.commercialName} onChange={(e) => update('commercialName', e.target.value)} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field id="co-legal" label="Razón social" error={errors.legalName}>
                      <input id="co-legal" className={inputClass} value={form.legalName} onChange={(e) => update('legalName', e.target.value)} />
                    </Field>
                  </div>
                  <Field
                    id="co-nit"
                    label="NIT"
                    error={errors.nit}
                    hint={form.nit.trim() !== saved.nit ? 'Vas a cambiar el NIT. Te pediremos confirmarlo al guardar.' : undefined}
                  >
                    <input id="co-nit" className={inputClass} inputMode="numeric" value={form.nit} onChange={(e) => update('nit', e.target.value)} />
                  </Field>
                  <Field id="co-sector" label="Sector económico">
                    <select id="co-sector" className={`${inputClass} cursor-pointer`} value={form.sector} onChange={(e) => update('sector', e.target.value)}>
                      {COMPANY_SECTORS.map((sector) => (
                        <option key={sector} value={sector}>{sector}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field id="co-size" label="Tamaño de la empresa">
                      <select id="co-size" className={`${inputClass} cursor-pointer`} value={form.size} onChange={(e) => update('size', e.target.value)}>
                        {COMPANY_SIZES.map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              </Card>

              {/* Contacto */}
              <Card title="Contacto">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field id="co-city" label="Ciudad">
                    <input id="co-city" className={inputClass} value={form.city} onChange={(e) => update('city', e.target.value)} />
                  </Field>
                  <Field id="co-dept" label="Departamento">
                    <input id="co-dept" className={inputClass} value={form.department} onChange={(e) => update('department', e.target.value)} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field id="co-address" label="Dirección principal">
                      <input id="co-address" className={inputClass} value={form.address} onChange={(e) => update('address', e.target.value)} />
                    </Field>
                  </div>
                  <Field id="co-phone" label="Teléfono">
                    <input id="co-phone" className={inputClass} value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                  </Field>
                  <Field id="co-email" label="Correo de contacto" error={errors.contactEmail}>
                    <input id="co-email" type="email" className={inputClass} value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field id="co-web" label="Sitio web">
                      <input id="co-web" className={inputClass} value={form.website} onChange={(e) => update('website', e.target.value)} />
                    </Field>
                  </div>
                </div>
              </Card>

              {/* Representante legal */}
              <Card title="Representante legal">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field id="co-rep-name" label="Nombre completo">
                    <input id="co-rep-name" className={inputClass} value={form.legalRepresentative.name} onChange={(e) => updateRep('name', e.target.value)} />
                  </Field>
                  <Field id="co-rep-role" label="Cargo">
                    <input id="co-rep-role" className={inputClass} value={form.legalRepresentative.role} onChange={(e) => updateRep('role', e.target.value)} />
                  </Field>
                  <Field id="co-rep-doc" label="Documento de identidad">
                    <input id="co-rep-doc" className={inputClass} value={form.legalRepresentative.documentId} onChange={(e) => updateRep('documentId', e.target.value)} />
                  </Field>
                </div>
              </Card>

              {/* Presentación */}
              <Card title="Presentación">
                <Field id="co-desc" label="Descripción corta" hint="Dos o tres frases para que los egresados conozcan a la empresa.">
                  <textarea
                    id="co-desc"
                    rows={3}
                    className={`${inputClass} resize-none`}
                    value={form.description}
                    onChange={(e) => update('description', e.target.value)}
                  />
                </Field>
              </Card>
            </div>

            <PublicPreview form={form} />
          </div>

          {/* Barra de guardado: solo aparece si hay cambios */}
          {isDirty && (
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-line bg-white/95 backdrop-blur-sm min-[1200px]:left-[5.5rem]">
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
                    className="rounded-lg bg-terracotta px-4 py-2 text-sm font-semibold text-white hover:bg-terracotta-dark cursor-pointer transition-colors"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa/55 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="co-nit-confirm-title"
            onClick={() => setConfirmNit(false)}
          >
            <div className="w-full max-w-md rounded-card bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 id="co-nit-confirm-title" className="m-0 font-display text-lg font-bold text-ink">
                ¿Cambiar el NIT?
              </h2>
              <p className="m-0 mt-2 text-sm text-body-muted">
                El NIT identifica legalmente a la empresa y aparece en los convenios con las instituciones.
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
                  className="rounded-lg bg-terracotta px-4 py-2 text-sm font-semibold text-white hover:bg-terracotta-dark cursor-pointer transition-colors"
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
    </CompanyPortalLayout>
  );
}
