import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService.js';

/**
 * Pasos del Tutorial Guiado clasificados por Rol
 */
const TOUR_STEPS_BY_ROLE = {
  graduate: [
    {
      id: 'welcome',
      tabLabel: '1. Bienvenida',
      badge: 'Inicio & Visión',
      icon: 'bx-rocket',
      iconColor: 'bg-lime text-ink',
      title: '¡Bienvenido(a) a Vincula!',
      subtitle: 'La red oficial de talento universitario y empleabilidad formal',
      description:
        'Vincula conecta a graduados y practicantes con empresas legalmente constituidas y universidades acreditadas. Cada postulación cuenta con respaldo institucional y validación digital directa.',
      highlights: [
        'Cero ofertas falsas: empresas verificadas ante Cámaras de Comercio y DIAN.',
        'Vacantes exclusivas que priorizan a egresados de tu institución.',
        'Trazabilidad transparente en cada etapa de selección.',
      ],
      route: '/dashboard',
      actionLabel: 'Ver Dashboard',
    },
    {
      id: 'profile',
      tabLabel: '2. Mi Perfil & CV',
      badge: 'Pestaña: Mi Perfil & CV',
      icon: 'bx-user-check',
      iconColor: 'bg-emerald-500 text-white',
      title: 'Mi Perfil & Hoja de Vida (CV)',
      subtitle: 'Tu carta de presentación ante las empresas aliadas',
      description:
        'En esta sección puedes cargar tu hoja de vida en PDF, registrar tus competencias técnicas, indicar tu aspiración salarial y solicitar la verificación digital de tu diploma a tu universidad.',
      highlights: [
        'Carga tu CV en formato PDF para que los reclutadores lo analicen con IA.',
        'Sello de Egresado Verificado: tu universidad certifica tu título oficial.',
        'Los perfiles completos reciben hasta 3 veces más llamadas de selección.',
      ],
      route: '/dashboard/perfil',
      actionLabel: 'Ir a Mi Perfil',
    },
    {
      id: 'vacancies',
      tabLabel: '3. Vacantes',
      badge: 'Pestaña: Explorar Vacantes',
      icon: 'bx-briefcase-alt-2',
      iconColor: 'bg-blue-600 text-white',
      title: 'Explorar Vacantes con Convenio',
      subtitle: 'Oportunidades laborales que valoran tu formación académica',
      description:
        'Busca vacantes con salarios transparentes, contratos de ley y filtros específicos por carrera, modalidad (remoto, híbrido o presencial) y ciudad de residencia.',
      highlights: [
        'Filtros por carrera y afinidad con tu perfil profesional.',
        'Identificador de vacantes con convenio directo con tu institución.',
        'Guarda vacantes con la estrella para postularte cuando tengas tiempo.',
      ],
      route: '/dashboard/vacantes',
      actionLabel: 'Explorar Vacantes',
    },
    {
      id: 'applications',
      tabLabel: '4. Postulaciones',
      badge: 'Pestaña: Mis Postulaciones',
      icon: 'bx-list-check',
      iconColor: 'bg-amber-500 text-white',
      title: 'Mis Postulaciones & Trazabilidad ATS',
      subtitle: 'Seguimiento en tiempo real de tus 6 fases de selección',
      description:
        'Olvídate de no saber qué pasó con tu candidatura. Aquí monitoreas exactamente en qué fase se encuentra tu proceso de selección.',
      highlights: [
        'Fases claras: Recibida → En Revisión → Preseleccionado → Entrevista → Pruebas → Vinculado.',
        'Historial de estados y notificaciones automáticas en tu correo.',
        'Gestión de entrevistas y retroalimentación de los reclutadores.',
      ],
      route: '/dashboard/postulaciones',
      actionLabel: 'Ver Mis Postulaciones',
    },
    {
      id: 'safety',
      tabLabel: '5. Seguridad',
      badge: 'Garantía & Privacidad',
      icon: 'bx-shield-quarter',
      iconColor: 'bg-purple-600 text-white',
      title: 'Privacidad y Respaldo Institucional',
      subtitle: 'Control total sobre tus datos personales y disponibilidad',
      description:
        'Tú decides si tu perfil está activo para búsqueda inmediata o confidencial. Puedes reactivar este tutorial guiado cuando desees desde tu menú de usuario en la esquina superior.',
      highlights: [
        'Control de visibilidad: decide si los reclutadores pueden ver tu contacto.',
        'Alertas de nuevas vacantes acordes a tu carrera e intereses.',
        'Botón de ayuda y tutorial siempre disponible en tu menú.',
      ],
      route: '/dashboard',
      actionLabel: '¡Comenzar ahora!',
    },
  ],

  institution: [
    {
      id: 'obs',
      tabLabel: '1. Observatorio',
      badge: 'Pestaña: Observatorio IES',
      icon: 'bxs-institution',
      iconColor: 'bg-emerald-600 text-white',
      title: 'Observatorio de Empleabilidad IES',
      subtitle: 'Métricas de inserción laboral en tiempo real para tu institución',
      description:
        'Monitorea la tasa de vinculación de tus graduados, estudiantes activos en búsqueda y la efectividad de las alianzas empresariales.',
      highlights: [
        'Tasa de empleabilidad formal por facultades y programas académicos.',
        'Trazabilidad de egresados vinculados y vacantes disponibles.',
        'Reportes exportables para acreditación de alta calidad (CNA/MEN).',
      ],
      route: '/institucion/dashboard',
      actionLabel: 'Ir al Observatorio',
    },
    {
      id: 'grad-validation',
      tabLabel: '2. Validación',
      badge: 'Pestaña: Validación de Títulos',
      icon: 'bx-check-shield',
      iconColor: 'bg-lime text-ink',
      title: 'Validación Oficial de Diplomas',
      subtitle: 'Certifica los títulos y actas de grado de tus graduados',
      description:
        'Revisa y aprueba las solicitudes de verificación de diploma cargadas por tus egresados para estampar el sello digital de título auténtico.',
      highlights: [
        'Inspección de actas de grado y diplomas en PDF.',
        'Aprobación con 1 clic para otorgar el sello oficial de Egresado Verificado.',
        'Blindaje de la reputación institucional ante las empresas.',
      ],
      route: '/institucion/estudiantes/solicitudes',
      actionLabel: 'Ver Solicitudes',
    },
    {
      id: 'agreements',
      tabLabel: '3. Convenios',
      badge: 'Pestaña: Convenios Empresariales',
      icon: 'bx-link-alt',
      iconColor: 'bg-blue-600 text-white',
      title: 'Convenios con Empresas Aliadas',
      subtitle: 'Gestión de acuerdos de práctica y empleo preferencial',
      description:
        'Administra convenios marco y específicos con organizaciones públicas y privadas para abrir plazas de empleo exclusivas a tu comunidad estudiantil.',
      highlights: [
        'Seguimiento a vigencia y cupos de convenios activos.',
        'Auditoría documental de las empresas solicitantes.',
        'Historial de egresados vinculados por cada empresa aliada.',
      ],
      route: '/institucion/empresas/convenios',
      actionLabel: 'Gestionar Convenios',
    },
    {
      id: 'market',
      tabLabel: '4. Brecha Laboral',
      badge: 'Pestaña: Demanda y Cualificaciones',
      icon: 'bx-line-chart',
      iconColor: 'bg-amber-500 text-white',
      title: 'Pertinencia Curricular y Demanda',
      subtitle: 'Alineación de planes de estudio con las necesidades de la industria',
      description:
        'Compara las competencias de tus programas académicos con las demandas reales del mercado laboral regional y nacional en tiempo real.',
      highlights: [
        'Identificación de competencias más demandadas por sector.',
        'Detección temprana de brechas técnicas y de habilidades blandas.',
        'Insumos clave para la actualización de pensums y microcurrículos.',
      ],
      route: '/institucion/competencias',
      actionLabel: 'Ver Demanda Laboral',
    },
  ],

  company: [
    {
      id: 'ats',
      tabLabel: '1. Embudo ATS',
      badge: 'Pestaña: Candidatos & Embudo',
      icon: 'bx-user-check',
      iconColor: 'bg-ochre text-cocoa',
      title: 'Sistema ATS Kanban de 6 Fases',
      subtitle: 'Gestión eficiente y ágil de postulantes a tus convocatorias',
      description:
        'Califica y mueve candidatos entre las fases del proceso: Recibido, En Revisión, Preseleccionado, Entrevista, Pruebas y Contratado.',
      highlights: [
        'Tablero Kanban interactivo con filtrado por vacante y sede.',
        'Visualización de CVs y diplomas validados por universidades.',
        'Agendamiento de entrevistas con retroalimentación inmediata.',
      ],
      route: '/empresa/reclutador/candidatos',
      actionLabel: 'Ir al Embudo ATS',
    },
    {
      id: 'vacancies',
      tabLabel: '2. Vacantes',
      badge: 'Pestaña: Gestión de Vacantes',
      icon: 'bx-briefcase',
      iconColor: 'bg-cocoa text-white',
      title: 'Publicación de Vacantes Oficiales',
      subtitle: 'Convocatorias formales y transparentes con alcance universitario',
      description:
        'Crea y administra ofertas de empleo con bandas salariales claras, requisitos de carrera y vinculación a convenios universitarios.',
      highlights: [
        'Publicación rápida con plantillas por áreas y sedes.',
        'Segmentación exclusiva para universidades con convenio.',
        'Control del periodo de vigencia y cupos disponibles.',
      ],
      route: '/empresa/admin/vacantes',
      actionLabel: 'Ver Mis Vacantes',
    },
    {
      id: 'talent',
      tabLabel: '3. Talento IES',
      badge: 'Pestaña: Banco de Talento',
      icon: 'bx-search',
      iconColor: 'bg-terracotta text-white',
      title: 'Búsqueda de Talento Universitario',
      subtitle: 'Acceso directo a egresados con título verificado',
      description:
        'Filtra egresados certificados por carrera, universidad de egreso, nivel educativo, ciudad y disponibilidad laboral inmediata.',
      highlights: [
        'Perfiles con títulos verificados por las universidades.',
        'Filtros por promedio académico, carrera y habilidades clave.',
        'Invitación directa a postularse a tus convocatorias activas.',
      ],
      route: '/empresa/reclutador/talento',
      actionLabel: 'Explorar Talento',
    },
  ],
};

