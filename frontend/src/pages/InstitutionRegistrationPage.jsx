import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { primaryButton } from '../utils/classes.js';
import { COLOMBIAN_LOCATIONS } from '../data/profile.js';
import { useInstitutionProfile } from '../hooks/useInstitutionProfile.js';
import { authService } from '../services/authService.js';
import RegistrationShell, { ApiError, StepActions, SuccessModal, useRegistrationSteps } from '../components/registration/RegistrationShell.jsx';
import { ConsentCheck, Field, PasswordPair, PdfDropzone, SelectInput, TextInput, pdfProblem } from '../components/registration/fields.jsx';

const ACADEMIC_CHARACTERS = [
  'Institución Universitaria / Escuela Tecnológica',
  'Universidad',
  'Institución Tecnológica',
  'Institución Técnica Profesional',
];

const INSTITUTION_ORIGINS = ['Oficial / Pública', 'Privada'];

// `fields` son los ids de los campos que valida cada paso
const STEPS = [
  { id: 'institution', title: 'Tu institución', fields: ['legalName', 'sniesCode', 'nit', 'phone', 'address'] },
  { id: 'people', title: 'Responsables', fields: ['rectorName', 'advisorName', 'advisorEmail', 'advisorPhone'] },
  { id: 'verify', title: 'Verificación', fields: ['resolucionMen', 'sniesCert', 'actaPosesion', 'rut', 'password', 'confirmPassword', 'juramento'] },
];

const COPY = {
  headline: 'Que el título de tus egresados llegue a las empresas.',
  intro: 'Registra tu institución en tres pasos. Verificamos el reconocimiento ante el MEN antes de habilitar el portal.',
  benefits: [
    { title: 'Valida los diplomas de tus egresados', text: 'Revisa cada expediente y emite un sello digital que las empresas pueden verificar.' },
    { title: 'Convenios con empresas', text: 'Propón alianzas y habilita vacantes exclusivas para tus egresados.' },
    { title: 'Seguimiento de empleabilidad', text: 'Consulta colocación, programas y competencias demandadas en un solo tablero.' },
  ],
  footnote: 'Tus documentos se almacenan de forma privada y se tratan conforme a la Ley 1581 de 2012.',
  stepTitles: ['Cuéntanos sobre tu institución', 'Quién la representa y quién atiende egresados', 'Verifica tu institución y crea tu acceso'],
  stepIntros: [
    'Datos oficiales registrados ante el Ministerio de Educación Nacional y el SNIES.',
    'La autoridad universitaria y el asesor que administrará el portal de egresados.',
    'Adjunta los documentos de reconocimiento (verificación en máximo 72 horas hábiles) y define la contraseña de la cuenta.',
  ],
};

