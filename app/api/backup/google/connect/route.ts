import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { buildConsentUrl } from '@/lib/google-drive';
import { signState } from '@/lib/backup-state';

export const runtime = 'nodejs';

const API_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';

/**
 * Inicia la conexión con Google Drive. Resuelve el perfil del tendero para
 * conocer su user_profile_id y nombre de tienda, los firma en el `state` y
 * redirige a la pantalla de consentimiento de Google.
 */
export async function GET(request: NextRequest) {
  try {
    const { getToken, userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const token = await getToken();
    if (!token) return NextResponse.json({ error: 'No se pudo obtener el token' }, { status: 401 });

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    const tenantId = request.headers.get('X-Tenant-ID') || request.nextUrl.searchParams.get('tenant');
    if (tenantId) headers['X-Tenant-ID'] = tenantId;

    const profileRes = await fetch(`${API_URL}/api/user-profiles`, { headers });
    if (!profileRes.ok) {
      return NextResponse.json({ error: 'No se pudo obtener el perfil' }, { status: 500 });
    }
    const profileJson = await profileRes.json();
    const profile = profileJson.data || profileJson;

    if (!profile?.id) {
      return NextResponse.json({ error: 'Perfil sin id' }, { status: 500 });
    }

    const state = signState({
      clerkUserId: userId,
      userProfileId: profile.id,
      storeName: profile.store_name || 'Mi tienda',
    });

    return NextResponse.redirect(buildConsentUrl(state));
  } catch (error) {
    console.error('[backup/connect] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al iniciar la conexión' },
      { status: 500 }
    );
  }
}
