import { useEffect, useState } from 'react';
import { ATS_STAGES, DISCARD_REASONS } from '../../data/companyCandidatesData.js';
import { atsService } from '../../services/atsService.js';
import { isPastInterview } from '../../utils/formatters.js';
import DocumentViewerModal from '../common/DocumentViewerModal.jsx';
import CandidateProfileModal from './CandidateProfileModal.jsx';
import { RequiredSkills } from './CandidateProfileInfo.jsx';

const initialsOf = (name) => name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const longDate = (iso, withYear = true) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) });
const money = (n) => (n == null ? null : `$ ${(n / 1e6).toFixed(1).replace('.', ',')} M`);
const range = (min, max) => (min && max && min !== max ? `${money(min)} – ${money(max)}` : money(min || max));

const TABS = [
  { id: 'summary', label: 'Resumen' },
  { id: 'profile', label: 'Perfil' },
  { id: 'process', label: 'Proceso' },
];

const INTERVIEW_STATUS = {
  'Confirmada por el egresado': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Pendiente de confirmar': 'bg-amber-50 text-amber-800 border-amber-200',
  'El egresado pide otra fecha': 'bg-rose-50 text-rose-700 border-rose-200',
};

/** El backend entrega la cita como texto: "2026-11-17 · 10:00 AM - 11:00 AM (Virtual) — enlace o lugar · Estado". */
function parseInterview(text) {
  const m = /^(\d{4}-\d{2}-\d{2}) · (.+?) \((Virtual|Presencial)\)(?: — (.+?))? · ([^·]+)$/.exec(text || '');
  return m ? { date: m[1], time: m[2], mode: m[3], where: m[4] || null, status: m[5].trim() } : null;
}

