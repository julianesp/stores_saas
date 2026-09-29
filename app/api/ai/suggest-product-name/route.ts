import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { suggestProductName } from '@/lib/ai-product-name-helpers';
import { hasAIAccess } from '@/lib/cloudflare-subscription-helpers';
import type { UserProfile } from '@/lib/types';

const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL || 'https://tienda-pos-api.julii1295.workers.dev';

// El cliente reduce la foto antes de enviarla; este tope es solo defensivo
// (Vercel rechaza cuerpos de más de 4,5 MB).
const MAX_BASE64_LENGTH = 4_000_000;

/**
 * Sugiere el nombre de un producto a partir de una foto de su empaque.
 * Solo devuelve una sugerencia: quien llama decide si la aplica.
 * Requiere acceso a IA (trial o suscripción activa).
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { imageBase64, mimeType, currentName } = await request.json();

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'Falta la foto del producto' }, { status: 400 });
    }
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { error: 'La foto es muy grande. Usa una foto más liviana.' },
        { status: 413 },
      );
    }

    const token = await getToken();
    let profile: UserProfile | undefined;
    try {
      const profileRes = await fetch(`${WORKER_URL}/api/user-profiles/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        profile = profileData.data || profileData;
      }
    } catch {
      /* si falla la carga del perfil, se maneja abajo */
    }

    if (!profile) {
      return NextResponse.json({ error: 'No se pudo cargar tu perfil.' }, { status: 400 });
    }
    if (!hasAIAccess(profile)) {
      return NextResponse.json(
        {
          error:
            'Esta función usa IA y requiere una suscripción activa. Actívala para sugerir nombres con foto.',
        },
        { status: 403 },
      );
    }

    const result = await suggestProductName(
      imageBase64,
      typeof mimeType === 'string' ? mimeType : 'image/jpeg',
      typeof currentName === 'string' ? currentName : undefined,
      profile.gemini_api_key,
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error sugiriendo nombre de producto:', error);
    const message = error instanceof Error ? error.message : 'Error al leer la foto';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
