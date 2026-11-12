import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { primaryButton } from '../utils/classes.js';
import { COLOMBIAN_LOCATIONS } from '../data/profile.js';
import { COMPANY_SECTORS, COMPANY_SIZES } from '../data/companyAdminData.js';
import { useCompanyProfile } from '../hooks/useCompanyProfile.js';
import { companyPhotos } from '../data/companyImages.js';
import { authService } from '../services/authService.js';

const carouselSlides = [
  {
    id: 'talento',
    eyebrow: 'Acuerdos Directos con Universidades',
    title: 'Accede a más de 12.000 egresados con formación certificada',
    description:
      'Publica tus convocatorias y recibe postulantes cuyos títulos, promedios y competencias están avalados directamente por los observatorios de empleo de las universidades aliadas.',
    image: companyPhotos.reclutadores.src,
    imageAlt: 'Equipo de selección revisando perfiles de graduados',
    stat: '74%',
    statLabel: 'de reducción en tiempos de criba y preselección curricular.',
    badges: ['Ingeniería de Sistemas', 'Electromecánica', 'Gestión Empresarial', 'Finanzas', 'Obras Civiles'],
  },
  {
    id: 'seguridad-72h',
    eyebrow: 'Seguridad Jurídica y SLA 72 Horas',
    title: 'Validación rigurosa de autenticidad en un plazo máximo de 72 horas',
    description:
      'Para proteger a nuestra comunidad universitaria, nuestro equipo jurídico coteja tu Certificado de Cámara de Comercio y RUT ante el RUES y la DIAN. Cero empresas fantasma ni intermediarios informales.',
    image: companyPhotos.convenios.src,
    imageAlt: 'Apretón de manos corporativo sellando convenio institucional',
    stat: 'Máx. 72h',
    statLabel: 'tiempo estándar de auditoría documental y activación de credenciales de reclutador.',
    quote:
      '«El proceso de verificación inicial de Vincula nos brindó total respaldo legal para celebrar convenios de prácticas y empleo con las facultades de la región.»',
    author: 'Constructora Marval · Convenio Empresarial Activo',
  },
  {
    id: 'pipeline',
    eyebrow: 'Herramientas de Selección Digital',
    title: 'Gestiona postulaciones y programa entrevistas en tiempo real',
    description:
      'Optimiza tu pipeline con seguimiento en 4 fases de selección, calificación de competencias técnicas y contacto directo con los asesores institucionales de cada programa académico.',
    image: companyPhotos.actividad.src,
    imageAlt: 'Equipo analizando indicadores de contratación laboral',
    stat: '4 Fases',
    statLabel: 'trazabilidad transparente: Postulación, Curricular, Entrevista y Selección Final.',
    benefits: [
      'Filtros por universidad y programa académico',
      'Historial de convenios marco institucionales',
      'Comunicación en línea con coordinadores de egresados',
    ],
  },
  {
    id: 'marca-empleadora',
    eyebrow: 'Marca Empleadora e Incentivos',
    title: 'Posiciona tu organización y accede a beneficios de Ley de Primer Empleo',
    description:
      'Fortalece tu reputación ante la academia participando en ferias laborales y aprovecha las exenciones en aportes parafiscales por contratación de egresados jóvenes (Ley 1780 de 2016).',
    image: companyPhotos.sedes.src,
    imageAlt: 'Instalaciones corporativas de empresa aliada',
    stat: 'Ley 1780',
    statLabel: 'beneficios parafiscales para empleadores que vinculan talento joven recién graduado.',
    badges: ['Convenios Marco IES', 'Ferias Universitarias', 'Exenciones Tributarias'],
  },
];

const COMPANY_FIELD_LABELS = {
  legalName: 'Razón Social completa de la empresa',
  commercialName: 'Nombre comercial o marca',
  nit: 'NIT con dígito de verificación',
  address: 'Dirección física de sede principal',
  companyPhone: 'Teléfono corporativo o PBX',
  legalRepName: 'Nombres y apellidos del Representante Legal',
  legalRepDoc: 'Cédula de ciudadanía del Representante Legal',
  recruiterName: 'Nombre del responsable de Talento / RRHH',
  recruiterEmail: 'Correo corporativo del reclutador',
  recruiterPhone: 'Celular o WhatsApp del reclutador',
  password: 'Crea tu contraseña corporativa (mín. 8 caracteres)',
  confirmPassword: 'Confirmación de contraseña corporativa',
  camaraComercio: 'Certificado de Existencia y Representación Legal (Cámara de Comercio PDF)',
  rut: 'Registro Único Tributario (RUT - DIAN PDF)',
  legalRepId: 'Cédula de ciudadanía del Representante Legal (PDF)',
  juramento: 'Declaración juramentada y autorización de verificación',
};

