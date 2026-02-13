import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;

/**
 * GET /api/user-stores
 * Obtiene todas las tiendas a las que el usuario tiene acceso
 */
export async function GET() {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = await getToken();

    const response = await fetch(`${API_URL}/api/user-stores`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener tiendas');
    }

    const data = await response.json();

    return NextResponse.json(data.data || []);
  } catch (error) {
    console.error('Error en GET /api/user-stores:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error al obtener tiendas'
      },
      { status: 500 }
    );
  }
}
