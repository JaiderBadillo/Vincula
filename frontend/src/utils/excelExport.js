/**
 * Exportación a Excel con la identidad visual de Vincula.
 *
 * Una especificación describe el libro: { filename, title, subtitle, sheets: [...] }.
 * Cada hoja: { name, title, subtitle?, notes?, kpis?, tables }.
 *   kpis    [{ label, value, format? }]  tarjetas de indicadores arriba de la hoja
 *   tables  [{ title?, note?, columns, rows, totals? }]
 *   columns [{ header, key | value(row), width?, format?, align?, wrap?, tone?(value,row) }]
 *           `format` puede ser una función (valor, fila) => formato, para columnas con tipos mezclados.
 *
 * Formatos: int, dec, pct (fracción 0–1), date, datetime, money, text. Un `tone` devuelve
 * 'good' | 'warn' | 'bad' | 'info' (o nada) y pinta la celda como semáforo.
 *
 * ExcelJS se carga bajo demanda (import dinámico): no pesa en el resto de la aplicación.
 */

const C = {
  ink: 'FF001A23', inkSoft: 'FF0B2B34', green: 'FF336F24', greenDark: 'FF28571D', lime: 'FFB1CC74',
  limeSoft: 'FFEAF2D3', cream: 'FFFBF6EE', zebra: 'FFF6F9F4', line: 'FFDCE4E6', muted: 'FF61727A', white: 'FFFFFFFF',
};

export const TONES = {
  good: { fill: 'FFE3F1DD', font: 'FF1F4D14' },
  warn: { fill: 'FFFCEFD0', font: 'FF7A5200' },
  bad: { fill: 'FFF8DDD3', font: 'FF8A2E10' },
  info: { fill: 'FFE2EEF3', font: 'FF1D4A5E' },
};

export const FORMATS = {
  int: '#,##0', dec: '#,##0.0', pct: '0.0%', date: 'dd/mm/yyyy', datetime: 'dd/mm/yyyy hh:mm', money: '"$"#,##0', text: '@',
};
const NUMERIC = new Set(['int', 'dec', 'pct', 'money']);
const FONT = 'Calibri';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const solid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thin = (argb) => ({ style: 'thin', color: { argb } });

export function formatLongDate(date = new Date()) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

export function safeSheetName(name, used = new Set()) {
  const base = String(name || 'Hoja').replace(/[\\/?*[\]:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Hoja';
  let candidate = base;
  for (let n = 2; used.has(candidate.toLowerCase()); n += 1) candidate = `${base.slice(0, 31 - String(n).length - 1)} ${n}`;
  used.add(candidate.toLowerCase());
  return candidate;
}

export function exportFilename(slug, date = new Date()) {
  const clean = String(slug || 'reporte').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `Vincula_${clean || 'reporte'}_${date.toISOString().slice(0, 10)}.xlsx`;
}

function cellValue(value, format) {
  if (value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))) return '';
  if (format === 'date' || format === 'datetime') {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date;
  }
  return value;
}

function columnWidths(sheet, count) {
  return Array.from({ length: count }, (_, i) => {
    let width = 10;
    for (const table of sheet.tables || []) {
      const col = table.columns[i];
      if (!col) continue;
      let wanted = Math.max(col.width || 0, String(col.header).length * 1.15 + 2);
      if (!col.width) {
        for (const row of table.rows.slice(0, 200)) {
          const v = col.value ? col.value(row) : row[col.key];
          wanted = Math.max(wanted, Math.min(String(v ?? '').length + 2, 48));
        }
      }
      width = Math.max(width, Math.min(wanted, col.maxWidth || 60));
    }
    return width;
  });
}

function band(ws, row, count, { text, fill, font, height, indent = 1 }) {
  ws.mergeCells(row, 1, row, count);
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.fill = solid(fill);
  cell.font = font;
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent, wrapText: true };
  ws.getRow(row).height = height;
}

