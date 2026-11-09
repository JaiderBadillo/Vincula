import { useEffect, useMemo, useState } from 'react';
import GraduatePortalLayout from '../components/dashboard/GraduatePortalLayout.jsx';
import GridVacancyDetailModal from '../components/dashboard/GridVacancyDetailModal.jsx';
import { proposalJobs } from '../data/proposalJobs.js';
import { COLOMBIAN_LOCATIONS } from '../data/profile.js';
import { useProfile } from '../hooks/useProfile.js';
import { useSavedJobs } from '../hooks/useSavedJobs.js';
import { vacancyService } from '../services/vacancyService.js';
import { applicationService } from '../services/applicationService.js';
import { aiService } from '../services/aiService.js';
import { authService } from '../services/authService.js';

function mapApiToProposalJob(v) {
  const stack = (v.competencias || []).map((c) => c.nombre);
  const matchScore = v.porcentaje_afinidad ?? v.match_score ?? 92;
  const matchReasons = [];

  if (v.motivo_recomendacion) {
    matchReasons.push(v.motivo_recomendacion);
  }
  if (Array.isArray(v.skills_match) && v.skills_match.length > 0) {
    matchReasons.push(`Coincides en competencias técnicas clave: ${v.skills_match.join(', ')}.`);
  }
  if (Array.isArray(v.missing_skills) && v.missing_skills.length > 0) {
    matchReasons.push(`Oportunidades de fortalecimiento sugeridas: ${v.missing_skills.join(', ')}.`);
  }
  if (matchReasons.length === 0) {
    matchReasons.push('Perfil técnico y competencias evaluadas mediante el motor de afinidad de Vincula.');
    matchReasons.push('Titulación y formación académica convalidada ante el sector productivo.');
  }

  return {
    id: v.id,
    vacancyCode: v.codigo_vacante || 'VAC-2026-001',
    title: v.titulo,
    company: v.empresa_nombre || (v.empresa ? v.empresa.nombre_comercial : 'Empresa Verificada'),
    companyShort: v.empresa_nombre || 'Empresa',
    companySlug: 'empresa-verificada',
    companyVerified: v.empresa_verificada ?? true,
    partnershipType: v.etiqueta_badge || 'Empresa Acreditada Vincula',
    sector: 'private',
    sectorLabel: 'Empresa Formal · Verificada 100%',
    category: v.categoria || 'Tecnología',
    companySector: (v.empresa && v.empresa.sector_economico) || 'Tecnología & Servicios',
    companySize: 'Mediana Empresa',
    companyFounded: 'Sede Bucaramanga / Santander',
    companyWebsite: '#',
    companyCover: v.empresa_logo || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80',
    workplacePhotos: [
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80',
    ],
    companyAbout: (v.empresa && v.empresa.razon_social) ? `${v.empresa.razon_social} es una organización validada oficialmente en Vincula.` : 'Empresa formal auditada por el equipo de supervisión de Vincula.',
    location: v.ubicacion || (v.sede ? `${v.sede.ciudad}, ${v.sede.departamento}` : (v.ciudad && v.departamento ? `${v.ciudad}, ${v.departamento}` : 'Bucaramanga, Santander')),
    city: v.ciudad || (v.sede ? v.sede.ciudad : 'Bucaramanga'),
    mode: v.modalidad || 'Presencial',
    workModeDetail: `${v.modalidad || 'Presencial'} · ${v.jornada_laboral || 'Tiempo Completo'}`,
    salaryMin: v.salario_minimo || v.rango_salarial_min || 0,
    salaryMax: v.salario_maximo || v.rango_salarial_max || 0,
    salaryFormatted: v.salario_formateado || (v.salario_es_confidencial ? 'Salario Confidencial' : v.salario_minimo ? `$${Number(v.salario_minimo).toLocaleString('es-CO')} COP` : 'A convenir'),
    salaryPeriod: v.periodo_salario || 'Mensual',
    salaryNotes: 'Prestaciones completas de ley y aportes de seguridad social.',
    contractType: v.tipo_contrato || 'Término Indefinido Directo',
    workSchedule: v.jornada_laboral || 'Lunes a Viernes (8:00 AM - 5:00 PM)',
    seniority: v.nivel_experiencia || 'Junior',
    experienceYears: '1 a 2 años',
    experienceEquivalence: 'Se convalidan prácticas universitarias y proyectos de grado avalados.',
    summary: v.descripcion ? v.descripcion.slice(0, 160) + '...' : (v.titulo ? `Oportunidad laboral para ${v.titulo} en ${v.empresa_nombre || 'empresa formal'}.` : 'Oportunidad laboral formal.'),
    description: v.descripcion || '',
    stack: stack.length > 0 ? stack : (v.skills_match && v.skills_match.length > 0 ? [...v.skills_match, ...(v.missing_skills || [])] : ['Tecnología', 'Desarrollo']),
    responsibilities: v.responsabilidades && v.responsabilidades.length > 0 ? v.responsabilidades : ['Cumplir con las funciones del cargo'],
    requirements: v.requisitos && v.requisitos.length > 0 ? v.requisitos : ['Título profesional o técnico'],
    benefits: (v.beneficios && v.beneficios.length > 0)
      ? v.beneficios.map((b) => ({ title: b, desc: 'Beneficio corporativo', icon: 'bx-check', color: 'bg-green/10 text-green' }))
      : [
        { title: 'Seguridad Social Integral', desc: 'Aportes legales garantizados', icon: 'bx-shield-check', color: 'bg-green/10 text-green' },
        { title: 'Capacitación Continua', desc: 'Acceso a plataformas de formación', icon: 'bx-book-open', color: 'bg-blue/10 text-blue' },
      ],
    hiringProcess: [
      { step: 1, title: 'Revisión Curricular', desc: 'Cotejo de diploma con la universidad' },
      { step: 2, title: 'Entrevista Inicial', desc: 'Presentación con el equipo de talento' },
      { step: 3, title: 'Decisión y Oferta', desc: 'Formalización de contrato laboral' }
    ],
    openPositions: v.cupos_disponibles || 1,
    closingDate: v.fecha_cierre || '',
    publishedDate: v.publicado_en ? v.publicado_en.slice(0, 10) : (v.fecha_publicacion || 'Hoy'),
    publishedAt: v.publicado_en ? v.publicado_en.slice(0, 10) : (v.fecha_publicacion || '2026-01-01'),
    utsMatch: Math.round(matchScore),
    utsMatchReasons: matchReasons,
    skillsMatch: v.skills_match || [],
    missingSkills: v.missing_skills || [],
    matchBadge: v.etiqueta_badge || `${Math.round(matchScore)}% Match`,
    matchScore: Math.round(matchScore),
    source: 'api',
  };
}

const MODE_OPTIONS = [
  { value: '', label: 'Todas las modalidades' },
  { value: 'Presencial', label: 'Presencial' },
  { value: 'Híbrido', label: 'Híbrido' },
  { value: 'Remoto', label: 'Remoto' },
];

const CONTRACT_OPTIONS = [
  { value: '', label: 'Todos los contratos' },
  { value: 'Término Indefinido Directo', label: 'Término Indefinido Directo' },
  { value: 'Término Indefinido', label: 'Término Indefinido' },
  { value: 'Término Fijo', label: 'Término Fijo (Renovable)' },
];

const SALARY_RANGES = [
  { value: '', label: 'Cualquier salario', min: 0, max: Infinity, shortLabel: 'Cualquier salario' },
  { value: '2000000-2700000', label: '$2.000.000 - $2.700.000 COP (2M a 2.7M)', min: 2000000, max: 2700000, shortLabel: '$2M a $2.7M' },
  { value: '2700000-3500000', label: '$2.700.000 - $3.500.000 COP (2.7M a 3.5M)', min: 2700000, max: 3500000, shortLabel: '$2.7M a $3.5M' },
  { value: '3500000-4500000', label: '$3.500.000 - $4.500.000 COP (3.5M a 4.5M)', min: 3500000, max: 4500000, shortLabel: '$3.5M a $4.5M' },
  { value: '4500000-6000000', label: '$4.500.000 - $6.000.000 COP (4.5M a 6M)', min: 4500000, max: 6000000, shortLabel: '$4.5M a $6M' },
  { value: '6000000+', label: 'Más de $6.000.000 COP (6M+)', min: 6000000, max: Infinity, shortLabel: '> $6M' },
];

