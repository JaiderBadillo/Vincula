import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import GraduatePortalLayout from '../components/dashboard/GraduatePortalLayout.jsx';
import CvManager from '../components/profile/CvManager.jsx';
import EditBasicsModal from '../components/profile/EditBasicsModal.jsx';
import EducationSection from '../components/profile/EducationSection.jsx';
import ExperienceSection from '../components/profile/ExperienceSection.jsx';
import JobPreferences from '../components/profile/JobPreferences.jsx';
import ProfileHero from '../components/profile/ProfileHero.jsx';
import ProfileStrength from '../components/profile/ProfileStrength.jsx';
import RecruiterPreviewModal from '../components/profile/RecruiterPreviewModal.jsx';
import SkillsEditor from '../components/profile/SkillsEditor.jsx';
import VisibilityCard from '../components/profile/VisibilityCard.jsx';
import { GhostButton, SectionCard } from '../components/profile/ui.jsx';
import { computeProfileStrength, useProfile } from '../hooks/useProfile.js';

const TABS = [
  {
    id: 'sobre-mi',
    label: 'Sobre mí',
    shortLabel: 'Sobre mí',
    icon: 'bx-user-circle',
    description: 'Biografía, datos de contacto y redes profesionales',
  },
  {
    id: 'educacion',
    label: 'Educación UTS',
    shortLabel: 'Educación',
    icon: 'bx-graduation',
    badge: 'UTS',
    badgeCls: 'bg-emerald-100 text-emerald-800',
    description: 'Título universitario, competencias curriculares y registro oficial',
  },
  {
    id: 'cv',
    label: 'Hoja de vida',
    shortLabel: 'Hoja de vida',
    icon: 'bx-file',
    badge: 'PDF',
    badgeCls: 'bg-sky-100 text-sky-800',
    description: 'Gestor y analizador de tu currículum vitae en PDF',
  },
  {
    id: 'habilidades',
    label: 'Habilidades',
    shortLabel: 'Habilidades',
    icon: 'bx-bolt-circle',
    getBadge: (profile) => {
      const count = (profile.skills?.technical?.length || 0) + (profile.skills?.soft?.length || 0);
      return count > 0 ? String(count) : null;
    },
    badgeCls: 'bg-lime/30 text-ink',
    description: 'Herramientas técnicas, competencias blandas e idiomas',
  },
  {
    id: 'trayectoria',
    label: 'Trayectoria',
    shortLabel: 'Trayectoria',
    icon: 'bx-briefcase-alt-2',
    getBadge: (profile) => {
      const count = profile.experience?.length || 0;
      return count > 0 ? String(count) : null;
    },
    badgeCls: 'bg-panel text-blue-muted',
    description: 'Experiencia laboral, pasantías y proyectos destacados',
  },
  {
    id: 'preferencias',
    label: 'Preferencias',
    shortLabel: 'Preferencias',
    icon: 'bx-target-lock',
    description: 'Aspiración salarial, modalidad de trabajo y ciudades de interés',
  },
  {
    id: 'privacidad',
    label: 'Privacidad',
    shortLabel: 'Privacidad',
    icon: 'bx-shield-quarter',
    dot: (profile) => profile.openToWork,
    description: 'Disponibilidad para trabajar, visibilidad y alertas de empleo',
  },
];

