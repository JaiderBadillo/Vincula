/**
 * Logo oficial de Vincula (public/logo-vincula.png). Es decorativo: el enlace que lo contiene ya lleva aria-label.
 * onDark: versión con el verde aclarado (logo-vincula-claro.png) para fondos oscuros, donde el verde original se pierde.
 */
export default function BrandMark({ className = 'h-9', onDark = false }) {
  return (
    <img
      src={onDark ? '/logo-vincula-claro.png' : '/logo-vincula.png'}
      alt=""
      aria-hidden="true"
      width="320"
      height="228"
      className={`w-auto shrink-0 select-none object-contain ${className}`}
    />
  );
}
