import { LoyaltySettings, LoyaltyTier } from './types';
import { queryDocuments, createDocument, updateDocument, getDocumentById } from './firestore-helpers';

/**
 * Niveles de puntos por defecto
 */
const DEFAULT_TIERS: LoyaltyTier[] = [
  { min_amount: 0, max_amount: 19999, points: 0, name: 'Sin puntos' },
  { min_amount: 20000, max_amount: 49999, points: 5, name: 'Compra pequeña' },
  { min_amount: 50000, max_amount: 99999, points: 10, name: 'Compra mediana' },
  { min_amount: 100000, max_amount: 199999, points: 25, name: 'Compra grande' },
  { min_amount: 200000, max_amount: 499999, points: 50, name: 'Compra muy grande' },
  { min_amount: 500000, max_amount: Infinity, points: 100, name: 'Compra premium' },
];

/**
 * Constantes para el sistema de recompensas
 */
export const REWARD_CONSTANTS = {
  POINTS_FOR_DISCOUNT: 100, // Puntos necesarios para canjear descuento
  DISCOUNT_PERCENTAGE: 10,   // Porcentaje de descuento (10%)
};

/**
 * Obtiene la configuración de lealtad del usuario actual
 */
export async function getLoyaltySettings(userProfileId: string): Promise<LoyaltySettings> {
  try {
    const settings = await queryDocuments('loyalty_settings', [
      { field: 'user_profile_id', operator: '==', value: userProfileId }
    ]);

    if (settings.length > 0) {
      return settings[0] as LoyaltySettings;
    }

    // Si no existe, crear configuración por defecto
    const defaultSettings = await createDocument('loyalty_settings', {
      user_profile_id: userProfileId,
      enabled: true,
      tiers: DEFAULT_TIERS,
    });

    return defaultSettings as any as LoyaltySettings;
  } catch (error) {
    console.error('Error getting loyalty settings:', error);
    // TEMPORAL: Devolver configuración por defecto si falla
    return {
      id: 'default',
      user_profile_id: userProfileId,
      enabled: false, // Deshabilitado por defecto hasta configurar Firebase
      tiers: DEFAULT_TIERS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

/**
 * Actualiza la configuración de lealtad
 */
export async function updateLoyaltySettings(
  settingsId: string,
  data: Partial<LoyaltySettings>
): Promise<void> {
  try {
    await updateDocument('loyalty_settings', settingsId, data);
  } catch (error) {
    console.error('Error updating loyalty settings:', error);
    throw error;
  }
}

/**
 * Calcula los puntos que debería ganar un cliente según el monto de la compra
 * NOTA: Temporalmente usa tiers por defecto mientras migramos loyalty_settings a Cloudflare
 */
export async function calculatePointsForPurchase(
  userProfileId: string,
  purchaseAmount: number
): Promise<number> {
  try {
    // Usar tiers por defecto directamente (sistema siempre habilitado)
    // TODO: Migrar loyalty_settings a Cloudflare para configuración personalizada
    const tiers = DEFAULT_TIERS;

    // Buscar el tier correspondiente al monto
    const tier = tiers.find(
      (t) => purchaseAmount >= t.min_amount && purchaseAmount <= t.max_amount
    );

    return tier ? tier.points : 0;
  } catch (error) {
    console.error('Error calculating points:', error);
    return 0;
  }
}

/**
 * Asigna puntos a un cliente
 */
export async function addPointsToCustomer(
  customerId: string,
  pointsToAdd: number,
  getToken: any
): Promise<void> {
  try {
    const { getCustomerById, updateCustomer } = await import('./cloudflare-api');

    const customer = await getCustomerById(customerId, getToken) as any;
    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

    const currentPoints = customer.loyalty_points || 0;
    const newPoints = currentPoints + pointsToAdd;

    await updateCustomer(customerId, {
      loyalty_points: newPoints,
    }, getToken);
  } catch (error) {
    console.error('Error adding points to customer:', error);
    throw error;
  }
}

/**
 * Obtiene el historial de compras de un cliente con detalles
 */
export async function getCustomerPurchaseHistory(customerId: string, getToken: any) {
  try {
    const { getSales, getProducts } = await import('./cloudflare-api');

    // Obtener todas las ventas (que ya incluyen los items)
    const allSales = await getSales(getToken) as any[];

    // Filtrar solo las ventas de este cliente
    const customerSales = allSales.filter((sale: any) => sale.customer_id === customerId);

    // Obtener todos los productos para hacer lookup más rápido
    const allProducts = await getProducts(getToken) as any[];
    const productsMap = new Map(allProducts.map(p => [p.id, p]));

    // Mapear las ventas con la información de productos
    const salesWithDetails = customerSales.map((sale: any) => {
      // Para cada item de la venta, agregar la información del producto
      const itemsWithProducts = (sale.items || []).map((item: any) => ({
        ...item,
        product: productsMap.get(item.product_id),
      }));

      return {
        sale_id: sale.id,
        sale_number: sale.sale_number,
        date: sale.created_at || new Date().toISOString(),
        items: itemsWithProducts,
        total: sale.total,
        points_earned: sale.points_earned || 0,
        payment_method: sale.payment_method,
      };
    });

    // Ordenar por fecha descendente (más reciente primero)
    salesWithDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return salesWithDetails;
  } catch (error) {
    console.error('Error getting purchase history:', error);
    return [];
  }
}

/**
 * Verifica si un cliente puede canjear puntos por descuento
 */
export async function canRedeemDiscount(customerId: string, getToken: any): Promise<boolean> {
  try {
    const { getCustomerById } = await import('./cloudflare-api');

    const customer = await getCustomerById(customerId, getToken) as any;
    if (!customer) return false;

    const currentPoints = customer.loyalty_points || 0;
    return currentPoints >= REWARD_CONSTANTS.POINTS_FOR_DISCOUNT;
  } catch (error) {
    console.error('Error checking discount eligibility:', error);
    return false;
  }
}

/**
 * Canjea puntos por un descuento y devuelve el monto del descuento
 */
export async function redeemPointsForDiscount(
  customerId: string,
  purchaseAmount: number,
  getToken: any
): Promise<{ discount: number; pointsRedeemed: number }> {
  try {
    const { getCustomerById, updateCustomer } = await import('./cloudflare-api');

    const customer = await getCustomerById(customerId, getToken) as any;
    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

    const currentPoints = customer.loyalty_points || 0;

    if (currentPoints < REWARD_CONSTANTS.POINTS_FOR_DISCOUNT) {
      throw new Error('Puntos insuficientes para canjear descuento');
    }

    // Calcular descuento (10% del total)
    const discount = Math.round(purchaseAmount * (REWARD_CONSTANTS.DISCOUNT_PERCENTAGE / 100));

    // Descontar puntos
    const newPoints = currentPoints - REWARD_CONSTANTS.POINTS_FOR_DISCOUNT;
    await updateCustomer(customerId, {
      loyalty_points: newPoints,
    }, getToken);

    return {
      discount,
      pointsRedeemed: REWARD_CONSTANTS.POINTS_FOR_DISCOUNT,
    };
  } catch (error) {
    console.error('Error redeeming points:', error);
    throw error;
  }
}

/**
 * Obtiene el mensaje de notificación basado en los puntos ganados
 */
export function getPointsMilestoneMessage(pointsEarned: number): string | null {
  if (pointsEarned >= 100) {
    return '¡Felicidades! Ganaste 100 puntos o más. Ya puedes canjear un descuento del 10% en tu próxima compra.';
  } else if (pointsEarned >= 50) {
    return '¡Excelente compra! Ganaste 50 puntos o más. Sigue así para alcanzar 100 puntos y obtener un descuento del 10%.';
  } else if (pointsEarned >= 25) {
    return '¡Gran compra! Ganaste 25 puntos o más. Acumula 100 puntos para obtener un descuento del 10%.';
  } else if (pointsEarned >= 10) {
    return '¡Buen trabajo! Ganaste 10 puntos o más. Recuerda que con 100 puntos obtienes un descuento del 10%.';
  } else if (pointsEarned >= 5) {
    return '¡Genial! Ganaste puntos. Sigue comprando para acumular 100 puntos y obtener un descuento del 10%.';
  }
  return null;
}
