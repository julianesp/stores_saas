/**
 * Referencia de pago de Nequi de los pedidos de la tienda online.
 * Nequi no tiene API de cobro: el cliente escribe la referencia de su pago y
 * el tendero la contrasta con su app antes de confirmar el pedido.
 */

// 4–30 caracteres alfanuméricos (con guiones), tal como aparece en el comprobante.
const REFERENCE_PATTERN = /^[A-Z0-9][A-Z0-9-]{3,29}$/;

/** Devuelve la referencia normalizada (mayúsculas, sin espacios) o null si no es válida. */
export function normalizePaymentReference(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const reference = raw.replace(/\s+/g, '').toUpperCase();
  return REFERENCE_PATTERN.test(reference) ? reference : null;
}

/** Hash SHA-256 (hex) del token del pedido; en la base solo se guarda el hash. */
export async function hashOrderToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}
