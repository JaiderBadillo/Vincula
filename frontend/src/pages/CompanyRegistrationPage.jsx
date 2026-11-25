import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { primaryButton } from '../utils/classes.js';
import { COLOMBIAN_LOCATIONS } from '../data/profile.js';
import { COMPANY_SECTORS, COMPANY_SIZES } from '../data/companyAdminData.js';
import { useCompanyProfile } from '../hooks/useCompanyProfile.js';
import { authService } from '../services/authService.js';
import { NIT_PATTERN } from '../utils/formatters.js';
import RegistrationShell, { ApiError, StepActions, SuccessModal, useRegistrationSteps } from '../components/registration/RegistrationShell.jsx';
import { ConsentCheck, Field, PasswordPair, PdfDropzone, SelectInput, TextInput, pdfProblem } from '../components/registration/fields.jsx';

// `fields` son los ids de los campos que valida cada paso
const STEPS = [
  { id: 'company', title: 'Tu empresa', fields: ['legalName', 'commercialName', 'nit', 'companyPhone', 'address'] },
  { id: 'people', title: 'Responsables', fields: ['legalRepName', 'legalRepDoc', 'recruiterName', 'recruiterEmail', 'recruiterPhone'] },
  { id: 'verify', title: 'Verificación', fields: ['camaraComercio', 'rut', 'legalRepId', 'password', 'confirmPassword', 'juramento'] },
];

const COPY = {
  headline: 'Contrata talento con título verificado.',
  intro: 'Registra tu organización en tres pasos. Revisamos tus documentos antes de habilitar la publicación de vacantes.',
  benefits: [
    { title: 'Egresados con diploma validado', text: 'Cada candidato pasa por la verificación de su universidad antes de postularse.' },
    { title: 'Empresas verificadas', text: 'Revisamos Cámara de Comercio, RUT y representante legal en un plazo máximo de 72 horas hábiles.' },
    { title: 'Selección en un solo lugar', text: 'Publica vacantes, revisa postulantes por afinidad y agenda entrevistas desde el portal.' },
  ],
  footnote: 'Tus documentos se almacenan de forma privada y se tratan conforme a la Ley 1581 de 2012.',
  stepTitles: ['Cuéntanos sobre tu empresa', 'Quién la representa y quién selecciona', 'Verifica tu empresa y crea tu acceso'],
  stepIntros: [
    'Datos tal como figuran en la Cámara de Comercio y el RUT.',
    'La persona facultada legalmente y el contacto que administrará las vacantes.',
    'Adjunta los documentos legales para la revisión y define la contraseña de la cuenta.',
  ],
};

