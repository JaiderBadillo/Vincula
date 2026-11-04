import { useEffect, useState } from 'react';
import { useCompanySites } from '../../hooks/useCompanySites.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  'w-full rounded-lg border border-sand-line bg-cream/60 px-3 py-2 text-sm text-ink placeholder:text-body-muted outline-none transition-colors focus:border-terracotta focus:bg-white';

const emptyForm = {
  fullName: '',
  email: '',
  phone: '',
  siteIds: [],
};

export default function RecruiterModal({ isOpen, onClose, onSave, recruiter, availableSites }) {
  const { sites: hookSites } = useCompanySites();
  const sitesList = availableSites || hookSites || [];
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    const defaultSiteId = sitesList[0]?.id ? [sitesList[0].id] : [];
    setForm(
      recruiter
        ? {
            fullName: recruiter.fullName || '',
            email: recruiter.email || '',
            phone: recruiter.phone || '',
            siteIds: [...(recruiter.siteIds || [])],
          }
        : { ...emptyForm, siteIds: defaultSiteId }
    );
    setErrors({});
  }, [isOpen, recruiter, sitesList]);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleEscape(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function toggleSite(id) {
    setForm((prev) => ({
      ...prev,
      siteIds: prev.siteIds.includes(id) ? prev.siteIds.filter((s) => s !== id) : [...prev.siteIds, id],
    }));
    if (errors.siteIds) setErrors((prev) => ({ ...prev, siteIds: undefined }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!form.fullName.trim()) next.fullName = 'Escribe el nombre completo.';
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Escribe un correo válido.';
    if (form.siteIds.length === 0) next.siteIds = 'Selecciona al menos una sede.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSave({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      siteIds: form.siteIds,
    });
    onClose();
  }

  const isEditing = Boolean(recruiter);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recruiter-modal-title"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-card bg-white p-6 shadow-2xl sm:p-7"
      >
        <h2 id="recruiter-modal-title" className="m-0 font-display text-xl font-bold text-ink">
          {isEditing ? 'Editar reclutador' : 'Invitar reclutador'}
        </h2>
        <span className="mt-2 block h-[3px] w-9 rounded-full bg-terracotta" aria-hidden="true" />
        <p className="m-0 mt-3 text-xs text-secondary">
          {isEditing
            ? 'Actualiza los datos del reclutador y las sedes que gestiona.'
            : 'Le enviaremos una invitación al correo para que active su cuenta de reclutador.'}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="rec-name" className="block text-sm font-semibold text-ink">
              Nombre completo
            </label>
            <input
              id="rec-name"
              className={`${inputClass} mt-1.5`}
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              placeholder="Ej: Laura Sofía Pineda"
            />
            {errors.fullName && <p className="m-0 mt-1 text-xs text-rose-600">{errors.fullName}</p>}
          </div>
          <div>
            <label htmlFor="rec-email" className="block text-sm font-semibold text-ink">
              Correo corporativo
            </label>
            <input
              id="rec-email"
              type="email"
              className={`${inputClass} mt-1.5`}
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="nombre@empresa.com"
            />
            {errors.email && <p className="m-0 mt-1 text-xs text-rose-600">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="rec-phone" className="block text-sm font-semibold text-ink">
              Teléfono
            </label>
            <input
              id="rec-phone"
              className={`${inputClass} mt-1.5`}
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+57 300 000 0000"
            />
          </div>
        </div>

        {/* Sedes */}
        <fieldset className="m-0 mt-6 border-0 border-t border-sand-line p-0 pt-5">
          <legend className="float-left mb-3 w-full p-0 font-display text-sm font-bold text-ink">
            Sedes que gestiona
          </legend>
          <ul className="clear-both m-0 grid list-none gap-2 p-0">
            {sitesList.map((site) => (
              <li key={site.id}>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={form.siteIds.includes(site.id)}
                    onChange={() => toggleSite(site.id)}
                    className="size-4 cursor-pointer accent-terracotta"
                  />
                  <span>
                    {site.name}
                    <span className="mx-1.5 text-secondary/50">•</span>
                    <span className="text-secondary">{site.city}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {errors.siteIds && <p className="m-0 mt-2 text-xs text-rose-600">{errors.siteIds}</p>}
        </fieldset>

        <div className="mt-7 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-secondary hover:text-ink cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-terracotta px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-terracotta-dark cursor-pointer"
          >
            {isEditing ? 'Guardar cambios' : 'Enviar invitación'}
          </button>
        </div>
      </form>
    </div>
  );
}
