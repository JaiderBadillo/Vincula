/**
 * Logo oficial de Vincula (public/logo-vincula.png). Es decorativo: el enlace que lo contiene ya lleva aria-label.
 * onDark: sobre fondos oscuros va dentro de una insignia blanca para que el verde oscuro no se pierda.
 */
export default function BrandMark({ className = 'h-9', onDark = false }) {
  return (
    <img
      src="/logo-vincula.png"
      alt=""
      aria-hidden="true"
      width="320"
      height="228"
      className={`w-auto shrink-0 select-none object-contain ${onDark ? 'rounded-xl bg-white px-1.5 py-1' : ''} ${className}`}
    />
  );
}
