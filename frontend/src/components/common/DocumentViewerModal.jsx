import { useState, useEffect, useRef } from 'react';

/**
 * Visor Integrado de Archivos en Vincula.
 * Permite visualizar los documentos que suben egresados, empresas e instituciones
 * (PDFs, imágenes de soporte, certificaciones oficiales) directamente dentro de la plataforma
 * sin alterar ni inventar documentos, respetando estrictamente el archivo real cargado.
 */
export default function DocumentViewerModal({
  isOpen,
  onClose,
  documentUrl,
  title = 'Documento de Soporte',
  subtitle = 'Archivo cargado en plataforma',
  metadata = {},
}) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setLoadError(false);
      setZoom(100);
      setRotation(0);
    }
  }, [isOpen, documentUrl]);

  // Atajos de teclado para productividad (Escape, Zoom, Rotar)
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setZoom((prev) => Math.min(250, prev + 15));
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

  const isImage = documentUrl && /\.(png|jpe?g|webp|gif)($|\?)/i.test(documentUrl);

  function handlePrint() {
    if (documentUrl) {
      const printWindow = window.open(documentUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
        setTimeout(() => printWindow.print(), 800);
      }
    }
  }

  function handleDownload() {
    if (!documentUrl) return;
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
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
          {/* Título e Info del Archivo Real */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid size-10 place-items-center rounded-2xl bg-ink text-lime text-xl shrink-0 shadow-2xs">
              <i className={isImage ? 'bx bxs-image' : 'bx bxs-file-pdf'} />
            </span>
            <div className="min-w-0">
              <h3 id="doc-viewer-title" className="m-0 font-display text-sm sm:text-base font-bold text-ink truncate">
                {title}
              </h3>
              <p className="m-0 text-xs text-secondary truncate">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Controles de Visualización */}
          <div className="flex items-center gap-2 flex-wrap">
            {documentUrl && !loadError && (
              <div className="flex items-center gap-1 bg-panel rounded-xl p-1 border border-line text-xs">
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.max(50, prev - 15))}
                  className="grid size-7 place-items-center rounded-lg text-secondary hover:text-ink hover:bg-white transition-colors cursor-pointer"
                  title="Reducir zoom (-)"
                  aria-label="Reducir zoom"
                >
                  <i className="bx bx-zoom-out text-base" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(100)}
                  className="px-2 font-mono text-[0.72rem] text-ink font-bold min-w-[3rem] text-center hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Restablecer zoom al 100%"
                >
                  {zoom}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.min(250, prev + 15))}
                  className="grid size-7 place-items-center rounded-lg text-secondary hover:text-ink hover:bg-white transition-colors cursor-pointer"
                  title="Aumentar zoom (+)"
                  aria-label="Aumentar zoom"
                >
                  <i className="bx bx-zoom-in text-base" />
                </button>
                <div className="h-4 w-px bg-line mx-0.5" />
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="grid size-7 place-items-center rounded-lg text-secondary hover:text-ink hover:bg-white transition-colors cursor-pointer"
                  title="Rotar 90 grados (R)"
                  aria-label="Rotar"
                >
                  <i className="bx bx-rotate-right text-base" />
                </button>
              </div>
            )}

            {/* Acciones de Archivo & Cierre */}
            <div className="flex items-center gap-1">
              {documentUrl && (
                <>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="grid size-8 place-items-center rounded-xl border border-line bg-white text-secondary hover:text-ink hover:bg-panel transition-colors cursor-pointer shadow-2xs"
                    title="Descargar archivo original"
                    aria-label="Descargar"
                  >
                    <i className="bx bx-download text-base" />
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="hidden sm:grid size-8 place-items-center rounded-xl border border-line bg-white text-secondary hover:text-ink hover:bg-panel transition-colors cursor-pointer shadow-2xs"
                    title="Imprimir documento"
                    aria-label="Imprimir"
                  >
                    <i className="bx bx-printer text-base" />
                  </button>
                </>
              )}
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

        {/* ─── Área Central de Visualización del Archivo Real ─── */}
        <main className="relative flex-1 overflow-auto bg-[#1A252C] p-3 sm:p-6 flex items-center justify-center">
          <div
            className="relative w-full h-full flex items-center justify-center transition-all duration-200"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            {/* Cargador visual */}
            {isLoading && !loadError && documentUrl && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#1A252C]/90 text-white backdrop-blur-xs">
                <span className="grid size-12 place-items-center rounded-full bg-lime/20 text-lime text-2xl">
                  <i className="bx bx-loader-alt bx-spin" />
                </span>
                <div className="text-center">
                  <p className="m-0 text-sm font-bold">Cargando archivo del usuario...</p>
                  <p className="m-0 text-xs text-white/70">Consultando almacenamiento en Supabase Storage</p>
                </div>
              </div>
            )}

            {/* Visualización según tipo de archivo */}
            {documentUrl && !loadError ? (
              isImage ? (
                <img
                  src={documentUrl}
                  alt={title}
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setLoadError(true);
                  }}
                  className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl bg-white"
                />
              ) : (
                <iframe
                  src={`${documentUrl}#toolbar=1&navpanes=0`}
                  title={title}
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setLoadError(true);
                  }}
                  className="w-full h-full rounded-2xl border border-white/10 bg-white shadow-2xl"
                />
              )
            ) : (
              /* Estado cuando el usuario no ha subido el archivo o hubo error */
              <div className="max-w-md w-full rounded-3xl border border-white/15 bg-white/10 p-8 text-center text-white backdrop-blur-md shadow-2xl space-y-4">
                <div className="grid size-16 mx-auto place-items-center rounded-2xl bg-amber-500/20 text-amber-400 text-3xl">
                  <i className="bx bx-file-blank" />
                </div>
                <div>
                  <h4 className="m-0 font-display text-lg font-bold text-white">
                    Documento No Adjunto
                  </h4>
                  <p className="m-0 mt-2 text-xs text-white/70 leading-relaxed">
                    {metadata?.noFileMessage ||
                      'El usuario o entidad aún no ha adjuntado este soporte en la plataforma.'}
                  </p>
                </div>
                {documentUrl && (
                  <div className="pt-2">
                    <a
                      href={documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 text-white px-4 py-2 text-xs font-semibold hover:bg-white/20 transition-colors no-underline cursor-pointer"
                    >
                      <i className="bx bx-link-external text-sm" />
                      <span>Reintentar enlace directo</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* ─── Footer Informativo ─── */}
        <footer className="flex items-center justify-between border-t border-line bg-page px-5 py-2.5 text-[0.7rem] text-secondary shrink-0">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Visor Integrado de Archivos · Vincula</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span>Zoom: <strong>+</strong> / <strong>-</strong></span>
            <span>·</span>
            <span>Rotar: <strong>R</strong></span>
            <span>·</span>
            <span>Cerrar: <strong>Esc</strong></span>
          </div>
        </footer>
      </div>
    </div>
  );
}
