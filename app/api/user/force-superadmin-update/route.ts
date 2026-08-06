import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile, updateUserProfile } from '@/lib/cloudflare-api';

export const runtime = 'nodejs';

/**
 * Bootstrap del primer superadmin.
 *
 * Solo funciona si se envía el secreto correcto en el header `x-bootstrap-secret`
 * que debe coincidir con la variable de entorno SUPERADMIN_BOOTSTRAP_SECRET.
 * Un email por sí solo NUNCA es suficiente para conceder superadmin, porque
 * cualquiera podría registrar ese email en Clerk y auto-promoverse.
 *
 * Una vez exista un superadmin, promueva a los demás con /api/admin/set-superadmin.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const bootstrapSecret = process.env.SUPERADMIN_BOOTSTRAP_SECRET;
    const providedSecret = req.headers.get('x-bootstrap-secret');

    // Sin secreto configurado, el endpoint queda inutilizable (comportamiento seguro por defecto).
    if (!bootstrapSecret || !providedSecret || providedSecret !== bootstrapSecret) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const currentProfile = await getUserProfile(getToken);

    if (!currentProfile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado. Por favor, crea tu perfil primero.' },
        { status: 404 }
      );
    }

    const updatedProfile = await updateUserProfile(currentProfile.id, {
      is_superadmin: true,
      subscription_status: 'active',
    }, getToken);

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado exitosamente a Super Admin',
      profile: updatedProfile,
    });

  } catch (error) {
    console.error('Error forcing superadmin update:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al actualizar perfil' },
      { status: 500 }
    );
  }
}
