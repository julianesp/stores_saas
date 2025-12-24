import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * Endpoint para obtener estadísticas de uso de todas las tiendas
 * Solo accesible para super admin
 * Delega la lógica al endpoint de Cloudflare Workers
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener token para autenticación
    const token = await getToken();
    if (!token) {
      return NextResponse.json(
        { error: 'No se pudo obtener el token de autenticación' },
        { status: 401 }
      );
    }

    const API_BASE_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';

    // Hacer petición al endpoint de Cloudflare Workers que obtiene las estadísticas
    const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Error al obtener estadísticas' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data.data,
    });

  } catch (error) {
    console.error('Error in store-stats:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
