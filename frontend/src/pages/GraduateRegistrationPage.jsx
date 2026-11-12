import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { primaryButton } from '../utils/classes.js';
import { COLOMBIAN_LOCATIONS } from '../data/profile.js';
import { useProfile } from '../hooks/useProfile.js';
import { authService } from '../services/authService.js';

const educationLevels = [
  'Técnico Profesional',
  'Tecnológico',
  'Profesional Universitario',
  'Especialización',
  'Maestría',
];

const GRADUATE_FIELD_LABELS = {
  docNumber: 'Número de documento de identidad',
  fullName: 'Nombres y apellidos completos',
  email: 'Correo electrónico personal válido',
  phone: 'Teléfono o WhatsApp de contacto',
  password: 'Crea tu contraseña de acceso (mín. 8 caracteres)',
  confirmPassword: 'Confirmación de contraseña',
  dept: 'Departamento de residencia',
  city: 'Ciudad / Municipio de residencia',
  university: 'Universidad o Institución de egreso',
  career: 'Carrera o programa académico de egreso',
  diploma: 'Diploma o acta de grado (archivo PDF)',
  habeasData: 'Autorización de verificación de datos (Habeas Data)',
};

// Carrusel con fotos grandes y poco texto conciso
const carouselSlides = [
  {
    id: 'empresas',
    eyebrow: 'Red de Empleabilidad',
    title: '+280 Empresas Contratando',
    description: 'Vacantes exclusivas que priorizan a graduados de universidades aliadas.',
    image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=900&q=80',
    imageAlt: 'Equipo corporativo cerrando acuerdos laborales',
  },
  {
    id: 'universidad',
    eyebrow: 'Certificación Directa',
    title: 'Validación Digital Oficial',
    description: 'Tu universidad valida y certifica tu diploma directamente en la plataforma.',
    image: 'https://images.pexels.com/photos/267885/pexels-photo-267885.jpeg?auto=compress&cs=tinysrgb&w=900&q=80',
    imageAlt: 'Graduados universitarios celebrando con diplomas',
  },
  {
    id: 'salarios',
    eyebrow: 'Transparencia Laboral',
    title: 'Salarios Claros y Prestaciones',
    description: 'Convocatorias formales con bandas salariales visibles y contratos de ley.',
    image: 'https://images.pexels.com/photos/3184611/pexels-photo-3184611.jpeg?auto=compress&cs=tinysrgb&w=900&q=80',
    imageAlt: 'Profesional trabajando en entorno laboral',
  },
  {
    id: 'seguimiento',
    eyebrow: 'Trazabilidad Continua',
    title: 'Seguimiento de tu Postulación',
    description: 'Conoce en tiempo real el avance de cada una de tus fases de selección.',
    image: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=900&q=80',
    imageAlt: 'Reclutadores revisando candidaturas',
  },
];

