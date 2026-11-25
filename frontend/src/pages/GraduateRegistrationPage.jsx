import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { primaryButton } from '../utils/classes.js';
import { COLOMBIAN_LOCATIONS } from '../data/profile.js';
import { useProfile } from '../hooks/useProfile.js';
import { authService } from '../services/authService.js';
import RegistrationShell, { ApiError, StepActions, SuccessModal, useRegistrationSteps } from '../components/registration/RegistrationShell.jsx';
import { ConsentCheck, Field, PasswordPair, PdfDropzone, SelectInput, TextInput, inputClass, pdfProblem } from '../components/registration/fields.jsx';

const educationLevels = ['Técnico Profesional', 'Tecnológico', 'Profesional Universitario', 'Especialización', 'Maestría'];

// `fields` son los ids de los campos que valida cada paso
const STEPS = [
  { id: 'personal', title: 'Tus datos', fields: ['docNumber', 'fullName', 'email', 'phone', 'dept', 'city'] },
  { id: 'academic', title: 'Tu formación', fields: ['university', 'career', 'educationLevel', 'graduationYear'] },
  { id: 'security', title: 'Verificación', fields: ['diploma', 'password', 'confirmPassword', 'habeasData'] },
];

const COPY = {
  headline: 'Tu título, respaldado por tu universidad.',
  intro: 'Crea tu cuenta en tres pasos y empieza a postularte a vacantes de empresas aliadas.',
  benefits: [
    { title: 'Diploma validado por tu universidad', text: 'Tu IES revisa el documento y emite un sello digital verificable.' },
    { title: 'Vacantes que sí encajan contigo', text: 'Cada oferta muestra qué tan alineado está tu perfil con lo que piden.' },
    { title: 'Seguimiento de cada postulación', text: 'Consulta en qué fase va tu proceso y recibe avisos por correo.' },
  ],
  footnote: 'Tus datos se tratan conforme a la Ley 1581 de 2012.',
  stepTitles: ['Cuéntanos quién eres', 'Cuéntanos sobre tu formación', 'Verifica tu título y protege tu cuenta'],
  stepIntros: [
    'Estos datos identifican tu expediente y permiten que las empresas te contacten.',
    'Elige la institución y el programa del que egresaste. Debe coincidir con tu diploma.',
    'Adjunta tu diploma para que tu universidad lo valide y crea la contraseña de tu cuenta.',
  ],
};