const TAB_TIPS = {
  'sobre-mi': {
    title: 'Consejo para tu extracto',
    icon: 'bx-bulb',
    text: 'Redacta un extracto de 3 a 5 líneas destacando tu enfoque técnico y tu vocación. Es lo primero que lee un reclutador.',
    statLabel: 'Impacto estimado',
    statValue: '+40% interés',
  },
  educacion: {
    title: 'Respaldo Institucional UTS',
    icon: 'bxs-graduation',
    text: 'Tu titulación cuenta con verificación de las Unidades Tecnológicas de Santander para agilizar procesos de selección en empresas aliadas.',
    statLabel: 'Acreditación',
    statValue: 'Verificada',
  },
  cv: {
    title: 'Optimización ATS',
    icon: 'bx-file-find',
    text: 'Los sistemas ATS leen mejor PDFs limpios sin tablas excesivas. Incluye términos clave coincidentes con las vacantes a las que aplicas.',
    statLabel: 'Compatibilidad',
    statValue: 'ATS Friendly',
  },
  habilidades: {
    title: 'Habilidades más buscadas',
    icon: 'bx-check-double',
    text: 'Las empresas en Santander valoran perfiles con al menos 4 herramientas técnicas específicas combinadas con comunicación y resolución.',
    statLabel: 'Recomendado',
    statValue: '5+ habilidades',
  },
  trayectoria: {
    title: 'Impacto cuantificable',
    icon: 'bx-trending-up',
    text: 'Si eres recién egresado, incluye tus prácticas empresariales UTS, proyectos de aula destacados o proyectos freelance.',
    statLabel: 'Valor curricular',
    statValue: 'Prácticas UTS',
  },
  preferencias: {
    title: 'Alineación salarial',
    icon: 'bx-coin-stack',
    text: 'Establecer un rango realista te permite recibir ofertas filtradas que cumplan tus expectativas y disponibilidad horaria.',
    statLabel: 'Recomendaciones',
    statValue: 'Algoritmo activo',
  },
  privacidad: {
    title: 'Búsqueda discreta',
    icon: 'bx-lock-alt',
    text: 'Si eliges "Solo reclutadores", tu empresa actual no verá tu disponibilidad activa. Tu privacidad está completamente protegida.',
    statLabel: 'Confidencialidad',
    statValue: '100% segura',
  },
};

const linkMeta = {
  linkedin: { icon: 'bxl-linkedin-square', label: 'LinkedIn', cls: 'text-[#0a66c2]' },
  github: { icon: 'bxl-github', label: 'GitHub', cls: 'text-ink' },
  portfolio: { icon: 'bx-globe', label: 'Portafolio', cls: 'text-green-dark' },
};

