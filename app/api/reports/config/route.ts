import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile, updateUserProfile } from '@/lib/cloudflare-api';

export const runtime = 'nodejs';

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

    await updateUserProfile(userProfile.id, {
      auto_reports_enabled: enabled,
      auto_reports_time: time || '20:00',
      auto_reports_email: email || null,
    }, getToken);

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
