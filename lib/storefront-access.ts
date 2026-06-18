import { UserProfile } from './types';
import { hasStoreAccess } from './cloudflare-subscription-helpers';

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

  // Usar la función hasStoreAccess que verifica correctamente el estado
  const hasAccess = hasStoreAccess(userProfile);

  if (!hasAccess) {
    // Determinar la razón del bloqueo
    if (userProfile.subscription_status === 'expired') {
      return {
        hasAccess: false,
        reason: 'expired',
        message: 'Tu suscripción ha expirado. Renueva para acceder a la Tienda Online.',
      };
    }

    if (userProfile.subscription_status === 'active' && userProfile.plan_id === 'plan-basico') {
      return {
        hasAccess: false,
        reason: 'basic_plan',
        message: 'La Tienda Online solo está disponible con el Plan Premium',
      };
    }

    return {
      hasAccess: false,
      reason: 'no_subscription',
      message: 'Necesitas una suscripción activa para acceder a la Tienda Online',
    };
  }

  // Tiene acceso - determinar la razón
  if (userProfile.is_superadmin) {
    return {
      hasAccess: true,
      reason: 'premium',
    };
  }

  if (userProfile.subscription_status === 'trial') {
    return {
      hasAccess: true,
      reason: 'trial',
      message: 'Acceso incluido en tu prueba gratuita de 15 días',
    };
  }

  if (userProfile.subscription_status === 'active' && userProfile.plan_id === 'plan-premium') {
    return {
      hasAccess: true,
      reason: 'premium',
      message: 'Tienda Online incluida en tu Plan Premium',
    };
  }

  // Caso por defecto con acceso
  return {
    hasAccess: true,
    reason: 'premium',
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
            La <strong>Tienda Online</strong> y el <strong>Análisis con IA</strong> solo están disponibles con el <strong>Plan Premium</strong> y durante los <strong>15 días de prueba gratuita</strong>.
          </p>
          <p class="text-gray-600">
            Con el Plan Premium obtienes:
          </p>
          <ul class="text-left text-gray-700 mt-2 space-y-1">
            <li>✅ Tienda online personalizable (vende 24/7)</li>
            <li>✅ Análisis con Inteligencia Artificial</li>
            <li>✅ Múltiples métodos de pago (Wompi, Nequi, PSE, tarjetas)</li>
            <li>✅ Reportes avanzados y exportables</li>
            <li>✅ Zonas de envío configurables</li>
            <li>✅ Soporte prioritario</li>
          </ul>
          <p class="mt-4 text-sm text-gray-500">
            ¿Quieres acceder a estas funcionalidades? Actualiza tu plan ahora.
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
        title: '🏪 Tienda Online + IA - Premium',
        html: `
          <p class="text-lg mb-4">
            El acceso a la <strong>Tienda Online</strong> y <strong>Análisis con IA</strong> solo está disponible con el <strong>Plan Premium</strong> y durante los <strong>15 días de prueba gratuita</strong>.
          </p>
          <p class="text-gray-600">
            Adquiere el Plan Premium para acceder a todas estas funcionalidades.
          </p>
        `,
      };
  }
}
