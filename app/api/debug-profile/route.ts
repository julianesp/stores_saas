import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;

export async function GET() {
  try {
    const { userId, getToken } = await auth();
    if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

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
