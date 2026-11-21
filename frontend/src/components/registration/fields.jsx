import { useRef, useState } from 'react';

const inputBase =
  'min-h-12 w-full rounded-xl border bg-white px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-secondary/80 focus:border-green focus:ring-4 focus:ring-green/10';

export const inputClass = (error) => `${inputBase} ${error ? 'border-red-500 ring-2 ring-red-100' : 'border-line'}`;

export function FieldError({ children }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-600" role="alert">
      <i className="bx bx-error-circle" /> {children}
    </p>
  );
}

export function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.8rem] font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? <FieldError>{error}</FieldError> : hint ? <p className="mt-1.5 text-xs text-secondary">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ id, error, className = '', ...props }) {
  return <input id={id} aria-invalid={Boolean(error)} className={`${inputClass(error)} ${className}`} {...props} />;
}

export function SelectInput({ id, error, children, ...props }) {
  return (
    <select id={id} className={`${inputClass(error)} cursor-pointer`} {...props}>
      {children}
    </select>
  );
}

export function PasswordInput({ id, value, onChange, placeholder, error }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="new-password"
        aria-invalid={Boolean(error)}
        className={`${inputClass(error)} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-lg text-secondary hover:text-ink"
        aria-label={visible ? 'Ocultar contraseña' : 'Ver contraseña'}
      >
        <i className={`bx ${visible ? 'bx-hide' : 'bx-show'}`} />
      </button>
    </div>
  );
}

/** Contraseña + confirmación, con el mismo aspecto en los tres registros. */
export function PasswordPair({ password, setPassword, confirmPassword, setConfirmPassword, errors }) {
  return (
    <div className="rounded-2xl border border-line-soft bg-emerald-50/40 p-5">
      <p className="m-0 mb-4 flex items-center gap-2 text-sm font-bold text-[#051F26]">
        <i className="bx bx-lock-alt text-lg text-green" /> Contraseña de tu cuenta
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="password" label="Contraseña" error={errors.password} hint="Mínimo 8 caracteres.">
          <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Crea una contraseña" error={errors.password} />
        </Field>
        <Field id="confirmPassword" label="Confirmar contraseña" error={errors.confirmPassword}>
          <PasswordInput id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" error={errors.confirmPassword} />
        </Field>
      </div>
    </div>
  );
}

export function ConsentCheck({ id, checked, onChange, error, children }) {
  return (
    <div>
      <label className="flex cursor-pointer select-none items-start gap-3 text-[0.8rem] leading-relaxed text-secondary">
        <input id={id} type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 size-4.5 shrink-0 cursor-pointer rounded border-line accent-green" />
        <span>{children}</span>
      </label>
      <FieldError>{error}</FieldError>
    </div>
  );
}

/** Zona para soltar o elegir un PDF. `onFile` recibe el archivo; la validación (tipo y tamaño) es de la página. */
export function PdfDropzone({ id, label, hint, file, error, onFile }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const open = () => inputRef.current?.click();

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="m-0 text-[0.8rem] font-semibold text-ink">{label}</p>
        {hint && <span className="text-xs text-secondary">{hint}</span>}
      </div>
      <div
        id={id}
        tabIndex={0}
        role="button"
        aria-label={`Seleccionar archivo PDF: ${label}`}
        onClick={open}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files?.[0]); }}
        className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center outline-none transition-all focus-visible:ring-4 focus-visible:ring-green/20 ${
          dragging
            ? 'border-green bg-emerald-100/70'
            : file
            ? 'border-green bg-emerald-50/60 hover:bg-emerald-50'
            : error
            ? 'border-red-400 bg-red-50/30'
            : 'border-line hover:border-green hover:bg-page'
        }`}
      >
        <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="sr-only" tabIndex={-1} onChange={(e) => onFile(e.target.files?.[0])} />
        {file ? (
          <div className="flex w-full items-center gap-4 text-left">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-green text-2xl text-white"><i className="bx bxs-file-pdf" /></span>
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-bold text-[#051F26]">{file.name}</p>
              <p className="m-0 mt-0.5 text-xs text-secondary">{(file.size / 1024 / 1024).toFixed(2)} MB · Listo para enviar</p>
              <p className="m-0 mt-1 text-xs font-semibold text-green-dark underline">Cambiar archivo</p>
            </div>
          </div>
        ) : (
          <>
            <span className="grid size-10 place-items-center rounded-full bg-panel text-xl text-secondary"><i className="bx bx-upload" /></span>
            <p className="m-0 mt-2 text-sm font-bold text-[#051F26]">Haz clic o arrastra el PDF aquí</p>
            <p className="m-0 mt-0.5 text-xs text-secondary">Solo PDF, máximo 10 MB</p>
          </>
        )}
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

/** Valida tipo y tamaño de un PDF; devuelve el texto del error o '' si es válido. */
export function pdfProblem(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) return 'El documento debe adjuntarse en formato PDF.';
  if (file.size > 10 * 1024 * 1024) return 'El archivo supera el tamaño máximo permitido de 10 MB.';
  return '';
}
