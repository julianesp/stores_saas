import { GetTokenFn, getProducts, getSales, getCustomers } from './cloudflare-api';

export interface DashboardMetrics {
  dailySales: number;
  todayOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  activeCustomers: number;
  monthlyGrowth: number;
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

    // Calcular productos con stock bajo
    const lowStockProducts = allProducts.filter(
      p => p.stock <= p.min_stock && p.stock > 0
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
 * Obtiene los productos más vendidos
 * @param limit - Número máximo de productos a retornar
 */
export async function getTopProducts(limit: number = 4, getToken: GetTokenFn): Promise<TopProduct[]> {
  try {
    // Obtener todas las ventas (que ya incluyen los items)
    const allSales = await getSales(getToken);
    const allProducts = await getProducts(getToken);

    // Crear un mapa de productos por ID para búsqueda rápida
    const productsMap = new Map(allProducts.map(p => [p.id, p]));

    // Agrupar por producto y sumar cantidades
    const productSales = new Map<string, { name: string; quantity: number }>();

    for (const sale of allSales) {
      if (!sale.items) continue;

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

    // Productos con stock bajo
    const lowStockProducts = allProducts.filter(
      p => p.stock <= p.min_stock && p.stock > 0
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