function addKpis(ws, kpis, count, start) {
  const perRow = Math.min(kpis.length, 4);
  const span = Math.max(1, Math.floor(count / perRow));
  let row = start;
  for (let i = 0; i < kpis.length; i += perRow) {
    kpis.slice(i, i + perRow).forEach((kpi, j) => {
      const from = 1 + j * span;
      const to = j === perRow - 1 ? count : from + span - 1;
      [[row, kpi.label, { name: FONT, size: 9, bold: true, color: { argb: C.muted } }],
        [row + 1, cellValue(kpi.value, kpi.format), { name: FONT, size: 20, bold: true, color: { argb: C.green } }]].forEach(([r, v, font], k) => {
        if (to > from) ws.mergeCells(r, from, r, to);
        const cell = ws.getCell(r, from);
        cell.value = k === 0 ? String(v).toUpperCase() : v;
        if (k === 1 && kpi.format) cell.numFmt = FORMATS[kpi.format];
        cell.font = font;
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
        for (let c = from; c <= to; c += 1) {
          const edge = ws.getCell(r, c);
          edge.fill = solid(C.cream);
          edge.border = {
            left: c === from ? { style: 'thick', color: { argb: C.lime } } : undefined,
            right: c === to ? { style: 'thick', color: { argb: C.white } } : undefined,
            bottom: k === 1 ? { style: 'medium', color: { argb: C.green } } : undefined,
          };
        }
      });
    });
    ws.getRow(row).height = 20;
    ws.getRow(row + 1).height = 34;
    row += 3;
  }
  return row;
}

