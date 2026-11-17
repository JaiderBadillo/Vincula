import { useState } from 'react';
import { downloadWorkbook } from '../../utils/excelExport.js';

const VARIANTS = {
  light: 'border border-line bg-white text-ink hover:border-ink hover:bg-page',
  warm: 'border border-sand-line bg-white text-cocoa hover:bg-sand',
  glass: 'border border-white/20 bg-white/10 text-white backdrop-blur-xs hover:bg-white/20',
};

/**
 * Botón "Exportar a Excel". `buildSpec` arma la especificación del libro (utils/exportReports.js)
 * con los datos reales que la pantalla ya tiene cargados; ExcelJS se carga solo al hacer clic.
 */
export default function ExportExcelButton({ buildSpec, label = 'Exportar Excel', variant = 'light', disabled = false, title }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleClick() {
    setBusy(true);
    setFailed(false);
    try {
      await downloadWorkbook(buildSpec());
    } catch (error) {
      console.warn('[ExportExcelButton] no se pudo generar el Excel:', error);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || busy}
        title={title || 'Descargar los datos en un archivo de Excel (.xlsx)'}
        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant] || VARIANTS.light}`}
      >
        <i className={`bx ${busy ? 'bx-loader-alt bx-spin' : 'bx-spreadsheet'} text-sm`} aria-hidden="true" />
        <span>{busy ? 'Generando…' : label}</span>
      </button>
      {failed && <span className="text-[0.68rem] font-semibold text-rose-600" role="alert">No se pudo generar el Excel. Intenta de nuevo.</span>}
    </span>
  );
}
