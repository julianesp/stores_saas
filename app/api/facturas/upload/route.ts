import { NextRequest, NextResponse } from 'next/server';

const WORKER_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const body = await request.json();

    const response = await fetch(`${WORKER_URL}/api/facturas/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
