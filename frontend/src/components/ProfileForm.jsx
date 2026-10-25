import { useRef, useState } from 'react';
import { primaryButton } from '../utils/classes.js';

const areas = [
  'Administración y gestión',
  'Datos y tecnología',
  'Ingeniería',
  'Salud y ciencias',
  'Otra área',
];

const regions = ['Bucaramanga', 'Santander', 'Colombia', 'Remoto'];

function FormField({ label, id, value, onChange, options, placeholder, error, autoComplete }) {
  const fieldClasses = `min-h-11 w-full rounded-[0.72rem] border border-line bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 ${error ? 'border-red-600' : ''}`;

  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-ink" htmlFor={id}>{label}</label>
      {options ? (
        <select className={fieldClasses} id={id} value={value} onChange={onChange} required aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}>
          <option value="" disabled>{placeholder}</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input className={fieldClasses} id={id} type="text" value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} required aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
      )}
      {error && <p className="mt-1 text-xs font-bold text-red-700" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

export default function ProfileForm() {
  const formRef = useRef(null);
  const [values, setValues] = useState({ name: '', area: '', region: '' });
  const [cvName, setCvName] = useState('PDF o documento de texto · opcional');
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState('');

  function update(field) {
    return (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setFeedback('');
    const form = formRef.current;
    if (!form.checkValidity() || !values.name.trim()) {
      form.querySelector(':invalid')?.focus();
      if (!values.name.trim()) document.querySelector('#profile-name')?.focus();
      return;
    }
    setFeedback(`¡Listo, ${values.name.trim().split(/\s+/)[0]}! Esta vista es una demostración: tu información no se envió ni se guardó.`);
  }

  return (
    <div className="relative rounded-card border border-line bg-page p-5 text-ink shadow-hero sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-muted">Perfil de talento</p>
          <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-[1.7rem]">Inicia tu hoja de vida</h2>
          <p className="mt-2 text-sm leading-6 text-body-muted">Un perfil completo ayuda a acercarte a vacantes relevantes.</p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-control bg-panel text-2xl text-blue-muted" aria-hidden="true"><i className="bx bx-file" /></span>
      </div>
      <form ref={formRef} noValidate onSubmit={handleSubmit}>
        <div className="mb-4">
          <FormField
            label="Nombre y apellido"
            id="profile-name"
            value={values.name}
            onChange={update('name')}
            placeholder="Escribe tu nombre"
            autoComplete="name"
            error={submitted && !values.name.trim() ? 'Ingresa tu nombre y apellido.' : ''}
          />
        </div>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Área de interés" id="profile-area" value={values.area} onChange={update('area')} options={areas} placeholder="Selecciona un área" error={submitted && !values.area ? 'Selecciona un área de interés.' : ''} />
          <FormField label="Ciudad o región" id="profile-region" value={values.region} onChange={update('region')} options={regions} placeholder="Elige una ubicación" error={submitted && !values.region ? 'Selecciona una ubicación.' : ''} />
        </div>
        <label className="flex min-h-[4.1rem] cursor-pointer items-center gap-3 rounded-control border border-dashed border-[#cbd7db] bg-white px-4 py-3 text-blue-muted hover:border-green focus-within:border-green" htmlFor="profile-cv">
          <i className="bx bx-upload text-xl" aria-hidden="true" />
          <span className="grid min-w-0 gap-0.5"><span className="text-sm font-bold">Adjunta tu hoja de vida</span><span className="truncate text-xs text-secondary" id="cv-hint">{cvName}</span></span>
          <i className="bx bx-plus ml-auto text-lg text-body-muted" aria-hidden="true" />
          <input className="sr-only" id="profile-cv" type="file" accept=".pdf,.doc,.docx" aria-describedby="cv-hint" onChange={(event) => setCvName(event.target.files?.[0]?.name || 'PDF o documento de texto · opcional')} />
        </label>
        <button className={`${primaryButton} mt-5 w-full justify-between px-5 py-4`} type="submit">
          Crear perfil de talento <i className="bx bx-right-arrow-alt text-xl" aria-hidden="true" />
        </button>
        <p className="mb-0 mt-4 text-center text-xs leading-5 text-body-muted">Completa tu perfil y explora nuevas oportunidades.</p>
        {feedback && <p className="mt-3 rounded-control border border-green/20 bg-green/10 p-3 text-sm text-ink" role="status" aria-live="polite">{feedback}</p>}
      </form>
    </div>
  );
}
