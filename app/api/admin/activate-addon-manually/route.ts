import { NextRequest, NextResponse } from 'next/server';
import { getTransactionStatus } from '@/lib/epayco';
import { requireSuperAdmin } from '@/lib/api-auth';

export const runtime = 'nodejs';

/**
 * Reconciliación de pagos de ePayco. Herramienta administrativa (solo superadmin).
 *
 * Dado un identificador de transacción de ePayco (ref_payco o transaction_id),
 * verifica el estado REAL en ePayco y, si el pago fue aprobado, activa el
 * add-on correspondiente sobre el CLIENTE que pagó (identificado por x_extra1,
 * el userProfileId embebido en la transacción) — no sobre el superadmin.
 *
 * Nace de un incidente real: el webhook comparaba el planId del add-on de
 * tienda con un ID equivocado ('store-addon-monthly' en vez de
 * 'addon-store-monthly'), así que ningún pago de $14.900 se activaba ni se
 * registraba. Este endpoint permite recuperar esos pagos caso por caso.
 *
 * Regla de negocio: el add-on de Tienda Online solo se activa si el cliente
 * tiene el plan base activo (sin POS/productos, la tienda no sirve).
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const transactionId = body.transactionId || body.refPayco || body.ref_payco;
    // dryRun: solo verifica en ePayco y devuelve la info (pago + cliente + add-on
    // que se activaría), sin escribir nada. Lo usa la página de reconciliación
    // para mostrar una previsualización antes de que el admin confirme.
    const dryRun = body.dryRun === true;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'transactionId (o ref_payco) es requerido' },
        { status: 400 }
      );
    }

    // Verificar la transacción en ePayco (fuente de verdad)
    const transaction = await getTransactionStatus(transactionId);
    if (!transaction || !transaction.data) {
      return NextResponse.json(
        { error: 'Transacción no encontrada en ePayco' },
        { status: 404 }
      );
    }

    const tx = transaction.data;
    const txState = tx.x_transaction_state || tx.estado;
    const codResponse = Number(tx.x_cod_response ?? tx.x_cod_respuesta);
    const amountCOP = parseFloat(tx.x_amount || tx.valor || '0');
    const targetUserId: string | undefined = tx.x_extra1; // userProfileId del cliente
    const planId: string | undefined = tx.x_extra2; // p.ej. addon-store-monthly

    // Solo activamos pagos aprobados
    if (codResponse !== 1 && txState !== 'Aceptada') {
      return NextResponse.json(
        { error: `La transacción no está aprobada. Estado: ${txState}`, status: txState },
        { status: 400 }
      );
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'La transacción no trae x_extra1 (userProfileId). No se puede identificar al cliente.' },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';
    const token = await admin.getToken();
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Traer el perfil del CLIENTE que pagó. user_profiles es una tabla global y
    // el Worker no expone GET /:id, así que listamos todos (ruta de superadmin) y
    // filtramos por id. El PUT sí acepta /:id para actualizar.
    const allRes = await fetch(`${apiUrl}/api/user-profiles/all`, {
      headers: authHeaders,
    });
    if (!allRes.ok) {
      return NextResponse.json(
        { error: `No se pudieron cargar los perfiles (status ${allRes.status})` },
        { status: 500 }
      );
    }
    const allJson = await allRes.json();
    const allProfiles = allJson.data || allJson.results || allJson || [];
    const clientProfile = Array.isArray(allProfiles)
      ? allProfiles.find((p: { id: string }) => p.id === targetUserId)
      : null;

    if (!clientProfile) {
      return NextResponse.json(
        { error: `No se encontró el perfil del cliente ${targetUserId}` },
        { status: 404 }
      );
    }

    // Identificar el add-on por el planId de la transacción (fiable), con
    // respaldo por monto para pagos antiguos.
    const updates: Record<string, unknown> = {};
    let addonType = '';

    if (planId === 'addon-store-monthly' || amountCOP === 14900) {
      addonType = 'Store';
    } else if (planId === 'ai-addon-monthly') {
      addonType = 'AI';
    } else if (planId === 'email-addon-monthly') {
      addonType = 'Email';
    } else {
      return NextResponse.json(
        { error: `No se pudo identificar el add-on. planId: ${planId}, monto: ${amountCOP}` },
        { status: 400 }
      );
    }

    // Regla: la Tienda Online requiere plan base activo.
    if (addonType === 'Store' && clientProfile.subscription_status !== 'active') {
      return NextResponse.json(
        {
          error: `El cliente ${clientProfile.email} no tiene el Plan Básico activo (estado: ${clientProfile.subscription_status}). El add-on de Tienda requiere plan base activo. Activa primero el plan.`,
          clientStatus: clientProfile.subscription_status,
        },
        { status: 409 }
      );
    }

    // Expiración: 1 mes desde la fecha del pago.
    const paymentDate = new Date(tx.x_transaction_date || Date.now());
    const expiresAt = new Date(paymentDate);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // Modo previsualización: devolvemos lo que se activaría, sin escribir nada.
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        data: {
          clientEmail: clientProfile.email,
          clientId: targetUserId,
          clientStoreName: clientProfile.store_name || null,
          clientStatus: clientProfile.subscription_status,
          addonType,
          amount: amountCOP,
          refPayco: tx.x_ref_payco,
          transactionDate: tx.x_transaction_date,
          expiresAt: expiresAt.toISOString(),
          alreadyActive:
            (addonType === 'Store' && !!clientProfile.has_store_addon) ||
            (addonType === 'AI' && !!clientProfile.has_ai_addon) ||
            (addonType === 'Email' && !!clientProfile.has_email_addon),
        },
      });
    }

    if (addonType === 'Store') {
      updates.has_store_addon = 1;
      updates.store_addon_expires_at = expiresAt.toISOString();
    } else if (addonType === 'AI') {
      updates.has_ai_addon = 1;
      updates.ai_addon_expires_at = expiresAt.toISOString();
    } else if (addonType === 'Email') {
      updates.has_email_addon = 1;
      updates.email_addon_expires_at = expiresAt.toISOString();
    }
    updates.last_payment_date = paymentDate.toISOString();

    // Actualizar el perfil del cliente (vía Worker, como superadmin)
    const updateRes = await fetch(`${apiUrl}/api/user-profiles/${targetUserId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(updates),
    });
    if (!updateRes.ok) {
      return NextResponse.json(
        { error: `Error al actualizar el perfil del cliente: ${await updateRes.text()}` },
        { status: 500 }
      );
    }

    // Registrar la transacción (idempotencia básica: si ya existe, el Worker
    // debería rechazarla; aquí no fallamos si el registro falla).
    try {
      await fetch(`${apiUrl}/api/payment-transactions`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          user_profile_id: targetUserId,
          epayco_transaction_id: tx.x_transaction_id,
          epayco_ref_payco: tx.x_ref_payco,
          amount: amountCOP,
          currency: tx.x_currency_code || 'COP',
          status: 'Aceptada',
          reference: tx.x_id_invoice || `RECON-${transactionId}`,
          approval_code: tx.x_approval_code || '',
        }),
      });
    } catch (err) {
      console.error('[activate-addon-manually] no se pudo registrar la transacción:', err);
    }

    return NextResponse.json({
      success: true,
      message: `Add-on ${addonType} activado para ${clientProfile.email}`,
      data: {
        clientEmail: clientProfile.email,
        clientId: targetUserId,
        addonType,
        expiresAt: expiresAt.toISOString(),
        refPayco: tx.x_ref_payco,
        amount: amountCOP,
      },
    });
  } catch (error) {
    console.error('[activate-addon-manually] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al activar add-on' },
      { status: 500 }
    );
  }
}
