import { SubscriptionPlan } from './types';

// Configuración de Wompi
export const WOMPI_CONFIG = {
  publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '',
  privateKey: process.env.WOMPI_PRIVATE_KEY || '',
  integritySecret: process.env.WOMPI_INTEGRITY_SECRET || '',
  apiUrl: process.env.NEXT_PUBLIC_WOMPI_ENV === 'production'
    ? 'https://production.wompi.co/v1'
    : 'https://sandbox.wompi.co/v1',
  widgetUrl: process.env.NEXT_PUBLIC_WOMPI_ENV === 'production'
    ? 'https://checkout.wompi.co/p/'
    : 'https://checkout.wompi.co/p/',
};

// Planes de suscripción disponibles
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic-monthly',
    name: 'Plan Básico',
    price: 50000, // $50,000 COP
    currency: 'COP',
    interval: 'monthly',
    features: [
      'Punto de venta completo',
      'Gestión de inventario',
      'Hasta 1000 productos',
      'Reportes básicos',
      'Soporte por email',
    ],
    popular: true,
  },
  {
    id: 'pro-monthly',
    name: 'Plan Profesional',
    price: 100000, // $100,000 COP
    currency: 'COP',
    interval: 'monthly',
    features: [
      'Todo lo del Plan Básico',
      'Productos ilimitados',
      'Múltiples usuarios (hasta 5)',
      'Reportes avanzados',
      'Integración con DIAN',
      'Soporte prioritario',
    ],
  },
];

/**
 * Crea un enlace de pago en Wompi
 */
export async function createPaymentLink(params: {
  amount: number;
  currency: 'COP';
  reference: string;
  customerEmail: string;
  redirectUrl: string;
}) {
  try {
    console.log('Creating payment link with config:', {
      apiUrl: WOMPI_CONFIG.apiUrl,
      hasPrivateKey: !!WOMPI_CONFIG.privateKey,
      amount: params.amount,
      reference: params.reference,
    });

    const body = {
      name: 'Suscripción Sistema POS',
      description: 'Pago mensual Sistema POS',
      single_use: false,
      collect_shipping: false,
      currency: params.currency,
      amount_in_cents: params.amount * 100, // Wompi maneja centavos
      redirect_url: params.redirectUrl,
      expiration_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 horas
    };

    console.log('Request body:', JSON.stringify(body, null, 2));

    const response = await fetch(`${WOMPI_CONFIG.apiUrl}/payment_links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WOMPI_CONFIG.privateKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('Wompi response:', { status: response.status, data });

    if (!response.ok) {
      throw new Error(`Wompi API Error: ${JSON.stringify(data)}`);
    }

    return data;
  } catch (error) {
    console.error('Error creating Wompi payment link:', error);
    throw error;
  }
}

/**
 * Verifica el estado de una transacción en Wompi
 */
export async function getTransactionStatus(transactionId: string) {
  try {
    const response = await fetch(
      `${WOMPI_CONFIG.apiUrl}/transactions/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${WOMPI_CONFIG.publicKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Error fetching transaction status');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting transaction status:', error);
    throw error;
  }
}

/**
 * Verifica la integridad de un webhook de Wompi
 */
export function verifyWebhookSignature(
  signature: string,
  timestamp: string,
  payload: string
): boolean {
  try {
    const crypto = require('crypto');
    const message = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', WOMPI_CONFIG.integritySecret)
      .update(message)
      .digest('hex');

    return signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Genera una referencia única para una transacción
 */
export function generatePaymentReference(userId: string): string {
  const timestamp = Date.now();
  return `SUB-${userId.substring(0, 8)}-${timestamp}`;
}
