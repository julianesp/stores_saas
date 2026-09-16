import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

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

    // TODO: Implementar registro real contra base de datos
    // Por ahora, crear un usuario simulado
    const userId = crypto.createHash('sha256').update(`${slug}:${email}:${Date.now()}`).digest('hex').slice(0, 16);

    const user = {
      id: userId,
      email,
      name,
      phone: phone || undefined,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Error al registrarse' },
      { status: 500 }
    );
  }
}
