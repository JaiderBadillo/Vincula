import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService.js';

/**
 * Pasos del Tutorial Guiado con Spotlight y Navegación Suave entre Páginas
 * Separados estrictamente por perfil para garantizar acceso a sus rutas.
 */
const TOUR_STEPS_BY_ROLE = {
  institution_admin: [
    {
      id: 'ies-kpis',
      route: '/institucion/dashboard',
      targetSelector: '[data-tour="ies-kpis"]',
      badge: 'Paso 1 de 5 · Observatorio IES',
      title: 'Monitoreo de Indicadores Institucionales',
      description:
        '¡Mira este panel! Como administrador institucional, aquí supervisas la tasa de empleabilidad formal de tus graduados, los convenios activos y las vacantes disponibles en tiempo real.',
      actionHint: 'Filtra por semestres para auditar el histórico de vinculación.',
    },
    {
      id: 'ies-validar-sello',
      route: '/institucion/estudiantes/solicitudes',
      targetSelector: '[data-tour="ies-validar-sello"]',
      badge: 'Paso 2 de 5 · Validación de Títulos',
      title: 'Validar y Expedir el Sello Digital',
      description:
        '¡Mira este botón de acción! Permite auditar el acta de grado en PDF de cada egresado y estampar el Sello Digital Oficial de tu universidad con 1 solo clic.',
      actionHint: 'Los títulos validados garantizan a las empresas cero fraudes.',
    },
    {
      id: 'vincular-asesor',
      route: '/institucion/admin/asesores',
      targetSelector: '[data-tour="vincular-asesor"]',
      badge: 'Paso 3 de 5 · Asesores y Sedes',
      title: '¡Mira este botón: Vincular Nuevo Asesor!',
      description:
        'Desde este botón puedes dar de alta a nuevos coordinadores o asesores de empleabilidad. Les asignas sus sedes de atención y el sistema les crea automáticamente su cuenta oficial (no necesitan registrarse previamente).',
      actionHint: 'Podrán iniciar sesión con Google Workspace o con su contraseña provisional.',
    },
    {
      id: 'nueva-carrera',
      route: '/institucion/admin/programas',
      targetSelector: '[data-tour="nueva-carrera"]',
      badge: 'Paso 4 de 5 · Oferta Académica',
      title: 'Registrar y Asignar Carreras',
      description:
        '¡Mira este botón! Aquí registras los programas académicos oficiales y vinculas a los asesores institucionales responsables de atender a los egresados de cada facultad.',
      actionHint: 'Organiza la cobertura por facultades y programas.',
    },
    {
      id: 'ies-trazabilidad-grafica',
      route: '/institucion/admin/trazabilidad',
      targetSelector: '[data-tour="ies-trazabilidad-grafica"]',
      badge: 'Paso 5 de 5 · Pertinencia Curricular',
      title: 'Auditoría y Brecha de Empleabilidad',
      description:
        'Esta sección compara los planes de estudio con las habilidades técnicas que más contratan las empresas en el mercado, ayudándote a cerrar la brecha laboral y actualizar los microcurrículos.',
      actionHint: 'Insumo clave para procesos de acreditación de alta calidad ante el MEN.',
    },
  ],

  institution_advisor: [
    {
      id: 'ies-asesor-kpis',
      route: '/institucion/dashboard',
      targetSelector: '[data-tour="ies-kpis"]',
      badge: 'Paso 1 de 4 · Observatorio IES',
      title: 'Observatorio de Inserción Laboral',
      description:
        '¡Mira este panel! Como asesor, aquí monitoreas el avance de inserción laboral de los graduados de tu institución y las vacantes formales en curso.',
      actionHint: 'Supervisa los cortes semestrales en tiempo real.',
    },
    {
      id: 'ies-asesor-atender',
      route: '/institucion/dashboard',
      targetSelector: '[data-tour="ies-atender-solicitudes"]',
      badge: 'Paso 2 de 4 · Cola de Solicitudes',
      title: 'Acceso Rápido a la Cola de Validación',
      description:
        '¡Mira este botón! Te lleva de inmediato a la bandeja de graduados que están esperando la certificación oficial de su diploma.',
      actionHint: 'Haz clic para ir directamente a revisar títulos.',
    },
    {
      id: 'ies-asesor-validar',
      route: '/institucion/estudiantes/solicitudes',
      targetSelector: '[data-tour="ies-validar-sello"]',
      badge: 'Paso 3 de 4 · Validación & Sello',
      title: 'Validar y Expedir el Sello Digital',
      description:
        '¡Mira este botón de acción! Abre el expediente académico del egresado, verifica su acta de grado y expide el Sello Digital Oficial de la institución con 1 clic.',
      actionHint: 'Títulos certificados con respaldo institucional 100%.',
    },
    {
      id: 'ies-asesor-competencias',
      route: '/institucion/mercado-laboral/competencias',
      targetSelector: '[data-tour="ies-mercado-laboral"]',
      badge: 'Paso 4 de 4 · Mercado Laboral',
      title: 'Alineación Curricular y Demandas',
      description:
        'Aquí monitoreas las competencias técnicas más demandadas por el sector productivo para orientar mejor a tus estudiantes y graduados en sus postulaciones.',
      actionHint: 'Revisa qué tecnologías y habilidades blandas buscan los reclutadores.',
    },
  ],

  graduate: [
    {
      id: 'grad-perfil-kpi',
      route: '/dashboard',
      targetSelector: '[data-tour="grad-perfil-kpi"]',
      badge: 'Paso 1 de 5 · Inicio & Estado',
      title: 'Nivel de Completitud de tu Perfil',
      description:
        '¡Mira este indicador! Muestra qué tan completo está tu perfil profesional. Entre más alto sea tu porcentaje, más empresas aliadas te contactarán para ofertas de empleo.',
      actionHint: 'Un perfil al 100% triplica tus oportunidades de selección.',
    },
    {
      id: 'grad-subir-cv',
      route: '/dashboard',
      targetSelector: '[data-tour="grad-subir-cv"]',
      badge: 'Paso 2 de 5 · Tu Hoja de Vida',
      title: 'Carga de tu CV en Formato PDF',
      description:
        '¡Mira esta sección! Sube aquí tu hoja de vida en PDF. La inteligencia artificial de Vincula extraerá automáticamente tus habilidades y las conectará con vacantes que encajan con tu perfil.',
      actionHint: 'Mantén tu CV actualizado para recibir alertas inteligentes.',
    },
    {
      id: 'grad-perfil-tabs',
      route: '/dashboard/perfil',
      targetSelector: '[data-tour="grad-perfil-tabs"]',
      badge: 'Paso 3 de 5 · Mi Perfil Profesional',
      title: 'Formación y Solicitud de Verificación',
      description:
        'En esta barra de pestañas puedes registrar tu formación académica, competencias técnicas, aspiración salarial y solicitar a tu universidad el sello oficial de Egresado Verificado.',
      actionHint: 'El sello oficial valida digitalmente la autenticidad de tu título.',
    },
    {
      id: 'grad-vacantes-search',
      route: '/dashboard/vacantes',
      targetSelector: '[data-tour="grad-vacantes-search"]',
      badge: 'Paso 4 de 5 · Explorar Vacantes',
      title: 'Buscador de Vacantes con Convenio',
      description:
        '¡Mira este buscador! Filtra oportunidades laborales formales por palabra clave, tu carrera, modalidad de trabajo (remoto, híbrido o presencial) y ofertas exclusivas para tu universidad.',
      actionHint: 'Todas las empresas registradas están legalmente auditadas.',
    },
    {
      id: 'grad-postulaciones-pipeline',
      route: '/dashboard/postulaciones',
      targetSelector: '[data-tour="grad-postulaciones-pipeline"]',
      badge: 'Paso 5 de 5 · Trazabilidad ATS',
      title: 'Monitoreo de tus 6 Fases de Selección',
      description:
        '¡Olvídate de la incertidumbre! Aquí ves en tiempo real en qué fase se encuentra tu candidatura: si fue leída, si estás preseleccionado o cuándo es tu próxima entrevista en vivo.',
      actionHint: 'Recibirás notificaciones inmediatas con cada avance.',
    },
  ],

  company: [
    {
      id: 'company-kanban',
      route: '/empresa/reclutador/candidatos',
      targetSelector: '[data-tour="company-kanban"]',
      badge: 'Paso 1 de 3 · Embudo ATS',
      title: 'Tablero Kanban ATS de Candidatos',
      description:
        '¡Mira este tablero Kanban! Mueve a tus postulantes entre las 6 fases de selección (Recibido, En Revisión, Preseleccionado, Entrevista, Pruebas y Contratado) con retroalimentación ágil.',
      actionHint: 'Arrastra candidatos o cambia su fase directamente.',
    },
    {
      id: 'company-publicar-vacante',
      route: '/empresa/admin/vacantes',
      targetSelector: '[data-tour="company-publicar-vacante"]',
      badge: 'Paso 2 de 3 · Ofertas Laborales',
      title: '¡Mira este botón: Nueva Vacante!',
      description:
        'Desde este botón puedes publicar convocatorias formales con bandas salariales transparentes, requisitos de carrera y alcance prioritario para egresados de universidades con convenio.',
      actionHint: 'Puedes activar o pausar vacantes en cualquier momento.',
    },
    {
      id: 'company-buscar-talento',
      route: '/empresa/reclutador/talento',
      targetSelector: '[data-tour="company-buscar-talento"]',
      badge: 'Paso 3 de 3 · Banco de Talento',
      title: 'Filtros de Búsqueda y Sourcing',
      description:
        'Filtra egresados certificados por institución aliada, programa académico, promedio de notas y disponibilidad inmediata. Puedes invitarlos a tus vacantes con un solo clic.',
      actionHint: 'Accede a talento con título verificado ante las universidades.',
    },
  ],
};

