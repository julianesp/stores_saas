/**
 * Utilidades para comunicación por WhatsApp mediante enlaces wa.me.
 *
 * No requiere la API de WhatsApp Business ni ningún servicio de pago:
 * el enlace abre la conversación en WhatsApp (app o Web) con el mensaje
 * ya escrito, y el tendero solo pulsa "enviar".
 */

/**
 * Normaliza un teléfono al formato internacional que exige wa.me.
 *
 * WhatsApp rechaza números sin código de país, y en Colombia los celulares
 * se guardan normalmente con 10 dígitos ("3174503604"). Casos manejados:
 * - "317 450-3604" / "3174503604"  -> "573174503604" (celular, se antepone 57)
 * - "6015551234"                    -> "576015551234" (fijo nacional 60x)
 * - "573174503604" / "+57 317..."   -> "573174503604" (ya tiene indicativo)
 * - Otros internacionales (11-15 dígitos) se respetan tal cual.
 *
 * Devuelve null si el número no parece válido.
 */
export function normalizeColombianPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');

  // Celular colombiano de 10 dígitos (3xx xxx xxxx)
  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`;
  }

  // Fijo nacional de 10 dígitos (60x xxx xxxx)
  if (digits.length === 10 && digits.startsWith('60')) {
    return `57${digits}`;
  }

  // Ya viene con indicativo de Colombia
  if (digits.length === 12 && digits.startsWith('57')) {
    return digits;
  }

  // Otro número internacional con longitud razonable
  if (digits.length >= 11 && digits.length <= 15) {
    return digits;
  }

  return null;
}

/**
 * Construye un enlace wa.me listo para abrir con el mensaje precargado.
 * Devuelve null si el teléfono no es válido.
 */
export function buildWhatsAppLink(phone: string, message: string): string | null {
  const normalized = normalizeColombianPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/**
 * Mensaje de recordatorio de deuda (fiado) amable y con el nombre de la
 * tienda, para que el cliente sepa de dónde le escriben.
 */
export function buildDebtReminderMessage(params: {
  customerName: string;
  amount: number;
  storeName?: string | null;
}): string {
  const { customerName, amount, storeName } = params;
  const formattedAmount = `$${amount.toLocaleString('es-CO')}`;
  const from = storeName ? ` de *${storeName}*` : '';

  return (
    `Hola ${customerName} 👋\n\n` +
    `Te escribimos${from} para recordarte que tienes un saldo pendiente de *${formattedAmount}*.\n\n` +
    `Cuando puedas, pasa por la tienda o respóndenos por aquí para acordar el pago.\n\n` +
    `¡Gracias por tu confianza! 🙌`
  );
}
