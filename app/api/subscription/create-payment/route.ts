import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPaymentLink, generatePaymentReference, SUBSCRIPTION_PLANS } from '@/lib/wompi';
import { getUserProfileByClerkId } from '@/lib/subscription-helpers';

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener datos del request
    const { planId, paymentMethod } = await req.json();

    // Buscar el plan
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan no encontrado' },
        { status: 404 }
      );
    }

    // Obtener el perfil del usuario
    const userProfile = await getUserProfileByClerkId(userId);

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      );
    }

    // Generar referencia única
    const reference = generatePaymentReference(userProfile.id);

    // Crear enlace de pago en Wompi
    const paymentLink = await createPaymentLink({
      amount: plan.price,
      currency: 'COP',
      reference,
      customerEmail: userProfile.email,
      redirectUrl: `${process.env.NEXT_PUBLIC_URL}/dashboard/subscription/success`,
      paymentMethod: paymentMethod || undefined, // 'NEQUI', 'CARD', etc.
    });

    return NextResponse.json({
      success: true,
      paymentLink: paymentLink.data,
      reference,
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al crear el pago';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
