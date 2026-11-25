import { useCallback, useEffect, useState } from 'react';
import { companyService } from '../services/companyService.js';

const celda = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;

/** Actividad y métricas de la empresa, calculadas por el servidor con los registros guardados. */
export function useCompanyActivity() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    companyService
      .getActivity()
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, []);

  const exportActivityReport = useCallback(() => {
    if (!data) return;
    const m = data.metrics;
    const rows = [
      ['Indicador', 'Valor'],
      ['Vacantes abiertas', m.openVacancies],
      ['Postulaciones', m.applicantsTotal],
      ['En filtro', m.inReview],
      ['En entrevista', m.interviewing],
      ['Contratados este mes', m.hiredMonth],
      ['Contratados en total', m.hiredTotal],
      ['Conversión (%)', m.conversionRate],
      ['Días promedio hasta contratar', m.avgTimeToHireDays],
      [],
      ['Fecha', 'Acción', 'Detalle', 'Usuario'],
      ...data.log.map((e) => [new Date(e.at).toLocaleString('es-CO'), e.action, e.detail, e.user]),
    ];
    const csv = rows.map((row) => row.map(celda).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_actividad_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data]);

  return { data, error, exportActivityReport };
}
