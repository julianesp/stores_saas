import { Notification } from './types';
import type { GetTokenFn } from './cloudflare-api';
import { getProducts, getCustomers } from './cloudflare-api';
import { getExpiringProductsList } from './dashboard-helpers';
import { getDebtorCustomers } from './cloudflare-credit-helpers';
import { REWARD_CONSTANTS } from './loyalty-helpers';
import { checkSubscriptionStatus } from './subscription-helpers';

/**
 * Obtiene productos con stock bajo
 */
async function getLowStockNotifications(getToken: GetTokenFn): Promise<Notification[]> {
  try {
    const products = await getProducts(getToken);

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
 * Obtiene productos próximos a vencer (dentro de 30 días)
 */
async function getExpirationNotifications(getToken: GetTokenFn): Promise<Notification[]> {
  try {
    const expiringProducts = await getExpiringProductsList(getToken);

    if (expiringProducts.length === 0) return [];

    return [{
      id: 'expiring-products',
      type: 'expiration',
      title: 'Productos por Vencer',
      message: `${expiringProducts.length} producto${expiringProducts.length > 1 ? 's' : ''} próximo${expiringProducts.length > 1 ? 's' : ''} a vencer`,
      link: '/dashboard/products',
      count: expiringProducts.length,
      timestamp: new Date(),
    }];
  } catch (error) {
    console.error('Error getting expiration notifications:', error);
    return [];
  }
}

/**
 * Obtiene clientes con cuentas por cobrar (deuda pendiente)
 */
async function getDebtNotifications(getToken: GetTokenFn): Promise<Notification[]> {
  try {
    const debtors = await getDebtorCustomers(getToken);

    if (debtors.length === 0) return [];

    return [{
      id: 'pending-debts',
      type: 'debt',
      title: 'Cuentas por Cobrar',
      message: `${debtors.length} cliente${debtors.length > 1 ? 's' : ''} con deuda pendiente`,
      link: '/dashboard/debtors',
      count: debtors.length,
      timestamp: new Date(),
    }];
  } catch (error) {
    console.error('Error getting debt notifications:', error);
    return [];
  }
}

/**
 * Obtiene clientes que pueden canjear puntos
 */
async function getLoyaltyNotifications(getToken: GetTokenFn): Promise<Notification[]> {
  try {
    const customers = await getCustomers(getToken);

    const eligibleCustomers = customers.filter(
      (c) => (c.loyalty_points || 0) >= REWARD_CONSTANTS.POINTS_FOR_DISCOUNT
    );

    if (eligibleCustomers.length === 0) return [];

    return [{
      id: 'loyalty-eligible',
      type: 'loyalty',
      title: 'Clientes con Descuento Disponible',
      message: `${eligibleCustomers.length} cliente${eligibleCustomers.length > 1 ? 's' : ''} puede${eligibleCustomers.length > 1 ? 'n' : ''} canjear descuento`,
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
 * Obtiene notificaciones de suscripción próxima a vencer
 */
async function getSubscriptionNotifications(getToken: GetTokenFn): Promise<Notification[]> {
  try {
    const subStatus = await checkSubscriptionStatus(getToken);

    // Si está en trial y le quedan menos de 3 días
    if (
      subStatus.status === 'trial' &&
      subStatus.daysLeft !== undefined &&
      subStatus.daysLeft <= 3
    ) {
      return [{
        id: 'trial-ending',
        type: 'subscription',
        title: 'Período de Prueba Próximo a Vencer',
        message: `Tu prueba vence en ${subStatus.daysLeft} día${subStatus.daysLeft !== 1 ? 's' : ''}`,
        link: '/dashboard/subscription',
        count: subStatus.daysLeft,
        timestamp: new Date(),
      }];
    }

    // Si la suscripción expiró
    if (subStatus.status === 'expired') {
      return [{
        id: 'subscription-expired',
        type: 'subscription',
        title: 'Suscripción Expirada',
        message: 'Tu suscripción ha expirado. Renueva para continuar usando el sistema.',
        link: '/dashboard/subscription',
        timestamp: new Date(),
      }];
    }

    return [];
  } catch (error) {
    console.error('Error getting subscription notifications:', error);
    return [];
  }
}

/**
 * Obtiene todas las notificaciones del sistema
 */
export async function getAllNotifications(getToken: GetTokenFn): Promise<Notification[]> {
  try {
    const [stockNotifs, expirationNotifs, debtNotifs, loyaltyNotifs, subNotifs] = await Promise.all([
      getLowStockNotifications(getToken),
      getExpirationNotifications(getToken),
      getDebtNotifications(getToken),
      getLoyaltyNotifications(getToken),
      getSubscriptionNotifications(getToken),
    ]);

    return [...stockNotifs, ...expirationNotifs, ...debtNotifs, ...loyaltyNotifs, ...subNotifs];
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
}
