import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;

/**
 * GET /api/user/profile
 * Obtiene el perfil del usuario autenticado (owner de la tienda)
 */
export async function GET(request: NextRequest) {
  try {
    const { getToken, userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const token = await getToken();

    if (!token) {
      return NextResponse.json(
        { error: 'No se pudo obtener el token' },
        { status: 401 }
      );
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Propagar el tenant ID si el cliente lo envía
    const tenantId = request.headers.get('X-Tenant-ID');
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    const response = await fetch(`${API_URL}/api/user-profiles`, { headers });

    if (!response.ok) {
      const text = await response.text();
      let errorMsg = 'Error al obtener perfil';
      try {
        const data = JSON.parse(text);
        errorMsg = data.error || errorMsg;
      } catch {}
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data.data || data);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener perfil' },
      { status: 500 }
    );
  }
}
