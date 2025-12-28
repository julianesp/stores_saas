import { UserProfile } from './types';

/**
 * Verifica si un usuario tiene acceso a la funcionalidad de Tienda Online
 *
 * Reglas:
 * - Durante el período de prueba (15 días): ACCESO COMPLETO ✅
 * - Con Plan Premium activo: ACCESO COMPLETO ✅
 * - Con Plan Básico activo: SIN ACCESO ❌
 * - Suscripción expirada: SIN ACCESO ❌
 */
export function hasStorefrontAccess(userProfile: UserProfile | null): {
  hasAccess: boolean;
  reason?: 'trial' | 'premium' | 'no_subscription' | 'basic_plan' | 'expired';
  message?: string;
} {
  if (!userProfile) {
    return {
      hasAccess: false,
      reason: 'no_subscription',
      message: 'No se pudo cargar el perfil del usuario',
    };
  }

  // Super admin siempre tiene acceso
  if (userProfile.is_superadmin) {
    return {
      hasAccess: true,
      reason: 'premium',
    };
  }

  // Durante el período de prueba, tiene acceso completo
  if (userProfile.subscription_status === 'trial') {
    return {
      hasAccess: true,
      reason: 'trial',
      message: 'Acceso incluido en tu prueba gratuita de 15 días',
    };
  }

  // Si tiene suscripción activa, verificar el plan
  if (userProfile.subscription_status === 'active') {
    // Verificar si es Plan Premium
    if (userProfile.plan_id === 'plan-premium') {
      return {
        hasAccess: true,
        reason: 'premium',
        message: 'Tienda Online incluida en tu Plan Premium',
      };
    }

    // Si es Plan Básico, no tiene acceso
    if (userProfile.plan_id === 'plan-basico') {
      return {
        hasAccess: false,
        reason: 'basic_plan',
        message: 'La Tienda Online solo está disponible con el Plan Premium',
      };
    }

    // Si tiene suscripción activa pero no se identificó el plan, dar acceso por defecto
    // (para compatibilidad con suscripciones antiguas)
    return {
      hasAccess: true,
      reason: 'premium',
    };
  }

  // Suscripción expirada o cancelada
  return {
    hasAccess: false,
    reason: 'expired',
    message: 'Tu suscripción ha expirado. Renueva para acceder a la Tienda Online.',
  };
}

/**
 * Obtiene el mensaje apropiado para mostrar cuando no hay acceso
 */
export function getStorefrontBlockMessage(reason?: string): {
  title: string;
  html: string;
} {
  switch (reason) {
    case 'basic_plan':
      return {
        title: '🏪 Tienda Online - Plan Premium',
        html: `
          <p class="text-lg mb-4">
            La <strong>Tienda Online</strong> solo está disponible con el <strong>Plan Premium</strong> y durante los <strong>15 días de prueba gratuita</strong>.
          </p>
          <p class="text-gray-600">
            Con el Plan Premium podrás:
          </p>
          <ul class="text-left text-gray-700 mt-2 space-y-1">
            <li>✅ Tener tu propia tienda online personalizable</li>
            <li>✅ Vender tus productos 24/7</li>
            <li>✅ Aceptar múltiples métodos de pago</li>
            <li>✅ Configurar zonas de envío</li>
            <li>✅ Integración con WhatsApp</li>
          </ul>
          <p class="mt-4 text-sm text-gray-500">
            ¿Quieres seguir usando este servicio? Actualiza tu plan ahora.
          </p>
        `,
      };

    case 'expired':
      return {
        title: '⚠️ Suscripción Expirada',
        html: `
          <p class="text-lg mb-4">
            Tu suscripción ha expirado. La <strong>Tienda Online</strong> solo está disponible con una suscripción activa.
          </p>
          <p class="text-gray-600">
            Renueva tu plan para continuar vendiendo en línea.
          </p>
        `,
      };

    case 'no_subscription':
    default:
      return {
        title: '🏪 Tienda Online - Premium',
        html: `
          <p class="text-lg mb-4">
            El acceso a la <strong>Tienda Online</strong> solo está disponible con el <strong>Plan Premium</strong> y durante los <strong>15 días de prueba gratuita</strong>.
          </p>
          <p class="text-gray-600">
            Si quieres seguir usando este servicio, por favor, adquiere el Plan Premium.
          </p>
        `,
      };
  }
}
