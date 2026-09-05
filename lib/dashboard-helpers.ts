import { GetTokenFn, getProducts, getSales, getCustomers, Product } from './cloudflare-api';
import { computeProfit, startOfDay, ProfitSummary } from './profit-helpers';

export interface DashboardMetrics {
  dailySales: number;
  todayOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  activeCustomers: number;
  monthlyGrowth: number;
}

export interface DailyProfit extends ProfitSummary {
  /** true si al menos un producto vendido hoy no tiene costo registrado:
   *  la ganancia mostrada estaría inflada. */
  hasMissingCost: boolean;
}

export interface TopProduct {
  name: string;
  quantity: number;
}

export interface InventoryAlert {
  count: number;
  products: {
    name: string;
    stock: number;
    minStock: number;
  }[];
}

/**
 * Obtiene las métricas principales del dashboard para la tienda
 */
export async function getDashboardMetrics(getToken: GetTokenFn): Promise<DashboardMetrics> {
  try {
    // Obtener fecha de hoy y comienzo del día
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Obtener todos los productos
    const allProducts = await getProducts(getToken);
    const totalProducts = allProducts.length;

    // Calcular productos con stock bajo (incluyendo los que tienen stock 0)
    const lowStockProducts = allProducts.filter(
      p => p.stock <= p.min_stock
    ).length;

    // Obtener todas las ventas
    const allSales = await getSales(getToken);

    // Filtrar ventas de hoy que estén completadas
    const todaySales = allSales.filter(sale => {
      if (sale.status !== 'completada') return false;
      const saleDate = sale.created_at ? new Date(sale.created_at) : null;
      return saleDate && saleDate >= startOfToday;
    });

    const dailySales = todaySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const todayOrders = todaySales.length;

    // Obtener ventas del mes actual
    const thisMonthSales = allSales.filter(sale => {
      if (sale.status !== 'completada') return false;
      const saleDate = sale.created_at ? new Date(sale.created_at) : null;
      return saleDate && saleDate >= startOfMonth;
    });

    // Obtener ventas del mes pasado
    const lastMonthSales = allSales.filter(sale => {
      if (sale.status !== 'completada') return false;
      const saleDate = sale.created_at ? new Date(sale.created_at) : null;
      return saleDate && saleDate >= startOfLastMonth && saleDate <= endOfLastMonth;
    });

    const thisMonthTotal = thisMonthSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const lastMonthTotal = lastMonthSales.reduce((sum, sale) => sum + (sale.total || 0), 0);

    // Calcular crecimiento mensual
    let monthlyGrowth = 0;
    if (lastMonthTotal > 0) {
      monthlyGrowth = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
    } else if (thisMonthTotal > 0) {
      monthlyGrowth = 100; // Si no había ventas el mes pasado pero hay este mes
    }

    // Clientes que han comprado este mes (filtrando por customer_id en las ventas)
    const customerIdsThisMonth = new Set(
      thisMonthSales
        .filter(sale => sale.customer_id)
        .map(sale => sale.customer_id)
    );
    const activeCustomers = customerIdsThisMonth.size;

    return {
      dailySales,
      todayOrders,
      totalProducts,
      lowStockProducts,
      activeCustomers,
      monthlyGrowth: Number(monthlyGrowth.toFixed(1)),
    };
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    // Retornar valores por defecto en caso de error
    return {
      dailySales: 0,
      todayOrders: 0,
      totalProducts: 0,
      lowStockProducts: 0,
      activeCustomers: 0,
      monthlyGrowth: 0,
    };
  }
}

/**
 * Calcula la ganancia neta del día de hoy: ingresos de las ventas de hoy menos
 * el costo estimado de la mercancía vendida (usando el costo actual de cada
 * producto). Las ventas de /api/sales ya vienen con sus items, así que basta
 * una llamada a getSales + una a getProducts.
 */
export async function getDailyProfit(getToken: GetTokenFn): Promise<DailyProfit> {
  try {
    const [allSales, allProducts] = await Promise.all([
      getSales(getToken),
      getProducts(getToken),
    ]);

    const productsById = new Map<string, Product>();
    allProducts.forEach((p) => productsById.set(p.id, p));

    const todayStart = startOfDay(new Date());
    const todaySales = allSales.filter((sale) => {
      if (sale.status !== 'completada') return false;
      const saleDate = sale.created_at ? new Date(sale.created_at) : null;
      return saleDate && saleDate >= todayStart;
    });

    const summary = computeProfit(todaySales, productsById);

    // ¿Algún producto vendido hoy sin costo registrado? Entonces la ganancia
    // mostrada es optimista (asume costo 0 para ese producto).
    let hasMissingCost = false;
    for (const sale of todaySales) {
      for (const item of sale.items || []) {
        const product = productsById.get(item.product_id);
        if (!product || !product.cost_price || product.cost_price <= 0) {
          hasMissingCost = true;
          break;
        }
      }
      if (hasMissingCost) break;
    }

    return { ...summary, hasMissingCost };
  } catch (error) {
    console.error('Error getting daily profit:', error);
    return { revenue: 0, cost: 0, profit: 0, margin: 0, hasMissingCost: false };
  }
}

