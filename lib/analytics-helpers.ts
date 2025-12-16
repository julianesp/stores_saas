import type { GetTokenFn } from './cloudflare-api';
import { getSales, getProducts } from './cloudflare-api';
import type { Sale, Product } from './cloudflare-api';

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
export async function analyzeProductSales(daysToAnalyze: number = 30, getToken: GetTokenFn): Promise<ProductAnalytics[]> {
  try {
    // Obtener todas las ventas de los últimos N días
    const allSales = await getSales(getToken);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToAnalyze);

    // Filtrar ventas del período
    const recentSales = allSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= cutoffDate && sale.status === 'completada';
    });

    // Obtener todos los productos
    const allProducts = await getProducts(getToken);
    const productsMap = new Map(allProducts.map(p => [p.id, p]));

    // Agrupar ventas por producto
    const productSalesMap = new Map<string, {
      quantities: number[];
      revenues: number[];
      salesIds: Set<string>;
      last7DaysSales: number;
      last30DaysSales: number;
    }>();

    // Fechas para análisis de últimos 7 y 30 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Procesar las ventas
    for (const sale of recentSales) {
      if (!sale.items) continue;

      const saleDate = new Date(sale.created_at);

      for (const item of sale.items) {
        const productId = item.product_id;

        if (!productSalesMap.has(productId)) {
          productSalesMap.set(productId, {
            quantities: [],
            revenues: [],
            salesIds: new Set(),
            last7DaysSales: 0,
            last30DaysSales: 0,
          });
        }

        const productData = productSalesMap.get(productId)!;
        productData.quantities.push(item.quantity);
        productData.revenues.push(item.subtotal);
        productData.salesIds.add(sale.id);

        // Contador de últimos 7 y 30 días
        if (saleDate >= sevenDaysAgo) {
          productData.last7DaysSales += item.quantity;
        }
        if (saleDate >= thirtyDaysAgo) {
          productData.last30DaysSales += item.quantity;
        }
      }
    }

    // Generar analytics para cada producto
    const analytics: ProductAnalytics[] = [];

    for (const [productId, data] of productSalesMap.entries()) {
      const product = productsMap.get(productId);
      if (!product) continue;

      const totalQuantitySold = data.quantities.reduce((sum, q) => sum + q, 0);
      const totalRevenue = data.revenues.reduce((sum, r) => sum + r, 0);
      const salesCount = data.salesIds.size;
      const averageSaleQuantity = salesCount > 0 ? totalQuantitySold / salesCount : 0;
      const salesVelocity = totalQuantitySold / daysToAnalyze;

      // Calcular días hasta agotamiento
      const daysUntilStockout = salesVelocity > 0
        ? Math.floor(product.stock / salesVelocity)
        : 999;

      // Recomendar cantidad de pedido (para 30 días)
      const recommendedOrderQuantity = Math.ceil(salesVelocity * 30) - product.stock;

      // Determinar tendencia
      let trend: 'high' | 'medium' | 'low' = 'low';
      if (salesVelocity >= 10) trend = 'high';
      else if (salesVelocity >= 3) trend = 'medium';

      // Determinar nivel de riesgo
      let riskLevel: 'critical' | 'warning' | 'good' = 'good';
      if (daysUntilStockout <= 7) riskLevel = 'critical';
      else if (daysUntilStockout <= 15) riskLevel = 'warning';

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
        recommended_order_quantity: Math.max(0, recommendedOrderQuantity),
        sales_velocity: Number(salesVelocity.toFixed(2)),
        trend,
        risk_level: riskLevel,
        last_30_days_sales: data.last30DaysSales,
        last_7_days_sales: data.last7DaysSales,
      });
    }

    // Ordenar por velocidad de venta descendente
    analytics.sort((a, b) => b.sales_velocity - a.sales_velocity);

    return analytics;
  } catch (error) {
    console.error('Error analyzing product sales:', error);
    return [];
  }
}
