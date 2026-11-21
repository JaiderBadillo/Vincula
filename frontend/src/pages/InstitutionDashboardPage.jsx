import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import { Bar, Card, Empty, Kpi, LoadState, pct, shortDate, useLoad } from '../components/institution/ui.jsx';
import { advisorPhotos } from '../data/institutionImages.js';
import { authService } from '../services/authService.js';
import { institutionService } from '../services/institutionService.js';

const loadPanel = () => institutionService.getPanel();

export default function InstitutionDashboardPage() {
  const panel = useLoad(loadPanel);
  const [pending, setPending] = useState({ items: [], total: 0 });
  const advisorName = authService.getCurrentUser()?.nombre || 'Coordinación IES';
  const p = panel.data;

  useEffect(() => {
    let alive = true;
    institutionService.getPendingGraduates({ estado: 'pendiente', limit: 5 }).then((res) => {
      if (alive) setPending({ items: res.items || [], total: res.resumen_estados?.pendientes ?? res.total ?? 0 });
    }).catch(() => {}); // la tarjeta muestra "sin pendientes" y el panel sigue funcionando
    return () => { alive = false; };
  }, []);

  const modules = [
    { to: '/institucion/estudiantes/solicitudes', icon: 'bx-user-check', title: 'Validar egresados', text: 'Aprobar o rechazar cuentas y diplomas.', badge: `${pending.total} pendientes` },
    { to: '/institucion/estudiantes/seguimiento', icon: 'bx-history', title: 'Seguimiento de egresados', text: 'Estado laboral y postulaciones de cada egresado.', badge: p ? `${p.resumen.egresados} egresados` : '' },
    { to: '/institucion/empresas/solicitudes', icon: 'bx-buildings', title: 'Convenios con empresas', text: 'Revisar solicitudes de convenio.', badge: p ? `${p.convenios_pendientes} en espera` : '' },
    { to: '/institucion/empresas/seguimiento', icon: 'bx-line-chart', title: 'Seguimiento a empresas', text: 'Vacantes para tus programas y su embudo.', badge: p ? `${p.vacantes_abiertas} vacantes abiertas` : '' },
    { to: '/institucion/estudiantes/estadisticas', icon: 'bx-bar-chart-alt-2', title: 'Estadísticas de colocación', text: 'Tasa, tiempos, salarios y empresas.', badge: p ? pct(p.resumen.tasa) : '' },
    { to: '/institucion/mercado-laboral/competencias', icon: 'bx-radar', title: 'Mercado laboral', text: 'Qué piden las empresas y qué cubre cada programa.', badge: '' },
  ];

  return (
    <InstitutionPortalLayout activePage="dashboard">
      <main className="w-full pb-20">
        <div className="mx-auto max-w-7xl space-y-8 px-5 pt-8 sm:px-8 lg:px-10">
          <InstitutionPageHero
            title={`¡Bienvenido(a), ${advisorName}!`}
            subtitle="Supervisa la inserción laboral de los egresados, valida solicitudes en cola y revisa las empresas que contratan."
            photo={advisorPhotos.dashboard}
            stats={[
              { value: p ? p.resumen.egresados.toLocaleString('es-CO') : '—', label: 'Egresados' },
              { value: p ? pct(p.resumen.tasa) : '—', label: 'Vinculación' },
              { value: p ? p.vacantes_abiertas : '—', label: 'Vacantes' },
              { value: String(pending.total), label: 'En cola' },
            ]}
            actions={
              <Link to="/institucion/estudiantes/solicitudes" data-tour="ies-atender-solicitudes"
                className="inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-2.5 text-xs font-bold text-ink no-underline shadow-xs hover:bg-lime/85">
                <i className="bx bx-check-shield text-base" /><span>Atender solicitudes ({pending.total})</span>
              </Link>
            }
          />

          <LoadState {...panel}>
            {p && (
              <section data-tour="ies-kpis" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi icon="bx-group" label="Egresados registrados" value={p.resumen.egresados.toLocaleString('es-CO')} hint={`+${p.egresados_nuevos_mes} registrados este mes`} />
                <Kpi icon="bx-briefcase" label="Vacantes para tus programas" value={p.vacantes_abiertas} hint={`+${p.vacantes_nuevas_semana} publicadas esta semana`} />
                <Kpi icon="bx-user-check" label="Egresados con empleo" value={p.resumen.colocados.toLocaleString('es-CO')} hint={`${pct(p.resumen.tasa)} · +${p.contrataciones_mes} en los últimos 30 días`} />
                <Kpi icon="bx-search-alt" label="En búsqueda" value={(p.resumen.egresados - p.resumen.colocados).toLocaleString('es-CO')} hint={`${p.postulando} postulando activamente`} />
              </section>
            )}
          </LoadState>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Módulos del asesor">
            {modules.map((m) => (
              <Link key={m.to} to={m.to} className="group flex flex-col justify-between rounded-2xl border border-line bg-white p-5 no-underline shadow-xs transition-all hover:-translate-y-0.5 hover:border-green/40 hover:shadow-card">
                <div>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-green/15 text-2xl text-green-dark"><i className={`bx ${m.icon}`} /></span>
                    {m.badge && <span className="rounded-full border border-line bg-page px-2.5 py-0.5 text-[0.68rem] font-bold text-ink">{m.badge}</span>}
                  </div>
                  <h3 className="m-0 font-display text-base font-bold text-ink">{m.title}</h3>
                  <p className="m-0 mt-1.5 text-xs leading-relaxed text-body-muted">{m.text}</p>
                </div>
              </Link>
            ))}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Validación de egresados" note="Cuentas y diplomas por revisar" action={<Link to="/institucion/estudiantes/solicitudes" className="text-xs font-bold text-green-dark no-underline hover:underline">Ver todas ({pending.total}) →</Link>}>
              {pending.items.length === 0 ? <Empty>No hay egresados pendientes de validación.</Empty> : (
                <ul className="m-0 list-none divide-y divide-line-soft p-0">
                  {pending.items.map((r) => (
                    <li key={r.id_academico} className="flex items-center justify-between gap-3 py-3">
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-ink">{r.nombre_completo}</span>
                        <span className="block truncate text-[0.68rem] text-secondary">{r.carrera || r.nombre_programa} · Grado {r.ano_graduacion}</span>
                      </span>
                      <span className="shrink-0 text-[0.68rem] text-secondary">{shortDate(r.creado_en)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Convenios en cola" note="Solicitudes de empresas por revisar" action={<Link to="/institucion/empresas/solicitudes" className="text-xs font-bold text-green-dark no-underline hover:underline">Ver todas ({p?.convenios_pendientes ?? 0}) →</Link>}>
              {!p?.convenios_recientes.length ? <Empty>No hay solicitudes de convenio pendientes.</Empty> : (
                <ul className="m-0 list-none divide-y divide-line-soft p-0">
                  {p.convenios_recientes.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-ink">{s.empresa.nombre}</span>
                        <span className="block truncate text-[0.68rem] text-secondary">NIT {s.empresa.nit} · {s.tipo_convenio}</span>
                      </span>
                      <span className="shrink-0 text-[0.68rem] text-secondary">{shortDate(s.solicitado_en)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Empleabilidad por facultad" note="Egresados contratados a través de Vincula"
            action={<Link to="/institucion/estudiantes/estadisticas" className="text-xs font-bold text-green-dark no-underline hover:underline">Reporte completo →</Link>}>
            {!p?.facultades.length ? <Empty>Aún no hay egresados registrados en tus facultades.</Empty> : (
              <div className="grid gap-4 md:grid-cols-2">
                {p.facultades.map((f) => (
                  <div key={f.id} className="space-y-2 rounded-xl border border-line-soft bg-page/60 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="truncate text-sm text-ink">{f.nombre}</strong>
                      <span className="font-display text-base font-bold text-green-dark">{pct(f.tasa)}</span>
                    </div>
                    <Bar value={f.tasa} />
                    <p className="m-0 text-[0.68rem] text-secondary">{f.colocados} contratados de {f.egresados} egresados</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </InstitutionPortalLayout>
  );
}