export default function CompanyRegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, updateProfile } = useCompanyProfile();

  // Datos precargados desde la landing vía state o del perfil de empresa existente
  const prefilled = location.state || {};

  // Paso 1: datos corporativos y tributarios
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

  // Paso 2: representación legal y contacto de reclutamiento
  const [legalRepName, setLegalRepName] = useState(profile?.legalRepresentative?.name || '');
  const [legalRepDoc, setLegalRepDoc] = useState(profile?.legalRepresentative?.document || '');
  const [recruiterName, setRecruiterName] = useState('');
  const [recruiterRole, setRecruiterRole] = useState('Líder de Atracción de Talento & Selección');
  const [recruiterEmail, setRecruiterEmail] = useState(prefilled.email || profile?.email || '');
  const [recruiterPhone, setRecruiterPhone] = useState('');

  // Paso 3: documentos (PDF), contraseña y declaración
  const [camaraComercioFile, setCamaraComercioFile] = useState(null);
  const [rutFile, setRutFile] = useState(null);
  const [legalRepIdFile, setLegalRepIdFile] = useState(null);
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

  const docs = {
    camaraComercio: { file: camaraComercioFile, set: setCamaraComercioFile },
    rut: { file: rutFile, set: setRutFile },
    legalRepId: { file: legalRepIdFile, set: setLegalRepIdFile },
  };

  function handleFile(key, file) {
    if (!file) return;
    const problem = pdfProblem(file);
    setDocErrors((prev) => ({ ...prev, [key]: problem }));
    docs[key].set(problem ? null : file);
  }

  function validate() {
    const e = {};
    if (!legalName.trim()) e.legalName = 'Ingresa la razón social completa.';
    if (!commercialName.trim()) e.commercialName = 'Ingresa el nombre comercial o marca.';
    if (!NIT_PATTERN.test(nit.trim())) e.nit = 'Ingresa el NIT con dígito de verificación, así: 900.123.456-7';
    if (!address.trim()) e.address = 'Ingresa la dirección de la sede principal.';
    if (!companyPhone.trim()) e.companyPhone = 'Ingresa el teléfono o PBX corporativo.';
    if (!legalRepName.trim()) e.legalRepName = 'Ingresa los nombres y apellidos del representante legal.';
    if (!legalRepDoc.trim()) e.legalRepDoc = 'Ingresa la cédula del representante legal.';
    if (!recruiterName.trim()) e.recruiterName = 'Ingresa el nombre de la persona responsable de talento.';
    if (!recruiterEmail.trim() || !recruiterEmail.includes('@')) e.recruiterEmail = 'Ingresa un correo corporativo válido.';
    if (!recruiterPhone.trim()) e.recruiterPhone = 'Ingresa un celular de contacto directo.';
    if (!camaraComercioFile) e.camaraComercio = 'Adjunta el certificado de Cámara de Comercio.';
    if (!rutFile) e.rut = 'Adjunta el RUT vigente expedido por la DIAN.';
    if (!legalRepIdFile) e.legalRepId = 'Adjunta la cédula del representante legal.';
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
      // Endpoint real de FastAPI /registro-empresa-form: sube los PDF a Storage y deja la empresa en cuarentena
      const result = await authService.registerCompany(
        { legalName, commercialName, nit, sector, companySize, dept, city, address, companyPhone, website, legalRepName, legalRepDoc, recruiterName, recruiterRole, recruiterEmail, recruiterPhone, password },
        { camaraComercio: camaraComercioFile, rut: rutFile, cedulaRepLegal: legalRepIdFile }
      );

      const radNumber = result.radicado || '';
      setFilingNumber(radNumber);

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
        legalRepresentative: { name: legalRepName.trim(), document: legalRepDoc.trim() },
        verificationStatus: 'pending_72h',
        verificationSubmittedAt: new Date().toISOString(),
        filingCode: radNumber,
        documentsCount: 3,
      }));

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
    <RegistrationShell copy={COPY} steps={STEPS} step={step} onGoStep={setStep}>
      <form noValidate onSubmit={handleSubmit} className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
        {step === 0 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="legalName" label="Razón social" error={errors.legalName}>
                <TextInput id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Ej: Constructora Marval S.A.S." autoComplete="organization" error={errors.legalName} />
              </Field>
              <Field id="commercialName" label="Nombre comercial o marca" error={errors.commercialName}>
                <TextInput id="commercialName" value={commercialName} onChange={(e) => setCommercialName(e.target.value)} placeholder="Ej: Marval" error={errors.commercialName} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="nit" label="NIT con dígito de verificación" error={errors.nit}>
                <TextInput id="nit" value={nit} onChange={(e) => setNit(e.target.value)} placeholder="900.123.456-7" error={errors.nit} />
              </Field>
              <Field id="sector" label="Sector económico">
                <SelectInput id="sector" value={sector} onChange={(e) => setSector(e.target.value)}>
                  {COMPANY_SECTORS.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
                </SelectInput>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="companySize" label="Tamaño de la organización">
                <SelectInput id="companySize" value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
                  {COMPANY_SIZES.map((sz) => <option key={sz} value={sz}>{sz}</option>)}
                </SelectInput>
              </Field>
              <Field id="companyPhone" label="Teléfono corporativo o PBX" error={errors.companyPhone}>
                <TextInput id="companyPhone" type="tel" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+57 (607) 645 8800" error={errors.companyPhone} />
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="address" label="Dirección de la sede principal" error={errors.address}>
                <TextInput id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Carrera 27 # 36-14, Edificio Empresarial" error={errors.address} />
              </Field>
              <Field id="website" label="Sitio web (opcional)">
                <TextInput id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://tuempresa.com.co" />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="legalRepName" label="Representante legal" error={errors.legalRepName}>
                <TextInput id="legalRepName" value={legalRepName} onChange={(e) => setLegalRepName(e.target.value)} placeholder="Nombres y apellidos" error={errors.legalRepName} />
              </Field>
              <Field id="legalRepDoc" label="Cédula del representante legal" error={errors.legalRepDoc}>
                <TextInput id="legalRepDoc" inputMode="numeric" value={legalRepDoc} onChange={(e) => setLegalRepDoc(e.target.value)} placeholder="Ej: 91245890" error={errors.legalRepDoc} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="recruiterName" label="Responsable de talento / RR. HH." error={errors.recruiterName}>
                <TextInput id="recruiterName" value={recruiterName} onChange={(e) => setRecruiterName(e.target.value)} placeholder="Nombres y apellidos" error={errors.recruiterName} />
              </Field>
              <Field id="recruiterRole" label="Cargo en la organización">
                <TextInput id="recruiterRole" value={recruiterRole} onChange={(e) => setRecruiterRole(e.target.value)} placeholder="Directora de Gestión Humana" />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="recruiterEmail" label="Correo corporativo (será tu usuario)" error={errors.recruiterEmail}>
                <TextInput id="recruiterEmail" type="email" value={recruiterEmail} onChange={(e) => setRecruiterEmail(e.target.value)} placeholder="talento@tuempresa.com" autoComplete="email" error={errors.recruiterEmail} />
              </Field>
              <Field id="recruiterPhone" label="Celular / WhatsApp" error={errors.recruiterPhone}>
                <TextInput id="recruiterPhone" type="tel" value={recruiterPhone} onChange={(e) => setRecruiterPhone(e.target.value)} placeholder="Ej: 315 890 1234" error={errors.recruiterPhone} />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <PdfDropzone id="camaraComercio" label="Certificado de existencia y representación legal" hint="Cámara de Comercio, vigencia máxima de 90 días" file={camaraComercioFile} error={docErrors.camaraComercio || errors.camaraComercio} onFile={(f) => handleFile('camaraComercio', f)} />
            <PdfDropzone id="rut" label="Registro Único Tributario (RUT)" hint="DIAN, vigente" file={rutFile} error={docErrors.rut || errors.rut} onFile={(f) => handleFile('rut', f)} />
            <PdfDropzone id="legalRepId" label="Cédula del representante legal" hint="Ambas caras en un solo PDF" file={legalRepIdFile} error={docErrors.legalRepId || errors.legalRepId} onFile={(f) => handleFile('legalRepId', f)} />

            <PasswordPair password={password} setPassword={setPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} errors={errors} />

            <ConsentCheck id="juramento" checked={juramento} onChange={(e) => setJuramento(e.target.checked)} error={errors.juramento}>
              Declaro bajo la gravedad de juramento que la información y los documentos adjuntos son veraces, y autorizo a <strong className="text-ink">Vincula</strong> y a las <strong className="text-ink">instituciones de educación superior aliadas</strong> a verificar los antecedentes empresariales y tributarios, conforme a la Ley 1581 de 2012.
            </ConsentCheck>
            <ApiError message={apiError} />
          </div>
        )}

        <StepActions
          step={step}
          isLast={isLast}
          isSubmitting={isSubmitting}
          onBack={goBack}
          skipTo="/empresa/admin/perfil"
          submitLabel="Enviar para revisión"
          submittingLabel="Enviando solicitud..."
          primaryButton={primaryButton}
        />
      </form>

      {showSuccessModal && (
        <SuccessModal
          icon="bx-time-five"
          badge="Revisión: máximo 72 horas hábiles"
          title="¡Solicitud radicada!"
          intro={<>Los documentos de <strong className="text-ink">{legalName}</strong> (NIT {nit}) ingresaron a la cola de auditoría jurídica de Vincula.</>}
          rows={[
            ...(filingNumber ? [['Número de radicado', filingNumber]] : []),
            ['Documentos en revisión', '3 archivos PDF'],
            ['Cuenta de acceso', recruiterEmail],
          ]}
          files={[camaraComercioFile?.name, rutFile?.name, legalRepIdFile?.name].filter(Boolean)}
          note="Tu sesión ya está iniciada en modo preliminar. Podrás volver a entrar con tu correo corporativo y la contraseña que acabas de crear."
          buttonLabel="Ingresar al portal de empresa"
          onContinue={() => navigate('/empresa/admin/perfil')}
          primaryButton={primaryButton}
        />
      )}
    </RegistrationShell>
  );
}
