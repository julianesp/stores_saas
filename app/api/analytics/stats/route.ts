import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile } from '@/lib/cloudflare-api';

export const runtime = 'nodejs';

/**
 * GET /api/analytics/stats
 * Obtener estadísticas de analytics (solo para super admins)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();

    if (!userId || !getToken) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener token de Clerk
    const token = await getToken();
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticación no disponible' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es super admin usando el helper existente
    const userProfile = await getUserProfile(getToken);

    if (!userProfile || !userProfile.is_superadmin) {
      return NextResponse.json(
        { error: 'Solo super administradores pueden acceder a analytics' },
        { status: 403 }
      );
    }

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '7';

    // Obtener stats desde Cloudflare Workers usando el token de Clerk
    const cfApiUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;
    if (!cfApiUrl) {
      return NextResponse.json(
        { error: 'Configuración de API no disponible' },
        { status: 500 }
      );
    }

    const statsResponse = await fetch(`${cfApiUrl}/api/analytics/stats?days=${days}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!statsResponse.ok) {
      const errorText = await statsResponse.text();
      console.error('[analytics/stats] Cloudflare error:', errorText);

      // Si no hay datos, devolver estructura vacía en lugar de error
      if (statsResponse.status === 500 || errorText.includes('no such table')) {
        return NextResponse.json({
          period_days: parseInt(days),
          events_by_type: [],
          top_pages: [],
          top_features: [],
          active_users: [],
          device_stats: [],
          browser_stats: [],
          recent_errors: [],
          message: 'No hay datos de analytics todavía. El sistema comenzará a recolectar datos automáticamente.',
        });
      }

      throw new Error(`Failed to fetch analytics: ${errorText}`);
    }

    const stats = await statsResponse.json();

    return NextResponse.json(stats);

  } catch (error: any) {
    console.error('[analytics/stats] Error:', error);

    // Si es un error de "no hay datos", devolver estructura vacía
    if (error.message?.includes('no such table') || error.message?.includes('no rows')) {
      return NextResponse.json({
        period_days: 7,
        events_by_type: [],
        top_pages: [],
        top_features: [],
        active_users: [],
        device_stats: [],
        browser_stats: [],
        recent_errors: [],
        message: 'Sistema de analytics inicializado. Comenzará a recolectar datos automáticamente.',
      });
    }

    return NextResponse.json(
      { error: error.message || 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