function addTable(ws, table, count, start) {
  let row = start;
  if (table.title) {
    ws.mergeCells(row, 1, row, count);
    const cell = ws.getCell(row, 1);
    cell.value = table.title;
    cell.font = { name: FONT, size: 12, bold: true, color: { argb: C.ink } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    for (let c = 1; c <= count; c += 1) ws.getCell(row, c).border = { bottom: { style: 'medium', color: { argb: C.green } } };
    ws.getRow(row).height = 24;
    row += 1;
  }
  if (table.note) {
    ws.mergeCells(row, 1, row, count);
    const cell = ws.getCell(row, 1);
    cell.value = table.note;
    cell.font = { name: FONT, size: 9, italic: true, color: { argb: C.muted } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    ws.getRow(row).height = 18;
    row += 1;
  }
  const headerRow = row;
  table.columns.forEach((col, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = col.header;
    cell.fill = solid(C.green);
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: C.white } };
    cell.alignment = { vertical: 'middle', horizontal: col.align || (NUMERIC.has(col.format) ? 'center' : 'left'), wrapText: true, indent: col.align ? 0 : 1 };
    cell.border = { left: thin(C.white), right: thin(C.white) };
  });
  ws.getRow(row).height = 28;
  row += 1;

  if (!table.rows.length) {
    ws.mergeCells(row, 1, row, count);
    const cell = ws.getCell(row, 1);
    cell.value = 'Sin datos para mostrar';
    cell.font = { name: FONT, size: 10, italic: true, color: { argb: C.muted } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(row).height = 24;
    return { next: row + 2, headerRow, columns: table.columns.length };
  }

  table.rows.forEach((data, k) => {
    table.columns.forEach((col, i) => {
      const raw = col.value ? col.value(data) : data[col.key];
      const cell = ws.getCell(row, i + 1);
      const fmt = typeof col.format === 'function' ? col.format(raw, data) : col.format;
      cell.value = cellValue(raw, fmt);
      if (fmt) cell.numFmt = FORMATS[fmt];
      const tone = col.tone ? TONES[col.tone(raw, data)] : null;
      cell.font = { name: FONT, size: 10, bold: Boolean(tone), color: { argb: tone ? tone.font : C.ink } };
      cell.fill = solid(tone ? tone.fill : (k % 2 ? C.zebra : C.white));
      cell.alignment = {
        vertical: 'middle',
        horizontal: col.align || (NUMERIC.has(fmt) || tone ? 'center' : 'left'),
        wrapText: col.wrap !== false,
        indent: col.align || NUMERIC.has(fmt) || tone ? 0 : 1,
      };
      cell.border = { bottom: thin(C.line) };
    });
    row += 1;
  });

  if (table.totals) {
    table.columns.forEach((col, i) => {
      const cell = ws.getCell(row, i + 1);
      const value = table.totals[col.key];
      cell.value = i === 0 && value === undefined ? 'TOTAL' : cellValue(value, col.format);
      if (col.format) cell.numFmt = FORMATS[col.format];
      cell.font = { name: FONT, size: 10, bold: true, color: { argb: C.ink } };
      cell.fill = solid(C.limeSoft);
      cell.alignment = { vertical: 'middle', horizontal: NUMERIC.has(col.format) ? 'center' : 'left', indent: NUMERIC.has(col.format) ? 0 : 1 };
      cell.border = { top: { style: 'medium', color: { argb: C.green } } };
    });
    row += 1;
  }
  return { next: row + 1, headerRow, columns: table.columns.length };
}

function addSheet(wb, spec, sheet, used) {
  const tables = sheet.tables || [];
  const count = Math.max(6, ...tables.map((t) => t.columns.length));
  const ws = wb.addWorksheet(safeSheetName(sheet.name, used), {
    properties: { tabColor: { argb: C.green } },
    views: [{ showGridLines: false }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 } },
    headerFooter: { oddFooter: '&L&8Vincula · Red de talento universitario&R&8Página &P de &N' },
  });
  columnWidths(sheet, count).forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const generated = `Generado el ${formatLongDate(spec.date)}`;
  band(ws, 1, count, { text: sheet.title || spec.title, fill: C.ink, height: 36,
    font: { name: FONT, size: 16, bold: true, color: { argb: C.white } }, indent: 1 });
  band(ws, 2, count, { text: [sheet.subtitle || spec.subtitle, generated].filter(Boolean).join('  ·  '), fill: C.greenDark, height: 20,
    font: { name: FONT, size: 10, color: { argb: C.limeSoft } }, indent: 1 });
  ws.getRow(3).height = 10;

  let row = 4;
  for (const note of sheet.notes || []) {
    ws.mergeCells(row, 1, row, count);
    const cell = ws.getCell(row, 1);
    cell.value = note;
    cell.font = { name: FONT, size: 9, italic: true, color: { argb: C.muted } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
    ws.getRow(row).height = 18;
    row += 1;
  }
  if (sheet.kpis?.length) row = addKpis(ws, sheet.kpis, count, row);

  const placed = tables.map((table) => {
    const info = addTable(ws, table, count, row);
    row = info.next;
    return info;
  });

  // Una sola tabla y sin tarjetas: encabezado fijo y filtros, como en una hoja de datos.
  if (tables.length === 1 && !sheet.kpis?.length && tables[0].rows.length) {
    const { headerRow, columns } = placed[0];
    ws.views = [{ state: 'frozen', ySplit: headerRow, showGridLines: false }];
    ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: columns } };
  }

  ws.mergeCells(row, 1, row, count);
  const footer = ws.getCell(row, 1);
  footer.value = 'Generado por Vincula · Red de talento universitario';
  footer.font = { name: FONT, size: 8, color: { argb: C.muted } };
  footer.alignment = { horizontal: 'right' };
  return ws;
}

export function buildWorkbook(spec, ExcelJS) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Vincula';
  wb.title = spec.title;
  wb.created = spec.date || new Date();
  const used = new Set();
  spec.sheets.forEach((sheet) => addSheet(wb, spec, sheet, used));
  return wb;
}

/** Genera el libro en el navegador y lo descarga. */
export async function downloadWorkbook(spec) {
  const module = await import('exceljs');
  const ExcelJS = module.default || module;
  const wb = buildWorkbook({ date: new Date(), ...spec }, ExcelJS);
  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_MIME }));
  const link = document.createElement('a');
  link.href = url;
  link.download = spec.filename || exportFilename(spec.title);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
