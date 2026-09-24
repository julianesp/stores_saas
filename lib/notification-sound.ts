/**
 * Sonido de "campana" para las notificaciones, generado con la Web Audio API
 * (sin archivos de audio: cero peso y cero peticiones de red).
 *
 * Limitaciones del navegador a tener en cuenta:
 *  - El audio no puede sonar hasta que el usuario haya interactuado con la
 *    página (política de autoplay). Antes del primer clic/tecla, playBellSound()
 *    simplemente no suena (falla en silencio).
 *  - Respeta la preferencia del usuario (isNotificationSoundEnabled), guardada
 *    por dispositivo en localStorage.
 */

const SOUND_KEY = 'notification_sound_enabled';

/**
 * ¿El sonido de notificaciones está habilitado en este dispositivo?
 * Por defecto APAGADO: el pulso visual y el badge ya informan sin molestar. El
 * tendero activa el sonido explícitamente si lo quiere. Así no hay "ding"
 * inesperado en un dispositivo nuevo (p. ej. el celular).
 */
export function isNotificationSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SOUND_KEY) === 'true';
}

/** Activa o desactiva el sonido de notificaciones en este dispositivo. */
export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_KEY, enabled ? 'true' : 'false');
}

// Reutilizamos un único AudioContext (crear uno por sonido agota recursos).
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Reproduce un "ding-ding" de campana (dos tonos breves y decrecientes).
 * No hace nada si el sonido está desactivado o si el navegador aún no permite
 * audio (falla en silencio, sin lanzar).
 */
export function playBellSound(): void {
  if (!isNotificationSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  // Si el contexto quedó suspendido (autoplay), intentar reanudarlo. Solo
  // funcionará si ya hubo interacción del usuario; si no, se ignora.
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;

  // Dos campanazos: frecuencias tipo campana, con caída rápida del volumen.
  const strikes = [
    { freq: 987.77, start: 0 },     // Si5
    { freq: 1318.51, start: 0.15 }, // Mi6
  ];

  for (const { freq, start } of strikes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const t0 = now + start;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01); // ataque rápido
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6); // decaimiento

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.65);
  }
}
