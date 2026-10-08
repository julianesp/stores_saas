/**
 * Preferencia de los avisos de la guía de uso (components/guide/), guardada
 * POR DISPOSITIVO en localStorage. No se sincroniza entre equipos: cada
 * navegador tiene la suya, igual que el progreso de lib/guide/guide-progress.ts.
 *
 * - Por defecto están ACTIVOS (un tendero nuevo ve un aviso pequeño la primera
 *   vez que entra a cada sección).
 * - El tendero puede apagarlos desde la guía de uso (botón de ayuda); entonces
 *   el aviso deja de salir solo, pero las guías siguen disponibles a mano.
 */

const AUTO_HELP_KEY = 'help_auto_enabled';

/**
 * ¿Están habilitadas las ayudas automáticas en este dispositivo?
 * Devuelve true si nunca se ha tocado la preferencia (activas por defecto).
 */
export function isAutoHelpEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(AUTO_HELP_KEY) !== 'false';
}

/** Activa o desactiva las ayudas automáticas en este dispositivo. */
export function setAutoHelpEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTO_HELP_KEY, enabled ? 'true' : 'false');
}
