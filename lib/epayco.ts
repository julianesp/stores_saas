import crypto from 'crypto';

// Planes de suscripción
export const SUBSCRIPTION_PLANS = [
  {
    id: 'basic-monthly',
    name: 'Plan básico',
    price: 29900,
    popular: true,
    features: [
      'Gestión completa de inventario',
      'Punto de venta (POS)',
      'Gestión de clientes',
      'Reportes y estadísticas básicas',
      'Soporte técnico por email',
      'Actualizaciones automáticas',
    ],
  },
  {
    id: 'ai-addon-monthly',
    name: 'Agregar análisis IA',
    price: 9900,
    isAddon: true,
    features: [
      'Análisis predictivo de ventas',
      'Recomendaciones inteligentes',
      'Detección de patrones de compra',
      'Optimización automática de inventario',
      'Alertas inteligentes',
      'Dashboard con insights IA',
    ],
  },
];

// Configuración de ePayco
const EPAYCO_CONFIG = {
  p_cust_id_cliente: process.env.EPAYCO_P_CUST_ID_CLIENTE!,
  p_key: process.env.EPAYCO_P_KEY!,
  publicKey: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY!,
  privateKey: process.env.EPAYCO_PRIVATE_KEY!,
  test: process.env.NEXT_PUBLIC_EPAYCO_ENV === 'test',
};

// Tipos
export interface EPaycoPaymentLink {
  success: boolean;
  checkoutUrl: string;
  referenceCode: string;
}

export interface EPaycoConfirmation {
  x_cust_id_cliente: string;
  x_ref_payco: string;
  x_id_invoice: string;
  x_transaction_id: string;
  x_amount: string;
  x_currency_code: string;
  x_transaction_date: string;
  x_transaction_state: string;
  x_approval_code: string;
  x_response: string;
  x_response_reason_text: string;
  x_signature: string;
  x_extra1?: string; // userProfileId
  x_extra2?: string; // planId
  x_extra3?: string; // hasAIAddon
}

/**
 * Genera la firma para validar la respuesta de ePayco
 * Formato según documentación: SHA256(p_cust_id_cliente^p_key^x_ref_payco^x_transaction_id^x_amount^x_currency_code)
 */
export function generateResponseSignature(
  cust_id_cliente: string,
  ref_payco: string,
  transaction_id: string,
  amount: string,
  currency: string
): string {
  const p_key = EPAYCO_CONFIG.p_key;
  const signatureString = `${cust_id_cliente}^${p_key}^${ref_payco}^${transaction_id}^${amount}^${currency}`;
  return crypto.createHash('sha256').update(signatureString).digest('hex');
}

/**
 * Verifica la firma de una confirmación de pago
 */
export function verifyEPaycoSignature(confirmation: EPaycoConfirmation): boolean {
  const expectedSignature = generateResponseSignature(
    confirmation.x_cust_id_cliente,
    confirmation.x_ref_payco,
    confirmation.x_transaction_id,
    confirmation.x_amount,
    confirmation.x_currency_code
  );

  console.log('🔐 Verificación de firma:', {
    expected: expectedSignature,
    received: confirmation.x_signature,
    match: expectedSignature === confirmation.x_signature,
  });

  return expectedSignature === confirmation.x_signature;
}

/**
 * Crea una sesión de pago con ePayco Smart Checkout v2
 */
