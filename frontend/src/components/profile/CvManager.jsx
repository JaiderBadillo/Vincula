import { useRef, useState } from 'react';
import { formatApplicationDate } from '../../utils/formatters.js';
import DocumentViewerModal from '../common/DocumentViewerModal.jsx';
import { graduateProfileService } from '../../services/graduateProfileService.js';

const MAX_CV_BYTES = 5 * 1024 * 1024;
const MAX_CVS = 4;
const ALLOWED = ['application/pdf'];

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
  const [saving, setSaving] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);

  const cvs = profile.cvs ?? [];

  async function processFile(file) {
    if (!file) return;
    const okType = ALLOWED.includes(file.type) || /\.pdf$/i.test(file.name);
    if (!okType) return notify('Formato no permitido. Usa un PDF.', 'error');
    if (file.size > MAX_CV_BYTES) return notify('El archivo supera los 5 MB.', 'error');
    if (cvs.length >= MAX_CVS) return notify(`Puedes tener máximo ${MAX_CVS} versiones de CV.`, 'error');
    setSaving(true);
    try {
      const saved = await graduateProfileService.uploadCv(file);
      updateProfile((p) => ({ ...p, cvs: saved.cvs }));
      notify('Hoja de vida guardada en tu cuenta.');
    } catch (error) { notify(error.message, 'error'); }
    finally { setSaving(false); }
  }

  function onInputChange(e) {
    void processFile(e.target.files?.[0]);
    e.target.value = '';
  }

  function openPicker() {
    fileInput.current?.click();
  }

  async function setPrimary(id) {
    try {
      const saved = await graduateProfileService.setPrimaryCv(id);
      updateProfile((p) => ({ ...p, cvs: saved.cvs }));
      notify('CV principal actualizado.');
    } catch (error) { notify(error.message, 'error'); }
  }

  async function remove(id) {
    try {
      const saved = await graduateProfileService.deleteCv(id);
      updateProfile((p) => ({ ...p, cvs: saved.cvs }));
      notify('Versión eliminada de tu cuenta.');
    } catch (error) { notify(error.message, 'error'); }
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
              <li className="flex items-center gap-2"><i className="bx bx-check-circle text-lime" aria-hidden="true" />PDF · máximo 5 MB</li>
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
            onDrop={(e) => { e.preventDefault(); setDragging(false); void processFile(e.dataTransfer.files?.[0]); }}
            className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-7 text-center transition-all ${
              dragging ? 'scale-[1.01] border-green bg-green/5' : 'border-line bg-page hover:border-green/50 hover:bg-green/[0.03]'
            }`}
            aria-label="Subir una nueva versión de hoja de vida"
          >
            <span className="grid size-14 place-items-center rounded-2xl bg-ink text-2xl text-lime shadow-sm transition-transform group-hover:-translate-y-1" aria-hidden="true">
              <i className="bx bx-cloud-upload" />
            </span>
            <p className="m-0 mt-3 font-display text-sm font-bold text-ink">
              {saving ? 'Guardando en tu cuenta…' : dragging ? 'Suelta el archivo aquí' : 'Arrastra tu CV o haz clic para subirlo'}
            </p>
            <p className="m-0 mt-1 text-xs text-body-muted">{cvs.length}/{MAX_CVS} versiones guardadas</p>
          </div>
          <input ref={fileInput} type="file" accept=".pdf,application/pdf" className="sr-only" onChange={onInputChange} aria-label="Seleccionar archivo de hoja de vida" />

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
                      <strong className="text-sm text-ink">{cv.fileName}</strong>
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
                    {cv.url && (
                      <button
                        type="button"
                        onClick={() => setViewerDoc(cv)}
                        className="grid size-8 place-items-center rounded-lg text-secondary hover:bg-panel hover:text-ink cursor-pointer"
                        title="Ver en visor integrado de Vincula"
                        aria-label={`Ver ${cv.fileName}`}
                      >
                        <i className="bx bx-show text-lg" aria-hidden="true" />
                      </button>
                    )}
                    <button type="button" onClick={() => remove(cv.id)} className="grid size-8 place-items-center rounded-lg text-secondary hover:bg-rose-50 hover:text-rose-600" title="Eliminar" aria-label={`Eliminar ${cv.fileName}`}>
                      <i className="bx bx-trash text-lg" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {viewerDoc && (
        <DocumentViewerModal
          isOpen={Boolean(viewerDoc)}
          onClose={() => setViewerDoc(null)}
          documentUrl={viewerDoc.url}
          title={viewerDoc.fileName}
          subtitle={`${profile.fullName || 'Egresado'} · ${viewerDoc.fileName}`}
          documentType="cv"
        />
      )}
    </section>
  );
}
