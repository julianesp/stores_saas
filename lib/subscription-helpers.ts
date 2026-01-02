import { UserProfile, SubscriptionStatus } from './types';
import type { GetTokenFn } from './cloudflare-api';
import { getUserProfile, updateUserProfile } from './cloudflare-api';

/**
 * Verifica el estado de suscripción de un usuario
 * NOTA: Usa el token de Clerk para identificar al usuario automáticamente
 */
export async function checkSubscriptionStatus(
  getToken: GetTokenFn
): Promise<SubscriptionStatus> {
  try {
    // Obtener el perfil del usuario (identificado por el token)
    const userProfile = await getUserProfile(getToken);

    if (!userProfile) {
      return {
        canAccess: false,
        status: 'expired',
      };
    }

    const now = new Date();

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

/**
 * Obtiene el perfil de usuario por token de Clerk
 */
export async function getUserProfileByToken(getToken: GetTokenFn) {
  try {
    const profile = await getUserProfile(getToken);
    return profile || null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Obtiene el perfil de usuario por Clerk ID
 * DEPRECATED: Esta función ya no está implementada correctamente con Cloudflare.
 * Use getUserProfileByToken en su lugar.
 */
export async function getUserProfileByClerkId(clerkUserId: string): Promise<UserProfile | null> {
  console.warn('getUserProfileByClerkId is deprecated. This function no longer works with Cloudflare API.');
  return null;
}

/**
 * Verifica si un usuario tiene acceso a las funcionalidades de IA
 * Durante el período de prueba, todos tienen acceso gratis
 * Con Plan Premium activo, tienen acceso incluido
 * Plan Básico NO tiene acceso a IA
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

  // Con suscripción activa
  if (userProfile.subscription_status === 'active') {
    // Plan Premium incluye IA
    if (userProfile.plan_id === 'plan-premium') {
      return true;
    }

    // Plan Básico NO tiene acceso a IA
    if (userProfile.plan_id === 'plan-basico') {
      return false;
    }

    // Si tiene suscripción activa pero no se identificó el plan,
    // dar acceso por defecto (compatibilidad con suscripciones antiguas)
    return true;
  }

  // Sin suscripción válida, sin acceso
  return false;
}

/**
 * Verifica si un usuario tiene acceso a Email Marketing
 * Durante el período de prueba, todos tienen acceso gratis
 * Con Plan Premium activo, tienen acceso incluido
 * Plan Básico NO tiene acceso a Email Marketing
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

  // Con suscripción activa
  if (userProfile.subscription_status === 'active') {
    // Plan Premium incluye Email Marketing
    if (userProfile.plan_id === 'plan-premium') {
      return true;
    }

    // Plan Básico NO tiene acceso a Email Marketing
    if (userProfile.plan_id === 'plan-basico') {
      return false;
    }

    // Si tiene suscripción activa pero no se identificó el plan,
    // no dar acceso por defecto
    return false;
  }

  // Sin suscripción válida, sin acceso
  return false;
}
