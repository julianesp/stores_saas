import {
  getAllDocuments,
  queryDocuments,
} from './firestore-helpers';
import { Sale, SaleItem, Product } from './types';

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
export async function analyzeProductSales(daysToAnalyze: number = 30): Promise<ProductAnalytics[]> {
  try {
    // Obtener todas las ventas de los últimos N días
    const allSales = await getAllDocuments('sales') as Sale[];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToAnalyze);

    // Filtrar ventas del período
    const recentSales = allSales.filter(sale => {
      const saleDate = (sale.created_at as any)?.toDate
        ? (sale.created_at as any).toDate()
        : new Date(sale.created_at);
      return saleDate >= cutoffDate && sale.status === 'completada';
    });

    // Obtener todos los items de venta
    const allSaleItems = await getAllDocuments('sale_items') as SaleItem[];

    // Obtener todos los productos
    const allProducts = await getAllDocuments('products') as Product[];
    const productsMap = new Map(allProducts.map(p => [p.id, p]));

    // Filtrar items de las ventas recientes
    const recentSaleIds = new Set(recentSales.map(s => s.id));
    const recentSaleItems = allSaleItems.filter(item => recentSaleIds.has(item.sale_id));

    // Agrupar items por producto
    const productSalesMap = new Map<string, {
      items: SaleItem[];
      last_7_days: SaleItem[];
      last_30_days: SaleItem[];
    }>();

    const now = new Date();
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    recentSaleItems.forEach(item => {
      if (!productSalesMap.has(item.product_id)) {
        productSalesMap.set(item.product_id, {
          items: [],
          last_7_days: [],
          last_30_days: [],
        });
      }

      const data = productSalesMap.get(item.product_id)!;
      data.items.push(item);

      // Obtener fecha de la venta
      const sale = recentSales.find(s => s.id === item.sale_id);
      if (sale) {
        const saleDate = (sale.created_at as any)?.toDate
          ? (sale.created_at as any).toDate()
          : new Date(sale.created_at);

        if (saleDate >= last7Days) {
          data.last_7_days.push(item);
        }
        if (saleDate >= last30Days) {
          data.last_30_days.push(item);
        }
      }
    });

    // Generar análisis para cada producto
    const analytics: ProductAnalytics[] = [];

    productSalesMap.forEach((data, productId) => {
      const product = productsMap.get(productId);
      if (!product) return;

      const totalQuantitySold = data.items.reduce((sum, item) => sum + item.quantity, 0);
      const totalRevenue = data.items.reduce((sum, item) => sum + item.subtotal, 0);
      const salesCount = data.items.length;
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
      const last7DaysSales = data.last_7_days.reduce((sum, item) => sum + item.quantity, 0);
      const last30DaysSales = data.last_30_days.reduce((sum, item) => sum + item.quantity, 0);

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
export async function getTopSellingProducts(limit: number = 10): Promise<ProductAnalytics[]> {
  const analytics = await analyzeProductSales(30);
  return analytics.slice(0, limit);
}

/**
 * Obtiene productos en riesgo de agotarse
 */
export async function getProductsAtRisk(): Promise<ProductAnalytics[]> {
  const analytics = await analyzeProductSales(30);
  return analytics.filter(p => p.risk_level === 'critical' || p.risk_level === 'warning');
}

/**
 * Obtiene productos que necesitan pedirse urgentemente
 */
export async function getProductsToOrder(): Promise<ProductAnalytics[]> {
  const analytics = await analyzeProductSales(30);
  return analytics.filter(p => p.recommended_order_quantity > 0);
}
