import { useEffect, useState } from 'react';

const ACCENT_COLORS = [
  { id: 'terracotta', label: 'Institucional', bg: 'bg-sand text-terracotta-dark border-sand-line' },
  { id: 'ochre', label: 'Verde Sabio', bg: 'bg-emerald-50 text-emerald-900 border-emerald-300' },
  { id: 'cocoa', label: 'Cacao Profundo', bg: 'bg-stone-200 text-stone-900 border-stone-300' },
  { id: 'emerald', label: 'Esmeralda', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'rose', label: 'Coral / Rosa', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
];

export default function FacultyModal({ isOpen, onClose, faculty, onSave }) {
  const isEditing = Boolean(faculty);

  const [form, setForm] = useState({
    name: '',
    acronym: '',
    phone: '',
    office: '',
    status: 'active',
    description: '',
    accentColor: 'terracotta',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (faculty) {
      setForm({
        name: faculty.name || '',
        acronym: faculty.acronym || '',
        code: faculty.code || '',
        phone: faculty.phone || '',
        office: faculty.office || '',
        status: faculty.status || 'active',
        description: faculty.description || '',
        accentColor: faculty.accentColor || 'terracotta',
      });
    } else {
      setForm({
        name: '',
        acronym: '',
        code: '',
        phone: '',
        office: '',
        status: 'active',
        description: '',
        accentColor: 'terracotta',
      });
    }
    setErrors({});
  }, [faculty, isOpen]);

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = 'El nombre de la facultad es obligatorio';
    if (!form.acronym.trim()) newErrors.acronym = 'La sigla es requerida (ej: FCNI)';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      acronym: form.acronym.trim().toUpperCase(),
      code: form.code.trim() || `FAC-${Date.now().toString().slice(-4)}`,
      phone: form.phone.trim(),
      office: form.office.trim(),
      description: form.description.trim(),
    };

    onSave(payload);
    onClose();
  }

  const inputClass =
    'w-full rounded-xl border border-sand-line bg-cream/50 px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary focus:border-terracotta focus:bg-white focus:outline-none transition-colors';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cocoa/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-card border border-sand-line bg-white shadow-hero overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="faculty-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-sand-line px-6 py-4.5 bg-cream/40">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-sand text-terracotta text-xl shadow-xs">
              <i className="bx bxs-institution" />
            </span>
            <div>
              <h2 id="faculty-modal-title" className="m-0 font-display text-base sm:text-lg font-bold text-ink">
                {isEditing ? 'Editar Facultad' : 'Crear Nueva Facultad'}
              </h2>
              <p className="m-0 text-xs text-secondary">
                Estructura académica oficial de la institución
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

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Nombre y Sigla */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="fac-name" className="block text-xs font-bold text-ink mb-1">
                Nombre de la Facultad <span className="text-rose-500">*</span>:
              </label>
              <input
                id="fac-name"
                type="text"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                }}
                placeholder="Ej: Facultad de Ciencias de la Educación"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary focus:outline-none transition-colors ${
                  errors.name ? 'border-rose-500 bg-rose-50/20' : 'border-sand-line bg-cream/50 focus:border-terracotta focus:bg-white'
                }`}
              />
              {errors.name && <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="fac-acronym" className="block text-xs font-bold text-ink mb-1">
                Sigla / Acrónimo <span className="text-rose-500">*</span>:
              </label>
              <input
                id="fac-acronym"
                type="text"
                value={form.acronym}
                onChange={(e) => {
                  setForm({ ...form, acronym: e.target.value.toUpperCase() });
                  if (errors.acronym) setErrors((prev) => ({ ...prev, acronym: null }));
                }}
                placeholder="Ej: FCED"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary uppercase font-semibold focus:outline-none transition-colors ${
                  errors.acronym ? 'border-rose-500 bg-rose-50/20' : 'border-sand-line bg-cream/50 focus:border-terracotta focus:bg-white'
                }`}
              />
              {errors.acronym && <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.acronym}</p>}
            </div>
          </div>

          {/* Código y Estado */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="fac-code" className="block text-xs font-bold text-ink mb-1">
                Código Interno de Facultad:
              </label>
              <input
                id="fac-code"
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Ej: FAC-EDU-04"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="fac-status" className="block text-xs font-bold text-ink mb-1">
                Estado Operativo:
              </label>
              <select
                id="fac-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={inputClass}
              >
                <option value="active">Activa (operativa en oferta)</option>
                <option value="inactive">Inactiva (oculta de admisiones)</option>
              </select>
            </div>
          </div>

          {/* Teléfono y Ubicación */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="fac-phone" className="block text-xs font-bold text-ink mb-1">
                Teléfono / Extensión:
              </label>
              <input
                id="fac-phone"
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Ej: +57 (607) 691 7700 Ext. 1500"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="fac-office" className="block text-xs font-bold text-ink mb-1">
                Oficina / Despacho:
              </label>
              <input
                id="fac-office"
                type="text"
                value={form.office}
                onChange={(e) => setForm({ ...form, office: e.target.value })}
                placeholder="Ej: Edificio D · Piso 2, Oficina 201"
                className={inputClass}
              />
            </div>
          </div>

          {/* Color Distintivo */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Identificador Visual / Color:
            </label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_COLORS.map((c) => {
                const active = form.accentColor === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm({ ...form, accentColor: c.id })}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      active ? `${c.bg} shadow-xs ring-2 ring-cocoa/30` : 'border-sand-line bg-cream/40 text-secondary hover:text-ink'
                    }`}
                  >
                    <span className="size-2 rounded-full bg-current" />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="fac-desc" className="block text-xs font-bold text-ink mb-1">
              Descripción o Misión Académica:
            </label>
            <textarea
              id="fac-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Breve reseña sobre las disciplinas, proyectos y áreas que lidera esta facultad..."
              className="w-full rounded-xl border border-sand-line bg-cream/50 p-3 text-xs text-ink placeholder:text-secondary focus:border-terracotta focus:bg-white focus:outline-none transition-colors resize-none"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-sand-line px-6 py-4 bg-cream/40">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-sand-line bg-white px-4 py-2 text-xs font-bold text-secondary hover:bg-cream hover:text-ink transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-terracotta hover:bg-terracotta-dark px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
          >
            <i className="bx bx-check text-base" />
            <span>{isEditing ? 'Guardar Cambios' : 'Crear Facultad'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
