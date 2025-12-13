import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPaymentLink, generatePaymentReference, SUBSCRIPTION_PLANS } from '@/lib/wompi';

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await auth();
    const { userId } = authResult;

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

    // Obtener el perfil del usuario desde la API de Cloudflare
    const apiUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';
    const token = await authResult.getToken();

    const userProfileResponse = await fetch(`${apiUrl}/api/user-profiles`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!userProfileResponse.ok) {
      console.error('Error fetching user profile:', await userProfileResponse.text());
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      );
    }

    const userProfileData = await userProfileResponse.json();
    const userProfile = userProfileData.data;

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

    console.log('Payment link created:', paymentLink);

    // Wompi devuelve { data: { id, ... } }
    if (!paymentLink || !paymentLink.data || !paymentLink.data.id) {
      console.error('Invalid payment link response:', JSON.stringify(paymentLink, null, 2));
      return NextResponse.json(
        {
          error: 'No se pudo generar el enlace de pago. Verifica tu configuración de Wompi.',
          details: paymentLink,
        },
        { status: 500 }
      );
    }

    // Construir el permalink manualmente usando el ID
    const permalink = `https://checkout.wompi.co/l/${paymentLink.data.id}`;

    return NextResponse.json({
      success: true,
      paymentLink: {
        ...paymentLink.data,
        permalink, // Agregar el permalink construido
      },
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
