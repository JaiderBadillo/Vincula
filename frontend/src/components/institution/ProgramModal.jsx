import { useEffect, useState } from 'react';

const LEVELS = [
  'Profesional Universitario',
  'Tecnológico',
  'Técnico Laboral',
  'Especialización',
  'Maestría',
  'Posgrado',
];

const MODALITIES = ['Presencial', 'Virtual', 'Híbrida', 'A Distancia'];

function parseSemesters(program) {
  if (!program) return '';
  if (Number.isFinite(Number(program.semesters)) && Number(program.semesters) > 0) {
    return Number(program.semesters);
  }
  const match = String(program.duration || '').match(/\d+/);
  return match ? Number(match[0]) : 10;
}

export default function ProgramModal({
  isOpen,
  onClose,
  program,
  onSave,
  availableFaculties = [],
  availableCampuses = [],
  suggestedFacultyId = '',
  suggestedCampusId = '',
  onOpenNewFaculty,
  onOpenNewCampus,
}) {
  const isEditing = Boolean(program);

  const [form, setForm] = useState({
    name: '',
    code: '',
    facultyId: '',
    campusId: '',
    level: LEVELS[0],
    modality: MODALITIES[0],
    semesters: 10,
    credits: 160,
    accreditation: '',
    director: '',
    directorEmail: '',
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSubmitError('');
    setErrors({});

    if (program) {
      const matchedFaculty =
        availableFaculties.find((f) => f.id === program.facultyId) ||
        availableFaculties.find((f) => f.name === program.faculty) ||
        null;
      const matchedCampus =
        availableCampuses.find((c) => c.id === program.campusId) ||
        availableCampuses.find((c) => c.name === program.campus || c.shortName === program.campus) ||
        null;

      setForm({
        name: program.name || '',
        code: program.sniesCode || program.code || '',
        facultyId: matchedFaculty?.id || program.facultyId || '',
        campusId: matchedCampus?.id || program.campusId || '',
        level: LEVELS.includes(program.level) ? program.level : LEVELS[0],
        modality: MODALITIES.includes(program.modality) ? program.modality : MODALITIES[0],
        semesters: parseSemesters(program),
        credits: Number(program.credits) || '',
        accreditation: program.accreditation || '',
        director: program.director || '',
        directorEmail: program.directorEmail || '',
      });
    } else {
      const defaultFaculty = availableFaculties.find((f) => f.status !== 'inactive') || availableFaculties[0];
      const defaultCampus = availableCampuses.find((c) => c.isMain) || availableCampuses[0];

      setForm({
        name: '',
        code: '',
        facultyId: defaultFaculty?.id || '',
        campusId: defaultCampus?.id || '',
        level: LEVELS[0],
        modality: MODALITIES[0],
        semesters: '',
        credits: '',
        accreditation: '',
        director: '',
        directorEmail: '',
      });
    }
  }, [program, isOpen]);

  // Si se crea una facultad o sede nueva mientras este modal está abierto, seleccionarla automáticamente
  useEffect(() => {
    if (!isOpen) return;
    if (suggestedFacultyId && availableFaculties.some((f) => f.id === suggestedFacultyId)) {
      setForm((prev) => ({ ...prev, facultyId: suggestedFacultyId }));
      setErrors((prev) => ({ ...prev, facultyId: null }));
    } else if (!form.facultyId && availableFaculties.length > 0) {
      const first = availableFaculties.find((f) => f.status !== 'inactive') || availableFaculties[0];
      setForm((prev) => ({ ...prev, facultyId: first.id }));
    }
  }, [isOpen, suggestedFacultyId, availableFaculties]);

  useEffect(() => {
    if (!isOpen) return;
    if (suggestedCampusId && availableCampuses.some((c) => c.id === suggestedCampusId)) {
      setForm((prev) => ({ ...prev, campusId: suggestedCampusId }));
      setErrors((prev) => ({ ...prev, campusId: null }));
    } else if (!form.campusId && availableCampuses.length > 0) {
      const first = availableCampuses.find((c) => c.isMain) || availableCampuses[0];
      setForm((prev) => ({ ...prev, campusId: first.id }));
    }
  }, [isOpen, suggestedCampusId, availableCampuses]);

  if (!isOpen) return null;

  function validate() {
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      errs.name = 'El nombre oficial del programa es obligatorio (mínimo 2 caracteres).';
    }
    if (!form.code.trim() || form.code.trim().length < 3) {
      errs.code = 'El código SNIES es obligatorio (mínimo 3 caracteres).';
    }
    if (!form.facultyId) {
      errs.facultyId = 'Debes seleccionar o crear una facultad antes de registrar la carrera.';
    }
    if (!form.campusId) {
      errs.campusId = 'Debes seleccionar o crear una sede antes de registrar la carrera.';
    }
    const sem = Number(form.semesters);
    if (!Number.isFinite(sem) || sem < 1 || sem > 14) {
      errs.semesters = 'La duración debe estar entre 1 y 14 semestres.';
    }
    const cred = Number(form.credits);
    if (!Number.isFinite(cred) || cred < 10 || cred > 350) {
      errs.credits = 'Los créditos deben estar entre 10 y 350.';
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const selectedFacultyObj = availableFaculties.find((f) => f.id === form.facultyId);
    const selectedCampusObj = availableCampuses.find((c) => c.id === form.campusId);

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      sniesCode: form.code.trim(),
      facultyId: form.facultyId,
      faculty: selectedFacultyObj?.name || '',
      campusId: form.campusId,
      campus: selectedCampusObj?.name || '',
      level: form.level,
      modality: form.modality,
      semesters: Number(form.semesters),
      credits: Number(form.credits),
      accreditation: form.accreditation.trim(),
      director: form.director.trim(),
      directorEmail: form.directorEmail.trim(),
    };

    setIsSaving(true);
    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setSubmitError(err?.message || 'No se pudo guardar el programa en el servidor.');
    } finally {
      setIsSaving(false);
    }
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
            disabled={isSaving}
            className="grid size-8 place-items-center rounded-lg text-secondary hover:bg-cream hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5 max-h-[calc(85vh-8rem)] overflow-y-auto">
          {submitError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900" role="alert">
              <strong className="font-bold">No se pudo guardar: </strong>
              <span>{submitError}</span>
            </div>
          )}

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
                placeholder="Ej: Tecnología en Producción Industrial"
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
                placeholder="Ej: 10452"
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
                  Facultad <span className="text-rose-500">*</span>:
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
                value={form.facultyId}
                onChange={(e) => {
                  setForm({ ...form, facultyId: e.target.value });
                  if (errors.facultyId) setErrors((prev) => ({ ...prev, facultyId: null }));
                }}
                className={`${inputClass} ${errors.facultyId ? 'border-rose-500 bg-rose-50/20' : ''}`}
              >
                {availableFaculties.length === 0 ? (
                  <option value="">Sin facultades registradas en la institución</option>
                ) : (
                  <>
                    <option value="" disabled>
                      Selecciona una facultad...
                    </option>
                    {availableFaculties.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {errors.facultyId && <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.facultyId}</p>}
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

          {/* Modalidad, Semestres y Créditos */}
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
              <label htmlFor="prog-semesters" className="block text-xs font-bold text-ink mb-1">
                Duración (Semestres):
              </label>
              <input
                id="prog-semesters"
                type="number"
                min={1}
                max={14}
                value={form.semesters}
                onChange={(e) => {
                  setForm({ ...form, semesters: e.target.value });
                  if (errors.semesters) setErrors((prev) => ({ ...prev, semesters: null }));
                }}
                className={inputClass}
              />
              {errors.semesters && <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.semesters}</p>}
            </div>

            <div>
              <label htmlFor="prog-credits" className="block text-xs font-bold text-ink mb-1">
                Créditos Académicos:
              </label>
              <input
                id="prog-credits"
                type="number"
                min={10}
                max={350}
                value={form.credits}
                onChange={(e) => {
                  setForm({ ...form, credits: e.target.value });
                  if (errors.credits) setErrors((prev) => ({ ...prev, credits: null }));
                }}
                className={inputClass}
              />
              {errors.credits && <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.credits}</p>}
            </div>
          </div>

          {/* Sede y Acreditación */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="prog-campus" className="block text-xs font-bold text-ink">
                  Sede / Campus de Impartición <span className="text-rose-500">*</span>:
                </label>
                {onOpenNewCampus && (
                  <button
                    type="button"
                    onClick={onOpenNewCampus}
                    className="text-[0.68rem] font-bold text-terracotta hover:underline cursor-pointer"
                  >
                    + Nueva Sede
                  </button>
                )}
              </div>
              <select
                id="prog-campus"
                value={form.campusId}
                onChange={(e) => {
                  setForm({ ...form, campusId: e.target.value });
                  if (errors.campusId) setErrors((prev) => ({ ...prev, campusId: null }));
                }}
                className={`${inputClass} ${errors.campusId ? 'border-rose-500 bg-rose-50/20' : ''}`}
              >
                {availableCampuses.length === 0 ? (
                  <option value="">Sin sedes registradas en la institución</option>
                ) : (
                  <>
                    <option value="" disabled>
                      Selecciona una sede...
                    </option>
                    {availableCampuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.city ? ` (${c.city})` : ''}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {errors.campusId && <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.campusId}</p>}
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

          {/* Director de Programa (Opcional) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prog-director" className="block text-xs font-bold text-ink mb-1">
                Director o Coordinador del Programa:
              </label>
              <input
                id="prog-director"
                type="text"
                value={form.director}
                onChange={(e) => setForm({ ...form, director: e.target.value })}
                placeholder="Opcional"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="prog-director-email" className="block text-xs font-bold text-ink mb-1">
                Correo del Coordinador:
              </label>
              <input
                id="prog-director-email"
                type="email"
                value={form.directorEmail}
                onChange={(e) => setForm({ ...form, directorEmail: e.target.value })}
                placeholder="Opcional"
                className={inputClass}
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-sand-line">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-sand-line bg-cream px-4 py-2.5 text-xs font-bold text-secondary hover:text-ink cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-terracotta hover:bg-terracotta-dark px-5 py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <i className="bx bx-save text-base" />
              <span>{isSaving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Programa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
