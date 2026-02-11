import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile, updateUserProfile, getAllUserProfiles } from '@/lib/cloudflare-api';

export const runtime = 'nodejs';

/**
 * Endpoint para activar manualmente planes y addons desde el panel de admin
 * Solo accesible por super administradores
 */
export async function POST(request: NextRequest) {
  try {
    const { getToken, userId } = await auth();

    if (!getToken || !userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario actual es super admin
    const adminProfile = await getUserProfile(getToken);

    if (!adminProfile || !adminProfile.is_superadmin) {
      return NextResponse.json(
        { error: 'Solo super administradores pueden activar planes manualmente' },
        { status: 403 }
      );
    }

    // Obtener datos del body
    const body = await request.json();
    const { userEmail, planType, paymentReference } = body;

    if (!userEmail || !planType) {
      return NextResponse.json(
        { error: 'Email de usuario y tipo de plan son requeridos' },
        { status: 400 }
      );
    }

    // Buscar el usuario por email
    const allProfiles = await getAllUserProfiles(getToken);
    const targetProfile = allProfiles.find(
      (p: any) => p.email.toLowerCase() === userEmail.toLowerCase()
    );

    if (!targetProfile) {
      return NextResponse.json(
        { error: `Usuario con email ${userEmail} no encontrado` },
        { status: 404 }
      );
    }

    console.log(`[activate-plan-manually] Activating ${planType} for user: ${userEmail}`);

    // Preparar las actualizaciones según el tipo de plan
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 días de servicio

    let updates: any = {
      last_payment_date: now.toISOString(),
    };

    switch (planType) {
      case 'plan-basico':
        updates.subscription_status = 'active';
        updates.next_billing_date = expiresAt.toISOString();
        updates.subscription_tier = 'basic';
        break;

      case 'addon-ai':
        updates.has_ai_addon = true;
        updates.ai_addon_expires_at = expiresAt.toISOString();
        break;

      case 'addon-store':
        updates.has_store_addon = true;
        updates.store_addon_expires_at = expiresAt.toISOString();
        break;

      case 'addon-email':
        updates.has_email_addon = true;
        updates.email_addon_expires_at = expiresAt.toISOString();
        break;

      default:
        return NextResponse.json(
          { error: `Tipo de plan desconocido: ${planType}` },
          { status: 400 }
        );
    }

    // Si se proporcionó una referencia de pago, agregarla
    if (paymentReference) {
      updates.payment_reference = paymentReference;
    }

    console.log('[activate-plan-manually] Updates to apply:', updates);

    // Actualizar el perfil del usuario
    await updateUserProfile(targetProfile.id, updates, getToken);

    console.log(`✅ Plan ${planType} activated for user: ${userEmail}`);

    // Preparar los nombres legibles
    const planNames: Record<string, string> = {
      'plan-basico': 'Plan Básico',
      'addon-ai': 'Addon: Análisis con IA',
      'addon-store': 'Addon: Tienda Online',
      'addon-email': 'Addon: Email Marketing',
    };

    return NextResponse.json({
      success: true,
      message: `${planNames[planType]} activado correctamente`,
      data: {
        userEmail: targetProfile.email,
        userName: targetProfile.store_name || targetProfile.email,
        planType,
        planName: planNames[planType],
        activatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        paymentReference: paymentReference || 'N/A',
        updates,
      },
    });

  } catch (error: any) {
    console.error('[activate-plan-manually] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al activar plan manualmente' },
      { status: 500 }
    );
  }
}
