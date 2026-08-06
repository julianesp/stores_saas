import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api-auth';

const API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;

/**
 * Diagnóstico de perfiles. Devuelve datos crudos de la API, por lo que se
 * restringe a super admin.
 */
export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const { userId, getToken } = admin;
    const token = await getToken();

    const [r1, r2] = await Promise.all([
      fetch(`${API_URL}/api/user-profiles/by-clerk-id/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_URL}/api/user-profiles`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const [d1, d2] = await Promise.all([r1.text(), r2.text()]);

    return NextResponse.json({
      userId,
      apiUrl: API_URL,
      byClerkId: { status: r1.status, body: d1 },
      userProfiles: { status: r2.status, body: d2 },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error desconocido' }, { status: 500 });
  }
}
