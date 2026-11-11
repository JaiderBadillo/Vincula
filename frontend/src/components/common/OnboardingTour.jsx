import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService.js';

/**
 * Pasos del Tutorial Guiado con Spotlight y Navegación Suave entre Secciones.
 * Cada rol tiene un recorrido 100% delimitado a su ámbito de permisos para evitar
 * redirecciones o parpadeos entre portales distintos.
 */
const TOUR_STEPS_BY_ROLE = {
  institution_admin: [
    {
      id: 'ies-admin-perfil',
      route: '/institucion/admin/perfil',
      targetSelector: '[data-tour="ies-admin-perfil"]',
      badge: 'Paso 1 de 5 · Datos Institucionales',
      title: 'Datos Oficiales y Marca Institucional',
      description:
        '¡Bienvenido a la gestión institucional! Aquí configuras la identidad oficial, NIT, sigla y sellos de la universidad que aparecerán en títulos, convenios y auditorías ante el MEN.',
      actionHint: 'Mantén el logo institucional en alta calidad para los certificados oficiales.',
    },
    {
      id: 'vincular-asesor',
      route: '/institucion/admin/asesores',
      targetSelector: '[data-tour="vincular-asesor"]',
      badge: 'Paso 2 de 5 · Asesores y Coordinación',
      title: '¡Mira este botón: Vincular Nuevo Asesor!',
      description:
        'Desde este botón das de alta a nuevos coordinadores o asesores de empleabilidad. Les asignas las sedes correspondientes y el sistema genera de inmediato su cuenta de acceso.',
      actionHint: 'Tus asesores podrán gestionar solicitudes de validación de títulos.',
    },
    {
      id: 'ies-sedes-tab',
      route: '/institucion/admin/asesores?tab=sedes',
      targetSelector: '[data-tour="ies-sedes-tab"]',
      badge: 'Paso 3 de 5 · Cobertura y Sedes',
      title: 'Sedes y Campus Universitarios',
      description:
        '¡Mira esta pestaña! Permite administrar la cobertura multisede (Campus Principal, Bucarica, Barrancabermeja, etc.) para que los asesores atiendan a los egresados de cada región.',
      actionHint: 'Haz clic en la pestaña para consultar las sedes registradas.',
    },
    {
      id: 'nueva-carrera',
      route: '/institucion/admin/programas',
      targetSelector: '[data-tour="nueva-carrera"]',
      badge: 'Paso 4 de 5 · Oferta Académica',
      title: '¡Mira este botón: Registrar Carrera!',
      description:
        'Aquí registras los programas académicos y asignas a los asesores institucionales responsables de atender a los egresados de cada facultad.',
      actionHint: 'Asocia cada carrera a su facultad correspondiente.',
    },
    {
      id: 'ies-trazabilidad-grafica',
      route: '/institucion/admin/trazabilidad',
      targetSelector: '[data-tour="ies-trazabilidad-grafica"]',
      badge: 'Paso 5 de 5 · Pertinencia Curricular',
      title: 'Auditoría y Brecha de Empleabilidad',
      description:
        'Compara los planes de estudio con las habilidades técnicas que más contratan las empresas en el mercado laboral, insumo clave para la acreditación de alta calidad ante el MEN.',
      actionHint: 'Permite identificar qué competencias técnicas demandan los reclutadores.',
    },
  ],

  institution_advisor: [
    {
      id: 'ies-asesor-kpis',
      route: '/institucion/dashboard',
      targetSelector: '[data-tour="ies-kpis"]',
      badge: 'Paso 1 de 4 · Observatorio IES',
      title: 'Monitoreo de Indicadores y Empleabilidad',
      description:
        '¡Mira este panel! Como asesor, aquí monitoreas la tasa de inserción laboral de los graduados de tu institución y las vacantes formales vigentes en tiempo real.',
      actionHint: 'Filtra por semestres para auditar el histórico de vinculación.',
    },
    {
      id: 'ies-asesor-atender',
      route: '/institucion/dashboard',
      targetSelector: '[data-tour="ies-atender-solicitudes"]',
      badge: 'Paso 2 de 4 · Cola de Solicitudes',
      title: '¡Mira este botón: Atender Solicitudes!',
      description:
        'Te lleva directo a la bandeja de egresados que han enviado su acta de grado y están a la espera de certificación oficial para acceder al mercado laboral.',
      actionHint: 'Acceso directo a la cola de estudiantes pendientes.',
    },
    {
      id: 'ies-asesor-validar',
      route: '/institucion/estudiantes/solicitudes',
      targetSelector: '[data-tour="ies-validar-sello"]',
      badge: 'Paso 3 de 4 · Validación & Sello Digital',
      title: 'Expedir el Sello Digital Oficial',
      description:
        '¡Mira este botón de acción! Abre el expediente académico del graduado, verifica su acta de grado y expide el Sello Digital Oficial de la universidad con 1 solo clic.',
      actionHint: 'Los títulos sellados quedan verificados digitalmente ante las empresas.',
    },
    {
      id: 'ies-asesor-competencias',
      route: '/institucion/mercado-laboral/competencias',
      targetSelector: '[data-tour="ies-mercado-laboral"]',
      badge: 'Paso 4 de 4 · Mercado Laboral',
      title: 'Habilidades Técnicas Demandadas',
      description:
        'Monitorea en tiempo real las competencias más demandadas por el sector productivo para orientar a tus egresados hacia mejores oportunidades.',
      actionHint: 'Revisa las tendencias para asesorar a egresados en entrevistas laborales.',
    },
  ],

  graduate: [
    {
      id: 'grad-perfil-kpi',
      route: '/dashboard',
      targetSelector: '[data-tour="grad-perfil-kpi"]',
      badge: 'Paso 1 de 5 · Inicio & Estado',
      title: 'Completitud de tu Perfil',
      description:
        '¡Mira este indicador! Mide el porcentaje de completitud de tu hoja de vida. A mayor nivel, el algoritmo de Vincula te recomendará prioritariamente ante empresas aliadas.',
      actionHint: 'Un perfil al 100% triplica las oportunidades de contacto.',
    },
    {
      id: 'grad-subir-cv',
      route: '/dashboard',
      targetSelector: '[data-tour="grad-subir-cv"]',
      badge: 'Paso 2 de 5 · Tu Hoja de Vida',
      title: 'Carga de tu CV en PDF',
      description:
        '¡Mira esta sección! Sube aquí tu hoja de vida en PDF. El motor de IA extraerá tus competencias y te conectará con ofertas afines a tu carrera.',
      actionHint: 'Mantén tu CV actualizado para recibir alertas inteligentes.',
    },
    {
      id: 'grad-perfil-tabs',
      route: '/dashboard/perfil',
      targetSelector: '[data-tour="grad-perfil-tabs"]',
      badge: 'Paso 3 de 5 · Mi Perfil Profesional',
      title: 'Formación y Sello Oficial',
      description:
        'En estas pestañas registras tu formación académica, aspiración salarial y solicitas a tu institución el Sello Oficial de Egresado Verificado.',
      actionHint: 'El sello oficial garantiza ante las empresas la autenticidad de tu título.',
    },
    {
      id: 'grad-vacantes-search',
      route: '/dashboard/vacantes',
      targetSelector: '[data-tour="grad-vacantes-search"]',
      badge: 'Paso 4 de 5 · Vacantes con Convenio',
      title: 'Buscador de Vacantes Aliadas',
      description:
        '¡Mira este buscador! Filtra oportunidades laborales por modalidad (remoto, presencial, híbrido), rango salarial y exclusividad con tu universidad.',
      actionHint: 'Empresas auditadas y vacantes formales verificadas.',
    },
    {
      id: 'grad-postulaciones-pipeline',
      route: '/dashboard/postulaciones',
      targetSelector: '[data-tour="grad-postulaciones-pipeline"]',
      badge: 'Paso 5 de 5 · Trazabilidad ATS',
      title: 'Monitoreo de tus Candidaturas',
      description:
        '¡Sigue tus postulaciones en tiempo real! Conoce cuándo revisan tu perfil, si eres preseleccionado o cuándo es tu próxima entrevista.',
      actionHint: 'Cero incertidumbre: cada fase te notifica de inmediato.',
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
        '¡Mira este tablero! Administra tus postulantes en tiempo real por cada fase de selección: Revisión, Preseleccionado, Entrevista, Pruebas y Contratado.',
      actionHint: 'Arrastra candidatos para cambiar su estado y enviar feedback.',
    },
    {
      id: 'company-publicar-vacante',
      route: '/empresa/admin/vacantes',
      targetSelector: '[data-tour="company-publicar-vacante"]',
      badge: 'Paso 2 de 3 · Ofertas Laborales',
      title: '¡Mira este botón: Nueva Vacante!',
      description:
        'Publica convocatorias formales con requisitos de carrera, bandas salariales y alcance prioritario para egresados de universidades con convenio.',
      actionHint: 'Activa o pausa vacantes según tus requerimientos de contratación.',
    },
    {
      id: 'company-buscar-talento',
      route: '/empresa/reclutador/talento',
      targetSelector: '[data-tour="company-buscar-talento"]',
      badge: 'Paso 3 de 3 · Banco de Talento',
      title: 'Búsqueda Directa de Talento Certificado',
      description:
        'Filtra talento universitario por programa académico, universidad aliada y competencias para invitarlos a tus procesos con un solo clic.',
      actionHint: 'Acceso a egresados con título verificado ante las instituciones.',
    },
  ],
};

