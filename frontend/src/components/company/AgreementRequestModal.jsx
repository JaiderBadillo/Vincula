import { useEffect, useMemo, useState } from 'react';
import {
  AGREEMENT_TYPES,
  REGIONAL_CITIES,
  REGIONAL_INSTITUTIONS,
  REGIONAL_AVAILABLE_PROGRAMS,
} from '../../data/companyAgreementsData.js';

export default function AgreementRequestModal({
  isOpen,
  onClose,
  onSubmit,
  renewalAgreement = null,
}) {
  const isRenewal = Boolean(renewalAgreement);

  const [selectedCity, setSelectedCity] = useState('Bucaramanga');
  const [institutionId, setInstitutionId] = useState('uts');
  const [typeKey, setTypeKey] = useState('alianza_preferente');
  const [durationYears, setDurationYears] = useState(2);
  const [estimatedVacancies, setEstimatedVacancies] = useState(4);
  const [selectedPrograms, setSelectedPrograms] = useState([
    'Ingeniería de Sistemas',
    'Tecnología en Desarrollo de Sistemas Informáticos',
  ]);
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState('Carlos Andrés Rueda');
  const [contactRole, setContactRole] = useState('Gerente General');
  const [contactEmail, setContactEmail] = useState('talento@cenit-transporte.com');
  const [contactPhone, setContactPhone] = useState('+57 (607) 633 4000');

  // Documentos adjuntos por defecto
  const [docCamara, setDocCamara] = useState(true);
  const [docRut, setDocRut] = useState(true);
  const [docCedula, setDocCedula] = useState(true);
  const [docPropuesta, setDocPropuesta] = useState(true);

  // Notas de renovación si aplica
  const [renewalNotes, setRenewalNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Al abrir para renovación, precargar datos pertinentes
  useEffect(() => {
    if (renewalAgreement) {
      const matchInst = REGIONAL_INSTITUTIONS.find((i) => i.id === renewalAgreement.institutionId);
      if (matchInst?.cityKey) setSelectedCity(matchInst.cityKey);
      setInstitutionId(renewalAgreement.institutionId || 'uts');
      setTypeKey(renewalAgreement.typeKey || 'alianza_preferente');
      setSelectedPrograms(renewalAgreement.targetPrograms || []);
      setDurationYears(2);
      setRenewalNotes(
        `Solicitud de renovación formal del convenio ${renewalAgreement.agreementCode}. Agradecemos continuar con la cooperación institucional.`
      );
    } else {
      setSelectedCity('Bucaramanga');
      setInstitutionId('uts');
      setTypeKey('alianza_preferente');
      setSelectedPrograms([
        'Ingeniería de Sistemas',
        'Tecnología en Desarrollo de Sistemas Informáticos',
      ]);
      setDurationYears(2);
      setEstimatedVacancies(4);
      setDescription(
        'Buscamos consolidar una alianza para la captación preferencial de estudiantes de últimos semestres y egresados en proyectos de tecnología y logística de hidrocarburos.'
      );
    }
  }, [renewalAgreement, isOpen]);

  const availableInstitutions = useMemo(() => {
    if (selectedCity === 'todas') return REGIONAL_INSTITUTIONS;
    return REGIONAL_INSTITUTIONS.filter(
      (inst) => inst.cityKey === selectedCity || inst.city.toLowerCase().includes(selectedCity.toLowerCase())
    );
  }, [selectedCity]);

  const handleCityChange = (newCity) => {
    setSelectedCity(newCity);
    const filtered =
      newCity === 'todas'
        ? REGIONAL_INSTITUTIONS
        : REGIONAL_INSTITUTIONS.filter(
            (inst) => inst.cityKey === newCity || inst.city.toLowerCase().includes(newCity.toLowerCase())
          );
    if (filtered.length > 0 && !filtered.some((i) => i.id === institutionId)) {
      setInstitutionId(filtered[0].id);
    }
  };

  if (!isOpen) return null;

  const toggleProgram = (prog) => {
    setSelectedPrograms((prev) =>
      prev.includes(prog) ? prev.filter((p) => p !== prog) : [...prev, prog]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isRenewal) {
      onSubmit({
        renewalAgreementId: renewalAgreement.id,
        durationYears,
        notes: renewalNotes,
        additionalDocs: [
          ...(docCamara
            ? [
                {
                  title: 'Cámara de Comercio de Bucaramanga (<30 días)',
                  type: 'Soporte Legal',
                  fileName: 'Camara_Comercio_Cenit_Actualizada.pdf',
                  fileSize: '2.8 MB',
                },
              ]
            : []),
          ...(docRut
            ? [
                {
                  title: 'Registro Único Tributario (RUT 2026)',
                  type: 'Tributario',
                  fileName: 'RUT_Cenit_2026.pdf',
                  fileSize: '1.2 MB',
                },
              ]
            : []),
        ],
      });
    } else {
      const docs = [];
      if (docCamara) {
        docs.push({
          title: 'Certificado de Existencia y Representación Legal (<30 días)',
          type: 'Soporte Legal',
          fileName: 'Certificado_Camara_Comercio_Cenit_2026.pdf',
          fileSize: '3.1 MB',
        });
      }
      if (docRut) {
        docs.push({
          title: 'Registro Único Tributario (RUT 2026)',
          type: 'Tributario',
          fileName: 'RUT_Cenit_Actualizado_2026.pdf',
          fileSize: '1.4 MB',
        });
      }
      if (docCedula) {
        docs.push({
          title: 'Cédula de Ciudadanía del Representante Legal',
          type: 'Identificación',
          fileName: 'Cedula_Representante_Legal_Cenit.pdf',
          fileSize: '890 KB',
        });
      }
      if (docPropuesta) {
        docs.push({
          title: 'Propuesta Institucional y Justificación del Convenio',
          type: 'Propuesta',
          fileName: 'Propuesta_Convenio_IES_Cenit.pdf',
          fileSize: '2.4 MB',
        });
      }

      onSubmit({
        institutionId,
        typeKey,
        durationYears,
        estimatedVacancies,
        targetPrograms: selectedPrograms,
        description,
        contactName,
        contactRole,
        contactEmail,
        contactPhone,
        documents: docs,
      });
    }

    onClose();
  };

  const selectedInst =
    REGIONAL_INSTITUTIONS.find((i) => i.id === institutionId) ||
    availableInstitutions[0] ||
    REGIONAL_INSTITUTIONS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-cocoa/50 p-4 backdrop-blur-xs sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-agreement-title"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-sand-line bg-white shadow-2xl">
        {/* Cabecera del modal */}
        <header className="flex items-center justify-between border-b border-sand-line bg-cream px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-terracotta/25 bg-terracotta/10 text-xl text-terracotta">
              <i className={isRenewal ? 'bx bx-revision' : 'bx bx-file'} />
            </span>
            <div>
              <h2 id="modal-agreement-title" className="m-0 font-display text-lg font-bold text-ink">
                {isRenewal ? 'Solicitar Renovación de Convenio' : 'Solicitar Nuevo Convenio con IES'}
              </h2>
              <p className="m-0 text-xs text-secondary">
                {isRenewal
                  ? `Prórroga para ${renewalAgreement?.institutionName} (${renewalAgreement?.agreementCode})`
                  : 'Radicación de expediente y concertación de prácticas o vinculación'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg border border-sand-line bg-white text-secondary hover:bg-sand hover:text-ink"
            aria-label="Cerrar modal"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </header>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6">
          <div className="flex flex-col gap-5">
            {isRenewal ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                  Institución de Educación Superior (IES)
                </label>
                <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-sand-line bg-sand/30 p-3">
                  {renewalAgreement?.institutionLogo ? (
                    <img
                      src={renewalAgreement.institutionLogo}
                      alt={renewalAgreement.institutionName}
                      className="size-9 rounded-lg border border-sand-line bg-white object-contain p-1"
                    />
                  ) : (
                    <span className="grid size-9 place-items-center rounded-lg border border-terracotta/20 bg-sand font-display text-xs font-bold text-terracotta">
                      {renewalAgreement?.institutionShort}
                    </span>
                  )}
                  <div>
                    <h4 className="m-0 text-xs font-bold text-ink">{renewalAgreement?.institutionName}</h4>
                    <span className="text-[0.7rem] text-secondary">
                      {renewalAgreement?.coordinatorIES?.role || 'Coordinación de Prácticas'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="agreement-city" className="block text-xs font-bold uppercase tracking-wider text-secondary">
                      Ciudad o Municipio
                    </label>
                    <select
                      id="agreement-city"
                      value={selectedCity}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-sand-line bg-white px-3.5 py-2.5 text-xs font-medium text-ink focus:border-terracotta focus:outline-hidden"
                    >
                      <option value="todas">Todas las ciudades</option>
                      {REGIONAL_CITIES.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="agreement-institution" className="block text-xs font-bold uppercase tracking-wider text-secondary">
                      Institución de Educación Superior (IES)
                    </label>
                    <select
                      id="agreement-institution"
                      value={institutionId}
                      onChange={(e) => setInstitutionId(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-sand-line bg-white px-3.5 py-2.5 text-xs font-medium text-ink focus:border-terracotta focus:outline-hidden"
                    >
                      {availableInstitutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.shortName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Resumen del contacto institucional seleccionado */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sand-line/70 bg-cream/40 px-3 py-2 text-xs text-secondary">
                  <div className="flex items-center gap-1.5">
                    <i className="bx bx-map-pin text-sm text-terracotta" />
                    <span>{selectedInst.city}</span>
                  </div>
                  {selectedInst.coordinator && (
                    <div className="flex items-center gap-1 text-[0.72rem] text-cocoa">
                      <i className="bx bx-user-pin text-sm text-terracotta" />
                      <span>
                        Contacto IES: <strong className="text-ink">{selectedInst.coordinator.name}</strong> ({selectedInst.coordinator.phone})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modalidad de Convenio */}
            {!isRenewal && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                  Modalidad o Tipo de Convenio
                </label>
                <select
                  value={typeKey}
                  onChange={(e) => setTypeKey(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-sand-line bg-white px-3.5 py-2.5 text-xs text-ink focus:border-terracotta focus:outline-hidden"
                >
                  {AGREEMENT_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <p className="m-0 mt-1 text-[0.72rem] text-secondary">
                  {AGREEMENT_TYPES.find((t) => t.id === typeKey)?.description}
                </p>
              </div>
            )}

            {/* Duración y Vacantes Proyectadas */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                  Vigencia Solicitada
                </label>
                <select
                  value={durationYears}
                  onChange={(e) => setDurationYears(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-sand-line bg-white px-3.5 py-2.5 text-xs text-ink focus:border-terracotta focus:outline-hidden"
                >
                  <option value={1}>1 año (Renovable)</option>
                  <option value={2}>2 años (Recomendado)</option>
                  <option value={3}>3 años (Alianza Marco)</option>
                </select>
              </div>

              {!isRenewal && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                    Vacantes / Plazas Proyectadas (Año)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={estimatedVacancies}
                    onChange={(e) => setEstimatedVacancies(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-sand-line bg-white px-3.5 py-2.5 text-xs text-ink focus:border-terracotta focus:outline-hidden"
                  />
                </div>
              )}
            </div>

            {/* Programas Académicos de Interés */}
            {!isRenewal && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                  Programas de Interés Principal ({selectedInst.shortName})
                </label>
                <p className="m-0 mt-0.5 text-[0.72rem] text-secondary">
                  Selecciona los programas académicos cuyos perfiles buscas vincular prioritariamente:
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {REGIONAL_AVAILABLE_PROGRAMS.map((prog) => {
                    const isSelected = selectedPrograms.includes(prog);
                    return (
                      <button
                        key={prog}
                        type="button"
                        onClick={() => toggleProgram(prog)}
                        className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                          isSelected
                            ? 'border-terracotta bg-terracotta text-white font-medium'
                            : 'border-sand-line bg-cream text-ink hover:bg-sand'
                        }`}
                      >
                        {prog} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Justificación o Nota para la IES */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
                {isRenewal ? 'Motivo y Observaciones de la Renovación' : 'Propósito y Alcance del Convenio'}
              </label>
              {isRenewal ? (
                <textarea
                  rows={3}
                  required
                  value={renewalNotes}
                  onChange={(e) => setRenewalNotes(e.target.value)}
                  placeholder="Explica brevemente los resultados obtenidos y la solicitud formal de continuidad..."
                  className="mt-1.5 w-full rounded-xl border border-sand-line bg-white p-3 text-xs text-ink focus:border-terracotta focus:outline-hidden"
                />
              ) : (
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalla las áreas donde se abrirán vacantes, compromisos de remuneración o pasantías..."
                  className="mt-1.5 w-full rounded-xl border border-sand-line bg-white p-3 text-xs text-ink focus:border-terracotta focus:outline-hidden"
                />
              )}
            </div>

            {/* Documentos del Expediente (Checklist y Soportes) */}
            <div className="rounded-xl border border-sand-line bg-sand/25 p-4">
              <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary">
                Expediente y Documentación Requerida por la IES
              </h4>
              <p className="m-0 mt-1 text-[0.72rem] text-secondary">
                Documentos requeridos para verificación jurídica por parte de {selectedInst.shortName}:
              </p>

              <div className="mt-3 flex flex-col gap-2.5">
                <label className="flex items-center gap-2.5 text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={docCamara}
                    onChange={(e) => setDocCamara(e.target.checked)}
                    className="size-4 rounded border-sand-line text-terracotta accent-terracotta"
                  />
                  <span>
                    <strong>Cámara de Comercio</strong> (vigencia inferior a 30 días)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={docRut}
                    onChange={(e) => setDocRut(e.target.checked)}
                    className="size-4 rounded border-sand-line text-terracotta accent-terracotta"
                  />
                  <span>
                    <strong>Registro Único Tributario (RUT)</strong> actualizado
                  </span>
                </label>

                {!isRenewal && (
                  <>
                    <label className="flex items-center gap-2.5 text-xs text-ink">
                      <input
                        type="checkbox"
                        checked={docCedula}
                        onChange={(e) => setDocCedula(e.target.checked)}
                        className="size-4 rounded border-sand-line text-terracotta accent-terracotta"
                      />
                      <span>
                        <strong>Cédula del Representante Legal</strong> (Carlos Andrés Rueda)
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-ink">
                      <input
                        type="checkbox"
                        checked={docPropuesta}
                        onChange={(e) => setDocPropuesta(e.target.checked)}
                        className="size-4 rounded border-sand-line text-terracotta accent-terracotta"
                      />
                      <span>
                        <strong>Propuesta o Minuta Institucional</strong> de Prácticas
                      </span>
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Datos de contacto para seguimiento */}
            {!isRenewal && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-secondary">
                    Responsable en la Empresa
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-sand-line bg-white px-3 py-2 text-xs text-ink focus:border-terracotta focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-secondary">
                    Cargo
                  </label>
                  <input
                    type="text"
                    required
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-sand-line bg-white px-3 py-2 text-xs text-ink focus:border-terracotta focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-secondary">
                    Correo Institucional
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-sand-line bg-white px-3 py-2 text-xs text-ink focus:border-terracotta focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-secondary">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-sand-line bg-white px-3 py-2 text-xs text-ink focus:border-terracotta focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-sand-line pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-sand-line bg-white px-4 py-2 text-xs font-semibold text-secondary hover:bg-sand hover:text-ink"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-terracotta px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-terracotta-dark"
            >
              <i className="bx bx-send text-sm" />
              <span>{isRenewal ? 'Radicar renovación' : 'Enviar solicitud a la IES'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

