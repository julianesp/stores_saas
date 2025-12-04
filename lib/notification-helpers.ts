import { Notification } from './types';
import { queryDocuments, getAllDocuments } from './firestore-helpers';
import { REWARD_CONSTANTS } from './loyalty-helpers';
import { checkSubscriptionStatus } from './subscription-helpers';

/**
 * Obtiene productos con stock bajo
 */
async function getLowStockNotifications(): Promise<Notification[]> {
  try {
    const products = await getAllDocuments('products') as any[];

    const lowStockProducts = products.filter(
      (p) => p.stock > 0 && p.stock <= (p.min_stock || 5)
    );

    if (lowStockProducts.length === 0) return [];

    return [{
      id: 'low-stock',
      type: 'stock',
      title: 'Stock Bajo',
      message: `${lowStockProducts.length} producto${lowStockProducts.length > 1 ? 's' : ''} con stock bajo`,
      link: '/dashboard/inventory',
      count: lowStockProducts.length,
      timestamp: new Date(),
    }];
  } catch (error) {
    console.error('Error getting low stock notifications:', error);
    return [];
  }
}

/**
 * Obtiene clientes que pueden canjear puntos
 */
async function getLoyaltyNotifications(): Promise<Notification[]> {
  try {
    const customers = await getAllDocuments('customers') as any[];

    const eligibleCustomers = customers.filter(
      (c) => (c.loyalty_points || 0) >= REWARD_CONSTANTS.POINTS_FOR_DISCOUNT
    );

    if (eligibleCustomers.length === 0) return [];

    return [{
      id: 'loyalty-eligible',
      type: 'loyalty',
      title: 'Clientes con Descuento Disponible',
      message: `${eligibleCustomers.length} cliente${eligibleCustomers.length > 1 ? 's pueden' : ' puede'} canjear descuento`,
      link: '/dashboard/customers',
      count: eligibleCustomers.length,
      timestamp: new Date(),
    }];
  } catch (error) {
    console.error('Error getting loyalty notifications:', error);
    return [];
  }
}

/**
 * Obtiene ventas importantes recientes (últimas 24 horas)
 */
async function getHighValueSalesNotifications(): Promise<Notification[]> {
  try {
    const HIGH_VALUE_THRESHOLD = 500000; // $500,000
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const sales = await getAllDocuments('sales') as any[];

    const recentHighValueSales = sales.filter((sale) => {
      const saleDate = new Date(sale.created_at);
      return (
        sale.total >= HIGH_VALUE_THRESHOLD &&
        saleDate >= twentyFourHoursAgo
      );
    });

    if (recentHighValueSales.length === 0) return [];

    return [{
      id: 'high-value-sales',
      type: 'sale',
      title: 'Ventas Importantes',
      message: `${recentHighValueSales.length} venta${recentHighValueSales.length > 1 ? 's' : ''} mayor${recentHighValueSales.length > 1 ? 'es' : ''} a $500,000 (últimas 24h)`,
      link: '/dashboard/sales',
      count: recentHighValueSales.length,
      timestamp: new Date(),
    }];
  } catch (error) {
    console.error('Error getting high value sales notifications:', error);
    return [];
  }
}

/**
 * Obtiene alertas del sistema (suscripción, etc)
 */
async function getSystemNotifications(userId: string): Promise<Notification[]> {
  try {
    const notifications: Notification[] = [];

    // Verificar estado de suscripción
    const subscriptionStatus = await checkSubscriptionStatus(userId);

    if (subscriptionStatus.status === 'trial' && subscriptionStatus.daysLeft !== undefined) {
      if (subscriptionStatus.daysLeft <= 7) {
        notifications.push({
          id: 'trial-expiring',
          type: 'system',
          title: 'Prueba Terminando',
          message: `Tu período de prueba termina en ${subscriptionStatus.daysLeft} día${subscriptionStatus.daysLeft > 1 ? 's' : ''}`,
          link: '/dashboard/subscription',
          timestamp: new Date(),
        });
      }
    }

    if (subscriptionStatus.status === 'expired') {
      notifications.push({
        id: 'subscription-expired',
        type: 'system',
        title: 'Suscripción Expirada',
        message: 'Tu suscripción ha expirado. Renueva para continuar usando el sistema.',
        link: '/dashboard/subscription',
        timestamp: new Date(),
      });
    }

    return notifications;
  } catch (error) {
    console.error('Error getting system notifications:', error);
    return [];
  }
}

/**
 * Obtiene todas las notificaciones del sistema
 */
export async function getAllNotifications(userId: string): Promise<Notification[]> {
  try {
    const [stockNotifs, loyaltyNotifs, salesNotifs, systemNotifs] = await Promise.all([
      getLowStockNotifications(),
      getLoyaltyNotifications(),
      getHighValueSalesNotifications(),
      getSystemNotifications(userId),
    ]);

    const allNotifications = [
      ...systemNotifs,
      ...stockNotifs,
      ...loyaltyNotifs,
      ...salesNotifs,
    ];

    // Ordenar por timestamp (más reciente primero)
    return allNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    console.error('Error getting all notifications:', error);
    return [];
  }
}

/**
 * Obtiene el conteo total de notificaciones
 */
export async function getNotificationCount(userId: string): Promise<number> {
  try {
    const notifications = await getAllNotifications(userId);
    return notifications.length;
  } catch (error) {
    console.error('Error getting notification count:', error);
    return 0;
  }
}
