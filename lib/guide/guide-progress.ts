/**
 * Progreso de la guía de uso, guardado POR DISPOSITIVO en localStorage (igual
 * que la preferencia de ayudas automáticas de lib/help-preferences.ts).
 *
 * - "vistas": guías que el tendero terminó o marcó como entendidas.
 * - "avisos": cuántas veces se mostró el aviso flotante de cada guía. Se limita
 *   para no insistir: si lo ignora dos veces, deja de salir solo (la guía sigue
 *   disponible desde el botón de ayuda).
 *
 * Todo va envuelto en try/catch: en modo privado o con el almacenamiento lleno
 * la guía funciona igual, solo que no recuerda el progreso.
 */

const SEEN_PREFIX = "guide_seen_v1";
const NUDGE_PREFIX = "guide_nudges_v1";

/** Veces que se muestra solo el aviso de una guía antes de dejar de insistir. */
export const MAX_NUDGES = 2;

const key = (prefix: string, userId?: string) =>
  userId ? `${prefix}_${userId}` : prefix;

function readRaw(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

function writeRaw(k: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(k);
    else localStorage.setItem(k, value);
  } catch {
    // Sin almacenamiento disponible: la guía sigue funcionando sin memoria.
  }
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function subscribeGuideProgress(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(SEEN_PREFIX)) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

// useSyncExternalStore necesita la misma referencia mientras el valor no cambie.
const EMPTY: readonly string[] = [];
let cachedRaw: string | null = null;
let cachedSeen: readonly string[] = EMPTY;

export function getSeenGuides(userId?: string): readonly string[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = readRaw(key(SEEN_PREFIX, userId));
  if (raw === cachedRaw) return cachedSeen;
  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cachedSeen = Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    cachedSeen = EMPTY;
  }
  return cachedSeen;
}

export function markGuideSeen(id: string, userId?: string) {
  const seen = getSeenGuides(userId);
  if (seen.includes(id)) return;
  writeRaw(key(SEEN_PREFIX, userId), JSON.stringify([...seen, id]));
  emit();
}

export function resetGuideProgress(userId?: string) {
  writeRaw(key(SEEN_PREFIX, userId), null);
  writeRaw(key(NUDGE_PREFIX, userId), null);
  emit();
}

function readNudges(userId?: string): Record<string, number> {
  try {
    const raw = readRaw(key(NUDGE_PREFIX, userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getNudgeCount(id: string, userId?: string): number {
  return readNudges(userId)[id] ?? 0;
}

export function setNudgeCount(id: string, count: number, userId?: string) {
  const nudges = readNudges(userId);
  nudges[id] = count;
  writeRaw(key(NUDGE_PREFIX, userId), JSON.stringify(nudges));
}
