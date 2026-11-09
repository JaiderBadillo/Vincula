import { useEffect, useRef, useState } from 'react';
import { getInitials, resizeImage } from '../../hooks/useProfile.js';

const DEFAULT_COVER = '/images/profile/cover-office.jpg';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function ProfileHero({
  profile,
  updateProfile,
  onEdit,
  onPreview,
  notify,
  strength,
  onSelectTab,
}) {
  const photoInput = useRef(null);
  const coverInput = useRef(null);
  const photoMenuRef = useRef(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (photoMenuRef.current && !photoMenuRef.current.contains(event.target)) {
        setPhotoMenuOpen(false);
      }
    }
    if (photoMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [photoMenuOpen]);

  async function handleImage(event, field, maxSize) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('El archivo debe ser una imagen (JPG, PNG o WebP).', 'error');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      notify('La imagen supera los 5 MB permitidos.', 'error');
      return;
    }
    try {
      const dataUrl = await resizeImage(file, maxSize);
      updateProfile((p) => ({ ...p, [field]: dataUrl }));
      notify(field === 'photo' ? 'Foto de perfil actualizada.' : 'Portada actualizada.');
    } catch {
      notify('No pudimos procesar la imagen. Intenta con otra.', 'error');
    }
  }

  const stats = [
    { icon: 'bx-show', value: String(profile.profileViews ?? 0), label: 'Vistas de perfil' },
    { icon: 'bx-search-alt', value: String(profile.searchAppearances ?? 0), label: 'Apariciones en búsquedas' },
    { icon: 'bx-send', value: String(profile.activeApplicationsCount ?? profile.applicationsCount ?? 0), label: 'Postulaciones activas' },
  ];

  return (
    <section className="relative isolate" aria-label="Encabezado del perfil">
      {/* ─── Cover ─── */}
      <div className="group/cover relative h-48 overflow-hidden bg-ink sm:h-56 lg:h-64">
        <img
          src={profile.cover || DEFAULT_COVER}
          alt=""
          className="profile-cover-img size-full object-cover object-[center_35%]"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/25 to-transparent" aria-hidden="true" />
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />

        <button
          type="button"
          onClick={() => coverInput.current?.click()}
          className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-ink/60 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white hover:text-ink sm:right-6 sm:top-5 cursor-pointer"
        >
          <i className="bx bx-image-add text-base" aria-hidden="true" />
          Cambiar portada
        </button>
        <input ref={coverInput} type="file" accept="image/*" className="sr-only" onChange={(e) => handleImage(e, 'cover', 1400)} aria-label="Subir imagen de portada" />
      </div>

      {/* ─── Identity bar ─── */}
      <div className="relative px-5 pb-6 sm:px-8 sm:pb-8 lg:px-10 lg:pb-10">
        {/* Row 1: Avatar (half over cover) + Action Buttons (cleanly below cover) */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          {/* Avatar: ONLY this element has negative top margin */}
          <div className="relative -mt-16 sm:-mt-20 z-10 w-fit">
            <div className={`rounded-full p-1 bg-white shadow-hero ${profile.openToWork ? 'profile-otw-ring' : ''}`}>
              <div className="grid size-32 place-items-center overflow-hidden rounded-full border-4 border-white bg-panel sm:size-36">
                {profile.photo ? (
                  <img src={profile.photo} alt={`Foto de ${profile.fullName}`} className="size-full object-cover" />
                ) : (
                  <span className="font-display text-4xl font-bold text-green-dark">{getInitials(profile.fullName)}</span>
                )}
              </div>
            </div>
            {profile.openToWork && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-white bg-green px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-white shadow">
                #Disponible
              </span>
            )}

            {/* Menú flotante de opciones de foto */}
            <div className="absolute right-0 bottom-2" ref={photoMenuRef}>
              <button
                type="button"
                onClick={() => {
                  if (profile.photo) {
                    setPhotoMenuOpen((prev) => !prev);
                  } else {
                    photoInput.current?.click();
                  }
                }}
                className="grid size-10 place-items-center rounded-full border-2 border-white bg-ink text-lg text-lime shadow-lg transition-transform hover:scale-110 cursor-pointer"
                aria-label="Opciones de foto de perfil"
                title={profile.photo ? 'Opciones de foto de perfil' : 'Subir foto de perfil'}
                aria-expanded={photoMenuOpen}
              >
                <i className="bx bx-camera" aria-hidden="true" />
              </button>

              {photoMenuOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-40 w-44 rounded-2xl border border-line bg-white p-1.5 shadow-hero animate-rise-in">
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMenuOpen(false);
                      photoInput.current?.click();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink hover:bg-page transition-colors cursor-pointer text-left"
                  >
                    <i className="bx bx-image-add text-base text-green-dark" />
                    <span>Actualizar foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMenuOpen(false);
                      updateProfile((p) => ({ ...p, photo: null }));
                      notify('Foto eliminada.');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                  >
                    <i className="bx bx-trash text-base text-rose-600" />
                    <span>Eliminar foto</span>
                  </button>
                </div>
              )}
            </div>

            <input ref={photoInput} type="file" accept="image/*" className="sr-only" onChange={(e) => handleImage(e, 'photo', 360)} aria-label="Subir foto de perfil" />
          </div>

          {/* Action buttons: completely in the page body area, never overlapping cover */}
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 sm:pb-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-xs">
              <span className="relative grid size-5 place-items-center">
                <svg viewBox="0 0 36 36" className="size-5 -rotate-90" aria-hidden="true">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-line)" strokeWidth="5" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-green)" strokeWidth="5" strokeDasharray={`${(strength / 100) * 94.2} 94.2`} strokeLinecap="round" />
                </svg>
              </span>
              Perfil {strength}%
            </span>
            <button
              type="button"
              onClick={onPreview}
              id="btn-recruiter-preview-hero"
              className="inline-flex items-center gap-2 rounded-full border border-green/30 bg-green/[0.08] px-4 py-2.5 text-xs font-bold text-green-dark shadow-xs transition-all hover:-translate-y-px hover:border-green hover:bg-green/15 cursor-pointer"
              title="Comprueba exactamente cómo ven tu perfil los reclutadores"
            >
              <i className="bx bx-show text-base text-green" aria-hidden="true" />
              Ver cómo me ven las empresas
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-ink-soft cursor-pointer"
            >
              <i className="bx bx-edit-alt text-base text-lime" aria-hidden="true" />
              Editar datos básicos
            </button>
          </div>
        </div>

        {/* Row 2: Candidate identity & UTS university link */}
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 font-display text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-tight tracking-[-0.04em] text-ink">
              {profile.fullName}
            </h1>
            {profile.isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[0.68rem] font-bold text-emerald-700">
                <i className="bx bxs-badge-check text-green text-sm" aria-hidden="true" />
                Egresado Verificado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[0.68rem] font-bold text-amber-700">
                <i className="bx bx-time-five text-amber-600 text-sm" aria-hidden="true" />
                Perfil en Verificación
              </span>
            )}
          </div>

          <p className="m-0 mt-1 max-w-2xl font-display text-sm sm:text-base font-semibold text-blue-muted">
            {profile.headline || 'Perfil profesional en desarrollo'}
          </p>

          {/* Enlace a formación académica y datos de contacto */}
          <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2.5 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => (onSelectTab ? onSelectTab('educacion') : (window.location.hash = 'educacion'))}
              className="group inline-flex items-center gap-2 rounded-full border border-line bg-page px-3.5 py-1.5 font-semibold text-ink transition-all hover:border-green hover:bg-white hover:text-green-dark shadow-2xs cursor-pointer text-left"
              title="Ir a formación académica"
            >
              <span className="grid size-5 place-items-center rounded-full bg-ink text-lime text-xs group-hover:bg-green group-hover:text-white transition-colors">
                <i className="bx bxs-graduation" aria-hidden="true" />
              </span>
              <span>{profile.institution || profile.university || 'Institución de Educación Superior'}</span>
              {profile.program && (
                <>
                  <span className="text-secondary font-normal">•</span>
                  <span className="text-blue-muted font-medium">{profile.program}</span>
                </>
              )}
              <i className="bx bx-chevron-right text-base text-secondary group-hover:translate-x-0.5 transition-transform" />
            </button>

            {profile.location && (
              <span className="inline-flex items-center gap-1 font-medium text-body-muted">
                <i className="bx bx-map text-base text-secondary" aria-hidden="true" />
                {profile.location}
              </span>
            )}

            <button
              type="button"
              onClick={() => (onSelectTab ? onSelectTab('sobre-mi') : (window.location.hash = 'sobre-mi'))}
              className="inline-flex items-center gap-1 font-semibold text-green-dark hover:underline cursor-pointer"
            >
              <i className="bx bx-envelope text-base text-secondary" aria-hidden="true" />
              Información de contacto
            </button>
          </div>
        </div>

        {/* ─── Separador y Estadísticas de Actividad ─── */}
        <div className="mt-8 sm:mt-10 pt-6 border-t border-line-soft">
          <ul
            className="grid list-none gap-4 sm:gap-6 sm:grid-cols-3"
            style={{ margin: 0, padding: 0 }}
          >
            {stats.map((s, i) => (
              <li
                key={s.label}
                className="profile-stat flex items-center gap-4 rounded-2xl border border-line bg-white p-4.5 sm:p-5 shadow-xs transition-all hover:border-line-soft"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className={`grid size-12 shrink-0 place-items-center rounded-xl text-xl ${['bg-sky-50 text-sky-700', 'bg-violet-50 text-violet-700', 'bg-amber-50 text-amber-700'][i]}`} aria-hidden="true">
                  <i className={`bx ${s.icon}`} />
                </span>
                <div className="min-w-0">
                  <p className="m-0 flex items-baseline gap-2 font-display text-xl font-bold text-ink">
                    {s.value}
                    {s.trend && <span className="text-[0.68rem] font-bold text-emerald-600">{s.trend}</span>}
                  </p>
                  <p className="m-0 truncate text-xs text-body-muted">{s.label} · últimos 30 días</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
