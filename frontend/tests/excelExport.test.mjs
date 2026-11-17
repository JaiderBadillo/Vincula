// Ejecutar: node --test tests/excelExport.test.mjs
// Con EXCEL_SAMPLE_DIR=<carpeta> además guarda los .xlsx generados para revisarlos a mano.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { buildWorkbook, exportFilename, safeSheetName, TONES } from '../src/utils/excelExport.js';
import {
  buildCandidatesReport, buildPeriodicReport, buildPlatformSummaryReport, buildTraceabilityReport, buildVacanciesReport,
} from '../src/utils/exportReports.js';

const DATE = new Date(2026, 10, 17, 10, 0, 0);

async function make(spec, sample) {
  const wb = buildWorkbook(spec, ExcelJS);
  const buffer = await wb.xlsx.writeBuffer();
  if (process.env.EXCEL_SAMPLE_DIR) {
    mkdirSync(process.env.EXCEL_SAMPLE_DIR, { recursive: true });
    writeFileSync(join(process.env.EXCEL_SAMPLE_DIR, sample), Buffer.from(buffer));
  }
  const read = new ExcelJS.Workbook();
  await read.xlsx.load(buffer); // si el archivo estuviera corrupto, esto lanza
  return read;
}
const cell = (ws, ref) => ws.getCell(ref).value;
const rowValues = (ws, n) => ws.getRow(n).values.slice(1);
const findRow = (ws, text, col = 1) => {
  for (let r = 1; r <= ws.rowCount; r += 1) if (String(ws.getCell(r, col).value ?? '') === text) return r;
  return -1;
};

test('nombres de hoja y de archivo seguros', () => {
  const used = new Set();
  assert.equal(safeSheetName('Demanda: vs/malla?', used), 'Demanda vs malla');
  assert.equal(safeSheetName('Demanda vs malla', used), 'Demanda vs malla 2');
  assert.equal(safeSheetName('x'.repeat(50)).length, 31);
  assert.equal(exportFilename('Ingeniería de Sistemas', DATE), 'Vincula_Ingenieria_de_Sistemas_2026-11-17.xlsx');
});

test('resumen de plataforma: omite los indicadores que no cargaron', async () => {
  const spec = buildPlatformSummaryReport({
    totalCompanies: 12, activeCompanies: 9, pendingCompanies: 2, correctionCompanies: 1, activeInstitutions: 3,
    pendingInstitutions: 0, correctionInstitutions: 0, totalInstitutionsCount: 3, activeAgreements: null,
    totalVacancies: 40, activeVacancies: 25, graduatesConnected: 310, totalApplications: 802, totalPendingOverall: 2,
  }, { date: DATE });
  const wb = await make(spec, 'resumen_plataforma.xlsx');
  const ws = wb.getWorksheet('Resumen');
  assert.match(String(cell(ws, 'A1')), /Resumen de la plataforma/);
  assert.match(String(cell(ws, 'A2')), /Generado el 17 de noviembre de 2026/);
  assert.equal(findRow(ws, 'Convenios'), -1); // activeAgreements = null → no se inventa un 0
  const r = findRow(ws, 'Postulaciones');
  assert.equal(rowValues(ws, r)[2], 802);
  assert.equal(ws.getCell(r, 3).numFmt, '#,##0');
});