/**
 * Componente Guardián: solo monta el tour si el usuario está autenticado y dentro de un portal.
 * Evita cualquier cálculo, listener o conflicto en landing (/), login o registros.
 */
export default function OnboardingTour({ showLauncher = true, autoStart = true }) {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();

  const isPortalRoute =
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/institucion') ||
    location.pathname.startsWith('/empresa') ||
    location.pathname.startsWith('/admin');

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

  const tourType = useMemo(() => {
    if (userRole === 'admin_ies' || userRole === 'ies_admin') return 'institution_admin';
    if (userRole === 'asesor_ies' || userRole === 'ies_asesor') return 'institution_advisor';
    if (userRole.includes('asesor') || userRole.includes('advisor')) return 'institution_advisor';
    if (userRole.includes('ies') || userRole.includes('institucion')) return 'institution_admin';
    if (userRole.includes('empresa') || userRole.includes('reclutador') || userRole.includes('company')) return 'company';
    return 'graduate';
  }, [userRole]);

  const steps = useMemo(() => TOUR_STEPS_BY_ROLE[tourType] || TOUR_STEPS_BY_ROLE.graduate, [tourType]);

  const userIdentifier = useMemo(() => {
    return currentUser?.user_id || currentUser?.id || currentUser?.correo || 'guest';
  }, [currentUser]);

  const storageKey = `vincula.spotlight_tour.v3.${userIdentifier}`;
  const sessionStepKey = `vincula.spotlight_step.v3.${userIdentifier}`;

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
  const locateIntervalRef = useRef(null);

  const activeStep = steps[currentStep] || steps[0];

  // Actualizar coordenadas del elemento seleccionado
  const updateTargetRect = useCallback(() => {
    if (!activeStep?.targetSelector) return;
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
  }, [activeStep]);

  // Localizar elemento en el DOM con reintentos controlados y parada suave
  const locateElement = useCallback(() => {
    if (!activeStep) return;

    if (locateIntervalRef.current) {
      clearInterval(locateIntervalRef.current);
      locateIntervalRef.current = null;
    }

    let attempts = 0;
    const maxAttempts = 30; // 1.8 segundos máx (30 * 60ms)

    locateIntervalRef.current = setInterval(() => {
      attempts++;
      const el = activeStep.targetSelector ? document.querySelector(activeStep.targetSelector) : null;
      if (el) {
        clearInterval(locateIntervalRef.current);
        locateIntervalRef.current = null;
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        } catch {
          // noop
        }
        setTimeout(() => {
          updateTargetRect();
          setIsNavigating(false);
        }, 120);
      } else if (attempts >= maxAttempts) {
        clearInterval(locateIntervalRef.current);
        locateIntervalRef.current = null;
        setIsNavigating(false);
        setTargetRect(null); // Fallback centrado elegante
      }
    }, 60);
  }, [activeStep, updateTargetRect]);

  // Apertura automática en primer ingreso (solo 1 vez en la vida del usuario)
  useEffect(() => {
    if (!autoStart || !currentUser) return;
    try {
      const seen = localStorage.getItem(storageKey);
      if (!seen) {
        const portalRoots = [
          '/dashboard',
          '/institucion/admin/perfil',
          '/institucion/dashboard',
          '/empresa/admin/perfil',
          '/empresa/reclutador/dashboard',
          '/admin/dashboard',
        ];
        if (portalRoots.includes(location.pathname)) {
          const timer = setTimeout(() => {
            setIsOpen(true);
          }, 800);
          return () => clearTimeout(timer);
        }
      }
    } catch {
      // noop
    }
  }, [storageKey, autoStart, currentUser, location.pathname]);

  // Si el tour está abierto, localizar el elemento objetivo
  useEffect(() => {
    if (!isOpen) return;
    locateElement();
    return () => {
      if (locateIntervalRef.current) {
        clearInterval(locateIntervalRef.current);
        locateIntervalRef.current = null;
      }
    };
  }, [isOpen, currentStep, location.pathname, location.search, locateElement]);

  // Escuchar evento global para reabrir desde menús
  useEffect(() => {
    function handleOpenEvent() {
      setCurrentStep(0);
      setIsNavigating(false);
      try {
        sessionStorage.setItem(sessionStepKey, '0');
      } catch {
        // noop
      }
      setIsOpen(true);
      const firstStep = steps[0];
      const currentFullRoute = location.pathname + location.search;
      if (firstStep?.route && firstStep.route !== currentFullRoute) {
        setIsNavigating(true);
        navigate(firstStep.route);
      }
    }

    window.addEventListener('vincula:open-onboarding-tour', handleOpenEvent);
    return () => window.removeEventListener('vincula:open-onboarding-tour', handleOpenEvent);
  }, [sessionStepKey, steps, location.pathname, location.search, navigate]);

  // Reposicionar el reflector ante scroll o resize de la ventana
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

  // Navegación con teclado accesible
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
    if (locateIntervalRef.current) {
      clearInterval(locateIntervalRef.current);
      locateIntervalRef.current = null;
    }
  }

  function handleNext() {
    if (currentStep < steps.length - 1) {
      const nextIdx = currentStep + 1;
      const nextStep = steps[nextIdx];
      setCurrentStep(nextIdx);
      try {
        sessionStorage.setItem(sessionStepKey, String(nextIdx));
      } catch {
        // noop
      }

      const currentFull = location.pathname + location.search;
      if (nextStep?.route && nextStep.route !== currentFull) {
        setIsNavigating(true);
        setTargetRect(null);
        navigate(nextStep.route);
      }
    } else {
      handleClose();
    }
  }

  function handlePrev() {
    if (currentStep > 0) {
      const prevIdx = currentStep - 1;
      const prevStep = steps[prevIdx];
      setCurrentStep(prevIdx);
      try {
        sessionStorage.setItem(sessionStepKey, String(prevIdx));
      } catch {
        // noop
      }

      const currentFull = location.pathname + location.search;
      if (prevStep?.route && prevStep.route !== currentFull) {
        setIsNavigating(true);
        setTargetRect(null);
        navigate(prevStep.route);
      }
    }
  }

  // Cálculo de posición suave del Popover tooltip flotante
  const popoverStyle = (() => {
    if (!targetRect || typeof window === 'undefined') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(440px, calc(100vw - 32px))',
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
      transition: 'top 0.3s ease, left 0.3s ease',
    };
  })();

  return (
    <>
      {/* Botón Flotante Permanente para Reabrir la Guía */}
      {showLauncher && (
        <button
          type="button"
          onClick={() => {
            setCurrentStep(0);
            setIsNavigating(false);
            try {
              sessionStorage.setItem(sessionStepKey, '0');
            } catch {
              // noop
            }
            setIsOpen(true);
            const firstStep = steps[0];
            const currentFull = location.pathname + location.search;
            if (firstStep?.route && firstStep.route !== currentFull) {
              setIsNavigating(true);
              navigate(firstStep.route);
            }
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

      {/* ─── OVERLAY SPOTLIGHT INTERACTIVO CON TRANSICIÓN LIGERA ─── */}
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
              className="fixed pointer-events-none transition-all duration-350 ease-out"
              style={{
                top: `${Math.max(0, targetRect.top - 6)}px`,
                left: `${Math.max(0, targetRect.left - 6)}px`,
                width: `${targetRect.width + 12}px`,
                height: `${targetRect.height + 12}px`,
                borderRadius: '16px',
                boxShadow: '0 0 0 9999px rgba(5, 31, 38, 0.78)',
                border: '2px solid #a3e635',
              }}
            >
              <div className="absolute -inset-1 rounded-[18px] ring-4 ring-lime/25 animate-pulse pointer-events-none" />
            </div>
          ) : (
            /* Telón de fondo continuo y estable */
            <div className="fixed inset-0 bg-[#051F26]/75 backdrop-blur-xs transition-opacity duration-300 ease-in-out" />
          )}

          {/* Pastilla flotante suave durante transiciones entre páginas (sin trancanazo) */}
          {isNavigating && (
            <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[10005] flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#051F26]/90 text-white border border-white/15 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-200">
              <span className="grid size-5 place-items-center rounded-full bg-lime/20 text-lime text-xs">
                <i className="bx bx-loader-alt bx-spin" />
              </span>
              <span className="text-xs font-semibold">Cargando sección...</span>
            </div>
          )}

          {/* Popover con información del paso y botones */}
          {!isNavigating && (
            <div
              style={popoverStyle}
              className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-2xl animate-in fade-in duration-200"
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
