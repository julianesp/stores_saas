/**
 * Expiration Helpers
 * Lógica central para productos con fecha de vencimiento: cálculo de días
 * restantes, severidad de la alerta y creación de promociones automáticas
 * cuando el producto está próximo a vencer.
 *
 * Fuente única de verdad del umbral de vencimiento, usada por el inventario,
 * el dashboard, la página de ofertas y las notificaciones.
 */

import { Product } from './types';
import type { GetTokenFn, Offer } from './cloudflare-api';
import { getProducts, getOffers, createOffer } from './cloudflare-api';

/**
 * Días de anticipación con los que un producto se considera "próximo a vencer".
 */
export const EXPIRATION_WARNING_DAYS = 30;

/**
 * Descuento (%) que se aplica al crear una promoción automática por vencimiento.
 */
export const AUTO_OFFER_DISCOUNT = 20;

export type ExpirationSeverity = 'expired' | 'critical' | 'warning' | 'ok' | 'none';

export interface ExpirationInfo {
  /** Días restantes hasta el vencimiento (negativo si ya venció). null si el producto no vence. */
  daysToExpire: number | null;
  severity: ExpirationSeverity;
  /** true si el producto está vencido o próximo a vencer dentro del umbral. */
  needsAttention: boolean;
  /** Etiqueta corta para mostrar en la UI (ej. "Vence en 3 días"). */
  label: string;
}

/**
 * Cuenta los días completos entre hoy y la fecha de vencimiento.
 * Compara a nivel de fecha (ignora la hora) para evitar desfases por zona horaria.
 */
function diffInDays(expirationDate: Date): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(
    expirationDate.getFullYear(),
    expirationDate.getMonth(),
    expirationDate.getDate()
  );
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Calcula el estado de vencimiento de un producto.
 */
export function getExpirationInfo(product: Pick<Product, 'expiration_date'>): ExpirationInfo {
  if (!product.expiration_date) {
    return { daysToExpire: null, severity: 'none', needsAttention: false, label: '' };
  }

  const daysToExpire = diffInDays(new Date(product.expiration_date));

  if (daysToExpire < 0) {
    return {
      daysToExpire,
      severity: 'expired',
      needsAttention: true,
      label: 'Vencido',
    };
  }

  if (daysToExpire === 0) {
    return {
      daysToExpire,
      severity: 'critical',
      needsAttention: true,
      label: 'Vence hoy',
    };
  }

  if (daysToExpire <= EXPIRATION_WARNING_DAYS) {
    // "critical" cuando quedan 7 días o menos, "warning" para el resto del umbral.
    const severity: ExpirationSeverity = daysToExpire <= 7 ? 'critical' : 'warning';
    return {
      daysToExpire,
      severity,
      needsAttention: true,
      label: `Vence en ${daysToExpire} día${daysToExpire === 1 ? '' : 's'}`,
    };
  }

  return {
    daysToExpire,
    severity: 'ok',
    needsAttention: false,
    label: `Vence en ${daysToExpire} días`,
  };
}

/**
 * Filtra y ordena los productos que requieren atención por vencimiento
 * (vencidos o próximos a vencer dentro del umbral). Los más urgentes primero.
 */
export function filterExpiringProducts<T extends Pick<Product, 'expiration_date'>>(
  products: T[]
): T[] {
  return products
    .filter((p) => getExpirationInfo(p).needsAttention)
    .sort((a, b) => {
      const da = getExpirationInfo(a).daysToExpire ?? Infinity;
      const db = getExpirationInfo(b).daysToExpire ?? Infinity;
      return da - db;
    });
}

/**
 * Verifica si un producto ya tiene una oferta activa por vencimiento vigente.
 */
function hasActiveExpirationOffer(productId: string, offers: Offer[]): boolean {
  const now = new Date();
  return offers.some(
    (offer) =>
      offer.product_id === productId &&
      offer.reason === 'proximoAVencer' &&
      Boolean(offer.is_active) &&
      new Date(offer.end_date) >= now
  );
}

export interface AutoOfferResult {
  created: number;
  skipped: number;
  products: string[];
}

/**
 * Crea promociones automáticas para los productos próximos a vencer que aún
 * no tengan una oferta por vencimiento vigente. Idempotente: no duplica ofertas.
 *
 * @param discount Porcentaje de descuento a aplicar (por defecto AUTO_OFFER_DISCOUNT).
 */
export async function createAutoExpirationOffers(
  getToken: GetTokenFn,
  discount: number = AUTO_OFFER_DISCOUNT
): Promise<AutoOfferResult> {
  const [products, offers] = await Promise.all([getProducts(getToken), getOffers(getToken)]);

  const expiring = filterExpiringProducts(products).filter((p) => {
    // Solo productos con stock disponible y que aún no han vencido tienen sentido en promoción.
    const info = getExpirationInfo(p);
    return (p as Product).stock > 0 && info.severity !== 'expired';
  }) as Product[];

  const result: AutoOfferResult = { created: 0, skipped: 0, products: [] };

  for (const product of expiring) {
    if (hasActiveExpirationOffer(product.id, offers)) {
      result.skipped++;
      continue;
    }

    try {
      await createOffer(
        {
          product_id: product.id,
          discount_percentage: discount,
          start_date: new Date().toISOString(),
          end_date: new Date(product.expiration_date!).toISOString(),
          is_active: 1,
          reason: 'proximoAVencer',
        },
        getToken
      );
      result.created++;
      result.products.push(product.name);
    } catch (error) {
      console.error(`Error creando oferta automática para ${product.name}:`, error);
      result.skipped++;
    }
  }

  return result;
}
