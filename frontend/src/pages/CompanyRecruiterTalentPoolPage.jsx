import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';
import CompanyPageHero from '../components/company/CompanyPageHero.jsx';
import InviteToVacancyModal from '../components/company/InviteToVacancyModal.jsx';
import TalentDetailDrawer from '../components/company/TalentDetailDrawer.jsx';
import { useCompanyTalentPool } from '../hooks/useCompanyTalentPool.js';
import { useCompanyVacancies } from '../hooks/useCompanyVacancies.js';
import { companyPhotos } from '../data/companyImages.js';
import { TALENT_STATUSES, ALLIED_INSTITUTIONS } from '../data/companyTalentPoolData.js';

const selectClass =
  'w-full appearance-none rounded-xl border border-sand-line bg-white py-2.5 pl-3.5 pr-9 text-xs font-semibold text-ink outline-none transition-colors focus:border-terracotta cursor-pointer';

function initialsOf(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

/**
 * Calcula afinidad dinámica entre un talento y una vacante seleccionada.
 */
function calculateTalentMatch(talent, vacancy) {
  if (!vacancy) return null;
  const vacSkills = (vacancy.skills || []).map((s) => s.toLowerCase().trim());
  const talentSkills = (talent.skills || []).map((s) => s.toLowerCase().trim());
  const verifiedSkills = (talent.skillsVerified || []).map((s) => s.toLowerCase().trim());

  let matches = 0;
  let verifiedMatches = 0;

  for (const s of talentSkills) {
    if (vacSkills.some((vs) => vs.includes(s) || s.includes(vs))) {
      matches += 1;
      if (verifiedSkills.some((vs) => vs.includes(s) || s.includes(vs))) {
        verifiedMatches += 1;
      }
    }
  }

  const targetPrograms = (vacancy.targetPrograms || []).map((p) => p.toLowerCase().trim());
  const programMatch = targetPrograms.some((tp) =>
    talent.program.toLowerCase().includes(tp) || tp.includes(talent.program.toLowerCase())
  );

  const denom = Math.max(vacSkills.length, 1);
  const baseRatio = matches / denom;
  let score = Math.round(baseRatio * 55 + (programMatch ? 35 : 12) + verifiedMatches * 3);
  if (score > 98) score = 98;
  if (score < 45) score = 45;

  return {
    score,
    matchesCount: matches,
    totalVacancySkills: vacSkills.length,
    programMatch,
  };
}

export default function CompanyRecruiterTalentPoolPage() {
  const { talents, toggleBookmark, inviteToVacancy } = useCompanyTalentPool();
  const { vacancies } = useCompanyVacancies();

  // Filtros de búsqueda
  const [query, setQuery] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [compareVacancyId, setCompareVacancyId] = useState('');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  // Estados de modales y drawers
  const [selectedTalentForDrawer, setSelectedTalentForDrawer] = useState(null);
  const [selectedTalentForInvite, setSelectedTalentForInvite] = useState(null);
  const [toast, setToast] = useState(null);

  // Auto-cierre de toast
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Vacantes activas abiertas disponibles para comparar e invitar
  const activeVacancies = useMemo(
    () => vacancies.filter((v) => v.status === 'open' || v.status === 'paused'),
    [vacancies]
  );

  const comparedVacancy = useMemo(
    () => vacancies.find((v) => v.id === compareVacancyId) || null,
    [vacancies, compareVacancyId]
  );

  // Mapa de vacantes por ID para badges rápidos
  const vacancyById = useMemo(
    () => Object.fromEntries(vacancies.map((v) => [v.id, v])),
    [vacancies]
  );

  // Estadísticas del hero
  const heroStats = useMemo(() => {
    const total = talents.length;
    const recien = talents.filter((t) => t.status === 'recien-egresado').length;
    const practicantes = talents.filter((t) => t.status === 'practicante').length;
    const guardados = talents.filter((t) => t.isBookmarked).length;

    return [
      { label: 'Talento en Red IES', value: String(total) },
      { label: 'Recién Egresados', value: String(recien) },
      { label: 'Practicantes Activos', value: String(practicantes) },
      { label: 'En Reserva Favoritos', value: String(guardados) },
    ];
  }, [talents]);

  // Filtrado de talentos
  const filteredTalents = useMemo(() => {
    const q = query.trim().toLowerCase();

    return talents.filter((t) => {
      if (onlyBookmarked && !t.isBookmarked) return false;
      if (institutionFilter !== 'all') {
        const instShort = t.institutionShort?.toLowerCase() || '';
        if (institutionFilter === 'uts' && !instShort.includes('uts')) return false;
        if (institutionFilter === 'uis' && !instShort.includes('uis')) return false;
      }
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      if (!q) return true;

      const inName = t.fullName.toLowerCase().includes(q);
      const inProgram = t.program.toLowerCase().includes(q);
      const inCity = t.city?.toLowerCase().includes(q);
      const inSkills = (t.skills || []).some((s) => s.toLowerCase().includes(q));
      const inProject = t.capstoneProject?.toLowerCase().includes(q);

      return inName || inProgram || inCity || inSkills || inProject;
    });
  }, [talents, query, onlyBookmarked, institutionFilter, statusFilter]);

  // Lista ordenada por afinidad si hay una vacante seleccionada
  const sortedTalents = useMemo(() => {
    if (!comparedVacancy) return filteredTalents;

    return [...filteredTalents].sort((a, b) => {
      const matchA = calculateTalentMatch(a, comparedVacancy)?.score || 0;
      const matchB = calculateTalentMatch(b, comparedVacancy)?.score || 0;
      return matchB - matchA;
    });
  }, [filteredTalents, comparedVacancy]);

  const hasActiveFilters =
    query.trim() !== '' ||
    institutionFilter !== 'all' ||
    statusFilter !== 'all' ||
    onlyBookmarked ||
    compareVacancyId !== '';

  function handleResetFilters() {
    setQuery('');
    setInstitutionFilter('all');
    setStatusFilter('all');
    setOnlyBookmarked(false);
    setCompareVacancyId('');
  }

  function handleInviteSuccess(talentId, vacancyId) {
    inviteToVacancy(talentId, vacancyId);
    const targetTalent = talents.find((t) => t.id === talentId);
    const targetVac = vacancies.find((v) => v.id === vacancyId);
    setToast(
      `Invitación enviada a ${targetTalent?.fullName || 'el egresado'} para la vacante «${
        targetVac?.title || 'convocatoria'
      }».`
    );
  }

  return (
    <CompanyPortalLayout activePage="recruiter-talento" role="recruiter">
      <main className="w-full pb-20">
        <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-10 space-y-8">
          {/* ─── 1. Hero Showcase del Banco de Talento ─── */}
          <CompanyPageHero
            photo={companyPhotos.talento}
            title="Banco de Talento IES"
            subtitle="Explora el repositorio institucional de egresados y practicantes verificados de universidades aliadas (UTS, UIS). Realiza headhunting proactivo, evalúa afinidad con tus vacantes e invítalos a postularse en un clic."
            stats={heroStats}
            actions={
              <Link
                to="/empresa/reclutador/vacantes"
                className="inline-flex items-center gap-2 rounded-xl bg-ochre hover:bg-ochre-light text-cocoa font-bold px-4 py-2.5 text-xs shadow-xs transition-all no-underline cursor-pointer"
              >
                <i className="bx bx-briefcase-alt-2 text-base" />
                <span>Mis Vacantes Activas</span>
              </Link>
            }
          />

          {/* Toast Notification */}
          {toast && (
            <div
              className="flex items-center justify-between rounded-xl border border-sand-line bg-cream px-4 py-2.5 text-xs text-ink shadow-sm animate-in fade-in"
              role="status"
            >
              <div className="flex items-center gap-2">
                <i className="bx bx-check-circle text-base text-terracotta" />
                <span>{toast}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-secondary hover:text-ink cursor-pointer"
              >
                <i className="bx bx-x text-lg" />
              </button>
            </div>
          )}

          {/* ─── 2. Panel de Filtros y Comparador de Afinidad ─── */}
          <section data-tour="company-buscar-talento" className="rounded-2xl border border-sand-line bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sand-line pb-4">
              <div>
                <h3 className="m-0 font-display text-sm font-bold text-ink flex items-center gap-2">
                  <i className="bx bx-filter-alt text-base text-terracotta" />
                  <span>Filtros de Búsqueda y Sourcing</span>
                </h3>
                <p className="m-0 mt-0.5 text-xs text-secondary">
                  Filtra por institución aliada, formación profesional o compara compatibilidad con tus vacantes abiertas.
                </p>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-terracotta hover:underline cursor-pointer self-start sm:self-auto"
                >
                  <i className="bx bx-reset text-sm" />
                  <span>Limpiar filtros</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Buscador de texto */}
              <div className="space-y-1">
                <label className="text-[0.72rem] font-bold text-secondary uppercase tracking-wider">
                  Buscar talento
                </label>
                <div className="relative">
                  <i className="bx bx-search absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-secondary" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nombre, carrera o competencia..."
                    className="w-full rounded-xl border border-sand-line bg-white py-2.5 pl-9 pr-3.5 text-xs font-medium text-ink placeholder:text-stone-400 focus:border-terracotta focus:outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-ink cursor-pointer"
                    >
                      <i className="bx bx-x text-sm" />
                    </button>
                  )}
                </div>
              </div>

              {/* Selector de IES */}
              <div className="space-y-1">
                <label className="text-[0.72rem] font-bold text-secondary uppercase tracking-wider">
                  Institución Aliada
                </label>
                <div className="relative">
                  <select
                    value={institutionFilter}
                    onChange={(e) => setInstitutionFilter(e.target.value)}
                    className={selectClass}
                  >
                    {ALLIED_INSTITUTIONS.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                  <i className="bx bx-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-secondary" />
                </div>
              </div>

              {/* Selector de Estado Formativo */}
              <div className="space-y-1">
                <label className="text-[0.72rem] font-bold text-secondary uppercase tracking-wider">
                  Estado Académico
                </label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={selectClass}
                  >
                    {TALENT_STATUSES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                  <i className="bx bx-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-secondary" />
                </div>
              </div>

              {/* Comparador de Afinidad con Vacante Activa */}
              <div className="space-y-1">
                <label className="text-[0.72rem] font-bold text-cocoa uppercase tracking-wider flex items-center gap-1">
                  <i className="bx bx-git-compare text-ochre-dark" />
                  <span>Comparar afinidad con:</span>
                </label>
                <div className="relative">
                  <select
                    value={compareVacancyId}
                    onChange={(e) => setCompareVacancyId(e.target.value)}
                    className={`${selectClass} border-ochre/40 bg-ochre/5`}
                  >
                    <option value="">(Sin comparar vacante)</option>
                    {activeVacancies.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.code}: {v.title}
                      </option>
                    ))}
                  </select>
                  <i className="bx bx-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-secondary" />
                </div>
              </div>
            </div>

            {/* Fila inferior de toggle y feedback de comparación */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOnlyBookmarked((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    onlyBookmarked
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : 'border-sand-line bg-white text-secondary hover:bg-cream hover:text-ink'
                  }`}
                >
                  <i className={`bx ${onlyBookmarked ? 'bxs-star text-amber-500' : 'bx-star'}`} />
                  <span>Solo guardados en favoritos</span>
                </button>

                {comparedVacancy && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-ochre/15 px-2.5 py-1 text-xs font-semibold text-cocoa">
                    <i className="bx bx-check-double text-ochre-dark text-sm" />
                    <span>Ordenando por afinidad con «{comparedVacancy.title}»</span>
                  </span>
                )}
              </div>

              <span className="text-xs font-medium text-secondary">
                Mostrando <strong className="text-ink">{sortedTalents.length}</strong> de {talents.length} talentos
              </span>
            </div>
          </section>

          {/* ─── 3. Grid de Perfiles de Talento ─── */}
          {sortedTalents.length === 0 ? (
            <div className="rounded-2xl border border-sand-line bg-white p-12 text-center space-y-4">
              <span className="grid size-14 place-items-center rounded-2xl bg-sand text-3xl text-secondary mx-auto">
                <i className="bx bx-user-x" />
              </span>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="m-0 font-display text-base font-bold text-ink">
                  No se encontraron egresados con estos criterios
                </h4>
                <p className="m-0 text-xs text-secondary leading-relaxed">
                  Prueba modificando los términos de búsqueda o limpiando los filtros seleccionados para visualizar más perfiles del convenio universitario.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 rounded-xl bg-cocoa px-4 py-2 text-xs font-bold text-white hover:bg-cocoa/90 transition-all cursor-pointer"
              >
                <i className="bx bx-reset text-sm" />
                <span>Restablecer todos los filtros</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {sortedTalents.map((talent) => {
                const matchData = comparedVacancy
                  ? calculateTalentMatch(talent, comparedVacancy)
                  : null;

                const statusMeta =
                  TALENT_STATUSES.find((s) => s.id === talent.status) || TALENT_STATUSES[1];

                const vacSkillsLower = comparedVacancy
                  ? (comparedVacancy.skills || []).map((s) => s.toLowerCase().trim())
                  : [];

                return (
                  <article
                    key={talent.id}
                    className="flex flex-col justify-between rounded-2xl border border-sand-line bg-white p-5 shadow-2xs hover:border-terracotta/40 hover:shadow-md transition-all group"
                  >
                    <div className="space-y-4">
                      {/* Cabecera de la tarjeta: Avatar, Nombre, Verificación, Estrella */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {talent.avatar ? (
                            <img
                              src={talent.avatar}
                              alt={talent.fullName}
                              className="size-13 shrink-0 rounded-xl border border-sand-line object-cover"
                            />
                          ) : (
                            <span className="grid size-13 shrink-0 place-items-center rounded-xl bg-sand text-sm font-bold text-terracotta-dark">
                              {initialsOf(talent.fullName)}
                            </span>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="m-0 font-display text-sm font-bold text-ink truncate">
                                {talent.fullName}
                              </h4>
                              <span
                                className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[0.65rem] font-bold text-emerald-800"
                                title="Perfil y calificaciones validadas directamente por la IES"
                              >
                                <i className="bx bxs-check-shield text-emerald-600 text-xs" />
                                <span>Verificado IES</span>
                              </span>
                            </div>

                            <p className="m-0 text-xs font-semibold text-cocoa line-clamp-1">
                              {talent.program}
                            </p>

                            <p className="m-0 text-[0.72rem] text-secondary flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-ink">{talent.institutionShort}</span>
                              <span>•</span>
                              <span>{talent.campus}</span>
                            </p>
                          </div>
                        </div>

                        {/* Botón Favorito / Guardar */}
                        <button
                          type="button"
                          onClick={() => toggleBookmark(talent.id)}
                          className={`grid size-8 place-items-center rounded-lg border transition-colors shrink-0 cursor-pointer ${
                            talent.isBookmarked
                              ? 'border-amber-300 bg-amber-50 text-amber-600'
                              : 'border-sand-line bg-white text-secondary hover:text-ink hover:bg-cream'
                          }`}
                          title={talent.isBookmarked ? 'Quitar de guardados' : 'Guardar en talentos favoritos'}
                        >
                          <i className={`bx ${talent.isBookmarked ? 'bxs-star text-base' : 'bx-star text-base'}`} />
                        </button>
                      </div>

                      {/* Estado Formativo, Modalidad & Promedio GPA */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-bold ${statusMeta.badge}`}>
                          {statusMeta.label}
                        </span>

                        {talent.gpa && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-sand-line bg-cream/50 px-2 py-0.5 text-[0.68rem] font-bold text-cocoa">
                            <i className="bx bx-award text-ochre-dark" />
                            <span>Promedio: {talent.gpa}</span>
                          </span>
                        )}

                        <span className="text-[0.72rem] text-secondary">
                          {talent.city} · {(talent.modality || []).join('/')}
                        </span>
                      </div>

                      {/* Medidor de Afinidad Dinámica (si hay vacante comparada) */}
                      {matchData && (
                        <div className="rounded-xl border border-ochre/30 bg-ochre/10 p-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-cocoa flex items-center gap-1">
                              <i className="bx bx-target-lock text-terracotta text-sm" />
                              <span>Afinidad con «{comparedVacancy.title}»</span>
                            </span>
                            <span className="font-display font-black text-sm text-terracotta">
                              {matchData.score}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-ochre/25 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-ochre to-terracotta transition-all duration-500"
                              style={{ width: `${matchData.score}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[0.68rem] text-secondary">
                            <span>
                              {matchData.matchesCount} de {matchData.totalVacancySkills} competencias requeridas
                            </span>
                            {matchData.programMatch && (
                              <span className="text-emerald-800 font-semibold">
                                ✓ Programa afín
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Proyecto de Grado / Capstone */}
                      {talent.capstoneProject && (
                        <div className="rounded-xl border border-sand-line/60 bg-cream/30 p-2.5 text-xs">
                          <span className="font-bold text-secondary text-[0.68rem] uppercase tracking-wider block">
                            Proyecto destacado / Capstone
                          </span>
                          <p className="m-0 mt-0.5 text-ink line-clamp-1 italic text-[0.72rem]">
                            «{talent.capstoneProject}»
                          </p>
                        </div>
                      )}

                      {/* Competencias Clave y Verificadas */}
                      <div className="space-y-1.5">
                        <span className="text-[0.68rem] font-bold text-secondary uppercase tracking-wider block">
                          Competencias evaluadas por IES
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(talent.skills || []).slice(0, 6).map((skill) => {
                            const isVerified = (talent.skillsVerified || []).includes(skill);
                            const isVacancyMatch = vacSkillsLower.some(
                              (vs) => vs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(vs)
                            );

                            return (
                              <span
                                key={skill}
                                className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[0.68rem] font-medium border transition-colors ${
                                  isVacancyMatch
                                    ? 'bg-ochre/25 text-cocoa font-bold border-ochre/50'
                                    : isVerified
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                      : 'bg-sand/60 text-secondary border-sand-line'
                                }`}
                              >
                                {isVerified && <i className="bx bx-check text-emerald-700 text-xs" />}
                                <span>{skill}</span>
                              </span>
                            );
                          })}
                          {(talent.skills || []).length > 6 && (
                            <span className="text-[0.68rem] text-secondary font-medium px-1 py-0.5">
                              +{(talent.skills || []).length - 6} más
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ─── Acciones Inferiores ─── */}
                    <div className="mt-5 pt-3.5 border-t border-sand-line flex flex-wrap items-center justify-between gap-2.5">
                      {/* Estado de invitaciones previas */}
                      <div>
                        {talent.invitedVacancies && talent.invitedVacancies.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold text-cocoa">
                            <i className="bx bx-check-circle text-emerald-700" />
                            <span>
                              Invitado a {talent.invitedVacancies.length} convocatoria{talent.invitedVacancies.length === 1 ? '' : 's'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[0.68rem] text-stone-500">
                            Disponible para postulación
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTalentForDrawer(talent)}
                          className="inline-flex items-center gap-1 rounded-xl border border-sand-line bg-white px-3 py-1.5 text-xs font-bold text-secondary hover:text-ink hover:bg-cream transition-colors cursor-pointer"
                        >
                          <i className="bx bx-id-card text-sm" />
                          <span>Ver Perfil</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedTalentForInvite(talent)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-cocoa px-3.5 py-1.5 text-xs font-bold text-white hover:bg-cocoa/90 transition-all cursor-pointer shadow-2xs"
                        >
                          <i className="bx bx-paper-plane text-xs" />
                          <span>Invitar</span>
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

      {/* ─── Drawer de Detalle Completo de Egresado ─── */}
      <TalentDetailDrawer
        talent={selectedTalentForDrawer}
        onClose={() => setSelectedTalentForDrawer(null)}
        onOpenInvite={(tal) => {
          setSelectedTalentForDrawer(null);
          setSelectedTalentForInvite(tal);
        }}
        onToggleBookmark={toggleBookmark}
      />

      {/* ─── Modal de Invitación Directa a Convocatoria ─── */}
      <InviteToVacancyModal
        isOpen={Boolean(selectedTalentForInvite)}
        talent={selectedTalentForInvite}
        vacancies={activeVacancies}
        onClose={() => setSelectedTalentForInvite(null)}
        onInvite={handleInviteSuccess}
      />
    </CompanyPortalLayout>
  );
}

