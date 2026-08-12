import { NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL ||
  'https://tienda-pos-api.julii1295.workers.dev';

/**
 * Lista pública de tiendas clientes para mostrar en la landing.
 * Delega al endpoint público del Worker.
 */
export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats/client-stores`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Error from Cloudflare API:', response.statusText);
      return NextResponse.json({ stores: [] }, { status: 200 });
    }

    const data = await response.json();
    return NextResponse.json({ stores: data.stores || [] });
  } catch (error) {
    console.error('Error fetching client stores:', error);
    return NextResponse.json({ stores: [] }, { status: 200 });
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