function normalizeTab(raw) {
  const clean = (raw || '').replace(/^[#?]/, '').toLowerCase();
  if (['sobre-mi', 'sobremi', 'about', 'perfil'].includes(clean)) return 'sobre-mi';
  if (['educacion', 'educación', 'formacion'].includes(clean)) return 'educacion';
  if (['cv', 'subir-cv', 'hoja-de-vida', 'hojadevida', 'curriculum'].includes(clean)) return 'cv';
  if (['habilidades', 'skills', 'idiomas'].includes(clean)) return 'habilidades';
  if (['trayectoria', 'experiencia', 'experience'].includes(clean)) return 'trayectoria';
  if (['preferencias', 'preferences', 'empleo'].includes(clean)) return 'preferencias';
  if (['privacidad', 'visibilidad', 'visibility', 'privacy'].includes(clean)) return 'privacidad';
  return 'sobre-mi';
}

function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4" role="status" aria-live="polite">
      <div
        key={toast.id}
        className={`profile-toast pointer-events-auto flex items-center gap-2.5 rounded-full px-5 py-3 text-sm font-semibold shadow-hero ${isError ? 'bg-rose-600 text-white' : 'bg-ink text-white'}`}
      >
        <i className={`bx ${isError ? 'bx-error-circle' : 'bxs-check-circle text-lime'} text-lg`} aria-hidden="true" />
        {toast.message}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { profile, updateProfile, resetProfile } = useProfile();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return normalizeTab(window.location.hash);
    }
    return 'sobre-mi';
  });
  const [editingBasics, setEditingBasics] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const { score, checks } = useMemo(() => computeProfileStrength(profile), [profile]);

  const notify = useCallback((message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Listen to hash changes (browser navigation or internal anchors)
  useEffect(() => {
    function handleHashChange() {
      if (window.location.hash) {
        setActiveTab(normalizeTab(window.location.hash));
      }
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    window.history.replaceState(null, '', `#${tabId}`);
    const navEl = document.getElementById('profile-tabs-nav');
    if (navEl) {
      const rect = navEl.getBoundingClientRect();
      if (rect.top < 0) {
        navEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  function handleStrengthAction(checkId) {
    const map = {
      photo: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        notify('Toca el ícono de cámara sobre tu foto para subirla.');
      },
      headline: () => {
        handleTabChange('sobre-mi');
        setEditingBasics(true);
      },
      about: () => {
        handleTabChange('sobre-mi');
        setEditingBasics(true);
      },
      links: () => {
        handleTabChange('sobre-mi');
        setEditingBasics(true);
      },
      cv: () => handleTabChange('cv'),
      skills: () => handleTabChange('habilidades'),
      languages: () => handleTabChange('habilidades'),
      experience: () => handleTabChange('trayectoria'),
      preferences: () => handleTabChange('preferencias'),
    };
    map[checkId]?.();
  }

  function saveBasics(draft) {
    updateProfile((p) => ({ ...p, ...draft }));
    setEditingBasics(false);
    notify('Datos básicos guardados.');
  }

  const activeLinks = Object.entries(profile.links ?? {}).filter(([, v]) => v?.trim());

  // Pagination navigation between sub-pages
  const currentTabIndex = TABS.findIndex((t) => t.id === activeTab);
  const currentTab = TABS[currentTabIndex] || TABS[0];
  const prevTab = currentTabIndex > 0 ? TABS[currentTabIndex - 1] : null;
  const nextTab = currentTabIndex < TABS.length - 1 ? TABS[currentTabIndex + 1] : null;
  const currentTip = TAB_TIPS[activeTab] || TAB_TIPS['sobre-mi'];

  return (
    <GraduatePortalLayout activePage="profile">
      <main className="w-full pb-16">
        {/* Profile Hero Header */}
        <ProfileHero
          profile={profile}
          updateProfile={updateProfile}
          onEdit={() => setEditingBasics(true)}
          onPreview={() => setPreviewOpen(true)}
          notify={notify}
          strength={score}
          onSelectTab={handleTabChange}
        />

        {/* Sub-pages Navigation Bar */}
        <nav
          id="profile-tabs-nav"
          className="sticky top-[4.75rem] z-20 mt-1 sm:mt-2 border-y border-line-soft bg-page/95 backdrop-blur-md shadow-2xs"
          aria-label="Páginas del perfil de egresado"
        >
          <div className="flex items-center gap-1.5 overflow-x-auto px-5 py-2.5 sm:px-8 lg:px-10 scrollbar-none">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              const badgeText = tab.badge || (tab.getBadge ? tab.getBadge(profile) : null);
              const showDot = tab.dot ? tab.dot(profile) : false;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-ink text-white shadow-sm ring-1 ring-white/10'
                      : 'text-blue-muted hover:bg-white hover:text-ink hover:shadow-2xs'
                  }`}
                >
                  <i
                    className={`bx ${tab.icon} text-base transition-colors ${
                      active ? 'text-lime' : 'text-secondary group-hover:text-green-dark'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{tab.label}</span>

                  {badgeText && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[0.62rem] font-bold leading-none ${
                        active ? 'bg-white/20 text-white' : tab.badgeCls || 'bg-panel text-secondary'
                      }`}
                    >
                      {badgeText}
                    </span>
                  )}

                  {showDot && (
                    <span
                      className="size-2 rounded-full bg-lime shadow-xs animate-pulse"
                      title="Disponible para trabajar activo"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Tab Header breadcrumb / title banner */}
        <div className="px-5 pt-5 sm:px-8 lg:px-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-line-soft bg-white/70 px-5 py-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-ink text-lime text-lg shadow-xs">
                <i className={`bx ${currentTab.icon}`} aria-hidden="true" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="m-0 font-display text-base sm:text-lg font-bold text-ink leading-tight">
                    {currentTab.label}
                  </h2>
                  <span className="rounded-full bg-panel px-2 py-0.5 text-[0.65rem] font-bold text-secondary">
                    Sección {currentTabIndex + 1} de {TABS.length}
                  </span>
                </div>
                <p className="m-0 text-xs text-body-muted">{currentTab.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className="text-[0.72rem] font-medium text-secondary hidden md:inline">
                Cambio rápido:
              </span>
              <div className="flex items-center gap-1">
                {prevTab && (
                  <button
                    type="button"
                    onClick={() => handleTabChange(prevTab.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-page px-2.5 py-1 text-xs font-semibold text-ink hover:bg-white hover:text-green-dark cursor-pointer"
                    title={`Ir a ${prevTab.label}`}
                  >
                    <i className="bx bx-chevron-left text-base" />
                    <span className="hidden sm:inline">{prevTab.shortLabel}</span>
                  </button>
                )}
                {nextTab && (
                  <button
                    type="button"
                    onClick={() => handleTabChange(nextTab.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-page px-2.5 py-1 text-xs font-semibold text-ink hover:bg-white hover:text-green-dark cursor-pointer"
                    title={`Ir a ${nextTab.label}`}
                  >
                    <span className="hidden sm:inline">{nextTab.shortLabel}</span>
                    <i className="bx bx-chevron-right text-base" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid: Active Page Content + Compact Sidebar */}
        <div className="grid items-start gap-6 px-5 pt-6 sm:px-8 lg:px-10 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
          {/* ─── Active Page Content ─── */}
          <div className="grid min-w-0 gap-6">
            {/* TAB 1: SOBRE MÍ */}
            {activeTab === 'sobre-mi' && (
              <div className="grid gap-6">
                <SectionCard
                  id="sobre-mi"
                  icon="bx-user-circle"
                  tone="green"
                  title="Sobre mí"
                  subtitle="Tu presentación y propuesta de valor en pocas líneas."
                  action={<GhostButton onClick={() => setEditingBasics(true)}>Editar datos</GhostButton>}
                >
                  <blockquote className="relative m-0 rounded-2xl border-l-4 border-lime bg-gradient-to-r from-lime/10 to-transparent py-4 pl-5 pr-4">
                    <i className="bx bxs-quote-alt-left absolute right-4 top-3 text-3xl text-lime/40" aria-hidden="true" />
                    <p className="m-0 text-sm leading-7 text-ink/85 sm:text-[0.95rem]">
                      {profile.about || 'Aún no escribes tu presentación. Cuéntale a las empresas quién eres y qué buscas.'}
                    </p>
                  </blockquote>

                  <dl className="m-0 mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      { icon: 'bx-envelope', label: 'Correo', value: profile.email },
                      { icon: 'bx-phone', label: 'Teléfono', value: profile.phone },
                      { icon: 'bx-book-open', label: 'Programa', value: profile.program },
                    ].map((d) => (
                      <div key={d.label} className="min-w-0 rounded-xl border border-line-soft bg-page px-3.5 py-3">
                        <dt className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-secondary">
                          <i className={`bx ${d.icon} text-sm`} aria-hidden="true" />
                          {d.label}
                        </dt>
                        <dd className="m-0 mt-1 truncate text-sm font-semibold text-ink" title={d.value}>
                          {d.value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {activeLinks.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeLinks.map(([key, value]) => (
                        <a
                          key={key}
                          href={`https://${value.replace(/^https?:\/\//, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink no-underline shadow-xs transition-all hover:-translate-y-px hover:shadow-sm"
                        >
                          <i className={`bx ${linkMeta[key]?.icon || 'bx-link'} text-lg ${linkMeta[key]?.cls || 'text-ink'}`} aria-hidden="true" />
                          {linkMeta[key]?.label || key}
                          <i className="bx bx-link-external text-xs text-secondary" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  )}
                </SectionCard>

                {/* Banner de inspiración: Conecta lo que sabes */}
                <div className="relative overflow-hidden rounded-[1.25rem] border border-line bg-ink text-white shadow-card group">
                  <img
                    src="/images/profile/banner-experience.png"
                    alt="Conecta lo que sabes con nuevas oportunidades"
                    className="absolute inset-0 size-full object-cover object-[center_35%] transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/75 to-transparent sm:to-ink/30" />
                  <div className="relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-5 p-6 sm:p-8">
                    <div className="max-w-xl">
                      <span className="mb-2.5 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white">
                        <span className="size-2 rounded-full bg-lime animate-pulse" aria-hidden="true" />
                        Perfil profesional UTS
                      </span>
                      <h3 className="font-display text-xl sm:text-2xl lg:text-[1.7rem] font-bold leading-snug text-white mt-1">
                        Conecta lo que sabes con nuevas oportunidades.
                      </h3>
                      <p className="mt-2 text-xs sm:text-sm text-white/75 leading-relaxed max-w-lg">
                        Tu formación en las UTS y tu experiencia práctica son tu mayor valor. Explora vacantes que coincidan con tu perfil e inscríbete con un solo clic.
                      </p>
                    </div>
                    <Link
                      to="/dashboard/vacantes"
                      className="inline-flex items-center justify-center size-12 sm:size-14 rounded-2xl border border-white/30 bg-white/15 backdrop-blur-md text-white hover:bg-lime hover:text-ink hover:border-lime transition-all duration-300 shadow-hero shrink-0 group-hover:translate-x-1 no-underline"
                      aria-label="Explorar vacantes compatibles"
                      title="Explorar vacantes"
                    >
                      <i className="bx bx-right-arrow-alt text-2xl sm:text-3xl" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EDUCACIÓN UTS */}
            {activeTab === 'educacion' && (
              <div className="grid gap-6">
                <EducationSection profile={profile} updateProfile={updateProfile} notify={notify} />

                {/* Card de Respaldo Institucional UTS */}
                <div className="rounded-[1.25rem] border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 via-white to-white p-5 sm:p-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink text-lime text-2xl shadow-xs">
                        <i className="bx bxs-institution" aria-hidden="true" />
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[0.65rem] font-bold text-emerald-800 uppercase tracking-wide">
                          <i className="bx bxs-badge-check text-green text-sm" />
                          Convenio Empresarial UTS
                        </span>
                        <h3 className="m-0 font-display text-base sm:text-lg font-bold text-ink mt-1">
                          Acreditación y Verificación Oficial
                        </h3>
                        <p className="m-0 mt-1 text-xs text-body-muted leading-relaxed max-w-xl">
                          Las empresas aliadas consultan directamente tu número de acta y competencias curriculares validadas por el sistema académico institucional.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <i className="bx bx-show text-base" />
                      Ver cómo lo ve el reclutador
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: HOJA DE VIDA (CV) */}
            {activeTab === 'cv' && (
              <div className="grid gap-6">
                <CvManager profile={profile} updateProfile={updateProfile} notify={notify} />
              </div>
            )}

            {/* TAB 4: HABILIDADES */}
            {activeTab === 'habilidades' && (
              <div className="grid gap-6">
                <SkillsEditor profile={profile} updateProfile={updateProfile} notify={notify} />
              </div>
            )}

            {/* TAB 5: TRAYECTORIA */}
            {activeTab === 'trayectoria' && (
              <div className="grid gap-6">
                <ExperienceSection profile={profile} updateProfile={updateProfile} notify={notify} />
              </div>
            )}

            {/* TAB 6: PREFERENCIAS */}
            {activeTab === 'preferencias' && (
              <div className="grid gap-6">
                <JobPreferences profile={profile} updateProfile={updateProfile} />
              </div>
            )}

            {/* TAB 7: PRIVACIDAD */}
            {activeTab === 'privacidad' && (
              <div className="grid gap-6">
                <VisibilityCard profile={profile} updateProfile={updateProfile} notify={notify} />
              </div>
            )}

            {/* ─── Sub-page Pagination Bar (Next/Previous Navigation) ─── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-line-soft bg-white p-4 shadow-2xs">
              <div>
                {prevTab ? (
                  <button
                    type="button"
                    onClick={() => handleTabChange(prevTab.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-line bg-page px-4 py-2.5 text-xs font-bold text-ink shadow-2xs transition-all hover:border-green hover:bg-white hover:text-green-dark cursor-pointer"
                  >
                    <i className="bx bx-left-arrow-alt text-base" aria-hidden="true" />
                    <span>Anterior: {prevTab.label}</span>
                  </button>
                ) : (
                  <span className="text-xs font-medium text-secondary">Inicio del perfil</span>
                )}
              </div>

              <div className="text-center">
                <span className="text-xs font-bold text-ink">
                  {currentTab.label}
                </span>
                <span className="text-[0.72rem] text-secondary ml-1.5 font-medium">
                  ({currentTabIndex + 1} de {TABS.length})
                </span>
              </div>

              <div>
                {nextTab ? (
                  <button
                    type="button"
                    onClick={() => handleTabChange(nextTab.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-ink-soft cursor-pointer"
                  >
                    <span>Siguiente: {nextTab.label}</span>
                    <i className="bx bx-right-arrow-alt text-base text-lime" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-green px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-green-dark cursor-pointer"
                  >
                    <i className="bx bx-show text-base" />
                    <span>Ver cómo me ven las empresas</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ─── Compact Sidebar (Persistent companion) ─── */}
          <aside className="grid min-w-0 gap-6" aria-label="Progreso y consejos del perfil">
            {/* Gamified Profile Strength Meter */}
            <ProfileStrength score={score} checks={checks} onAction={handleStrengthAction} />

            {/* Contextual guidance card for current active page */}
            <div className="rounded-[1.25rem] border border-line bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-green-dark">
                  <span className="grid size-6 place-items-center rounded-lg bg-green/10 text-green">
                    <i className={`bx ${currentTip.icon} text-base`} />
                  </span>
                  {currentTip.title}
                </div>
                <span className="rounded-full bg-panel px-2 py-0.5 text-[0.62rem] font-bold text-secondary">
                  {currentTip.statValue}
                </span>
              </div>
              <p className="m-0 mt-2.5 text-xs leading-relaxed text-body-muted">
                {currentTip.text}
              </p>
              <div className="mt-3.5 pt-3 border-t border-line-soft flex items-center justify-between text-[0.72rem]">
                <span className="text-secondary">Página actual</span>
                <span className="font-bold text-ink">{currentTab.label}</span>
              </div>
            </div>

            {/* Quick sub-page index list */}
            <div className="rounded-[1.25rem] border border-line bg-white p-4 shadow-card">
              <span className="block text-[0.68rem] font-bold uppercase tracking-wider text-secondary mb-2.5 px-1">
                Índice de páginas
              </span>
              <ul className="m-0 list-none p-0 grid gap-1">
                {TABS.map((t, idx) => {
                  const isCurrent = activeTab === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => handleTabChange(t.id)}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-ink text-white shadow-2xs font-bold'
                            : 'text-blue-muted hover:bg-page hover:text-ink'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <i
                            className={`bx ${t.icon} text-sm ${
                              isCurrent ? 'text-lime' : 'text-secondary'
                            }`}
                          />
                          <span>{t.label}</span>
                        </span>
                        <span className={`text-[0.65rem] ${isCurrent ? 'text-white/60' : 'text-secondary'}`}>
                          0{idx + 1}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Reset mock data */}
            <button
              type="button"
              onClick={() => {
                resetProfile();
                notify('Perfil restablecido a los datos de ejemplo.');
              }}
              className="justify-self-center text-xs font-semibold text-secondary underline-offset-4 hover:text-ink hover:underline cursor-pointer"
            >
              Restablecer datos de ejemplo
            </button>
          </aside>
        </div>
      </main>

      {/* Recruiter Preview Modal */}
      {previewOpen && (
        <RecruiterPreviewModal profile={profile} onClose={() => setPreviewOpen(false)} />
      )}

      {/* Edit Basic Data Modal */}
      {editingBasics && (
        <EditBasicsModal profile={profile} onSave={saveBasics} onClose={() => setEditingBasics(false)} />
      )}

      {/* Toast notifications */}
      <Toast toast={toast} />
    </GraduatePortalLayout>
  );
}
