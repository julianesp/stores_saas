import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createEPaycoCheckout, SUBSCRIPTION_PLANS } from '@/lib/epayco';
import { getBusinessTypeByPlanId } from '@/lib/business-types';

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
    const { planId, paymentMethod, tenantId } = await req.json();

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

    const profileHeaders: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    if (tenantId) {
      profileHeaders['X-Tenant-ID'] = tenantId;
    }

    // Intentar primero con by-clerk-id (no requiere X-Tenant-ID)
    let userProfile = null;
    const byClerkResponse = await fetch(`${apiUrl}/api/user-profiles/by-clerk-id/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    console.log('[create-payment] by-clerk-id status:', byClerkResponse.status);

    if (byClerkResponse.ok) {
      const byClerkData = await byClerkResponse.json();
      console.log('[create-payment] by-clerk-id data:', JSON.stringify(byClerkData));
      userProfile = byClerkData.data || byClerkData;
    } else {
      const byClerkErr = await byClerkResponse.text();
      console.error('[create-payment] by-clerk-id error:', byClerkErr);

      // Fallback: endpoint estándar con tenant
      const userProfileResponse = await fetch(`${apiUrl}/api/user-profiles`, {
        headers: profileHeaders,
      });

      console.log('[create-payment] /api/user-profiles status:', userProfileResponse.status);

      if (!userProfileResponse.ok) {
        const errText = await userProfileResponse.text();
        console.error('[create-payment] /api/user-profiles error:', errText);
        return NextResponse.json(
          { error: 'Perfil de usuario no encontrado', debug: { byClerkStatus: byClerkResponse.status, byClerkError: byClerkErr } },
          { status: 404 }
        );
      }

      const userProfileData = await userProfileResponse.json();
      console.log('[create-payment] /api/user-profiles data:', JSON.stringify(userProfileData));
      userProfile = userProfileData.data;
    }

    if (!userProfile || !userProfile.id) {
      console.error('[create-payment] userProfile vacío:', JSON.stringify(userProfile));
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      );
    }

    // Precio en vivo editado desde el panel superadmin (si el plan corresponde
    // a un tipo de negocio). Si falla o no hay override, se usa plan.price.
    let livePrice: number | undefined;
    const businessType = getBusinessTypeByPlanId(planId);
    if (businessType) {
      try {
        const pricesResponse = await fetch(`${apiUrl}/api/business-type-prices`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (pricesResponse.ok) {
          const pricesData = await pricesResponse.json();
          const match = (pricesData.data || []).find(
            (p: { businessType: string; price: number }) => p.businessType === businessType.id
          );
          if (match) livePrice = match.price;
        }
      } catch (err) {
        console.error('[create-payment] error fetching live prices:', err);
      }
    }

    // Crear checkout en ePayco
    const checkoutData = await createEPaycoCheckout(
      planId,
      userProfile.id,
      userProfile.email,
      userProfile.store_name || userProfile.email,
      userProfile.phone,
      livePrice
    );

    console.log('ePayco checkout created:', checkoutData);

    if (!checkoutData || !checkoutData.success) {
      console.error('Invalid ePayco checkout response:', JSON.stringify(checkoutData, null, 2));
      return NextResponse.json(
        {
          error: 'No se pudo generar el enlace de pago. Verifica tu configuración de ePayco.',
          details: checkoutData,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: checkoutData.sessionId,
      reference: checkoutData.referenceCode,
      paymentLink: {
        permalink: checkoutData.checkoutUrl || '', // Deprecated - para compatibilidad
      },
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
