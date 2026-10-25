function BrandMark() {
  return <span className="grid size-9 place-items-center rounded-lg bg-ink text-xl text-lime" aria-hidden="true"><i className="bx bx-briefcase" /></span>;
}

export default function Footer() {
  return (
    <footer className="bg-panel px-5 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 sm:flex-row">
        <a className="flex items-center gap-3 text-ink no-underline" href="#inicio" aria-label="Vincula, volver al inicio">
          <BrandMark />
          <span className="grid gap-0.5"><span className="font-display text-sm font-bold tracking-[0.12em]">VINCULA</span><span className="text-xs text-body-muted">Red de talento universitario</span></span>
        </a>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-blue-muted" aria-label="Enlaces por audiencia">
          <a className="text-inherit no-underline hover:text-green" href="#egresados">Egresados</a>
          <a className="text-inherit no-underline hover:text-green" href="#empleadores">Empleadores</a>
          <a className="text-inherit no-underline hover:text-green" href="#universidades">Universidades</a>
        </nav>
        <p className="mb-0 text-xs text-body-muted">Plataforma de vinculación laboral</p>
      </div>
    </footer>
  );
}
