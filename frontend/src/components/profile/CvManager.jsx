import { useRef, useState } from 'react';
import { formatApplicationDate } from '../../utils/formatters.js';

const MAX_CV_BYTES = 5 * 1024 * 1024;
const MAX_CVS = 4;
const ALLOWED = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

function formatSize(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function fileIcon(name) {
  return name.toLowerCase().endsWith('.pdf')
    ? { icon: 'bxs-file-pdf', cls: 'bg-rose-50 text-rose-600' }
    : { icon: 'bxs-file-doc', cls: 'bg-sky-50 text-sky-600' };
}

export default function CvManager({ profile, updateProfile, notify }) {
  const fileInput = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [replaceId, setReplaceId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [labelDraft, setLabelDraft] = useState('');
  // Archivos subidos en esta sesión para poder previsualizarlos (no se persisten).
  const [sessionUrls, setSessionUrls] = useState({});

  const cvs = profile.cvs ?? [];

  function processFile(file) {
    if (!file) return;
    const okType = ALLOWED.includes(file.type) || /\.(pdf|docx?)$/i.test(file.name);
    if (!okType) return notify('Formato no permitido. Usa PDF, DOC o DOCX.', 'error');
    if (file.size > MAX_CV_BYTES) return notify('El archivo supera los 5 MB.', 'error');

    const today = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(file);

    if (replaceId) {
      updateProfile((p) => ({
        ...p,
        cvs: p.cvs.map((cv) => (cv.id === replaceId ? { ...cv, fileName: file.name, size: file.size, uploadedAt: today } : cv)),
      }));
      setSessionUrls((u) => ({ ...u, [replaceId]: url }));
      notify('Hoja de vida reemplazada correctamente.');
      setReplaceId(null);
      return;
    }

    if (cvs.length >= MAX_CVS) return notify(`Puedes tener máximo ${MAX_CVS} versiones de CV.`, 'error');
    const id = `cv-${Date.now()}`;
    updateProfile((p) => ({
      ...p,
      cvs: [...p.cvs, { id, label: `CV ${p.cvs.length + 1}`, fileName: file.name, size: file.size, uploadedAt: today, primary: p.cvs.length === 0 }],
    }));
    setSessionUrls((u) => ({ ...u, [id]: url }));
    notify('Nueva versión de CV cargada.');
  }

  function onInputChange(e) {
    processFile(e.target.files?.[0]);
    e.target.value = '';
  }

  function openPicker(id = null) {
    setReplaceId(id);
    fileInput.current?.click();
  }

  function setPrimary(id) {
    updateProfile((p) => ({ ...p, cvs: p.cvs.map((cv) => ({ ...cv, primary: cv.id === id })) }));
    notify('CV principal actualizado. Se usará por defecto al postularte.');
  }

  function remove(id) {
    updateProfile((p) => {
      const rest = p.cvs.filter((cv) => cv.id !== id);
      if (rest.length && !rest.some((cv) => cv.primary)) rest[0] = { ...rest[0], primary: true };
      return { ...p, cvs: rest };
    });
    notify('Versión eliminada.');
  }

  function saveLabel(id) {
    const label = labelDraft.trim();
    if (label) updateProfile((p) => ({ ...p, cvs: p.cvs.map((cv) => (cv.id === id ? { ...cv, label } : cv)) }));
    setEditingId(null);
  }

  return (
    <section id="subir-cv" aria-labelledby="cv-title" className="profile-card overflow-hidden rounded-[1.25rem] border border-line bg-white shadow-card">
      <div className="grid md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* Image side — contraste visual */}
        <div className="relative min-h-56 overflow-hidden bg-ink md:min-h-full">
          <img src="/images/profile/cv-review.jpg" alt="" className="profile-zoom-img absolute inset-0 size-full object-cover object-[70%_center]" loading="lazy" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/5" aria-hidden="true" />
          <div className="relative flex h-full flex-col justify-end p-6 text-white">
            <p className="mb-2 inline-flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/85">
              <span className="size-2 rounded-full bg-lime" aria-hidden="true" />
              Hoja de vida
            </p>
            <h2 id="cv-title" className="m-0 font-display text-2xl font-semibold leading-tight tracking-[-0.03em]">
              Tu CV es tu primera entrevista.
            </h2>
            <p className="m-0 mt-2 text-sm leading-6 text-white/70">
              Guarda hasta {MAX_CVS} versiones adaptadas a cada tipo de vacante y elige cuál enviar.
            </p>
            <ul className="m-0 mt-4 grid list-none gap-1.5 p-0 text-xs text-white/75">
              <li className="flex items-center gap-2"><i className="bx bx-check-circle text-lime" aria-hidden="true" />PDF, DOC o DOCX · máximo 5 MB</li>
              <li className="flex items-center gap-2"><i className="bx bx-check-circle text-lime" aria-hidden="true" />El CV principal se adjunta por defecto</li>
            </ul>
          </div>
        </div>

        {/* Manager side */}
        <div className="p-5 sm:p-6">
          <div
            role="button"
            tabIndex={0}
            onClick={() => openPicker()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); } }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); setReplaceId(null); processFile(e.dataTransfer.files?.[0]); }}
            className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-7 text-center transition-all ${
              dragging ? 'scale-[1.01] border-green bg-green/5' : 'border-line bg-page hover:border-green/50 hover:bg-green/[0.03]'
            }`}
            aria-label="Subir una nueva versión de hoja de vida"
          >
            <span className="grid size-14 place-items-center rounded-2xl bg-ink text-2xl text-lime shadow-sm transition-transform group-hover:-translate-y-1" aria-hidden="true">
              <i className="bx bx-cloud-upload" />
            </span>
            <p className="m-0 mt-3 font-display text-sm font-bold text-ink">
              {dragging ? 'Suelta el archivo aquí' : 'Arrastra tu CV o haz clic para subirlo'}
            </p>
            <p className="m-0 mt-1 text-xs text-body-muted">{cvs.length}/{MAX_CVS} versiones guardadas</p>
          </div>
          <input ref={fileInput} type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={onInputChange} aria-label="Seleccionar archivo de hoja de vida" />

          <ul className="m-0 mt-5 grid list-none gap-2.5 p-0">
            {cvs.length === 0 && (
              <li className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
                <i className="bx bx-error-circle mr-1" aria-hidden="true" />
                Aún no tienes hoja de vida. Sin ella no podrás postularte a vacantes.
              </li>
            )}
            {cvs.map((cv) => {
              const fi = fileIcon(cv.fileName);
              return (
                <li
                  key={cv.id}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors ${cv.primary ? 'border-green/40 bg-green/[0.04]' : 'border-line bg-white hover:border-ink/20'}`}
                >
                  <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-2xl ${fi.cls}`} aria-hidden="true">
                    <i className={`bx ${fi.icon}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {editingId === cv.id ? (
                        <input
                          autoFocus
                          className="w-36 rounded-md border border-green px-2 py-0.5 text-sm font-bold text-ink outline-none"
                          value={labelDraft}
                          maxLength={30}
                          onChange={(e) => setLabelDraft(e.target.value)}
                          onBlur={() => saveLabel(cv.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(cv.id); if (e.key === 'Escape') setEditingId(null); }}
                          aria-label="Nombre de la versión"
                        />
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-display text-sm font-bold text-ink hover:text-green-dark"
                          onClick={() => { setEditingId(cv.id); setLabelDraft(cv.label); }}
                          title="Renombrar versión"
                        >
                          {cv.label}<i className="bx bx-pencil text-xs text-secondary" aria-hidden="true" />
                        </button>
                      )}
                      {cv.primary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-white">
                          <i className="bx bxs-star text-[0.65rem]" aria-hidden="true" />Principal
                        </span>
                      )}
                    </div>
                    <p className="m-0 mt-0.5 truncate text-xs text-body-muted">
                      {cv.fileName} · {formatSize(cv.size)} · {formatApplicationDate(cv.uploadedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!cv.primary && (
                      <button type="button" onClick={() => setPrimary(cv.id)} className="rounded-lg px-2.5 py-1.5 text-[0.7rem] font-bold text-green-dark hover:bg-green/10">
                        Usar como principal
                      </button>
                    )}
                    {sessionUrls[cv.id] && (
                      <a href={sessionUrls[cv.id]} target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-lg text-secondary hover:bg-panel hover:text-ink" title="Ver archivo" aria-label={`Ver ${cv.fileName}`}>
                        <i className="bx bx-show text-lg" aria-hidden="true" />
                      </a>
                    )}
                    <button type="button" onClick={() => openPicker(cv.id)} className="grid size-8 place-items-center rounded-lg text-secondary hover:bg-panel hover:text-ink" title="Reemplazar archivo" aria-label={`Reemplazar ${cv.label}`}>
                      <i className="bx bx-refresh text-lg" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => remove(cv.id)} className="grid size-8 place-items-center rounded-lg text-secondary hover:bg-rose-50 hover:text-rose-600" title="Eliminar" aria-label={`Eliminar ${cv.label}`}>
                      <i className="bx bx-trash text-lg" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
