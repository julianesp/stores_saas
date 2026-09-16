import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

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

    // TODO: Implementar autenticación real contra base de datos
    // Por ahora, crear un usuario simulado basado en email
    const userId = crypto.createHash('sha256').update(`${slug}:${email}`).digest('hex').slice(0, 16);

    const user = {
      id: userId,
      email,
      name: email.split('@')[0],
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error al iniciar sesión' },
      { status: 500 }
    );
  }
}