export default function CompanyRegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, updateProfile } = useCompanyProfile();

  // Datos precargados desde la landing vía state o del perfil de empresa existente
  const prefilled = location.state || {};

  // Sección 1: Datos Corporativos y Tributarios
  const [legalName, setLegalName] = useState(prefilled.name || profile?.legalName || '');
  const [commercialName, setCommercialName] = useState(profile?.commercialName || prefilled.name || '');
  const [nit, setNit] = useState(prefilled.nit || profile?.nit || '');
  const [sector, setSector] = useState(prefilled.sector || profile?.sector || COMPANY_SECTORS[0]);
  const [companySize, setCompanySize] = useState(profile?.size || 'Mediana (51 - 200 empleados)');
  const [dept, setDept] = useState('Santander');
  const [city, setCity] = useState('Bucaramanga');
  const [address, setAddress] = useState(profile?.address || '');
  const [website, setWebsite] = useState(profile?.website || '');
  const [companyPhone, setCompanyPhone] = useState(profile?.phone || '');

  // Sección 2: Representación Legal y Contacto de Reclutamiento
  const [legalRepName, setLegalRepName] = useState(profile?.legalRepresentative?.name || '');
  const [legalRepDoc, setLegalRepDoc] = useState(profile?.legalRepresentative?.document || '');
  const [recruiterName, setRecruiterName] = useState('');
  const [recruiterRole, setRecruiterRole] = useState('Líder de Atracción de Talento & Selección');
  const [recruiterEmail, setRecruiterEmail] = useState(prefilled.email || profile?.email || '');
  const [recruiterPhone, setRecruiterPhone] = useState('');

  // Sección 3: Documentos de Autenticación Jurídica (PDF)
  const [camaraComercioFile, setCamaraComercioFile] = useState(null);
  const [rutFile, setRutFile] = useState(null);
  const [legalRepIdFile, setLegalRepIdFile] = useState(null);
  const [docErrors, setDocErrors] = useState({});
  const [dragTargets, setDragTargets] = useState({});
  const [juramento, setJuramento] = useState(true);

  // Estados de control
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [filingNumber, setFilingNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Carrusel interactivo derecho
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Referencias a inputs de archivos ocultos
  const camaraInputRef = useRef(null);
  const rutInputRef = useRef(null);
  const repIdInputRef = useRef(null);

  const departments = Object.keys(COLOMBIAN_LOCATIONS);
  const availableCities = dept ? COLOMBIAN_LOCATIONS[dept] || [] : [];

  // Cambio automático del carrusel cada 6 segundos
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused]);

  // Manejo genérico de archivos PDF
  function handleValidateAndSetFile(file, key, setFileState) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setDocErrors((prev) => ({ ...prev, [key]: 'El documento debe adjuntarse obligatoriamente en formato PDF.' }));
      setFileState(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setDocErrors((prev) => ({ ...prev, [key]: 'El archivo supera el tamaño máximo permitido de 10 MB.' }));
      setFileState(null);
      return;
    }

    setDocErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setFileState(file);
  }

  function validateForm() {
    const newErrors = {};

    if (!legalName.trim()) newErrors.legalName = 'Ingresa la Razón Social completa de la empresa.';
    if (!commercialName.trim()) newErrors.commercialName = 'Ingresa el nombre comercial o marca.';
    if (!nit.trim()) newErrors.nit = 'Ingresa el NIT de la empresa con dígito de verificación.';
    if (!address.trim()) newErrors.address = 'Ingresa la dirección de la sede principal.';
    if (!companyPhone.trim()) newErrors.companyPhone = 'Ingresa el teléfono o PBX corporativo.';
    if (!legalRepName.trim()) newErrors.legalRepName = 'Ingresa los nombres y apellidos del Representante Legal.';
    if (!legalRepDoc.trim()) newErrors.legalRepDoc = 'Ingresa la cédula del Representante Legal.';
    if (!recruiterName.trim()) newErrors.recruiterName = 'Ingresa el nombre de la persona responsable de talento.';
    if (!recruiterEmail.trim() || !recruiterEmail.includes('@')) {
      newErrors.recruiterEmail = 'Ingresa un correo corporativo institucional válido.';
    }
    if (!recruiterPhone.trim()) newErrors.recruiterPhone = 'Ingresa un teléfono celular para contacto directo.';

    if (!password) {
      newErrors.password = 'Crea una contraseña corporativa para tu cuenta.';
    } else if (password.length < 8) {
      newErrors.password = 'La contraseña corporativa debe tener al menos 8 caracteres.';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Por favor confirma la contraseña corporativa.';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    // Validación de Documentos PDF obligatorios
    if (!camaraComercioFile) {
      newErrors.camaraComercio = 'Adjunta el Certificado de Existencia y Representación Legal (Cámara de Comercio).';
    }
    if (!rutFile) {
      newErrors.rut = 'Adjunta el RUT vigente expedido por la DIAN en formato PDF.';
    }
    if (!legalRepIdFile) {
      newErrors.legalRepId = 'Adjunta la cédula de ciudadanía del Representante Legal en PDF.';
    }
    if (!juramento) {
      newErrors.juramento = 'Debes declarar la veracidad de la información para radicar la solicitud.';
    }

    setErrors(newErrors);
    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setApiError(null);

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Invocar endpoint real de FastAPI: /api/v1/auth/registro-empresa-form
      // Sube los PDFs a Supabase Storage y persiste la empresa en modo cuarentena
      const result = await authService.registerCompany(
        {
          legalName,
          commercialName,
          nit,
          sector,
          companySize,
          dept,
          city,
          address,
          companyPhone,
          website,
          legalRepName,
          legalRepDoc,
          recruiterName,
          recruiterRole,
          recruiterEmail,
          recruiterPhone,
          password,
        },
        {
          camaraComercio: camaraComercioFile,
          rut: rutFile,
          cedulaRepLegal: legalRepIdFile,
        }
      );

      const radNumber = result.radicado || `RAD-EMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setFilingNumber(radNumber);

      // Actualizar perfil de empresa en el estado global
      updateProfile((current) => ({
        ...current,
        id: result.empresa_id || current.id,
        legalName: legalName.trim(),
        commercialName: commercialName.trim(),
        name: commercialName.trim() || legalName.trim(),
        nit: nit.trim(),
        sector,
        size: companySize,
        address: `${address.trim()}, ${city}, ${dept}`,
        city: `${city}, ${dept}`,
        website: website.trim(),
        phone: companyPhone.trim(),
        email: recruiterEmail.trim(),
        legalRepresentative: {
          name: legalRepName.trim(),
          document: legalRepDoc.trim(),
        },
        verificationStatus: 'pending_72h',
        verificationSubmittedAt: new Date().toISOString(),
        filingCode: radNumber,
        documentsCount: 3,
      }));

      // 2. Iniciar sesión automáticamente en modo empresa
      try {
        await authService.login(recruiterEmail.trim().toLowerCase(), password);
      } catch (loginErr) {
        console.warn('Auto-login post registro de empresa no completado:', loginErr);
      }

      setIsSubmitting(false);
      setShowSuccessModal(true);
    } catch (err) {
      console.error('No se pudo registrar el expediente:', err);
      setIsSubmitting(false);
      setApiError(err.message || 'No se pudo guardar el registro y sus documentos. Intenta de nuevo.');
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB] text-ink antialiased">
      {/* ─── Encabezado Superior ─── */}
      <header className="sticky top-0 z-30 border-b border-line/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 no-underline" aria-label="Vincula, volver al inicio">
            <span className="grid size-10 place-items-center rounded-xl bg-[#051F26] text-xl text-amber-400 shadow-xs">
              <i className="bx bx-buildings" />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-base font-bold tracking-tight text-[#051F26]">VINCULA</span>
              <span className="text-[0.68rem] font-semibold text-secondary">Portal Empleadores & Empresas</span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50/80 px-3.5 py-1 text-xs font-bold text-amber-900 shadow-2xs">
              <i className="bx bx-time-five text-amber-700 text-sm" />
              <span>SLA de Aprobación: Máximo 72 Horas Hábiles</span>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-bold text-secondary transition-colors hover:bg-panel hover:text-ink no-underline"
            >
              <i className="bx bx-left-arrow-alt text-base" />
              <span className="hidden xs:inline">Volver</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Contenedor Principal: 2 Columnas ─── */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-12 items-start">
          
          {/* ══════════════════════════════════════════════════════════════
              COLUMNA IZQUIERDA: Formulario de Radicación y Documentos
          ══════════════════════════════════════════════════════════════ */}
          <div className="space-y-6">

            {/* Banner Destacado de Verificación en 72 Horas */}
            <div className="rounded-3xl border border-amber-300 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/60 p-5 sm:p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-600 text-white text-2xl shadow-xs">
                  <i className="bx bx-shield-quarter" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-amber-700 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-white">
                      Verificación de Autenticidad Jurídica
                    </span>
                    <span className="rounded-md border border-amber-300 bg-white px-2 py-0.5 text-[0.65rem] font-bold text-amber-900">
                      SLA Máx. 72 Horas Hábiles
                    </span>
                  </div>
                  <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-[#051F26] sm:text-2xl">
                    Radicación de Vinculación Empresarial
                  </h1>
                  <p className="mt-1.5 text-xs leading-relaxed text-amber-950/80">
                    Para salvaguardar la confianza de nuestros egresados universitarios, toda organización debe adjuntar sus documentos legales (Cámara de Comercio, RUT y cédula del representante legal). Nuestro equipo jurídico validará los antecedentes ante RUES y DIAN en un tiempo máximo de <strong>72 horas hábiles</strong>.
                  </p>
                </div>
              </div>
            </div>

            <form noValidate onSubmit={handleSubmit} className="space-y-6">

              {/* ──────────────────────────────────────────────────────────
                  SECCIÓN 1: DATOS CORPORATIVOS Y TRIBUTARIOS
              ────────────────────────────────────────────────────────── */}
              <div className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-7 transition-all">
                <div className="mb-5 flex items-center gap-3 border-b border-line-soft pb-4">
                  <span className="grid size-9 place-items-center rounded-xl bg-[#051F26] text-white text-lg shadow-xs">
                    <i className="bx bx-buildings" />
                  </span>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#051F26]">
                      1. DATOS CORPORATIVOS Y TRIBUTARIOS
                    </h2>
                    <p className="text-xs text-secondary">
                      Información jurídica y comercial registrada ante la Cámara de Comercio y la DIAN.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Razón Social y Nombre Comercial */}
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="legalName" className="mb-1.5 block text-xs font-bold text-ink">
                        Razón Social completa <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="legalName"
                        type="text"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="Ej: Constructora Marval S.A.S."
                        autoComplete="organization"
                        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                          errors.legalName ? 'border-red-600' : 'border-line'
                        }`}
                      />
                      {errors.legalName && (
                        <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.legalName}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="commercialName" className="mb-1.5 block text-xs font-bold text-ink">
                        Nombre Comercial / Marca <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="commercialName"
                        type="text"
                        value={commercialName}
                        onChange={(e) => setCommercialName(e.target.value)}
                        placeholder="Ej: Marval"
                        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                          errors.commercialName ? 'border-red-600' : 'border-line'
                        }`}
                      />
                      {errors.commercialName && (
                        <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.commercialName}</p>
                      )}
                    </div>
                  </div>

                  {/* NIT y Sector Económico */}
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="nit" className="mb-1.5 block text-xs font-bold text-ink">
                        NIT con dígito de verificación <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="nit"
                        type="text"
                        value={nit}
                        onChange={(e) => setNit(e.target.value)}
                        placeholder="900.123.456-7"
                        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                          errors.nit ? 'border-red-600' : 'border-line'
                        }`}
                      />
                      {errors.nit && <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.nit}</p>}
                    </div>

                    <div>
                      <label htmlFor="sector" className="mb-1.5 block text-xs font-bold text-ink">
                        Sector económico / Industria <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="sector"
                        value={sector}
                        onChange={(e) => setSector(e.target.value)}
                        className="min-h-11 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none focus:border-green focus:ring-4 focus:ring-green/10 transition-all cursor-pointer"
                      >
                        {COMPANY_SECTORS.map((sec) => (
                          <option key={sec} value={sec}>
                            {sec}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Tamaño de Empresa y Teléfono Corporativo */}
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="companySize" className="mb-1.5 block text-xs font-bold text-ink">
                        Tamaño de la organización <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="companySize"
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                        className="min-h-11 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none focus:border-green focus:ring-4 focus:ring-green/10 transition-all cursor-pointer"
                      >
                        {COMPANY_SIZES.map((sz) => (
                          <option key={sz} value={sz}>
                            {sz}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="companyPhone" className="mb-1.5 block text-xs font-bold text-ink">
                        Teléfono corporativo o PBX <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="companyPhone"
                        type="tel"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        placeholder="+57 (607) 645 8800"
                        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                          errors.companyPhone ? 'border-red-600' : 'border-line'
                        }`}
                      />
                      {errors.companyPhone && (
                        <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.companyPhone}</p>
                      )}
                    </div>
                  </div>

                  {/* Ubicación Territorial (Departamento y Ciudad) */}
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="dept" className="mb-1.5 block text-xs font-bold text-ink">
                        Departamento de sede principal <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="dept"
                        value={dept}
                        onChange={(e) => {
                          const newDept = e.target.value;
                          const firstCity = COLOMBIAN_LOCATIONS[newDept]?.[0] || '';
                          setDept(newDept);
                          setCity(firstCity);
                        }}
                        className="min-h-11 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none focus:border-green focus:ring-4 focus:ring-green/10 transition-all cursor-pointer"
                      >
                        {departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="city" className="mb-1.5 block text-xs font-bold text-ink">
                        Ciudad / Municipio <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="min-h-11 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none focus:border-green focus:ring-4 focus:ring-green/10 transition-all cursor-pointer"
                      >
                        {availableCities.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dirección y Sitio Web */}
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="address" className="mb-1.5 block text-xs font-bold text-ink">
                        Dirección física de sede principal <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="address"
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Carrera 27 # 36-14, Edificio Empresarial"
                        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                          errors.address ? 'border-red-600' : 'border-line'
                        }`}
                      />
                      {errors.address && (
                        <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.address}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="website" className="mb-1.5 block text-xs font-bold text-ink">
                        Sitio web corporativo
                      </label>
                      <input
                        id="website"
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://tuempresa.com.co"
                        className="min-h-11 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────────
                  SECCIÓN 2: REPRESENTACIÓN LEGAL Y RESPONSABLE DE TALENTO
              ────────────────────────────────────────────────────────── */}
              <div className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-7 transition-all">
                <div className="mb-5 flex items-center gap-3 border-b border-line-soft pb-4">
                  <span className="grid size-9 place-items-center rounded-xl bg-[#051F26] text-white text-lg shadow-xs">
                    <i className="bx bx-user-check" />
                  </span>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#051F26]">
                      2. REPRESENTACIÓN LEGAL Y RESPONSABLE DE SELECCIÓN
                    </h2>
                    <p className="text-xs text-secondary">
                      Datos de la persona facultada legalmente y del contacto directo para convenios y reclutamiento.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Representante Legal: Nombre y Cédula */}
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="legalRepName" className="mb-1.5 block text-xs font-bold text-ink">
                        Nombres y apellidos del Representante Legal <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="legalRepName"
                        type="text"
                        value={legalRepName}
                        onChange={(e) => setLegalRepName(e.target.value)}
                        placeholder="Ej: Gonzalo Rodríguez Celis"
                        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                          errors.legalRepName ? 'border-red-600' : 'border-line'
                        }`}
                      />
                      {errors.legalRepName && (
                        <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.legalRepName}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="legalRepDoc" className="mb-1.5 block text-xs font-bold text-ink">
                        Cédula de Ciudadanía del Representante Legal <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="legalRepDoc"
                        type="text"
                        value={legalRepDoc}
                        onChange={(e) => setLegalRepDoc(e.target.value)}
                        placeholder="Ej: C.C. 91.245.890"
                        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                          errors.legalRepDoc ? 'border-red-600' : 'border-line'
                        }`}
                      />
                      {errors.legalRepDoc && (
                        <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.legalRepDoc}</p>
                      )}
                    </div>
                  </div>

                  {/* Responsable de Talento: Nombre y Cargo */}
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="recruiterName" className="mb-1.5 block text-xs font-bold text-ink">
                        Nombre del responsable de Talento / RRHH <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="recruiterName"
                        type="text"
                        value={recruiterName}
                        onChange={(e) => setRecruiterName(e.target.value)}
                        placeholder="Ej: Tatiana Suárez Gómez"
                        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                          errors.recruiterName ? 'border-red-600' : 'border-line'
                        }`}
                      />
                      {errors.recruiterName && (
                        <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.recruiterName}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="recruiterRole" className="mb-1.5 block text-xs font-bold text-ink">
                        Cargo en la organización <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="recruiterRole"
                        type="text"
                        value={recruiterRole}
                        onChange={(e) => setRecruiterRole(e.target.value)}
                        placeholder="Directora de Gestión Humana"
                        className="min-h-11 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none focus:border-green focus:ring-4 focus:ring-green/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* Correo Corporativo y Celular */}
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="recruiterEmail" className="mb-1.5 block text-xs font-bold text-ink">
                        Correo corporativo del reclutador <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="recruiterEmail"
                        type="email"
                        value={recruiterEmail}
                        onChange={(e) => setRecruiterEmail(e.target.value)}
                        placeholder="talento@tuempresa.com"
                        autoComplete="email"
                        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                          errors.recruiterEmail ? 'border-red-600' : 'border-line'
                        }`}
                      />
                      {errors.recruiterEmail && (
                        <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.recruiterEmail}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="recruiterPhone" className="mb-1.5 block text-xs font-bold text-ink">
                        Celular / WhatsApp del reclutador <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="recruiterPhone"
                        type="tel"
                        value={recruiterPhone}
                        onChange={(e) => setRecruiterPhone(e.target.value)}
                        placeholder="Ej: 315 890 1234"
                        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                          errors.recruiterPhone ? 'border-red-600' : 'border-line'
                        }`}
                      />
                      {errors.recruiterPhone && (
                        <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.recruiterPhone}</p>
                      )}
                    </div>
                  </div>

                  {/* Credenciales de Acceso Corporativo */}
                  <div className="rounded-2xl border border-line-soft bg-amber-50/40 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-ink">
                      <span className="grid size-6 place-items-center rounded-lg bg-amber-100 text-amber-800 text-sm">
                        <i className="bx bx-lock-alt" />
                      </span>
                      <span className="text-xs font-bold text-[#051F26]">Credenciales de Acceso Corporativo</span>
                    </div>
                    <p className="text-[0.72rem] text-secondary m-0 leading-relaxed">
                      Crea la contraseña con la que ingresarás para administrar las vacantes, revisar postulantes y gestionar el perfil de tu empresa.
                    </p>

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="password" className="mb-1.5 block text-xs font-bold text-ink">
                          Contraseña corporativa <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 8 caracteres"
                            autoComplete="new-password"
                            className={`min-h-11 w-full rounded-xl border bg-white pl-3.5 pr-10 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                              errors.password ? 'border-red-600' : 'border-line'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((p) => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-ink text-base cursor-pointer bg-transparent border-none p-0 flex items-center justify-center"
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                          >
                            <i className={`bx ${showPassword ? 'bx-hide' : 'bx-show'}`} />
                          </button>
                        </div>
                        {errors.password && (
                          <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.password}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-bold text-ink">
                          Confirmar contraseña <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repite tu contraseña"
                            autoComplete="new-password"
                            className={`min-h-11 w-full rounded-xl border bg-white pl-3.5 pr-10 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                              errors.confirmPassword ? 'border-red-600' : 'border-line'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((p) => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-ink text-base cursor-pointer bg-transparent border-none p-0 flex items-center justify-center"
                            aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                          >
                            <i className={`bx ${showConfirmPassword ? 'bx-hide' : 'bx-show'}`} />
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.confirmPassword}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────────
                  SECCIÓN 3: DOCUMENTOS DE AUTENTICACIÓN JURÍDICA (SLA 72H)
              ────────────────────────────────────────────────────────── */}
              <div className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-7 transition-all">
                <div className="mb-5 flex items-center justify-between border-b border-line-soft pb-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-amber-600 text-white text-lg shadow-xs">
                      <i className="bx bx-file" />
                    </span>
                    <div>
                      <h2 className="font-display text-base font-bold text-[#051F26]">
                        3. DOCUMENTOS DE AUTENTICACIÓN (PDF OBLIGATORIOS)
                      </h2>
                      <p className="text-xs text-secondary">
                        Requeridos para cotejar existencia legal y personería jurídica ante RUES y DIAN.
                      </p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[0.68rem] font-bold text-amber-800 border border-amber-200">
                    <i className="bx bx-time text-xs" /> SLA 72H
                  </span>
                </div>

                <div className="space-y-5">
                  {/* 1. Certificado de Cámara de Comercio */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-ink">
                        1. Certificado de Existencia y Representación Legal (Cámara de Comercio) <span className="text-red-600">*</span>
                      </label>
                      <span className="text-[0.68rem] font-medium text-secondary">Vigencia no mayor a 90 días</span>
                    </div>

                    <div
                      id="camaraComercio"
                      onClick={() => camaraInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragTargets((p) => ({ ...p, camara: true }));
                      }}
                      onDragLeave={() => setDragTargets((p) => ({ ...p, camara: false }))}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragTargets((p) => ({ ...p, camara: false }));
                        const file = e.dataTransfer.files?.[0];
                        handleValidateAndSetFile(file, 'camaraComercio', setCamaraComercioFile);
                      }}
                      className={`relative flex min-h-[6.5rem] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-3.5 text-center transition-all ${
                        dragTargets.camara
                          ? 'border-amber-500 bg-amber-100/70 scale-[1.01]'
                          : camaraComercioFile
                          ? 'border-green bg-emerald-50/50 hover:bg-emerald-50'
                          : errors.camaraComercio || docErrors.camaraComercio
                          ? 'border-red-400 bg-red-50/30 hover:bg-red-50/50'
                          : 'border-line hover:border-amber-500 hover:bg-page'
                      }`}
                    >
                      <input
                        ref={camaraInputRef}
                        type="file"
                        accept=".pdf"
                        className="sr-only"
                        onChange={(e) =>
                          handleValidateAndSetFile(e.target.files?.[0], 'camaraComercio', setCamaraComercioFile)
                        }
                      />

                      {camaraComercioFile ? (
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 place-items-center rounded-full bg-green text-white text-xl">
                            <i className="bx bxs-file-pdf" />
                          </span>
                          <div className="text-left">
                            <p className="font-display text-xs font-bold text-[#051F26]">{camaraComercioFile.name}</p>
                            <p className="text-[0.68rem] text-secondary">
                              {(camaraComercioFile.size / 1024 / 1024).toFixed(2)} MB · <span className="font-bold text-green-dark">✓ Documento listo para auditoría</span>
                            </p>
                          </div>
                          <span className="ml-auto text-[0.68rem] font-semibold text-green-dark underline">Cambiar</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="grid size-9 place-items-center rounded-full bg-panel text-lg text-secondary">
                            <i className="bx bx-upload" />
                          </span>
                          <p className="font-display text-xs font-bold text-[#051F26]">
                            Haz clic o arrastra tu Certificado de Cámara de Comercio (.PDF)
                          </p>
                          <p className="text-[0.68rem] text-secondary">Expedición reciente por Cámara de Comercio respectiva (máx. 10 MB)</p>
                        </div>
                      )}
                    </div>
                    {(errors.camaraComercio || docErrors.camaraComercio) && (
                      <p className="mt-1 text-[0.68rem] font-bold text-red-600">
                        {docErrors.camaraComercio || errors.camaraComercio}
                      </p>
                    )}
                  </div>

                  {/* 2. RUT de la DIAN */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-ink">
                        2. Registro Único Tributario (RUT - DIAN) <span className="text-red-600">*</span>
                      </label>
                      <span className="text-[0.68rem] font-medium text-secondary">Vigente con código CIIU visible</span>
                    </div>

                    <div
                      id="rut"
                      onClick={() => rutInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragTargets((p) => ({ ...p, rut: true }));
                      }}
                      onDragLeave={() => setDragTargets((p) => ({ ...p, rut: false }))}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragTargets((p) => ({ ...p, rut: false }));
                        const file = e.dataTransfer.files?.[0];
                        handleValidateAndSetFile(file, 'rut', setRutFile);
                      }}
                      className={`relative flex min-h-[6.5rem] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-3.5 text-center transition-all ${
                        dragTargets.rut
                          ? 'border-amber-500 bg-amber-100/70 scale-[1.01]'
                          : rutFile
                          ? 'border-green bg-emerald-50/50 hover:bg-emerald-50'
                          : errors.rut || docErrors.rut
                          ? 'border-red-400 bg-red-50/30 hover:bg-red-50/50'
                          : 'border-line hover:border-amber-500 hover:bg-page'
                      }`}
                    >
                      <input
                        ref={rutInputRef}
                        type="file"
                        accept=".pdf"
                        className="sr-only"
                        onChange={(e) => handleValidateAndSetFile(e.target.files?.[0], 'rut', setRutFile)}
                      />

                      {rutFile ? (
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 place-items-center rounded-full bg-green text-white text-xl">
                            <i className="bx bxs-file-pdf" />
                          </span>
                          <div className="text-left">
                            <p className="font-display text-xs font-bold text-[#051F26]">{rutFile.name}</p>
                            <p className="text-[0.68rem] text-secondary">
                              {(rutFile.size / 1024 / 1024).toFixed(2)} MB · <span className="font-bold text-green-dark">✓ Documento listo para auditoría</span>
                            </p>
                          </div>
                          <span className="ml-auto text-[0.68rem] font-semibold text-green-dark underline">Cambiar</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="grid size-9 place-items-center rounded-full bg-panel text-lg text-secondary">
                            <i className="bx bx-upload" />
                          </span>
                          <p className="font-display text-xs font-bold text-[#051F26]">
                            Haz clic o arrastra tu RUT expedido por la DIAN (.PDF)
                          </p>
                          <p className="text-[0.68rem] text-secondary">Copia oficial descargada de la plataforma DIAN (máx. 10 MB)</p>
                        </div>
                      )}
                    </div>
                    {(errors.rut || docErrors.rut) && (
                      <p className="mt-1 text-[0.68rem] font-bold text-red-600">{docErrors.rut || errors.rut}</p>
                    )}
                  </div>

                  {/* 3. Cédula del Representante Legal */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-ink">
                        3. Cédula de Ciudadanía del Representante Legal <span className="text-red-600">*</span>
                      </label>
                      <span className="text-[0.68rem] font-medium text-secondary">PDF legible ambas caras</span>
                    </div>

                    <div
                      id="legalRepId"
                      onClick={() => repIdInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragTargets((p) => ({ ...p, repId: true }));
                      }}
                      onDragLeave={() => setDragTargets((p) => ({ ...p, repId: false }))}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragTargets((p) => ({ ...p, repId: false }));
                        const file = e.dataTransfer.files?.[0];
                        handleValidateAndSetFile(file, 'legalRepId', setLegalRepIdFile);
                      }}
                      className={`relative flex min-h-[6.5rem] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-3.5 text-center transition-all ${
                        dragTargets.repId
                          ? 'border-amber-500 bg-amber-100/70 scale-[1.01]'
                          : legalRepIdFile
                          ? 'border-green bg-emerald-50/50 hover:bg-emerald-50'
                          : errors.legalRepId || docErrors.legalRepId
                          ? 'border-red-400 bg-red-50/30 hover:bg-red-50/50'
                          : 'border-line hover:border-amber-500 hover:bg-page'
                      }`}
                    >
                      <input
                        ref={repIdInputRef}
                        type="file"
                        accept=".pdf"
                        className="sr-only"
                        onChange={(e) =>
                          handleValidateAndSetFile(e.target.files?.[0], 'legalRepId', setLegalRepIdFile)
                        }
                      />

                      {legalRepIdFile ? (
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 place-items-center rounded-full bg-green text-white text-xl">
                            <i className="bx bxs-file-pdf" />
                          </span>
                          <div className="text-left">
                            <p className="font-display text-xs font-bold text-[#051F26]">{legalRepIdFile.name}</p>
                            <p className="text-[0.68rem] text-secondary">
                              {(legalRepIdFile.size / 1024 / 1024).toFixed(2)} MB · <span className="font-bold text-green-dark">✓ Documento listo para auditoría</span>
                            </p>
                          </div>
                          <span className="ml-auto text-[0.68rem] font-semibold text-green-dark underline">Cambiar</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="grid size-9 place-items-center rounded-full bg-panel text-lg text-secondary">
                            <i className="bx bx-upload" />
                          </span>
                          <p className="font-display text-xs font-bold text-[#051F26]">
                            Haz clic o arrastra la cédula del Representante Legal (.PDF)
                          </p>
                          <p className="text-[0.68rem] text-secondary">Documento de identidad oficial en formato PDF (máx. 10 MB)</p>
                        </div>
                      )}
                    </div>
                    {(errors.legalRepId || docErrors.legalRepId) && (
                      <p className="mt-1 text-[0.68rem] font-bold text-red-600">
                        {docErrors.legalRepId || errors.legalRepId}
                      </p>
                    )}
                  </div>

                  {/* Declaración Juramentada y Habeas Data */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs leading-relaxed text-secondary select-none">
                      <input
                        id="juramento"
                        type="checkbox"
                        checked={juramento}
                        onChange={(e) => setJuramento(e.target.checked)}
                        className="mt-0.5 size-4 rounded border-line text-green focus:ring-green cursor-pointer"
                      />
                      <span>
                        Declaro bajo la gravedad de juramento que la información y los documentos adjuntos son veraces y auténticos, y autorizo a <strong className="text-ink">Vincula</strong> y a las <strong className="text-ink">Instituciones de Educación Superior aliadas</strong> para verificar los antecedentes empresariales y tributarios ante las autoridades competentes (Cámara de Comercio y DIAN), conforme a la Ley 1581 de 2012.
                      </span>
                    </label>
                    {errors.juramento && (
                      <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.juramento}</p>
                    )}
                  </div>

                  {/* Alerta de Error de API si ocurre */}
                  {apiError && (
                    <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-3.5 text-xs font-semibold text-red-800 flex items-center gap-2.5">
                      <i className="bx bx-error-circle text-lg shrink-0 text-red-600" />
                      <span>{apiError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Alerta de Datos Faltantes antes del botón de radicar */}
              {submitted && Object.keys(errors).length > 0 && (
                <div
                  id="missing-fields-alert"
                  className="rounded-2xl border-2 border-amber-300 bg-amber-50/95 p-4 sm:p-5 shadow-sm animate-fadeIn"
                  role="alert"
                >
                  <div className="flex items-center gap-2.5 font-bold text-sm text-amber-950 mb-2">
                    <span className="grid size-7 place-items-center rounded-lg bg-amber-200 text-amber-900 shrink-0">
                      <i className="bx bx-error-circle text-lg" />
                    </span>
                    <span>Faltan los siguientes datos obligatorios para radicar la solicitud:</span>
                  </div>

                  <ul className="mt-2.5 grid gap-2 sm:grid-cols-2 text-xs font-semibold text-amber-900">
                    {Object.entries(errors).map(([key, msg]) => (
                      <li key={key} className="flex items-start gap-2">
                        <span className="mt-1 size-1.5 rounded-full bg-amber-600 shrink-0" />
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById(key);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className="text-left font-semibold text-amber-950 hover:text-amber-700 underline underline-offset-2 cursor-pointer bg-transparent border-none p-0"
                          title="Haz clic para ir a este campo"
                        >
                          {COMPANY_FIELD_LABELS[key] || msg}
                        </button>
                      </li>
                    ))}
                  </ul>

                  <p className="m-0 mt-3 text-[0.68rem] font-medium text-amber-800">
                    💡 Haz clic sobre cualquiera de los datos anteriores para ir directamente al campo correspondiente.
                  </p>
                </div>
              )}

              {/* Botón de Envío */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-control bg-[#051F26] px-6 py-4 text-sm font-bold text-white transition-all hover:bg-[#0b2b34] shadow-md shadow-[#051F26]/15 cursor-pointer ${
                    isSubmitting ? 'opacity-85 cursor-wait' : ''
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <i className="bx bx-loader-alt animate-spin text-lg text-amber-400" />
                      <span>Subiendo documentos a Supabase Storage y radicando...</span>
                    </>
                  ) : (
                    <>
                      <i className="bx bx-shield-quarter text-lg text-amber-400" />
                      <span>Radicar solicitud de vinculación (SLA 72 Horas)</span>
                      <i className="bx bx-right-arrow-alt text-xl" />
                    </>
                  )}
                </button>

                <Link
                  to="/empresa/admin/perfil"
                  className="w-full sm:w-auto text-center px-4 py-3 text-xs font-semibold text-secondary hover:text-ink no-underline"
                >
                  Omitir por ahora
                </Link>
              </div>
            </form>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              COLUMNA DERECHA: Carrusel Corporativo para Empleadores
          ══════════════════════════════════════════════════════════════ */}
          <div
            className="sticky top-20 rounded-3xl border border-line bg-white shadow-hero overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Foto Superior del Slide Activo */}
            <div className="relative h-52 sm:h-60 w-full overflow-hidden bg-[#051F26]">
              <img
                src={carouselSlides[currentSlide].image}
                alt={carouselSlides[currentSlide].imageAlt}
                className="size-full object-cover opacity-85 transition-opacity duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#051F26] via-transparent to-black/30" />

              {/* Eyebrow Badge sobre la foto */}
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-[#051F26] shadow-sm">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  {carouselSlides[currentSlide].eyebrow}
                </span>
              </div>

              {/* Controles de Navegación Manual */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentSlide((p) => (p === 0 ? carouselSlides.length - 1 : p - 1))
                  }
                  className="grid size-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/90 transition-all cursor-pointer"
                  aria-label="Slide anterior"
                >
                  <i className="bx bx-chevron-left text-lg" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentSlide((p) => (p + 1) % carouselSlides.length)}
                  className="grid size-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/90 transition-all cursor-pointer"
                  aria-label="Siguiente slide"
                >
                  <i className="bx bx-chevron-right text-lg" />
                </button>
              </div>
            </div>

            {/* Contenido del Slide */}
            <div className="p-6 sm:p-7 space-y-4">
              <h3 className="font-display text-lg sm:text-xl font-bold leading-snug tracking-tight text-[#051F26]">
                {carouselSlides[currentSlide].title}
              </h3>
              <p className="text-xs leading-relaxed text-body-muted">
                {carouselSlides[currentSlide].description}
              </p>

              {/* Estadísticas / Destacados */}
              {carouselSlides[currentSlide].stat && (
                <div className="rounded-2xl border border-line-soft bg-page p-4 flex items-center gap-3.5">
                  <span className="font-display text-2xl sm:text-3xl font-extrabold text-[#051F26]">
                    {carouselSlides[currentSlide].stat}
                  </span>
                  <span className="text-xs text-secondary font-medium leading-snug">
                    {carouselSlides[currentSlide].statLabel}
                  </span>
                </div>
              )}

              {/* Badges de Programas / Alianzas */}
              {carouselSlides[currentSlide].badges && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {carouselSlides[currentSlide].badges.map((b) => (
                    <span
                      key={b}
                      className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-bold text-[#051F26] shadow-2xs"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}

              {/* Testimonio Corporativo */}
              {carouselSlides[currentSlide].quote && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                  <p className="text-xs italic leading-relaxed text-amber-950">
                    {carouselSlides[currentSlide].quote}
                  </p>
                  <p className="mt-2 text-[0.68rem] font-bold text-amber-800">
                    — {carouselSlides[currentSlide].author}
                  </p>
                </div>
              )}

              {/* Beneficios */}
              {carouselSlides[currentSlide].benefits && (
                <ul className="space-y-1.5 text-xs text-secondary pt-1">
                  {carouselSlides[currentSlide].benefits.map((ben) => (
                    <li key={ben} className="flex items-center gap-2">
                      <i className="bx bx-check text-amber-600 text-base" />
                      <span>{ben}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Paginación de Puntos */}
              <div className="flex items-center justify-between border-t border-line-soft pt-4">
                <span className="text-[0.68rem] text-secondary font-semibold">
                  Alianza estratégica Empresa · Academia
                </span>
                <div className="flex items-center gap-1.5">
                  {carouselSlides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        currentSlide === idx ? 'w-6 bg-[#051F26]' : 'w-2 bg-line hover:bg-secondary'
                      }`}
                      aria-label={`Ir al beneficio ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ─── Modal de Éxito: Radicado con SLA 72 Horas ─── */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-line bg-white p-6 sm:p-8 text-center shadow-2xl space-y-4">
            
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 text-3xl">
              <i className="bx bx-time-five" />
            </div>

            <div className="space-y-1.5">
              <span className="rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-amber-900">
                SLA de Validación: Máximo 72 Horas Hábiles
              </span>
              <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#051F26]">
                ¡Solicitud radicada con éxito!
              </h3>
              <p className="text-xs leading-relaxed text-secondary">
                Los documentos de <strong className="text-ink">{legalName}</strong> (NIT: {nit}) han ingresado a la cola oficial de auditoría jurídica de Vincula.
              </p>
            </div>

            {/* Ficha Resumen de Radicación */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-left text-xs space-y-2">
              <div className="flex items-center justify-between text-amber-950">
                <span className="font-semibold">Número de Radicado:</span>
                <span className="font-mono font-bold text-amber-800">{filingNumber}</span>
              </div>
              <div className="flex items-center justify-between text-amber-950">
                <span className="font-semibold">Plazo máximo de respuesta:</span>
                <span className="font-bold text-amber-900">72 Horas Hábiles</span>
              </div>
              <div className="flex items-center justify-between text-amber-950">
                <span className="font-semibold">Documentos en revisión:</span>
                <span className="font-bold text-[#051F26]">3 archivos PDF cargados</span>
              </div>
              <div className="text-[0.68rem] text-secondary pl-3 border-l-2 border-amber-400 space-y-0.5 pt-0.5">
                <p>• {camaraComercioFile?.name}</p>
                <p>• {rutFile?.name}</p>
                <p>• {legalRepIdFile?.name}</p>
              </div>
              <div className="flex items-center justify-between text-amber-950 border-t border-amber-200/60 pt-2">
                <span className="font-semibold">Correo de acceso corporativo:</span>
                <span className="font-bold truncate max-w-[200px] text-ink">{recruiterEmail}</span>
              </div>
              <div className="flex items-center justify-between text-amber-950">
                <span className="font-semibold">Contraseña:</span>
                <span className="rounded-md bg-amber-200/80 px-2 py-0.5 text-[0.65rem] font-bold text-amber-900">
                  •••••••• (Configurada)
                </span>
              </div>
            </div>

            <p className="text-[0.72rem] text-secondary leading-snug">
              Tu sesión ha sido iniciada en modo preliminar. También podrás ingresar en cualquier momento usando tu correo corporativo y la contraseña que acabas de configurar.
            </p>

            <button
              type="button"
              onClick={() => navigate('/empresa/admin/perfil')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-control bg-[#051F26] px-5 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#0b2b34] shadow-md shadow-[#051F26]/20 cursor-pointer"
            >
              <span>Ingresar al portal de empresa (Modo preliminar)</span>
              <i className="bx bx-right-arrow-alt text-xl" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

