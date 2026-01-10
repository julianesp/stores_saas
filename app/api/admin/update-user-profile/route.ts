import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile, updateUserProfile } from '@/lib/cloudflare-api';

export const runtime = 'nodejs';

/**
 * Endpoint para que superadmin actualice el perfil de cualquier usuario
 * Este endpoint verifica que el usuario autenticado sea superadmin
 * antes de permitir la actualización
 *
 * Este endpoint se ejecuta en el servidor (Next.js), por lo que puede
 * usar updateUserProfile() sin problemas de autorización
 */
export async function POST(request: NextRequest) {
  try {
    const { getToken, userId } = await auth();

    if (!getToken || !userId) {
      console.error('[update-user-profile] No userId found in auth');
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('[update-user-profile] User ID:', userId);

    // Verificar que el usuario autenticado es superadmin
    console.log('[update-user-profile] Fetching user profile...');
    const adminProfile = await getUserProfile(getToken);
    console.log('[update-user-profile] User profile fetched:', adminProfile?.email, 'is_superadmin:', adminProfile?.is_superadmin);

    if (!adminProfile || !adminProfile.is_superadmin) {
      return NextResponse.json(
        { success: false, error: 'Solo superadmins pueden actualizar perfiles de otros usuarios' },
        { status: 403 }
      );
    }

    // Obtener los datos del body
    const body = await request.json();
    const { userId: targetUserId, updates } = body;

    console.log('[update-user-profile] Target userId:', targetUserId);
    console.log('[update-user-profile] Updates:', updates);

    if (!targetUserId || !updates) {
      return NextResponse.json(
        { success: false, error: 'userId y updates son requeridos' },
        { status: 400 }
      );
    }

    // Actualizar el perfil usando la función de cloudflare-api
    // Esta función funciona desde el servidor sin problemas
    console.log('[update-user-profile] Calling updateUserProfile...');
    await updateUserProfile(targetUserId, updates, getToken);
    console.log('[update-user-profile] Profile updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado correctamente',
    });

  } catch (error: any) {
    console.error('[update-user-profile] Error updating user profile:', error);
    console.error('[update-user-profile] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar perfil de usuario' },
      { status: 500 }
    );
  }
}
