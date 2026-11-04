export function formatApplicationDate(date) {
  if (!date) return '—';

  const parts = new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatToParts(new Date(`${date}T12:00:00Z`));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.day} ${values.month.replace('.', '')} ${values.year}`;
}

/** Días que faltan hasta una fecha `YYYY-MM-DD` (negativo si ya pasó, null si no hay fecha). */
export function daysUntil(date) {
  if (!date) return null;
  const target = new Date(`${date}T23:59:59`);
  const diff = target.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatInterviewDate(dateTime) {
  if (!dateTime) return 'Fecha por confirmar';

  const formattedDate = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Bogota',
  }).format(new Date(dateTime)).replace(/\sde\s/g, ' ');

  return `${formattedDate.charAt(0).toLocaleUpperCase('es-CO')}${formattedDate.slice(1)}`;
}

export function formatInterviewTime(dateTime) {
  if (!dateTime) return 'Hora por confirmar';

  return new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Bogota',
  }).format(new Date(dateTime));
}
