import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { reviewCategories, type CategoryReviewInput } from '@/lib/ai-category-review-helpers';
import { hasAIAccess } from '@/lib/cloudflare-subscription-helpers';
import type { UserProfile } from '@/lib/types';

const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL || 'https://tienda-pos-api.julii1295.workers.dev';

// El cliente manda tandas de 500 productos; cada una tarda unos 10 segundos.
export const maxDuration = 60;

const MAX_ITEMS = 1000;

/**
 * Revisa con IA qué productos están en una categoría que no les corresponde.
 * Recibe `items: [{ n: nombre, c: categoría }]` y devuelve
 * `findings: [{ i: índice, suggested: categoría existente }]`.
 * Requiere acceso a IA (trial o suscripción activa).
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { items } = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No hay productos para revisar' }, { status: 400 });
    }
    if (items.length > MAX_ITEMS) {
      return NextResponse.json(
        { error: `Se pueden revisar hasta ${MAX_ITEMS.toLocaleString('es-CO')} productos a la vez.` },
        { status: 413 },
      );
    }
    const clean: CategoryReviewInput[] = items.map((it: { n?: unknown; c?: unknown }) => ({
      n: String(it?.n ?? '').slice(0, 100).replace(/[|\n]/g, ' '),
      c: String(it?.c ?? '').slice(0, 60).replace(/[|\n]/g, ' '),
    }));

    const token = await getToken();
    let profile: UserProfile | undefined;
    try {
      const profileRes = await fetch(`${WORKER_URL}/api/user-profiles`, {
        // Sin X-Tenant-ID el Worker usa la tienda propia del usuario.
        headers: {
          Authorization: `Bearer ${token}`,
          ...(request.headers.get('X-Tenant-ID')
            ? { 'X-Tenant-ID': request.headers.get('X-Tenant-ID')! }
            : {}),
        },
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
            'La revisión de categorías usa IA y requiere una suscripción activa. El resto de la revisión sí está disponible.',
        },
        { status: 403 },
      );
    }

    const findings = await reviewCategories(clean, profile.gemini_api_key);
    return NextResponse.json({ success: true, findings });
  } catch (error) {
    console.error('Error revisando categorías:', error);
    const message = error instanceof Error ? error.message : 'Error al revisar las categorías';
    // 503 = la IA está saturada o se pasó el límite por minuto: el cliente reintenta.
    const busy = /saturada|Límite de solicitudes/.test(message);
    return NextResponse.json({ error: message }, { status: busy ? 503 : 500 });
  }
}
