import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';
import CompanyLogo from '../components/company/CompanyLogo.jsx';
import { useCompanyProfile } from '../hooks/useCompanyProfile.js';
import { useCompanyRecruiters } from '../hooks/useCompanyRecruiters.js';
import { useCompanyVacancies } from '../hooks/useCompanyVacancies.js';
import { useCompanySites } from '../hooks/useCompanySites.js';
import {
  LANGUAGE_OPTIONS,
  SOFT_SKILL_SUGGESTIONS,
  TECH_SKILL_SUGGESTIONS,
  ACADEMIC_PROGRAM_SUGGESTIONS,
  VACANCY_BENEFIT_SUGGESTIONS,
  VACANCY_CATEGORIES,
  VACANCY_CONTRACTS,
  VACANCY_EXPERIENCE_LEVELS,
  VACANCY_MODALITIES,
  WORK_SCHEDULE_SUGGESTIONS,
  experienceLabel,
} from '../data/companyVacanciesData.js';
import { daysUntil, formatApplicationDate } from '../utils/formatters.js';

const STEPS = [
  { id: 'basics', label: 'Datos básicos' },
  { id: 'skills', label: 'Habilidades y funciones' },
  { id: 'conditions', label: 'Condiciones y requisitos' },
  { id: 'publish', label: 'Publicación' },
];

const MAX_TECH_SKILLS = 10;
const MAX_SOFT_SKILLS = 8;
const MIN_DESCRIPTION = 30;

const inputClass =
  'w-full rounded-lg border border-sand-line bg-cream/60 px-3 py-2.5 text-sm text-ink placeholder:text-body-muted outline-none transition-colors focus:border-terracotta focus:bg-white';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function buildInitialForm(vacancy, recruiters, isRecruiter = false) {
  if (vacancy) {
    const defaultTech = Array.isArray(vacancy.skillsTech) && vacancy.skillsTech.length > 0
      ? vacancy.skillsTech
      : (vacancy.skills || []).filter(
          (s) =>
            !['Trabajo en equipo', 'Comunicación asertiva', 'Liderazgo', 'Pensamiento crítico', 'Resolución de problemas', 'Adaptabilidad'].includes(s)
        );

    const defaultSoft = Array.isArray(vacancy.skillsSoft) && vacancy.skillsSoft.length > 0
      ? vacancy.skillsSoft
      : (vacancy.skills || []).filter((s) =>
          ['Trabajo en equipo', 'Comunicación asertiva', 'Liderazgo', 'Pensamiento crítico', 'Resolución de problemas', 'Adaptabilidad'].includes(s)
        );

    return {
      title: vacancy.title || '',
      category: vacancy.category || VACANCY_CATEGORIES[0],
      experienceLevel: vacancy.experienceLevel || 'recien-egresado',
      siteId: vacancy.siteId || '',
      modality: vacancy.modality || VACANCY_MODALITIES[0],
      contractType: vacancy.contractType || VACANCY_CONTRACTS[0],
      openSpots: vacancy.openSpots || 1,
      targetPrograms: [...(vacancy.targetPrograms || [])],
      description: vacancy.description || '',
      responsibilities: [...(vacancy.responsibilities || [])],
      skillsTech: [...defaultTech],
      skillsSoft: [...defaultSoft],
      salary: vacancy.salary || '',
      workSchedule: vacancy.workSchedule || WORK_SCHEDULE_SUGGESTIONS[0],
      languages: vacancy.languages || LANGUAGE_OPTIONS[0],
      benefits: [...(vacancy.benefits || [])],
      closingDate: vacancy.closingDate || '',
      ownerRecruiterId: vacancy.ownerRecruiterId || (isRecruiter ? 'rec-01' : ''),
    };
  }

  return {
    title: '',
    category: VACANCY_CATEGORIES[0],
    experienceLevel: 'recien-egresado',
    siteId: '',
    modality: VACANCY_MODALITIES[0],
    contractType: VACANCY_CONTRACTS[0],
    openSpots: 1,
    targetPrograms: [ACADEMIC_PROGRAM_SUGGESTIONS[0]],
    description: '',
    responsibilities: [],
    skillsTech: ['SQL', 'Power BI'],
    skillsSoft: ['Trabajo en equipo', 'Comunicación asertiva'],
    salary: '',
    workSchedule: WORK_SCHEDULE_SUGGESTIONS[0],
    languages: LANGUAGE_OPTIONS[0],
    benefits: [],
    closingDate: '',
    ownerRecruiterId: isRecruiter ? 'rec-01' : recruiters.find((r) => r.status === 'active')?.id || '',
  };
}