export default function InstitutionRegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, updateProfile } = useInstitutionProfile();

  // Datos precargados desde la landing vía state o perfil existente
  const prefilled = location.state || {};

  // Paso 1: identificación institucional y aval del MEN
  const [legalName, setLegalName] = useState(prefilled.institution || profile?.legalName || profile?.name || '');
  const [acronym, setAcronym] = useState(profile?.acronym || '');
  const [sniesCode, setSniesCode] = useState(prefilled.snies || '');
  const [academicCharacter, setAcademicCharacter] = useState(ACADEMIC_CHARACTERS[0]);
  const [institutionOrigin, setInstitutionOrigin] = useState(INSTITUTION_ORIGINS[0]);
  const [nit, setNit] = useState(profile?.nit || '');
  const [dept, setDept] = useState('Santander');
  const [city, setCity] = useState('Bucaramanga');
  const [address, setAddress] = useState(profile?.address || '');
  const [website, setWebsite] = useState(profile?.website || '');
  const [phone, setPhone] = useState(profile?.phone || '');

  // Paso 2: autoridad universitaria y asesor responsable
  const [rectorName, setRectorName] = useState(profile?.legalRepresentative || '');
  const [rectorDoc, setRectorDoc] = useState('');
  const [advisorName, setAdvisorName] = useState('');
  const [advisorRole, setAdvisorRole] = useState(prefilled.role || 'Asesor de Prácticas y Empleabilidad');
  const [advisorEmail, setAdvisorEmail] = useState(prefilled.email || profile?.contactEmail || '');
  const [advisorPhone, setAdvisorPhone] = useState('');

  // Paso 3: documentos (PDF), contraseña y declaración
  const [resolucionMenFile, setResolucionMenFile] = useState(null);
  const [sniesCertFile, setSniesCertFile] = useState(null);
  const [actaPosesionFile, setActaPosesionFile] = useState(null);
  const [rutFile, setRutFile] = useState(null);
  const [docErrors, setDocErrors] = useState({});
  const [juramento, setJuramento] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [filingNumber, setFilingNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  const departments = Object.keys(COLOMBIAN_LOCATIONS);
  const availableCities = dept ? COLOMBIAN_LOCATIONS[dept] || [] : [];

  const setters = { resolucionMen: setResolucionMenFile, sniesCert: setSniesCertFile, actaPosesion: setActaPosesionFile, rut: setRutFile };

  function handleFile(key, file) {
    if (!file) return;
    const problem = pdfProblem(file);
    setDocErrors((prev) => ({ ...prev, [key]: problem }));
    setters[key](problem ? null : file);
  }

  function validate() {
    const e = {};
    if (!legalName.trim()) e.legalName = 'Ingresa el nombre oficial de la institución.';
    if (!sniesCode.trim()) e.sniesCode = 'Ingresa el código SNIES emitido por el MEN.';
    if (!nit.trim()) e.nit = 'Ingresa el NIT con dígito de verificación.';
    if (!address.trim()) e.address = 'Ingresa la dirección del campus o sede principal.';
    if (!phone.trim()) e.phone = 'Ingresa el teléfono o PBX institucional.';
    if (!rectorName.trim()) e.rectorName = 'Ingresa el nombre del rector(a) o representante legal.';
    if (!advisorName.trim()) e.advisorName = 'Ingresa el nombre del asesor responsable de egresados.';
    if (!advisorEmail.trim() || !advisorEmail.includes('@')) e.advisorEmail = 'Ingresa un correo institucional válido.';
    if (!advisorPhone.trim()) e.advisorPhone = 'Ingresa un celular de contacto institucional.';
    if (!resolucionMenFile) e.resolucionMen = 'Adjunta la resolución de personería jurídica o decreto de creación.';
    if (!sniesCertFile) e.sniesCert = 'Adjunta el certificado de registro activo en el SNIES.';
    if (!actaPosesionFile) e.actaPosesion = 'Adjunta el acta de posesión del rector(a) o acuerdo superior.';
    if (!rutFile) e.rut = 'Adjunta el RUT institucional expedido por la DIAN.';
    if (!password) e.password = 'Crea una contraseña.';
    else if (password.length < 8) e.password = 'Debe tener al menos 8 caracteres.';
    if (!confirmPassword) e.confirmPassword = 'Confirma tu contraseña.';
    else if (confirmPassword !== password) e.confirmPassword = 'Las contraseñas no coinciden.';
    if (!juramento) e.juramento = 'Debes declarar la veracidad de la información para radicar la solicitud.';
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
      // Endpoint real de FastAPI /registro-institucion-form: sube los PDF a Storage y registra la IES
      const result = await authService.registerInstitution(
        { legalName, acronym, sniesCode, academicCharacter, institutionOrigin, nit, dept, city, address, website, advisorEmail, phone, rectorName, rectorDoc, advisorName, advisorRole, password },
        { resolucionMen: resolucionMenFile, sniesCert: sniesCertFile, rut: rutFile }
      );

      const radNumber = result.radicado || '';
      setFilingNumber(radNumber);

      updateProfile((current) => ({
        ...current,
        id: result.institucion_id || current.id,
        legalName: legalName.trim(),
        name: legalName.trim(),
        acronym: acronym.trim() || legalName.trim().substring(0, 8),
        sniesCode: sniesCode.trim(),
        academicCharacter,
        institutionType: institutionOrigin,
        nit: nit.trim(),
        department: dept,
        city,
        address: `${address.trim()}, ${city}, ${dept}`,
        website: website.trim(),
        phone: phone.trim(),
        contactEmail: advisorEmail.trim(),
        legalRepresentative: rectorName.trim(),
        rectorDocument: rectorDoc.trim(),
        advisorContact: { name: advisorName.trim(), role: advisorRole.trim(), phone: advisorPhone.trim(), email: advisorEmail.trim() },
        verificationStatus: 'pending_men_72h',
        verificationSubmittedAt: new Date().toISOString(),
        filingCode: radNumber,
        documentsCount: 4,
      }));

      try {
        await authService.login(advisorEmail.trim().toLowerCase(), password);
      } catch (loginErr) {
        console.warn('Auto-login post registro de institución no completado:', loginErr);
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
    <RegistrationShell copy={COPY} steps={STEPS} step={step} onGoStep={setStep}>
      <form noValidate onSubmit={handleSubmit} className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
        {step === 0 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_minmax(0,11rem)]">
              <Field id="legalName" label="Nombre oficial de la institución" error={errors.legalName}>
                <TextInput id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Ej: Unidades Tecnológicas de Santander" autoComplete="organization" error={errors.legalName} />
              </Field>
              <Field id="acronym" label="Sigla (opcional)">
                <TextInput id="acronym" value={acronym} onChange={(e) => setAcronym(e.target.value)} placeholder="Ej: UTS" />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="sniesCode" label="Código SNIES (MEN)" error={errors.sniesCode}>
                <TextInput id="sniesCode" inputMode="numeric" value={sniesCode} onChange={(e) => setSniesCode(e.target.value)} placeholder="Ej: 1204" error={errors.sniesCode} />
              </Field>
              <Field id="nit" label="NIT con dígito de verificación" error={errors.nit}>
                <TextInput id="nit" value={nit} onChange={(e) => setNit(e.target.value)} placeholder="890.201.213-4" error={errors.nit} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="academicCharacter" label="Carácter académico">
                <SelectInput id="academicCharacter" value={academicCharacter} onChange={(e) => setAcademicCharacter(e.target.value)}>
                  {ACADEMIC_CHARACTERS.map((c) => <option key={c} value={c}>{c}</option>)}
                </SelectInput>
              </Field>
              <Field id="institutionOrigin" label="Naturaleza de la institución">
                <SelectInput id="institutionOrigin" value={institutionOrigin} onChange={(e) => setInstitutionOrigin(e.target.value)}>
                  {INSTITUTION_ORIGINS.map((o) => <option key={o} value={o}>{o}</option>)}
                </SelectInput>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="dept" label="Departamento de la sede principal">
                <SelectInput
                  id="dept"
                  value={dept}
                  onChange={(e) => {
                    setDept(e.target.value);
                    setCity(COLOMBIAN_LOCATIONS[e.target.value]?.[0] || '');
                  }}
                >
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </SelectInput>
              </Field>
              <Field id="city" label="Ciudad o municipio">
                <SelectInput id="city" value={city} onChange={(e) => setCity(e.target.value)}>
                  {availableCities.map((c) => <option key={c} value={c}>{c}</option>)}
                </SelectInput>
              </Field>
            </div>

            <Field id="address" label="Dirección del campus o sede principal" error={errors.address}>
              <TextInput id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle de los Estudiantes # 9-82, Ciudadela Real de Minas" error={errors.address} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="phone" label="Teléfono o PBX institucional" error={errors.phone}>
                <TextInput id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+57 (607) 680 0600" error={errors.phone} />
              </Field>
              <Field id="website" label="Sitio web (opcional)">
                <TextInput id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://www.institucion.edu.co" />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="rectorName" label="Rector(a) o representante legal" error={errors.rectorName}>
                <TextInput id="rectorName" value={rectorName} onChange={(e) => setRectorName(e.target.value)} placeholder="Nombres y apellidos" error={errors.rectorName} />
              </Field>
              <Field id="rectorDoc" label="Cédula del rector(a) (opcional)">
                <TextInput id="rectorDoc" inputMode="numeric" value={rectorDoc} onChange={(e) => setRectorDoc(e.target.value)} placeholder="Ej: 91245890" />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="advisorName" label="Asesor responsable de egresados" error={errors.advisorName}>
                <TextInput id="advisorName" value={advisorName} onChange={(e) => setAdvisorName(e.target.value)} placeholder="Nombres y apellidos" error={errors.advisorName} />
              </Field>
              <Field id="advisorRole" label="Cargo en la institución">
                <TextInput id="advisorRole" value={advisorRole} onChange={(e) => setAdvisorRole(e.target.value)} placeholder="Directora de Prácticas y Egresados" />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="advisorEmail" label="Correo institucional (será tu usuario)" error={errors.advisorEmail}>
                <TextInput id="advisorEmail" type="email" value={advisorEmail} onChange={(e) => setAdvisorEmail(e.target.value)} placeholder="asesor@institucion.edu.co" autoComplete="email" error={errors.advisorEmail} />
              </Field>
              <Field id="advisorPhone" label="Celular / WhatsApp" error={errors.advisorPhone}>
                <TextInput id="advisorPhone" type="tel" value={advisorPhone} onChange={(e) => setAdvisorPhone(e.target.value)} placeholder="Ej: 318 456 7890" error={errors.advisorPhone} />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <PdfDropzone id="resolucionMen" label="Resolución de personería jurídica o reconocimiento" hint="Decreto, ley u ordenanza del MEN" file={resolucionMenFile} error={docErrors.resolucionMen || errors.resolucionMen} onFile={(f) => handleFile('resolucionMen', f)} />
            <PdfDropzone id="sniesCert" label="Certificado de registro activo en el SNIES" hint="Descargado del portal SNIES" file={sniesCertFile} error={docErrors.sniesCert || errors.sniesCert} onFile={(f) => handleFile('sniesCert', f)} />
            <PdfDropzone id="actaPosesion" label="Acta de posesión del rector(a) o acuerdo superior" hint="Representación legal" file={actaPosesionFile} error={docErrors.actaPosesion || errors.actaPosesion} onFile={(f) => handleFile('actaPosesion', f)} />
            <PdfDropzone id="rut" label="RUT institucional" hint="DIAN, vigente" file={rutFile} error={docErrors.rut || errors.rut} onFile={(f) => handleFile('rut', f)} />

            <PasswordPair password={password} setPassword={setPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} errors={errors} />

            <ConsentCheck id="juramento" checked={juramento} onChange={(e) => setJuramento(e.target.checked)} error={errors.juramento}>
              Declaro bajo la gravedad de juramento que la institución cuenta con personería jurídica y registro activo vigente ante el <strong className="text-ink">Ministerio de Educación Nacional (MEN)</strong> y el <strong className="text-ink">SNIES</strong>, y autorizo a <strong className="text-ink">Vincula</strong> a validar la autenticidad institucional y académica conforme a la Ley 30 de 1992 y la Ley 1581 de 2012.
            </ConsentCheck>
            <ApiError message={apiError} />
          </div>
        )}

        <StepActions
          step={step}
          isLast={isLast}
          isSubmitting={isSubmitting}
          onBack={goBack}
          skipTo="/institucion/dashboard"
          submitLabel="Enviar para revisión"
          submittingLabel="Enviando solicitud..."
          primaryButton={primaryButton}
        />
      </form>

      {showSuccessModal && (
        <SuccessModal
          icon="bx-award"
          badge="Verificación MEN: máximo 72 horas hábiles"
          title="¡Expediente radicado!"
          intro={<>Los documentos de <strong className="text-ink">{legalName}</strong> (SNIES {sniesCode}) ingresaron a la cola de auditoría institucional.</>}
          rows={[
            ...(filingNumber ? [['Número de radicado', filingNumber]] : []),
            ['Documentos en revisión', '4 archivos PDF'],
            ['Cuenta de acceso', advisorEmail],
          ]}
          files={[resolucionMenFile?.name, sniesCertFile?.name, actaPosesionFile?.name, rutFile?.name].filter(Boolean)}
          note="Tu sesión ya está iniciada en modo preliminar. Podrás volver a entrar con tu correo institucional y la contraseña que acabas de crear."
          buttonLabel="Ingresar al portal de la institución"
          onContinue={() => navigate('/institucion/dashboard')}
          primaryButton={primaryButton}
        />
      )}
    </RegistrationShell>
  );
}
