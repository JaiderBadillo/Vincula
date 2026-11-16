import { experienceLabel } from '../data/companyVacanciesData.js';
import { daysUntil } from './formatters.js';

export function formatPublicPublishedDate(dateString) {
  if (!dateString) return 'Reciente';
  try {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${String(dateString).slice(0, 10)}T00:00:00Z`));
  } catch {
    return dateString;
  }
}

export function mapPublicVacancy(v) {
  const companyName =
    v.empresa?.nombre_comercial || v.empresa?.razon_social || v.empresa_nombre || 'Empresa Aliada';
  const sectorRaw = String(v.empresa?.sector_economico || '').toLowerCase();
  const isPublicSector =
    sectorRaw.includes('públic') ||
    sectorRaw.includes('public') ||
    sectorRaw.includes('gobierno') ||
    sectorRaw.includes('estado');
  const city = v.sede?.ciudad || v.empresa?.ciudad || '';
  const dept = v.sede?.departamento || '';
  const location = [city, dept].filter(Boolean).join(', ') || v.ubicacion || 'Colombia';
  const publishedDate = v.publicado_en ? String(v.publicado_en).slice(0, 10) : '';
  const expText = experienceLabel(v.nivel_experiencia);
  const salaryText = v.salario_es_confidencial
    ? 'Salario confidencial'
    : v.salario_minimo && v.salario_maximo
      ? `$${Number(v.salario_minimo).toLocaleString('es-CO')} - $${Number(v.salario_maximo).toLocaleString('es-CO')} COP`
      : v.salario_minimo
        ? `Desde $${Number(v.salario_minimo).toLocaleString('es-CO')} COP`
        : 'A convenir';

  return {
    id: v.id,
    vacancyCode: v.codigo_vacante || '',
    title: v.titulo || 'Vacante disponible',
    company: companyName,
    companyName,
    companyShort: companyName,
    companyLogo: v.empresa?.url_logo || v.empresa_logo || null,
    companyInitials:
      companyName
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .slice(0, 3)
        .toUpperCase() || 'EMP',
    category: v.categoria || 'General',
    sector: isPublicSector ? 'public' : 'private',
    sectorLabel: isPublicSector ? 'Sector público' : 'Sector privado',
    location,
    city: city || location,
    mode: v.modalidad || 'Presencial',
    contractType: v.tipo_contrato || '',
    workSchedule: v.jornada_laboral || '',
    studyLevel: expText === 'Sin definir' ? (v.tipo_contrato || 'Por definir') : expText,
    experienceLabel: expText,
    salaryFormatted: salaryText,
    description: v.descripcion || '',
    detail: v.descripcion || '',
    skills: Array.isArray(v.habilidades_requeridas) ? v.habilidades_requeridas : [],
    targetPrograms: Array.isArray(v.programas_afines_nombres) ? v.programas_afines_nombres : [],
    publishedAt: publishedDate,
    closingDate: v.fecha_cierre || '',
    daysRemaining: v.fecha_cierre ? daysUntil(v.fecha_cierre) : null,
    companyLogoBg: isPublicSector ? 'bg-panel text-green' : 'bg-lime/25 text-ink',
    utsMatch: null,
  };
}
