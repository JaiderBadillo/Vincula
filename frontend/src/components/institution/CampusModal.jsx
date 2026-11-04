import { useEffect, useState } from 'react';

const CITIES = ['Bucaramanga', 'Barrancabermeja', 'Piedecuesta', 'Floridablanca', 'Girón', 'Vélez', 'San Gil', 'Socorro', 'Málaga'];

export default function CampusModal({ isOpen, onClose, onSave, campus }) {
  const [form, setForm] = useState({
    name: '',
    city: 'Bucaramanga',
    department: 'Santander',
    address: '',
    phone: '',
    email: '',
    isMain: false,
    status: 'active',
    description: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (campus) {
      setForm({
        name: campus.name || '',
        city: campus.city || 'Bucaramanga',
        department: campus.department || 'Santander',
        address: campus.address || '',
        phone: campus.phone || '',
        email: campus.email || '',
        isMain: Boolean(campus.isMain),
        status: campus.status || 'active',
        description: campus.description || '',
      });
    } else {
      setForm({
        name: '',
        city: 'Bucaramanga',
        department: 'Santander',
        address: '',
        phone: '',
        email: '',
        isMain: false,
        status: 'active',
        description: '',
      });
    }
    setErrors({});
  }, [campus, isOpen]);

  if (!isOpen) return null;

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'El nombre de la sede es obligatorio.';
    if (!form.city.trim()) errs.city = 'La ciudad o municipio es obligatorio.';
    if (!form.address.trim()) errs.address = 'La dirección física es requerida.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'Escribe un correo electrónico válido.';
    }
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      city: form.city.trim(),
      department: form.department.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      description: form.description.trim(),
    };

    onSave(payload);
    onClose();
  }

  const inputClass =
    'w-full rounded-xl border border-sand-line bg-cream/50 px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary focus:border-terracotta focus:bg-white focus:outline-none transition-colors';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cocoa/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="campus-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-card border border-sand-line bg-white shadow-hero animate-rise-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sand-line px-6 py-4.5 bg-cream/40">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-sand text-terracotta text-xl">
              <i className="bx bxs-map-pin" />
            </span>
            <div>
              <h2 id="campus-modal-title" className="m-0 font-display text-base font-bold text-ink">
                {campus ? 'Editar Sede o Campus' : 'Registrar Nueva Sede'}
              </h2>
              <p className="m-0 text-xs text-secondary">
                Información de contacto, ubicación y asignación institucional
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-secondary hover:bg-cream hover:text-ink transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Nombre de la Sede */}
          <div>
            <label htmlFor="campus-name" className="block text-xs font-bold text-ink mb-1">
              Nombre de la Sede / Campus <span className="text-rose-500">*</span>:
            </label>
            <input
              id="campus-name"
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
              }}
              placeholder="Ej: Sede Regional Barrancabermeja"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary focus:outline-none transition-colors ${
                errors.name ? 'border-rose-500 bg-rose-50/20' : 'border-sand-line bg-cream/50 focus:border-terracotta focus:bg-white'
              }`}
            />
            {errors.name && <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.name}</p>}
          </div>

          {/* Ciudad y Departamento */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="campus-city" className="block text-xs font-bold text-ink mb-1">
                Ciudad / Municipio <span className="text-rose-500">*</span>:
              </label>
              <input
                id="campus-city"
                type="text"
                list="campus-cities-list"
                value={form.city}
                onChange={(e) => {
                  setForm({ ...form, city: e.target.value });
                  if (errors.city) setErrors((prev) => ({ ...prev, city: null }));
                }}
                placeholder="Ej: Bucaramanga"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary focus:outline-none transition-colors ${
                  errors.city ? 'border-rose-500 bg-rose-50/20' : 'border-sand-line bg-cream/50 focus:border-terracotta focus:bg-white'
                }`}
              />
              <datalist id="campus-cities-list">
                {CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {errors.city && <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.city}</p>}
            </div>

            <div>
              <label htmlFor="campus-dept" className="block text-xs font-bold text-ink mb-1">
                Departamento:
              </label>
              <input
                id="campus-dept"
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="Ej: Santander"
                className={inputClass}
              />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label htmlFor="campus-address" className="block text-xs font-bold text-ink mb-1">
              Dirección Física <span className="text-rose-500">*</span>:
            </label>
            <input
              id="campus-address"
              type="text"
              value={form.address}
              onChange={(e) => {
                setForm({ ...form, address: e.target.value });
                if (errors.address) setErrors((prev) => ({ ...prev, address: null }));
              }}
              placeholder="Ej: Calle 10 # 8-34, Barrio Palmira"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary focus:outline-none transition-colors ${
                errors.address ? 'border-rose-500 bg-rose-50/20' : 'border-sand-line bg-cream/50 focus:border-terracotta focus:bg-white'
              }`}
            />
            {errors.address && <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.address}</p>}
          </div>

          {/* Teléfono y Correo */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="campus-phone" className="block text-xs font-bold text-ink mb-1">
                Teléfono de Atención:
              </label>
              <input
                id="campus-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Ej: +57 (607) 622 1540"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="campus-email" className="block text-xs font-bold text-ink mb-1">
                Correo Electrónico de la Sede:
              </label>
              <input
                id="campus-email"
                type="email"
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                }}
                placeholder="sede@institucion.edu.co"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary focus:outline-none transition-colors ${
                  errors.email ? 'border-rose-500 bg-rose-50/20' : 'border-sand-line bg-cream/50 focus:border-terracotta focus:bg-white'
                }`}
              />
              {errors.email && <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.email}</p>}
            </div>
          </div>

          {/* Breve descripción o notas */}
          <div>
            <label htmlFor="campus-desc" className="block text-xs font-bold text-ink mb-1">
              Descripción / Notas de la Sede (Opcional):
            </label>
            <textarea
              id="campus-desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Instalaciones, servicios ofrecidos o cobertura territorial..."
              className="w-full rounded-xl border border-sand-line bg-cream/50 p-3 text-xs text-ink placeholder:text-secondary focus:border-terracotta focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          {/* Es Sede Principal Checkbox */}
          <div className="rounded-xl border border-sand-line bg-cream/40 p-3 flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-ink">Sede Principal / Rectoría</span>
              <span className="block text-[0.7rem] text-secondary">
                Marcar como la sede central administrativa de la institución
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.isMain}
                onChange={(e) => setForm({ ...form, isMain: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-sand-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-sand-line after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-terracotta" />
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-sand-line">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-sand-line px-4 py-2 text-xs font-bold text-secondary hover:bg-cream hover:text-ink transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-terracotta hover:bg-terracotta-dark px-5 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
            >
              {campus ? 'Guardar Cambios' : 'Registrar Sede'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