// Componente Desplegable de Universidades con Logo y solo el Nombre
function UniversitySelect({ value, onChange, error, universities }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selected = universities.find((u) => u.id === value);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="university"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`min-h-12 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none focus:border-green focus:ring-4 focus:ring-green/10 transition-all flex items-center justify-between gap-2.5 cursor-pointer text-left ${
          error ? 'border-red-600 ring-2 ring-red-100' : 'border-line'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selected ? (
            <>
              {selected.logo ? (
                <img
                  src={selected.logo}
                  alt={selected.shortName}
                  className="size-7 rounded-lg object-contain bg-white border border-line-soft p-0.5 shrink-0"
                />
              ) : (
                <span
                  className={`size-7 rounded-lg font-bold text-[0.65rem] flex items-center justify-center shrink-0 shadow-2xs ${
                    selected.avatarBg || 'bg-slate-700 text-white'
                  }`}
                >
                  {selected.avatarText || <i className={selected.icon || 'bx bx-library'} />}
                </span>
              )}
              <span className="truncate font-bold text-ink">{selected.name}</span>
            </>
          ) : (
            <div className="flex items-center gap-2 text-secondary">
              <i className="bx bx-library text-base" />
              <span>Selecciona la universidad de la cual eres egresado...</span>
            </div>
          )}
        </div>
        <i className={`bx bx-chevron-${isOpen ? 'up' : 'down'} text-lg text-secondary shrink-0 transition-transform`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-64 overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-2xl space-y-0.5"
        >
          {universities.map((uni) => {
            const isSelected = uni.id === value;
            return (
              <button
                key={uni.id}
                type="button"
                onClick={() => {
                  onChange(uni.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer text-left ${
                  isSelected ? 'bg-emerald-50 text-emerald-950 font-bold' : 'hover:bg-page text-ink'
                }`}
              >
                {uni.logo ? (
                  <img
                    src={uni.logo}
                    alt={uni.shortName}
                    className="size-7 rounded-lg object-contain bg-white border border-line-soft p-0.5 shrink-0"
                  />
                ) : (
                  <span
                    className={`size-7 rounded-lg font-bold text-[0.65rem] flex items-center justify-center shrink-0 shadow-2xs ${
                      uni.avatarBg || 'bg-slate-700 text-white'
                    }`}
                  >
                    {uni.avatarText || <i className={uni.icon || 'bx bx-library'} />}
                  </span>
                )}
                <span className="truncate flex-1">{uni.name}</span>
                {isSelected && <i className="bx bx-check text-green text-base shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GraduateRegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateProfile } = useProfile();

  // Tomar datos pasados desde el Hero o desde Google OAuth en la URL
  const searchParams = new URLSearchParams(location.search);
  const paramEmail = searchParams.get('email') || '';
  const paramName = searchParams.get('name') || '';
  const prefilled = location.state || {};

  // Estados Sección 1: Datos Personales (Completamente limpios, sin hardcoding ni falsos prellenados)
  const [docType, setDocType] = useState('CC');
  const [docNumber, setDocNumber] = useState('');
  const [fullName, setFullName] = useState(paramName || prefilled.name || '');
  const [email, setEmail] = useState(paramEmail || prefilled.email || '');
  const [phone, setPhone] = useState('');
  const [dept, setDept] = useState(prefilled.dept || 'Santander');
  const [city, setCity] = useState(prefilled.city || 'Bucaramanga');
  const [cvName] = useState(prefilled.cvName || '');

  // Estados Sección 2: Estudios y Validación (Sin universidad fija por defecto)
  const [selectedUniversityId, setSelectedUniversityId] = useState('');
  const [universities, setUniversities] = useState([]);
  const [catalogError, setCatalogError] = useState('');
  const [career, setCareer] = useState(prefilled.career || '');
  const [educationLevel, setEducationLevel] = useState('Profesional Universitario');
  const [graduationYear, setGraduationYear] = useState('');
  const [diplomaFile, setDiplomaFile] = useState(null);
  const [diplomaError, setDiplomaError] = useState('');
  const [habeasData, setHabeasData] = useState(true);

  // Estados de control y UI
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Carrusel interactivo lado derecho
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const fileInputRef = useRef(null);

  const departments = Object.keys(COLOMBIAN_LOCATIONS);
  const availableCities = dept ? COLOMBIAN_LOCATIONS[dept] || [] : [];
  const selectedUni = universities.find((u) => u.id === selectedUniversityId);

  useEffect(() => {
    let active = true;
    authService.getAcademicCatalog().then((items) => {
      if (active) setUniversities(items);
    }).catch((err) => {
      if (active) setCatalogError(err.message);
    });
    return () => { active = false; };
  }, []);

  // Cambio automático del carrusel cada 6 segundos
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused]);

  function processPdfFile(file) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setDiplomaError('El diploma debe adjuntarse obligatoriamente en formato PDF.');
      setDiplomaFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setDiplomaError('El archivo supera el tamaño máximo permitido de 10 MB.');
      setDiplomaFile(null);
      return;
    }

    setDiplomaError('');
    setDiplomaFile(file);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    processPdfFile(file);
  }

  function validate() {
    const newErrors = {};

    if (!docNumber.trim()) {
      newErrors.docNumber = 'Ingresa el número de tu documento de identidad.';
    }
    if (!fullName.trim()) {
      newErrors.fullName = 'Ingresa tus nombres y apellidos completos.';
    }
    if (!email.trim() || !email.includes('@')) {
      newErrors.email = 'Ingresa tu correo electrónico personal.';
    }
    if (!phone.trim()) {
      newErrors.phone = 'Ingresa un número telefónico o de WhatsApp.';
    }
    if (!password) {
      newErrors.password = 'Crea una contraseña para ingresar a tu cuenta de egresado.';
    } else if (password.length < 8) {
      newErrors.password = 'La contraseña debe contener al menos 8 caracteres.';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Por favor confirma tu contraseña.';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }
    if (!dept) {
      newErrors.dept = 'Selecciona tu departamento.';
    }
    if (!city) {
      newErrors.city = 'Selecciona tu ciudad.';
    }
    if (!selectedUniversityId) {
      newErrors.university = 'Selecciona la universidad de la cual eres egresado.';
    }
    if (!career.trim() || !selectedUni?.programs?.some((name) => name.toLowerCase() === career.trim().toLowerCase())) {
      newErrors.career = 'Selecciona un programa registrado en la institución elegida.';
    }
    if (!/^\d{4}$/.test(graduationYear) || Number(graduationYear) < 1900 || Number(graduationYear) > new Date().getFullYear()) {
      newErrors.graduationYear = 'Indica el año real de graduación.';
    }
    if (!diplomaFile) {
      newErrors.diploma = 'Adjunta tu diploma o acta de grado en formato PDF para validación.';
    }
    if (!habeasData) {
      newErrors.habeasData = 'Debes autorizar la verificación de datos académicos para continuar.';
    }

    setErrors(newErrors);
    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setApiError(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Invocar endpoint real de FastAPI: /api/v1/auth/registro-egresado-form (multipart con PDF real)
      const result = await authService.registerGraduate(
        {
          docType,
          docNumber,
          fullName,
          email,
          phone,
          dept,
          city,
          institutionId: selectedUniversityId,
          career,
          educationLevel,
          graduationYear,
          habeasData,
          password,
        },
        diplomaFile
      );

      // Actualizar perfil global con los datos consolidados
      updateProfile((current) => ({
        ...current,
        id: result.id_egresado || current.id,
        fullName: fullName.trim(),
        name: fullName.trim(),
        documentType: docType,
        documentNumber: docNumber.trim(),
        email: email.trim(),
        phone: phone.trim(),
        location: `${city}, ${dept}`,
        program: career.trim(),
        headline: `${career.trim()} · Graduado`,
        institution: selectedUni?.name || 'Institución Universitaria',
        institutionId: selectedUni?.id || 'otra',
        graduationYear,
        educationLevel,
        diplomaFileName: diplomaFile.name,
        diplomaVerified: false,
        verificationStatus: 'pending',
        registrationCompleted: true,
        ...(cvName ? { cvFileName: cvName } : {}),
      }));

      // 2. Iniciar sesión automáticamente para persistir token JWT en el cliente
      try {
        await authService.login(email.trim().toLowerCase(), password);
      } catch (loginErr) {
        console.warn('Auto-login post-registro no completado (el usuario podrá ingresar manualmente):', loginErr);
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
            <span className="grid size-10 place-items-center rounded-xl bg-[#051F26] text-xl text-lime shadow-xs">
              <i className="bx bx-briefcase" />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-base font-bold tracking-tight text-[#051F26]">VINCULA</span>
              <span className="text-[0.68rem] font-semibold text-secondary">Bolsa de Empleo e IES Aliadas</span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-line bg-page px-3.5 py-1 text-xs font-semibold text-secondary">
              <span className="size-2 rounded-full bg-green" />
              <span>Paso 2 de 2: Completar registro oficial</span>
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
              COLUMNA IZQUIERDA: Formulario por Secciones
          ══════════════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            
            {/* Banner de Bienvenida Limpio y Universal */}
            <div className="rounded-2xl border border-line bg-white p-5 shadow-xs">
              <div className="flex items-start gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#051F26] text-white text-xl">
                  <i className="bx bx-user-check" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="rounded-md bg-panel border border-line px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-secondary">
                    Validación de Egresados · IES
                  </span>
                  <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-[#051F26] sm:text-2xl">
                    Completa tus datos profesionales
                  </h1>
                  <p className="mt-1 text-xs leading-relaxed text-body-muted">
                    Ingresa tus datos personales, selecciona tu universidad de egreso y adjunta tu diploma en PDF para recibir la validación institucional directa ante empresas aliadas.
                  </p>
                </div>
              </div>
            </div>

            {paramEmail && (
              <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50/90 p-4.5 flex items-start gap-3.5 text-sky-950 shadow-xs">
                <i className="bx bxl-google text-2xl text-sky-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-sm text-sky-950 m-0">Registro Oficial con Google</p>
                  <p className="m-0 mt-1 text-sky-800 leading-relaxed">
                    Tu correo <strong className="text-sky-950">{paramEmail}</strong> aún no está registrado en la base de datos de Vincula.
                    Por favor completa los campos de documento, universidad y carrera a continuación para activar tu cuenta de egresado.
                  </p>
                </div>
              </div>
            )}

            <form noValidate onSubmit={handleSubmit} className="space-y-6">

              {/* ──────────────────────────────────────────────────────────
                  SECCIÓN 1: DATOS PERSONALES
              ────────────────────────────────────────────────────────── */}
              <div className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-7 transition-all">
                <div className="mb-5 flex items-center gap-3 border-b border-line-soft pb-4">
                  <span className="grid size-9 place-items-center rounded-xl bg-[#051F26] text-white text-lg shadow-xs">
                    <i className="bx bx-id-card" />
                  </span>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#051F26]">
                      1. DATOS PERSONALES Y CONTACTO
                    </h2>
                    <p className="text-xs text-secondary">
                      Información de identificación oficial y canales de contacto para reclutadores.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Tipo de Documento y Número de Cédula */}
                  <div className="grid gap-3.5 sm:grid-cols-[160px_1fr]">
                    <div>
                      <label htmlFor="docType" className="mb-1.5 block text-xs font-bold text-ink">
                        Tipo de documento <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="docType"
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="min-h-11 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none focus:border-green focus:ring-4 focus:ring-green/10 transition-all cursor-pointer"
                      >
                        <option value="CC">Cédula de Ciudadanía (C.C.)</option>
                        <option value="CE">Cédula de Extranjería (C.E.)</option>
                        <option value="TI">Tarjeta de Identidad (T.I.)</option>
                        <option value="PAS">Pasaporte</option>
                        <option value="PPT">Permiso por Protección Temporal (PPT)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="docNumber" className="mb-1.5 block text-xs font-bold text-ink">
                        Número de documento (Cédula) <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="docNumber"
                        type="text"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        placeholder="Ej: 1098765432"
                        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                          errors.docNumber ? 'border-red-600' : 'border-line'
                        }`}
                      />
                      {errors.docNumber && (
                        <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.docNumber}</p>
                      )}
                    </div>
                  </div>

                  {/* Nombres y Apellidos */}
                  <div>
                    <label htmlFor="fullName" className="mb-1.5 block text-xs font-bold text-ink">
                      Nombres y apellidos completos <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Escribe tus nombres y apellidos completos"
                      autoComplete="name"
                      className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                        errors.fullName ? 'border-red-600' : 'border-line'
                      }`}
                    />
                    {errors.fullName && (
                      <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.fullName}</p>
                    )}
                  </div>

                  {/* Correo y Teléfono (Completamente limpios, sin datos de prueba) */}
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="email" className="mb-1.5 block text-xs font-bold text-ink">
                        Correo electrónico <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu.correo@ejemplo.com"
                        autoComplete="email"
                        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                          errors.email ? 'border-red-600' : 'border-line'
                        }`}
                      />
                      {errors.email && (
                        <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="phone" className="mb-1.5 block text-xs font-bold text-ink">
                        Teléfono celular / WhatsApp <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ej: 318 456 7890"
                        autoComplete="tel"
                        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                          errors.phone ? 'border-red-600' : 'border-line'
                        }`}
                      />
                      {errors.phone && (
                        <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Credenciales de Acceso al Portal de Empleo */}
                  <div className="rounded-2xl border border-line-soft bg-emerald-50/40 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-ink">
                      <span className="grid size-6 place-items-center rounded-lg bg-emerald-100 text-emerald-800 text-sm">
                        <i className="bx bx-lock-alt" />
                      </span>
                      <span className="text-xs font-bold text-[#051F26]">Crea tu Contraseña de Acceso</span>
                    </div>
                    <p className="text-[0.72rem] text-secondary m-0 leading-relaxed">
                      Esta contraseña te permitirá ingresar a tu portal de egresado en cualquier momento junto con tu correo electrónico.
                    </p>

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="password" className="mb-1.5 block text-xs font-bold text-ink">
                          Contraseña de acceso <span className="text-red-600">*</span>
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

                  {/* Ubicación Territorial (Departamento y Ciudad) */}
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="dept" className="mb-1.5 block text-xs font-bold text-ink">
                        Departamento de residencia <span className="text-red-600">*</span>
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
                        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none focus:border-green focus:ring-4 focus:ring-green/10 transition-all cursor-pointer ${
                          errors.dept ? 'border-red-600' : 'border-line'
                        }`}
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
                        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none focus:border-green focus:ring-4 focus:ring-green/10 transition-all cursor-pointer ${
                          errors.city ? 'border-red-600' : 'border-line'
                        }`}
                      >
                        {availableCities.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Resumen de Hoja de Vida (solo si el usuario adjuntó una en el pre-registro) */}
                  {cvName && (
                    <div className="flex items-center justify-between rounded-xl border border-line-soft bg-page p-3 text-xs">
                      <div className="flex items-center gap-2 text-ink">
                        <i className="bx bx-file text-base text-green" />
                        <span className="font-semibold">Hoja de vida precargada:</span>
                        <span className="font-bold text-[#051F26] truncate max-w-[220px]">{cvName}</span>
                      </div>
                      <span className="rounded-md bg-green/15 px-2 py-0.5 text-[0.65rem] font-bold text-green-dark">
                        Vinculada
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────────
                  SECCIÓN 2: ESTUDIOS Y VALIDACIÓN ACADÉMICA
              ────────────────────────────────────────────────────────── */}
              <div className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-7 transition-all">
                <div className="mb-5 flex items-center gap-3 border-b border-line-soft pb-4">
                  <span className="grid size-9 place-items-center rounded-xl bg-green text-white text-lg shadow-xs">
                    <i className="bx bx-graduation" />
                  </span>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#051F26]">
                      2. ESTUDIOS Y VALIDACIÓN ACADÉMICA
                    </h2>
                    <p className="text-xs text-secondary">
                      Selecciona tu institución universitaria y adjunta tu diploma en PDF para certificación oficial.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Desplegable de Universidades con Logo y solo el Nombre */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-ink">
                      Universidad / Institución de egreso <span className="text-red-600">*</span>
                    </label>

                    <UniversitySelect
                      value={selectedUniversityId}
                      onChange={(newId) => { setSelectedUniversityId(newId); setCareer(''); }}
                      error={errors.university}
                      universities={universities}
                    />
                    {catalogError && <p className="mt-1 text-xs text-red-600">{catalogError}</p>}

                    {errors.university && (
                      <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.university}</p>
                    )}
                  </div>

                  {/* Programa Académico / Carrera */}
                  <div>
                    <label htmlFor="career" className="mb-1.5 block text-xs font-bold text-ink">
                      Carrera o programa académico de egreso <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="career"
                      type="text"
                      value={career}
                      onChange={(e) => setCareer(e.target.value)}
                      placeholder="Escribe o selecciona tu carrera (ej: Ingeniería de Sistemas)"
                      list="career-datalist"
                      className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
                        errors.career ? 'border-red-600' : 'border-line'
                      }`}
                    />
                    <datalist id="career-datalist">
                      {(selectedUni?.programs || []).map((prog) => (
                        <option key={prog} value={prog} />
                      ))}
                    </datalist>
                    {errors.career && (
                      <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.career}</p>
                    )}
                  </div>

                  {/* Nivel de Formación y Año de Graduación */}
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="educationLevel" className="mb-1.5 block text-xs font-bold text-ink">
                        Nivel de formación académica <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="educationLevel"
                        value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value)}
                        className="min-h-11 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none focus:border-green focus:ring-4 focus:ring-green/10 transition-all cursor-pointer"
                      >
                        {educationLevels.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="graduationYear" className="mb-1.5 block text-xs font-bold text-ink">
                        Año de graduación / egreso <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="graduationYear"
                        type="number"
                        min="1900"
                        max={new Date().getFullYear()}
                        placeholder="Año real de graduación"
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(e.target.value)}
                        className="min-h-11 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none focus:border-green focus:ring-4 focus:ring-green/10 transition-all cursor-pointer"
                      />
                      {errors.graduationYear && <p className="mt-1 text-xs text-red-600">{errors.graduationYear}</p>}
                    </div>
                  </div>

                  {/* Carga de Diploma en PDF */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-ink">
                      Adjunta tu Diploma o Acta de Grado (en PDF) <span className="text-red-600">*</span>
                    </label>

                    <div
                      id="diploma"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        processPdfFile(file);
                      }}
                      className={`relative flex min-h-[7rem] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
                        isDragging
                          ? 'border-green bg-emerald-100/70 scale-[1.01]'
                          : diplomaFile
                          ? 'border-green bg-emerald-50/50 hover:bg-emerald-50'
                          : errors.diploma || diplomaError
                          ? 'border-red-400 bg-red-50/30 hover:bg-red-50/50'
                          : 'border-line hover:border-green hover:bg-page'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        className="sr-only"
                        onChange={handleFileChange}
                      />

                      {diplomaFile ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="grid size-11 place-items-center rounded-full bg-green text-white text-2xl shadow-xs">
                            <i className="bx bxs-file-pdf" />
                          </span>
                          <p className="font-display text-xs font-bold text-[#051F26]">
                            {diplomaFile.name}
                          </p>
                          <div className="flex items-center gap-2 text-[0.68rem] text-secondary">
                            <span>{(diplomaFile.size / 1024 / 1024).toFixed(2)} MB · Documento PDF</span>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                              ✓ Listo para validar
                            </span>
                          </div>
                          <span className="mt-1 text-[0.68rem] font-semibold text-green-dark underline">
                            Haz clic para cambiar archivo
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="grid size-11 place-items-center rounded-full bg-panel text-2xl text-secondary">
                            <i className="bx bx-upload" />
                          </span>
                          <p className="font-display text-xs font-bold text-[#051F26]">
                            Haz clic aquí para seleccionar o arrastra tu diploma
                          </p>
                          <p className="text-[0.68rem] text-secondary">
                            Formato oficial obligatorio <strong className="text-ink">.PDF</strong> (máx. 10 MB)
                          </p>
                        </div>
                      )}
                    </div>

                    {(errors.diploma || diplomaError) && (
                      <p className="mt-1.5 text-[0.68rem] font-bold text-red-600">
                        {diplomaError || errors.diploma}
                      </p>
                    )}
                  </div>

                  {/* Autorización de Datos */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs leading-relaxed text-secondary select-none">
                      <input
                        id="habeasData"
                        type="checkbox"
                        checked={habeasData}
                        onChange={(e) => setHabeasData(e.target.checked)}
                        className="mt-0.5 size-4 rounded border-line text-green focus:ring-green cursor-pointer"
                      />
                      <span>
                        Autorizo a <strong className="text-ink">Vincula</strong> y a mi{' '}
                        <strong className="text-ink">Institución de Educación Superior</strong> para validar mi estatus de
                        graduado y compartir mi perfil con empresas aliadas conforme a la Ley 1581 de 2012 de Protección
                        de Datos Personales.
                      </span>
                    </label>
                    {errors.habeasData && (
                      <p className="mt-1 text-[0.68rem] font-bold text-red-600">{errors.habeasData}</p>
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

              {/* Alerta de Datos Faltantes antes del botón de finalizar */}
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
                    <span>Faltan los siguientes datos obligatorios para finalizar tu registro:</span>
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
                          {GRADUATE_FIELD_LABELS[key] || msg}
                        </button>
                      </li>
                    ))}
                  </ul>

                  <p className="m-0 mt-3 text-[0.68rem] font-medium text-amber-800">
                    💡 Haz clic sobre cualquiera de los datos anteriores para ir directamente al campo correspondiente.
                  </p>
                </div>
              )}

              {/* Botón de Enviar Registro */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${primaryButton} w-full sm:flex-1 justify-center py-3.5 text-sm font-bold shadow-md shadow-green/20 cursor-pointer ${
                    isSubmitting ? 'opacity-85 cursor-wait' : ''
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <i className="bx bx-loader-alt animate-spin text-lg" />
                      <span>Registrando egresado en Supabase...</span>
                    </>
                  ) : (
                    <>
                      <span>Finalizar registro y acceder al portal</span>
                      <i className="bx bx-right-arrow-alt text-xl" />
                    </>
                  )}
                </button>

                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto text-center px-4 py-3 text-xs font-semibold text-secondary hover:text-ink no-underline"
                >
                  Omitir validación por ahora
                </Link>
              </div>
            </form>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              COLUMNA DERECHA: Carrusel Visual con Fotos Grandes y Poco Texto
          ══════════════════════════════════════════════════════════════ */}
          <div
            className="sticky top-20 rounded-3xl border border-line bg-white shadow-hero overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Foto Superior Grande */}
            <div className="relative h-80 sm:h-96 w-full overflow-hidden bg-[#051F26]">
              <img
                src={carouselSlides[currentSlide].image}
                alt={carouselSlides[currentSlide].imageAlt}
                className="size-full object-cover opacity-90 transition-opacity duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/20" />

              {/* Eyebrow Badge sobre la foto */}
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-[#051F26] shadow-sm">
                  <span className="size-1.5 rounded-full bg-green" />
                  {carouselSlides[currentSlide].eyebrow}
                </span>
              </div>

              {/* Controles de Navegación Manual sobre la Foto */}
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 z-10">
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

              {/* Texto Corto Integrado Sobre la Foto */}
              <div className="absolute bottom-4 left-4 right-16 z-10 space-y-1">
                <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                  {carouselSlides[currentSlide].title}
                </h3>
                <p className="text-xs text-white/85 leading-snug line-clamp-2">
                  {carouselSlides[currentSlide].description}
                </p>
              </div>
            </div>

            {/* Pie Minimalista con Indicadores de Puntos */}
            <div className="p-4 flex items-center justify-between bg-white border-t border-line-soft">
              <span className="text-[0.68rem] text-secondary font-semibold">
                Red de Oportunidades Universitarias
              </span>
              <div className="flex items-center gap-1.5">
                {carouselSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      currentSlide === idx ? 'w-6 bg-green' : 'w-2 bg-line hover:bg-secondary'
                    }`}
                    aria-label={`Ir al slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ─── Modal de Éxito al Completar Registro ─── */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-line bg-white p-6 sm:p-8 text-center shadow-2xl space-y-4">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
              <i className="bx bx-check-double" />
            </span>

            <div className="space-y-1.5">
              <h3 className="font-display text-2xl font-bold tracking-tight text-[#051F26]">
                ¡Registro completado con éxito!
              </h3>
              <p className="text-xs leading-relaxed text-secondary">
                Hola <strong className="text-ink">{fullName}</strong>, tu expediente ha sido radicado ante{' '}
                <strong className="text-ink">{selectedUni?.name || 'tu universidad'}</strong> con tu diploma adjunto.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left text-xs space-y-2">
              <div className="flex items-center justify-between text-emerald-900">
                <span className="font-semibold">Universidad:</span>
                <span className="font-bold truncate max-w-[200px]">{selectedUni?.name || 'Institución Universitaria'}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-900">
                <span className="font-semibold">Programa:</span>
                <span className="font-bold truncate max-w-[200px]">{career}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-900">
                <span className="font-semibold">Diploma adjunto:</span>
                <span className="font-bold text-green-dark truncate max-w-[180px]">
                  {diplomaFile?.name}
                </span>
              </div>
              <div className="flex items-center justify-between text-emerald-900 border-t border-emerald-200/60 pt-2">
                <span className="font-semibold">Cuenta de acceso:</span>
                <span className="font-bold truncate max-w-[200px] text-ink">{email}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-900">
                <span className="font-semibold">Contraseña:</span>
                <span className="rounded-md bg-emerald-100/90 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-800">
                  •••••••• (Configurada)
                </span>
              </div>
              <div className="flex items-center justify-between text-emerald-900 border-t border-emerald-200/60 pt-2">
                <span className="font-semibold">Estado de verificación:</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold text-amber-800">
                  En revisión por asesor IES
                </span>
              </div>
            </div>

            <p className="text-[0.72rem] text-secondary leading-snug">
              Tu sesión ha sido iniciada. También podrás volver a entrar en cualquier momento con tu correo y contraseña o con tu cuenta de Google.
            </p>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className={`${primaryButton} w-full justify-center py-3.5 text-sm font-bold shadow-md shadow-green/25 cursor-pointer`}
            >
              <span>Acceder a mi panel de empleo</span>
              <i className="bx bx-right-arrow-alt text-xl" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
