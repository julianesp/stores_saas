import { NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL ||
  'https://tienda-pos-api.julii1295.workers.dev';

export async function GET() {
  try {
    // Llamar a la API de Cloudflare para obtener el conteo de tiendas activas
    const response = await fetch(`${API_BASE_URL}/stats/active-stores`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // No agregamos caché para que siempre sea dinámico
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Error from Cloudflare API:', response.statusText);
      return NextResponse.json({ count: 1 }, { status: 200 });
    }

    const data = await response.json();
    const activeStores = data.count || 1;

    return NextResponse.json({ count: activeStores });
  } catch (error) {
    console.error('Error fetching active stores:', error);
    // Devolver 1 como fallback en caso de error
    return NextResponse.json({ count: 1 }, { status: 200 });
  }
}

// Deshabilitar caché estático en Next.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;
