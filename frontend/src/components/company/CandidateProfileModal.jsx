import { useEffect } from 'react';
import CandidateProfileInfo from './CandidateProfileInfo.jsx';

/** Perfil completo del candidato en Vincula: se abre solo cuando el reclutador lo pide. */
export default function CandidateProfileModal({ isOpen, onClose, candidate, state }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const education = [candidate.degreeLevel, candidate.program, candidate.institution].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-cocoa/70 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="profile-modal-name" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start gap-4 border-b border-sand-line px-7 py-5">
          {candidate.avatar ? (
            <img src={candidate.avatar} alt="" className="size-16 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-sand text-lg font-bold text-terracotta-dark">
              {candidate.candidateName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id="profile-modal-name" className="m-0 font-display text-2xl font-bold text-ink">{candidate.candidateName}</h2>
            <p className="m-0 mt-0.5 text-sm text-secondary">{education}{candidate.graduationYear ? ` · Grado ${candidate.graduationYear}` : ''}</p>
            <span className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold ${candidate.degreeVerified ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              {candidate.degreeVerified ? 'Título verificado por la IES' : 'Título en revisión por la IES'}
            </span>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-lg text-secondary hover:bg-sand hover:text-ink cursor-pointer" aria-label="Cerrar perfil">
            <i className="bx bx-x text-2xl" />
          </button>
        </header>
        <div className="overflow-y-auto px-7 py-6">
          <CandidateProfileInfo state={state} candidate={candidate} />
        </div>
      </div>
    </div>
  );
}
