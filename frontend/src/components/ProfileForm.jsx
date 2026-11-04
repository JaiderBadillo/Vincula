import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { primaryButton } from '../utils/classes.js';
import { COLOMBIAN_LOCATIONS } from '../data/profile.js';
import { useProfile } from '../hooks/useProfile.js';

const careerSuggestions = [
  'Ingeniería de Sistemas',
  'Ingeniería Electromecánica',
  'Ingeniería Electrónica',
  'Ingeniería Industrial',
  'Ingeniería Ambiental',
  'Ingeniería Civil',
  'Ingeniería de Telecomunicaciones',
  'Administración de Empresas',
  'Administración Financiera',
  'Contaduría Pública',
  'Tecnología en Desarrollo de Software',
  'Tecnología en Sistemas de Información',
  'Tecnología en Gestión Empresarial',
  'Tecnología en Manejo de la Información Contable',
  'Tecnología en Electricidad Industrial',
  'Tecnología en Electromecánica',
  'Tecnología en Topografía',
  'Tecnología en Recursos Ambientales',
  'Tecnología en Mercadeo y Gestión Comercial',
  'Psicología',
  'Derecho',
];

const companySectors = [
  'Tecnología, Software & Datos',
  'Construcción & Obras Civiles',
  'Banca, Finanzas & Fintech',
  'Energía, Hidrocarburos & Minería',
  'Manufactura & Agroindustria',
  'Servicios Globales & BPO',
  'Sector Público & Gubernamental',
  'Comercio & Logística',
];

const iesCampuses = [
  'Sede Principal / Campus Central',
  'Sede Bucaramanga',
  'Sede Floridablanca',
  'Sede Piedecuesta',
  'Sede Barrancabermeja',
  'Sede San Gil',
  'Sede Cúcuta',
  'Sede Bogotá D.C.',
  'Sede Medellín',
  'Otra sede regional',
];

const iesRoles = [
  'Asesor de Prácticas y Empleabilidad',
  'Coordinador de Programa Académico',
  'Decano / Director de Facultad',
  'Administrador de Egresados & Graduados',
];