export default function OnboardingTour({ showLauncher = true, autoStart = true }) {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();

  // El tour interactivo solo existe y se ejecuta dentro de portales protegidos y autenticados
  const isPortalRoute =
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/institucion') ||
    location.pathname.startsWith('/empresa') ||
    location.pathname.startsWith('/admin');

  // En la landing page (/), login, registro o sin autenticación, no se monta nada
  if (!isAuthenticated || !currentUser || !isPortalRoute) {
    return null;
  }

  const userIdentifier = currentUser?.user_id || currentUser?.id || currentUser?.correo || 'guest';

  return (
    <OnboardingTourContent
      key={userIdentifier}
      showLauncher={showLauncher}
      autoStart={autoStart}
      currentUser={currentUser}
    />
  );
}

function OnboardingTourContent({ showLauncher = true, autoStart = true, currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();

  const userRole = (currentUser?.rol || '').toLowerCase();

  // Determinar rol específico para el tour
  const tourType = useMemo(() => {
    if (userRole === 'admin_ies' || userRole === 'ies_admin') return 'institution_admin';
    if (userRole === 'asesor_ies' || userRole === 'ies_asesor') return 'institution_advisor';
    if (userRole.includes('asesor') || userRole.includes('advisor')) return 'institution_advisor';
    if (userRole.includes('ies') || userRole.includes('institucion')) return 'institution_admin';
    if (userRole.includes('empresa') || userRole.includes('reclutador') || userRole.includes('company')) return 'company';
    return 'graduate';
  }, [userRole]);

  const steps = useMemo(() => TOUR_STEPS_BY_ROLE[tourType] || TOUR_STEPS_BY_ROLE.graduate, [tourType]);

  // Almacenamiento local persistente por usuario (evita perder el paso en recargas o transiciones)
  const userIdentifier = useMemo(() => {
    return currentUser?.user_id || currentUser?.id || currentUser?.correo || 'guest';
  }, [currentUser]);

  const storageKey = `vincula.spotlight_tour.v2.${userIdentifier}`;
  const sessionStepKey = `vincula.spotlight_step.v2.${userIdentifier}`;

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const saved = sessionStorage.getItem(sessionStepKey);
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [targetRect, setTargetRect] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const activeStep = steps[currentStep] || steps[0];

  // Sincronizar el paso activo en sessionStorage para sobrevivir a transiciones de ruta
  useEffect(() => {
    if (isOpen) {
      try {
        sessionStorage.setItem(sessionStepKey, String(currentStep));
      } catch {
        // noop
      }
    }
  }, [isOpen, currentStep, sessionStepKey]);

  // Actualizar coordenadas del elemento seleccionado
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !activeStep?.targetSelector) return;
    const el = document.querySelector(activeStep.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        bottom: Math.round(rect.bottom),
        right: Math.round(rect.right),
      });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, activeStep]);

  // Intentar encontrar el elemento en el DOM con reintentos suaves
  const locateElement = useCallback(() => {
    if (!isOpen || !activeStep) return;

    let attempts = 0;
    const maxAttempts = 35; // ~2.8 segundos de espera máxima

    const interval = setInterval(() => {
      attempts++;
      const el = document.querySelector(activeStep.targetSelector);
      if (el) {
        clearInterval(interval);
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        } catch {
          // fallback
        }
        // Permitir que la animación de scroll termine suavemente antes de encender el foco
        setTimeout(() => {
          updateTargetRect();
          setIsNavigating(false);
        }, 220);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        setIsNavigating(false);
        setTargetRect(null); // Fallback centrado
      }
    }, 80);

    return () => clearInterval(interval);
  }, [isOpen, activeStep, updateTargetRect]);

  // Apertura automática en primer ingreso (solo si está logueado en páginas principales de portal)
  useEffect(() => {
    if (!autoStart || !currentUser) return;
    try {
      const seen = localStorage.getItem(storageKey);
      if (!seen) {
        const initialPortalRoutes = [
          '/dashboard',
          '/institucion/dashboard',
          '/empresa/reclutador/candidatos',
          '/empresa/admin/perfil',
          '/admin/dashboard',
        ];
        if (initialPortalRoutes.includes(location.pathname)) {
          const timer = setTimeout(() => {
            setIsOpen(true);
          }, 900);
          return () => clearTimeout(timer);
        }
      }
    } catch {
      // noop
    }
  }, [storageKey, autoStart, currentUser, location.pathname]);

  // Escuchar evento global para reabrir el tour desde cualquier menú
  useEffect(() => {
    function handleOpenEvent() {
      setCurrentStep(0);
      try {
        sessionStorage.setItem(sessionStepKey, '0');
      } catch {
        // noop
      }
      setIsOpen(true);
    }
    window.addEventListener('vincula:open-onboarding-tour', handleOpenEvent);
    return () => window.removeEventListener('vincula:open-onboarding-tour', handleOpenEvent);
  }, [sessionStepKey]);

  // Transición suave entre páginas
  useEffect(() => {
    if (!isOpen) return;

    if (activeStep?.route && location.pathname !== activeStep.route) {
      setIsNavigating(true);
      setTargetRect(null); // Oculta el reflector para que no brinque de forma brusca
      navigate(activeStep.route);
    } else {
      return locateElement();
    }
  }, [isOpen, currentStep, activeStep, location.pathname, navigate, locateElement]);

  // Reposicionar spotlight ante scroll o resize
  useEffect(() => {
    if (!isOpen || isNavigating) return;

    function handleScrollOrResize() {
      updateTargetRect();
    }

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, isNavigating, updateTargetRect]);

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
      sessionStorage.removeItem(sessionStepKey);
    } catch {
      // noop
    }
  }

  function handleClose() {
    markAsSeen();
    setIsOpen(false);
    setTargetRect(null);
    setIsNavigating(false);
  }

  function handleNext() {
    if (currentStep < steps.length - 1) {
      const nextIdx = currentStep + 1;
      setCurrentStep(nextIdx);
      try {
        sessionStorage.setItem(sessionStepKey, String(nextIdx));
      } catch {
        // noop
      }
    } else {
      handleClose();
    }
  }

  function handlePrev() {
    if (currentStep > 0) {
      const prevIdx = currentStep - 1;
      setCurrentStep(prevIdx);
      try {
        sessionStorage.setItem(sessionStepKey, String(prevIdx));
      } catch {
        // noop
      }
    }
  }

  // Cálculo de posición del Popover flotante
  const popoverStyle = (() => {
    if (!targetRect || typeof window === 'undefined') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10001,
      };
    }

    const POPOVER_WIDTH = 420;
    const POPOVER_EST_HEIGHT = 270;
    const MARGIN = 16;
    const GAP = 14;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const spaceBelow = viewportH - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const placeBelow = spaceBelow >= POPOVER_EST_HEIGHT || spaceBelow >= spaceAbove;

    let top = placeBelow ? targetRect.bottom + GAP : targetRect.top - POPOVER_EST_HEIGHT - GAP;
    if (top < MARGIN) top = MARGIN;
    if (top + POPOVER_EST_HEIGHT > viewportH - MARGIN) {
      top = viewportH - POPOVER_EST_HEIGHT - MARGIN;
    }

    const targetCenterX = targetRect.left + targetRect.width / 2;
    let left = targetCenterX - POPOVER_WIDTH / 2;
    if (left < MARGIN) left = MARGIN;
    if (left + POPOVER_WIDTH > viewportW - MARGIN) {
      left = viewportW - POPOVER_WIDTH - MARGIN;
    }

    return {
      position: 'fixed',
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `min(${POPOVER_WIDTH}px, calc(100vw - 32px))`,
      zIndex: 10001,
    };
  })();

  return (
    <>
      {/* Botón Flotante Permanente para Reabrir el Tutorial Guiado */}
      {showLauncher && (
        <button
          type="button"
          onClick={() => {
            setCurrentStep(0);
            try {
              sessionStorage.setItem(sessionStepKey, '0');
            } catch {
              // noop
            }
            setIsOpen(true);
          }}
          title="Ver tutorial guiado interactivo de la plataforma"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-line bg-white/95 px-3.5 py-2 text-xs font-bold text-ink shadow-lg backdrop-blur transition-all hover:bg-page hover:border-green/50 hover:shadow-xl hover:scale-105 cursor-pointer"
          aria-label="Abrir tutorial guiado"
        >
          <span className="grid size-6 place-items-center rounded-full bg-lime text-ink text-sm font-bold shadow-2xs">
            <i className="bx bx-help-circle" />
          </span>
          <span className="hidden sm:inline">Guía interactiva</span>
        </button>
      )}

      {/* ─── OVERLAY SPOTLIGHT INTERACTIVO ─── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[10000] pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="spotlight-tour-title"
        >
          {/* Spotlight Cutout sobre el elemento exacto */}
          {targetRect && !isNavigating ? (
            <div
              className="fixed pointer-events-none transition-all duration-300 ease-out"
              style={{
                top: `${Math.max(0, targetRect.top - 6)}px`,
                left: `${Math.max(0, targetRect.left - 6)}px`,
                width: `${targetRect.width + 12}px`,
                height: `${targetRect.height + 12}px`,
                borderRadius: '16px',
                boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.78)',
                border: '2px solid #a3e635',
              }}
            >
              <div className="absolute -inset-1.5 rounded-[18px] border-2 border-lime/60 animate-ping opacity-60 pointer-events-none" />
              <div className="absolute -inset-1 rounded-[18px] ring-4 ring-lime/30 animate-pulse pointer-events-none" />
            </div>
          ) : (
            /* Backdrop oscuro continuo durante transiciones suaves de página */
            <div className="fixed inset-0 bg-ink/75 backdrop-blur-xs transition-opacity duration-300 ease-in-out" />
          )}

          {/* Tarjeta Centrada Suave durante Transiciones entre Páginas */}
          {isNavigating ? (
            <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 pointer-events-none">
              <div className="flex items-center gap-3.5 rounded-2xl bg-white/95 px-5 py-3.5 shadow-2xl border border-line backdrop-blur animate-in fade-in zoom-in-95 duration-200">
                <span className="grid size-7 place-items-center rounded-xl bg-lime/30 text-green-dark">
                  <i className="bx bx-loader-alt bx-spin text-lg" />
                </span>
                <div>
                  <p className="m-0 text-xs font-bold text-ink">
                    Abriendo sección...
                  </p>
                  <p className="m-0 text-[0.68rem] text-secondary">
                    {activeStep.title}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Tarjeta Flotante (Tooltip Popover) Enfocada al Botón */
            <div
              style={popoverStyle}
              className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Header del Popover */}
              <div className="flex items-center justify-between border-b border-line pb-3.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-0.5 text-[0.68rem] font-bold text-lime">
                    <i className="bx bx-navigation text-xs" />
                    {activeStep.badge}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="grid size-7 place-items-center rounded-lg text-secondary hover:bg-page hover:text-ink transition-colors cursor-pointer"
                  title="Cerrar tutorial"
                  aria-label="Cerrar"
                >
                  <i className="bx bx-x text-xl" />
                </button>
              </div>

              {/* Título y Descripción con Énfasis en el Botón/Sección */}
              <div>
                <h3
                  id="spotlight-tour-title"
                  className="m-0 font-display text-base sm:text-lg font-bold text-ink leading-snug"
                >
                  {activeStep.title}
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-body-muted font-medium">
                  {activeStep.description}
                </p>

                {/* Tip o Recordatorio de Acción */}
                {activeStep.actionHint && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-lime/15 border border-lime/40 px-3 py-2 text-[0.7rem] font-bold text-green-dark">
                    <i className="bx bx-bulb text-sm shrink-0 mt-0.5" />
                    <span>{activeStep.actionHint}</span>
                  </div>
                )}
              </div>

              {/* Footer con Progreso y Botones de Navegación */}
              <div className="mt-5 pt-3 border-t border-line flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-xs font-bold text-secondary hover:text-ink transition-colors cursor-pointer"
                >
                  Omitir
                </button>

                <div className="flex items-center gap-1.5">
                  {/* Pastillas de progreso */}
                  <div className="hidden sm:flex items-center gap-1 mr-2">
                    {steps.map((_, idx) => (
                      <span
                        key={idx}
                        className={`size-1.5 rounded-full transition-all ${
                          idx === currentStep ? 'bg-ink w-3' : 'bg-line'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Botón Anterior */}
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-2xs hover:bg-page disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <i className="bx bx-left-arrow-alt text-base" />
                    <span>Anterior</span>
                  </button>

                  {/* Botón Siguiente */}
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-ink hover:bg-ink-soft text-white px-4 py-1.5 text-xs font-bold shadow-xs hover:scale-102 cursor-pointer transition-all"
                  >
                    <span>
                      {currentStep === steps.length - 1 ? '¡Finalizar!' : 'Siguiente'}
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
          )}
        </div>
      )}
    </>
  );
}
