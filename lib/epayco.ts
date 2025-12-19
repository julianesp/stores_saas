import crypto from 'crypto';

// Planes de suscripción
export const SUBSCRIPTION_PLANS = [
  {
    id: 'basic-monthly',
    name: 'Plan Básico',
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
    name: 'Add-on de Análisis IA',
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
 * Crea un enlace de pago con ePayco (Checkout Estándar)
 */
export async function createEPaycoCheckout(
  planId: string,
  userProfileId: string,
  userEmail: string,
  userName: string
): Promise<EPaycoPaymentLink> {
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

  // Calcular firma según documentación oficial de ePayco
  // Formato: MD5(p_cust_id_cliente + p_key + p_id_invoice + p_amount + p_currency_code)
  const amount = plan.price.toString();
  const currency = 'COP';
  const signatureString = `${EPAYCO_CONFIG.p_cust_id_cliente}${EPAYCO_CONFIG.p_key}${referenceCode}${amount}${currency}`;
  const signature = crypto.createHash('md5').update(signatureString).digest('hex');

  console.log('🔐 Signature Debug:', {
    p_cust_id_cliente: EPAYCO_CONFIG.p_cust_id_cliente,
    p_key: EPAYCO_CONFIG.p_key?.substring(0, 10) + '...',
    p_id_invoice: referenceCode,
    p_amount: amount,
    p_currency_code: currency,
    signatureString: signatureString.substring(0, 50) + '...',
    signature,
  });

  // Construir URL del checkout estándar de ePayco
  const params = new URLSearchParams({
    p_cust_id_cliente: EPAYCO_CONFIG.p_cust_id_cliente,
    p_key: EPAYCO_CONFIG.p_key,
    p_id_invoice: referenceCode,
    p_description: `Suscripción ${plan.name} - Tienda POS`,
    p_amount: amount,
    p_amount_base: amount,
    p_tax: '0',
    p_currency_code: currency,
    p_signature: signature,
    p_test_request: EPAYCO_CONFIG.test ? 'true' : 'false',
    p_url_confirmation: confirmationUrl,
    p_url_response: responseUrl,
    p_email: userEmail,
    p_name: userName,
    p_extra1: userProfileId,
    p_extra2: planId,
    p_extra3: plan.isAddon ? 'true' : 'false',
    p_method_confirmation: 'POST',
  });

  // Endpoint correcto según documentación oficial de ePayco
  const checkoutUrl = `https://secure.payco.co/checkout.php?${params.toString()}`;

  return {
    success: true,
    checkoutUrl,
    referenceCode,
  };
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
