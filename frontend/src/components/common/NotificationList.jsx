import { formatRelative } from '../../services/notificationService.js';

/** Lista plana de avisos, compartida por la campana y la página. `onOpen(item)` se llama al elegir uno. */
export default function NotificationList({ items, onOpen, compact = false }) {
  return (
    <ul className="m-0 list-none divide-y divide-line-soft p-0">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onOpen(item)}
            className={`flex w-full cursor-pointer items-start gap-3 border-none bg-transparent text-left transition-colors hover:bg-page ${compact ? 'px-4 py-3' : 'px-5 py-4'}`}
          >
            <span
              className={`mt-1.5 size-2 shrink-0 rounded-full ${item.leida ? 'bg-transparent' : 'bg-green'}`}
              aria-label={item.leida ? undefined : 'Sin leer'}
            />
            <span className="min-w-0 flex-1">
              <span className={`block text-sm ${item.leida ? 'font-medium text-secondary' : 'font-semibold text-ink'}`}>{item.titulo}</span>
              <span className={`mt-0.5 block text-sm leading-snug text-body-muted ${compact ? 'line-clamp-2' : ''}`}>{item.mensaje}</span>
              <span className="mt-1 block text-xs text-secondary">{formatRelative(item.creada_en)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
