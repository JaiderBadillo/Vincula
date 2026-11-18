import { useState } from 'react';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import { Empty, LoadState, shortDate, useLoad } from '../components/institution/ui.jsx';
import { advisorPhotos } from '../data/institutionImages.js';
import { institutionService } from '../services/institutionService.js';

const load = () => institutionService.getAgreementRequests();
const tabs = [
  { id: 'open', label: 'Pendientes', match: (s) => s === 'pendiente' || s === 'en_revision' },
  { id: 'aprobada', label: 'Convenios aprobados', match: (s) => s === 'aprobada' },
  { id: 'rechazada', label: 'Con observaciones', match: (s) => s === 'rechazada' },
];

export default function InstitutionCompanyValidationPage() {
  const { data, error, loading, reload } = useLoad(load);
  const [tab, setTab] = useState('open');
  const [rejecting, setRejecting] = useState(null); // id de la solicitud que se está rechazando
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const items = data?.items || [];
  const current = tabs.find((t) => t.id === tab);
  const shown = items.filter((s) => current.match(s.estado));

  async function resolve(id, estado, text = null) {
    setBusy(true);
    setMessage('');
    try {
      await institutionService.resolveAgreementRequest(id, estado, text);
      setRejecting(null);
      setNotes('');
      await reload();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <InstitutionPortalLayout activePage="empresas-solicitudes">
      <main className="w-full pb-16">
        <div className="mx-auto max-w-7xl space-y-8 px-5 pt-8 sm:px-8 lg:px-10">
          <InstitutionPageHero
            eyebrow="Convenios empresariales"
            title="Validación de empresas"
            subtitle="Revisa las solicitudes de convenio de las empresas: apruébalas para formalizar el convenio o devuélvelas con observaciones."
            photo={advisorPhotos.companyValidation}
            stats={[
              { value: items.filter((s) => tabs[0].match(s.estado)).length, label: 'Pendientes' },
              { value: items.filter((s) => s.estado === 'aprobada').length, label: 'Aprobados' },
              { value: items.reduce((n, s) => n + (s.vacantes_proyectadas || 0), 0), label: 'Vacantes proyectadas' },
            ]}
          />

          <LoadState loading={loading} error={error} data={data}>
            <div role="tablist" className="flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold cursor-pointer ${tab === t.id ? 'bg-lime text-ink shadow-xs' : 'bg-page text-secondary hover:text-ink'}`}>
                  {t.label} <span className="ml-1 rounded-full bg-line px-2 text-[0.62rem]">{items.filter((s) => t.match(s.estado)).length}</span>
                </button>
              ))}
            </div>
            {message && <p className="m-0 text-sm font-semibold text-rose-700" role="alert">{message}</p>}

            {shown.length === 0 ? (
              <Empty>{items.length === 0 ? 'Aún no hay solicitudes de convenio. Aparecerán aquí cuando una empresa solicite vincularse a tu institución.' : 'No hay solicitudes en esta pestaña.'}</Empty>
            ) : (
              <ul className="m-0 list-none space-y-4 p-0">
                {shown.map((s) => (
                  <li key={s.id} className="rounded-2xl border border-line bg-white p-5 shadow-xs">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="m-0 font-display text-base font-bold text-ink">{s.empresa.nombre}</h3>
                        <p className="m-0 mt-0.5 text-xs text-secondary">NIT {s.empresa.nit} · {s.empresa.sector} · {s.empresa.ciudad}</p>
                        <p className="m-0 mt-0.5 text-xs text-secondary">Contacto: {s.empresa.contacto} · {s.empresa.correo}</p>
                      </div>
                      <span className="rounded-full border border-line bg-page px-3 py-1 text-[0.7rem] font-bold text-ink">{s.tipo_convenio}</span>
                    </div>
                    <dl className="m-0 mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                      <div><dt className="text-secondary">Vacantes proyectadas</dt><dd className="m-0 font-bold text-ink">{s.vacantes_proyectadas}</dd></div>
                      <div><dt className="text-secondary">Duración</dt><dd className="m-0 font-bold text-ink">{s.duracion_anos} año(s)</dd></div>
                      <div><dt className="text-secondary">Solicitado</dt><dd className="m-0 font-bold text-ink">{shortDate(s.solicitado_en)}</dd></div>
                      <div><dt className="text-secondary">Programas</dt><dd className="m-0 font-bold text-ink">{s.programas.length ? s.programas.join(', ') : 'Todos'}</dd></div>
                    </dl>
                    {s.notas && <p className="m-0 mt-3 rounded-xl bg-page/70 px-3 py-2 text-xs text-secondary"><strong className="text-ink">Observaciones:</strong> {s.notas}</p>}

                    {current.id === 'open' && (rejecting === s.id ? (
                      <div className="mt-4 space-y-2">
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} placeholder="Explica a la empresa qué debe corregir (obligatorio)"
                          className="w-full rounded-xl border border-line p-3 text-xs text-ink focus:border-green focus:outline-none" aria-label="Observaciones para la empresa" />
                        <div className="flex gap-2">
                          <button type="button" disabled={busy || !notes.trim()} onClick={() => resolve(s.id, 'rechazada', notes)} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer">Rechazar con observaciones</button>
                          <button type="button" onClick={() => { setRejecting(null); setNotes(''); }} className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-ink cursor-pointer">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" disabled={busy} onClick={() => resolve(s.id, 'aprobada')} className="rounded-xl bg-green-dark px-4 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer">Aprobar y crear convenio</button>
                        <button type="button" disabled={busy} onClick={() => setRejecting(s.id)} className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-ink cursor-pointer">Rechazar</button>
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </LoadState>
        </div>
      </main>
    </InstitutionPortalLayout>
  );
}
