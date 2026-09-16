import { NextRequest, NextResponse } from 'next/server';

interface LoginRequest {
  slug: string;
  email: string;
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: LoginRequest = await req.json();
    const { slug, email, password } = body;

    if (!slug || !email || !password) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Llamar al Worker API
    const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';
    const response = await fetch(
      `${workerUrl}/api/storefront/auth/login/${slug}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error al iniciar sesión' }));
      return NextResponse.json(
        { error: errorData.error || 'Error al iniciar sesión' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ user: data.data });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error al iniciar sesión' },
      { status: 500 }
    );
  }
}
