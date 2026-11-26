import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GraduatePortalLayout from '../components/dashboard/GraduatePortalLayout.jsx';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';
import VinculaAdminLayout from '../components/admin/VinculaAdminLayout.jsx';
import NotificationList from '../components/common/NotificationList.jsx';
import { normalizeRole } from '../components/auth/ProtectedRoute.jsx';
import { authService } from '../services/authService.js';
import { NOTIFICATIONS_CHANGED, notificationService } from '../services/notificationService.js';

// Cada rol ve la página dentro de su propio portal; `activePage` no coincide con ningún ítem del menú.
function Layout({ children }) {
  const role = normalizeRole(authService.getCurrentUser()?.rol);
  const page = 'notificaciones';
  if (role === 'asesor_ies') return <InstitutionPortalLayout activePage={page} role="advisor">{children}</InstitutionPortalLayout>;
  if (role === 'admin_ies') return <InstitutionPortalLayout activePage={page} role="admin">{children}</InstitutionPortalLayout>;
  if (role === 'admin_empresa') return <CompanyPortalLayout activePage={page} role="admin">{children}</CompanyPortalLayout>;
  if (role === 'reclutador_empresa') return <CompanyPortalLayout activePage={page} role="recruiter">{children}</CompanyPortalLayout>;
  if (role === 'superadmin_vincula') return <VinculaAdminLayout activePage={page}>{children}</VinculaAdminLayout>;
  return <GraduatePortalLayout activePage={page}>{children}</GraduatePortalLayout>;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await notificationService.list({ limit: 100 });
      setItems(data.items);
      setUnread(data.no_leidas);
      setState('ready');
    } catch (err) {
      setError(err.message || 'No pudimos cargar tus notificaciones.');
      setState('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const notifyBells = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

  async function open(item) {
    if (!item.leida) {
      setItems((list) => list.map((n) => (n.id === item.id ? { ...n, leida: true } : n)));
      setUnread((n) => Math.max(0, n - 1));
      notificationService.markRead(item.id).then(notifyBells).catch(load);
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
    notifyBells();
  }

  return (
    <Layout>
      <main className="w-full pb-16">
        <div className="mx-auto max-w-3xl px-5 pt-8 sm:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="m-0 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Notificaciones</h1>
              <p className="m-0 mt-1 text-sm text-body-muted">
                {state === 'ready' && unread > 0 ? `${unread} sin leer` : 'Los avisos de tu actividad en Vincula.'}
              </p>
            </div>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="cursor-pointer rounded-control border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-panel">
                Marcar todas como leídas
              </button>
            )}
          </div>

          {actionError && <p role="alert" className="m-0 mb-3 text-sm text-rose-700">{actionError}</p>}
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            {state === 'loading' && <p className="m-0 px-5 py-10 text-center text-sm text-secondary">Cargando…</p>}
            {state === 'error' && (
              <div className="px-5 py-10 text-center text-sm text-secondary" role="alert">
                <p className="m-0">{error}</p>
                <button type="button" onClick={() => { setState('loading'); load(); }} className="mt-2 cursor-pointer border-none bg-transparent p-0 text-sm font-semibold text-green-dark hover:underline">Reintentar</button>
              </div>
            )}
            {state === 'ready' && items.length === 0 && <p className="m-0 px-5 py-10 text-center text-sm text-secondary">No tienes notificaciones.</p>}
            {state === 'ready' && items.length > 0 && <NotificationList items={items} onOpen={open} />}
          </div>
        </div>
      </main>
    </Layout>
  );
}
