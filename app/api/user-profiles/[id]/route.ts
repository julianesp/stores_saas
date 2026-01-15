import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

const API_BASE_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';

// PUT: Actualizar perfil de usuario
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json();
    const token = await getToken();

    // Llamar al API de Cloudflare para actualizar el perfil
    const response = await fetch(`${API_BASE_URL}/api/user-profiles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error from Cloudflare API:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Error al actualizar perfil' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({
      error: 'Error al actualizar perfil de usuario',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