/** Errores por paso */
function validateStep(stepIndex, form) {
  const e = {};
  if (stepIndex === 0) {
    if (!form.title.trim()) e.title = 'Escribe el cargo o título de la vacante.';
    if (!form.openSpots || Number(form.openSpots) < 1) e.openSpots = 'Indica al menos 1 plaza disponible.';
  }
  if (stepIndex === 1) {
    if (form.description.trim().length < MIN_DESCRIPTION) {
      e.description = `Describe el cargo con al menos ${MIN_DESCRIPTION} caracteres.`;
    }
    if (form.skillsTech.length === 0) {
      e.skillsTech = 'Agrega al menos una habilidad técnica o herramienta requerida.';
    }
    if (form.skillsSoft.length === 0) {
      e.skillsSoft = 'Agrega al menos una habilidad blanda o competencia actitudinal.';
    }
  }
  if (stepIndex === 2) {
    if (!form.salary.trim()) e.salary = 'Indica el rango salarial o el apoyo económico.';
    if (!form.closingDate) e.closingDate = 'Define hasta cuándo recibirás hojas de vida.';
    else if (form.closingDate < todayISO()) e.closingDate = 'La fecha de cierre no puede estar en el pasado.';
  }
  return e;
}

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="m-0 mt-1 text-xs text-rose-600">{error}</p>
      ) : (
        hint && <p className="m-0 mt-1 text-xs text-secondary">{hint}</p>
      )}
    </div>
  );
}

function Segmented({ options, value, onChange, label }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt)}
            className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              active
                ? 'border-terracotta bg-terracotta/10 text-terracotta-dark'
                : 'border-sand-line bg-white text-ink hover:bg-cream'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Vista previa de la vacante tal como la vería un egresado o candidato */
