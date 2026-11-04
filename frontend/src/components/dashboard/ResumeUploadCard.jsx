import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { primaryButton } from '../../utils/classes.js';

export default function ResumeUploadCard() {
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
    const isPdf = file.type === 'application/pdf' || (!file.type && hasPdfExtension);
    if (!isPdf) {
      setSelectedFile(null);
      setError('Selecciona un archivo PDF para continuar.');
      event.target.value = '';
      return;
    }

    setError('');
    setSelectedFile(file);
  }

  return (
    <section
      className="group relative isolate overflow-hidden rounded-card border border-line bg-ink p-6 text-white shadow-card sm:p-8 lg:p-9 scroll-mt-24 transition-all duration-300"
      id="subir-cv"
      aria-labelledby="resume-card-title"
    >
      {/* Background image with fade */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <img
          className="size-full object-cover object-[center_25%] opacity-20"
          src="https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1200&q=75"
          alt=""
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/95 to-ink/70" />
      </div>

      {/* Decorative elements */}
      <div className="featured-rings pointer-events-none absolute inset-0 z-0" aria-hidden="true"><span /><span /></div>

      <div className="relative z-10 flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="max-w-2xl">
          <div className="mb-5 grid size-12 place-items-center rounded-xl border border-white/15 bg-white/10 text-2xl text-lime" aria-hidden="true">
            <i className="bx bx-file-blank" />
          </div>
          <h2 className="font-display text-xl font-semibold leading-snug tracking-[-0.03em] sm:text-2xl" id="resume-card-title">
            Activa tu motor de búsqueda.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
            Sube tu hoja de vida en formato PDF y nuestra IA extraerá tus habilidades técnicas para calcular tu afinidad con las empresas.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-sm">
            <i className="bx bx-lock-alt text-base text-lime" aria-hidden="true" />
            Archivo PDF
          </span>
          <input
            className="sr-only"
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            aria-label="Seleccionar hoja de vida en formato PDF"
            aria-describedby="resume-upload-help"
            onChange={handleFileChange}
          />
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-lime px-6 py-4 font-display text-sm font-semibold text-ink shadow-none transition-colors hover:bg-lime/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            type="button"
            aria-describedby="resume-upload-help"
            onClick={() => inputRef.current?.click()}
          >
            Subir Hoja de Vida (PDF)
            <i className="bx bx-upload text-xl" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative z-10 mt-7 flex flex-col gap-2 border-t border-white/15 pt-5 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-white/50" id="resume-upload-help">
          Tu archivo se procesa de forma segura. Puedes gestionar múltiples versiones en{' '}
          <Link to="/dashboard/perfil#subir-cv" className="font-semibold text-lime underline-offset-4 hover:underline">
            Mi Perfil & CV
          </Link>
          .
        </p>
        <p className="font-medium text-white/80" role={error ? 'alert' : 'status'} aria-live={error ? 'assertive' : 'polite'}>
          {error || (selectedFile ? `Archivo seleccionado: ${selectedFile.name}` : 'Aún no has seleccionado una hoja de vida.')}
        </p>
      </div>
    </section>
  );
}
