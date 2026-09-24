/**
 * Preferencia de ayudas visuales (tours guiados), guardada POR DISPOSITIVO en
 * localStorage. No se sincroniza entre equipos: cada navegador tiene la suya,
 * coherente con cómo el hook useTour marca los tours ya vistos.
 *
 * - Por defecto las ayudas automáticas están ACTIVAS (un tendero nuevo ve el
 *   tour la primera vez que entra a una página).
 * - El tendero puede desactivarlas desde el botón flotante de ayuda; entonces
 *   los tours dejan de aparecer solos, pero puede lanzarlos a mano cuando quiera.
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
