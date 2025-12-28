import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPaymentLink } from '@/lib/wompi';

// Planes de suscripción
const SUBSCRIPTION_PLANS: Record<string, { name: string; price: number }> = {
  'plan-basico': {
    name: 'Plan Básico',
    price: 29900,
  },
  'plan-premium': {
    name: 'Plan Premium',
    price: 49900,
  },
};

export async function POST(req: NextRequest) {
  try {
    // Obtener el usuario autenticado
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener el planId del body
    const { planId } = await req.json();

    // Validar el plan
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan inválido' },
        { status: 400 }
      );
    }

    // Crear el link de pago usando la función de wompi.ts (igual que la tienda online)
    const paymentLink = await createPaymentLink({
      amount: plan.price,
      currency: 'COP',
      reference: `SUBSCRIPTION-${planId}-${userId}-${Date.now()}`,
      customerEmail: 'customer@example.com', // Podrías obtener el email del usuario de Clerk
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/subscription/confirmation`,
    });

    // Retornar el checkout URL
    const checkoutUrl = paymentLink.data?.id
      ? `https://checkout.wompi.co/l/${paymentLink.data.id}`
      : null;

    if (!checkoutUrl) {
      throw new Error('No se pudo generar el link de pago');
    }

    return NextResponse.json({
      success: true,
      data: {
        checkout_url: checkoutUrl,
        payment_link_id: paymentLink.data.id,
      }
    });

  } catch (error: any) {
    console.error('Error in create-payment-link API route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
