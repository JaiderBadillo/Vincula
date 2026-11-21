import { useState } from 'react';
import { Link } from 'react-router-dom';
import BrandMark from '../common/BrandMark.jsx';

/**
 * Pasos de un registro. `fields` son los ids de los campos que valida cada paso (coinciden con el id del input).
 * Devuelve el estado del asistente: paso actual, errores, avanzar/retroceder y validación final con salto al primer error.
 */
export function useRegistrationSteps(steps, validate) {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});

  const focusField = (id) => setTimeout(() => document.getElementById(id)?.focus(), 50);
  const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  function goNext() {
    const all = validate();
    const own = steps[step].fields.filter((f) => all[f]);
    setErrors(Object.fromEntries(own.map((f) => [f, all[f]])));
    if (own.length) {
      focusField(own[0]);
      return;
    }
    setStep((s) => s + 1);
    toTop();
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
    toTop();
  }

  /** true si todo es válido; si no, muestra los errores y salta al primer paso con problemas. */
  function validateAll() {
    const all = validate();
    setErrors(all);
    const bad = steps.findIndex((s) => s.fields.some((f) => all[f]));
    if (bad === -1) return true;
    setStep(bad);
    focusField(steps[bad].fields.find((f) => all[f]));
    return false;
  }

  return { step, setStep, errors, goNext, goBack, validateAll, isLast: step === steps.length - 1 };
}

