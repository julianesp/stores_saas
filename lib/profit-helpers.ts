// Cálculo de ganancia (venta − costo) a partir de las ventas y sus items.
//
// Fuente de verdad única para el cálculo de rentabilidad, usada tanto por la
// tarjeta "Ganancia de hoy" del dashboard como por la página de detalle en
// /dashboard/rentabilidad. El costo se estima con el precio de costo ACTUAL de
// cada producto (no se guarda un costo histórico por venta).

import type { Product } from './cloudflare-api';
import { isProductActive, tracksInventory } from './types';
import type { PurchaseOrderWithItems } from './types';

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

// ── Inversión en mercancía ──
// Cuánta plata tiene el tendero metida en lo que hay en bodega (stock × costo)
// y cuánto le quedaría si lo vende todo al precio de venta actual.

export interface InventoryInvestmentRow {
  product: Product;
  units: number; // Stock disponible (en paquetes si se vende por unidad suelta)
  invested: number; // units × costo
  expectedRevenue: number; // units × precio de venta
  expectedProfit: number; // expectedRevenue − invested
}

export interface InventoryInvestment {
  rows: InventoryInvestmentRow[]; // Productos con stock y costo, de mayor a menor inversión
  invested: number;
  expectedRevenue: number;
  expectedProfit: number;
  markup: number; // % de ganancia sobre lo invertido
  withoutCost: { count: number; saleValue: number }; // Con stock pero sin costo registrado
}

/**
 * Inversión actual en inventario y la ganancia esperada al venderlo todo.
 * Solo cuenta productos activos que controlan inventario y tienen stock.
 * Los que no tienen costo registrado se reportan aparte: sumarlos inflaría la
 * ganancia (parecería que no costaron nada).
 */
export function computeInventoryInvestment(products: Product[]): InventoryInvestment {
  const rows: InventoryInvestmentRow[] = [];
  const withoutCost = { count: 0, saleValue: 0 };

  for (const product of products) {
    if (!isProductActive(product) || !tracksInventory(product)) continue;
    const units = product.stock || 0;
    if (units <= 0) continue;

    const expectedRevenue = units * (product.sale_price || 0);
    const cost = product.cost_price || 0;
    if (cost <= 0) {
      withoutCost.count += 1;
      withoutCost.saleValue += expectedRevenue;
      continue;
    }

    const invested = units * cost;
    rows.push({
      product,
      units,
      invested,
      expectedRevenue,
      expectedProfit: expectedRevenue - invested,
    });
  }

  rows.sort((a, b) => b.invested - a.invested);
  const invested = rows.reduce((sum, r) => sum + r.invested, 0);
  const expectedRevenue = rows.reduce((sum, r) => sum + r.expectedRevenue, 0);
  const expectedProfit = expectedRevenue - invested;
  const markup = invested > 0 ? (expectedProfit / invested) * 100 : 0;

  return { rows, invested, expectedRevenue, expectedProfit, markup, withoutCost };
}

export interface PurchasePlan {
  invested: number; // Lo que se paga al proveedor
  revenue: number; // Lo que entra si se vende todo
  profit: number; // revenue − invested
  markup: number; // % de ganancia sobre lo invertido
  margin: number; // % de ganancia sobre lo vendido
}

/** Simula una compra: cuánto se invierte y cuánto se gana al venderla toda. */
export function computePurchasePlan(
  unitCost: number,
  units: number,
  unitSalePrice: number
): PurchasePlan {
  const invested = Math.max(0, unitCost) * Math.max(0, units);
  const revenue = Math.max(0, unitSalePrice) * Math.max(0, units);
  const profit = revenue - invested;
  return {
    invested,
    revenue,
    profit,
    markup: invested > 0 ? (profit / invested) * 100 : 0,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
  };
}

/** Precio de venta que deja un % de ganancia sobre el costo (redondeado a $50). */
export function salePriceForMarkup(unitCost: number, markupPct: number): number {
  const price = unitCost * (1 + markupPct / 100);
  return Math.ceil(price / 50) * 50;
}

// ── Facturas de compra a proveedores ──
// Por cada compra: lo que se pagó y lo que entraría al vender esa mercancía a
// los precios de venta ACTUALES de cada producto.

export interface PurchaseInvoiceLine {
  productId: string;
  name: string;
  quantity: number;
  unitCost: number;
  invested: number; // quantity × unitCost
  unitSalePrice: number | null; // null si el producto ya no existe o no tiene precio
  expectedRevenue: number;
  expectedProfit: number | null;
}

export interface PurchaseInvoice {
  order: PurchaseOrderWithItems;
  supplierName: string;
  lines: PurchaseInvoiceLine[];
  invested: number; // Total pagado (incluye impuestos de la factura)
  expectedRevenue: number;
  expectedProfit: number;
  markup: number; // % de ganancia sobre lo invertido
  linesWithoutPrice: number; // Productos sin precio de venta: no suman a lo que entra
}

export function computePurchaseInvoices(
  orders: PurchaseOrderWithItems[],
  productsById: Map<string, Product>
): PurchaseInvoice[] {
  return orders
    .filter((o) => o.status !== 'cancelada')
    .map((order) => {
      let linesWithoutPrice = 0;
      const lines: PurchaseInvoiceLine[] = (order.items || []).map((item) => {
        const product = productsById.get(item.product_id);
        const invested = item.subtotal ?? item.quantity * item.unit_cost;
        const unitSalePrice =
          product && product.sale_price > 0 ? product.sale_price : null;
        if (unitSalePrice === null) linesWithoutPrice += 1;
        const expectedRevenue = unitSalePrice === null ? 0 : unitSalePrice * item.quantity;
        return {
          productId: item.product_id,
          name: product?.name || item.product_name || 'Producto eliminado',
          quantity: item.quantity,
          unitCost: item.unit_cost,
          invested,
          unitSalePrice,
          expectedRevenue,
          expectedProfit: unitSalePrice === null ? null : expectedRevenue - invested,
        };
      });

      const itemsTotal = lines.reduce((sum, l) => sum + l.invested, 0);
      const invested = order.total || itemsTotal;
      const expectedRevenue = lines.reduce((sum, l) => sum + l.expectedRevenue, 0);
      const expectedProfit = expectedRevenue - invested;

      return {
        order,
        supplierName: order.supplier?.name || 'Proveedor',
        lines,
        invested,
        expectedRevenue,
        expectedProfit,
        markup: invested > 0 ? (expectedProfit / invested) * 100 : 0,
        linesWithoutPrice,
      };
    })
    .sort(
      (a, b) => new Date(b.order.order_date).getTime() - new Date(a.order.order_date).getTime()
    );
}
