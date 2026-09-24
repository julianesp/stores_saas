/**
 * Registro de notificaciones ya "vistas" (abiertas individualmente) por el
 * tendero. Guardado por dispositivo en localStorage.
 *
 * Sirve para el campaneo de la campana: pulsa y suena mientras exista al menos
 * una notificación cuyo id NO esté en este registro. Abrir el panel NO marca
 * nada; el tendero debe hacer clic en cada notificación (ir a su detalle) para
 * marcarla como vista. Cuando ya vio todas, el campaneo se detiene.
 *
 * Los ids de notificación son estables por tipo (p. ej. 'low-stock',
 * 'pending-debts'); se ven al cargarlas en lib/notification-helpers.ts.
 */

const SEEN_KEY = 'seen_notification_ids';

export function getSeenNotificationIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

export function markNotificationSeen(id: string): void {
  if (typeof window === 'undefined') return;
  const seen = getSeenNotificationIds();
  seen.add(id);
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}

/** Marca varias como vistas de una vez (para un botón "marcar todas"). */
export function markNotificationsSeen(ids: string[]): void {
  if (typeof window === 'undefined') return;
  const seen = getSeenNotificationIds();
  ids.forEach((id) => seen.add(id));
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}