function Stepper({ steps, current, onGo }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Pasos del registro">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2 last:flex-none" aria-current={active ? 'step' : undefined}>
            <button
              type="button"
              disabled={i > current}
              onClick={() => onGo(i)}
              className="flex cursor-pointer items-center gap-2.5 border-none bg-transparent p-0 text-left disabled:cursor-default"
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors ${
                  done ? 'bg-green text-white' : active ? 'bg-[#051F26] text-white ring-4 ring-[#051F26]/10' : 'bg-panel text-secondary'
                }`}
              >
                {done ? <i className="bx bx-check text-lg" /> : i + 1}
              </span>
              <span className={`hidden text-[0.8rem] font-semibold sm:block ${active ? 'text-ink' : done ? 'text-green-dark' : 'text-secondary'}`}>
                {step.title}
              </span>
            </button>
            {i < steps.length - 1 && <span className={`h-0.5 flex-1 rounded-full ${done ? 'bg-green' : 'bg-line'}`} />}
          </li>
        );
      })}
    </ol>
  );
}

/** Mensaje de error del envío a la API, con el mismo aspecto en los tres registros. */
export function ApiError({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-red-300 bg-red-50 p-3.5 text-xs font-semibold text-red-800" role="alert">
      <i className="bx bx-error-circle shrink-0 text-lg text-red-600" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Marco común de los registros (egresado, empresa e IES): panel de marca a la izquierda y, a la derecha,
 * encabezado de paso + indicador de avance + el formulario (children).
 * `copy` = { headline, intro, benefits: [{title, text}], footnote, stepTitles: [], stepIntros: [] }
 */
export default function RegistrationShell({ copy, steps, step, onGoStep, banner, children }) {
  return (
    <div className="min-h-screen bg-[#F8FAFB] text-ink antialiased lg:grid lg:grid-cols-[minmax(340px,0.4fr)_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#051F26] text-white lg:block">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-green/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-lime/10 blur-3xl" />
        <div className="sticky top-0 flex min-h-screen flex-col justify-between p-10 xl:p-12">
          <Link to="/" className="inline-flex no-underline" aria-label="Vincula, volver al inicio">
            <BrandMark onDark className="h-12" />
          </Link>

          <div>
            <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">{copy.headline}</h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">{copy.intro}</p>

            <ol className="mt-10 border-t border-white/15 p-0">
              {copy.benefits.map((b, i) => (
                <li
                  key={b.title}
                  className="benefit-enter group flex list-none items-start gap-5 border-b border-white/15 py-5"
                  style={{ animationDelay: `${200 + i * 160}ms` }}
                >
                  <span className="font-display text-sm font-semibold tabular-nums text-lime/80 transition-colors group-hover:text-lime">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="transition-transform duration-300 group-hover:translate-x-1">
                    <p className="m-0 text-[0.95rem] font-bold">{b.title}</p>
                    <p className="m-0 mt-1 text-[0.8rem] leading-relaxed text-white/65">{b.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <p className="m-0 flex items-center gap-2 text-xs text-white/50">
            <i className="bx bx-lock-alt text-base" />
            {copy.footnote}
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-12">
          <Link to="/" className="inline-flex no-underline lg:hidden" aria-label="Vincula, volver al inicio">
            <BrandMark className="h-9" />
          </Link>
          <Link to="/" className="hidden items-center gap-1.5 text-sm font-semibold text-secondary no-underline transition-colors hover:text-ink lg:inline-flex">
            <i className="bx bx-left-arrow-alt text-lg" /> Volver al inicio
          </Link>
          <p className="m-0 text-sm text-secondary">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-bold text-green no-underline hover:text-green-dark">
              Inicia sesión
            </Link>
          </p>
        </header>

        <main className="flex flex-1 items-start justify-center px-5 pb-12 pt-2 sm:px-8 lg:items-center lg:px-12">
          <div className="w-full max-w-2xl">
            <div className="mb-7">
              <p className="m-0 text-sm font-semibold text-green">
                Paso {step + 1} de {steps.length}
              </p>
              <h1 className="mt-1.5 font-display text-3xl font-extrabold tracking-tight text-[#051F26]">{copy.stepTitles[step]}</h1>
              <p className="mt-2 text-sm leading-relaxed text-body-muted">{copy.stepIntros[step]}</p>
            </div>

            <div className="mb-7">
              <Stepper steps={steps} current={step} onGo={onGoStep} />
            </div>

            {banner}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/** Pie del formulario: Atrás / enlace secundario + botón principal. */
export function StepActions({ step, isLast, isSubmitting, onBack, skipTo, submitLabel, submittingLabel, primaryButton }) {
  return (
    <div className="mt-8 flex flex-col-reverse items-stretch gap-3 border-t border-line-soft pt-6 sm:flex-row sm:items-center sm:justify-between">
      {step > 0 ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-control border border-line bg-white px-5 text-sm font-semibold text-secondary transition-colors hover:bg-panel hover:text-ink"
        >
          <i className="bx bx-left-arrow-alt text-lg" /> Atrás
        </button>
      ) : (
        <Link to={skipTo} className="text-center text-xs font-semibold text-secondary no-underline hover:text-ink">
          Omitir validación por ahora
        </Link>
      )}

      <button type="submit" disabled={isSubmitting} className={`${primaryButton} cursor-pointer sm:min-w-56 ${isSubmitting ? 'cursor-wait opacity-85' : ''}`}>
        {isSubmitting ? (
          <>
            <i className="bx bx-loader-alt animate-spin text-lg" />
            <span>{submittingLabel}</span>
          </>
        ) : (
          <>
            <span>{isLast ? submitLabel : 'Continuar'}</span>
            <i className={`bx ${isLast ? 'bx-check' : 'bx-right-arrow-alt'} text-xl`} />
          </>
        )}
      </button>
    </div>
  );
}

/** Modal de registro enviado. `rows` = [[etiqueta, valor]]; `files` = nombres de archivos en revisión. */
export function SuccessModal({ icon, badge, title, intro, rows, files, note, buttonLabel, onContinue, primaryButton }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm lg:col-span-2">
      <div className="my-auto w-full max-w-md space-y-4 rounded-3xl border border-line bg-white p-6 text-center shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="reg-success-title">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
          <i className={`bx ${icon}`} />
        </span>

        <div className="space-y-1.5">
          {badge && (
            <span className="inline-block rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-amber-900">
              {badge}
            </span>
          )}
          <h3 id="reg-success-title" className="font-display text-2xl font-bold tracking-tight text-[#051F26]">{title}</h3>
          <p className="m-0 text-sm leading-relaxed text-secondary">{intro}</p>
        </div>

        <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left text-xs">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-emerald-900">
              <span className="font-semibold">{label}</span>
              <span className="truncate font-bold text-ink">{value}</span>
            </div>
          ))}
          {files?.length > 0 && (
            <ul className="m-0 space-y-0.5 border-l-2 border-emerald-400 py-0.5 pl-3 text-[0.7rem] text-secondary">
              {files.map((name) => <li key={name} className="list-none truncate">{name}</li>)}
            </ul>
          )}
        </div>

        <p className="m-0 text-xs leading-snug text-secondary">{note}</p>

        <button type="button" onClick={onContinue} className={`${primaryButton} w-full cursor-pointer`}>
          <span>{buttonLabel}</span>
          <i className="bx bx-right-arrow-alt text-xl" />
        </button>
      </div>
    </div>
  );
}
