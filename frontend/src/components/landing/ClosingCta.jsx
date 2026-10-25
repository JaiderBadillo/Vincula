import { primaryButton } from '../../utils/classes.js';

export default function ClosingCta() {
  return (
    <section className="bg-ink px-5 py-12 text-white sm:px-6 lg:px-10" aria-labelledby="closing-title">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-card border border-white/10 bg-white/[0.03] p-6 sm:flex-row sm:items-center sm:px-8 sm:py-7">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-lime">Da el siguiente paso</p>
          <h2 className="max-w-4xl font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl" id="closing-title">Descubre una forma más conectada de buscar empleo.</h2>
        </div>
        <a className={`${primaryButton} shrink-0 px-6 py-4`} href="#capacidades">Conocer la plataforma <i className="bx bx-right-arrow-alt text-xl" aria-hidden="true" /></a>
      </div>
    </section>
  );
}
