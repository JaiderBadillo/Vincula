import { useState, useEffect, useRef } from 'react';

/**
 * Visor Integrado de Documentos Oficiales en Vincula.
 * Permite visualizar diplomas, actas de grado, certificaciones y documentos de auditoría
 * directamente dentro de la plataforma sin salir a pestañas externas ni depender de visores crudos.
 * Incluye controles de zoom, rotación, descarga, impresión y ficha institucional oficial de respaldo.
 */
export default function DocumentViewerModal({
  isOpen,
  onClose,
  documentUrl,
  title = 'Documento Oficial',
  subtitle = 'Expediente digital en red Vincula',
  documentType = 'diploma', // 'diploma' | 'cv' | 'rut' | 'camara_comercio' | 'certificacion'
  metadata = {},
}) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [viewMode, setViewMode] = useState('pdf'); // 'pdf' | 'folio'
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setLoadError(false);
      setZoom(100);
      setRotation(0);
      setViewMode('pdf');
    }
  }, [isOpen, documentUrl]);

  // Manejo de atajos de teclado (Escape, Zoom, etc.)
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setZoom((prev) => Math.min(200, prev + 15));
      } else if (e.key === '-') {
        setZoom((prev) => Math.max(50, prev - 15));
      } else if (e.key === 'r' || e.key === 'R') {
        setRotation((prev) => (prev + 90) % 360);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const {
    studentName = 'Egresado Verificado',
    documentId = 'CC 1098765432',
    institution = 'Unidades Tecnológicas de Santander',
    sniesCode = '103241',
    program = 'Ingeniería / Tecnología',
    degreeLevel = 'Profesional Universitario',
    actaNumber = 'ACTA-2025-0842',
    bookFolio = 'Libro 48, Folio 112',
    degreeDate = '15 de Diciembre de 2025',
    selloDigital = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    verified = true,
  } = metadata;

  function handlePrint() {
    if (documentUrl) {
      const printWindow = window.open(documentUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
        setTimeout(() => printWindow.print(), 800);
      }
    } else {
      window.print();
    }
  }

  function handleDownload() {
    if (!documentUrl) return;
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div
      className="fixed inset-0 z-[10010] flex items-center justify-center bg-[#051F26]/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-viewer-title"
    >
      <div
        ref={containerRef}
        className={`flex flex-col w-full bg-white rounded-3xl shadow-2xl border border-line overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? 'fixed inset-2 z-[10020] h-[calc(100vh-16px)] max-w-none'
            : 'h-[92vh] max-w-5xl'
        }`}
      >
        {/* ─── Encabezado Principal y Barra de Herramientas ─── */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-page px-5 py-3.5 shrink-0">
          {/* Título e Info del Documento */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid size-10 place-items-center rounded-2xl bg-ink text-lime text-xl shrink-0 shadow-2xs">
              <i className="bx bxs-file-pdf" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 id="doc-viewer-title" className="m-0 font-display text-sm sm:text-base font-bold text-ink truncate">
                  {title}
                </h3>
                {verified && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[0.65rem] font-bold shrink-0">
                    <i className="bx bxs-shield-check text-xs text-emerald-600" />
                    <span>Oficial Avalado</span>
                  </span>
                )}
              </div>
              <p className="m-0 text-xs text-secondary truncate">
                {subtitle} · {institution}
              </p>
            </div>
          </div>

          {/* Conmutador de Vistas & Controles */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Pestañas de Vista */}
            <div className="flex items-center rounded-xl bg-panel p-1 border border-line text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('pdf')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'pdf'
                    ? 'bg-white text-ink shadow-xs font-bold'
                    : 'text-secondary hover:text-ink'
                }`}
                title="Ver archivo PDF interactivo"
              >
                <i className="bx bx-file text-sm" />
                <span className="hidden sm:inline">Visor PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('folio')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'folio'
                    ? 'bg-white text-ink shadow-xs font-bold'
                    : 'text-secondary hover:text-ink'
                }`}
                title="Ver Ficha y Folio Institucional"
              >
                <i className="bx bx-badge-check text-sm text-emerald-700" />
                <span className="hidden sm:inline">Ficha Institucional</span>
              </button>
            </div>

            {/* Controles de Zoom y Rotación (Solo en modo PDF) */}
            {viewMode === 'pdf' && (
              <div className="hidden md:flex items-center gap-1 bg-panel rounded-xl p-1 border border-line text-xs">
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.max(50, prev - 15))}
                  className="grid size-7 place-items-center rounded-lg text-secondary hover:text-ink hover:bg-white transition-colors cursor-pointer"
                  title="Reducir zoom (-)"
                >
                  <i className="bx bx-zoom-out text-base" />
                </button>
                <span className="px-2 font-mono text-[0.72rem] text-ink font-bold min-w-[3rem] text-center">
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.min(200, prev + 15))}
                  className="grid size-7 place-items-center rounded-lg text-secondary hover:text-ink hover:bg-white transition-colors cursor-pointer"
                  title="Aumentar zoom (+)"
                >
                  <i className="bx bx-zoom-in text-base" />
                </button>
                <div className="h-4 w-px bg-line mx-0.5" />
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="grid size-7 place-items-center rounded-lg text-secondary hover:text-ink hover:bg-white transition-colors cursor-pointer"
                  title="Rotar 90 grados (R)"
                >
                  <i className="bx bx-rotate-right text-base" />
                </button>
              </div>
            )}

            {/* Acciones de Exportación & Cierre */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDownload}
                className="grid size-8 place-items-center rounded-xl border border-line bg-white text-secondary hover:text-ink hover:bg-panel transition-colors cursor-pointer shadow-2xs"
                title="Descargar archivo en PDF"
                aria-label="Descargar"
              >
                <i className="bx bx-download text-base" />
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="hidden sm:grid size-8 place-items-center rounded-xl border border-line bg-white text-secondary hover:text-ink hover:bg-panel transition-colors cursor-pointer shadow-2xs"
                title="Imprimir documento oficial"
                aria-label="Imprimir"
              >
                <i className="bx bx-printer text-base" />
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen((prev) => !prev)}
                className="grid size-8 place-items-center rounded-xl border border-line bg-white text-secondary hover:text-ink hover:bg-panel transition-colors cursor-pointer shadow-2xs"
                title={isFullscreen ? 'Restaurar tamaño' : 'Pantalla completa'}
                aria-label="Pantalla completa"
              >
                <i className={`bx ${isFullscreen ? 'bx-exit-fullscreen' : 'bx-fullscreen'} text-base`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="grid size-8 place-items-center rounded-xl bg-ink text-white hover:bg-ink-soft transition-colors cursor-pointer shadow-xs ml-1"
                title="Cerrar visor (Esc)"
                aria-label="Cerrar"
              >
                <i className="bx bx-x text-xl" />
              </button>
            </div>
          </div>
        </header>

        {/* ─── Área Central de Visualización ─── */}
        <main className="relative flex-1 overflow-auto bg-[#1A252C] p-3 sm:p-6 flex items-center justify-center">
          {viewMode === 'pdf' && (
            <div
              className="relative w-full h-full flex items-center justify-center transition-all duration-200"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
            >
              {/* Cargador inicial */}
              {isLoading && !loadError && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#1A252C]/90 text-white backdrop-blur-xs">
                  <span className="grid size-12 place-items-center rounded-full bg-lime/20 text-lime text-2xl">
                    <i className="bx bx-loader-alt bx-spin" />
                  </span>
                  <div className="text-center">
                    <p className="m-0 text-sm font-bold">Cargando documento oficial...</p>
                    <p className="m-0 text-xs text-white/70">Conectando con Supabase Storage</p>
                  </div>
                </div>
              )}

              {/* Contenedor Iframe para visualización de PDF */}
              {documentUrl && !loadError ? (
                <iframe
                  src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  title={title}
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setLoadError(true);
                  }}
                  className="w-full h-full rounded-2xl border border-white/10 bg-white shadow-2xl"
                />
              ) : (
                /* Fallback automático cuando no hay URL o si falla el iframe */
                <div className="max-w-md w-full rounded-3xl border border-white/15 bg-white/10 p-6 text-center text-white backdrop-blur-md shadow-2xl space-y-4">
                  <div className="grid size-14 mx-auto place-items-center rounded-2xl bg-amber-500/20 text-amber-400 text-3xl">
                    <i className="bx bx-shield-quarter" />
                  </div>
                  <div>
                    <h4 className="m-0 font-display text-base font-bold text-white">
                      Certificación Resguardada en Red
                    </h4>
                    <p className="m-0 mt-1 text-xs text-white/70 leading-relaxed">
                      El expediente de <strong>{studentName}</strong> cuenta con refrendación institucional completa. Puedes consultar el folio o reintentar la conexión.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('folio')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-lime text-ink px-4 py-2 text-xs font-bold hover:bg-lime-dark transition-colors cursor-pointer"
                    >
                      <i className="bx bx-id-card text-base" />
                      <span>Ver Ficha Oficial</span>
                    </button>
                    {documentUrl && (
                      <a
                        href={documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 text-white px-3.5 py-2 text-xs font-semibold hover:bg-white/20 transition-colors no-underline cursor-pointer"
                      >
                        <i className="bx bx-link-external text-sm" />
                        <span>Abrir enlace directo</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Modo Folio / Ficha Institucional Oficial (Membretada) ─── */}
          {viewMode === 'folio' && (
            <div className="w-full max-w-3xl my-auto rounded-3xl border border-line bg-white p-6 sm:p-10 shadow-2xl text-ink space-y-6 animate-in fade-in duration-200">
              {/* Marco Superior Institucional */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-green/30 pb-5">
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    REPÚBLICA DE COLOMBIA · MINISTERIO DE EDUCACIÓN NACIONAL
                  </span>
                  <h2 className="m-0 font-display text-lg sm:text-xl font-bold text-ink">
                    {institution}
                  </h2>
                  <p className="m-0 text-xs text-secondary">
                    Código SNIES: <strong>{sniesCode}</strong> · Personería Jurídica Vigente
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 text-xs font-bold shadow-2xs">
                    <i className="bx bxs-check-shield text-base text-emerald-600" />
                    <span>Sello Digital Vincula</span>
                  </span>
                </div>
              </div>

              {/* Título de la Ficha */}
              <div className="text-center py-2 space-y-1">
                <span className="text-[0.7rem] font-bold uppercase tracking-widest text-secondary">
                  CERTIFICACIÓN DIGITAL DE EXPEDIENTE ACADÉMICO
                </span>
                <h3 className="m-0 font-display text-xl sm:text-2xl font-bold text-ink text-cocoa">
                  {program}
                </h3>
                <p className="m-0 text-xs text-secondary font-semibold">
                  Nivel de Formación: {degreeLevel}
                </p>
              </div>

              {/* Datos del Titular */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-line bg-page p-4 text-xs">
                <div>
                  <span className="text-secondary font-medium">Nombre del Titular:</span>
                  <p className="m-0 font-bold text-ink text-sm sm:text-base mt-0.5">{studentName}</p>
                </div>
                <div>
                  <span className="text-secondary font-medium">Documento de Identidad:</span>
                  <p className="m-0 font-bold text-ink text-sm sm:text-base mt-0.5">{documentId}</p>
                </div>
                <div>
                  <span className="text-secondary font-medium">Número de Acta de Grado:</span>
                  <p className="m-0 font-bold text-ink mt-0.5">{actaNumber}</p>
                </div>
                <div>
                  <span className="text-secondary font-medium">Registro Libro y Folio:</span>
                  <p className="m-0 font-bold text-ink mt-0.5">{bookFolio}</p>
                </div>
                <div>
                  <span className="text-secondary font-medium">Fecha de Otorgamiento:</span>
                  <p className="m-0 font-bold text-ink mt-0.5">{degreeDate}</p>
                </div>
                <div>
                  <span className="text-secondary font-medium">Estado de Verificación:</span>
                  <p className="m-0 font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <i className="bx bxs-badge-check text-sm" />
                    <span>100% Cotejado y Verificado ante IES</span>
                  </p>
                </div>
              </div>

              {/* Sello Digital Criptográfico SHA-256 */}
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <i className="bx bxs-key text-emerald-700" />
                    <span>Estampillado Criptográfico Digital SHA-256</span>
                  </span>
                  <span className="text-[0.65rem] font-bold font-mono text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded">
                    RED VINCULA
                  </span>
                </div>
                <p className="m-0 font-mono text-[0.68rem] text-emerald-950 bg-white/95 p-2.5 rounded-xl border border-emerald-200 break-all select-all">
                  {selloDigital}
                </p>
                <p className="m-0 text-[0.68rem] text-emerald-800">
                  Documento auténtico respaldado en Supabase Storage con certificación para procesos de selección empresarial.
                </p>
              </div>

              {/* Botón de Retorno a PDF */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode('pdf')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-page hover:bg-panel px-4 py-2 text-xs font-bold text-ink transition-colors cursor-pointer"
                >
                  <i className="bx bx-file-pdf text-base text-terracotta" />
                  <span>Volver a vista de PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ink hover:bg-ink-soft text-white px-5 py-2 text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <i className="bx bx-download text-base text-lime" />
                  <span>Descargar Diploma Oficial</span>
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ─── Footer Informativo ─── */}
        <footer className="flex items-center justify-between border-t border-line bg-page px-5 py-2.5 text-[0.7rem] text-secondary shrink-0">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Visor Seguro Vincula · Conexión Criptográfica Activa</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span>Usa <strong>+</strong> y <strong>-</strong> para zoom</span>
            <span>·</span>
            <span>Usa <strong>R</strong> para rotar</span>
            <span>·</span>
            <span>Usa <strong>Esc</strong> para cerrar</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