/**
 * Obtiene los productos más vendidos
 * @param limit - Número máximo de productos a retornar
 */
export async function getTopProducts(limit: number = 4, getToken: GetTokenFn): Promise<TopProduct[]> {
  try {
    // Obtener todas las ventas completadas
    const allSales = await getSales(getToken);
    const completedSales = allSales.filter(sale => sale.status === 'completada');

    // Si no hay ventas, retornar array vacío
    if (completedSales.length === 0) {
      return [];
    }

    const allProducts = await getProducts(getToken);

    // Crear un mapa de productos por ID para búsqueda rápida
    const productsMap = new Map(allProducts.map(p => [p.id, p]));

    // Obtener los items de cada venta mediante fetch individual
    const allSalesWithItems = await Promise.all(
      completedSales.map(async (sale) => {
        try {
          // Usar la ruta de Cloudflare directa
          const token = await getToken();
          const CLOUDFLARE_API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://pos-api.neneagency.workers.dev';
          const response = await fetch(`${CLOUDFLARE_API_URL}/api/sales/${sale.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
          });

          if (!response.ok) return null;
          const data = await response.json();
          return data.data;
        } catch {
          return null;
        }
      })
    );

    // Agrupar por producto y sumar cantidades
    const productSales = new Map<string, { name: string; quantity: number }>();

    for (const sale of allSalesWithItems) {
      if (!sale || !sale.items) continue;

      for (const item of sale.items) {
        const productId = item.product_id;
        const product = productsMap.get(productId);

        if (product) {
          const existing = productSales.get(productId);
          if (existing) {
            existing.quantity += item.quantity || 0;
          } else {
            productSales.set(productId, {
              name: product.name,
              quantity: item.quantity || 0,
            });
          }
        }
      }
    }

    // Convertir a array, ordenar por cantidad y tomar el top
    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);

    return topProducts;
  } catch (error) {
    console.error('Error getting top products:', error);
    return [];
  }
}

/**
 * Obtiene alertas de inventario
 */
export async function getInventoryAlerts(getToken: GetTokenFn): Promise<InventoryAlert> {
  try {
    const allProducts = await getProducts(getToken);

    // Productos con stock bajo (incluyendo los que tienen stock 0)
    const lowStockProducts = allProducts.filter(
      p => p.stock <= p.min_stock
    ).map(p => ({
      name: p.name,
      stock: p.stock,
      minStock: p.min_stock,
    }));

    return {
      count: lowStockProducts.length,
      products: lowStockProducts.slice(0, 5), // Primeros 5
    };
  } catch (error) {
    console.error('Error getting inventory alerts:', error);
    return {
      count: 0,
      products: [],
    };
  }
}

/**
 * Obtiene productos próximos a vencer
 */
export async function getExpiringProducts(getToken: GetTokenFn): Promise<number> {
  try {
    const allProducts = await getProducts(getToken);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringProducts = allProducts.filter(p => {
      if (!p.expiration_date) return false;
      const expirationDate = new Date(p.expiration_date);
      return expirationDate > now && expirationDate <= thirtyDaysFromNow;
    });

    return expiringProducts.length;
  } catch (error) {
    console.error('Error getting expiring products:', error);
    return 0;
  }
}

/**
 * Obtiene la lista de productos próximos a vencer (30 días)
 */
export async function getExpiringProductsList(getToken: GetTokenFn): Promise<Product[]> {
  try {
    const allProducts = await getProducts(getToken);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringProducts = allProducts.filter(p => {
      if (!p.expiration_date) return false;
      const expirationDate = new Date(p.expiration_date);
      return expirationDate > now && expirationDate <= thirtyDaysFromNow;
    });

    // Ordenar por fecha de vencimiento (más próximos primero)
    return expiringProducts.sort((a, b) => {
      const dateA = new Date(a.expiration_date!);
      const dateB = new Date(b.expiration_date!);
      return dateA.getTime() - dateB.getTime();
    });
  } catch (error) {
    console.error('Error getting expiring products list:', error);
    return [];
  }
}
