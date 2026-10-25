import { useState } from 'react';

const INTERACTION_TYPES = [
  { id: 'reunion', label: 'Reunión Bilateral', icon: 'bx-group', color: 'text-blue-600 bg-blue-50' },
  { id: 'visita', label: 'Visita Presencial', icon: 'bx-buildings', color: 'text-purple-600 bg-purple-50' },
  { id: 'llamada', label: 'Llamada de Acompañamiento', icon: 'bx-phone-call', color: 'text-emerald-600 bg-emerald-50' },
  { id: 'evaluacion', label: 'Encuesta de Satisfacción', icon: 'bx-star', color: 'text-amber-600 bg-amber-50' },
  { id: 'convenio', label: 'Gestión de Convenio', icon: 'bx-file', color: 'text-teal-600 bg-teal-50' },
];

export default function CompanyInteractionModal({ company, isOpen, onClose, onSave }) {
  const [type, setType] = useState('reunion');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [advisorName] = useState('Dra. Camila Morales Rey');
  const [errors, setErrors] = useState({});

  if (!isOpen || !company) return null;

  function handleSubmit(e) {
    e.preventDefault();
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Indica el motivo o título del contacto.';
    }
    if (!summary.trim()) {
      newErrors.summary = 'Describe las conclusiones o puntos tratados.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const todayStr = 'Hoy, ' + new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

    onSave({
      id: 'log-' + Date.now(),
      date: todayStr,
      type,
      title: title.trim(),
      advisorName,
      summary: summary.trim(),
      nextAction: nextAction.trim() || 'Sin acciones pendientes registradas.',
    });

    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interaction-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-line bg-white shadow-hero animate-rise-in overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line-soft px-6 py-4.5 bg-page/50">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl font-display text-sm font-bold shadow-2xs ${company.logoBg}`}>
              {company.logoInitials}
            </span>
            <div className="min-w-0">
              <h2 id="interaction-modal-title" className="m-0 font-display text-base font-bold text-ink truncate">
                Registrar Seguimiento
              </h2>
              <p className="m-0 text-xs text-secondary truncate">
                {company.commercialName || company.companyName} · NIT {company.nit}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-secondary hover:bg-page hover:text-ink transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(85vh-8rem)] overflow-y-auto">
          {/* Tipo de Interacción */}
          <div>
            <label className="block text-xs font-bold text-ink mb-2">
              Tipo de Contacto o Gestión:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INTERACTION_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold text-left transition-all cursor-pointer ${
                    type === t.id
                      ? 'border-green-dark bg-green-dark/5 text-green-dark shadow-xs ring-1 ring-green-dark/20'
                      : 'border-line bg-white text-secondary hover:border-line-soft hover:text-ink'
                  }`}
                >
                  <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-sm ${t.color}`}>
                    <i className={`bx ${t.icon}`} />
                  </span>
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div>
            <label htmlFor="interaction-title" className="block text-xs font-bold text-ink mb-1">
              Título o Asunto de la Gestión <span className="text-rose-500">*</span>:
            </label>
            <input
              id="interaction-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: null }));
              }}
              placeholder="Ej: Mesa de trabajo para vacantes prácticas 2027-1"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary focus:outline-none transition-colors ${
                errors.title ? 'border-rose-500 focus:border-rose-500 bg-rose-50/30' : 'border-line focus:border-green bg-white'
              }`}
            />
            {errors.title && <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.title}</p>}
          </div>

          {/* Resumen / Conclusiones */}
          <div>
            <label htmlFor="interaction-summary" className="block text-xs font-bold text-ink mb-1">
              Conclusiones y Resumen del Contacto <span className="text-rose-500">*</span>:
            </label>
            <textarea
              id="interaction-summary"
              rows={3}
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                if (errors.summary) setErrors((prev) => ({ ...prev, summary: null }));
              }}
              placeholder="Detalla los puntos acordados con el contacto empresarial, requerimientos de perfiles o aspectos evaluados..."
              className={`w-full rounded-xl border p-3 text-xs text-ink placeholder:text-secondary focus:outline-none transition-colors ${
                errors.summary ? 'border-rose-500 focus:border-rose-500 bg-rose-50/30' : 'border-line focus:border-green bg-white'
              }`}
            />
            {errors.summary && <p className="m-0 mt-1 text-[0.7rem] text-rose-600 font-medium">{errors.summary}</p>}
          </div>

          {/* Próxima Acción */}
          <div>
            <label htmlFor="interaction-next" className="block text-xs font-bold text-ink mb-1">
              Próximo Compromiso o Acción de Seguimiento (Opcional):
            </label>
            <input
              id="interaction-next"
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="Ej: Remitir preseleccionados antes del 15 de noviembre"
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-xs text-ink placeholder:text-secondary focus:border-green focus:outline-none bg-white"
            />
          </div>

          {/* Asesor Responsable info */}
          <div className="rounded-xl border border-line-soft bg-page p-3 text-[0.7rem] text-secondary flex items-center justify-between">
            <span>
              Asesor UTS a cargo: <strong className="text-ink font-semibold">{advisorName}</strong>
            </span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <i className="bx bxs-check-shield text-xs" />
              Verificado
            </span>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line-soft">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line bg-page px-4 py-2.5 text-xs font-bold text-secondary hover:text-ink cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-green-dark hover:bg-green px-5 py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <i className="bx bx-save text-base" />
              <span>Guardar en Bitácora</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
