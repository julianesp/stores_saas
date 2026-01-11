/**
 * Utilidades para manejo de códigos de barras
 *
 * Estas funciones aseguran que los códigos de barras se normalicen
 * de forma consistente en toda la aplicación (registro y venta).
 */

/**
 * Normaliza un código de barras para almacenamiento y búsqueda
 *
 * Reglas:
 * - Elimina espacios en blanco al inicio y final
 * - Convierte a mayúsculas (los códigos de barras son case-insensitive)
 * - Elimina caracteres no alfanuméricos excepto guiones
 * - Retorna null si el código está vacío
 *
 * @param barcode - Código de barras a normalizar
 * @returns Código normalizado o null si está vacío
 */
export function normalizeBarcode(barcode: string | null | undefined): string | null {
  if (!barcode) return null;

  // Eliminar espacios y convertir a mayúsculas
  let normalized = barcode.trim().toUpperCase();

  // Si está vacío después del trim, retornar null
  if (!normalized) return null;

  // Eliminar caracteres no alfanuméricos excepto guiones (algunos códigos los usan)
  // Mantener solo: letras, números y guiones
  normalized = normalized.replace(/[^A-Z0-9-]/g, '');

  return normalized || null;
}

/**
 * Compara dos códigos de barras de forma normalizada
 *
 * @param barcode1 - Primer código de barras
 * @param barcode2 - Segundo código de barras
 * @returns true si los códigos son equivalentes después de normalizar
 */
export function barcodeEquals(
  barcode1: string | null | undefined,
  barcode2: string | null | undefined
): boolean {
  const normalized1 = normalizeBarcode(barcode1);
  const normalized2 = normalizeBarcode(barcode2);

  // Ambos son null o vacíos
  if (!normalized1 && !normalized2) return true;

  // Solo uno es null
  if (!normalized1 || !normalized2) return false;

  return normalized1 === normalized2;
}

/**
 * Valida si un código de barras es válido
 *
 * @param barcode - Código de barras a validar
 * @returns true si el código es válido
 */
export function isValidBarcode(barcode: string | null | undefined): boolean {
  const normalized = normalizeBarcode(barcode);

  if (!normalized) return false;

  // Un código de barras válido debe tener al menos 4 caracteres
  // (los más cortos son UPC-E con 8 dígitos, pero podemos ser más flexibles)
  return normalized.length >= 4;
}

/**
 * Formatea un código de barras para mostrar al usuario
 * (mantiene el formato original pero normalizado)
 *
 * @param barcode - Código de barras a formatear
 * @returns Código formateado o string vacío
 */
export function formatBarcodeForDisplay(barcode: string | null | undefined): string {
  const normalized = normalizeBarcode(barcode);
  return normalized || '';
}