test('métricas por periodo: totales y fila de crecimiento', async () => {
  const series = [
    { periodLabel: 'oct 2026', newCompanies: 2, newVacancies: 5, newInstitutions: 1, newGraduates: 30, totalApplications: 120, growthRate: '+12%' },
    { periodLabel: 'nov 2026', newCompanies: 1, newVacancies: 4, newInstitutions: 0, newGraduates: 12, totalApplications: 80, growthRate: null },
  ];
  const wb = await make(buildPeriodicReport({ series, totals: { newCompanies: 3, newVacancies: 9, newInstitutions: 1, newGraduates: 42, totalApplications: 200 }, rangeLabel: 'Últimos 6 meses' }, { date: DATE }), 'periodos.xlsx');
  const ws = wb.getWorksheet('Evolución');
  const header = findRow(ws, 'Periodo');
  assert.deepEqual(rowValues(ws, header + 1).slice(0, 2), ['oct 2026', 2]);
  assert.equal(rowValues(ws, header + 2)[6], 'N/A');
  assert.equal(rowValues(ws, header + 3)[0], 'TOTAL DEL PERIODO');
  assert.equal(rowValues(ws, header + 3)[5], 200);
  assert.ok(ws.autoFilter, 'una sola tabla: lleva filtros');
  assert.equal(ws.views[0].ySplit, header); // encabezado fijo
});

const REPORT = {
  programa_nombre: 'Ingeniería Industrial', programa_previo_nombre: 'Tecnología en Producción Industrial', pensum_version: 'Pensum 2026',
  total_semestres: 2, total_asignaturas: 3, total_vacantes_abiertas: 6, total_vacantes_analizadas: 3, vacantes_alta_cobertura: 2,
  indice_pertinencia: 78.8, nivel_pertinencia: 'Pertinencia alta', confianza: 'baja',
  demanda: [
    { skill: 'Control de Calidad', categoria: 'tecnica', vacantes: 2, obligatoria_en: 2, porcentaje_vacantes: 66.7, cobertura: 'directa', area: 'Producción', asignaturas: [{ codigo: 'CAL-1', nombre: 'Control de Calidad', semestre: 6 }], criticidad: null },
    { skill: 'Excel', categoria: 'tecnica', vacantes: 3, obligatoria_en: 1, porcentaje_vacantes: 100, cobertura: 'afin', area: null, asignaturas: [], criticidad: null },
    { skill: 'Soldadura TIG', categoria: 'tecnica', vacantes: 1, obligatoria_en: 1, porcentaje_vacantes: 33.3, cobertura: 'brecha', area: null, asignaturas: [], criticidad: 'alta' },
  ],
  areas_formacion: [{ area: 'Producción Industrial y Mejora Continua', asignaturas: 10, vacantes: 3 }],
  semestres: [
    { numero_semestre: 1, etiqueta: 'Semestre 1', programa_origen: 'Tecnología en Producción Industrial', asignaturas: [{ id: 'a', codigo: 'PI-101', nombre: 'Procesos industriales', creditos: 3, familia: 'Producción', skills: ['Lean Manufacturing'], herramientas: [] }] },
    { numero_semestre: 7, etiqueta: 'Semestre 7', programa_origen: null, asignaturas: [{ id: 'b', codigo: 'II-701', nombre: 'Gerencia de calidad', creditos: 4, familia: 'Calidad', skills: [], herramientas: ['Minitab'] }] },
  ],
};
const OUTCOMES = {
  egresados_registrados: 6, egresados_postulados: 6, egresados_contratados: 2, total_postulaciones: 10, postulaciones_descartadas: 3,
  minimo_muestra: 10, muestra_suficiente: true, tasa_contratacion: 33.3, dias_mediana_oferta: 15, dias_mediana_contratacion: 18.5,
  afinidad_promedio_contratados: 90.5, afinidad_promedio_descartados: 67.7,
  embudo: [{ fase: 'postulados', etiqueta: 'Postulados', postulaciones: 10 }, { fase: 'contratado', etiqueta: 'Contratados', postulaciones: 2 }],
  motivos_descarte: [{ motivo: 'Afinidad técnica insuficiente', postulaciones: 2 }],
};

