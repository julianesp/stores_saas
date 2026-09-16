import { NextRequest, NextResponse } from 'next/server';

interface RegisterRequest {
  slug: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: RegisterRequest = await req.json();
    const { slug, name, email, password, phone } = body;

    if (!slug || !name || !email || !password) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Correo electrónico inválido' },
        { status: 400 }
      );
    }

    // Validar contraseña
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Llamar al Worker API
    const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';
    const response = await fetch(
      `${workerUrl}/api/storefront/auth/register/${slug}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, phone }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error al registrarse' }));
      return NextResponse.json(
        { error: errorData.error || 'Error al registrarse' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ user: data.data }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Error al registrarse' },
      { status: 500 }
    );
  }
}
