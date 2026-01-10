import { UserProfile, SubscriptionStatus } from './types';
import { getUserProfile, updateUserProfile, type GetTokenFn } from './cloudflare-api';

/**
 * Verifica el estado de suscripción de un usuario usando Cloudflare API
 */
export async function checkSubscriptionStatus(
  getToken: GetTokenFn
): Promise<SubscriptionStatus> {
  try {
    // Obtener el perfil del usuario actual
    const userProfile = await getUserProfile(getToken);

    if (!userProfile) {
      return {
        canAccess: false,
        status: 'expired',
      };
    }

    const now = new Date();

    // Si es superadmin, siempre tiene acceso
    if (userProfile.is_superadmin) {
      return {
        canAccess: true,
        status: 'active',
      };
    }

    // Si está en período de prueba
    if (userProfile.subscription_status === 'trial') {
      if (!userProfile.trial_end_date) {
        // Si no tiene fecha de fin de trial, crear una con 15 días desde medianoche
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const trialEnd = new Date(startOfToday);
        trialEnd.setDate(trialEnd.getDate() + 15);

        await updateUserProfile(userProfile.id, {
          trial_end_date: trialEnd.toISOString()
        }, getToken);

        return {
          canAccess: true,
          status: 'trial',
          daysLeft: 15,
        };
      }

      const trialEnd = new Date(userProfile.trial_end_date);

      // Normalizar ambas fechas a medianoche para comparación precisa de días
      const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const trialEndMidnight = new Date(trialEnd.getFullYear(), trialEnd.getMonth(), trialEnd.getDate());

      // Verificar si el trial ya expiró
      if (nowMidnight > trialEndMidnight) {
        await updateUserProfile(userProfile.id, {
          subscription_status: 'expired'
        }, getToken);

        return {
          canAccess: false,
          status: 'expired',
          daysLeft: 0,
        };
      }

      // Calcular días restantes (sin incluir horas)
      const daysLeft = Math.ceil(
        (trialEndMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        canAccess: true,
        status: 'trial',
        daysLeft,
      };
    }

    // Si tiene suscripción activa
    if (userProfile.subscription_status === 'active') {
      // Verificar si la próxima fecha de pago ya pasó
      if (userProfile.next_billing_date) {
        const nextBilling = new Date(userProfile.next_billing_date);

        if (now > nextBilling) {
          // La suscripción debería renovarse, pero no lo ha hecho
          // Marcar como expirada
          await updateUserProfile(userProfile.id, {
            subscription_status: 'expired'
          }, getToken);

          return {
            canAccess: false,
            status: 'expired',
          };
        }
      }

      return {
        canAccess: true,
        status: 'active',
        nextBillingDate: userProfile.next_billing_date,
      };
    }

    // Cualquier otro estado (expired, canceled)
    return {
      canAccess: false,
      status: userProfile.subscription_status,
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return {
      canAccess: false,
      status: 'expired',
    };
  }
}

/**
 * Obtiene el perfil de usuario actual usando Cloudflare API
 */
export async function getUserProfileByClerkId(getToken: GetTokenFn) {
  try {
    const userProfile = await getUserProfile(getToken);
    return userProfile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Verifica si un usuario tiene acceso a las funcionalidades de IA
 * Durante el período de prueba, todos tienen acceso gratis
 * Después del trial, solo quienes paguen el addon de IA ($9,900 COP/mes)
 */
export function hasAIAccess(userProfile: UserProfile): boolean {
  // Super admin siempre tiene acceso
  if (userProfile.is_superadmin) {
    return true;
  }

  // Durante el período de prueba, acceso gratis a IA
  if (userProfile.subscription_status === 'trial') {
    return true;
  }

  // Con suscripción activa, verificar si tiene el addon de IA
  if (userProfile.subscription_status === 'active') {
    // Verificar si el addon está activo Y no ha expirado
    if (userProfile.has_ai_addon) {
      // Si tiene fecha de expiración, verificarla
      if (userProfile.ai_addon_expires_at) {
        const expiresAt = new Date(userProfile.ai_addon_expires_at);
        const now = new Date();
        return now < expiresAt;
      }
      // Si no tiene fecha de expiración, asumimos que está activo (legacy)
      return true;
    }
  }

  // Sin suscripción válida o addon, sin acceso
  return false;
}

/**
 * Verifica si un usuario tiene acceso a Email Marketing
 * Durante el período de prueba, todos tienen acceso gratis
 * Después del trial, solo quienes paguen el addon de Email Marketing ($4,900 COP/mes)
 */
export function hasEmailMarketingAccess(userProfile: UserProfile): boolean {
  // Super admin siempre tiene acceso
  if (userProfile.is_superadmin) {
    return true;
  }

  // Durante el período de prueba, acceso gratis a Email Marketing
  if (userProfile.subscription_status === 'trial') {
    return true;
  }

  // Con suscripción activa, verificar si tiene el addon de Email Marketing
  if (userProfile.subscription_status === 'active') {
    // Verificar si el addon está activo Y no ha expirado
    if (userProfile.has_email_addon) {
      // Si tiene fecha de expiración, verificarla
      if (userProfile.email_addon_expires_at) {
        const expiresAt = new Date(userProfile.email_addon_expires_at);
        const now = new Date();
        return now < expiresAt;
      }
      // Si no tiene fecha de expiración, asumimos que está activo (legacy)
      return true;
    }
  }

  // Sin suscripción válida o addon, sin acceso
  return false;
}

/**
 * Verifica si un usuario tiene acceso a la Tienda Online
 * Durante el período de prueba, todos tienen acceso gratis
 * Después del trial, solo quienes paguen el addon de Tienda Online ($14,900 COP/mes)
 */
export function hasStoreAccess(userProfile: UserProfile): boolean {
  // Super admin siempre tiene acceso
  if (userProfile.is_superadmin) {
    return true;
  }

  // Durante el período de prueba, acceso gratis a Tienda Online
  if (userProfile.subscription_status === 'trial') {
    return true;
  }

  // Con suscripción activa, verificar si tiene el addon de Tienda Online
  if (userProfile.subscription_status === 'active') {
    // Verificar si el addon está activo Y no ha expirado
    if (userProfile.has_store_addon) {
      // Si tiene fecha de expiración, verificarla
      if (userProfile.store_addon_expires_at) {
        const expiresAt = new Date(userProfile.store_addon_expires_at);
        const now = new Date();
        return now < expiresAt;
      }
      // Si no tiene fecha de expiración, asumimos que está activo (legacy)
      return true;
    }
  }

  // Sin suscripción válida o addon, sin acceso
  return false;
}

/**
 * Inicializa el período de prueba para un nuevo usuario
 */
export async function initializeTrialPeriod(userProfileId: string, getToken: GetTokenFn) {
  try {
    const now = new Date();
    // Normalizar a medianoche del día actual
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Agregar 15 días completos desde medianoche
    const trialEnd = new Date(startOfToday);
    trialEnd.setDate(trialEnd.getDate() + 15);

    await updateUserProfile(userProfileId, {
      subscription_status: 'trial',
      trial_start_date: startOfToday.toISOString(),
      trial_end_date: trialEnd.toISOString(),
    }, getToken);

    return {
      success: true,
      trialEndDate: trialEnd.toISOString(),
    };
  } catch (error) {
    console.error('Error initializing trial period:', error);
    throw error;
  }
}

/**
 * Activa una suscripción después de un pago exitoso
 */
export async function activateSubscription(
  userProfileId: string,
  transactionId: string,
  planId: string,
  getToken: GetTokenFn,
  paymentDate: Date = new Date()
) {
  try {
    const nextBilling = new Date(paymentDate);
    nextBilling.setMonth(nextBilling.getMonth() + 1); // Próximo mes

    const updates: any = {
      subscription_status: 'active',
      subscription_id: transactionId,
      last_payment_date: paymentDate.toISOString(),
      next_billing_date: nextBilling.toISOString(),
      plan_id: planId,
    };

    // Si es un addon específico, activarlo
    if (planId === 'addon-ai-monthly') {
      updates.has_ai_addon = true;
      updates.ai_addon_expires_at = nextBilling.toISOString();
    } else if (planId === 'addon-store-monthly') {
      updates.has_store_addon = true;
      updates.store_addon_expires_at = nextBilling.toISOString();
    } else if (planId === 'addon-email-monthly') {
      updates.has_email_addon = true;
      updates.email_addon_expires_at = nextBilling.toISOString();
    }

    await updateUserProfile(userProfileId, updates, getToken);

    return {
      success: true,
      nextBillingDate: nextBilling.toISOString(),
    };
  } catch (error) {
    console.error('Error activating subscription:', error);
    throw error;
  }
}

/**
 * Activa un addon específico después de un pago exitoso
 */
export async function activateAddon(
  userProfileId: string,
  addonType: 'ai' | 'store' | 'email',
  transactionId: string,
  getToken: GetTokenFn,
  paymentDate: Date = new Date()
) {
  try {
    const expiresAt = new Date(paymentDate);
    expiresAt.setMonth(expiresAt.getMonth() + 1); // Expira en un mes

    const updates: any = {};

    // Activar el addon correspondiente
    if (addonType === 'ai') {
      updates.has_ai_addon = true;
      updates.ai_addon_expires_at = expiresAt.toISOString();
    } else if (addonType === 'store') {
      updates.has_store_addon = true;
      updates.store_addon_expires_at = expiresAt.toISOString();
    } else if (addonType === 'email') {
      updates.has_email_addon = true;
      updates.email_addon_expires_at = expiresAt.toISOString();
    }

    await updateUserProfile(userProfileId, updates, getToken);

    return {
      success: true,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    console.error('Error activating addon:', error);
    throw error;
  }
}

/**
 * Cancela una suscripción
 */
export async function cancelSubscription(userProfileId: string, getToken: GetTokenFn) {
  try {
    await updateUserProfile(userProfileId, {
      subscription_status: 'canceled',
    }, getToken);

    return { success: true };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}