export default function OnboardingTour() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Determinar rol del usuario
  const currentUser = authService.getCurrentUser();
  const userRole = currentUser?.rol || 'egresado';

  const tourType = useMemo(() => {
    if (userRole.includes('ies') || userRole.includes('institucion')) return 'institution';
    if (userRole.includes('empresa') || userRole.includes('reclutador') || userRole.includes('company')) return 'company';
    return 'graduate';
  }, [userRole]);

  const steps = useMemo(() => TOUR_STEPS_BY_ROLE[tourType] || TOUR_STEPS_BY_ROLE.graduate, [tourType]);
  const activeStep = steps[currentStep] || steps[0];

  // Identificador de almacenamiento por usuario
  const storageKey = useMemo(() => {
    const id = currentUser?.user_id || currentUser?.id || currentUser?.correo || 'guest';
    return `vincula.tour.seen.v2.${id}`;
  }, [currentUser]);

  // Apertura automática si el usuario nunca lo ha completado
  useEffect(() => {
    try {
      const seen = localStorage.getItem(storageKey);
      if (!seen) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // noop
    }
  }, [storageKey]);

  // Escuchar evento global para reabrir el tutorial desde cualquier menú
  useEffect(() => {
    function handleOpenEvent() {
      setCurrentStep(0);
      setIsOpen(true);
    }
    window.addEventListener('vincula:open-onboarding-tour', handleOpenEvent);
    return () => window.removeEventListener('vincula:open-onboarding-tour', handleOpenEvent);
  }, []);

  // Navegación con teclado
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, steps.length]);

  function markAsSeen() {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // noop
    }
  }

  function handleClose() {
    markAsSeen();
    setIsOpen(false);
  }

  function handleNext() {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  }

  function handlePrev() {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  function handleGoToTab(route) {
    handleClose();
    if (route) {
      navigate(route);
    }
  }

  return (
    <>
      {/* Botón Flotante Permanente para Reabrir el Tutorial en Cualquier Momento */}
      <button
        type="button"
        onClick={() => {
          setCurrentStep(0);
          setIsOpen(true);
        }}
        title="Ver tutorial guiado de la plataforma"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-line bg-white/95 px-3.5 py-2 text-xs font-bold text-ink shadow-lg backdrop-blur transition-all hover:bg-page hover:border-green/50 hover:shadow-xl hover:scale-105 cursor-pointer"
        aria-label="Abrir tutorial guiado"
      >
        <span className="grid size-6 place-items-center rounded-full bg-lime text-ink text-sm font-bold shadow-2xs">
          <i className="bx bx-help-circle" />
        </span>
        <span className="hidden sm:inline">Guía de uso</span>
      </button>

      {/* Modal / Overlay del Tour Guiado */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-ink/75 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-modal-title"
        >
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-line bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Barra de progreso superior continua */}
            <div className="h-1.5 w-full bg-line-soft">
              <div
                className="h-full bg-green transition-all duration-300 ease-out"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>

            {/* Cabecera del Tour */}
            <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-page/50">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-[0.68rem] font-bold text-lime">
                  <i className="bx bx-compass text-xs" />
                  Guía de la Plataforma
                </span>
                <span className="text-xs font-semibold text-secondary">
                  Paso {currentStep + 1} de {steps.length}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="grid size-8 place-items-center rounded-xl text-secondary hover:bg-line/60 hover:text-ink transition-colors cursor-pointer"
                aria-label="Cerrar tutorial"
                title="Cerrar y omitir"
              >
                <i className="bx bx-x text-2xl" />
              </button>
            </div>

            {/* Cuerpo del Paso Activo */}
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {/* Icono del Paso */}
                <div
                  className={`grid size-14 shrink-0 place-items-center rounded-2xl text-2xl shadow-md ${
                    activeStep.iconColor || 'bg-ink text-lime'
                  }`}
                >
                  <i className={`bx ${activeStep.icon}`} />
                </div>

                {/* Contenido Textual */}
                <div className="min-w-0 flex-1">
                  <span className="inline-block rounded-md border border-line bg-page px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider text-green-dark">
                    {activeStep.badge}
                  </span>
                  <h2
                    id="tour-modal-title"
                    className="mt-1 font-display text-xl sm:text-2xl font-bold tracking-tight text-ink leading-snug"
                  >
                    {activeStep.title}
                  </h2>
                  <p className="mt-0.5 text-xs sm:text-sm font-semibold text-secondary">
                    {activeStep.subtitle}
                  </p>
                  <p className="mt-3 text-xs sm:text-sm leading-relaxed text-body-muted">
                    {activeStep.description}
                  </p>

                  {/* Puntos destacados / Funcionalidades clave */}
                  <div className="mt-4 rounded-2xl border border-line bg-page/70 p-3.5 space-y-2">
                    <p className="m-0 text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                      Qué puedes hacer aquí:
                    </p>
                    <ul className="m-0 list-none space-y-1.5 p-0 text-xs text-ink font-medium">
                      {activeStep.highlights.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <i className="bx bxs-check-circle text-green text-sm shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Selector de Pestañas / Pasos inferiores (Clickable) */}
            <div className="px-6 py-3 border-t border-line bg-sand/20 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {steps.map((st, idx) => {
                  const isActive = idx === currentStep;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setCurrentStep(idx)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-ink text-white shadow-xs'
                          : 'bg-white border border-line text-secondary hover:text-ink hover:bg-page'
                      }`}
                      title={st.title}
                    >
                      <span className={`size-1.5 rounded-full ${isActive ? 'bg-lime' : 'bg-secondary/40'}`} />
                      <span>{st.tabLabel}</span>
                    </button>
                  );
                })}
              </div>

              {/* Botón para navegar directamente a la pestaña explicada */}
              {activeStep.route && (
                <button
                  type="button"
                  onClick={() => handleGoToTab(activeStep.route)}
                  className="text-xs font-semibold text-green-dark hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{activeStep.actionLabel}</span>
                  <i className="bx bx-right-arrow-alt text-sm" />
                </button>
              )}
            </div>

            {/* Botones de Navegación del Modal */}
            <div className="flex items-center justify-between border-t border-line bg-page/70 px-6 py-4">
              <button
                type="button"
                onClick={handleClose}
                className="text-xs font-bold text-secondary hover:text-ink transition-colors cursor-pointer"
              >
                Omitir tutorial
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-xs transition-colors hover:bg-panel disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <i className="bx bx-left-arrow-alt text-base" />
                  <span>Anterior</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ink hover:bg-ink-soft px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <span>
                    {currentStep === steps.length - 1 ? '¡Entendido, comenzar!' : 'Siguiente'}
                  </span>
                  <i
                    className={`bx ${
                      currentStep === steps.length - 1 ? 'bx-check text-lime' : 'bx-right-arrow-alt text-lime'
                    } text-base`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

