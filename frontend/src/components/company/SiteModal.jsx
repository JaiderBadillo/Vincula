import { useEffect, useState } from 'react';
import { AVAILABLE_CITIES } from '../../data/companySitesData.js';

const inputClass =
  'w-full rounded-xl border border-sand-line bg-cream/50 px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary focus:border-terracotta focus:bg-white focus:outline-none transition-colors';

const SUGGESTED_DEPARTMENTS = [
  'Talento Humano',
  'Tecnología e Información',
  'Operaciones & Logística',
  'Mantenimiento Mecánico',
  'Seguridad HSEQ',
  'Finanzas & Contabilidad',
  'Dirección General',
  'Comercial & Ventas',
  'Almacén & Suministros',
  'Control de Calidad',
];

export default function SiteModal({ isOpen, onClose, onSave, site }) {

  const [form, setForm] = useState({
    name: '',
    shortName: '',
    city: 'Bucaramanga',
    department: 'Santander',
    address: '',
    phone: '',
    email: '',
    manager: '',
    headcount: '',
    isMain: false,
    status: 'active',
    departments: [],
  });

  const [departmentInput, setDepartmentInput] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (site) {
      setForm({
        name: site.name || '',
        shortName: site.shortName || '',
        city: site.city || 'Bucaramanga',
        department: site.department || 'Santander',
        address: site.address || '',
        phone: site.phone || '',
        email: site.email || '',
        manager: site.manager || '',
        headcount: site.headcount !== undefined ? String(site.headcount) : '',
        isMain: Boolean(site.isMain),
        status: site.status || 'active',
        departments: Array.isArray(site.departments) ? [...site.departments] : [],
      });
      // Identificar los reclutadores que tienen asignada esta sede
    } else {
      setForm({
        name: '',
        shortName: '',
        city: 'Bucaramanga',
        department: 'Santander',
        address: '',
        phone: '',
        email: '',
        manager: '',
        headcount: '',
        isMain: false,
        status: 'active',
        departments: [],
      });
      // Por defecto, asociar al primer reclutador líder si existe
    }
    setDepartmentInput('');
    setErrors({});
  }, [isOpen, site]);

  if (!isOpen) return null;

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleAddDepartment(deptName) {
    const trimmed = deptName.trim();
    if (!trimmed) return;
    if (form.departments.includes(trimmed)) return;
    setForm((prev) => ({
      ...prev,
      departments: [...prev.departments, trimmed],
    }));
    setDepartmentInput('');
  }

  function handleRemoveDepartment(deptToRemove) {
    setForm((prev) => ({
      ...prev,
      departments: prev.departments.filter((d) => d !== deptToRemove),
    }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'El nombre de la sede es obligatorio.';
    if (!form.city.trim()) errs.city = 'La ciudad o municipio es obligatorio.';
    if (!form.address.trim()) errs.address = 'La dirección física es requerida.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'Escribe un correo electrónico corporativo válido.';
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      shortName: form.shortName.trim() || form.name.trim(),
      city: form.city.trim(),
      department: form.department.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      manager: form.manager.trim(),
      headcount: form.headcount ? Number.parseInt(form.headcount, 10) || 0 : 0,
      departments: form.departments,
    };

    const targetSiteId = site?.id;
    setSaving(true);
    try {
      await onSave(payload, targetSiteId);
      onClose();
    } catch (error) {
      setErrors((previous) => ({ ...previous, submit: error.message }));
    } finally {
      setSaving(false);
    }
  }

  const isEditing = Boolean(site);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cocoa/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-modal-title"
      onClick={onClose}
    >
      <div
        className="relative my-6 w-full max-w-2xl rounded-2xl border border-sand-line bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sand-line px-6 py-4.5 bg-cream/40">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-sand text-terracotta text-xl">
              <i className="bx bxs-map-pin" />
            </span>
            <div>
              <h2 id="site-modal-title" className="m-0 font-display text-base font-bold text-ink">
                {isEditing ? 'Editar Sede Corporativa' : 'Nueva Sede u Oficina Operativa'}
              </h2>
              <p className="m-0 text-xs text-secondary">
                Configura los datos de ubicación, áreas funcionales y reclutadores asociados.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-secondary hover:bg-sand hover:text-ink transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Nombre y Nombre Corto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="site-name" className="text-xs font-bold text-ink flex items-center gap-1">
                Nombre de la sede <span className="text-terracotta">*</span>
              </label>
              <input
                id="site-name"
                type="text"
                placeholder="Ej. Sede Administrativa Torre Empresarial"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={`${inputClass} ${errors.name ? 'border-terracotta bg-terracotta/5' : ''}`}
              />
              {errors.name && <p className="m-0 text-[0.7rem] text-terracotta font-medium">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="site-shortname" className="text-xs font-bold text-ink">
                Nombre corto / Sigla
              </label>
              <input
                id="site-shortname"
                type="text"
                placeholder="Ej. Torre Empresarial"
                value={form.shortName}
                onChange={(e) => updateField('shortName', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Ciudad, Departamento y Dirección */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="site-city" className="text-xs font-bold text-ink flex items-center gap-1">
                Ciudad / Municipio <span className="text-terracotta">*</span>
              </label>
              <select
                id="site-city"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                {AVAILABLE_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="site-dep" className="text-xs font-bold text-ink">
                Departamento
              </label>
              <input
                id="site-dep"
                type="text"
                value={form.department}
                onChange={(e) => updateField('department', e.target.value)}
                className={inputClass}
                placeholder="Santander"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="site-headcount" className="text-xs font-bold text-ink">
                N.° de Colaboradores
              </label>
              <input
                id="site-headcount"
                disabled
                title="El número de colaboradores todavía no se almacena para las sedes"
                type="number"
                min="0"
                placeholder="Ej. 85"
                value={form.headcount}
                onChange={(e) => updateField('headcount', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Dirección física */}
          <div className="space-y-1.5">
            <label htmlFor="site-address" className="text-xs font-bold text-ink flex items-center gap-1">
              Dirección física <span className="text-terracotta">*</span>
            </label>
            <input
              id="site-address"
              type="text"
              placeholder="Ej. Calle 36 # 29-45, Cabecera del Llano"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              className={`${inputClass} ${errors.address ? 'border-terracotta bg-terracotta/5' : ''}`}
            />
            {errors.address && (
              <p className="m-0 text-[0.7rem] text-terracotta font-medium">{errors.address}</p>
            )}
          </div>

          {/* Contacto: PBX, Email y Responsable */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="site-phone" className="text-xs font-bold text-ink">
                Teléfono PBX / Celular
              </label>
              <input
                id="site-phone"
                type="text"
                placeholder="+57 (607) 643-2000"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="site-email" className="text-xs font-bold text-ink">
                Correo de contacto
              </label>
              <input
                id="site-email"
                type="email"
                placeholder="sede.bga@cenit-transporte.com"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={`${inputClass} ${errors.email ? 'border-terracotta bg-terracotta/5' : ''}`}
              />
              {errors.email && (
                <p className="m-0 text-[0.7rem] text-terracotta font-medium">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="site-manager" className="text-xs font-bold text-ink">
                Responsable / Director/a
              </label>
              <input
                id="site-manager"
                type="text"
                placeholder="Ej. Responsable de sede"
                value={form.manager}
                onChange={(e) => updateField('manager', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Áreas y Departamentos que operan en esta sede */}
          <fieldset disabled className="rounded-xl border border-sand-line bg-cream/30 p-4 space-y-3 opacity-60">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <i className="bx bx-category text-terracotta" />
                  <span>Áreas y Departamentos en esta Sede</span>
                </label>
                <p className="m-0 text-[0.7rem] text-secondary">
                  La gestión de áreas aún no está conectada. Estos datos no se guardan desde este formulario.
                </p>
              </div>
              <span className="text-[0.7rem] font-bold text-cocoa bg-sand px-2 py-0.5 rounded-md">
                {form.departments.length} áreas
              </span>
            </div>

            {/* Chips actuales */}
            <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
              {form.departments.length === 0 ? (
                <span className="text-xs text-secondary/70 italic">Sin áreas registradas aún.</span>
              ) : (
                form.departments.map((dept) => (
                  <span
                    key={dept}
                    className="inline-flex items-center gap-1 rounded-lg border border-sand-line bg-white px-2.5 py-1 text-xs font-medium text-ink shadow-2xs"
                  >
                    <span>{dept}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDepartment(dept)}
                      className="text-secondary hover:text-terracotta cursor-pointer text-sm"
                      title={`Eliminar ${dept}`}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Input para agregar nueva área */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Escribe un área y pulsa Agregar..."
                value={departmentInput}
                onChange={(e) => setDepartmentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDepartment(departmentInput);
                  }
                }}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => handleAddDepartment(departmentInput)}
                className="shrink-0 rounded-xl bg-sand px-3 py-2 text-xs font-bold text-cocoa hover:bg-sand-line transition-colors cursor-pointer"
              >
                Agregar
              </button>
            </div>

            {/* Sugerencias rápidas */}
            <div className="flex items-center gap-1 flex-wrap pt-1">
              <span className="text-[0.68rem] text-secondary font-medium">Sugeridas:</span>
              {SUGGESTED_DEPARTMENTS.filter((d) => !form.departments.includes(d))
                .slice(0, 5)
                .map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => handleAddDepartment(dept)}
                    className="rounded-md border border-sand-line bg-white px-2 py-0.5 text-[0.68rem] font-medium text-secondary hover:text-cocoa hover:border-ochre transition-colors cursor-pointer"
                  >
                    + {dept}
                  </button>
                ))}
            </div>
          </fieldset>

          <p className="text-xs text-secondary">Las asignaciones de reclutadores se gestionan desde el equipo de reclutamiento.</p>

          {/* Opciones adicionales: Sede principal y Estado */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isMain}
                onChange={(e) => updateField('isMain', e.target.checked)}
                className="size-4 rounded accent-terracotta cursor-pointer"
              />
              <span className="text-xs font-semibold text-ink">
                Sede Principal de la Empresa
              </span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-secondary">Estado:</span>
              <div className="flex rounded-lg border border-sand-line p-0.5 bg-cream/40">
                <button
                  type="button"
                  onClick={() => updateField('status', 'active')}
                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    form.status === 'active'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-secondary hover:text-ink'
                  }`}
                >
                  Activa
                </button>
                <button
                  type="button"
                  onClick={() => updateField('status', 'inactive')}
                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    form.status === 'inactive'
                      ? 'bg-stone-500 text-white shadow-2xs'
                      : 'text-secondary hover:text-ink'
                  }`}
                >
                  Inactiva
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-sand-line pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-sand-line bg-white px-4 py-2.5 text-xs font-bold text-secondary hover:bg-cream hover:text-ink transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-cocoa px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-cocoa/90 transition-all cursor-pointer"
            >
              {isEditing ? 'Guardar Cambios' : 'Crear Sede'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