function FormField({ label, id, value, onChange, options, placeholder, error, autoComplete, type = 'text', list }) {
  const fieldClasses = `min-h-11 w-full rounded-[0.72rem] border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all ${
    error ? 'border-red-600' : ''
  }`;

  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-ink" htmlFor={id}>
        {label}
      </label>
      {options ? (
        <select
          className={fieldClasses}
          id={id}
          value={value}
          onChange={onChange}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={fieldClasses}
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          list={list}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      )}
      {error && (
        <p className="mt-1 text-[0.68rem] font-bold text-red-700" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function ProfileForm() {
  const navigate = useNavigate();
  const { updateProfile } = useProfile();
  const [activeTab, setActiveTab] = useState('egresado'); // 'egresado' | 'empresa' | 'ies'

  // Form states
  const [gradValues, setGradValues] = useState({
    name: '',
    career: '',
    dept: 'Santander',
    city: 'Bucaramanga',
  });
  const [companyValues, setCompanyValues] = useState({ name: '', nit: '', sector: '', email: '' });
  const [iesValues, setIesValues] = useState({
    institution: '',
    snies: '',
    role: 'Asesor de Prácticas y Empleabilidad',
    email: '',
  });

  const departments = Object.keys(COLOMBIAN_LOCATIONS);
  const availableCities = gradValues.dept ? COLOMBIAN_LOCATIONS[gradValues.dept] || [] : [];

  const [cvName, setCvName] = useState('PDF o documento de texto · opcional');
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState('');

  function handleGradSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setFeedback('');
    if (!gradValues.name.trim() || !gradValues.career.trim() || !gradValues.dept || !gradValues.city) {
      return;
    }

    // Sincronizar datos iniciales con el perfil global de la plataforma
    updateProfile((current) => ({
      ...current,
      name: gradValues.name.trim(),
      headline: gradValues.career.trim(),
      location: `${gradValues.city}, ${gradValues.dept}`,
      ...(cvName && cvName !== 'PDF o documento de texto · opcional' ? { cvFileName: cvName } : {}),
    }));

    setFeedback(`¡Pre-registro recibido, ${gradValues.name.trim().split(' ')[0]}! Continuando al paso de validación oficial...`);
    setTimeout(() => {
      navigate('/registro-egresado', {
        state: {
          name: gradValues.name.trim(),
          career: gradValues.career.trim(),
          dept: gradValues.dept,
          city: gradValues.city,
          cvName: cvName !== 'PDF o documento de texto · opcional' ? cvName : '',
        },
      });
    }, 1000);
  }

  function handleCompanySubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setFeedback('');
    if (!companyValues.name.trim() || !companyValues.nit.trim() || !companyValues.sector || !companyValues.email.trim()) return;

    setFeedback(`¡Pre-registro recibido, ${companyValues.name}! Continuando a la radicación de documentos (SLA 72h)...`);
    setTimeout(() => {
      navigate('/registro-empresa', {
        state: {
          name: companyValues.name.trim(),
          nit: companyValues.nit.trim(),
          sector: companyValues.sector,
          email: companyValues.email.trim(),
        },
      });
    }, 1000);
  }

  function handleIesSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setFeedback('');
    if (!iesValues.institution.trim() || !iesValues.snies.trim() || !iesValues.email.trim() || !iesValues.role) return;

    setFeedback(`¡Pre-registro recibido, ${iesValues.institution}! Continuando a la radicación y aval del MEN...`);
    setTimeout(() => {
      navigate('/registro-institucion', {
        state: {
          institution: iesValues.institution.trim(),
          snies: iesValues.snies.trim(),
          role: iesValues.role,
          email: iesValues.email.trim(),
        },
      });
    }, 1000);
  }

  return (
    <div className="relative rounded-card border border-line bg-page p-5 text-ink shadow-hero sm:p-7">
      {/* ─── Pestañas de Rol (Egresado / Empresa / IES) ─── */}
      <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-panel p-1 border border-line-soft">
        <button
          type="button"
          onClick={() => {
            setActiveTab('egresado');
            setFeedback('');
            setSubmitted(false);
          }}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-1 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'egresado'
              ? 'bg-[#051F26] text-white shadow-xs'
              : 'text-secondary hover:text-ink hover:bg-white/60'
          }`}
          aria-label="Registrarse como Egresado"
        >
          <i className="bx bx-user text-sm" />
          <span className="truncate">Egresado</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('empresa');
            setFeedback('');
            setSubmitted(false);
          }}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-1 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'empresa'
              ? 'bg-[#051F26] text-white shadow-xs'
              : 'text-secondary hover:text-ink hover:bg-white/60'
          }`}
          aria-label="Registrarse como Empresa"
        >
          <i className="bx bx-buildings text-sm" />
          <span className="truncate">Empresa</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('ies');
            setFeedback('');
            setSubmitted(false);
          }}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-1 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ies'
              ? 'bg-[#051F26] text-white shadow-xs'
              : 'text-secondary hover:text-ink hover:bg-white/60'
          }`}
          aria-label="Acceder como IES Universitaria"
        >
          <i className="bx bx-library text-sm" />
          <span className="truncate">IES / U.</span>
        </button>
      </div>

      {/* ─── TAB 1: EGRESADO (PRE-REGISTRO) ─── */}
      {activeTab === 'egresado' && (
        <div>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-blue-muted">
                Talento Universitario · IES
              </p>
              <h2 className="font-display text-xl font-semibold leading-tight tracking-tight sm:text-2xl text-ink">
                Pre-registro de Egresado
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-body-muted">
                Ingresa tus datos clave para acceder de inmediato al portal y vacantes afines de instituciones aliadas.
              </p>
            </div>
            <span
              className="grid size-10 shrink-0 place-items-center rounded-control bg-panel text-xl text-blue-muted"
              aria-hidden="true"
            >
              <i className="bx bx-user-pin" />
            </span>
          </div>

          <form noValidate onSubmit={handleGradSubmit}>
            {/* Nombres y apellidos */}
            <div className="mb-3">
              <FormField
                label="Nombres y apellidos"
                id="profile-name"
                value={gradValues.name}
                onChange={(e) => setGradValues((p) => ({ ...p, name: e.target.value }))}
                placeholder="Escribe tu nombre completo"
                autoComplete="name"
                error={submitted && !gradValues.name.trim() ? 'Ingresa tus nombres y apellidos.' : ''}
              />
            </div>

            {/* Carrera de la cual es egresado */}
            <div className="mb-3">
              <FormField
                label="Carrera de la cual eres egresado"
                id="profile-career"
                value={gradValues.career}
                onChange={(e) => setGradValues((p) => ({ ...p, career: e.target.value }))}
                placeholder="Escribe o selecciona tu carrera (ej: Ingeniería de Sistemas)"
                list="career-suggestions"
                error={submitted && !gradValues.career.trim() ? 'Escribe o selecciona tu carrera de egreso.' : ''}
              />
              <datalist id="career-suggestions">
                {careerSuggestions.map((prog) => (
                  <option key={prog} value={prog} />
                ))}
              </datalist>
            </div>

            {/* Ciudad donde está ubicado (Desplegables completos Departamento y Ciudad) */}
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <FormField
                label="Departamento"
                id="profile-dept"
                value={gradValues.dept}
                onChange={(e) => {
                  const newDept = e.target.value;
                  const firstCity = COLOMBIAN_LOCATIONS[newDept]?.[0] || '';
                  setGradValues((p) => ({ ...p, dept: newDept, city: firstCity }));
                }}
                options={departments}
                placeholder="Selecciona departamento"
                error={submitted && !gradValues.dept ? 'Selecciona departamento.' : ''}
              />
              <FormField
                label="Ciudad donde estás ubicado"
                id="profile-city"
                value={gradValues.city}
                onChange={(e) => setGradValues((p) => ({ ...p, city: e.target.value }))}
                options={availableCities}
                placeholder={gradValues.dept ? 'Selecciona tu ciudad' : 'Primero elige departamento'}
                error={submitted && !gradValues.city ? 'Selecciona ciudad.' : ''}
              />
            </div>

            {/* Adjunta tu hoja de vida */}
            <label
              className="flex min-h-[3.6rem] cursor-pointer items-center gap-3 rounded-control border border-dashed border-[#cbd7db] bg-white px-3.5 py-2.5 text-blue-muted hover:border-green focus-within:border-green transition-colors"
              htmlFor="profile-cv"
            >
              <i className="bx bx-upload text-xl text-green-dark" aria-hidden="true" />
              <span className="grid min-w-0 gap-0.5">
                <span className="text-xs font-bold text-ink">Adjunta tu hoja de vida</span>
                <span className="truncate text-[0.68rem] text-secondary" id="cv-hint">
                  {cvName}
                </span>
              </span>
              <i className="bx bx-plus ml-auto text-base text-body-muted" aria-hidden="true" />
              <input
                className="sr-only"
                id="profile-cv"
                type="file"
                accept=".pdf,.doc,.docx"
                aria-describedby="cv-hint"
                onChange={(event) =>
                  setCvName(event.target.files?.[0]?.name || 'PDF o documento de texto · opcional')
                }
              />
            </label>

            {/* Botón de Pre-Registro */}
            <button className={`${primaryButton} mt-4 w-full justify-between px-5 py-3.5 text-xs sm:text-sm`} type="submit">
              <span>Completar pre-registro y entrar</span>
              <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />
            </button>

            <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3 text-[0.72rem] text-body-muted">
              <span>¿Ya estás registrado?</span>
              <Link to="/login" className="font-bold text-green-dark hover:underline no-underline">
                Iniciar sesión como egresado →
              </Link>
            </div>

            {feedback && (
              <p className="mt-3 rounded-control border border-green/20 bg-green/10 p-2.5 text-xs text-ink font-semibold" role="status" aria-live="polite">
                {feedback}
              </p>
            )}
          </form>
        </div>
      )}

      {/* ─── TAB 2: EMPRESA ─── */}
      {activeTab === 'empresa' && (
        <div>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-amber-700">
                Portal Empleadores
              </p>
              <h2 className="font-display text-xl font-semibold leading-tight tracking-tight sm:text-2xl text-ink">
                Registra tu empresa
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-body-muted">
                Publica ofertas y conecta con graduados técnicos y profesionales verificados.
              </p>
            </div>
            <span
              className="grid size-10 shrink-0 place-items-center rounded-control bg-amber-50 text-xl text-amber-700 border border-amber-200"
              aria-hidden="true"
            >
              <i className="bx bx-buildings" />
            </span>
          </div>

          <form noValidate onSubmit={handleCompanySubmit}>
            <div className="mb-3">
              <FormField
                label="Nombre o Razón Social"
                id="company-name"
                value={companyValues.name}
                onChange={(e) => setCompanyValues((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Bancolombia, Ecopetrol, Constructora..."
                autoComplete="organization"
                error={submitted && !companyValues.name.trim() ? 'Ingresa el nombre de la empresa.' : ''}
              />
            </div>

            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <FormField
                label="NIT o RUT"
                id="company-nit"
                value={companyValues.nit}
                onChange={(e) => setCompanyValues((p) => ({ ...p, nit: e.target.value }))}
                placeholder="900.123.456-7"
                error={submitted && !companyValues.nit.trim() ? 'Ingresa el NIT.' : ''}
              />
              <FormField
                label="Sector económico"
                id="company-sector"
                value={companyValues.sector}
                onChange={(e) => setCompanyValues((p) => ({ ...p, sector: e.target.value }))}
                options={companySectors}
                placeholder="Selecciona sector"
                error={submitted && !companyValues.sector ? 'Elige el sector.' : ''}
              />
            </div>

            <div className="mb-3">
              <FormField
                label="Correo corporativo de talento"
                id="company-email"
                type="email"
                value={companyValues.email}
                onChange={(e) => setCompanyValues((p) => ({ ...p, email: e.target.value }))}
                placeholder="reclutamiento@tuempresa.com"
                autoComplete="email"
                error={submitted && !companyValues.email.trim() ? 'Ingresa un correo corporativo.' : ''}
              />
            </div>

            <button
              className="w-full inline-flex items-center justify-between gap-2 rounded-control bg-[#051F26] px-5 py-3.5 text-xs sm:text-sm font-bold text-white transition-all hover:bg-[#0b2b34] shadow-xs cursor-pointer"
              type="submit"
            >
              <span>Solicitar vinculación empresarial</span>
              <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />
            </button>

            <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3 text-[0.72rem] text-body-muted">
              <span>¿Ya tienes cuenta empresarial?</span>
              <Link to="/login" className="font-bold text-[#051F26] hover:underline no-underline">
                Acceso Empleador / Admin →
              </Link>
            </div>

            {feedback && (
              <p className="mt-3 rounded-control border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 font-semibold" role="status" aria-live="polite">
                {feedback}
              </p>
            )}
          </form>
        </div>
      )}

      {/* ─── TAB 3: IES / UNIVERSIDAD ─── */}
      {activeTab === 'ies' && (
        <div>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-emerald-800">
                Gestión Universitaria
              </p>
              <h2 className="font-display text-xl font-semibold leading-tight tracking-tight sm:text-2xl text-ink">
                Portal Institucional IES
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-body-muted">
                Observatorio laboral, validación de egresados y acreditación de programas.
              </p>
            </div>
            <span
              className="grid size-10 shrink-0 place-items-center rounded-control bg-emerald-50 text-xl text-emerald-800 border border-emerald-200"
              aria-hidden="true"
            >
              <i className="bx bx-library" />
            </span>
          </div>

          <form noValidate onSubmit={handleIesSubmit}>
            <div className="mb-3">
              <FormField
                label="Institución de Educación Superior (IES)"
                id="ies-institution"
                value={iesValues.institution}
                onChange={(e) => setIesValues((p) => ({ ...p, institution: e.target.value }))}
                placeholder="Ej: UTS, UIS, UNAB, UDES, UPB, UNAD..."
                error={submitted && !iesValues.institution.trim() ? 'Ingresa el nombre de la institución.' : ''}
              />
            </div>

            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <FormField
                label="Código SNIES (Aval del MEN)"
                id="ies-snies"
                value={iesValues.snies}
                onChange={(e) => setIesValues((p) => ({ ...p, snies: e.target.value }))}
                placeholder="Ej: 4113 (UTS), 1204 (UIS)..."
                error={submitted && !iesValues.snies.trim() ? 'Ingresa el código SNIES oficial.' : ''}
              />
              <FormField
                label="Rol o dependencia"
                id="ies-role"
                value={iesValues.role}
                onChange={(e) => setIesValues((p) => ({ ...p, role: e.target.value }))}
                options={iesRoles}
                placeholder="Selecciona rol"
                error={submitted && !iesValues.role ? 'Selecciona rol.' : ''}
              />
            </div>

            <div className="mb-3">
              <FormField
                label="Correo institucional"
                id="ies-email"
                type="email"
                value={iesValues.email}
                onChange={(e) => setIesValues((p) => ({ ...p, email: e.target.value }))}
                placeholder="asesor@institucion.edu.co"
                autoComplete="email"
                error={submitted && !iesValues.email.trim() ? 'Ingresa tu correo institucional.' : ''}
              />
            </div>

            <button
              className="w-full inline-flex items-center justify-between gap-2 rounded-control bg-green-dark px-5 py-3.5 text-xs sm:text-sm font-bold text-white transition-all hover:bg-green shadow-xs cursor-pointer"
              type="submit"
            >
              <span>Solicitar vinculación institucional</span>
              <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />
            </button>

            <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3 text-[0.72rem] text-body-muted">
              <span>¿Ya cuentas con credenciales IES?</span>
              <Link to="/login" className="font-bold text-green-dark hover:underline no-underline">
                Iniciar sesión Asesor / Admin →
              </Link>
            </div>

            {feedback && (
              <p className="mt-3 rounded-control border border-emerald-300 bg-emerald-50 p-2.5 text-xs text-emerald-900 font-semibold" role="status" aria-live="polite">
                {feedback}
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
