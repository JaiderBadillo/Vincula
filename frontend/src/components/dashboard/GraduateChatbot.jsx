import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { normalizeRole } from '../auth/ProtectedRoute.jsx';
import { authService } from '../../services/authService.js';
import { graduateChatService } from '../../services/graduateChatService.js';
import './GraduateChatbot.css';

function ChatIcon({ name }) {
  const paths = {
    'bx-file': 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z M14 3v6h6 M8 13h8 M8 17h5',
    'bxs-file-pdf': 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z M14 3v6h6 M8 13h8 M8 17h5',
    'bx-conversation': 'M4 4h16v12H9l-5 4Z M8 8h8 M8 12h5',
    'bx-message-rounded-dots': 'M21 11a9 9 0 0 1-9 9H4l-2 2V11a9 9 0 0 1 19 0Z M7 11h.01 M12 11h.01 M17 11h.01',
    'bx-user': 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M4 21v-2a8 8 0 0 1 16 0v2',
    'bx-compass': 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z M16 8l-3 5-5 3 3-5Z',
    'bx-bot': 'M5 7h14a2 2 0 0 1 2 2v10H3V9a2 2 0 0 1 2-2Z M12 7V3 M8 12v2 M16 12v2 M9 17h6 M1 11v5 M23 11v5',
    'bx-reset': 'M3 10a9 9 0 1 1 1 7 M3 4v6h6',
    'bx-minus': 'M5 12h14',
    'bx-chevron-right': 'm9 5 7 7-7 7',
    'bx-chevron-down': 'm5 9 7 7 7-7',
    'bx-x': 'm6 6 12 12 M6 18 18 6',
    'bx-paperclip': 'm8 12 7-7a4 4 0 0 1 6 6L11 21a6 6 0 0 1-8-8L13 3 M6 15l9-9 M6 15a2 2 0 0 0 3 3l9-9',
    'bx-up-arrow-alt': 'M12 20V4 M5 11l7-7 7 7',
  };
  return <svg className="graduate-chat__glyph" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

const SUGGESTIONS = [
  { icon: 'bx-file', title: 'Revisar mi hoja de vida', text: 'Quiero evaluar mi hoja de vida. ¿Cómo podemos empezar?' },
  { icon: 'bx-conversation', title: 'Practicar una entrevista', text: 'Ayúdame a practicar una entrevista laboral. Hazme una pregunta a la vez.' },
  { icon: 'bx-user', title: 'Mejorar mi perfil', text: 'Quiero escribir un mejor perfil profesional. ¿Qué necesitas saber de mí?' },
  { icon: 'bx-compass', title: 'Explorar Víncula', text: '¿Cómo encuentro vacantes y reviso mis postulaciones en Víncula?' },
];

// Solo vive dentro del portal del egresado. Cambiar de cuenta destruye su estado.
export default function GraduateChatbot() {
  const { pathname } = useLocation();
  const user = authService.getCurrentUser();
  if (!authService.isAuthenticated() || normalizeRole(user?.rol) !== 'egresado'
      || !/^\/dashboard(?:\/|$)/.test(pathname)) return null;
  return <ChatPanel key={authService.getToken()} />;
}

function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [document, setDocument] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [failedMessage, setFailedMessage] = useState('');
  const launcher = useRef(null);
  const input = useRef(null);
  const fileInput = useRef(null);
  const log = useRef(null);
  const pending = useRef(null);
  const requestVersion = useRef(0);

  useEffect(() => () => {
    requestVersion.current += 1;
    pending.current?.abort();
  }, []);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open && log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [open, messages, busy, error]);

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  function reset() {
    requestVersion.current += 1;
    pending.current?.abort();
    pending.current = null;
    setBusy('');
    setMessages([]);
    setDraft('');
    setDocument(null);
    setError('');
    setFailedMessage('');
    input.current?.focus();
  }

  async function send(text = draft) {
    const message = text.trim();
    if (!message || pending.current || message.length > 4000) return;
    const controller = new AbortController();
    pending.current = controller;
    const version = ++requestVersion.current;
    const timeout = setTimeout(() => controller.abort(), 60000);
    const previous = messages;
    // Mantener pares completos y limitar el contexto enviado al proveedor.
    let history = previous.slice(-12);
    while (history.reduce((sum, item) => sum + item.content.length, 0) > 24000) history = history.slice(2);
    setMessages([...previous, { role: 'user', content: message }]);
    setDraft('');
    setError('');
    setFailedMessage('');
    setBusy('reply');
    try {
      const data = await graduateChatService.send({
        message, history, cv_text: document?.text || '',
      }, controller.signal);
      if (version !== requestVersion.current) return;
      if (!data.reply?.trim()) throw new Error('No recibimos una respuesta. Intenta nuevamente.');
      setMessages([...previous, { role: 'user', content: message }, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      if (version !== requestVersion.current) return;
      setMessages(previous);
      setDraft(message);
      setFailedMessage(message);
      setError(err.name === 'AbortError' ? 'La consulta tardó demasiado. Puedes volver a intentarlo.'
        : err instanceof TypeError ? 'No hay conexión con el asistente. Revisa tu conexión e intenta nuevamente.' : err.message);
    } finally {
      clearTimeout(timeout);
      if (version === requestVersion.current) {
        pending.current = null;
        setBusy('');
      }
    }
  }

  async function attach(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || pending.current) return;
    setError('');
    setFailedMessage('');
    if (!/\.pdf$/i.test(file.name)) return setError('Selecciona una hoja de vida en PDF.');
    if (file.size > 5 * 1024 * 1024) return setError('El archivo supera los 5 MB.');
    const controller = new AbortController();
    pending.current = controller;
    const version = ++requestVersion.current;
    const timeout = setTimeout(() => controller.abort(), 30000);
    setBusy('file');
    try {
      const data = await graduateChatService.readDocument(file, controller.signal);
      if (version !== requestVersion.current) return;
      if (!data.text) throw new Error('No se pudo leer el contenido del PDF.');
      // Un documento nuevo inicia otro contexto: no mezclar evaluaciones de dos CV.
      setMessages([]);
      setDocument({ name: file.name, text: data.text });
      setDraft('Evalúa mi hoja de vida: identifica fortalezas, aspectos por mejorar y tres acciones prioritarias.');
      input.current?.focus();
    } catch (err) {
      if (version === requestVersion.current) setError(err.name === 'AbortError'
        ? 'La lectura tardó demasiado. Intenta nuevamente.'
        : err instanceof TypeError ? 'No hay conexión para leer el PDF. Intenta nuevamente.' : err.message);
    } finally {
      clearTimeout(timeout);
      if (version === requestVersion.current) {
        pending.current = null;
        setBusy('');
      }
    }
  }

  return (
    <div className="graduate-chat">
      {open && (
        <section className="graduate-chat__panel" role="dialog" aria-label="Asistente Víncula"
          onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
          <header className="graduate-chat__header">
            <span className="graduate-chat__avatar" aria-hidden="true"><ChatIcon name="bx-bot" /></span>
            <div className="graduate-chat__heading"><h2>Asistente Víncula</h2><p>Tu próximo paso empieza aquí</p></div>
            <button type="button" className="graduate-chat__icon" onClick={reset} title="Nueva conversación" aria-label="Nueva conversación"><ChatIcon name="bx-reset" /></button>
            <button type="button" className="graduate-chat__icon" onClick={close} title="Minimizar chat" aria-label="Minimizar chat"><ChatIcon name="bx-minus" /></button>
          </header>

          <div className="graduate-chat__body" ref={log}>
            <div className="graduate-chat__welcome">
              <span className="graduate-chat__eyebrow">UN IMPULSO A TU FUTURO</span>
              <h3>Hablemos de tu próximo paso.</h3>
              <p>Puedo ayudarte a mejorar tu hoja de vida, preparar una entrevista y encontrar tu camino en Víncula.</p>
            </div>
            {!messages.length && !document && (
              <div className="graduate-chat__suggestions">
                {SUGGESTIONS.map((item) => <button type="button" key={item.title} disabled={!!busy} onClick={() => send(item.text)}>
                  <ChatIcon name={item.icon} /><span>{item.title}</span><ChatIcon name="bx-chevron-right" />
                </button>)}
              </div>
            )}
            <div className="graduate-chat__messages" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversación">
              {messages.map((item, index) => (
                <div className={`graduate-chat__message graduate-chat__message--${item.role}`} key={index}>
                  <span className="graduate-chat__speaker">{item.role === 'user' ? 'Tú' : 'Asistente Víncula'}</span>
                  <div>{item.content}</div>
                </div>
              ))}
            </div>
            {busy && <p className="graduate-chat__status" role="status"><span className="graduate-chat__pulse" />{busy === 'file' ? 'Leyendo tu hoja de vida…' : 'Preparando tu respuesta…'}</p>}
            {error && <div className="graduate-chat__error" role="alert">{error}
              {failedMessage && <button type="button" disabled={!!busy} onClick={() => send(failedMessage)}>Reintentar consulta</button>}
            </div>}
          </div>

          <div className="graduate-chat__composer">
            {document && <div className="graduate-chat__document">
              <ChatIcon name="bxs-file-pdf" /><span title={document.name}>{document.name}</span>
              <button type="button" disabled={!!busy} onClick={reset} aria-label="Quitar documento e iniciar nueva conversación" title="Quitar documento e iniciar nueva conversación"><ChatIcon name="bx-x" /></button>
            </div>}
            <form onSubmit={(event) => { event.preventDefault(); send(); }}>
              <label className="graduate-chat__sr-only" htmlFor="graduate-chat-input">Escribe tu pregunta</label>
              <textarea id="graduate-chat-input" ref={input} value={draft} rows={2} maxLength={4000}
                placeholder="Escribe tu pregunta…" disabled={!!busy}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault(); send();
                  }
                }} />
              <div className="graduate-chat__tools">
                <input type="file" accept=".pdf,application/pdf" ref={fileInput} onChange={attach} hidden />
                <button type="button" className="graduate-chat__attach" disabled={!!busy} onClick={() => fileInput.current?.click()} title="PDF con texto, máximo 5 MB y 15 páginas. Un nuevo archivo inicia otra conversación.">
                  <ChatIcon name="bx-paperclip" /> Adjuntar CV
                </button>
                <span className="graduate-chat__count">{draft.length}/4000</span>
                <button type="submit" className="graduate-chat__send" disabled={!!busy || !draft.trim()} aria-label="Enviar mensaje"><ChatIcon name="bx-up-arrow-alt" /></button>
              </div>
            </form>
            <p className="graduate-chat__privacy">Al enviar, tu mensaje y el texto del PDF se comparten con la IA de Google. Puede cometer errores. El chat se borra al recargar o cerrar sesión.</p>
          </div>
        </section>
      )}
      <button type="button" ref={launcher} className="graduate-chat__launcher" onClick={() => open ? close() : setOpen(true)}
        aria-expanded={open} aria-label={open ? 'Minimizar asistente Víncula' : 'Hablar con el asistente Víncula'}>
        <ChatIcon name={open ? 'bx-chevron-down' : 'bx-message-rounded-dots'} />
        <span>{open ? 'Minimizar' : 'Habla con Víncula'}</span><span className="graduate-chat__badge">IA</span>
      </button>
    </div>
  );
}
