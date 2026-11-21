import { useEffect, useLayoutEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService.js';
import { normalizeRole } from '../auth/ProtectedRoute.jsx';

/**
 * Pasos del Tutorial Guiado con Spotlight y Navegación Suave entre Secciones.
 * Cada rol tiene un recorrido 100% delimitado a su ámbito de permisos para evitar
 * cualquier redirección o cruce entre portales distintos.
 */
const TOUR_STEPS_BY_ROLE = {
  superadmin: [
    {
      id: 'admin-dashboard-kpis',
      route: '/admin/dashboard',
      targetSelector: '[data-tour="admin-kpis"]',
      badge: 'Paso 1 de 3 · Panel Central',
      title: 'Supervisión Central de la Red Vincula',
      description:
        '¡Bienvenido al Panel de Super Administración! Aquí supervisas en tiempo real el ecosistema completo: empresas registradas, instituciones de educación superior en red y solicitudes prioritarias.',
      actionHint: 'Monitorea las métricas periódicas y el estado de acreditación de la plataforma.',
    },
    {
      id: 'admin-empresas-auditoria',
      route: '/admin/empresas',
      targetSelector: '[data-tour="admin-empresas-table"]',
      badge: 'Paso 2 de 3 · Auditoría Empresarial',
      title: 'Aprobación y Cuarentena de Empresas',
      description:
        'Audita la documentación legal de las empresas (Cámara de Comercio, RUT y Cédula de Representante Legal). Solo las empresas verificadas formalmente por ti pueden publicar vacantes y contratar talento.',
      actionHint: 'Inspecciona los expedientes y gestiona subsanaciones o aprobaciones.',
    },
    {
      id: 'admin-ies-acreditacion',
      route: '/admin/instituciones',
      targetSelector: '[data-tour="admin-ies-table"]',
      badge: 'Paso 3 de 3 · Acreditación IES',
      title: 'Acreditación de Universidades e IES',
      description:
        'Verifica los códigos SNIES oficiales y actos de reconocimiento del Ministerio de Educación Nacional (MEN) para incorporar a las universidades a la red de empleo y avalar sus sellos digitales.',
      actionHint: 'Garantiza la autenticidad académica de las instituciones de educación superior.',
    },
  ],

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

  company_admin: [
    {
      id: 'company-admin-perfil',
      route: '/empresa/admin/perfil',
      targetSelector: '[data-tour="company-admin-perfil"]',
      badge: 'Paso 1 de 3 · Perfil Corporativo',
      title: 'Identidad y Marca Empleadora',
      description:
        '¡Bienvenido a la gestión corporativa! Configura aquí los datos oficiales de tu empresa, NIT, logotipo y descripción que conocerán los egresados y las universidades aliadas.',
      actionHint: 'Un perfil corporativo verificado genera mayor confianza en tus postulantes.',
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
      id: 'company-admin-actividad',
      route: '/empresa/admin/actividad',
      targetSelector: '[data-tour="company-admin-actividad"]',
      badge: 'Paso 3 de 3 · Métricas de Selección',
      title: 'Actividad y Desempeño de Contratación',
      description:
        'Supervisa el embudo de atracción, el tiempo promedio de contratación y el desempeño general de tu equipo de selección de talento.',
      actionHint: 'Audita el flujo de postulantes por cada canal de reclutamiento.',
    },
  ],

  company_recruiter: [
    {
      id: 'company-recruiter-dashboard',
      route: '/empresa/reclutador/dashboard',
      targetSelector: '[data-tour="company-recruiter-dashboard"]',
      badge: 'Paso 1 de 3 · Operativa de Selección',
      title: 'Panel del Reclutador',
      description:
        '¡Bienvenido a tu panel de reclutamiento! Monitorea tus vacantes asignadas, solicitudes por calificar y las entrevistas agendadas para hoy.',
      actionHint: 'Atiende de forma ágil a los egresados recién postulados.',
    },
    {
      id: 'company-kanban',
      route: '/empresa/reclutador/candidatos',
      targetSelector: '[data-tour="company-kanban"]',
      badge: 'Paso 2 de 3 · Embudo ATS',
      title: 'Tablero Kanban ATS de Candidatos',
      description:
        '¡Mira este tablero! Administra tus postulantes en tiempo real por cada fase de selección: Revisión, Preseleccionado, Entrevista, Pruebas y Contratado.',
      actionHint: 'Arrastra candidatos para cambiar su estado y enviar feedback.',
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
};

const PORTAL_PREFIX_BY_TOUR = {
  superadmin: '/admin',
  institution_admin: '/institucion/admin',
  institution_advisor: '/institucion',
  company_admin: '/empresa/admin',
  company_recruiter: '/empresa/reclutador',
  graduate: '/dashboard',
};

/**
 * Componente Guardián de Confinamiento de Portal:
 * Solo monta el tour si el rol del usuario coincide ESTRICTAMENTE con el portal en el que se encuentra.
 * Evita cualquier cruce entre portales (por ejemplo, Super Admin jamás verá tour de Egresado ni será redirigido a /dashboard).
 */
/** Lleva el elemento a la vista: centrado, o pegado arriba (bajo el encabezado) si es muy alto o la pantalla es angosta. */
function focusTarget(el, behavior = 'smooth') {
  const tall = el.getBoundingClientRect().height > window.innerHeight * 0.5;
  const narrow = window.innerWidth < 640;
  el.style.scrollMarginTop = '96px';
  el.scrollIntoView({ behavior, block: tall || narrow ? 'start' : 'center', inline: 'nearest' });
}

export default function OnboardingTour({ showLauncher = true, autoStart = true }) {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  const rawRole = currentUser?.rol || '';
  const normRole = normalizeRole(rawRole);

  let tourType = null;
  if (normRole === 'superadmin_vincula') {
    tourType = 'superadmin';
  } else if (normRole === 'admin_ies') {
    tourType = 'institution_admin';
  } else if (normRole === 'asesor_ies') {
    tourType = 'institution_advisor';
  } else if (normRole === 'admin_empresa') {
    tourType = 'company_admin';
  } else if (normRole === 'reclutador_empresa') {
    tourType = 'company_recruiter';
  } else if (normRole === 'egresado') {
    tourType = 'graduate';
  }

  if (!tourType) {
    return null;
  }

  const expectedPrefix = PORTAL_PREFIX_BY_TOUR[tourType];
  const isOnValidPortal = expectedPrefix && location.pathname.startsWith(expectedPrefix);

  // Excepción estricta: asesor IES no debe correr en /institucion/admin
  if (tourType === 'institution_advisor' && location.pathname.startsWith('/institucion/admin')) {
    return null;
  }

  // Si no está en su portal correspondiente, el tour se deshabilita 100%
  if (!isOnValidPortal) {
    return null;
  }

  const userIdentifier = currentUser?.user_id || currentUser?.id || currentUser?.correo || 'guest';

  return (
    <OnboardingTourContent
      key={`${tourType}-${userIdentifier}`}
      showLauncher={showLauncher}
      autoStart={autoStart}
      currentUser={currentUser}
      tourType={tourType}
      expectedPrefix={expectedPrefix}
    />
  );
}

function OnboardingTourContent({
  showLauncher = true,
  autoStart = true,
  currentUser,
  tourType,
  expectedPrefix,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const steps = useMemo(() => TOUR_STEPS_BY_ROLE[tourType] || [], [tourType]);

  const userIdentifier = useMemo(() => {
    return currentUser?.user_id || currentUser?.id || currentUser?.correo || 'guest';
  }, [currentUser]);

  const storageKey = `vincula.spotlight_tour.v4.${userIdentifier}.${tourType}`;
  const sessionStepKey = `vincula.spotlight_step.v4.${userIdentifier}.${tourType}`;

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
  const popoverRef = useRef(null);
  const [popSize, setPopSize] = useState({ w: 340, h: 190 });
  const locateIntervalRef = useRef(null);

  const activeStep = steps[currentStep] || steps[0];

  // Actualizar coordenadas del elemento seleccionado
  const updateTargetRect = useCallback(() => {
    if (!activeStep?.targetSelector) return;
    const el = document.querySelector(activeStep.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      const next = {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        bottom: Math.round(rect.bottom),
        right: Math.round(rect.right),
      };
      // Si no cambió, se conserva el mismo objeto para no volver a dibujar
      setTargetRect((prev) => (prev && Object.keys(next).every((k) => prev[k] === next[k]) ? prev : next));
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
          focusTarget(el);
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

  // Apertura automática en primer ingreso (solo 1 vez en la vida del usuario y SOLO en la raíz de su propio portal)
  useEffect(() => {
    if (!autoStart || !currentUser) return;
    try {
      const seen = localStorage.getItem(storageKey);
      if (!seen) {
        const portalRoots = {
          superadmin: '/admin/dashboard',
          institution_admin: '/institucion/admin/perfil',
          institution_advisor: '/institucion/dashboard',
          // Una empresa en revisión aterriza en Actividad, no en Perfil
          company_admin: ['/empresa/admin/perfil', '/empresa/admin/actividad'],
          company_recruiter: '/empresa/reclutador/dashboard',
          graduate: '/dashboard',
        };
        const expectedRoot = [].concat(portalRoots[tourType] || []);
        if (expectedRoot.includes(location.pathname)) {
          const timer = setTimeout(() => {
            setIsOpen(true);
          }, 800);
          return () => clearTimeout(timer);
        }
      }
    } catch {
      // noop
    }
  }, [storageKey, autoStart, currentUser, location.pathname, tourType]);

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

  // Función segura de navegación confinada
  const safeNavigate = useCallback(
    (targetRoute) => {
      if (!targetRoute) return;
      if (!targetRoute.startsWith(expectedPrefix)) {
        console.warn(`[OnboardingTour] Bloqueada navegación fuera del portal: ${targetRoute}`);
        return;
      }
      const currentFull = location.pathname + location.search;
      if (targetRoute !== currentFull) {
        setIsNavigating(true);
        setTargetRect(null);
        navigate(targetRoute);
      }
    },
    [expectedPrefix, location.pathname, location.search, navigate]
  );

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
      if (firstStep?.route) {
        safeNavigate(firstStep.route);
      }
    }

    window.addEventListener('vincula:open-onboarding-tour', handleOpenEvent);
    return () => window.removeEventListener('vincula:open-onboarding-tour', handleOpenEvent);
  }, [sessionStepKey, steps, safeNavigate]);

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

  // La página puede cambiar de tamaño al terminar de cargar (imágenes, datos): mientras la guía está abierta,
  // se vuelve a enfocar el elemento si quedó fuera de pantalla y se reajusta el reflector.
  useEffect(() => {
    if (!isOpen || isNavigating || !activeStep?.targetSelector) return undefined;
    const timer = setInterval(() => {
      const el = document.querySelector(activeStep.targetSelector);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) focusTarget(el, 'auto');
      updateTargetRect();
    }, 500);
    return () => clearInterval(timer);
  }, [isOpen, isNavigating, activeStep, updateTargetRect]);

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
      if (nextStep?.route) {
        safeNavigate(nextStep.route);
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
      if (prevStep?.route) {
        safeNavigate(prevStep.route);
      }
    }
  }

  // Se mide la tarjeta ya dibujada para ubicarla con su altura real (no una estimada)
  useLayoutEffect(() => {
    if (!isOpen || isNavigating || !popoverRef.current) return;
    const r = popoverRef.current.getBoundingClientRect();
    setPopSize((p) => (Math.abs(p.w - r.width) < 1 && Math.abs(p.h - r.height) < 1 ? p : { w: Math.round(r.width), h: Math.round(r.height) }));
  });

  // Si no hay pasos definidos para este tipo de tour, no renderizar nada
  if (!steps || steps.length === 0) {
    return null;
  }

  // Posición de la tarjeta: debajo, encima, a la derecha o a la izquierda del elemento, según donde quepa.
  // Si no cabe en ningún lado (elemento muy grande) o la pantalla es angosta, va anclada abajo.
  const popoverStyle = (() => {
    const MARGIN = 16;
    const GAP = 14;
    if (typeof window === 'undefined') return {};
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const narrow = vw < 640;
    const width = Math.min(340, vw - MARGIN * 2);
    const base = { position: 'fixed', zIndex: 10001, transition: 'top 0.3s ease, left 0.3s ease' };
    const docked = narrow
      ? { ...base, left: MARGIN, right: MARGIN, bottom: MARGIN }
      : { ...base, right: MARGIN, bottom: MARGIN, width };

    if (!targetRect) {
      return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: Math.min(380, vw - MARGIN * 2) };
    }
    if (narrow) return docked;

    const h = popSize.h;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const centerX = targetRect.left + targetRect.width / 2;
    const spaceBelow = vh - targetRect.bottom - GAP - MARGIN;
    const spaceAbove = targetRect.top - GAP - MARGIN;
    const spaceRight = vw - targetRect.right - GAP - MARGIN;
    const spaceLeft = targetRect.left - GAP - MARGIN;
    const at = (top, left) => ({ ...base, width, top: Math.round(top), left: Math.round(left) });
    const alignedLeft = clamp(centerX - width / 2, MARGIN, vw - width - MARGIN);
    const alignedTop = clamp(targetRect.top, MARGIN, vh - h - MARGIN);

    if (spaceBelow >= h) return at(targetRect.bottom + GAP, alignedLeft);
    if (spaceAbove >= h) return at(targetRect.top - GAP - h, alignedLeft);
    if (spaceRight >= width) return at(alignedTop, targetRect.right + GAP);
    if (spaceLeft >= width) return at(alignedTop, targetRect.left - GAP - width);
    return docked;
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
            if (firstStep?.route) {
              safeNavigate(firstStep.route);
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
              ref={popoverRef}
              style={popoverStyle}
              className="max-h-[calc(100vh-32px)] overflow-y-auto rounded-2xl border border-line bg-white p-4 shadow-2xl animate-in fade-in duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="m-0 text-xs font-semibold text-secondary">{activeStep.badge}</p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="-mr-1 -mt-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-secondary transition-colors hover:bg-page hover:text-ink"
                  title="Cerrar tutorial"
                  aria-label="Cerrar"
                >
                  <i className="bx bx-x text-xl" />
                </button>
              </div>

              <h3 id="spotlight-tour-title" className="m-0 mt-1 font-display text-base font-semibold leading-snug text-ink">
                {activeStep.title}
              </h3>
              <p className="m-0 mt-1.5 text-sm leading-relaxed text-body-muted">{activeStep.description}</p>
              {activeStep.actionHint && (
                <p className="m-0 mt-2.5 border-l-2 border-lime pl-3 text-xs font-semibold leading-relaxed text-green-dark">
                  {activeStep.actionHint}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                <button type="button" onClick={handleClose} className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-secondary transition-colors hover:text-ink">
                  Omitir
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className="cursor-pointer rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="cursor-pointer rounded-lg border-none bg-ink px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ink-soft"
                  >
                    {currentStep === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
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
