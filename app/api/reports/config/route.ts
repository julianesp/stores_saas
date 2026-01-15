import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile } from '@/lib/cloudflare-api';

export const runtime = 'nodejs';

const API_BASE_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';

// GET: Obtener configuración actual
export async function GET() {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userProfile = await getUserProfile(getToken);

    if (!userProfile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      enabled: Boolean(userProfile.auto_reports_enabled),
      time: userProfile.auto_reports_time || '20:00',
      email: userProfile.auto_reports_email || null,
    });

  } catch (error) {
    console.error('Error fetching auto reports config:', error);
    return NextResponse.json({
      error: 'Error al obtener configuración',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// POST: Actualizar configuración
export async function POST(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { enabled, time, email } = body;

    // Validar formato de hora (HH:MM)
    if (time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
      return NextResponse.json({
        error: 'Formato de hora inválido. Use HH:MM (00:00 - 23:59)'
      }, { status: 400 });
    }

    const userProfile = await getUserProfile(getToken);

    if (!userProfile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    const token = await getToken();

    // Intentar actualizar el perfil con PATCH que solo actualiza campos específicos
    const updateResponse = await fetch(`${API_BASE_URL}/api/user-profiles/${userProfile.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        auto_reports_enabled: enabled ? 1 : 0,
        auto_reports_time: time || '20:00',
        auto_reports_email: email || null,
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json().catch(() => ({}));
      console.error('Error updating reports config:', errorData);

      // Si PATCH falla, intentar con PUT enviando el perfil completo
      const putResponse = await fetch(`${API_BASE_URL}/api/user-profiles/${userProfile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...userProfile,
          auto_reports_enabled: enabled ? 1 : 0,
          auto_reports_time: time || '20:00',
          auto_reports_email: email || null,
        }),
      });

      if (!putResponse.ok) {
        const putErrorData = await putResponse.json().catch(() => ({}));
        console.error('Error with PUT request:', putErrorData);
        throw new Error(putErrorData.error || 'Error al actualizar configuración');
      }
    }

    return NextResponse.json({
      success: true,
      message: enabled
        ? 'Reportes automáticos activados correctamente'
        : 'Reportes automáticos desactivados',
      config: {
        enabled,
        time: time || '20:00',
        email: email || null,
      }
    });

  } catch (error) {
    console.error('Error updating auto reports config:', error);
    return NextResponse.json({
      error: 'Error al actualizar configuración',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