function GraduatePreview({ form, companyProfile, site }) {
  const days = daysUntil(form.closingDate);

  return (
    <aside className="self-start lg:sticky lg:top-24" aria-label="Vista previa para egresados">
      <p className="m-0 mb-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-terracotta">
        Así la verán los candidatos y egresados
      </p>
      <article className="overflow-hidden rounded-card border border-sand-line bg-white shadow-card">
        {/* Cabecera */}
        <div className="flex items-start gap-3 border-b border-sand-line p-5">
          <CompanyLogo profile={companyProfile} size="size-12" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="m-0 font-display text-base font-bold leading-snug text-ink truncate">
                {form.title.trim() || 'Título de la vacante'}
              </h3>
              <span className="shrink-0 rounded-md bg-ochre/25 px-2 py-0.5 text-[0.65rem] font-bold text-cocoa">
                {form.openSpots || 1} {form.openSpots === 1 ? 'plaza' : 'plazas'}
              </span>
            </div>
            <p className="m-0 mt-0.5 text-xs text-secondary">
              {companyProfile.name}
              <span className="mx-1.5 text-secondary/50">•</span>
              {site ? site.city : 'Ciudad'}
            </p>
          </div>
        </div>

        {/* Programas objetivo */}
        {form.targetPrograms?.length > 0 && (
          <div className="border-b border-sand-line bg-page/80 px-5 py-2.5">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block mb-1">
              Dirigida a egresados de:
            </span>
            <div className="flex flex-wrap gap-1">
              {form.targetPrograms.map((p) => (
                <span
                  key={p}
                  className="rounded bg-sand/80 px-2 py-0.5 text-[0.68rem] font-medium text-cocoa"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Datos clave */}
        <dl className="m-0 grid grid-cols-2 gap-3 border-b border-sand-line bg-cream/50 p-5 text-xs">
          <div>
            <dt className="text-secondary">Modalidad</dt>
            <dd className="m-0 mt-0.5 font-semibold text-ink">{form.modality}</dd>
          </div>
          <div>
            <dt className="text-secondary">Experiencia</dt>
            <dd className="m-0 mt-0.5 font-semibold text-ink">{experienceLabel(form.experienceLevel)}</dd>
          </div>
          <div>
            <dt className="text-secondary">Contrato</dt>
            <dd className="m-0 mt-0.5 font-semibold text-ink">{form.contractType}</dd>
          </div>
          <div>
            <dt className="text-secondary">Salario</dt>
            <dd className="m-0 mt-0.5 font-semibold text-ink">{form.salary.trim() || 'A convenir'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-secondary">Jornada</dt>
            <dd className="m-0 mt-0.5 text-ink">{form.workSchedule || 'Lunes a Viernes'}</dd>
          </div>
        </dl>

        {/* Contenido */}
        <div className="space-y-4 p-5 text-xs">
          <div>
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block mb-1">
              Descripción:
            </span>
            <p className="m-0 line-clamp-4 whitespace-pre-line leading-relaxed text-ink/80">
              {form.description.trim() || 'Aquí aparecerá la descripción del cargo que redactes.'}
            </p>
          </div>

          {/* Habilidades Técnicas */}
          {form.skillsTech.length > 0 && (
            <div>
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block mb-1.5 flex items-center gap-1">
                <i className="bx bx-code-alt text-terracotta" />
                Habilidades Técnicas:
              </span>
              <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
                {form.skillsTech.map((s) => (
                  <li
                    key={s}
                    className="rounded bg-cocoa px-2 py-0.5 text-[0.68rem] font-medium text-white shadow-2xs"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Habilidades Blandas */}
          {form.skillsSoft.length > 0 && (
            <div>
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block mb-1.5 flex items-center gap-1">
                <i className="bx bx-heart text-ochre" />
                Habilidades Blandas:
              </span>
              <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
                {form.skillsSoft.map((s) => (
                  <li
                    key={s}
                    className="rounded border border-sand-line bg-sand/80 px-2 py-0.5 text-[0.68rem] font-semibold text-cocoa"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Beneficios */}
          {form.benefits.length > 0 && (
            <div>
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary block mb-1">
                Beneficios destacados:
              </span>
              <ul className="m-0 grid list-none gap-1 p-0">
                {form.benefits.map((b) => (
                  <li key={b} className="flex items-center gap-1.5 text-ink/80">
                    <i className="bx bx-check text-sm text-terracotta" aria-hidden="true" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Pie de postulación */}
        <div className="flex items-center justify-between gap-3 border-t border-sand-line px-5 py-3.5 bg-cream/30">
          <span className="text-[0.68rem] text-secondary">
            {form.closingDate
              ? days >= 0
                ? `Cierra el ${formatApplicationDate(form.closingDate)}`
                : 'Convocatoria vencida'
              : 'Sin fecha de cierre'}
          </span>
          <span className="rounded-lg bg-terracotta px-3.5 py-1.5 text-[0.7rem] font-bold text-white shadow-2xs">
            Postularme
          </span>
        </div>
      </article>
    </aside>
  );
}

export default function CompanyAdminVacancyEditorPage({ role = 'admin' }) {
  const isRecruiter = role === 'recruiter';
  const { vacancyId } = useParams();
  const navigate = useNavigate();
  const { companyProfile } = useCompanyProfile();
  const { recruiters } = useCompanyRecruiters();
  const { vacancies, addVacancy, updateVacancy } = useCompanyVacancies();
  const { sites } = useCompanySites();

  const editing = vacancyId ? vacancies.find((v) => v.id === vacancyId) : null;
  const isEditing = Boolean(vacancyId);

  const [form, setForm] = useState(() => buildInitialForm(editing, recruiters, isRecruiter));
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!sites.length) return;
    setForm((prev) => {
      if (prev.siteId && sites.some((s) => s.id === prev.siteId)) {
        return prev;
      }
      const defaultSite = sites.find((s) => s.isMain) || sites[0];
      return { ...prev, siteId: defaultSite.id };
    });
  }, [sites]);
  const [maxReached, setMaxReached] = useState(isEditing ? STEPS.length - 1 : 0);
  const [errors, setErrors] = useState({});

  const [techInput, setTechInput] = useState('');
  const [softInput, setSoftInput] = useState('');
  const [programInput, setProgramInput] = useState('');
  const [benefitInput, setBenefitInput] = useState('');
  const [respInput, setRespInput] = useState('');

  const site = useMemo(() => sites.find((s) => s.id === form.siteId), [sites, form.siteId]);
  const owner = recruiters.find((r) => r.id === form.ownerRecruiterId);

  if (isEditing && !editing) {
    return (
      <CompanyPortalLayout activePage={isRecruiter ? 'recruiter-vacantes' : 'admin-vacantes'} role={role}>
        <main className="mx-auto max-w-3xl px-5 pt-10 text-center sm:px-8">
          <i className="bx bx-search-alt text-4xl text-terracotta" aria-hidden="true" />
          <h1 className="m-0 mt-2 font-display text-xl font-bold text-ink">No encontramos esta vacante</h1>
          <p className="m-0 mt-1 text-sm text-secondary">Puede que haya sido eliminada previamente.</p>
          <Link
            to={isRecruiter ? '/empresa/reclutador/vacantes' : '/empresa/admin/vacantes'}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-terracotta px-4 py-2 text-xs font-bold text-white no-underline hover:bg-terracotta-dark"
          >
            Volver a vacantes
          </Link>
        </main>
      </CompanyPortalLayout>
    );
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  // Manejo de habilidades técnicas
  function addTechSkill(raw) {
    const value = raw.trim().replace(/,$/, '');
    if (!value) return;
    setForm((prev) => {
      if (prev.skillsTech.length >= MAX_TECH_SKILLS) return prev;
      if (prev.skillsTech.some((s) => s.toLowerCase() === value.toLowerCase())) return prev;
      return { ...prev, skillsTech: [...prev.skillsTech, value] };
    });
    setTechInput('');
    if (errors.skillsTech) setErrors((prev) => ({ ...prev, skillsTech: undefined }));
  }

  function toggleTechSkill(value) {
    if (form.skillsTech.includes(value)) {
      update('skillsTech', form.skillsTech.filter((s) => s !== value));
    } else {
      addTechSkill(value);
    }
  }

  // Manejo de habilidades blandas
  function addSoftSkill(raw) {
    const value = raw.trim().replace(/,$/, '');
    if (!value) return;
    setForm((prev) => {
      if (prev.skillsSoft.length >= MAX_SOFT_SKILLS) return prev;
      if (prev.skillsSoft.some((s) => s.toLowerCase() === value.toLowerCase())) return prev;
      return { ...prev, skillsSoft: [...prev.skillsSoft, value] };
    });
    setSoftInput('');
    if (errors.skillsSoft) setErrors((prev) => ({ ...prev, skillsSoft: undefined }));
  }

  function toggleSoftSkill(value) {
    if (form.skillsSoft.includes(value)) {
      update('skillsSoft', form.skillsSoft.filter((s) => s !== value));
    } else {
      addSoftSkill(value);
    }
  }

  // Manejo de programas académicos afines
  function toggleProgram(programName) {
    update(
      'targetPrograms',
      form.targetPrograms.includes(programName)
        ? form.targetPrograms.filter((p) => p !== programName)
        : [...form.targetPrograms, programName]
    );
  }

  function addCustomProgram() {
    const clean = programInput.trim();
    if (!clean || form.targetPrograms.some((p) => p.toLowerCase() === clean.toLowerCase())) return;
    update('targetPrograms', [...form.targetPrograms, clean]);
    setProgramInput('');
  }

  // Manejo de beneficios
  function toggleBenefit(value) {
    update(
      'benefits',
      form.benefits.includes(value) ? form.benefits.filter((b) => b !== value) : [...form.benefits, value]
    );
  }

  function addCustomBenefit() {
    const value = benefitInput.trim();
    if (!value || form.benefits.some((b) => b.toLowerCase() === value.toLowerCase())) return;
    update('benefits', [...form.benefits, value]);
    setBenefitInput('');
  }

  // Manejo de responsabilidades
  function addResponsibility() {
    const val = respInput.trim();
    if (!val) return;
    update('responsibilities', [...form.responsibilities, val]);
    setRespInput('');
  }

  function removeResponsibility(index) {
    update('responsibilities', form.responsibilities.filter((_, i) => i !== index));
  }

  function goToStep(index) {
    if (index > maxReached) return;
    setErrors({});
    setStep(index);
  }

  function handleNext() {
    const stepErrors = validateStep(step, form);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    const next = Math.min(step + 1, STEPS.length - 1);
    setStep(next);
    setMaxReached((m) => Math.max(m, next));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateAll() {
    for (let i = 0; i < STEPS.length - 1; i += 1) {
      const stepErrors = validateStep(i, form);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        setStep(i);
        setMaxReached((m) => Math.max(m, i));
        return false;
      }
    }
    return true;
  }

  function payload(status) {
    const combinedSkills = [...new Set([...form.skillsTech, ...form.skillsSoft])];
    return {
      ...form,
      title: form.title.trim(),
      openSpots: Number(form.openSpots) || 1,
      description: form.description.trim(),
      salary: form.salary.trim(),
      ownerRecruiterId: form.ownerRecruiterId || null,
      skills: combinedSkills,
      status,
    };
  }

  function finish(status, toast) {
    navigate(isRecruiter ? '/empresa/reclutador/vacantes' : '/empresa/admin/vacantes', {
      state: { toast, tab: status },
    });
  }

  function handleSaveDraft() {
    const titleErrors = validateStep(0, form);
    if (Object.keys(titleErrors).length > 0) {
      setErrors(titleErrors);
      setStep(0);
      return;
    }
    if (isEditing) {
      updateVacancy(editing.id, payload('draft'));
    } else {
      addVacancy(payload('draft'));
    }
    finish('draft', `Se guardó «${form.title.trim()}» como borrador.`);
  }

  function handlePublish() {
    if (!validateAll()) return;
    if (isEditing) {
      updateVacancy(editing.id, payload('open'));
    } else {
      addVacancy(payload('open'));
    }
    finish('open', `Se publicó «${form.title.trim()}». Ya es visible para los egresados.`);
  }

  function handleSaveChanges() {
    const status = editing.status;
    if (status !== 'draft' && !validateAll()) return;
    updateVacancy(editing.id, payload(status));
    finish(status, `Se guardaron los cambios de «${form.title.trim()}».`);
  }

  const isLastStep = step === STEPS.length - 1;
  const canPublish = !isEditing || editing.status === 'draft';

  return (
    <CompanyPortalLayout activePage={isRecruiter ? 'recruiter-vacantes' : 'admin-vacantes'} role={role}>
      <main className="w-full">
        <div className="mx-auto max-w-6xl px-5 pt-6 sm:px-8 lg:px-10">
          {/* Encabezado */}
          <Link
            to={isRecruiter ? '/empresa/reclutador/vacantes' : '/empresa/admin/vacantes'}
            className="inline-flex items-center gap-1 text-xs font-semibold text-secondary no-underline hover:text-terracotta"
          >
            <i className="bx bx-arrow-back text-sm" aria-hidden="true" />
            <span>Volver a mis vacantes</span>
          </Link>

          <h1 className="m-0 mt-2 font-display text-2xl font-bold text-ink">
            {isEditing ? `Editar «${editing.title}»` : 'Nueva vacante'}
          </h1>
          <p className="m-0 mt-1 text-sm text-secondary">
            {isEditing
              ? `${editing.code} · Los cambios se actualizan en vivo en la vista previa del egresado.`
              : 'Diligencia los requerimientos técnicos y competencias blandas para encontrar al candidato ideal.'}
          </p>

          {/* Stepper */}
          <ol className="m-0 mt-6 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4">
            {STEPS.map((s, index) => {
              const active = index === step;
              const done = index < step || (index <= maxReached && index !== step);
              const reachable = index <= maxReached;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goToStep(index)}
                    disabled={!reachable}
                    aria-current={active ? 'step' : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? 'border-terracotta bg-white shadow-card'
                        : reachable
                          ? 'border-sand-line bg-white hover:bg-cream cursor-pointer'
                          : 'border-sand-line bg-cream/50 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        active
                          ? 'bg-terracotta text-white'
                          : done
                            ? 'bg-sand text-terracotta-dark'
                            : 'bg-sand/60 text-secondary'
                      }`}
                    >
                      {done && !active ? <i className="bx bx-check text-base" aria-hidden="true" /> : index + 1}
                    </span>
                    <span className={`text-xs leading-tight ${active ? 'font-bold text-cocoa' : 'font-medium text-ink/80'}`}>
                      {s.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Área principal: Formulario a la izquierda y Vista Previa a la derecha */}
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <section className="rounded-card border border-sand-line bg-white p-6 shadow-card sm:p-7">
              <h2 className="m-0 font-display text-lg font-bold text-ink">{STEPS[step].label}</h2>
              <span className="mt-2 block h-[3px] w-9 rounded-full bg-terracotta" aria-hidden="true" />

              {/* PASO 0: DATOS BÁSICOS */}
              {step === 0 && (
                <div className="mt-6 grid gap-5">
                  <Field id="vac-title" label="Cargo o título de la vacante" error={errors.title}>
                    <input
                      id="vac-title"
                      className={inputClass}
                      value={form.title}
                      onChange={(e) => update('title', e.target.value)}
                      placeholder="Ej: Analista de Datos Operativos"
                      autoFocus
                    />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-3">
                    <Field id="vac-category" label="Área de la vacante">
                      <select
                        id="vac-category"
                        className={`${inputClass} cursor-pointer`}
                        value={form.category}
                        onChange={(e) => update('category', e.target.value)}
                      >
                        {VACANCY_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field id="vac-site" label="Sede">
                      <select
                        id="vac-site"
                        className={`${inputClass} cursor-pointer`}
                        value={form.siteId}
                        onChange={(e) => update('siteId', e.target.value)}
                      >
                        {sites.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.city})
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field id="vac-spots" label="Plazas disponibles" error={errors.openSpots}>
                      <input
                        id="vac-spots"
                        type="number"
                        min="1"
                        max="50"
                        className={inputClass}
                        value={form.openSpots}
                        onChange={(e) => update('openSpots', Math.max(1, Number(e.target.value)))}
                      />
                    </Field>
                  </div>

                  <div>
                    <p className="m-0 text-sm font-semibold text-ink">Nivel de experiencia</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Nivel de experiencia">
                      {VACANCY_EXPERIENCE_LEVELS.map((level) => {
                        const active = form.experienceLevel === level.id;
                        return (
                          <button
                            key={level.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => update('experienceLevel', level.id)}
                            className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                              active
                                ? 'border-terracotta bg-terracotta/10'
                                : 'border-sand-line bg-white hover:bg-cream'
                            }`}
                          >
                            <span className={`block text-sm font-semibold ${active ? 'text-terracotta-dark' : 'text-ink'}`}>
                              {level.label}
                            </span>
                            <span className="block text-xs text-secondary">{level.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <p className="m-0 text-sm font-semibold text-ink">Modalidad</p>
                      <div className="mt-2">
                        <Segmented
                          label="Modalidad"
                          options={VACANCY_MODALITIES}
                          value={form.modality}
                          onChange={(v) => update('modality', v)}
                        />
                      </div>
                    </div>

                    <Field id="vac-contract" label="Tipo de contrato">
                      <select
                        id="vac-contract"
                        className={`${inputClass} cursor-pointer`}
                        value={form.contractType}
                        onChange={(e) => update('contractType', e.target.value)}
                      >
                        {VACANCY_CONTRACTS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {/* Programas Académicos Afines */}
                  <div>
                    <label className="block text-sm font-semibold text-ink">
                      Programas académicos afines a los que va dirigida
                    </label>
                    <p className="m-0 mt-0.5 text-xs text-secondary">
                      Selecciona las carreras o áreas de formación cuyo pensum encaja con el perfil buscado:
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ACADEMIC_PROGRAM_SUGGESTIONS.map((prog) => {
                        const isSelected = form.targetPrograms.includes(prog);
                        return (
                          <button
                            key={prog}
                            type="button"
                            onClick={() => toggleProgram(prog)}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-green bg-green/10 text-green-dark'
                                : 'border-sand-line bg-white text-secondary hover:border-sand hover:text-ink'
                            }`}
                          >
                            <i className={`bx ${isSelected ? 'bxs-check-circle text-green' : 'bx-plus'}`} />
                            <span>{prog}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2.5 flex gap-2">
                      <input
                        className={inputClass}
                        value={programInput}
                        onChange={(e) => setProgramInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomProgram();
                          }
                        }}
                        placeholder="Otro programa académico o especialización..."
                      />
                      <button
                        type="button"
                        onClick={addCustomProgram}
                        className="shrink-0 rounded-lg border border-sand-line bg-cream px-3 text-xs font-bold text-ink transition-colors hover:bg-sand cursor-pointer"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 1: HABILIDADES Y FUNCIONES */}
              {step === 1 && (
                <div className="mt-6 grid gap-6">
                  <Field
                    id="vac-description"
                    label="Propósito y descripción del puesto"
                    error={errors.description}
                    hint="Describe el objetivo del rol, con quién interactuará y el impacto de su trabajo."
                  >
                    <textarea
                      id="vac-description"
                      rows={5}
                      className={`${inputClass} resize-y leading-relaxed`}
                      value={form.description}
                      onChange={(e) => update('description', e.target.value)}
                      placeholder="Ej: Te incorporarás al equipo de analítica para transformar datos operativos en decisiones estratégicas..."
                    />
                    <p className="m-0 mt-1 text-right text-[0.68rem] text-secondary">
                      {form.description.trim().length} caracteres
                    </p>
                  </Field>

                  {/* Habilidades Técnicas */}
                  <div className="rounded-xl border border-sand-line bg-cream/40 p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <label htmlFor="vac-tech-skill" className="block text-sm font-bold text-ink flex items-center gap-1.5">
                          <i className="bx bx-code-alt text-base text-terracotta" />
                          <span>Habilidades Técnicas y Herramientas</span>
                        </label>
                        <p className="m-0 mt-0.5 text-xs text-secondary">
                          Software, lenguajes, frameworks o tecnologías requeridas.
                        </p>
                      </div>
                      <span className="text-[0.68rem] font-bold text-secondary">
                        {form.skillsTech.length}/{MAX_TECH_SKILLS}
                      </span>
                    </div>

                    {form.skillsTech.length > 0 && (
                      <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0">
                        {form.skillsTech.map((s) => (
                          <li key={s}>
                            <button
                              type="button"
                              onClick={() => update('skillsTech', form.skillsTech.filter((x) => x !== s))}
                              className="inline-flex items-center gap-1 rounded-lg bg-cocoa px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-cocoa/85 cursor-pointer shadow-2xs"
                              aria-label={`Quitar ${s}`}
                            >
                              <span>{s}</span>
                              <i className="bx bx-x text-sm text-white/70" aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 flex gap-2">
                      <input
                        id="vac-tech-skill"
                        className={inputClass}
                        value={techInput}
                        disabled={form.skillsTech.length >= MAX_TECH_SKILLS}
                        onChange={(e) => setTechInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            addTechSkill(techInput);
                          }
                        }}
                        placeholder="Ej: SQL, Power BI, Python, AutoCAD, Siigo..."
                      />
                      <button
                        type="button"
                        onClick={() => addTechSkill(techInput)}
                        disabled={form.skillsTech.length >= MAX_TECH_SKILLS}
                        className="shrink-0 rounded-lg bg-cocoa px-4 text-xs font-bold text-white transition-colors hover:bg-cocoa/85 disabled:opacity-50 cursor-pointer"
                      >
                        Añadir
                      </button>
                    </div>
                    {errors.skillsTech && <p className="m-0 mt-1 text-xs text-rose-600">{errors.skillsTech}</p>}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {TECH_SKILL_SUGGESTIONS.filter((s) => !form.skillsTech.includes(s)).slice(0, 8).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleTechSkill(s)}
                          disabled={form.skillsTech.length >= MAX_TECH_SKILLS}
                          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-sand-line bg-white px-2 py-1 text-xs text-secondary transition-colors hover:border-terracotta hover:text-terracotta disabled:opacity-50 cursor-pointer"
                        >
                          <i className="bx bx-plus text-xs" />
                          <span>{s}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Habilidades Blandas */}
                  <div className="rounded-xl border border-sand-line bg-sand/30 p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <label htmlFor="vac-soft-skill" className="block text-sm font-bold text-ink flex items-center gap-1.5">
                          <i className="bx bx-heart text-base text-ochre" />
                          <span>Habilidades Blandas y Competencias</span>
                        </label>
                        <p className="m-0 mt-0.5 text-xs text-secondary">
                          Cualidades interpersonales, actitudinales y socioemocionales esperadas.
                        </p>
                      </div>
                      <span className="text-[0.68rem] font-bold text-secondary">
                        {form.skillsSoft.length}/{MAX_SOFT_SKILLS}
                      </span>
                    </div>

                    {form.skillsSoft.length > 0 && (
                      <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0">
                        {form.skillsSoft.map((s) => (
                          <li key={s}>
                            <button
                              type="button"
                              onClick={() => update('skillsSoft', form.skillsSoft.filter((x) => x !== s))}
                              className="inline-flex items-center gap-1 rounded-lg border border-sand-line bg-white px-2.5 py-1 text-xs font-semibold text-cocoa transition-colors hover:border-rose-300 hover:text-rose-600 cursor-pointer shadow-2xs"
                              aria-label={`Quitar ${s}`}
                            >
                              <span>{s}</span>
                              <i className="bx bx-x text-sm text-secondary" aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 flex gap-2">
                      <input
                        id="vac-soft-skill"
                        className={inputClass}
                        value={softInput}
                        disabled={form.skillsSoft.length >= MAX_SOFT_SKILLS}
                        onChange={(e) => setSoftInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            addSoftSkill(softInput);
                          }
                        }}
                        placeholder="Ej: Trabajo en equipo, Liderazgo, Adaptabilidad..."
                      />
                      <button
                        type="button"
                        onClick={() => addSoftSkill(softInput)}
                        disabled={form.skillsSoft.length >= MAX_SOFT_SKILLS}
                        className="shrink-0 rounded-lg bg-ochre px-4 text-xs font-bold text-cocoa transition-colors hover:bg-ochre/85 disabled:opacity-50 cursor-pointer"
                      >
                        Añadir
                      </button>
                    </div>
                    {errors.skillsSoft && <p className="m-0 mt-1 text-xs text-rose-600">{errors.skillsSoft}</p>}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {SOFT_SKILL_SUGGESTIONS.filter((s) => !form.skillsSoft.includes(s)).slice(0, 8).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSoftSkill(s)}
                          disabled={form.skillsSoft.length >= MAX_SOFT_SKILLS}
                          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-sand-line bg-white px-2 py-1 text-xs text-secondary transition-colors hover:border-ochre hover:text-cocoa disabled:opacity-50 cursor-pointer"
                        >
                          <i className="bx bx-plus text-xs text-ochre" />
                          <span>{s}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Responsabilidades Clave */}
                  <div>
                    <label className="block text-sm font-semibold text-ink">
                      Responsabilidades y Entregables Clave
                    </label>
                    <p className="m-0 mt-0.5 text-xs text-secondary">
                      Enumera las principales funciones que el egresado desempeñará en el cargo:
                    </p>

                    {form.responsibilities.length > 0 && (
                      <ul className="m-0 mt-3 grid list-none gap-2 p-0">
                        {form.responsibilities.map((r, i) => (
                          <li
                            key={i}
                            className="flex items-start justify-between gap-2 rounded-lg border border-sand-line bg-white p-2.5 text-xs text-ink"
                          >
                            <span className="flex items-start gap-2">
                              <i className="bx bx-check-circle text-base text-terracotta shrink-0 mt-0.5" />
                              <span>{r}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => removeResponsibility(i)}
                              className="text-secondary hover:text-rose-600 cursor-pointer"
                              aria-label="Eliminar función"
                            >
                              <i className="bx bx-trash text-sm" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-2.5 flex gap-2">
                      <input
                        className={inputClass}
                        value={respInput}
                        onChange={(e) => setRespInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addResponsibility();
                          }
                        }}
                        placeholder="Ej: Construir y mantener tableros de control en Power BI..."
                      />
                      <button
                        type="button"
                        onClick={addResponsibility}
                        className="shrink-0 rounded-lg border border-sand-line bg-cream px-4 text-xs font-bold text-ink transition-colors hover:bg-sand cursor-pointer"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 2: CONDICIONES Y REQUISITOS */}
              {step === 2 && (
                <div className="mt-6 grid gap-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="vac-salary" label="Rango salarial o apoyo económico" error={errors.salary}>
                      <input
                        id="vac-salary"
                        className={inputClass}
                        value={form.salary}
                        onChange={(e) => update('salary', e.target.value)}
                        placeholder="Ej: $3.800.000 - $4.800.000 COP"
                      />
                    </Field>

                    <Field
                      id="vac-closing"
                      label="Fecha límite de postulación"
                      error={errors.closingDate}
                      hint="Último día en el que se admitirán hojas de vida."
                    >
                      <input
                        id="vac-closing"
                        type="date"
                        min={todayISO()}
                        className={`${inputClass} cursor-pointer`}
                        value={form.closingDate}
                        onChange={(e) => update('closingDate', e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="vac-schedule" label="Jornada y Horario laboral">
                      <select
                        id="vac-schedule"
                        className={`${inputClass} cursor-pointer`}
                        value={form.workSchedule}
                        onChange={(e) => update('workSchedule', e.target.value)}
                      >
                        {WORK_SCHEDULE_SUGGESTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field id="vac-languages" label="Nivel de idiomas requerido">
                      <select
                        id="vac-languages"
                        className={`${inputClass} cursor-pointer`}
                        value={form.languages}
                        onChange={(e) => update('languages', e.target.value)}
                      >
                        {LANGUAGE_OPTIONS.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {/* Beneficios Corporativos */}
                  <div>
                    <p className="m-0 text-sm font-semibold text-ink">Beneficios corporativos ofrecidos</p>
                    <p className="m-0 mt-0.5 text-xs text-secondary">
                      Selecciona las prestaciones extralegales que distinguen tu vacante:
                    </p>

                    <ul className="m-0 mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
                      {[...new Set([...VACANCY_BENEFIT_SUGGESTIONS, ...form.benefits])].map((b) => {
                        const checked = form.benefits.includes(b);
                        return (
                          <li key={b}>
                            <label
                              className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                                checked
                                  ? 'border-terracotta bg-terracotta/10 text-terracotta-dark'
                                  : 'border-sand-line bg-white text-ink hover:bg-cream'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleBenefit(b)}
                                className="size-4 cursor-pointer accent-terracotta"
                              />
                              <span>{b}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="mt-3 flex gap-2">
                      <input
                        className={inputClass}
                        value={benefitInput}
                        onChange={(e) => setBenefitInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomBenefit();
                          }
                        }}
                        placeholder="Otro beneficio, ej: Póliza dental o día de la familia..."
                        aria-label="Agregar beneficio propio"
                      />
                      <button
                        type="button"
                        onClick={addCustomBenefit}
                        className="shrink-0 rounded-lg border border-sand-line bg-cream px-4 text-xs font-bold text-ink transition-colors hover:bg-sand cursor-pointer"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 3: PUBLICACIÓN Y RESPONSABLE */}
              {step === 3 && (
                <div className="mt-6 grid gap-6">
                  {isRecruiter ? (
                    <div className="rounded-2xl border border-ochre/40 bg-sand/30 p-4.5">
                      <div className="flex items-center gap-3">
                        <img
                          src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80"
                          alt="María Fernanda Henao"
                          className="size-12 shrink-0 rounded-full border-2 border-white object-cover shadow-2xs"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="m-0 text-sm font-bold text-ink">María Fernanda Henao</p>
                            <span className="rounded-full bg-ochre/30 px-2 py-0.5 text-[0.65rem] font-bold text-cocoa">
                              Tú (Reclutadora Líder)
                            </span>
                          </div>
                          <p className="m-0 mt-0.5 text-xs text-secondary">
                            Esta vacante quedará asignada directamente a tu gestión. Las postulaciones entrarán a tu embudo ATS y podrás agendar entrevistas.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Field
                      id="vac-owner"
                      label="Reclutador responsable del proceso"
                      hint="Gestionará los postulantes recibidos y coordinará las fases de selección."
                    >
                      <select
                        id="vac-owner"
                        className={`${inputClass} cursor-pointer`}
                        value={form.ownerRecruiterId}
                        onChange={(e) => update('ownerRecruiterId', e.target.value)}
                      >
                        <option value="">Sin asignar por ahora</option>
                        {recruiters
                          .filter((r) => r.status !== 'suspended' || r.id === form.ownerRecruiterId)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.fullName}
                            </option>
                          ))}
                      </select>
                    </Field>
                  )}

                  {/* Resumen integral */}
                  <div className="rounded-xl border border-sand-line bg-cream/60 p-5">
                    <h3 className="m-0 font-display text-sm font-bold text-ink">
                      Resumen integral antes de publicar
                    </h3>
                    <dl className="m-0 mt-3 grid grid-cols-[10rem_1fr] gap-y-2 text-xs">
                      <dt className="text-secondary">Cargo</dt>
                      <dd className="m-0 font-semibold text-ink">{form.title || '—'}</dd>

                      <dt className="text-secondary">Sede & Plazas</dt>
                      <dd className="m-0 text-ink">
                        {site ? `${site.name} (${site.city})` : '—'} · {form.openSpots} plaza(s)
                      </dd>

                      <dt className="text-secondary">Programas afines</dt>
                      <dd className="m-0 text-ink">
                        {form.targetPrograms.length ? form.targetPrograms.join(', ') : 'Abierto a todos'}
                      </dd>

                      <dt className="text-secondary">Habilidades Técnicas</dt>
                      <dd className="m-0 text-ink">
                        {form.skillsTech.length ? form.skillsTech.join(', ') : 'Ninguna'}
                      </dd>

                      <dt className="text-secondary">Habilidades Blandas</dt>
                      <dd className="m-0 font-semibold text-cocoa">
                        {form.skillsSoft.length ? form.skillsSoft.join(', ') : 'Ninguna'}
                      </dd>

                      <dt className="text-secondary">Jornada e Idiomas</dt>
                      <dd className="m-0 text-ink">
                        {form.workSchedule} · {form.languages}
                      </dd>

                      <dt className="text-secondary">Salario & Cierre</dt>
                      <dd className="m-0 text-ink">
                        {form.salary || 'A convenir'} · {form.closingDate ? formatApplicationDate(form.closingDate) : 'Sin fecha'}
                      </dd>

                      <dt className="text-secondary">Responsable</dt>
                      <dd className={`m-0 ${owner ? 'text-ink font-semibold' : 'text-terracotta font-semibold'}`}>
                        {owner ? owner.fullName : 'Sin responsable asignado'}
                      </dd>
                    </dl>
                  </div>
                </div>
              )}
            </section>

            {/* Vista Previa para Egresados */}
            <GraduatePreview form={form} companyProfile={companyProfile} site={site} />
          </div>
        </div>

        {/* Barra de navegación inferior */}
        <div className="sticky bottom-0 z-30 mt-8 border-t border-sand-line bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-8 lg:px-10">
            <button
              type="button"
              onClick={() => goToStep(step - 1)}
              disabled={step === 0}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-secondary transition-colors hover:text-ink disabled:invisible cursor-pointer"
            >
              <i className="bx bx-chevron-left text-lg" aria-hidden="true" />
              <span>Anterior</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {isEditing && editing.status !== 'draft' ? (
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className="rounded-lg border border-sand-line bg-cream px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-sand cursor-pointer"
                >
                  Guardar cambios
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="rounded-lg border border-sand-line bg-cream px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-sand cursor-pointer"
                >
                  Guardar borrador
                </button>
              )}

              {!isLastStep ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-1 rounded-lg bg-terracotta px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-terracotta-dark cursor-pointer shadow-2xs"
                >
                  <span>Siguiente</span>
                  <i className="bx bx-chevron-right text-lg" aria-hidden="true" />
                </button>
              ) : (
                canPublish && (
                  <button
                    type="button"
                    onClick={handlePublish}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-terracotta-dark cursor-pointer shadow-2xs"
                  >
                    <i className="bx bx-send text-base" aria-hidden="true" />
                    <span>Publicar vacante</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </main>
    </CompanyPortalLayout>
  );
}
