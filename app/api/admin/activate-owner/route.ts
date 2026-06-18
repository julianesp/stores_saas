import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile, updateUserProfile } from '@/lib/cloudflare-api';

export const runtime = 'nodejs';

const OWNER_EMAIL = 'julii1295@gmail.com';

/**
 * Activa la suscripción del propietario del sistema sin expiración.
 * Solo funciona cuando el propio usuario julii1295@gmail.com está autenticado.
 */
export async function POST(request: NextRequest) {
  try {
    const { getToken, userId } = await auth();

    if (!getToken || !userId) {
      return NextResponse.json({ error: 'Debes estar autenticado' }, { status: 401 });
    }

    const profile = await getUserProfile(getToken);

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    if (profile.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: 'Este endpoint solo funciona para la cuenta del propietario' },
        { status: 403 }
      );
    }

    // 99 años en el futuro — nunca expira
    const neverExpires = new Date();
    neverExpires.setFullYear(neverExpires.getFullYear() + 99);
    const expiresAt = neverExpires.toISOString();
    const now = new Date().toISOString();

    await updateUserProfile(profile.id, {
      subscription_status: 'active',
      has_ai_addon: true,
      has_store_addon: true,
      has_email_addon: true,
      ai_addon_expires_at: expiresAt,
      store_addon_expires_at: expiresAt,
      email_addon_expires_at: expiresAt,
      next_billing_date: expiresAt,
      last_payment_date: now,
    }, getToken);

    return NextResponse.json({
      success: true,
      message: 'Cuenta activada — nunca expira',
      email: profile.email,
      expires_at: expiresAt,
    });

  } catch (error) {
    console.error('[activate-owner] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al activar cuenta' },
      { status: 500 }
    );
  }
}
