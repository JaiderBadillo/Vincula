import { useState } from 'react';
import { Field, GhostButton, Modal, PrimaryButton, SecondaryButton, SectionCard, inputClass } from './ui.jsx';

export default function EducationSection({ profile, updateProfile, notify }) {
  const [editingUts, setEditingUts] = useState(false);
  const [addingOther, setAddingOther] = useState(false);

  // Datos de la formación principal UTS
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
    type: 'Certificación / Diplomado',
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
    notify('Formación académica UTS actualizada.');
  }

  function handleAddOther(e) {
    e.preventDefault();
    if (!otherDraft.institution.trim() || !otherDraft.degree.trim()) return;
    const newEntry = {
      id: `edu-${Date.now()}`,
      institution: otherDraft.institution.trim(),
      degree: otherDraft.degree.trim(),
      year: otherDraft.year.trim(),
      type: otherDraft.type,
    };
    updateProfile((p) => ({
      ...p,
      otherEducation: [...(p.otherEducation || []), newEntry],
    }));
    setOtherDraft({ institution: '', degree: '', year: '', type: 'Certificación / Diplomado' });
    setAddingOther(false);
    notify('Formación complementaria agregada.');
  }

  function handleDeleteOther(id) {
    updateProfile((p) => ({
      ...p,
      otherEducation: (p.otherEducation || []).filter((x) => x.id !== id),
    }));
    notify('Registro eliminado.');
  }

  const academicSkills = [
    'Desarrollo Web Frontend & Backend',
    'Bases de Datos SQL & NoSQL',
    'Ingeniería de Software & Arquitectura',
    'Metodologías Ágiles (Scrum)',
    'Estructuras de Datos & Algoritmos',
    'Seguridad Informática & Redes',
  ];

  return (
    <SectionCard
      id="educacion"
      icon="bx-graduation"
      tone="green"
      title="Educación"
      subtitle="Formación académica superior, pregrados y certificaciones verificadas."
      action={
        <div className="flex items-center gap-2">
          <GhostButton icon="bx-plus" onClick={() => setAddingOther(true)}>
            Agregar formación
          </GhostButton>
        </div>
      }
    >
      <div className="space-y-5">
        {/* ─── Tarjeta Principal de Educación UTS ─── */}
        <article className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-white via-page/40 to-emerald-50/20 p-5 sm:p-6 shadow-2xs transition-all hover:border-green/50 hover:shadow-card">
          {/* Sello de agua sutil de fondo */}
          <div className="pointer-events-none absolute -right-6 -bottom-6 text-9xl font-black text-ink/[0.02] select-none" aria-hidden="true">
            UTS
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Insignia / Escudo UTS */}
              <div className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-ink text-lime shadow-md border border-white/10">
                <span className="font-display font-black text-lg tracking-tighter">UTS</span>
                <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-green text-white text-xs shadow-xs" title="Institución Acreditada">
                  <i className="bx bx-check" />
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="m-0 font-display text-base sm:text-lg font-bold text-ink">
                    Unidades Tecnológicas de Santander
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[0.65rem] font-bold text-emerald-800">
                    <i className="bx bxs-badge-check text-green text-xs" /> Institución Oficial UTS
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
              title="Editar datos de formación UTS"
            >
              <i className="bx bx-pencil text-sm text-secondary" />
              Editar
            </button>
          </div>

          {/* Proyecto de Grado / Énfasis */}
          <div className="mt-4 rounded-xl border border-line-soft bg-white/90 p-3.5 text-xs leading-relaxed">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block mb-1">
              Proyecto de grado / Trabajo académico:
            </span>
            <p className="m-0 text-ink/90 font-medium">
              {profile.thesis || 'Desarrollo de plataforma web para la gestión de prácticas empresariales y articulación con empresas aliadas.'}
            </p>
          </div>

          {/* Competencias académicas desarrolladas en el programa */}
          <div className="mt-4">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block mb-2">
              Áreas de conocimiento y competencias validadas en el plan de estudios:
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

          {/* Sello de validación para empresas */}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-soft pt-3 text-[0.72rem] text-secondary">
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
              <i className="bx bx-shield-check text-green text-sm" />
              Título verificado y registrado en el sistema institucional de graduados UTS
            </span>
            <span className="font-mono text-[0.65rem] text-secondary/70 hidden sm:inline">
              Código Verificación: UTS-{profile.graduationYear || '2025'}-VOK
            </span>
          </div>
        </article>

        {/* ─── Otras Formaciones o Certificaciones Añadidas ─── */}
        {profile.otherEducation?.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-secondary">
              Formación complementaria y diplomados
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {profile.otherEducation.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex items-start justify-between gap-3 rounded-xl border border-line bg-white p-4 shadow-2xs hover:border-ink/20 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-panel text-base text-blue-muted">
                      <i className="bx bx-award" />
                    </span>
                    <div>
                      <h5 className="m-0 font-display text-sm font-bold text-ink">{item.degree}</h5>
                      <p className="m-0 text-xs font-medium text-blue-muted">{item.institution}</p>
                      <p className="m-0 mt-1 text-[0.7rem] text-secondary">
                        {item.year && `Año: ${item.year} · `}{item.type}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteOther(item.id)}
                    className="opacity-0 group-hover:opacity-100 grid size-7 place-items-center rounded-lg text-secondary hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
                    title="Eliminar registro"
                  >
                    <i className="bx bx-trash text-sm" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Modal para Editar Datos UTS ─── */}
      {editingUts && (
        <Modal
          title="Editar Formación Académica UTS"
          subtitle="Actualiza los detalles de tu título y trabajo de grado en las Unidades Tecnológicas de Santander."
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
                  <option value="Especialización">Especialización</option>
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

      {/* ─── Modal para Agregar Otra Formación / Certificado ─── */}
      {addingOther && (
        <Modal
          title="Agregar Otra Formación o Certificación"
          subtitle="Añade diplomados, cursos o títulos de otras instituciones."
          onClose={() => setAddingOther(false)}
          footer={
            <>
              <SecondaryButton onClick={() => setAddingOther(false)}>Cancelar</SecondaryButton>
              <PrimaryButton icon="bx-plus" onClick={handleAddOther}>Agregar formación</PrimaryButton>
            </>
          }
        >
          <form onSubmit={handleAddOther} className="space-y-4">
            <Field label="Título, certificación o diplomado">
              <input
                type="text"
                className={inputClass}
                value={otherDraft.degree}
                onChange={(e) => setOtherDraft({ ...otherDraft, degree: e.target.value })}
                placeholder="Ej. Diplomado en Desarrollo Frontend, Certificación Azure..."
                required
              />
            </Field>

            <Field label="Institución emisora">
              <input
                type="text"
                className={inputClass}
                value={otherDraft.institution}
                onChange={(e) => setOtherDraft({ ...otherDraft, institution: e.target.value })}
                placeholder="Ej. Platzi, SENA, Universidad..."
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Año de finalización">
                <input
                  type="text"
                  className={inputClass}
                  value={otherDraft.year}
                  onChange={(e) => setOtherDraft({ ...otherDraft, year: e.target.value })}
                  placeholder="Ej. 2024"
                />
              </Field>

              <Field label="Tipo">
                <select
                  className={inputClass}
                  value={otherDraft.type}
                  onChange={(e) => setOtherDraft({ ...otherDraft, type: e.target.value })}
                >
                  <option value="Certificación">Certificación</option>
                  <option value="Diplomado">Diplomado</option>
                  <option value="Curso de especialización">Curso de especialización</option>
                  <option value="Otro título">Otro título</option>
                </select>
              </Field>
            </div>
          </form>
        </Modal>
      )}
    </SectionCard>
  );
}
