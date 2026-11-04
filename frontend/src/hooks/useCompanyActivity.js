import { useCallback, useEffect, useState } from 'react';
import {
  INITIAL_ACTIVITY_LOG,
  INITIAL_FUNNEL_METRICS,
  MONTHLY_ACTIVITY_TREND,
  RECRUITER_PERFORMANCE,
  TALENT_SOURCES,
} from '../data/companyActivityData.js';
import { useCompanyVacancies } from './useCompanyVacancies.js';

export const ACTIVITY_STORAGE_KEY = 'vincula.company.activity.v1';
export const ACTIVITY_SYNC_EVENT = 'vincula:company-activity-updated';

function readActivityLog() {
  if (typeof window === 'undefined') return INITIAL_ACTIVITY_LOG;
  try {
    const raw = window.localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (!raw) return INITIAL_ACTIVITY_LOG;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ACTIVITY_LOG;
  } catch {
    return INITIAL_ACTIVITY_LOG;
  }
}

function writeActivityLog(log) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(log));
    window.dispatchEvent(new CustomEvent(ACTIVITY_SYNC_EVENT, { detail: log }));
  } catch {
    // Silencioso
  }
}

export function useCompanyActivity() {
  const [activityLog, setActivityLog] = useState(readActivityLog);
  const { vacancies } = useCompanyVacancies();

  // Escucha cambios sincronizados entre pestañas o acciones
  useEffect(() => {
    function handleSync(event) {
      if (event.detail) {
        setActivityLog(event.detail);
      } else {
        setActivityLog(readActivityLog());
      }
    }

    window.addEventListener(ACTIVITY_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(ACTIVITY_SYNC_EVENT, handleSync);
  }, []);

  // Registra una nueva acción en la bitácora
  const logAction = useCallback(({ action, detail, category = 'vacantes', user = 'Administrador', role = 'Empresa' }) => {
    const current = readActivityLog();
    const now = new Date();
    const formattedExact = new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);

    const iconMap = {
      vacantes: 'bx-briefcase-alt-2',
      postulaciones: 'bx-user-voice',
      contrataciones: 'bx-user-check',
      convenios: 'bx-link-alt',
      seguridad: 'bx-shield-quarter',
    };

    const colorMap = {
      vacantes: 'bg-ochre text-cocoa',
      postulaciones: 'bg-cocoa text-ochre',
      contrataciones: 'bg-emerald-600 text-white',
      convenios: 'bg-terracotta text-white',
      seguridad: 'bg-sand-dark text-cocoa',
    };

    const newEntry = {
      id: `act-${Date.now()}`,
      user,
      role,
      action,
      detail,
      category,
      timestamp: 'Justo ahora',
      exactTime: formattedExact,
      icon: iconMap[category] || 'bx-check',
      iconColor: colorMap[category] || 'bg-ochre text-cocoa',
    };

    const nextLog = [newEntry, ...current];
    writeActivityLog(nextLog);
    setActivityLog(nextLog);
    return newEntry;
  }, []);

  // Métricas reactivas cruzadas con las vacantes activas reales
  const openVacanciesCount = vacancies.filter((v) => v.status === 'open' || v.status === 'published').length;
  const totalApplicantsLive = vacancies.reduce((acc, v) => acc + (v.applicantsCount || 0), 0) + INITIAL_FUNNEL_METRICS.applicantsTotal;

  const funnelMetrics = {
    ...INITIAL_FUNNEL_METRICS,
    openVacanciesCount: openVacanciesCount || 8,
    applicantsTotal: totalApplicantsLive,
  };

  // Exportar reporte de actividad en CSV
  const exportActivityReport = useCallback(() => {
    const headers = ['Fecha y Hora', 'Usuario', 'Rol', 'Acción', 'Categoría', 'Detalle'];
    const rows = activityLog.map((item) => [
      item.exactTime || item.timestamp,
      `"${item.user}"`,
      `"${item.role}"`,
      `"${item.action}"`,
      `"${item.category}"`,
      `"${item.detail.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte_actividad_cenit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activityLog]);

  return {
    activityLog,
    funnelMetrics,
    monthlyTrend: MONTHLY_ACTIVITY_TREND,
    talentSources: TALENT_SOURCES,
    recruiterPerformance: RECRUITER_PERFORMANCE,
    logAction,
    exportActivityReport,
  };
}