function UniLogo({ uni }) {
  return uni.logo ? (
    <img src={uni.logo} alt={uni.shortName} className="size-8 shrink-0 rounded-lg border border-line-soft bg-white object-contain p-0.5" />
  ) : (
    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-[0.65rem] font-bold ${uni.avatarBg || 'bg-slate-700 text-white'}`}>
      {uni.avatarText || <i className={uni.icon || 'bx bx-library'} />}
    </span>
  );
}

// Desplegable de universidades con logo y nombre
function UniversitySelect({ value, onChange, error, universities }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selected = universities.find((u) => u.id === value);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
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
        className={`${inputClass(error)} flex cursor-pointer items-center justify-between gap-3 text-left`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-3">
          {selected ? (
            <>
              <UniLogo uni={selected} />
              <span className="truncate font-semibold">{selected.name}</span>
            </>
          ) : (
            <span className="flex items-center gap-2 text-secondary">
              <i className="bx bx-library text-lg" />
              Selecciona tu universidad
            </span>
          )}
        </span>
        <i className={`bx bx-chevron-${isOpen ? 'up' : 'down'} shrink-0 text-xl text-secondary`} />
      </button>

      {isOpen && (
        <div role="listbox" className="absolute left-0 right-0 top-full z-40 mt-2 max-h-64 space-y-0.5 overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-2xl">
          {universities.map((uni) => {
            const isSelected = uni.id === value;
            return (
              <button
                key={uni.id}
                type="button"
                onClick={() => { onChange(uni.id); setIsOpen(false); }}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  isSelected ? 'bg-emerald-50 font-bold text-emerald-950' : 'text-ink hover:bg-page'
                }`}
              >
                <UniLogo uni={uni} />
                <span className="flex-1 truncate">{uni.name}</span>
                {isSelected && <i className="bx bx-check shrink-0 text-lg text-green" />}
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

  // Datos que llegan desde el hero o desde Google OAuth en la URL
  const searchParams = new URLSearchParams(location.search);
  const paramEmail = searchParams.get('email') || '';
  const paramName = searchParams.get('name') || '';
  const prefilled = location.state || {};

  // Paso 1: datos personales
  const [docType, setDocType] = useState('CC');
  const [docNumber, setDocNumber] = useState('');
  const [fullName, setFullName] = useState(paramName || prefilled.name || '');
  const [email, setEmail] = useState(paramEmail || prefilled.email || '');
  const [phone, setPhone] = useState('');
  const [dept, setDept] = useState(prefilled.dept || '');
  const [city, setCity] = useState(prefilled.city || '');

  // Paso 2: formación
  const [selectedUniversityId, setSelectedUniversityId] = useState('');
  const [universities, setUniversities] = useState([]);
  const [catalogError, setCatalogError] = useState('');
  const [career, setCareer] = useState(prefilled.career || '');
  const [educationLevel, setEducationLevel] = useState('');
  const [graduationYear, setGraduationYear] = useState('');

  // Paso 3: verificación y acceso
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [diplomaFile, setDiplomaFile] = useState(null);
  const [diplomaError, setDiplomaError] = useState('');
  const [habeasData, setHabeasData] = useState(true);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

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

  function processPdfFile(file) {
    if (!file) return;
    const problem = pdfProblem(file);
    setDiplomaError(problem);
    setDiplomaFile(problem ? null : file);
  }

  function validate() {
    const e = {};
    if (!docNumber.trim()) e.docNumber = 'Ingresa el número de tu documento.';
    if (!fullName.trim()) e.fullName = 'Ingresa tus nombres y apellidos completos.';
    if (!email.trim() || !email.includes('@')) e.email = 'Ingresa un correo electrónico válido.';
    if (!phone.trim()) e.phone = 'Ingresa un teléfono o número de WhatsApp.';
    if (!dept) e.dept = 'Selecciona tu departamento.';
    if (!city) e.city = 'Selecciona tu ciudad.';
    if (!educationLevel) e.educationLevel = 'Selecciona tu nivel de formación.';
    if (!selectedUniversityId) e.university = 'Selecciona tu universidad de egreso.';
    if (!career.trim() || !selectedUni?.programs?.some((name) => name.toLowerCase() === career.trim().toLowerCase())) {
      e.career = 'Selecciona un programa de la lista de tu universidad.';
    }
    if (!/^\d{4}$/.test(graduationYear) || Number(graduationYear) < 1900 || Number(graduationYear) > new Date().getFullYear()) {
      e.graduationYear = 'Indica el año real de graduación.';
    }
    if (!diplomaFile) e.diploma = 'Adjunta tu diploma o acta de grado en PDF.';
    if (!password) e.password = 'Crea una contraseña.';
    else if (password.length < 8) e.password = 'Debe tener al menos 8 caracteres.';
    if (!confirmPassword) e.confirmPassword = 'Confirma tu contraseña.';
    else if (confirmPassword !== password) e.confirmPassword = 'Las contraseñas no coinciden.';
    if (!habeasData) e.habeasData = 'Debes autorizar la verificación de datos para continuar.';
    return e;
  }

  const { step, setStep, errors, goNext, goBack, validateAll, isLast } = useRegistrationSteps(STEPS, validate);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isLast) return goNext();

    setApiError(null);
    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      // Endpoint real de FastAPI /registro-egresado-form (multipart con el PDF)
      const result = await authService.registerGraduate(
        { docType, docNumber, fullName, email, phone, dept, city, institutionId: selectedUniversityId, career, educationLevel, graduationYear, habeasData, password },
        diplomaFile
      );

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
      }));

      // Inicia sesión automáticamente para dejar el token en el cliente
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

  const googleBanner = paramEmail && (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950">
      <i className="bx bxl-google mt-0.5 shrink-0 text-2xl text-sky-600" />
      <div className="text-xs leading-relaxed">
        <p className="m-0 text-sm font-bold">Registro con Google</p>
        <p className="m-0 mt-1 text-sky-800">
          Tu correo <strong>{paramEmail}</strong> aún no está registrado en Vincula. Completa los datos para activar tu cuenta de egresado.
        </p>
      </div>
    </div>
  );

  return (
    <RegistrationShell copy={COPY} steps={STEPS} step={step} onGoStep={setStep} banner={googleBanner}>
      <form noValidate onSubmit={handleSubmit} className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
        {step === 0 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,13rem)_1fr]">
              <Field id="docType" label="Tipo de documento">
                <SelectInput id="docType" value={docType} onChange={(e) => setDocType(e.target.value)}>
                  <option value="CC">Cédula de ciudadanía</option>
                  <option value="CE">Cédula de extranjería</option>
                  <option value="TI">Tarjeta de identidad</option>
                  <option value="PAS">Pasaporte</option>
                  <option value="PPT">Permiso por protección temporal</option>
                </SelectInput>
              </Field>
              <Field id="docNumber" label="Número de documento" error={errors.docNumber}>
                <TextInput id="docNumber" inputMode="numeric" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="Ej: 1098765432" error={errors.docNumber} />
              </Field>
            </div>

            <Field id="fullName" label="Nombres y apellidos completos" error={errors.fullName}>
              <TextInput id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Como aparece en tu documento" autoComplete="name" error={errors.fullName} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="email" label="Correo electrónico" error={errors.email}>
                <TextInput id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu.correo@ejemplo.com" autoComplete="email" error={errors.email} />
              </Field>
              <Field id="phone" label="Celular / WhatsApp" error={errors.phone}>
                <TextInput id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 318 456 7890" autoComplete="tel" error={errors.phone} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="dept" label="Departamento de residencia" error={errors.dept}>
                <SelectInput
                  id="dept"
                  value={dept}
                  error={errors.dept}
                  onChange={(e) => {
                    setDept(e.target.value);
                    setCity('');
                  }}
                >
                  <option value="" disabled>Selecciona…</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </SelectInput>
              </Field>
              <Field id="city" label="Ciudad o municipio" error={errors.city}>
                <SelectInput id="city" value={city} onChange={(e) => setCity(e.target.value)} error={errors.city}>
                  <option value="" disabled>Selecciona…</option>
                  {availableCities.map((c) => <option key={c} value={c}>{c}</option>)}
                </SelectInput>
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Field id="university" label="Universidad o institución de egreso" error={errors.university}>
              <UniversitySelect
                value={selectedUniversityId}
                onChange={(newId) => { setSelectedUniversityId(newId); setCareer(''); }}
                error={errors.university}
                universities={universities}
              />
              {catalogError && <p className="mt-1.5 text-xs text-red-600">{catalogError}</p>}
            </Field>

            <Field id="career" label="Programa académico" error={errors.career} hint={selectedUniversityId ? undefined : 'Primero elige tu universidad para ver sus programas.'}>
              <TextInput
                id="career"
                value={career}
                onChange={(e) => setCareer(e.target.value)}
                placeholder="Escribe o selecciona tu programa"
                list="career-datalist"
                disabled={!selectedUniversityId}
                error={errors.career}
                className="disabled:cursor-not-allowed disabled:bg-page"
              />
              <datalist id="career-datalist">
                {(selectedUni?.programs || []).map((prog) => <option key={prog} value={prog} />)}
              </datalist>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="educationLevel" label="Nivel de formación" error={errors.educationLevel}>
                <SelectInput id="educationLevel" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} error={errors.educationLevel}>
                  <option value="" disabled>Selecciona…</option>
                  {educationLevels.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
                </SelectInput>
              </Field>
              <Field id="graduationYear" label="Año de graduación" error={errors.graduationYear}>
                <TextInput id="graduationYear" type="number" inputMode="numeric" min="1900" max={new Date().getFullYear()} placeholder={`Ej: ${new Date().getFullYear() - 1}`} value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} error={errors.graduationYear} />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <PdfDropzone id="diploma" label="Diploma o acta de grado (PDF)" file={diplomaFile} error={diplomaError || errors.diploma} onFile={processPdfFile} />
            <PasswordPair password={password} setPassword={setPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} errors={errors} />
            <ConsentCheck id="habeasData" checked={habeasData} onChange={(e) => setHabeasData(e.target.checked)} error={errors.habeasData}>
              Autorizo a <strong className="text-ink">Vincula</strong> y a mi <strong className="text-ink">institución de educación superior</strong> a validar mi título y a compartir mi perfil con empresas aliadas, conforme a la Ley 1581 de 2012.
            </ConsentCheck>
            <ApiError message={apiError} />
          </div>
        )}

        <StepActions
          step={step}
          isLast={isLast}
          isSubmitting={isSubmitting}
          onBack={goBack}
          skipTo="/dashboard"
          submitLabel="Crear mi cuenta"
          submittingLabel="Creando tu cuenta..."
          primaryButton={primaryButton}
        />
      </form>

      {showSuccessModal && (
        <SuccessModal
          icon="bx-check-double"
          title="¡Registro completado!"
          intro={<>Hola <strong className="text-ink">{fullName}</strong>, tu expediente fue radicado ante <strong className="text-ink">{selectedUni?.name || 'tu universidad'}</strong> con tu diploma adjunto.</>}
          rows={[['Programa', career], ['Cuenta de acceso', email], ['Verificación', 'En revisión por tu IES']]}
          note="Tu sesión ya está iniciada. Podrás volver a entrar con tu correo y contraseña o con tu cuenta de Google."
          buttonLabel="Ir a mi panel de empleo"
          onContinue={() => navigate('/dashboard')}
          primaryButton={primaryButton}
        />
      )}
    </RegistrationShell>
  );
}
