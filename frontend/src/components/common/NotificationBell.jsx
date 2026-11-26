import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NOTIFICATIONS_CHANGED, notificationService } from '../../services/notificationService.js';
import NotificationList from './NotificationList.jsx';

const POLL_MS = 60000;

/** Campana de notificaciones para todos los roles: contador, panel con los últimos avisos y acceso a la página completa. */
export default function NotificationBell({ borderClass = 'border-line' }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const data = await notificationService.list({ limit: 15 });
      setItems(data.items);
      setUnread(data.no_leidas);
      setError('');
    } catch (err) {
      setError(err.message || 'No pudimos cargar tus notificaciones.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    window.addEventListener('focus', load);
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', load);
      window.removeEventListener(NOTIFICATIONS_CHANGED, load);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function openItem(item) {
    setOpen(false);
    if (!item.leida) {
      setItems((list) => list.map((n) => (n.id === item.id ? { ...n, leida: true } : n)));
      setUnread((n) => Math.max(0, n - 1));
      notificationService.markRead(item.id).catch(() => load());
    }
    if (item.enlace) navigate(item.enlace);
  }

  async function markAll() {
    setActionError('');
    try {
      await notificationService.markAllRead();
    } catch {
      setActionError('No se pudieron marcar como leídas. Inténtalo de nuevo.');
      return;
    }
    setItems((list) => list.map((n) => ({ ...n, leida: true })));
    setUnread(0);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'}
        className={`relative grid size-10 cursor-pointer place-items-center rounded-control border bg-white text-xl text-ink shadow-xs transition-colors hover:bg-panel ${borderClass}`}
      >
        <i className="bx bx-bell" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-green px-1 text-[0.62rem] font-bold text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
            <h2 className="m-0 font-display text-base font-semibold text-ink">Notificaciones</h2>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-green-dark hover:underline">
                Marcar todas como leídas
              </button>
            )}
          </div>

          {actionError && <p role="alert" className="m-0 border-b border-line-soft px-4 py-2 text-xs text-rose-700">{actionError}</p>}
          <div className="max-h-96 overflow-y-auto">
            {error ? (
              <div className="px-4 py-6 text-center text-sm text-secondary">
                <p className="m-0">No pudimos cargar tus notificaciones.</p>
                <button type="button" onClick={load} className="mt-2 cursor-pointer border-none bg-transparent p-0 text-sm font-semibold text-green-dark hover:underline">Reintentar</button>
              </div>
            ) : !loaded ? (
              <p className="m-0 px-4 py-6 text-center text-sm text-secondary">Cargando…</p>
            ) : items.length === 0 ? (
              <p className="m-0 px-4 py-8 text-center text-sm text-secondary">No tienes notificaciones.</p>
            ) : (
              <NotificationList items={items} onOpen={openItem} compact />
            )}
          </div>

          <Link
            to="/notificaciones"
            onClick={() => setOpen(false)}
            className="block border-t border-line-soft px-4 py-3 text-center text-sm font-semibold text-green-dark no-underline hover:bg-page"
          >
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}
