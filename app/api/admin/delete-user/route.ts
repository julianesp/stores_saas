import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAllUserProfiles } from '@/lib/cloudflare-api';

export async function DELETE(req: NextRequest) {
  try {
    // Verificar autenticación
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener todos los perfiles y buscar el del usuario actual
    const allProfiles = await getAllUserProfiles(getToken);
    const currentUserProfile = allProfiles.find(p => p.clerk_user_id === userId);

    if (!currentUserProfile?.is_superadmin) {
      return NextResponse.json(
        { error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    // Obtener el ID del usuario a eliminar
    const { userIdToDelete } = await req.json();

    if (!userIdToDelete) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    // Verificar que no se esté eliminando a sí mismo
    if (currentUserProfile.id === userIdToDelete) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propia cuenta desde aquí' },
        { status: 400 }
      );
    }

    // Obtener token de autenticación
    const token = await getToken();
    const apiUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;

    if (!apiUrl) {
      return NextResponse.json(
        { error: 'API URL no configurada' },
        { status: 500 }
      );
    }

    // Llamar al endpoint de Cloudflare para eliminar el usuario
    const response = await fetch(`${apiUrl}/api/user-profiles/${userIdToDelete}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Error al eliminar usuario' },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado correctamente',
      data: result,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al eliminar usuario';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
