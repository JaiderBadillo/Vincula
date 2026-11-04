import { useEffect, useState } from 'react';

const FACULTIES = [
  'Facultad de Ciencias Naturales e Ingenierías',
  'Facultad de Ciencias Socioeconómicas y Empresariales',
];

const LEVELS = [
  'Profesional Universitario',
  'Tecnológico',
  'Técnico Laboral',
  'Posgrado',
];

const MODALITIES = ['Presencial', 'Virtual / Distancia', 'Híbrida'];

export default function ProgramModal({
  isOpen,
  onClose,
  program,
  onSave,
  availableFaculties = [],
  onOpenNewFaculty,
}) {
  const isEditing = Boolean(program);
  const facultyOptions = availableFaculties.length > 0
    ? availableFaculties.map((f) => (typeof f === 'string' ? f : f.name))
    : FACULTIES;

  const [form, setForm] = useState({
    name: '',
    code: '',
    faculty: facultyOptions[0] || FACULTIES[0],
    level: LEVELS[0],
    modality: MODALITIES[0],
    duration: '10 semestres',
    credits: 160,
    campus: 'Bucaramanga · Ciudadela Real de Minas',
    accreditation: 'Registro Calificado Vigente',
    description: '',
    competenciesStr: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (program) {
      setForm({
        name: program.name || '',
        code: program.code || '',
        faculty: program.faculty || facultyOptions[0] || FACULTIES[0],
        level: program.level || LEVELS[0],
        modality: program.modality || MODALITIES[0],
        duration: program.duration || '10 semestres',
        credits: program.credits || 160,
        campus: program.campus || 'Bucaramanga · Ciudadela Real de Minas',
        accreditation: program.accreditation || 'Registro Calificado Vigente',
        description: program.description || '',
        competenciesStr: (program.competencies || []).join(', '),
      });
    } else {
      setForm({
        name: '',
        code: '',
        faculty: FACULTIES[0],
        level: LEVELS[0],
        modality: MODALITIES[0],
        duration: '10 semestres',
        credits: 160,
        campus: 'Bucaramanga · Ciudadela Real de Minas',
        accreditation: 'Registro Calificado Vigente',
        description: '',
        competenciesStr: '',
      });
    }
    setErrors({});
  }, [program, isOpen]);

  if (!isOpen) return null;

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'El nombre del programa es obligatorio.';
    if (!form.code.trim()) errs.code = 'El código SNIES es obligatorio.';
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const competencies = form.competenciesStr
      ? form.competenciesStr.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

    const payload = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim(),
      credits: Number(form.credits) || 120,
      competencies,
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
      aria-labelledby="program-modal-title"
    >
      <div className="relative w-full max-w-2xl rounded-card border border-sand-line bg-white shadow-hero animate-rise-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sand-line px-6 py-4.5 bg-cream/40">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-sand text-terracotta text-xl">
              <i className="bx bxs-graduation" />
            </span>
            <div>
              <h2 id="program-modal-title" className="m-0 font-display text-base sm:text-lg font-bold text-ink">
                {isEditing ? 'Editar Programa Académico' : 'Crear Nueva Carrera o Programa'}
              </h2>
              <p className="m-0 text-xs text-secondary">
                Administración del catálogo de oferta académica institucional
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5 max-h-[calc(85vh-8rem)] overflow-y-auto">
          {/* Nombre y Código SNIES */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="prog-name" className="block text-xs font-bold text-ink mb-1">
                Nombre Oficial del Programa <span className="text-rose-500">*</span>:
              </label>
              <input
                id="prog-name"
                type="text"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                }}
                placeholder="Ej: Ingeniería de Sistemas"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary focus:outline-none transition-colors ${
                  errors.name ? 'border-rose-500 bg-rose-50/20' : 'border-sand-line bg-cream/50 focus:border-terracotta focus:bg-white'
                }`}
              />
              {errors.name && <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="prog-code" className="block text-xs font-bold text-ink mb-1">
                Código SNIES <span className="text-rose-500">*</span>:
              </label>
              <input
                id="prog-code"
                type="text"
                value={form.code}
                onChange={(e) => {
                  setForm({ ...form, code: e.target.value });
                  if (errors.code) setErrors((prev) => ({ ...prev, code: null }));
                }}
                placeholder="Ej: SNIES 10452"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary focus:outline-none transition-colors ${
                  errors.code ? 'border-rose-500 bg-rose-50/20' : 'border-sand-line bg-cream/50 focus:border-terracotta focus:bg-white'
                }`}
              />
              {errors.code && <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.code}</p>}
            </div>
          </div>

          {/* Facultad y Nivel Académico */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="prog-faculty" className="block text-xs font-bold text-ink">
                  Facultad:
                </label>
                {onOpenNewFaculty && (
                  <button
                    type="button"
                    onClick={onOpenNewFaculty}
                    className="text-[0.68rem] font-bold text-terracotta hover:underline cursor-pointer"
                  >
                    + Nueva Facultad
                  </button>
                )}
              </div>
              <select
                id="prog-faculty"
                value={form.faculty}
                onChange={(e) => setForm({ ...form, faculty: e.target.value })}
                className={inputClass}
              >
                {facultyOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prog-level" className="block text-xs font-bold text-ink mb-1">
                Nivel de Formación:
              </label>
              <select
                id="prog-level"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className={inputClass}
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Modalidad, Duración y Créditos */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="prog-modality" className="block text-xs font-bold text-ink mb-1">
                Modalidad:
              </label>
              <select
                id="prog-modality"
                value={form.modality}
                onChange={(e) => setForm({ ...form, modality: e.target.value })}
                className={inputClass}
              >
                {MODALITIES.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prog-duration" className="block text-xs font-bold text-ink mb-1">
                Duración Estimada:
              </label>
              <input
                id="prog-duration"
                type="text"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="Ej: 10 semestres"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="prog-credits" className="block text-xs font-bold text-ink mb-1">
                Créditos Académicos:
              </label>
              <input
                id="prog-credits"
                type="number"
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value })}
                placeholder="160"
                className={inputClass}
              />
            </div>
          </div>

          {/* Sede y Acreditación */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prog-campus" className="block text-xs font-bold text-ink mb-1">
                Sede / Campus de Impartición:
              </label>
              <input
                id="prog-campus"
                type="text"
                value={form.campus}
                onChange={(e) => setForm({ ...form, campus: e.target.value })}
                placeholder="Ej: Bucaramanga · Real de Minas"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="prog-accreditation" className="block text-xs font-bold text-ink mb-1">
                Estado de Acreditación MEN:
              </label>
              <input
                id="prog-accreditation"
                type="text"
                value={form.accreditation}
                onChange={(e) => setForm({ ...form, accreditation: e.target.value })}
                placeholder="Ej: Registro Calificado Vigente"
                className={inputClass}
              />
            </div>
          </div>

          {/* Descripción / Perfil de Egreso */}
          <div>
            <label htmlFor="prog-description" className="block text-xs font-bold text-ink mb-1">
              Perfil Profesional y Descripción del Programa:
            </label>
            <textarea
              id="prog-description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe el perfil de egreso, campos de acción profesional y enfoque del plan de estudios..."
              className="w-full rounded-xl border border-sand-line bg-cream/50 p-3 text-xs text-ink placeholder:text-secondary focus:border-terracotta focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          {/* Competencias Clave */}
          <div>
            <label htmlFor="prog-competencies" className="block text-xs font-bold text-ink mb-1">
              Competencias Curriculares Clave (Separadas por coma):
            </label>
            <input
              id="prog-competencies"
              type="text"
              value={form.competenciesStr}
              onChange={(e) => setForm({ ...form, competenciesStr: e.target.value })}
              placeholder="Ej: Desarrollo Full Stack, Cloud Computing, Metodologías Ágiles"
              className={inputClass}
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-sand-line">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-sand-line bg-cream px-4 py-2.5 text-xs font-bold text-secondary hover:text-ink cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-terracotta hover:bg-terracotta-dark px-5 py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <i className="bx bx-save text-base" />
              <span>{isEditing ? 'Guardar Cambios' : 'Registrar Programa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