test('trazabilidad: cinco hojas, semáforo de cobertura y valores con su formato', async () => {
  const wb = await make(buildTraceabilityReport({ report: REPORT, outcomes: OUTCOMES, institutionName: 'UTS' }, { date: DATE }), 'trazabilidad.xlsx');
  assert.deepEqual(wb.worksheets.map((w) => w.name), ['Resumen', 'Embudo', 'Demanda vs malla', 'Áreas de formación', 'Malla curricular']);

  const res = wb.getWorksheet('Resumen');
  const idx = findRow(res, 'Índice de alineación');
  assert.ok(Math.abs(res.getCell(idx, 2).value - 0.788) < 1e-9); // fracción, formateada como %
  assert.equal(res.getCell(idx, 2).numFmt, '0.0%');
  const rate = findRow(res, 'Tasa de contratación');
  assert.equal(res.getCell(rate, 2).numFmt, '0.0%');
  assert.equal(res.getCell(findRow(res, 'Programa'), 2).numFmt, undefined);

  const dem = wb.getWorksheet('Demanda vs malla');
  const h = findRow(dem, 'Competencia');
  const fill = (r) => dem.getCell(r, 6).fill.fgColor.argb;
  assert.equal(dem.getCell(h + 1, 6).value, 'Directa');
  assert.equal(fill(h + 1), TONES.good.fill);
  assert.equal(fill(h + 2), TONES.warn.fill);
  assert.equal(fill(h + 3), TONES.bad.fill);
  assert.equal(dem.getCell(h + 3, 9).value, 'Alta'); // criticidad solo en la brecha
  assert.equal(dem.getCell(h + 1, 8).value, 'Control de Calidad (sem. 6)');
  assert.equal(dem.getCell(h + 1, 9).value, '');

  const fun = wb.getWorksheet('Embudo');
  const f = findRow(fun, 'Fase');
  assert.equal(fun.getCell(f + 2, 3).value, 0.2); // 2 de 10
  const malla = wb.getWorksheet('Malla curricular');
  const m = findRow(malla, 'Semestre');
  assert.equal(malla.getCell(m + 2, 2).value, 'Ingeniería Industrial'); // malla propia
  assert.equal(malla.getCell(m + 3, 5).value, 7); // total de créditos
});

test('trazabilidad con muestra insuficiente: no publica tasas', async () => {
  const wb = await make(buildTraceabilityReport({
    report: { ...REPORT, indice_pertinencia: null, confianza: 'sin_datos' },
    outcomes: { ...OUTCOMES, muestra_suficiente: false, tasa_contratacion: null, dias_mediana_oferta: null, dias_mediana_contratacion: null },
    institutionName: 'UTS',
  }, { date: DATE }), 'trazabilidad_sin_muestra.xlsx');
  const res = wb.getWorksheet('Resumen');
  assert.match(String(res.getCell(findRow(res, 'Tasa de contratación'), 2).value), /Muestra insuficiente/);
  assert.equal(res.getCell(findRow(res, 'Índice de alineación'), 2).value, 'Sin datos para medir');
});

const VACANCIES = [
  { id: '1', code: 'VAC-1', title: 'Supervisor de Producción', status: 'open', category: 'Producción', siteId: 's1', ownerRecruiterId: 'r1', modality: 'presencial', contractType: 'Término indefinido', salary: '$2.000.000 - $2.600.000', openSpots: 2, applicantsCount: 9, publishedAt: '2026-11-01', closingDate: '2026-12-15', targetPrograms: ['Ingeniería Industrial'], skillsTech: ['Lean', 'Excel'] },
  { id: '2', code: 'VAC-2', title: 'Analista', status: 'disabled', category: 'Datos', siteId: 's1', ownerRecruiterId: null, modality: 'remoto', contractType: 'Término fijo', salary: '', openSpots: 1, applicantsCount: 0, publishedAt: null, closingDate: '', targetPrograms: [], skillsTech: [] },
];

