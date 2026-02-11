import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile, updateUserProfile } from '@/lib/cloudflare-api';
import { getTransactionStatus } from '@/lib/wompi';

export const runtime = 'nodejs';

/**
 * Endpoint para activar manualmente un addon basándose en un ID de transacción de Wompi
 * Solo accesible por el mismo usuario o super admin
 */
export async function POST(request: NextRequest) {
  try {
    const { getToken, userId } = await auth();

    if (!getToken || !userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener el transaction ID del body
    const body = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'transactionId es requerido' },
        { status: 400 }
      );
    }

    // Obtener perfil del usuario actual
    const currentUserProfile = await getUserProfile(getToken);

    if (!currentUserProfile) {
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      );
    }

    // Consultar la transacción en Wompi
    console.log(`[activate-addon-manually] Checking transaction: ${transactionId}`);

    const transaction = await getTransactionStatus(transactionId);

    if (!transaction.data) {
      return NextResponse.json(
        { error: 'Transacción no encontrada en Wompi' },
        { status: 404 }
      );
    }

    console.log('[activate-addon-manually] Transaction data:', {
      id: transaction.data.id,
      status: transaction.data.status,
      reference: transaction.data.reference,
      amount_in_cents: transaction.data.amount_in_cents,
    });

    // Verificar que el pago esté aprobado
    if (transaction.data.status !== 'APPROVED') {
      return NextResponse.json(
        {
          error: `La transacción no está aprobada. Estado actual: ${transaction.data.status}`,
          status: transaction.data.status
        },
        { status: 400 }
      );
    }

    // Extraer información del reference
    const reference = transaction.data.reference || '';
    const amountCOP = transaction.data.amount_in_cents / 100;

    console.log('[activate-addon-manually] Processing:', {
      reference,
      amountCOP
    });

    // Determinar qué addon activar basado en el monto y la referencia
    let addonType = '';
    let updates: any = {};

    // Identificar el addon por la referencia o el monto
    if (reference.includes('addon-ai') || amountCOP === 4900) {
      addonType = 'AI';
      updates.has_ai_addon = true;
    } else if (reference.includes('addon-store') || amountCOP === 9900) {
      addonType = 'Store';
      updates.has_store_addon = true;
    } else if (reference.includes('addon-email') || (amountCOP === 4900 && !reference.includes('addon-ai'))) {
      addonType = 'Email';
      updates.has_email_addon = true;
    } else if (reference.includes('plan-basico') || amountCOP === 24900) {
      // Es el plan básico, no un addon
      return NextResponse.json(
        {
          error: 'Esta transacción corresponde al Plan Básico, no a un addon. Use el endpoint de suscripciones.'
        },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        {
          error: `No se pudo identificar el addon. Referencia: ${reference}, Monto: ${amountCOP}`
        },
        { status: 400 }
      );
    }

    // Calcular fecha de expiración del addon (30 días desde hoy)
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Agregar fecha de expiración específica del addon
    if (addonType === 'AI') {
      updates.ai_addon_expires_at = expiresAt.toISOString();
    } else if (addonType === 'Store') {
      updates.store_addon_expires_at = expiresAt.toISOString();
    } else if (addonType === 'Email') {
      updates.email_addon_expires_at = expiresAt.toISOString();
    }

    // Actualizar también las fechas de pago generales
    updates.last_payment_date = new Date(transaction.data.created_at || now).toISOString();

    // Si no tiene next_billing_date, usar la fecha de expiración del addon
    if (!currentUserProfile.next_billing_date) {
      updates.next_billing_date = expiresAt.toISOString();
    }

    console.log('[activate-addon-manually] Updating user profile with:', updates);

    // Actualizar el perfil del usuario
    await updateUserProfile(currentUserProfile.id, updates, getToken);

    console.log(`✅ Addon ${addonType} activated for user: ${currentUserProfile.email}`);

    return NextResponse.json({
      success: true,
      message: `Addon ${addonType} activado correctamente`,
      data: {
        userEmail: currentUserProfile.email,
        addonType,
        expiresAt: expiresAt.toISOString(),
        transactionId: transaction.data.id,
        amount: amountCOP,
        updates,
      },
    });

  } catch (error: any) {
    console.error('[activate-addon-manually] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al activar addon manualmente' },
      { status: 500 }
    );
  }
}
