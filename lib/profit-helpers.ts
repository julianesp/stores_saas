// Cálculo de ganancia (venta − costo) a partir de las ventas y sus items.
//
// Fuente de verdad única para el cálculo de rentabilidad, usada tanto por la
// tarjeta "Ganancia de hoy" del dashboard como por la página de detalle en
// /dashboard/rentabilidad. El costo se estima con el precio de costo ACTUAL de
// cada producto (no se guarda un costo histórico por venta).

import type { Product } from './cloudflare-api';

// Campos mínimos de un item de venta que necesita el cálculo de ganancia.
// Se define estructuralmente para aceptar tanto el SaleItem de cloudflare-api
// como el de lib/types (difieren en campos que aquí no se usan, p. ej. tenant_id).
export interface ProfitSaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  subtotal?: number;
}

/**
 * Costo estimado de un item vendido, usando el costo ACTUAL del producto.
 * Para productos que se venden por unidad suelta (ej. huevos de una cubeta),
 * si el precio del item coincide con el precio por unidad, se prorratea el
 * costo del paquete entre sus unidades.
 */
export function getItemCost(item: ProfitSaleItem, product?: Product): number {
  if (!product) return 0;
  const cost = product.cost_price || 0;
  if (
    product.sell_by_unit &&
    product.units_per_package &&
    product.units_per_package > 0 &&
    product.price_per_unit &&
    Math.abs(item.unit_price - product.price_per_unit) < 0.01
  ) {
    return (cost / product.units_per_package) * item.quantity;
  }
  return cost * item.quantity;
}

/** Ingresos reales de un item (subtotal si existe, si no lo calcula). */
export function getItemRevenue(item: ProfitSaleItem): number {
  if (typeof item.subtotal === 'number') return item.subtotal;
  return item.unit_price * item.quantity - (item.discount || 0);
}

/** Inicio del día local de una fecha */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export interface ProfitSummary {
  revenue: number; // Ingresos (lo que entró por las ventas)
  cost: number; // Costo estimado de la mercancía vendida
  profit: number; // Ganancia neta (revenue − cost)
  margin: number; // Margen en % sobre los ingresos
}

/**
 * Suma ingresos, costo y ganancia de un conjunto de ventas (que ya traen items),
 * cruzando cada item con su producto para obtener el costo.
 */
export function computeProfit(
  sales: Array<{ items?: ProfitSaleItem[] }>,
  productsById: Map<string, Product>
): ProfitSummary {
  let revenue = 0;
  let cost = 0;

  for (const sale of sales) {
    for (const item of sale.items || []) {
      const product = productsById.get(item.product_id);
      revenue += getItemRevenue(item);
      cost += getItemCost(item, product);
    }
  }

  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  return { revenue, cost, profit, margin };
}