function Section({ title, children, action }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="m-0 text-[0.7rem] font-bold uppercase tracking-wider text-secondary">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function InterviewCard({ text }) {
  const iv = parseInterview(text);
  if (!iv) return <p className="m-0 rounded-xl bg-cream/60 p-4 text-sm text-ink">{text}</p>;
  const isLink = /^https?:\/\//.test(iv.where || '');
  return (
    <div className="space-y-3 rounded-2xl border border-sand-line bg-cream/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-sm font-bold text-ink">{longDate(iv.date, false).replace(/^./, (c) => c.toUpperCase())}</p>
          <p className="m-0 mt-0.5 text-xs text-secondary">{iv.time} · {iv.mode}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold ${INTERVIEW_STATUS[iv.status] || 'border-sand-line bg-white text-secondary'}`}>{iv.status}</span>
      </div>
      {isPastInterview(iv.date) ? (
        <p className="m-0 text-xs font-bold text-secondary">Esta entrevista ya pasó.</p>
      ) : iv.where && (isLink ? (
        <a href={iv.where} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-terracotta-dark no-underline shadow-2xs ring-1 ring-sand-line hover:bg-sand">
          <i className="bx bx-video text-base" aria-hidden="true" />Abrir reunión
        </a>
      ) : (
        <p className="m-0 flex items-start gap-1.5 text-xs text-ink"><i className="bx bx-map text-base text-terracotta" aria-hidden="true" />{iv.where}</p>
      ))}
    </div>
  );
}

/** Un documento adjunto: no se muestra desplegado, se abre a pantalla completa al pulsar "Ver". */
function DocumentRow({ icon, title, detail, onOpen, busy, disabled, error }) {
  return (
    <li>
      <div className="flex items-center gap-3 rounded-xl border border-sand-line px-3.5 py-2.5">
        <i className={`bx ${icon} text-xl text-terracotta`} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{title}</span>
          <span className="block truncate text-xs text-secondary">{detail}</span>
        </span>
        <button type="button" onClick={onOpen} disabled={busy || disabled}
          className="rounded-lg border border-sand-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
          {busy ? 'Abriendo…' : 'Ver'}
        </button>
      </div>
      {error && <p className="m-0 mt-1 px-1 text-xs text-amber-800" role="alert">{error}</p>}
    </li>
  );
}

export default function CandidateDetailDrawer({ candidate, initialTab = 'summary', onClose, onMoveStage, onScheduleInterview, onDiscard, onSaveNotes }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [selectedDiscardReason, setSelectedDiscardReason] = useState(DISCARD_REASONS[0]);
  const [discardNote, setDiscardNote] = useState('');
  const [viewer, setViewer] = useState(null); // { url, title, subtitle, metadata }
  const [opening, setOpening] = useState(null); // 'cv' | 'diploma' mientras se pide la URL firmada
  const [docError, setDocError] = useState({});
  const [profile, setProfile] = useState({ data: null, loading: true, error: '' });
  const [profileOpen, setProfileOpen] = useState(false);
  const open = Boolean(candidate);

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(e) {
      if (e.key !== 'Escape' || viewer || profileOpen) return; // esos visores cierran con su propio Escape
      if (discardModalOpen) setDiscardModalOpen(false);
      else onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, discardModalOpen, viewer, profileOpen]);

  useEffect(() => {
    if (!candidate) return;
    setNotes(candidate.recruiterNotes || '');
    setIsEditingNotes(false);
    setDiscardModalOpen(false);
    setSelectedDiscardReason(DISCARD_REASONS[0]);
    setDiscardNote('');
    setViewer(null);
    setOpening(null);
    setDocError({});
    setProfileOpen(false);
    setActiveTab(TABS.some((t) => t.id === initialTab) ? initialTab : 'summary');
  }, [candidate?.id, initialTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Perfil real del candidato: alimenta las habilidades, la pestaña Perfil y el perfil completo
  useEffect(() => {
    if (!candidate?.id) return undefined;
    let alive = true;
    setProfile({ data: null, loading: true, error: '' });
    atsService.getCandidateProfile(candidate.id)
      .then((data) => alive && setProfile({ data, loading: false, error: '' }))
      .catch((err) => alive && setProfile({ data: null, loading: false, error: err.message }));
    return () => { alive = false; };
  }, [candidate?.id]);

  if (!candidate) return null;
  const stage = candidate.stage;
  const p = profile.data;
  const hasCv = p ? p.hojas_de_vida.length > 0 : null; // null = aún cargando

  async function openDocument(kind) {
    setOpening(kind);
    setDocError((e) => ({ ...e, [kind]: '' }));
    try {
      if (kind === 'cv') {
        const res = await atsService.getCandidateCvUrl(candidate.id);
        setViewer({ url: res.url_segura, title: `Hoja de vida — ${candidate.candidateName}`, subtitle: res.nombre_archivo, metadata: { egresado: candidate.candidateName } });
      } else {
        const res = await atsService.getCandidateDiplomaUrl(candidate.id, 3600);
        if (!res?.url_segura) throw new Error('No se recibió el enlace del diploma.');
        setViewer({
          url: res.url_segura, title: `Título / Diploma — ${candidate.candidateName}`,
          subtitle: `${candidate.program || 'Programa académico'} · ${candidate.institution || 'IES'}`,
          metadata: { egresado: candidate.candidateName, programa: candidate.program, institucion: candidate.institution,
            estado: candidate.degreeVerified ? 'Verificado por la IES' : 'En revisión IES', acta: candidate.actaNumber || undefined, folio: candidate.bookFolio || undefined },
        });
      }
    } catch (err) {
      setDocError((e) => ({ ...e, [kind]: err.message || 'No se pudo abrir el documento.' }));
    } finally {
      setOpening(null);
    }
  }

  const btn = 'rounded-xl px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer';
  const primary = `${btn} bg-cocoa text-white hover:bg-cocoa/90`;
  const ghost = `${btn} border border-sand-line bg-white text-ink hover:bg-cream`;
  const schedule = () => (onScheduleInterview ? onScheduleInterview(candidate) : onMoveStage(candidate.id, 'interview'));

  const STEPS = ATS_STAGES.filter((s) => s.id !== 'discarded');
  const reached = STEPS.findIndex((s) => s.id === stage);
  const salary = p && p.salario.aspiracion_compartida && range(p.salario.aspiracion_min, p.salario.aspiracion_max);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-cocoa/55 backdrop-blur-xs animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="candidate-drawer-name" onClick={onClose}>
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
        {/* ─── Encabezado ─── */}
        <header className="px-6 pb-4 pt-6">
          <div className="flex items-start gap-4">
            {candidate.avatar ? (
              <img src={candidate.avatar} alt="" className="size-14 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-sand text-base font-bold text-terracotta-dark">{initialsOf(candidate.candidateName)}</span>
            )}
            <div className="min-w-0 flex-1">
              <h2 id="candidate-drawer-name" className="m-0 font-display text-xl font-bold text-ink">{candidate.candidateName}</h2>
              <p className="m-0 mt-0.5 text-sm text-secondary">{candidate.program}</p>
              <p className="m-0 text-xs text-secondary">{[candidate.institution, candidate.graduationYear && `Grado ${candidate.graduationYear}`].filter(Boolean).join(' · ')}</p>
            </div>
            <button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg text-secondary hover:bg-sand hover:text-ink cursor-pointer" aria-label="Cerrar ficha de candidato">
              <i className="bx bx-x text-xl" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <a href={`mailto:${candidate.email}`} className="inline-flex items-center gap-1.5 text-secondary no-underline hover:text-ink"><i className="bx bx-envelope text-sm" />{candidate.email}</a>
            {candidate.phone && <a href={`tel:${candidate.phone}`} className="inline-flex items-center gap-1.5 text-secondary no-underline hover:text-ink"><i className="bx bx-phone text-sm" />{candidate.phone}</a>}
            <span className="ml-auto flex items-center gap-3">
              <span className="font-bold text-ink">{candidate.matchPercentage == null ? 'Sin puntaje' : `${candidate.matchPercentage}% afinidad`}</span>
              <select value={stage} aria-label="Etapa del candidato"
                onChange={(e) => (e.target.value === 'discarded' ? setDiscardModalOpen(true) : onMoveStage(candidate.id, e.target.value))}
                className="cursor-pointer rounded-full border border-sand-line bg-white py-1 pl-3 pr-2 text-xs font-bold text-ink focus:border-terracotta focus:outline-none">
                {ATS_STAGES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
              </select>
            </span>
          </div>
        </header>

        <nav className="flex gap-6 border-b border-sand-line px-6" role="tablist">
          {TABS.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 py-3 text-sm font-semibold cursor-pointer ${activeTab === tab.id ? 'border-terracotta text-ink' : 'border-transparent text-secondary hover:text-ink'}`}>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ─── Contenido ─── */}
        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
          {activeTab === 'summary' && (
            <>
              <div>
                <p className="m-0 text-[0.7rem] font-bold uppercase tracking-wider text-secondary">Postulado a</p>
                <p className="m-0 mt-1 font-display text-base font-bold text-ink">{candidate.vacancyTitle}</p>
                <p className="m-0 text-xs text-secondary">{candidate.vacancyCode} · el {new Date(candidate.appliedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>

              {candidate.interviewDate && <Section title="Entrevista"><InterviewCard text={candidate.interviewDate} /></Section>}

              <Section title="Habilidades que pide la vacante">
                <RequiredSkills profile={p} fallback={candidate.skillsMatch || []} />
              </Section>

              <Section title="Documentos adjuntos">
                <ul className="m-0 list-none space-y-2 p-0">
                  <DocumentRow icon="bx-file" title="Hoja de vida" busy={opening === 'cv'} disabled={hasCv === false} error={docError.cv}
                    detail={hasCv === null ? 'Cargando…' : hasCv ? p.hojas_de_vida[0].nombre : 'El egresado no ha cargado una'} onOpen={() => openDocument('cv')} />
                  <DocumentRow icon="bxs-graduation" title="Diploma" busy={opening === 'diploma'} error={docError.diploma}
                    detail={candidate.degreeVerified ? 'Verificado por la IES' : 'En revisión por la IES'} onOpen={() => openDocument('diploma')} />
                </ul>
              </Section>

              <Section title="Notas internas" action={!isEditingNotes && <button type="button" onClick={() => setIsEditingNotes(true)} className="text-xs font-bold text-terracotta hover:underline cursor-pointer">{notes ? 'Editar' : 'Añadir'}</button>}>
                {isEditingNotes ? (
                  <div className="space-y-2">
                    <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notas internas" placeholder="Impresiones de la entrevista, resultado de la prueba…"
                      className="w-full rounded-xl border border-sand-line p-3 text-sm text-ink focus:border-terracotta focus:outline-none" />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setNotes(candidate.recruiterNotes || ''); setIsEditingNotes(false); }} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-secondary hover:text-ink cursor-pointer">Cancelar</button>
                      <button type="button" onClick={async () => { if (await onSaveNotes?.(candidate.id, notes)) setIsEditingNotes(false); }} className="rounded-lg bg-cocoa px-3.5 py-1.5 text-xs font-bold text-white hover:bg-cocoa/90 cursor-pointer">Guardar</button>
                    </div>
                  </div>
                ) : (
                  <p className="m-0 whitespace-pre-line text-sm leading-relaxed text-ink">{notes || <span className="text-secondary">Sin notas todavía.</span>}</p>
                )}
              </Section>

              {stage === 'discarded' && candidate.rejectionReason && (
                <p className="m-0 rounded-xl bg-stone-50 p-4 text-sm text-stone-700"><strong>Motivo de descarte:</strong> {candidate.rejectionReason}</p>
              )}
            </>
          )}

          {activeTab === 'profile' && (
            <>
              {profile.error ? <p className="m-0 text-sm text-rose-700" role="alert">{profile.error}</p> : !p ? <p className="m-0 text-sm text-secondary">Cargando perfil…</p> : (
                <div className="space-y-5">
                  {p.titular && <p className="m-0 text-sm font-semibold text-ink">{p.titular}</p>}
                  <p className="m-0 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-ink">{p.biografia || <span className="text-secondary">No ha escrito una presentación.</span>}</p>
                  <dl className="m-0 divide-y divide-sand-line/70 text-sm">
                    {[['Ubicación', [p.ciudad, p.departamento].filter(Boolean).join(', ')],
                      ['Disponibilidad', p.disponibilidad.disponible ? `Disponible${p.disponibilidad.tipo ? ` · ${p.disponibilidad.tipo}` : ''}` : 'No marcó disponibilidad'],
                      ['Aspiración salarial', p.salario.aspiracion_compartida ? salary : 'No la comparte']].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-secondary">{k}</dt><dd className="m-0 text-right font-semibold text-ink">{v}</dd></div>
                    ))}
                  </dl>
                </div>
              )}
              <button type="button" onClick={() => setProfileOpen(true)} disabled={!p} className={`${ghost} inline-flex items-center gap-2 disabled:opacity-50`}>
                <i className="bx bx-user-circle text-base text-terracotta" aria-hidden="true" />Ver perfil completo en Vincula
              </button>
            </>
          )}

          {activeTab === 'process' && (
            <Section title="Etapas del proceso">
              <ol className="m-0 list-none space-y-0 p-0">
                {STEPS.map((s, i) => {
                  const done = stage !== 'discarded' && i < reached;
                  const current = i === reached && stage !== 'discarded';
                  return (
                    <li key={s.id} className="flex items-center gap-3 py-2.5">
                      <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold ${done ? 'bg-emerald-600 text-white' : current ? 'bg-terracotta text-white' : 'bg-sand text-secondary'}`}>{done ? '✓' : i + 1}</span>
                      <span className={`text-sm ${current ? 'font-bold text-ink' : done ? 'text-ink' : 'text-secondary'}`}>{s.label}</span>
                      {i === 0 && <span className="ml-auto text-xs text-secondary">{new Date(candidate.appliedAt).toLocaleDateString('es-CO')}</span>}
                    </li>
                  );
                })}
              </ol>
              {stage === 'discarded' && <p className="m-0 mt-2 rounded-xl bg-stone-50 p-4 text-sm text-stone-700">Proceso finalizado. {candidate.rejectionReason}</p>}
            </Section>
          )}
        </div>

        {/* ─── Acciones ─── */}
        <footer className="flex items-center justify-between gap-3 border-t border-sand-line px-6 py-4">
          {stage !== 'discarded' ? <button type="button" onClick={() => setDiscardModalOpen(true)} className="text-xs font-bold text-rose-600 hover:underline cursor-pointer">Descartar</button> : <span />}
          <div className="flex items-center gap-2">
            {stage === 'review' && <button type="button" onClick={() => onMoveStage(candidate.id, 'preselected')} className={primary}>Preseleccionar</button>}
            {stage === 'preselected' && <button type="button" onClick={() => onMoveStage(candidate.id, 'evaluation')} className={ghost}>Enviar a prueba técnica</button>}
            {['preselected', 'evaluation'].includes(stage) && <button type="button" onClick={schedule} className={primary}>Citar a entrevista</button>}
            {stage === 'interview' && <button type="button" onClick={() => onMoveStage(candidate.id, 'offer')} className={`${primary} !bg-emerald-700 hover:!bg-emerald-800`}>Avanzar a oferta</button>}
            {stage === 'offer' && <button type="button" onClick={() => onMoveStage(candidate.id, 'hired')} className={`${primary} !bg-emerald-700 hover:!bg-emerald-800`}>Confirmar contratación</button>}
            {stage === 'discarded' && <button type="button" onClick={() => onMoveStage(candidate.id, 'preselected')} className={primary}>Reactivar postulación</button>}
          </div>
        </footer>

        {/* ─── Descartar ─── */}
        {discardModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-cocoa/70 p-4 backdrop-blur-xs animate-in fade-in" role="dialog" aria-modal="true" aria-labelledby="discard-modal-title" onClick={() => setDiscardModalOpen(false)}>
            <div className="w-full max-w-md space-y-4 rounded-2xl border border-sand-line bg-white p-6 shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
              <div>
                <h3 id="discard-modal-title" className="m-0 font-display text-base font-bold text-ink">Descartar candidato</h3>
                <p className="m-0 text-xs text-secondary">{candidate.candidateName} · {candidate.vacancyTitle}</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="discard-reason" className="text-xs font-bold text-ink">Motivo principal</label>
                <select id="discard-reason" value={selectedDiscardReason} onChange={(e) => setSelectedDiscardReason(e.target.value)} className="w-full cursor-pointer rounded-xl border border-sand-line p-2.5 text-xs font-semibold text-ink focus:border-terracotta focus:outline-none">
                  {DISCARD_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="discard-note" className="text-xs font-bold text-ink">Retroalimentación (opcional)</label>
                <textarea id="discard-note" rows={3} value={discardNote} onChange={(e) => setDiscardNote(e.target.value)} className="w-full rounded-xl border border-sand-line p-2.5 text-xs text-ink focus:border-terracotta focus:outline-none" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDiscardModalOpen(false)} className={ghost}>Cancelar</button>
                <button type="button" onClick={() => { onDiscard?.(candidate.id, selectedDiscardReason, discardNote); setDiscardModalOpen(false); }} className={`${btn} bg-rose-600 text-white hover:bg-rose-700`}>Confirmar descarte</button>
              </div>
            </div>
          </div>
        )}

        <DocumentViewerModal isOpen={Boolean(viewer)} onClose={() => setViewer(null)} documentUrl={viewer?.url} title={viewer?.title}
          subtitle={viewer?.subtitle} metadata={viewer?.metadata || {}} />
        <CandidateProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} candidate={candidate} state={profile} />
      </div>
    </div>
  );
}
