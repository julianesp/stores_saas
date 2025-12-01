import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserProfileByClerkId } from '@/lib/subscription-helpers';
import { updateDocument, queryDocuments } from '@/lib/firestore-helpers';
import { UserProfile } from '@/lib/types';

/**
 * API para marcar un usuario como superadmin
 * Solo puede ser ejecutada por un superadmin existente
 */
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

    // Verificar que el usuario actual sea superadmin
    const currentUserProfile = await getUserProfileByClerkId(userId);
    const user = await currentUser();
    const currentUserEmail = user?.emailAddresses[0]?.emailAddress || '';

    // Permitir solo si es superadmin o si es el primer admin
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@neurai.dev';
    if (!currentUserProfile?.is_superadmin && currentUserEmail !== superAdminEmail) {
      return NextResponse.json(
        { error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    // Obtener el email del usuario a marcar como superadmin
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    // Buscar el usuario por email
    const profiles = await queryDocuments('user_profiles', [
      { field: 'email', operator: '==', value: email }
    ]) as UserProfile[];

    if (profiles.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const targetProfile = profiles[0];

    // Actualizar el perfil para ser superadmin
    await updateDocument('user_profiles', targetProfile.id, {
      is_superadmin: true,
      subscription_status: 'active',
      trial_start_date: undefined,
      trial_end_date: undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Usuario ${email} marcado como Super Admin exitosamente`,
    });
  } catch (error) {
    console.error('Error setting superadmin:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al marcar como superadmin';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
