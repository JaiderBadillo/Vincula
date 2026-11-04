import { useEffect, useState } from 'react';

export default function InviteToVacancyModal({
  isOpen,
  talent,
  vacancies = [],
  onClose,
  onInvite,
}) {
  const [selectedVacancyId, setSelectedVacancyId] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    if (!isOpen || !talent) return;
    const defaultVacId = vacancies[0]?.id || '';
    setSelectedVacancyId(defaultVacId);

    const targetVac = vacancies.find((v) => v.id === defaultVacId);
    const vacTitle = targetVac ? targetVac.title : 'nuestra vacante activa';
    setCustomMessage(
      `Hola ${talent.fullName.split(' ')[0]}, en Cenit Transporte hemos revisado tu perfil académico y competencias en ${talent.institutionShort} y consideramos que tu formación en ${talent.program} encaja de forma sobresaliente con nuestra convocatoria de «${vacTitle}». Te invitamos a postularte para iniciar el proceso de selección.`
    );
  }, [isOpen, talent, vacancies]);

  if (!isOpen || !talent) return null;

  function handleVacancyChange(newId) {
    setSelectedVacancyId(newId);
    const targetVac = vacancies.find((v) => v.id === newId);
    const vacTitle = targetVac ? targetVac.title : 'nuestra vacante activa';
    setCustomMessage(
      `Hola ${talent.fullName.split(' ')[0]}, en Cenit Transporte hemos revisado tu perfil académico y competencias en ${talent.institutionShort} y consideramos que tu formación en ${talent.program} encaja de forma sobresaliente con nuestra convocatoria de «${vacTitle}». Te invitamos a postularte para iniciar el proceso de selección.`
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedVacancyId) return;
    onInvite(talent.id, selectedVacancyId, customMessage);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cocoa/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-sand-line bg-white p-6 shadow-2xl animate-in zoom-in-95 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-sand-line pb-3.5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-sand text-2xl text-terracotta shrink-0 shadow-2xs">
              <i className="bx bx-paper-plane" />
            </span>
            <div>
              <h3 id="invite-modal-title" className="m-0 font-display text-base font-bold text-ink">
                Invitar a Postularse
              </h3>
              <p className="m-0 text-xs text-secondary">
                {talent.fullName} · {talent.institutionShort}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de Vacante */}
          <div className="space-y-1.5">
            <label htmlFor="invite-vac-select" className="text-xs font-bold text-ink flex items-center gap-1">
              Vacante a la que deseas invitarlo <span className="text-terracotta">*</span>
            </label>
            <select
              id="invite-vac-select"
              value={selectedVacancyId}
              onChange={(e) => handleVacancyChange(e.target.value)}
              className="w-full rounded-xl border border-sand-line bg-cream/40 p-2.5 text-xs font-semibold text-ink focus:border-terracotta focus:outline-none cursor-pointer"
              required
            >
              {vacancies.length === 0 ? (
                <option value="">No tienes vacantes activas abiertas</option>
              ) : (
                vacancies.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title} ({v.code})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Mensaje personalizado */}
          <div className="space-y-1.5">
            <label htmlFor="invite-msg" className="text-xs font-bold text-ink">
              Mensaje de invitación personalizada
            </label>
            <textarea
              id="invite-msg"
              rows={4}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full rounded-xl border border-sand-line bg-cream/30 p-3 text-xs text-ink focus:border-terracotta focus:outline-none leading-relaxed"
              placeholder="Escribe el mensaje formal para el egresado..."
              required
            />
          </div>

          {/* Aviso informativo */}
          <div className="rounded-xl border border-sand-line/70 bg-cream/30 p-3 flex items-start gap-2.5 text-[0.7rem] text-secondary">
            <i className="bx bx-info-circle text-base text-terracotta shrink-0 mt-0.5" />
            <p className="m-0 leading-relaxed">
              El egresado recibirá una invitación prioritaria en su panel de egresado con el distintivo de <strong>Cenit Transporte</strong> y acceso directo para postularse en 1 clic.
            </p>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-sand-line">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-sand-line bg-white px-4 py-2 text-xs font-bold text-secondary hover:bg-cream hover:text-ink transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedVacancyId}
              className="inline-flex items-center gap-1.5 rounded-xl bg-cocoa px-4 py-2 text-xs font-bold text-white hover:bg-cocoa/90 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <i className="bx bx-send text-sm" />
              <span>Enviar Invitación</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

