import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserProfileByClerkId } from '@/lib/subscription-helpers';
import { updateDocument } from '@/lib/firestore-helpers';

/**
 * API para forzar la actualización de un perfil existente a superadmin
 * Solo funciona si el usuario tiene el email configurado como SUPER_ADMIN_EMAIL
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

    // Obtener información del usuario de Clerk
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const userEmail = user.emailAddresses[0]?.emailAddress || '';
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@neurai.dev';

    // Verificar que el email del usuario sea el del super admin
    if (userEmail !== superAdminEmail) {
      return NextResponse.json(
        {
          error: 'Este endpoint solo puede ser usado por el Super Admin',
          currentEmail: userEmail,
          requiredEmail: superAdminEmail
        },
        { status: 403 }
      );
    }

    // Obtener el perfil actual
    const existingProfile = await getUserProfileByClerkId(userId);

    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado. Por favor, intenta acceder al dashboard primero.' },
        { status: 404 }
      );
    }

    // Actualizar el perfil a superadmin
    await updateDocument('user_profiles', existingProfile.id, {
      is_superadmin: true,
      subscription_status: 'active',
      trial_start_date: null,
      trial_end_date: null,
    });

    return NextResponse.json({
      success: true,
      message: '¡Perfil actualizado a Super Admin exitosamente!',
      profile: {
        ...existingProfile,
        is_superadmin: true,
        subscription_status: 'active',
      }
    });
  } catch (error) {
    console.error('Error forcing superadmin update:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al actualizar perfil';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
