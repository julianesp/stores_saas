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
 * Después del trial, solo quienes paguen el addon
 */
export function hasAIAccess(userProfile: UserProfile): boolean {
  // Durante el período de prueba, acceso gratis a IA
  if (userProfile.subscription_status === 'trial') {
    return true;
  }

  // Con suscripción activa, solo si tienen el addon
  if (userProfile.subscription_status === 'active') {
    return userProfile.has_ai_addon === true;
  }

  // Sin suscripción válida, sin acceso
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

    // Si es el addon de IA, activar la bandera
    if (planId === 'ai-addon-monthly') {
      updates.has_ai_addon = true;
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