const MATCH_OPTIONS = [
  { value: '', label: 'Cualquier afinidad' },
  { value: '90', label: 'Afinidad ≥ 90%' },
  { value: '95', label: 'Afinidad ≥ 95%' },
];

export default function VacanciesPage() {
  const { profile } = useProfile();
  const { isSaved, toggleSave, savedCount } = useSavedJobs();
  const [jobs, setJobs] = useState(proposalJobs);
  const [selectedId, setSelectedId] = useState(proposalJobs[0]?.id ?? null);
  const [activeDetailTab, setActiveDetailTab] = useState('cargo'); // 'cargo' | 'match' | 'empresa' | 'proceso'
  const [viewMode, setViewMode] = useState('grid'); // Default is 'grid' (cuadrícula)
  const [gridDetailJob, setGridDetailJob] = useState(null);

  // Sincronización con backend REST API (Vacantes recomendadas por IA o públicas)
  useEffect(() => {
    let isMounted = true;
    async function fetchVacancies() {
      // 1. Si el egresado está autenticado, consultar el motor de afinidad IA
      if (authService.isAuthenticated()) {
        try {
          const aiRes = await aiService.getRecommendedVacancies(50);
          if (isMounted && aiRes && Array.isArray(aiRes.vacantes) && aiRes.vacantes.length > 0) {
            const aiJobs = aiRes.vacantes.map(mapApiToProposalJob);
            setJobs([...aiJobs, ...proposalJobs.filter((pj) => !aiJobs.some((aj) => aj.id === pj.id))]);
            setSelectedId(aiJobs[0].id);
            return;
          }
        } catch (err) {
          console.info('[VacanciesPage] Motor IA fallback a vacantes públicas:', err.message);
        }
      }

      // 2. Fallback a catálogo público de vacantes verificadas
      try {
        const res = await vacancyService.getPublicVacancies({ page: 1, limit: 50 });
        if (isMounted && res && Array.isArray(res.items) && res.items.length > 0) {
          const apiJobs = res.items.map(mapApiToProposalJob);
          setJobs([...apiJobs, ...proposalJobs.filter((pj) => !apiJobs.some((aj) => aj.id === pj.id))]);
          setSelectedId(apiJobs[0].id);
        }
      } catch {
        // Fallback transparente a catálogo proposalJobs
      }
    }
    fetchVacancies();
    return () => {
      isMounted = false;
    };
  }, []);

  // Search & filter states
  const [keyword, setKeyword] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedMode, setSelectedMode] = useState('');
  const [selectedContract, setSelectedContract] = useState('');
  const [selectedSalaryRange, setSelectedSalaryRange] = useState('');
  const [selectedMinMatch, setSelectedMinMatch] = useState('');
  const [onlySaved, setOnlySaved] = useState(false);

  const departments = Object.keys(COLOMBIAN_LOCATIONS);
  const availableCities = selectedDept ? (COLOMBIAN_LOCATIONS[selectedDept] || []) : [];

  const [sortBy, setSortBy] = useState('match'); // 'match' | 'salary' | 'recent'
  const [applyModalJob, setApplyModalJob] = useState(null);
  const [appliedJobs, setAppliedJobs] = useState(new Set());
  const [applicationNote, setApplicationNote] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  function notify(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  const activeFiltersCount =
    (keyword.trim() ? 1 : 0) +
    (selectedDept ? 1 : 0) +
    (selectedCity ? 1 : 0) +
    (selectedMode ? 1 : 0) +
    (selectedContract ? 1 : 0) +
    (selectedSalaryRange ? 1 : 0) +
    (selectedMinMatch ? 1 : 0) +
    (onlySaved ? 1 : 0);

  function clearAllFilters() {
    setKeyword('');
    setSelectedDept('');
    setSelectedCity('');
    setSelectedMode('');
    setSelectedContract('');
    setSelectedSalaryRange('');
    setSelectedMinMatch('');
    setOnlySaved(false);
  }

  const filteredJobs = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    let list = jobs.filter((j) => {
      // 1. Búsqueda por palabra clave (título, empresa, tecnologías, resumen, área)
      const matchKeyword =
        !q ||
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.stack.some((s) => s.toLowerCase().includes(q)) ||
        j.summary.toLowerCase().includes(q) ||
        (j.category && j.category.toLowerCase().includes(q));

      // 2. Ubicación: Departamento y Ciudad (Cobertura completa nacional)
      let matchLocation = true;
      if (selectedDept) {
        const deptTarget = selectedDept.toLowerCase();
        const deptCities = (COLOMBIAN_LOCATIONS[selectedDept] || []).map((c) => c.toLowerCase());

        if (selectedCity && selectedCity !== 'Remoto') {
          const cityTarget = selectedCity.toLowerCase();
          matchLocation =
            (j.city && j.city.toLowerCase().includes(cityTarget)) ||
            (j.location && j.location.toLowerCase().includes(cityTarget));
        } else if (selectedCity === 'Remoto') {
          matchLocation =
            (j.mode && j.mode.toLowerCase().includes('remoto')) ||
            (j.city && j.city.toLowerCase().includes('remoto')) ||
            (j.location && j.location.toLowerCase().includes('remoto'));
        } else {
          // Si solo seleccionó departamento, coincide si la ubicación o ciudad menciona el departamento o sus municipios
          const jobLoc = `${j.location || ''} ${j.city || ''}`.toLowerCase();
          matchLocation =
            jobLoc.includes(deptTarget) ||
            deptCities.some((c) => jobLoc.includes(c));
        }
      } else if (selectedCity) {
        if (selectedCity === 'Remoto') {
          matchLocation =
            (j.mode && j.mode.toLowerCase().includes('remoto')) ||
            (j.city && j.city.toLowerCase().includes('remoto')) ||
            (j.location && j.location.toLowerCase().includes('remoto'));
        } else {
          const cityTarget = selectedCity.toLowerCase();
          matchLocation =
            (j.city && j.city.toLowerCase().includes(cityTarget)) ||
            (j.location && j.location.toLowerCase().includes(cityTarget));
        }
      }

      // 3. Modalidad de trabajo (Presencial / Remoto / Híbrido)
      const matchMode =
        !selectedMode ||
        (j.mode && j.mode.toLowerCase().includes(selectedMode.toLowerCase())) ||
        (j.workModeDetail && j.workModeDetail.toLowerCase().includes(selectedMode.toLowerCase()));

      // 4. Tipo de contrato
      const matchContract =
        !selectedContract ||
        (j.contractType && j.contractType.toLowerCase().includes(selectedContract.toLowerCase()));

      // 5. Rango salarial (ej. 2M a 2.7M, 2.7M a 3.5M, etc.)
      let matchSalary = true;
      if (selectedSalaryRange) {
        const range = SALARY_RANGES.find((r) => r.value === selectedSalaryRange);
        if (range) {
          const jobMin = j.salaryMin || 0;
          const jobMax = j.salaryMax || j.salaryMin || 0;
          matchSalary = jobMin <= range.max && jobMax >= range.min;
        }
      }

      // 6. Afinidad mínima UTS
      let matchAfinidad = true;
      if (selectedMinMatch) {
        matchAfinidad = (j.utsMatch || 0) >= Number(selectedMinMatch);
      }

      // 7. Solo vacantes guardadas
      const matchSaved = !onlySaved || isSaved(j.id);

      return (
        matchKeyword &&
        matchLocation &&
        matchMode &&
        matchContract &&
        matchSalary &&
        matchAfinidad &&
        matchSaved
      );
    });

    if (sortBy === 'match') {
      list.sort((a, b) => (b.utsMatch || 0) - (a.utsMatch || 0));
    } else if (sortBy === 'salary') {
      list.sort((a, b) => (b.salaryMax || 0) - (a.salaryMax || 0));
    } else if (sortBy === 'recent') {
      list.sort((a, b) => new Date(b.publishedAt || b.publishedDate || 0) - new Date(a.publishedAt || a.publishedDate || 0));
    }

    return list;
  }, [
    keyword,
    selectedDept,
    selectedCity,
    selectedMode,
    selectedContract,
    selectedSalaryRange,
    selectedMinMatch,
    onlySaved,
    sortBy,
    isSaved,
    jobs,
  ]);

  const selectedJob = filteredJobs.find((j) => j.id === selectedId) || filteredJobs[0] || null;

  function toggleSaveJob(id) {
    const wasSaved = isSaved(id);
    toggleSave(id);
    notify(wasSaved ? 'Vacante eliminada de tus guardados.' : 'Vacante guardada en tus favoritos.');
  }

  async function handleConfirmApply() {
    if (!applyModalJob) return;
    try {
      await applicationService.applyToVacancy(applyModalJob.id, {
        carta_presentacion: applicationNote,
        salario_esperado: null,
        vacante_titulo: applyModalJob.title,
        vacante_codigo: applyModalJob.code || `VAC-2026-${String(applyModalJob.id).slice(0, 4).toUpperCase()}`,
        empresa_nombre: applyModalJob.company,
        modalidad: applyModalJob.modality,
        ubicacion: applyModalJob.location,
      });
      notify(`¡Postulación enviada exitosamente a ${applyModalJob.company}! Te hemos enviado un correo de confirmación.`);
    } catch (err) {
      console.info('[VacanciesPage] Registro de postulación demo/local:', err.message);
      notify(`¡Postulación enviada exitosamente a ${applyModalJob.company}!`);
    }
    setAppliedJobs((prev) => new Set(prev).add(applyModalJob.id));
    setApplyModalJob(null);
    setApplicationNote('');
  }

  return (
    <GraduatePortalLayout activePage="vacancies">
      <main className="w-full pb-20">
        {/* ─── Hero Header con Estadísticas Clave ─── */}
        <section className="relative isolate overflow-hidden bg-ink py-10 px-5 sm:px-8 lg:px-10 text-white">
          <div className="pointer-events-none absolute inset-0 z-0 opacity-25">
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80"
              alt=""
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/70" />
            <div className="hero-grid absolute inset-0 opacity-40" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="max-w-3xl">
              <h1 className="m-0 font-display text-[clamp(1.8rem,3.2vw,2.6rem)] font-bold tracking-tight text-white leading-tight">
                Explorar Vacantes y Oportunidades Laborales
              </h1>
              <p className="m-0 mt-2 text-sm sm:text-base text-white/70 leading-relaxed max-w-2xl">
                Accede a convocatorias transparentes con empresas aliadas verificadas. Descubre tu porcentaje de afinidad según tu titulación y competencias curriculares.
              </p>
            </div>

            {/* Buscador Principal: Palabra clave + Desplegables Departamento, Ciudad y Modalidad */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-8 grid gap-2 rounded-2xl border border-line bg-white p-2 shadow-hero sm:grid-cols-[1.4fr_1.1fr_1.1fr_1fr_auto] sm:items-center max-w-6xl"
              role="search"
              aria-label="Buscar oportunidades laborales"
            >
              {/* Campo 1: Cargo, empresa o palabra clave */}
              <label className="flex min-w-0 items-center gap-3 px-3 py-2 text-secondary" htmlFor="job-keyword">
                <i className="bx bx-search text-xl text-secondary shrink-0" aria-hidden="true" />
                <span className="sr-only">Cargo, empresa o palabra clave</span>
                <input
                  id="job-keyword"
                  type="search"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Cargo, empresa o palabra clave"
                  className="w-full min-w-0 border-0 bg-transparent py-1 text-sm text-ink outline-none placeholder:text-secondary focus-visible:ring-0"
                />
                {keyword && (
                  <button
                    type="button"
                    onClick={() => setKeyword('')}
                    className="text-secondary hover:text-ink p-1 text-sm cursor-pointer shrink-0"
                    title="Limpiar búsqueda"
                  >
                    <i className="bx bx-x" />
                  </button>
                )}
              </label>

              {/* Campo 2: Selector desplegable de Departamento */}
              <div className="flex min-w-0 items-center gap-2 border-t border-line-soft px-3 py-2 text-secondary sm:border-l sm:border-t-0 sm:pl-3">
                <i className="bx bx-map-pin text-xl text-secondary shrink-0" aria-hidden="true" />
                <div className="w-full min-w-0">
                  <label htmlFor="job-dept" className="sr-only">Departamento</label>
                  <select
                    id="job-dept"
                    value={selectedDept}
                    onChange={(e) => {
                      setSelectedDept(e.target.value);
                      setSelectedCity('');
                    }}
                    className="w-full border-0 bg-transparent py-1 text-sm text-ink outline-none cursor-pointer focus-visible:ring-0 font-medium"
                  >
                    <option value="" className="text-ink">Todos los departamentos</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept} className="text-ink">
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedDept && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDept('');
                      setSelectedCity('');
                    }}
                    className="text-secondary hover:text-ink p-1 text-sm cursor-pointer shrink-0"
                    title="Restablecer departamento"
                  >
                    <i className="bx bx-x" />
                  </button>
                )}
              </div>

              {/* Campo 3: Selector desplegable de Ciudad / Municipio */}
              <div className="flex min-w-0 items-center gap-2 border-t border-line-soft px-3 py-2 text-secondary sm:border-l sm:border-t-0 sm:pl-3">
                <i className="bx bx-map text-xl text-secondary shrink-0" aria-hidden="true" />
                <div className="w-full min-w-0">
                  <label htmlFor="job-city" className="sr-only">Ciudad / Municipio</label>
                  <select
                    id="job-city"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full border-0 bg-transparent py-1 text-sm text-ink outline-none cursor-pointer focus-visible:ring-0 font-medium"
                  >
                    <option value="" className="text-ink">
                      {selectedDept ? `Todos los municipios de ${selectedDept}` : 'Todas las ciudades'}
                    </option>
                    <option value="Remoto" className="text-ink">Remoto (Nacional)</option>
                    {selectedDept ? (
                      availableCities.map((city) => (
                        <option key={city} value={city} className="text-ink">
                          {city}
                        </option>
                      ))
                    ) : (
                      ['Bucaramanga', 'Floridablanca', 'Piedecuesta', 'Girón', 'Barrancabermeja', 'San Gil', 'Bogotá D.C.', 'Medellín', 'Cali', 'Barranquilla', 'Cúcuta', 'Pereira'].map((city) => (
                        <option key={city} value={city} className="text-ink">
                          {city}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                {selectedCity && (
                  <button
                    type="button"
                    onClick={() => setSelectedCity('')}
                    className="text-secondary hover:text-ink p-1 text-sm cursor-pointer shrink-0"
                    title="Restablecer ciudad"
                  >
                    <i className="bx bx-x" />
                  </button>
                )}
              </div>

              {/* Campo 4: Selector desplegable de Modalidad */}
              <div className="flex min-w-0 items-center gap-2 border-t border-line-soft px-3 py-2 text-secondary sm:border-l sm:border-t-0 sm:pl-3">
                <i className="bx bx-buildings text-xl text-secondary shrink-0" aria-hidden="true" />
                <div className="w-full min-w-0">
                  <label htmlFor="job-mode" className="sr-only">Modalidad</label>
                  <select
                    id="job-mode"
                    value={selectedMode}
                    onChange={(e) => setSelectedMode(e.target.value)}
                    className="w-full border-0 bg-transparent py-1 text-sm text-ink outline-none cursor-pointer focus-visible:ring-0 font-medium"
                  >
                    {MODE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="text-ink">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedMode && (
                  <button
                    type="button"
                    onClick={() => setSelectedMode('')}
                    className="text-secondary hover:text-ink p-1 text-sm cursor-pointer shrink-0"
                    title="Restablecer modalidad"
                  >
                    <i className="bx bx-x" />
                  </button>
                )}
              </div>

              {/* Botón Buscar */}
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-dark hover:bg-green px-6 py-3 text-sm font-bold text-white shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Buscar</span>
                <i className="bx bx-search text-lg" aria-hidden="true" />
              </button>
            </form>

            {/* Fila de Filtros Avanzados Rápidos en el Hero */}
            <div className="mt-4 flex flex-wrap items-center gap-2 max-w-5xl text-xs">
              <span className="text-white/70 font-semibold inline-flex items-center gap-1.5 mr-1">
                <i className="bx bx-filter-alt text-lime" />
                Más filtros:
              </span>

              {/* Tipo de Contrato */}
              <div className="relative">
                <select
                  value={selectedContract}
                  onChange={(e) => setSelectedContract(e.target.value)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold outline-none cursor-pointer transition-all ${selectedContract
                      ? 'border-lime bg-lime text-ink font-bold'
                      : 'border-white/20 bg-ink/70 text-white/90 hover:bg-ink hover:border-white/40'
                    }`}
                  title="Filtrar por Tipo de Contrato"
                >
                  {CONTRACT_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value} className="bg-white text-ink">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rango salarial mensual */}
              <div className="relative">
                <select
                  value={selectedSalaryRange}
                  onChange={(e) => setSelectedSalaryRange(e.target.value)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold outline-none cursor-pointer transition-all ${selectedSalaryRange
                      ? 'border-lime bg-lime text-ink font-bold'
                      : 'border-white/20 bg-ink/70 text-white/90 hover:bg-ink hover:border-white/40'
                    }`}
                  title="Filtrar por Rango Salarial"
                >
                  {SALARY_RANGES.map((sal) => (
                    <option key={sal.value} value={sal.value} className="bg-white text-ink">
                      {sal.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Afinidad mínima UTS */}
              <div className="relative">
                <select
                  value={selectedMinMatch}
                  onChange={(e) => setSelectedMinMatch(e.target.value)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold outline-none cursor-pointer transition-all ${selectedMinMatch
                      ? 'border-lime bg-lime text-ink font-bold'
                      : 'border-white/20 bg-ink/70 text-white/90 hover:bg-ink hover:border-white/40'
                    }`}
                  title="Filtrar por Afinidad mínima UTS"
                >
                  {MATCH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value} className="bg-white text-ink">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggle Solo guardadas */}
              <button
                type="button"
                onClick={() => setOnlySaved((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${onlySaved
                    ? 'border-amber-400 bg-amber-400 text-ink shadow-xs font-bold'
                    : 'border-white/20 bg-ink/70 text-white/90 hover:bg-ink hover:border-white/40'
                  }`}
                title="Mostrar únicamente vacantes guardadas en favoritos"
              >
                <i className={`bx ${onlySaved ? 'bxs-bookmark-star' : 'bx-bookmark'} text-sm`} />
                <span>Solo guardadas ({savedCount})</span>
              </button>

              {/* Limpiar todos los filtros */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 px-3 py-1.5 text-xs font-bold text-white cursor-pointer transition-colors"
                >
                  <i className="bx bx-x text-sm" />
                  <span>Limpiar filtros ({activeFiltersCount})</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ─── Control Bar: Filters + Results counter + View mode switch ─── */}
        <div className="border-b border-line-soft bg-white px-5 py-3 sm:px-8 lg:px-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">

            {/* Ordenamiento & Active filter tags */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-secondary">Ordenar por:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-line bg-page px-3 py-1.5 text-xs font-semibold text-ink focus:border-green focus:outline-none cursor-pointer"
                >
                  <option value="match">Mayor afinidad</option>
                  <option value="salary">Mayor remuneración</option>
                  <option value="recent">Más recientes</option>
                </select>
              </div>

              {/* Badges de filtros activos */}
              {keyword && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-page border border-line px-2.5 py-1 text-xs text-ink">
                  <span>&ldquo;{keyword}&rdquo;</span>
                  <button type="button" onClick={() => setKeyword('')} className="text-secondary hover:text-ink cursor-pointer">
                    <i className="bx bx-x" />
                  </button>
                </span>
              )}

              {selectedDept && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-page border border-line px-2.5 py-1 text-xs text-ink">
                  <i className="bx bx-map-pin text-green-dark" />
                  <span>Dpto: {selectedDept}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDept('');
                      setSelectedCity('');
                    }}
                    className="text-secondary hover:text-ink cursor-pointer"
                  >
                    <i className="bx bx-x" />
                  </button>
                </span>
              )}

              {selectedCity && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-page border border-line px-2.5 py-1 text-xs text-ink">
                  <i className="bx bx-map text-green-dark" />
                  <span>{selectedCity}</span>
                  <button type="button" onClick={() => setSelectedCity('')} className="text-secondary hover:text-ink cursor-pointer">
                    <i className="bx bx-x" />
                  </button>
                </span>
              )}

              {selectedMode && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-page border border-line px-2.5 py-1 text-xs text-ink">
                  <i className="bx bx-buildings text-green-dark" />
                  <span>{selectedMode}</span>
                  <button type="button" onClick={() => setSelectedMode('')} className="text-secondary hover:text-ink cursor-pointer">
                    <i className="bx bx-x" />
                  </button>
                </span>
              )}

              {selectedContract && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-page border border-line px-2.5 py-1 text-xs text-ink">
                  <span>{selectedContract}</span>
                  <button type="button" onClick={() => setSelectedContract('')} className="text-secondary hover:text-ink cursor-pointer">
                    <i className="bx bx-x" />
                  </button>
                </span>
              )}

              {selectedSalaryRange && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-page border border-line px-2.5 py-1 text-xs text-ink">
                  <i className="bx bx-wallet text-green-dark" />
                  <span>{SALARY_RANGES.find((r) => r.value === selectedSalaryRange)?.shortLabel || selectedSalaryRange}</span>
                  <button type="button" onClick={() => setSelectedSalaryRange('')} className="text-secondary hover:text-ink cursor-pointer">
                    <i className="bx bx-x" />
                  </button>
                </span>
              )}

              {selectedMinMatch && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-page border border-line px-2.5 py-1 text-xs text-ink">
                  <i className="bx bxs-bolt text-lime" />
                  <span>Match ≥ {selectedMinMatch}%</span>
                  <button type="button" onClick={() => setSelectedMinMatch('')} className="text-secondary hover:text-ink cursor-pointer">
                    <i className="bx bx-x" />
                  </button>
                </span>
              )}

              {onlySaved && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-300 px-2.5 py-1 text-xs text-amber-900 font-semibold">
                  <i className="bx bxs-bookmark-star text-amber-600" />
                  <span>Solo guardadas</span>
                  <button type="button" onClick={() => setOnlySaved(false)} className="text-amber-800 hover:text-ink cursor-pointer">
                    <i className="bx bx-x" />
                  </button>
                </span>
              )}

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs text-secondary hover:text-rose-600 underline cursor-pointer ml-1"
                >
                  Limpiar todos ({activeFiltersCount})
                </button>
              )}
            </div>

            {/* Contador y Switch de Visualización */}
            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-line-soft">
              <span className="text-xs text-secondary">
                Mostrando <strong className="text-ink font-bold">{filteredJobs.length}</strong> vacantes
              </span>

              <div className="flex items-center gap-2">
                <span className="text-xs text-secondary font-medium mr-1 hidden sm:inline">Vista:</span>
                <div className="flex rounded-xl border border-line bg-page p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-ink shadow-xs' : 'text-secondary hover:text-ink'
                      }`}
                    title="Cuadrícula completa de tarjetas"
                  >
                    <i className="bx bx-grid-alt text-sm" />
                    <span>Cuadrícula</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${viewMode === 'split' ? 'bg-white text-ink shadow-xs' : 'text-secondary hover:text-ink'
                      }`}
                    title="Panel dividido (Lista + Ficha)"
                  >
                    <i className="bx bx-layout text-sm" />
                    <span>Panel Dividido</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ─── Main Content Area ─── */}
        <div className="max-w-7xl mx-auto px-5 pt-6 sm:px-8 lg:px-10">
          {filteredJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center my-6">
              <div className="grid size-16 place-items-center rounded-2xl bg-panel text-3xl text-secondary mx-auto mb-3">
                <i className="bx bx-search-alt" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink">No encontramos vacantes con esos filtros</h3>
              <p className="text-sm text-body-muted max-w-md mx-auto mt-1">
                Intenta ajustando el término de búsqueda o cambiando la modalidad para ver todas las oportunidades disponibles.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-ink-soft cursor-pointer"
              >
                Restablecer todos los filtros
              </button>
            </div>
          ) : viewMode === 'split' ? (
            /* ─── Split Screen View (Interactive Feed + In-depth Detail) ─── */
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,1.25fr)] xl:gap-8">
              {/* Left Column: Rich Vacancy Feed */}
              <div className="grid gap-3.5">
                {filteredJobs.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  const isApplied = appliedJobs.has(job.id);
                  const isJobSaved = isSaved(job.id);

                  return (
                    <article
                      key={job.id}
                      onClick={() => setSelectedId(job.id)}
                      className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 cursor-pointer ${isSelected
                          ? 'border-green bg-gradient-to-r from-emerald-50/50 via-white to-white shadow-card ring-2 ring-green/20'
                          : 'border-line bg-white shadow-card hover:border-green/40 hover:shadow-md'
                        }`}
                    >
                      {/* Mini top image strip preview */}
                      <div className="relative h-20 w-full overflow-hidden bg-ink">
                        <img
                          src={job.companyCover}
                          alt={job.company}
                          className="size-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />

                        {/* Badges on image */}
                        <div className="absolute top-2.5 left-3 flex items-center gap-2">
                          <span className="rounded-full bg-ink/75 backdrop-blur-md px-2.5 py-0.5 text-[0.62rem] font-bold text-white border border-white/20">
                            {job.partnershipType}
                          </span>
                        </div>

                        <div className="absolute top-2.5 right-3 flex items-center gap-1.5">
                          <span className="rounded-full bg-lime text-ink px-2.5 py-0.5 text-[0.65rem] font-bold shadow-xs">
                            <i className="bx bxs-bolt text-xs mr-0.5" />
                            {job.utsMatch}% Match
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 sm:p-5">
                        {/* Company row */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className={`grid size-9 place-items-center rounded-xl text-xs font-black shadow-xs font-display ${job.companyLogoBg}`}>
                              {job.companyShort.slice(0, 3).toUpperCase()}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-display text-sm font-bold text-ink">
                                  {job.company}
                                </span>
                                <i className="bx bxs-badge-check text-green text-sm" title="Empresa Verificada Institucional" />
                              </div>
                              <span className="text-[0.68rem] text-secondary">
                                {job.companySector}
                              </span>
                            </div>
                          </div>

                          {/* Quick bookmark */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSaveJob(job.id);
                            }}
                            className={`grid size-8 place-items-center rounded-full transition-colors ${isJobSaved ? 'text-amber-500 bg-amber-50' : 'text-secondary hover:text-ink hover:bg-page'
                              }`}
                            title={isJobSaved ? 'Guardada' : 'Guardar vacante'}
                          >
                            <i className={`bx ${isJobSaved ? 'bxs-bookmark-star' : 'bx-bookmark'} text-lg`} />
                          </button>
                        </div>

                        {/* Title */}
                        <h2 className="m-0 mt-3 font-display text-base font-bold text-ink group-hover:text-green-dark transition-colors leading-snug">
                          {job.title}
                        </h2>

                        {/* Metrics Badges */}
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            <i className="bx bx-wallet text-sm" />
                            {job.salaryFormatted}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-full bg-panel border border-line px-2.5 py-1 text-xs font-semibold text-blue-muted">
                            <i className="bx bx-buildings text-sm" />
                            {job.mode}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-full bg-page border border-line-soft px-2.5 py-1 text-xs text-secondary">
                            <i className="bx bx-map-pin text-sm" />
                            {job.city}
                          </span>
                        </div>

                        {/* Key Stack chips */}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {job.stack.slice(0, 4).map((tech) => (
                            <span key={tech} className="rounded-md bg-page px-2 py-0.5 text-[0.68rem] font-semibold text-ink border border-line-soft">
                              {tech}
                            </span>
                          ))}
                          {job.stack.length > 4 && (
                            <span className="text-[0.68rem] font-semibold text-secondary self-center px-1">
                              +{job.stack.length - 4} más
                            </span>
                          )}
                        </div>

                        {/* Footer status */}
                        <div className="mt-4 pt-3 border-t border-line-soft flex items-center justify-between text-xs text-secondary">
                          <span className="inline-flex items-center gap-1">
                            <i className="bx bx-time text-sm" />
                            Quedan {job.daysRemaining} días
                          </span>

                          {isApplied ? (
                            <span className="inline-flex items-center gap-1 text-green font-bold text-xs bg-green/10 px-2.5 py-0.5 rounded-full">
                              <i className="bx bx-check" /> Postulado
                            </span>
                          ) : (
                            <span className="font-semibold text-blue-muted group-hover:text-green-dark flex items-center gap-0.5">
                              Ver detalles completos
                              <i className="bx bx-chevron-right text-base group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Right Column: In-depth Interactive Job Details Panel */}
              <div
                className="lg:sticky self-start"
                style={{ top: 'min(5rem, calc(100vh - 100% - 2rem))' }}
              >
                {selectedJob ? (
                  <article className="overflow-hidden rounded-2xl border border-line bg-white shadow-hero">
                    {/* Header Panorámico con Foto Real de la Empresa */}
                    <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-ink">
                      <img
                        src={selectedJob.companyCover}
                        alt={`Sede de ${selectedJob.company}`}
                        className="size-full object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />

                      {/* Header Overlays */}
                      <div className="absolute top-4 left-4 flex items-center gap-2">
                        <span className="rounded-full bg-ink/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-lime border border-white/20">
                          {selectedJob.partnershipType}
                        </span>
                        <span className="rounded-full bg-white/20 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-white">
                          Cód: {selectedJob.vacancyCode}
                        </span>
                      </div>

                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSaveJob(selectedJob.id)}
                          className={`rounded-full p-2 backdrop-blur-md border border-white/30 text-white transition-colors cursor-pointer ${isSaved(selectedJob.id) ? 'bg-amber-500 text-white border-amber-500' : 'bg-ink/60 hover:bg-white hover:text-ink'
                            }`}
                          title={isSaved(selectedJob.id) ? 'Quitar de guardados' : 'Guardar vacante'}
                        >
                          <i className={`bx ${isSaved(selectedJob.id) ? 'bxs-bookmark-star' : 'bx-bookmark'} text-base`} />
                        </button>
                      </div>

                      {/* Company identity over banner bottom */}
                      <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3 text-white">
                        <div className="flex items-center gap-3.5">
                          <span className={`grid size-14 place-items-center rounded-2xl text-base font-black shadow-lg font-display border-2 border-white/30 ${selectedJob.companyLogoBg}`}>
                            {selectedJob.companyShort.slice(0, 3).toUpperCase()}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h2 className="m-0 font-display text-lg sm:text-xl font-bold leading-tight">
                                {selectedJob.company}
                              </h2>
                              <i className="bx bxs-badge-check text-lime text-base" title="Convenio Oficial Verificado" />
                            </div>
                            <p className="m-0 text-xs text-white/75 mt-0.5">
                              {selectedJob.companySector} · {selectedJob.companySize}
                            </p>
                          </div>
                        </div>

                        <div className="hidden sm:block text-right">
                          <span className="rounded-full bg-lime text-ink px-3 py-1 text-xs font-bold shadow-sm inline-flex items-center gap-1">
                            <i className="bx bxs-bolt text-sm" />
                            {selectedJob.utsMatch}% Match Perfil
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Title & Quick Actions */}
                    <div className="p-5 sm:p-6 border-b border-line-soft">
                      <h3 className="m-0 font-display text-xl sm:text-2xl font-bold text-ink leading-snug">
                        {selectedJob.title}
                      </h3>
                      <p className="m-0 mt-2 text-sm text-body-muted leading-relaxed">
                        {selectedJob.summary}
                      </p>

                      {/* Metadatos rápidos en línea */}
                      <div className="mt-3.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-page px-2.5 py-1 text-xs font-semibold text-secondary border border-line-soft">
                          <i className="bx bx-map-pin text-sm text-green-dark" />
                          {selectedJob.city} · {selectedJob.mode}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-page px-2.5 py-1 text-xs font-semibold text-secondary border border-line-soft">
                          <i className="bx bx-briefcase-alt text-sm text-green-dark" />
                          {selectedJob.contractType}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-page px-2.5 py-1 text-xs font-semibold text-secondary border border-line-soft">
                          <i className="bx bx-layer text-sm text-green-dark" />
                          {selectedJob.seniority}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-page px-2.5 py-1 text-xs font-semibold text-secondary border border-line-soft">
                          <i className="bx bx-time text-sm text-secondary" />
                          Publicada hace {selectedJob.postedTime}
                        </span>
                      </div>

                      {/* CTA Buttons */}
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setApplyModalJob(selectedJob)}
                          className={`flex-1 min-w-[12rem] inline-flex items-center justify-center gap-2 rounded-xl py-3 px-5 text-sm font-bold shadow-sm transition-all cursor-pointer ${appliedJobs.has(selectedJob.id)
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-green hover:bg-green-dark text-white hover:shadow-md'
                            }`}
                        >
                          <i className={`bx ${appliedJobs.has(selectedJob.id) ? 'bx-check-circle' : 'bx-send'} text-lg`} />
                          {appliedJobs.has(selectedJob.id) ? 'Ya te postulaste a esta vacante' : 'Postularme con mi perfil'}
                        </button>

                        <a
                          href={selectedJob.companyWebsite}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-page px-4 py-3 text-xs font-bold text-ink hover:bg-white hover:text-green-dark transition-colors no-underline"
                        >
                          <i className="bx bx-globe text-base text-secondary" />
                          Sitio web empresa
                        </a>
                      </div>
                    </div>

                    {/* Secondary Navigation Tabs within the Job */}
                    <div className="border-b border-line-soft bg-page/60 px-5 pt-1">
                      <nav className="flex gap-2 overflow-x-auto scrollbar-none" aria-label="Detalles de la vacante">
                        {[
                          { id: 'cargo', label: 'Detalles del Cargo', icon: 'bx-briefcase-alt-2' },
                          { id: 'match', label: `Afinidad Curricular (${selectedJob.utsMatch}%)`, icon: 'bx-target-lock' },
                          { id: 'empresa', label: 'Empresa & Cultura', icon: 'bx-buildings' },
                          { id: 'proceso', label: 'Proceso de Selección', icon: 'bx-git-repo-forked' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setActiveDetailTab(t.id)}
                            className={`inline-flex items-center gap-1.5 border-b-2 px-3.5 py-3 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeDetailTab === t.id
                                ? 'border-green text-green-dark bg-white'
                                : 'border-transparent text-secondary hover:text-ink'
                              }`}
                          >
                            <i className={`bx ${t.icon} text-base`} />
                            {t.label}
                          </button>
                        ))}
                      </nav>
                    </div>

                    {/* Tab Contents */}
                    <div className="p-5 sm:p-6 space-y-6">
                      {/* TAB 1: DETALLES DEL CARGO */}
                      {activeDetailTab === 'cargo' && (
                        <div className="space-y-6">
                          {/* Ficha Integral de Condiciones y Compensación */}
                          <div className="rounded-2xl border border-line bg-white shadow-2xs overflow-hidden">
                            {/* Bloque Superior: Compensación y Beneficios */}
                            <div className="p-5 sm:p-6 border-b border-line-soft bg-page/40">
                              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
                                <div>
                                  <span className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                                    <i className="bx bx-credit-card-front text-base text-green-dark" />
                                    Compensación mensual estimada
                                  </span>
                                  <div className="mt-1.5 flex items-baseline gap-2">
                                    <h4 className="m-0 font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                                      {selectedJob.salaryFormatted}
                                    </h4>
                                    <span className="text-xs font-medium text-secondary">/ mes bruto</span>
                                  </div>
                                </div>
                                <div className="self-start sm:self-auto">
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/70 border border-emerald-300/80 px-3 py-1 text-xs font-bold text-emerald-800">
                                    <i className="bx bx-check-circle text-sm" />
                                    Salario en moneda legal (COP)
                                  </span>
                                </div>
                              </div>

                              {selectedJob.salaryNotes && (
                                <div className="mt-3.5 pt-3 border-t border-line-soft/80 flex items-start gap-2 text-xs text-body-muted leading-relaxed">
                                  <i className="bx bx-shield-quarter text-green-dark text-base mt-0.5 shrink-0" />
                                  <span>{selectedJob.salaryNotes}</span>
                                </div>
                              )}
                            </div>

                            {/* Matriz de Especificaciones Operativas (3 Columnas con Divisores Sutiles) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line-soft bg-white">
                              {/* 1. Modalidad & Jornada */}
                              <div className="p-4 sm:p-5 flex flex-col justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 text-secondary">
                                    <i className="bx bx-buildings text-base text-ink" />
                                    <span className="text-xs font-semibold text-secondary">Modalidad y horario</span>
                                  </div>
                                  <p className="m-0 mt-2 font-display text-sm sm:text-base font-bold text-ink">
                                    {selectedJob.mode}
                                  </p>
                                </div>
                                <p className="m-0 text-xs text-body-muted leading-relaxed">
                                  {selectedJob.workSchedule}
                                </p>
                              </div>

                              {/* 2. Tipo de Contratación & Nivel */}
                              <div className="p-4 sm:p-5 flex flex-col justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 text-secondary">
                                    <i className="bx bx-id-card text-base text-ink" />
                                    <span className="text-xs font-semibold text-secondary">Tipo de vinculación</span>
                                  </div>
                                  <p className="m-0 mt-2 font-display text-sm sm:text-base font-bold text-ink">
                                    {selectedJob.contractType}
                                  </p>
                                </div>
                                <p className="m-0 text-xs text-body-muted leading-relaxed">
                                  Nivel {selectedJob.seniority}
                                </p>
                              </div>

                              {/* 3. Experiencia Requerida */}
                              <div className="p-4 sm:p-5 flex flex-col justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 text-secondary">
                                    <i className="bx bx-user-check text-base text-ink" />
                                    <span className="text-xs font-semibold text-secondary">Experiencia requerida</span>
                                  </div>
                                  <p className="m-0 mt-2 font-display text-sm sm:text-base font-bold text-ink">
                                    {selectedJob.experienceYears}
                                  </p>
                                </div>
                                <p className="m-0 text-xs text-body-muted leading-relaxed">
                                  {selectedJob.experienceEquivalence}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Misión & El Día a Día */}
                          <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
                            <h4 className="m-0 font-display text-sm font-bold text-ink flex items-center gap-2">
                              <i className="bx bx-compass text-green text-lg" />
                              Misión del cargo en {selectedJob.company}
                            </h4>
                            <p className="m-0 mt-2 text-xs sm:text-sm text-ink/80 leading-relaxed bg-page/80 p-3 rounded-xl border border-line-soft">
                              "{selectedJob.mission}"
                            </p>

                            <h4 className="m-0 mt-5 font-display text-sm font-bold text-ink flex items-center gap-2">
                              <i className="bx bx-check-circle text-green text-lg" />
                              ¿Qué harás en tu día a día?
                            </h4>
                            <ul className="m-0 mt-2.5 list-none p-0 space-y-2">
                              {selectedJob.whatYouWillDo.map((duty, idx) => (
                                <li key={idx} className="flex items-start gap-2.5 text-xs text-ink/85 leading-normal">
                                  <span className="size-1.5 rounded-full bg-green mt-1.5 shrink-0" />
                                  <span>{duty}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Tech Stack */}
                          <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
                            <h4 className="m-0 font-display text-sm font-bold text-ink flex items-center gap-2 mb-3">
                              <i className="bx bx-code-alt text-blue-600 text-lg" />
                              Herramientas y Tecnologías clave
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedJob.stack.map((t) => (
                                <span
                                  key={t}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-page px-3 py-1.5 text-xs font-semibold text-ink"
                                >
                                  <i className="bx bx-check text-green text-sm" />
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Requisitos Indispensables vs Deseables */}
                          <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
                            <h4 className="m-0 font-display text-sm font-bold text-ink flex items-center gap-2 mb-3">
                              <i className="bx bx-list-check text-purple-600 text-lg" />
                              Requisitos del perfil
                            </h4>

                            <div className="space-y-4">
                              <div>
                                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md inline-block mb-2">
                                  Requisitos Indispensables
                                </span>
                                <ul className="m-0 list-none p-0 space-y-1.5">
                                  {selectedJob.requirements.mandatory.map((req, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-ink/85">
                                      <i className="bx bx-check text-emerald-600 text-base shrink-0 mt-0.5" />
                                      <span>{req}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="pt-3 border-t border-line-soft">
                                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md inline-block mb-2">
                                  Deseables (Suman puntos a tu postulación)
                                </span>
                                <ul className="m-0 list-none p-0 space-y-1.5">
                                  {selectedJob.requirements.desirable.map((req, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-body-muted">
                                      <i className="bx bx-plus text-sky-600 text-sm shrink-0 mt-0.5" />
                                      <span>{req}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 2: AFINIDAD CON TU PERFIL UTS */}
                      {activeDetailTab === 'match' && (
                        <div className="space-y-5">
                          <div className="rounded-2xl border border-lime/40 bg-gradient-to-br from-lime/15 via-white to-white p-5 shadow-xs">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-green-dark">
                                  Algoritmo de Compatibilidad IA
                                </span>
                                <h4 className="m-0 font-display text-xl font-bold text-ink mt-0.5">
                                  Tu afinidad es del {selectedJob.utsMatch}%
                                </h4>
                                <p className="m-0 text-xs text-body-muted mt-1">
                                  Calculado a partir de tu titulación, competencias curriculares y aspiraciones laborales.
                                </p>
                              </div>
                              <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-ink text-lime font-display font-black text-2xl shadow-sm">
                                {selectedJob.utsMatch}%
                              </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-line-soft space-y-2">
                              {selectedJob.utsMatchReasons.map((reason, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs font-medium text-ink/90">
                                  <i className="bx bxs-badge-check text-green text-base shrink-0 mt-0.5" />
                                  <span>{reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Competencias Coincidentes (Skills Match) */}
                          {Array.isArray(selectedJob.skillsMatch) && selectedJob.skillsMatch.length > 0 && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                              <h5 className="m-0 text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                <i className="bx bx-check-circle text-emerald-700 text-sm" />
                                Competencias Validadas en tu Perfil ({selectedJob.skillsMatch.length})
                              </h5>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedJob.skillsMatch.map((skill) => (
                                  <span
                                    key={skill}
                                    className="inline-flex items-center gap-1 rounded-full bg-white border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs"
                                  >
                                    <i className="bx bx-check text-emerald-600 text-sm" />
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Oportunidades de Aprendizaje / Brechas (Missing Skills) */}
                          {Array.isArray(selectedJob.missingSkills) && selectedJob.missingSkills.length > 0 && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                              <h5 className="m-0 text-xs font-bold text-amber-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                <i className="bx bx-trending-up text-amber-700 text-sm" />
                                Habilidades Opcionales para Mayor Competitividad ({selectedJob.missingSkills.length})
                              </h5>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedJob.missingSkills.map((skill) => (
                                  <span
                                    key={skill}
                                    className="inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800 shadow-2xs"
                                  >
                                    <i className="bx bx-plus text-amber-600 text-sm" />
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Recomendación personalizada */}
                          <div className="rounded-2xl border border-line bg-page p-4 text-xs leading-relaxed text-ink/80">
                            <strong className="block font-bold text-ink mb-1 flex items-center gap-1.5">
                              <i className="bx bx-bulb text-amber-500 text-base" />
                              Consejo para destacar tu postulación en {selectedJob.company}:
                            </strong>
                            Asegúrate de que en la sección de <strong>Habilidades</strong> de tu perfil tengas agregadas herramientas como{' '}
                            {selectedJob.stack.slice(0, 3).join(', ')}. Las empresas aliadas filtran primero los perfiles que cuentan con certificación curricular avalada.
                          </div>
                        </div>
                      )}

                      {/* TAB 3: SOBRE LA EMPRESA & BENEFICIOS */}
                      {activeDetailTab === 'empresa' && (
                        <div className="space-y-6">
                          <div>
                            <h4 className="m-0 font-display text-sm font-bold text-ink mb-2">
                              Acerca de {selectedJob.company}
                            </h4>
                            <p className="m-0 text-xs sm:text-sm text-body-muted leading-relaxed">
                              {selectedJob.companyAbout}
                            </p>
                          </div>

                          {/* Workplace Photo Gallery */}
                          <div>
                            <h4 className="m-0 font-display text-xs font-bold uppercase tracking-wider text-secondary mb-3">
                              Espacios de trabajo e instalaciones reales
                            </h4>
                            <div className="grid grid-cols-3 gap-2.5">
                              {selectedJob.workplacePhotos.map((photo, idx) => (
                                <div key={idx} className="relative h-24 overflow-hidden rounded-xl border border-line bg-ink">
                                  <img
                                    src={photo}
                                    alt={`Instalaciones ${selectedJob.company}`}
                                    className="size-full object-cover transition-transform hover:scale-110"
                                    loading="lazy"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Benefits Grid */}
                          <div>
                            <h4 className="m-0 font-display text-sm font-bold text-ink mb-3 flex items-center gap-2">
                              <i className="bx bx-gift text-amber-500 text-base" />
                              Paquete de Beneficios & Bienestar
                            </h4>
                            <div className="grid gap-2.5 sm:grid-cols-2">
                              {selectedJob.benefits.map((b) => (
                                <div key={b.title} className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`grid size-7 place-items-center rounded-lg text-sm ${b.color}`}>
                                      <i className={`bx ${b.icon}`} />
                                    </span>
                                    <span className="font-display text-xs font-bold text-ink">{b.title}</span>
                                  </div>
                                  <p className="m-0 text-[0.72rem] text-body-muted leading-relaxed">
                                    {b.desc}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 4: PROCESO DE SELECCIÓN */}
                      {activeDetailTab === 'proceso' && (
                        <div className="space-y-5">
                          <div>
                            <h4 className="m-0 font-display text-sm font-bold text-ink">
                              Etapas del Proceso de Selección
                            </h4>
                            <p className="m-0 text-xs text-body-muted mt-1">
                              Proceso 100% transparente y directo, coordinado a través del convenio de la Bolsa de Empleo Institucional.
                            </p>
                          </div>

                          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
                            {selectedJob.hiringProcess.map((step) => (
                              <div key={step.step} className="relative">
                                <span className="absolute -left-6 top-0 grid size-5 place-items-center rounded-full bg-ink text-lime text-[0.65rem] font-bold">
                                  {step.step}
                                </span>
                                <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <h5 className="m-0 font-display text-xs sm:text-sm font-bold text-ink">
                                      {step.title}
                                    </h5>
                                    <span className="rounded-full bg-panel px-2.5 py-0.5 text-[0.62rem] font-bold text-secondary">
                                      {step.duration}
                                    </span>
                                  </div>
                                  <p className="m-0 mt-1 text-xs text-body-muted leading-relaxed">
                                    {step.desc}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                ) : (
                  <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center">
                    <p className="text-sm font-semibold text-ink">Selecciona una vacante para ver la ficha completa.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ─── Grid View (Card Showcase) ─── */
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map((job) => {
                const isApplied = appliedJobs.has(job.id);
                const isJobSaved = isSaved(job.id);

                return (
                  <article
                    key={job.id}
                    className="group overflow-hidden rounded-2xl border border-line bg-white shadow-card hover:shadow-hero hover:border-green/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Panoramic Cover */}
                      <div
                        onClick={() => setGridDetailJob(job)}
                        className="relative h-40 w-full overflow-hidden bg-ink cursor-pointer"
                        title="Haz clic para ver la ficha completa"
                      >
                        <img
                          src={job.companyCover}
                          alt={job.company}
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />

                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="rounded-full bg-ink/75 backdrop-blur-md px-2.5 py-0.5 text-[0.62rem] font-bold text-white border border-white/20">
                            {job.partnershipType}
                          </span>
                        </div>

                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSaveJob(job.id);
                            }}
                            className={`grid size-7 place-items-center rounded-full backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-xs ${isJobSaved
                                ? 'bg-amber-500 text-white border-amber-400'
                                : 'bg-ink/65 text-white/80 hover:bg-white hover:text-ink'
                              }`}
                            title={isJobSaved ? 'Quitar de guardados' : 'Guardar vacante'}
                          >
                            <i className={`bx ${isJobSaved ? 'bxs-bookmark-star' : 'bx-bookmark'} text-xs`} />
                          </button>
                          <span className="rounded-full bg-lime text-ink px-2.5 py-0.5 text-[0.65rem] font-bold shadow-xs">
                            {job.utsMatch}% Match
                          </span>
                        </div>

                        <div className="absolute bottom-3 left-4 flex items-center gap-2.5 text-white">
                          <span className={`grid size-10 place-items-center rounded-xl text-xs font-black shadow-lg font-display ${job.companyLogoBg}`}>
                            {job.companyShort.slice(0, 3).toUpperCase()}
                          </span>
                          <div>
                            <span className="font-display text-sm font-bold text-white block">
                              {job.company}
                            </span>
                            <span className="text-[0.65rem] text-white/70 block">
                              {job.city} · {job.mode}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-5">
                        <h3
                          onClick={() => setGridDetailJob(job)}
                          className="m-0 font-display text-base font-bold text-ink group-hover:text-green-dark transition-colors line-clamp-2 cursor-pointer"
                          title="Haz clic para ver la ficha completa"
                        >
                          {job.title}
                        </h3>

                        <p className="m-0 mt-2 text-xs text-body-muted line-clamp-2 leading-relaxed">
                          {job.summary}
                        </p>

                        <div className="mt-4 pt-3 border-t border-line-soft flex items-center justify-between">
                          <span className="font-display text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            {job.salaryFormatted}
                          </span>
                          <span className="text-[0.7rem] text-secondary">
                            {job.contractType}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1">
                          {job.stack.slice(0, 3).map((s) => (
                            <span key={s} className="rounded-md bg-page px-2 py-0.5 text-[0.65rem] font-semibold text-ink border border-line-soft">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-5 pt-0">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setGridDetailJob(job)}
                          className="flex-1 rounded-xl border border-line bg-page hover:bg-white hover:text-green-dark py-2.5 text-xs font-bold text-ink transition-colors cursor-pointer text-center"
                        >
                          Ver ficha completa
                        </button>
                        <button
                          type="button"
                          onClick={() => setApplyModalJob(job)}
                          className="rounded-xl bg-ink hover:bg-ink-soft py-2.5 px-3.5 text-xs font-bold text-white transition-colors cursor-pointer"
                          title="Postulación rápida"
                        >
                          <i className="bx bx-send text-sm" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ─── Interactive Quick Application Modal ─── */}
      {applyModalJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-hero animate-rise-in">
            <div className="flex items-start justify-between gap-3 border-b border-line-soft pb-4">
              <div className="flex items-center gap-3">
                <span className={`grid size-11 place-items-center rounded-xl text-xs font-bold font-display ${applyModalJob.companyLogoBg}`}>
                  {applyModalJob.companyShort.slice(0, 3).toUpperCase()}
                </span>
                <div>
                  <h3 className="m-0 font-display text-base font-bold text-ink">
                    Postularme a {applyModalJob.title}
                  </h3>
                  <p className="m-0 text-xs text-body-muted">{applyModalJob.company} · {applyModalJob.city}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApplyModalJob(null)}
                className="text-secondary hover:text-ink text-xl p-1 cursor-pointer"
              >
                <i className="bx bx-x" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs">
                <span className="font-bold text-emerald-900 block flex items-center gap-1.5 mb-1">
                  <i className="bx bxs-badge-check text-green text-sm" />
                  Convenio Institucional de Egresados
                </span>
                Tu postulación se enviará directamente con tu perfil verificado de <strong>{profile.fullName}</strong> y tu código de egresado.
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Mensaje o nota breve para el equipo de selección de {applyModalJob.company} (Opcional):
                </label>
                <textarea
                  rows={3}
                  value={applicationNote}
                  onChange={(e) => setApplicationNote(e.target.value)}
                  placeholder="Ej: Estimado equipo, me entusiasma esta oportunidad debido a mi formación profesional y proyectos de desarrollo..."
                  className="w-full rounded-xl border border-line p-3 text-xs text-ink outline-none focus:border-green"
                />
              </div>

              <div className="rounded-xl border border-line bg-page p-3 text-[0.72rem] text-body-muted flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <i className="bx bx-file text-base text-secondary" />
                  {profile.cvFile ? profile.cvFile.name : 'Hoja de Vida Digital (Perfil Institucional)'}
                </span>
                <span className="text-emerald-700 font-bold">Adjunto</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line-soft pt-4">
              <button
                type="button"
                onClick={() => setApplyModalJob(null)}
                className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-secondary hover:text-ink cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                className="rounded-xl bg-green hover:bg-green-dark px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <i className="bx bx-send" />
                Confirmar y enviar postulación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Dedicated Grid Vacancy Detail Modal ─── */}
      <GridVacancyDetailModal
        job={gridDetailJob}
        isOpen={Boolean(gridDetailJob)}
        onClose={() => setGridDetailJob(null)}
        onApply={(jobToApply) => {
          setGridDetailJob(null);
          setApplyModalJob(jobToApply);
        }}
        isApplied={gridDetailJob ? appliedJobs.has(gridDetailJob.id) : false}
        isSaved={gridDetailJob ? isSaved(gridDetailJob.id) : false}
        onToggleSave={toggleSaveJob}
        allJobs={filteredJobs}
        onSelectJob={(newJob) => setGridDetailJob(newJob)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-hero">
            <i className="bx bxs-check-circle text-lime text-lg" />
            {toastMessage}
          </div>
        </div>
      )}
    </GraduatePortalLayout>
  );
}
