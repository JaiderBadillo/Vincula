import { useState } from 'react';
import { Field, GhostButton, Modal, PrimaryButton, SecondaryButton, SectionCard, inputClass } from './ui.jsx';

const educationTypeMeta = {
  Especialización: {
    label: 'Especialización',
    icon: 'bx-book-bookmark',
    badgeCls: 'bg-[#051F26]/10 text-[#051F26] border-[#051F26]/20',
  },
  Certificación: {
    label: 'Certificación',
    icon: 'bx-award',
    badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  Diplomado: {
    label: 'Diplomado',
    icon: 'bx-certificate',
    badgeCls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  'Posgrado / Maestría': {
    label: 'Posgrado / Maestría',
    icon: 'bxs-graduation',
    badgeCls: 'bg-ink text-lime border-white/20',
  },
  'Curso certificado': {
    label: 'Curso certificado',
    icon: 'bx-badge-check',
    badgeCls: 'bg-page text-secondary border-line',
  },
};

export default function EducationSection({ profile, updateProfile, notify }) {
  const [editingUts, setEditingUts] = useState(false);
  const [addingOther, setAddingOther] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Datos de la formación principal IES
  const [utsDraft, setUtsDraft] = useState({
    program: profile.program || 'Tecnología en Desarrollo de Sistemas Informáticos',
    graduationYear: profile.graduationYear || '2025',
    faculty: profile.faculty || 'Facultad de Ciencias Naturales e Ingenierías',
    campus: profile.campus || 'Sede Principal Bucaramanga',
    thesis: profile.thesis || 'Desarrollo de plataforma web para la gestión de prácticas empresariales.',
    degreeType: profile.degreeType || 'Pregrado Tecnológico',
  });

  const [otherDraft, setOtherDraft] = useState({
    institution: '',
    degree: '',
    year: '',
    type: 'Especialización',
    credentialId: '',
    description: '',
  });

  function handleSaveUts(e) {
    e.preventDefault();
    updateProfile((p) => ({
      ...p,
      program: utsDraft.program,
      graduationYear: utsDraft.graduationYear,
      faculty: utsDraft.faculty,
      campus: utsDraft.campus,
      thesis: utsDraft.thesis,
      degreeType: utsDraft.degreeType,
    }));
    setEditingUts(false);
    notify('Formación principal IES actualizada.');
  }

  function handleSaveOther(e) {
    e.preventDefault();
    if (!otherDraft.institution.trim() || !otherDraft.degree.trim()) return;

    if (editingItem) {
      updateProfile((p) => ({
        ...p,
        otherEducation: (p.otherEducation || []).map((x) =>
          x.id === editingItem.id ? { ...x, ...otherDraft } : x
        ),
      }));
      notify('Registro académico actualizado.');
    } else {
      const newEntry = {
        id: `edu-${Date.now()}`,
        institution: otherDraft.institution.trim(),
        degree: otherDraft.degree.trim(),
        year: otherDraft.year.trim(),
        type: otherDraft.type,
        credentialId: otherDraft.credentialId.trim(),
        description: otherDraft.description.trim(),
      };
      updateProfile((p) => ({
        ...p,
        otherEducation: [...(p.otherEducation || []), newEntry],
      }));
      notify('Registro académico agregado a tu educación.');
    }

    setOtherDraft({
      institution: '',
      degree: '',
      year: '',
      type: 'Especialización',
      credentialId: '',
      description: '',
    });
    setAddingOther(false);
    setEditingItem(null);
  }

  function handleDeleteOther(id) {
    updateProfile((p) => ({
      ...p,
      otherEducation: (p.otherEducation || []).filter((x) => x.id !== id),
    }));
    notify('Registro eliminado de educación.');
  }

  const academicSkills = [
    'Desarrollo Web Frontend & Backend',
    'Bases de Datos SQL & NoSQL',
    'Ingeniería de Software & Arquitectura',
    'Metodologías Ágiles (Scrum)',
    'Estructuras de Datos & Algoritmos',
    'Seguridad Informática & Redes',
  ];

  const specializations = (profile.otherEducation || []).filter(
    (e) => e.type === 'Especialización' || e.type === 'Posgrado / Maestría' || e.type === 'Diplomado'
  );
  const certifications = (profile.otherEducation || []).filter(
    (e) => e.type === 'Certificación' || e.type === 'Curso certificado'
  );

  return (
    <SectionCard
      id="educacion"
      icon="bx-graduation"
      tone="green"
      title="Educación y Certificaciones"
      subtitle="Titulaciones de pregrado, especializaciones, posgrados y certificaciones oficiales."
      action={
        <div className="flex items-center gap-2">
          <GhostButton
            icon="bx-plus"
            onClick={() => {
              setOtherDraft({
                institution: '',
                degree: '',
                year: '',
                type: 'Especialización',
                credentialId: '',
                description: '',
              });
              setEditingItem(null);
              setAddingOther(true);
            }}
          >
            Agregar educación / certificación
          </GhostButton>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ─── Tarjeta Principal de Educación IES ─── */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-secondary block mb-2">
            PREGRADO
          </span>
          <article className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-white via-page/40 to-emerald-50/20 p-5 sm:p-6 shadow-2xs transition-all hover:border-green/50 hover:shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-[#051F26] text-white shadow-md border border-white/10">
                  <i className="bx bxs-graduation text-2xl text-lime" />
                  <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-green text-white text-xs shadow-xs" title="Institución Acreditada">
                    <i className="bx bx-check" />
                  </span>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 font-display text-base sm:text-lg font-bold text-ink">
                      {profile.institution || profile.university || 'Institución de Educación Superior'}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[0.65rem] font-bold text-emerald-800">
                      <i className="bx bxs-badge-check text-green text-xs" /> Formación Acreditada
                    </span>
                  </div>

                  <p className="m-0 mt-1 font-display text-sm sm:text-base font-semibold text-blue-muted">
                    {profile.program}
                  </p>

                  <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secondary">
                    <span>{profile.faculty || 'Facultad de Ciencias Naturales e Ingenierías'}</span>
                    <span>•</span>
                    <span>{profile.campus || 'Sede Bucaramanga'}</span>
                    <span>•</span>
                    <span className="font-semibold text-ink">Promoción {profile.graduationYear}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUtsDraft({
                    program: profile.program || 'Tecnología en Desarrollo de Sistemas Informáticos',
                    graduationYear: profile.graduationYear || '2025',
                    faculty: profile.faculty || 'Facultad de Ciencias Naturales e Ingenierías',
                    campus: profile.campus || 'Sede Principal Bucaramanga',
                    thesis: profile.thesis || 'Desarrollo de plataforma web para la gestión de prácticas empresariales.',
                    degreeType: profile.degreeType || 'Pregrado Tecnológico',
                  });
                  setEditingUts(true);
                }}
                className="inline-flex items-center gap-1 self-start rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-page transition-colors cursor-pointer shrink-0"
                title="Editar datos de formación"
              >
                <i className="bx bx-pencil text-sm text-secondary" />
                Editar
              </button>
            </div>

            {/* Proyecto de Grado / Énfasis */}
            {profile.thesis && (
              <div className="mt-4 rounded-xl border border-line-soft bg-white/90 p-3.5 text-xs leading-relaxed">
                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block mb-1">
                  Proyecto de grado / Trabajo académico:
                </span>
                <p className="m-0 text-ink/90 font-medium">
                  {profile.thesis}
                </p>
              </div>
            )}

            {/* Competencias académicas validadas */}
            <div className="mt-4">
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block mb-2">
                Áreas de conocimiento validadas en el plan de estudios:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {academicSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-page px-2.5 py-1 text-xs font-medium text-ink/85"
                  >
                    <span className="size-1.5 rounded-full bg-green" aria-hidden="true" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Sello de verificación institucional */}
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-soft pt-3 text-[0.72rem] text-secondary">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                <i className="bx bx-shield-check text-green text-sm" />
                Título verificado y registrado en el sistema institucional de graduados
              </span>
              <span className="font-mono text-[0.65rem] text-secondary/70 hidden sm:inline">
                Código Verificación: IES-{profile.graduationYear || '2025'}-VOK
              </span>
            </div>
          </article>
        </div>

        {/* ─── Bloque de Especializaciones y Posgrados ─── */}
        <div className="border-t border-line pt-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-[#051F26] flex items-center gap-1.5">
              <i className="bx bx-book-bookmark text-base text-[#051F26]" />
              Especializaciones, Maestrías y Diplomados ({specializations.length})
            </h4>
          </div>

          {specializations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-page p-4 text-center text-xs text-secondary">
              ¿Cursas o culminaste una especialización o maestría? Haz clic en «Agregar educación / certificación» para incluirla.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {specializations.map((item) => {
                const meta = educationTypeMeta[item.type] || educationTypeMeta.Especialización;
                return (
                  <div
                    key={item.id}
                    className="group relative flex items-start justify-between gap-3 rounded-xl border border-line bg-white p-4 shadow-2xs hover:border-[#051F26]/30 transition-all"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#051F26]/10 text-[#051F26] text-lg">
                        <i className={`bx ${meta.icon}`} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="m-0 font-display text-sm font-bold text-ink truncate">{item.degree}</h5>
                        </div>
                        <p className="m-0 text-xs font-medium text-blue-muted">{item.institution}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className={`inline-block rounded-md border px-2 py-0.5 text-[0.65rem] font-bold ${meta.badgeCls}`}>
                            {item.type}
                          </span>
                          {item.year && <span className="text-[0.7rem] text-secondary">Año {item.year}</span>}
                        </div>
                        {item.description && (
                          <p className="m-0 mt-1.5 text-xs text-body-muted leading-relaxed line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setOtherDraft(item);
                          setEditingItem(item);
                          setAddingOther(true);
                        }}
                        className="grid size-7 place-items-center rounded-lg text-secondary hover:bg-page hover:text-ink transition-all"
                        title="Editar"
                      >
                        <i className="bx bx-pencil text-sm" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOther(item.id)}
                        className="grid size-7 place-items-center rounded-lg text-secondary hover:bg-rose-50 hover:text-rose-600 transition-all"
                        title="Eliminar"
                      >
                        <i className="bx bx-trash text-sm" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Bloque de Certificaciones Profesionales ─── */}
        <div className="border-t border-line pt-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-[#051F26] flex items-center gap-1.5">
              <i className="bx bx-award text-base text-[#051F26]" />
              Certificaciones Profesionales y Licencias ({certifications.length})
            </h4>
          </div>

          {certifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-page p-4 text-center text-xs text-secondary">
              Agrega certificaciones oficiales de la industria (AWS, Scrum, Microsoft, Cisco, etc.) para respaldar tus competencias.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {certifications.map((item) => {
                const meta = educationTypeMeta[item.type] || educationTypeMeta.Certificación;
                return (
                  <div
                    key={item.id}
                    className="group relative flex items-start justify-between gap-3 rounded-xl border border-line bg-white p-4 shadow-2xs hover:border-[#051F26]/30 transition-all"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800 text-lg">
                        <i className={`bx ${meta.icon}`} />
                      </span>
                      <div className="min-w-0">
                        <h5 className="m-0 font-display text-sm font-bold text-ink truncate">{item.degree}</h5>
                        <p className="m-0 text-xs font-medium text-blue-muted">{item.institution}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className={`inline-block rounded-md border px-2 py-0.5 text-[0.65rem] font-bold ${meta.badgeCls}`}>
                            {item.type}
                          </span>
                          {item.year && <span className="text-[0.7rem] text-secondary">Expedición: {item.year}</span>}
                          {item.credentialId && (
                            <span className="font-mono text-[0.65rem] text-secondary bg-panel px-1.5 py-0.5 rounded">
                              ID: {item.credentialId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setOtherDraft(item);
                          setEditingItem(item);
                          setAddingOther(true);
                        }}
                        className="grid size-7 place-items-center rounded-lg text-secondary hover:bg-page hover:text-ink transition-all"
                        title="Editar"
                      >
                        <i className="bx bx-pencil text-sm" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOther(item.id)}
                        className="grid size-7 place-items-center rounded-lg text-secondary hover:bg-rose-50 hover:text-rose-600 transition-all"
                        title="Eliminar"
                      >
                        <i className="bx bx-trash text-sm" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal para Editar Pregrado ─── */}
      {editingUts && (
        <Modal
          title="Editar Pregrado"
          subtitle="Actualiza los detalles de tu título y trabajo de grado avalado por tu institución."
          onClose={() => setEditingUts(false)}
          footer={
            <>
              <SecondaryButton onClick={() => setEditingUts(false)}>Cancelar</SecondaryButton>
              <PrimaryButton icon="bx-check" onClick={handleSaveUts}>Guardar cambios</PrimaryButton>
            </>
          }
        >
          <form onSubmit={handleSaveUts} className="space-y-4">
            <Field label="Programa académico / Título cursado">
              <input
                type="text"
                className={inputClass}
                value={utsDraft.program}
                onChange={(e) => setUtsDraft({ ...utsDraft, program: e.target.value })}
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Año de graduación / Promoción">
                <input
                  type="text"
                  className={inputClass}
                  value={utsDraft.graduationYear}
                  onChange={(e) => setUtsDraft({ ...utsDraft, graduationYear: e.target.value })}
                  placeholder="2025"
                  required
                />
              </Field>

              <Field label="Tipo de titulación">
                <select
                  className={inputClass}
                  value={utsDraft.degreeType}
                  onChange={(e) => setUtsDraft({ ...utsDraft, degreeType: e.target.value })}
                >
                  <option value="Tecnología">Tecnología</option>
                  <option value="Ingeniería / Pregrado">Ingeniería / Pregrado</option>
                  <option value="Profesional Universitario">Profesional Universitario</option>
                  <option value="Técnico Profesional">Técnico Profesional</option>
                </select>
              </Field>
            </div>

            <Field label="Facultad">
              <input
                type="text"
                className={inputClass}
                value={utsDraft.faculty}
                onChange={(e) => setUtsDraft({ ...utsDraft, faculty: e.target.value })}
              />
            </Field>

            <Field label="Proyecto de grado o trabajo destacado">
              <textarea
                rows={3}
                className={inputClass}
                value={utsDraft.thesis}
                onChange={(e) => setUtsDraft({ ...utsDraft, thesis: e.target.value })}
                placeholder="Describe brevemente tu tesis o proyecto final..."
              />
            </Field>
          </form>
        </Modal>
      )}

      {/* ─── Modal para Agregar/Editar Especialización o Certificación ─── */}
      {addingOther && (
        <Modal
          title={editingItem ? 'Editar Registro Académico' : 'Agregar Especialización o Certificación'}
          subtitle="Añade especializaciones, maestrías, diplomados o certificaciones de la industria."
          onClose={() => {
            setAddingOther(false);
            setEditingItem(null);
          }}
          footer={
            <>
              <SecondaryButton
                onClick={() => {
                  setAddingOther(false);
                  setEditingItem(null);
                }}
              >
                Cancelar
              </SecondaryButton>
              <PrimaryButton icon="bx-check" onClick={handleSaveOther}>
                {editingItem ? 'Guardar cambios' : 'Guardar en educación'}
              </PrimaryButton>
            </>
          }
        >
          <form onSubmit={handleSaveOther} className="space-y-4">
            <Field label="Tipo de formación o acreditación">
              <select
                className={inputClass}
                value={otherDraft.type}
                onChange={(e) => setOtherDraft({ ...otherDraft, type: e.target.value })}
              >
                <option value="Especialización">Especialización</option>
                <option value="Certificación">Certificación profesional</option>
                <option value="Posgrado / Maestría">Posgrado / Maestría</option>
                <option value="Diplomado">Diplomado</option>
                <option value="Curso certificado">Curso certificado</option>
              </select>
            </Field>

            <Field label="Nombre del programa, especialización o certificación">
              <input
                type="text"
                className={inputClass}
                value={otherDraft.degree}
                onChange={(e) => setOtherDraft({ ...otherDraft, degree: e.target.value })}
                placeholder="Ej. Especialización en Ciberseguridad, AWS Certified Solutions Architect..."
                required
              />
            </Field>

            <Field label="Institución u organización emisora">
              <input
                type="text"
                className={inputClass}
                value={otherDraft.institution}
                onChange={(e) => setOtherDraft({ ...otherDraft, institution: e.target.value })}
                placeholder="Ej. Universidad Industrial de Santander, Amazon Web Services, Cisco..."
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Año de graduación / expedición">
                <input
                  type="text"
                  className={inputClass}
                  value={otherDraft.year}
                  onChange={(e) => setOtherDraft({ ...otherDraft, year: e.target.value })}
                  placeholder="Ej. 2026"
                />
              </Field>

              <Field label="ID de credencial / Código de verificación (Opcional)">
                <input
                  type="text"
                  className={inputClass}
                  value={otherDraft.credentialId}
                  onChange={(e) => setOtherDraft({ ...otherDraft, credentialId: e.target.value })}
                  placeholder="Ej. AWS-849201"
                />
              </Field>
            </div>

            <Field label="Descripción o competencias adquiridas (Opcional)">
              <textarea
                rows={2}
                className={inputClass}
                value={otherDraft.description}
                onChange={(e) => setOtherDraft({ ...otherDraft, description: e.target.value })}
                placeholder="Breve resumen de temas cubiertos o habilidades desarrolladas..."
              />
            </Field>
          </form>
        </Modal>
      )}
    </SectionCard>
  );
}
