import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { graduateProfileService } from '../../services/graduateProfileService.js';
import { useProfile } from '../../hooks/useProfile.js';

export default function ResumeUploadCard() {
  const inputRef = useRef(null);
  const { profile, updateProfile } = useProfile();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const saved = profile.cvs?.length || 0;

  async function handleFileChange(event) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
    const isPdf = file.type === 'application/pdf' || (!file.type && hasPdfExtension);
    if (!isPdf) return setError('Selecciona un archivo PDF para continuar.');
    if (file.size > 5 * 1024 * 1024) return setError('El archivo supera los 5 MB.');

    setError('');
    setMessage('');
    setSaving(true);
    try {
      const result = await graduateProfileService.uploadCv(file);
      updateProfile((p) => ({ ...p, cvs: result.cvs }));
      setMessage(`Guardada en tu perfil: ${file.name}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
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
            Sube tu hoja de vida en formato PDF para tenerla en tu perfil. Tu afinidad con las vacantes se calcula con tu programa y las habilidades que registres.
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
            disabled={saving}
          >
            {saving ? 'Subiendo…' : 'Subir Hoja de Vida (PDF)'}
            <i className="bx bx-upload text-xl" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative z-10 mt-7 flex flex-col gap-2 border-t border-white/15 pt-5 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-white/50" id="resume-upload-help">
          Máximo 5 MB. Puedes gestionar tus versiones en{' '}
          <Link to="/dashboard/perfil#subir-cv" className="font-semibold text-lime underline-offset-4 hover:underline">
            Mi Perfil & CV
          </Link>
          .
        </p>
        <p className="font-medium text-white/80" role={error ? 'alert' : 'status'} aria-live={error ? 'assertive' : 'polite'}>
          {error || message || (saved ? `${saved} ${saved === 1 ? 'versión guardada' : 'versiones guardadas'} en tu perfil.` : 'Aún no has subido una hoja de vida.')}
        </p>
      </div>
    </section>
  );
}
