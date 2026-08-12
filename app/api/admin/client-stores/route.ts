import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api-auth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL ||
  'https://tienda-pos-api.julii1295.workers.dev';

/**
 * Gestión del catálogo de tiendas clientes de la landing.
 * Solo accesible para superadmin. Delega el CRUD al Worker de Cloudflare.
 */

async function getAuthHeaders() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
  }

  const token = await admin.getToken();
  if (!token) {
    return {
      error: NextResponse.json(
        { error: 'No se pudo obtener el token de autenticación' },
        { status: 401 }
      ),
    };
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

async function forward(
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: unknown
) {
  const response = await fetch(`${API_BASE_URL}/api/client-stores${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

export async function GET() {
  const auth = await getAuthHeaders();
  if (auth.error) return auth.error;
  return forward('GET', '', auth.headers);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthHeaders();
  if (auth.error) return auth.error;
  const body = await request.json();
  return forward('POST', '', auth.headers, body);
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthHeaders();
  if (auth.error) return auth.error;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Falta el id de la tienda' }, { status: 400 });
  }
  const body = await request.json();
  return forward('PUT', `/${id}`, auth.headers, body);
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthHeaders();
  if (auth.error) return auth.error;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Falta el id de la tienda' }, { status: 400 });
  }
  return forward('DELETE', `/${id}`, auth.headers);
}

export const dynamic = 'force-dynamic';
