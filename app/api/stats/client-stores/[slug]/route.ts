import { NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL ||
  'https://tienda-pos-api.julii1295.workers.dev';

/**
 * Perfil público de una tienda cliente. Delega al endpoint público del Worker,
 * que solo responde si el perfil está habilitado.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const response = await fetch(
      `${API_BASE_URL}/stats/client-stores/${encodeURIComponent(slug)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching client store profile:', error);
    return NextResponse.json(
      { success: false, error: 'Error al cargar el perfil' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
