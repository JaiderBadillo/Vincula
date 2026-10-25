import {
  Header,
  Hero,
  SponsorBand,
  JobBoardPreview,
  Features,
  Showcase,
  ClosingCta,
  Footer,
} from '../components/landing/index.js';

/**
 * HomePage — Landing page de Vincula.
 *
 * Ensambla todos los componentes de la landing en el orden
 * definido por el diseño Kombai:
 *
 * 1. Header  → Navegación principal
 * 2. Hero    → Sección héroe con formulario de perfil
 * 3. SponsorBand → Respaldo institucional (UTS)
 * 4. JobBoardPreview → Tablero de oportunidades laborales
 * 5. Features → Matriz de capacidades por audiencia
 * 6. Showcase → Galería de imágenes "En la práctica"
 * 7. ClosingCta → Llamado a la acción final
 * 8. Footer  → Pie de página
 */
export default function HomePage() {
  return (
    <>
      <a
        className="absolute left-3 top-3 z-50 -translate-y-[160%] rounded-control bg-white px-4 py-3 font-bold text-ink focus:translate-y-0"
        href="#main-content"
      >
        Saltar al contenido
      </a>

      <Header />

      <main id="main-content">
        <Hero />
        <SponsorBand />
        <JobBoardPreview />
        <Features />
        <Showcase />
        <ClosingCta />
      </main>

      <Footer />
    </>
  );
}
