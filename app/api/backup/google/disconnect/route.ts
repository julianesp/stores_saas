import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { disconnectDrive } from '@/lib/backup-worker';

export const runtime = 'nodejs';

const API_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';

/** Desconecta Google Drive: borra las credenciales del tenant y desactiva el respaldo. */
export async function POST(request: NextRequest) {
  try {
    const { getToken, userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const token = await getToken();
    if (!token) return NextResponse.json({ error: 'No se pudo obtener el token' }, { status: 401 });

    // Resolver el user_profile_id del usuario autenticado (no confiar en el body).
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    const tenantId = request.headers.get('X-Tenant-ID');
    if (tenantId) headers['X-Tenant-ID'] = tenantId;

    const profileRes = await fetch(`${API_URL}/api/user-profiles`, { headers });
    if (!profileRes.ok) {
      return NextResponse.json({ error: 'No se pudo obtener el perfil' }, { status: 500 });
    }
    const profileJson = await profileRes.json();
    const profile = profileJson.data || profileJson;
    if (!profile?.id) return NextResponse.json({ error: 'Perfil sin id' }, { status: 500 });

    await disconnectDrive(profile.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[backup/disconnect] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al desconectar' },
      { status: 500 }
    );
  }
}
