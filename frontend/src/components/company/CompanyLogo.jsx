/**
 * Logo de la empresa; si no hay imagen muestra el icono corporativo institucional.
 * `size` recibe una clase de tamaño de Tailwind (ej. "size-9", "size-14", "size-24").
 */
export default function CompanyLogo({ profile, size = 'size-9' }) {
  if (profile?.logo) {
    return (
      <span
        className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-xl border border-sand-line bg-white p-1 shadow-2xs`}
      >
        <img src={profile.logo} alt={profile.name} className="size-full object-contain" />
      </span>
    );
  }

  const iconSize =
    size === 'size-24'
      ? 'text-4xl'
      : size === 'size-14'
        ? 'text-2xl'
        : 'text-lg';

  return (
    <span
      className={`grid ${size} shrink-0 place-items-center rounded-xl border border-terracotta/25 bg-terracotta/10 text-terracotta shadow-2xs`}
      title={profile?.name || 'Empresa'}
    >
      <i className={`bx bxs-business ${iconSize}`} aria-hidden="true" />
    </span>
  );
}

