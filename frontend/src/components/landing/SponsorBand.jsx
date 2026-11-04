export default function SponsorBand() {
  return (
    <section className="border-b border-line-soft bg-page" aria-label="Respaldo institucional">
      <div className="mx-auto flex min-h-[136px] max-w-7xl flex-col items-center justify-center gap-3 px-5 py-5 sm:min-h-[120px] sm:flex-row sm:gap-7 sm:px-6 lg:px-10">
        <span className="shrink-0 text-center font-display text-sm font-medium text-ink sm:text-right">Respaldado por</span>
        <span className="hidden h-10 w-px bg-line sm:block" aria-hidden="true" />
        <img className="h-16 w-auto max-w-[min(20rem,80vw)] object-contain sm:h-20 sm:max-w-[380px]" src="/assets/uts-logo.png" alt="Institución de Educación Superior" width="320" height="188" />
      </div>
    </section>
  );
}
