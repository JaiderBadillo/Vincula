import { useCallback, useEffect, useState } from 'react';
import { authService, extractErrorMessage } from '../../services/authService.js';

const API = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export default function DocumentCorrections({ kind }) {
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState({});

  const refresh = useCallback(async () => {
    const response = await fetch(`${API}/auth/estado-documental`, {
      headers: { Authorization: `Bearer ${authService.getToken()}` },
    });
    if (!response.ok) throw new Error(extractErrorMessage(await response.json(), 'No se pudo consultar tu expediente.'));
    setRecord(await response.json());
  }, []);

  useEffect(() => { refresh().catch((e) => setError(e.message)); }, [refresh]);

  async function upload(type) {
    const file = files[type];
    if (!file || !file.name.toLowerCase().endsWith('.pdf') || file.size > 10 * 1024 * 1024) {
      setError('Selecciona un PDF de hasta 10 MB.');
      return;
    }
    setBusy(type);
    setError('');
    setMessage('');
    const form = new FormData();
    const url = kind === 'graduate' ? `${API}/egresados/documentos/diploma` : `${API}/${kind === 'company' ? 'empresas' : 'instituciones'}/subsanar-documento-form`;
    form.append('archivo_pdf', file);
    if (kind !== 'graduate') form.append('tipo_documento', type);
    try {
      const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${authService.getToken()}` }, body: form });
      if (!response.ok) throw new Error(extractErrorMessage(await response.json(), 'No se pudo guardar el documento.'));
      setFiles((previous) => ({ ...previous, [type]: null }));
      await refresh();
      setMessage('Archivo recibido. Tu expediente volvió a revisión.');
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  if (!record) return error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : null;
  const graduate = kind === 'graduate';
  const pendingDocs = graduate ? [{ tipo: 'diploma', nombre: 'Diploma o acta de grado', estado: record.estado }] : record.documentos.filter((doc) => doc.estado === 'requiere_subsanacion');
  if (graduate && record.estado === 'aprobado') return null;
  if (!graduate && !['en_subsanacion', 'rechazado'].includes(record.estado)) return null;

  return (
    <section id="correcciones-documentales" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-ink shadow-sm" aria-label="Correcciones documentales">
      <h2 className="text-lg font-bold">{record.estado === 'rechazado' ? 'Corrección solicitada' : 'Documentos y revisión'}</h2>
      {record.motivo && <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Observación del revisor:</strong> {record.motivo}</p>}
      {graduate && !record.documentos.length && <p className="mt-2 text-sm">No hay un diploma adjunto disponible. Adjunta el archivo original para que la institución pueda revisarlo.</p>}
      {!graduate && record.estado === 'rechazado' && <p className="mt-2 text-sm">La solicitud fue rechazada definitivamente. El administrador debe habilitar una subsanación antes de que puedas reemplazar documentos.</p>}
      {record.puede_subir && pendingDocs.map((doc) => (
        <div key={doc.tipo} className="mt-4 rounded-xl border border-amber-200 bg-white p-4">
          <label className="block text-sm font-semibold" htmlFor={`correction-${kind}-${doc.tipo}`}>{doc.nombre || doc.tipo.replaceAll('_', ' ')}</label>
          <input id={`correction-${kind}-${doc.tipo}`} className="mt-2 block w-full text-sm" type="file" accept=".pdf,application/pdf"
            onChange={(event) => setFiles((previous) => ({ ...previous, [doc.tipo]: event.target.files?.[0] }))} />
          <button type="button" disabled={busy !== '' || !files[doc.tipo]} onClick={() => upload(doc.tipo)}
            className="mt-3 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy === doc.tipo ? 'Guardando…' : 'Enviar PDF corregido'}
          </button>
        </div>
      ))}
      {message && <p role="status" className="mt-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