export async function createEPaycoCheckout(
  planId: string,
  userProfileId: string,
  userEmail: string,
  userName: string,
  userPhone?: string
): Promise<EPaycoPaymentLink & { sessionId?: string }> {
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);

  if (!plan) {
    throw new Error('Plan no encontrado');
  }

  // Generar referencia única
  const referenceCode = `SUB-${userProfileId}-${Date.now()}`;

  // URL de confirmación y respuesta
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || 'https://tienda-pos.vercel.app';

  console.log('🔍 ePayco Debug:', {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
    baseUrl,
  });

  const confirmationUrl = `${baseUrl}/api/webhooks/epayco`;
  const responseUrl = `${baseUrl}/dashboard/subscription/payment-response`;

  try {
    // Paso 1: Autenticar con Apify y obtener token
    // Limpiar las keys de cualquier salto de línea o espacios
    const publicKey = EPAYCO_CONFIG.publicKey?.trim().replace(/\n/g, ''); // La PUBLIC_KEY para Apify
    const privateKey = EPAYCO_CONFIG.privateKey?.trim().replace(/\n/g, ''); // La PRIVATE_KEY

    console.log('🔐 Iniciando autenticación con ePayco Apify...');
    console.log('🔍 Debug - Public Key exists:', !!publicKey);
    console.log('🔍 Debug - Private Key exists:', !!privateKey);
    console.log('🔍 Debug - Public Key value:', publicKey);
    console.log('🔍 Debug - Private Key value:', privateKey);
    console.log('🔍 Debug - Public Key length:', publicKey?.length);
    console.log('🔍 Debug - Private Key length:', privateKey?.length);
    console.log('🔍 Debug - Public Key has newline:', publicKey?.includes('\n'));
    console.log('🔍 Debug - Private Key has newline:', privateKey?.includes('\n'));

    if (!publicKey || !privateKey) {
      console.error('❌ Faltan credenciales de ePayco');
      throw new Error('Credenciales de ePayco no configuradas correctamente');
    }

    console.log('🔍 Debug - Public Key:', publicKey.substring(0, 10) + '...');
    console.log('🔍 Debug - Private Key:', privateKey.substring(0, 10) + '...');

    const authString = Buffer.from(`${publicKey}:${privateKey}`).toString('base64');

    const authResponse = await fetch('https://apify.epayco.co/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
    });

    console.log('🔍 Auth Response Status:', authResponse.status);

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('❌ Error en autenticación ePayco:', errorText);
      console.error('❌ Status:', authResponse.status);
      console.error('❌ Headers:', Object.fromEntries(authResponse.headers.entries()));
      throw new Error(`Error de autenticación con ePayco: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    console.log('🔍 Auth Data:', authData);

    const apifyToken = authData.token;

    if (!apifyToken) {
      console.error('❌ No se recibió token de Apify');
      throw new Error('No se recibió token de autenticación de ePayco');
    }

    console.log('✓ Token de Apify obtenido:', apifyToken.substring(0, 20) + '...');

    // Paso 2: Crear sesión de checkout
    console.log('📝 Creando sesión de checkout...');

    const sessionPayload = {
      // Información básica de la transacción (snake_case según documentación oficial)
      checkout_version: "2",
      name: `Suscripción ${plan.name} - Tienda POS`,
      description: `Suscripción ${plan.name}`,
      currency: "COP",
      amount: plan.price,

      // Configuración regional
      lang: "ES",
      country: "CO",

      // URLs de confirmación y respuesta
      response: responseUrl,
      confirmation: confirmationUrl,
      method: "POST", // Método de confirmación

      // Información del comprador para autocompletar formularios
      billing: {
        email: userEmail,
        name: userName,
        ...(userPhone && {
          callingCode: "+57",
          mobilePhone: userPhone,
        }),
      },

      // Información adicional
      extras: {
        extra1: userProfileId,
        extra2: planId,
        extra3: plan.isAddon ? 'true' : 'false',
      },
    };

    console.log('📤 Request payload:', JSON.stringify(sessionPayload, null, 2));

    const sessionResponse = await fetch('https://apify.epayco.co/payment/session/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apifyToken}`,
      },
      body: JSON.stringify(sessionPayload),
    });

    console.log('🔍 Session Response Status:', sessionResponse.status);

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error('❌ Error creando sesión:', errorText);
      console.error('❌ Status:', sessionResponse.status);
      throw new Error(`Error al crear sesión de pago: ${sessionResponse.status}`);
    }

    const sessionData = await sessionResponse.json();
    console.log('🔍 Session Data completo:', JSON.stringify(sessionData, null, 2));
    console.log('🔍 Session Data keys:', Object.keys(sessionData));
    console.log('🔍 Session Data.data:', sessionData.data);
    console.log('🔍 Session Data.data keys:', sessionData.data ? Object.keys(sessionData.data) : 'N/A');

    const sessionId = sessionData.sessionId || sessionData.data?.sessionId || sessionData.data?.session_id;

    if (!sessionId) {
      console.error('❌ No se recibió sessionId');
      console.error('❌ Respuesta completa:', JSON.stringify(sessionData, null, 2));
      console.error('❌ Intenté buscar en: sessionData.sessionId, sessionData.data.sessionId, sessionData.data.session_id');

      // Si ePayco devolvió un error, incluirlo en el mensaje
      const errorDetail = sessionData.textResponse || sessionData.message || sessionData.error || 'Sin detalles';
      throw new Error(`No se recibió sessionId de ePayco. Error: ${errorDetail}. Respuesta completa: ${JSON.stringify(sessionData)}`);
    }

    console.log('✓ Sesión de checkout creada:', sessionId);

    // Retornar sessionId para abrir el checkout en el frontend
    return {
      success: true,
      checkoutUrl: '', // No se usa en Smart Checkout
      referenceCode,
      sessionId,
    };
  } catch (error) {
    console.error('❌ Error en createEPaycoCheckout:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'N/A');
    throw error;
  }
}

/**
 * Obtiene el estado de una transacción desde ePayco
 */
export async function getTransactionStatus(transactionId: string) {
  try {
    const response = await fetch(
      `https://secure.epayco.co/validation/v1/reference/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${EPAYCO_CONFIG.privateKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Error al consultar transacción');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting transaction status:', error);
    throw error;
  }
}
