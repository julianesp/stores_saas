/**
 * `state` firmado para el flujo OAuth de Google Drive.
 *
 * Ata la vuelta del callback al usuario que inició la conexión (CSRF) y traslada
 * el user_profile_id y el nombre de tienda sin volver a consultarlos. Se firma con
 * HMAC-SHA256 usando CRON_SECRET (secret ya presente en el entorno del front).
 */

import crypto from 'crypto';

interface StatePayload {
  clerkUserId: string;
  userProfileId: string;
  storeName: string;
  iat: number; // epoch segundos
}

const MAX_AGE_SECONDS = 10 * 60; // el state caduca en 10 minutos

function secret(): string {
  const s = process.env.CRON_SECRET;
  if (!s) throw new Error('Falta CRON_SECRET para firmar el state');
  return s;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function signState(payload: Omit<StatePayload, 'iat'>): string {
  const full: StatePayload = { ...payload, iat: Math.floor(Date.now() / 1000) };
  const body = b64url(JSON.stringify(full));
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyState(state: string): StatePayload | null {
  const [body, sig] = state.split('.');
  if (!body || !sig) return null;

  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  // Comparación en tiempo constante
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as StatePayload;
    if (Math.floor(Date.now() / 1000) - payload.iat > MAX_AGE_SECONDS) return null;
    return payload;
  } catch {
    return null;
  }
}