test('vacantes: estados con color, fechas reales y sin fechas inventadas', async () => {
  const wb = await make(buildVacanciesReport(VACANCIES, { companyName: 'Equipo de Pruebas', sitesById: { s1: 'Bucaramanga' }, recruitersById: { r1: 'Laura Barco' } }, { date: DATE }), 'vacantes.xlsx');
  const ws = wb.getWorksheet('Vacantes');
  const h = findRow(ws, 'Código');
  assert.equal(ws.getCell(h + 1, 3).value, 'Abierta');
  assert.equal(ws.getCell(h + 1, 3).fill.fgColor.argb, TONES.good.fill);
  assert.equal(ws.getCell(h + 2, 3).fill.fgColor.argb, TONES.bad.fill); // inhabilitada
  assert.equal(ws.getCell(h + 1, 5).value, 'Bucaramanga');
  assert.equal(ws.getCell(h + 2, 6).value, 'Sin asignar');
  assert.ok(ws.getCell(h + 1, 12).value instanceof Date);
  assert.equal(ws.getCell(h + 2, 12).value, ''); // sin fecha de publicación: celda vacía
  assert.equal(ws.getCell(h + 3, 11).value, 9); // total de postulaciones
  const res = wb.getWorksheet('Resumen');
  assert.equal(res.getCell(findRow(res, 'Inhabilitada'), 2).value, 1);
});

test('candidatos: afinidad como porcentaje y semáforo', async () => {
  const candidates = [
    { id: 'c1', candidateName: 'Diego Vera', email: 'd@x.test', phone: '315', city: 'Bucaramanga', program: 'Ing. Industrial', institution: 'UTS', graduationYear: '2025', vacancyId: 'v1', vacancyTitle: 'Supervisor', vacancyCode: 'VAC-1', stage: 'hired', matchPercentage: 91, appliedAt: '2026-11-02T10:00:00', skillsMatch: ['Lean'], missingSkills: [], rejectionReason: null },
    { id: 'c2', candidateName: 'Otra Persona', email: 'o@x.test', phone: '', city: '', program: 'Tec.', institution: 'UTS', graduationYear: null, vacancyId: 'v1', vacancyTitle: 'Supervisor', vacancyCode: 'VAC-1', stage: 'discarded', matchPercentage: 48, appliedAt: '2026-11-03T10:00:00', skillsMatch: [], missingSkills: ['Excel', 'Lean'], rejectionReason: 'Afinidad insuficiente' },
  ];
  const wb = await make(buildCandidatesReport(candidates, { companyName: 'Equipo de Pruebas' }, { date: DATE }), 'candidatos.xlsx');
  const ws = wb.getWorksheet('Candidatos');
  const h = findRow(ws, 'Candidato');
  assert.equal(ws.getCell(h + 1, 10).value, 'Contratado');
  assert.equal(ws.getCell(h + 1, 11).value, 0.91);
  assert.equal(ws.getCell(h + 1, 11).fill.fgColor.argb, TONES.good.fill);
  assert.equal(ws.getCell(h + 2, 11).fill.fgColor.argb, TONES.bad.fill);
  assert.equal(ws.getCell(h + 2, 14).value, 'Excel; Lean');
  const res = wb.getWorksheet('Resumen');
  assert.equal(res.getCell(findRow(res, 'TOTAL'), 2).value, 2);
});

test('una tabla vacía muestra un aviso en vez de quedar en blanco', async () => {
  const wb = await make(buildVacanciesReport([], { companyName: 'X' }, { date: DATE }), 'vacantes_vacio.xlsx');
  assert.equal(wb.getWorksheet('Vacantes').getCell(findRow(wb.getWorksheet('Vacantes'), 'Código') + 1, 1).value, 'Sin datos para mostrar');
});

test('un texto que parece fórmula se guarda como texto', async () => {
  const wb = await make(buildVacanciesReport([{ ...VACANCIES[0], title: '=HYPERLINK("http://x.test","clic")' }], { companyName: 'X' }, { date: DATE }), 'inyeccion.xlsx');
  const ws = wb.getWorksheet('Vacantes');
  const value = ws.getCell(findRow(ws, 'Código') + 1, 2).value;
  assert.equal(typeof value, 'string');
  assert.equal(value, '=HYPERLINK("http://x.test","clic")');
});
