/**
 * Analytics Helpers - Cloudflare API Version
 * Análisis inteligente de ventas usando la API de Cloudflare
 */

import { Sale, Product } from './types';
import { getProducts, getSales, type GetTokenFn } from './cloudflare-api';

export interface ProductAnalytics {
  product_id: string;
  product_name: string;
  product_barcode?: string;
  total_quantity_sold: number;
  total_revenue: number;
  sales_count: number;
  average_sale_quantity: number;
  current_stock: number;
  min_stock: number;
  days_until_stockout: number;
  recommended_order_quantity: number;
  sales_velocity: number; // Unidades por día
  trend: 'high' | 'medium' | 'low';
  risk_level: 'critical' | 'warning' | 'good';
  last_30_days_sales: number;
  last_7_days_sales: number;
}

/**
 * Analiza las ventas y genera recomendaciones inteligentes de stock
 */
export async function analyzeProductSales(
  daysToAnalyze: number = 30,
  getToken: GetTokenFn
): Promise<ProductAnalytics[]> {
  try {
    // Obtener todas las ventas
    const allSales = await getSales(getToken);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToAnalyze);

    // Filtrar ventas del período
    const recentSales = allSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= cutoffDate && sale.status === 'completada';
    });

    // Obtener todos los productos del usuario actual
    const allProducts = await getProducts(getToken);
    const productsMap = new Map(allProducts.map(p => [p.id, p]));

    // Agrupar ventas por producto
    const productSalesMap = new Map<string, {
      sales: Sale[];
      last_7_days: Sale[];
      last_30_days: Sale[];
    }>();

    const now = new Date();
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    // Procesar cada venta
    recentSales.forEach(sale => {
      // Obtener los items de esta venta
      if (!sale.items || sale.items.length === 0) return;

      const saleDate = new Date(sale.created_at);

      sale.items.forEach(item => {
        if (!productSalesMap.has(item.product_id)) {
          productSalesMap.set(item.product_id, {
            sales: [],
            last_7_days: [],
            last_30_days: [],
          });
        }

        const data = productSalesMap.get(item.product_id)!;

        // Crear una venta "virtual" para este item (para facilitar el cálculo)
        const itemSale = {
          ...sale,
          items: [item], // Solo este item
          total: item.subtotal,
        } as any;

        data.sales.push(itemSale);

        if (saleDate >= last7Days) {
          data.last_7_days.push(itemSale);
        }
        if (saleDate >= last30Days) {
          data.last_30_days.push(itemSale);
        }
      });
    });

    // Generar análisis para cada producto
    const analytics: ProductAnalytics[] = [];

    productSalesMap.forEach((data, productId) => {
      const product = productsMap.get(productId);
      if (!product) return;

      // Calcular totales
      const totalQuantitySold = data.sales.reduce((sum, sale) => {
        return sum + ((sale as any).items?.[0]?.quantity || 0);
      }, 0);

      const totalRevenue = data.sales.reduce((sum, sale) => {
        return sum + ((sale as any).items?.[0]?.subtotal || 0);
      }, 0);

      const salesCount = data.sales.length;
      const averageSaleQuantity = totalQuantitySold / salesCount;

      // Calcular velocidad de venta (unidades por día)
      const salesVelocity = totalQuantitySold / daysToAnalyze;

      // Calcular días hasta quedarse sin stock
      const daysUntilStockout = salesVelocity > 0
        ? Math.floor(product.stock / salesVelocity)
        : 9999;

      // Calcular cantidad recomendada de pedido
      // Fórmula: (velocidad de venta × 30 días) + stock mínimo - stock actual
      const recommendedOrderQuantity = Math.max(
        0,
        Math.ceil((salesVelocity * 30) + product.min_stock - product.stock)
      );

      // Determinar tendencia
      let trend: 'high' | 'medium' | 'low';
      if (salesVelocity >= 5) {
        trend = 'high';
      } else if (salesVelocity >= 1) {
        trend = 'medium';
      } else {
        trend = 'low';
      }

      // Determinar nivel de riesgo
      let riskLevel: 'critical' | 'warning' | 'good';
      if (daysUntilStockout <= 3 || product.stock <= product.min_stock) {
        riskLevel = 'critical';
      } else if (daysUntilStockout <= 7) {
        riskLevel = 'warning';
      } else {
        riskLevel = 'good';
      }

      // Ventas de los últimos períodos
      const last7DaysSales = data.last_7_days.reduce((sum, sale) => {
        return sum + ((sale as any).items?.[0]?.quantity || 0);
      }, 0);

      const last30DaysSales = data.last_30_days.reduce((sum, sale) => {
        return sum + ((sale as any).items?.[0]?.quantity || 0);
      }, 0);

      analytics.push({
        product_id: productId,
        product_name: product.name,
        product_barcode: product.barcode,
        total_quantity_sold: totalQuantitySold,
        total_revenue: totalRevenue,
        sales_count: salesCount,
        average_sale_quantity: Number(averageSaleQuantity.toFixed(2)),
        current_stock: product.stock,
        min_stock: product.min_stock,
        days_until_stockout: daysUntilStockout,
        recommended_order_quantity: recommendedOrderQuantity,
        sales_velocity: Number(salesVelocity.toFixed(2)),
        trend,
        risk_level: riskLevel,
        last_30_days_sales: last30DaysSales,
        last_7_days_sales: last7DaysSales,
      });
    });

    // Ordenar por velocidad de venta (más vendidos primero)
    analytics.sort((a, b) => b.sales_velocity - a.sales_velocity);

    return analytics;
  } catch (error) {
    console.error('Error analyzing product sales:', error);
    throw error;
  }
}

/**
 * Obtiene los productos más vendidos (top N)
 */
export async function getTopSellingProducts(
  limit: number = 10,
  getToken: GetTokenFn
): Promise<ProductAnalytics[]> {
  const analytics = await analyzeProductSales(30, getToken);
  return analytics.slice(0, limit);
}

/**
 * Obtiene productos en riesgo de agotarse
 */
export async function getProductsAtRisk(
  getToken: GetTokenFn
): Promise<ProductAnalytics[]> {
  const analytics = await analyzeProductSales(30, getToken);
  return analytics.filter(p => p.risk_level === 'critical' || p.risk_level === 'warning');
}

/**
 * Obtiene productos que necesitan pedirse urgentemente
 */
export async function getProductsToOrder(
  getToken: GetTokenFn
): Promise<ProductAnalytics[]> {
  const analytics = await analyzeProductSales(30, getToken);
  return analytics.filter(p => p.recommended_order_quantity > 0);
}
