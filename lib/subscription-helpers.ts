import { UserProfile, SubscriptionStatus } from './types';
import { queryDocuments, updateDocument } from './firestore-helpers';

/**
 * Verifica el estado de suscripción de un usuario
 */
export async function checkSubscriptionStatus(
  clerkUserId: string
): Promise<SubscriptionStatus> {
  try {
    // Obtener el perfil del usuario
    const profiles = await queryDocuments('user_profiles', [
      { field: 'clerk_user_id', operator: '==', value: clerkUserId }
    ]);

    if (profiles.length === 0) {
      return {
        canAccess: false,
        status: 'expired',
      };
    }

    const userProfile = profiles[0] as UserProfile;
    const now = new Date();

    // Si está en período de prueba
    if (userProfile.subscription_status === 'trial') {
      if (!userProfile.trial_end_date) {
        // Si no tiene fecha de fin de trial, crear una con 15 días
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 15);

        await updateDocument('user_profiles', userProfile.id, {
          trial_end_date: trialEnd.toISOString()
        });

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
        await updateDocument('user_profiles', userProfile.id, {
          subscription_status: 'expired'
        });

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
          await updateDocument('user_profiles', userProfile.id, {
            subscription_status: 'expired'
          });

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
export async function initializeTrialPeriod(userProfileId: string) {
  try {
    const now = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 15); // 15 días de prueba

    await updateDocument('user_profiles', userProfileId, {
      subscription_status: 'trial',
      trial_start_date: now.toISOString(),
      trial_end_date: trialEnd.toISOString(),
    });

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

    await updateDocument('user_profiles', userProfileId, updates);

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
export async function cancelSubscription(userProfileId: string) {
  try {
    await updateDocument('user_profiles', userProfileId, {
      subscription_status: 'canceled',
    });

    return { success: true };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Obtiene el perfil de usuario por Clerk ID
 */
export async function getUserProfileByClerkId(clerkUserId: string) {
  try {
    const profiles = await queryDocuments('user_profiles', [
      { field: 'clerk_user_id', operator: '==', value: clerkUserId }
    ]);

    return profiles.length > 0 ? (profiles[0] as UserProfile) : null;
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
