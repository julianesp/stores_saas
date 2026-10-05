import { UserProfile } from './types';
import { hasStoreAccess } from './cloudflare-subscription-helpers';

/**
 * Verifica si un usuario tiene acceso a la funcionalidad de Tienda Online
 *
 * La Tienda Online es el único complemento de pago ($14.900/mes). El resto de
 * funcionalidades (incluidos IA y Email Marketing) van en el plan base.
 *
 * Reglas:
 * - Durante el período de prueba (30 días): ACCESO COMPLETO ✅
 * - Con suscripción activa + complemento de tienda: ACCESO COMPLETO ✅
 * - Con suscripción activa SIN el complemento: SIN ACCESO ❌
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

    if (userProfile.subscription_status === 'active') {
      return {
        hasAccess: false,
        reason: 'basic_plan',
        message: 'La Tienda Online es un complemento aparte. Actívalo por $14.900/mes.',
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
      message: 'Acceso incluido en tu prueba gratuita de 30 días',
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
        title: '🏪 Activa tu Tienda Online',
        html: `
          <p class="text-lg mb-4">
            La <strong>Tienda Online</strong> es un complemento opcional de <strong>$14.900/mes</strong> que se suma a tu plan.
          </p>
          <p class="text-gray-600">
            Al activarla obtienes:
          </p>
          <ul class="text-left text-gray-700 mt-2 space-y-1">
            <li>✅ Tienda online personalizable (vende 24/7)</li>
            <li>✅ Catálogo público con búsqueda y categorías</li>
            <li>✅ Pago por Nequi (QR) con comprobante en PDF</li>
            <li>✅ Pedidos recibidos por WhatsApp y Telegram</li>
            <li>✅ Zonas de envío configurables</li>
          </ul>
          <p class="mt-4 text-sm text-gray-500">
            Actívala desde la sección de Suscripción.
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
        title: '🏪 Tienda Online',
        html: `
          <p class="text-lg mb-4">
            Necesitas una <strong>suscripción activa</strong> y el complemento de <strong>Tienda Online</strong> ($14.900/mes) para vender en línea. Durante la <strong>prueba gratuita de 30 días</strong> está incluido sin costo.
          </p>
          <p class="text-gray-600">
            Activa tu suscripción para empezar.
          </p>
        `,
      };
  }
}
