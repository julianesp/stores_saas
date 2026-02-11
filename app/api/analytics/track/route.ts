import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

interface TrackEventBody {
  eventType: 'page_view' | 'click' | 'action' | 'feature_use' | 'error';
  eventName: string;
  pagePath?: string;
  pageTitle?: string;
  metadata?: Record<string, any>;
  sessionId?: string;
  durationMs?: number;
}

/**
 * API endpoint para rastrear eventos de usuario
 * Registra clicks, navegación, uso de features, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      // No rastreamos usuarios no autenticados
      return NextResponse.json({ success: true, message: 'Not authenticated' });
    }

    const body: TrackEventBody = await request.json();
    const {
      eventType,
      eventName,
      pagePath,
      pageTitle,
      metadata,
      sessionId,
      durationMs,
    } = body;

    // Validar campos requeridos
    if (!eventType || !eventName) {
      return NextResponse.json(
        { error: 'eventType and eventName are required' },
        { status: 400 }
      );
    }

    // Obtener token de Clerk
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      console.error('[analytics/track] No auth token');
      return NextResponse.json({ success: true }); // Silent fail
    }

    // Obtener información del usuario desde Cloudflare
    const cfApiUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;

    if (!cfApiUrl) {
      console.error('[analytics/track] Missing Cloudflare API URL');
      return NextResponse.json({ success: true }); // Silent fail
    }

    // Obtener perfil del usuario usando el token de Clerk
    const profileResponse = await fetch(`${cfApiUrl}/api/user-profiles/by-clerk-id/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!profileResponse.ok) {
      console.error('[analytics/track] Failed to get user profile');
      return NextResponse.json({ success: true }); // Silent fail
    }

    const userProfile = await profileResponse.json();

    // Detectar información del dispositivo/navegador desde headers
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const deviceType = getDeviceType(userAgent);
    const browser = getBrowser(userAgent);

    // Preparar datos del evento
    const eventData = {
      user_id: userId,
      user_email: userProfile.email,
      store_name: userProfile.store_name || null,
      event_type: eventType,
      event_name: eventName,
      page_path: pagePath || null,
      page_title: pageTitle || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      session_id: sessionId || null,
      device_type: deviceType,
      browser: browser,
      duration_ms: durationMs || null,
      subscription_status: userProfile.subscription_status,
      has_ai_addon: userProfile.has_ai_addon ? 1 : 0,
      has_store_addon: userProfile.has_store_addon ? 1 : 0,
      has_email_addon: userProfile.has_email_addon ? 1 : 0,
    };

    // Guardar evento en D1
    const d1Response = await fetch(`${cfApiUrl}/api/analytics/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    if (!d1Response.ok) {
      console.error('[analytics/track] Failed to save event');
      return NextResponse.json({ success: true }); // Silent fail
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[analytics/track] Error:', error);
    // Silent fail - no queremos que errores de analytics rompan la UX
    return NextResponse.json({ success: true });
  }
}

// Helpers para detectar dispositivo y navegador
function getDeviceType(userAgent: string): string {
  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

function getBrowser(userAgent: string): string {
  if (/chrome/i.test(userAgent)) return 'Chrome';
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent)) return 'Safari';
  if (/edge/i.test(userAgent)) return 'Edge';
  if (/opera/i.test(userAgent)) return 'Opera';
  return 'Unknown';
}
