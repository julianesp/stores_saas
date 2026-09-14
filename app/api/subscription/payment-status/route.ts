import { NextRequest, NextResponse } from 'next/server';

/**
 * Consulta el estado REAL de una transacción en ePayco a partir del ref_payco.
 *
 * Existe porque ePayco Smart Checkout v2 no siempre incluye x_transaction_state
 * en la redirección del navegador. Si la UI decidiera "aprobado/rechazado" solo
 * con los query params, un pago aprobado podría mostrarse como "Pago Rechazado"
 * (le pasó a un cliente real: Nequi le cobró, ePayco aprobó, y posib mostró
 * rechazado). Aquí consultamos la fuente de verdad de ePayco.
 *
 * Endpoint de validación público de ePayco (no requiere credenciales):
 *   GET https://secure.epayco.co/validation/v1/reference/{ref_payco}
 *
 * NO activa nada: la activación de la suscripción la hace el webhook de
 * confirmación (/api/webhooks/epayco). Esto es solo para mostrar la pantalla
 * correcta al usuario que regresa del checkout.
 */
export async function GET(req: NextRequest) {
  const refPayco = req.nextUrl.searchParams.get('ref_payco');

  if (!refPayco) {
    return NextResponse.json(
      { error: 'Falta ref_payco' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://secure.epayco.co/validation/v1/reference/${encodeURIComponent(refPayco)}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!res.ok) {
      // No pudimos consultar: devolvemos 'unknown' para que la UI no afirme un
      // rechazo falso; que muestre "verificando" o invite a reintentar.
      return NextResponse.json({ state: 'unknown' }, { status: 200 });
    }

    const json = await res.json();
    const data = json?.data;

    // ePayco: x_cod_response 1 = Aceptada, 2 = Rechazada, 3 = Pendiente,
    // 4 = Fallida, 6/7/... otros. Preferimos el código numérico por robustez.
    const codResponse = Number(data?.x_cod_response ?? data?.x_cod_respuesta);
    const stateText: string = data?.x_transaction_state || data?.x_response || '';

    let state: 'approved' | 'rejected' | 'pending' | 'unknown';
    if (codResponse === 1 || stateText === 'Aceptada') {
      state = 'approved';
    } else if (codResponse === 3 || stateText === 'Pendiente') {
      state = 'pending';
    } else if (codResponse === 2 || codResponse === 4 || stateText === 'Rechazada' || stateText === 'Fallida') {
      state = 'rejected';
    } else {
      state = 'unknown';
    }

    return NextResponse.json({
      state,
      refPayco: data?.x_ref_payco ?? refPayco,
      amount: data?.x_amount ?? null,
      reasonText: data?.x_response_reason_text ?? null,
      transactionId: data?.x_transaction_id ?? null,
    });
  } catch (error) {
    console.error('[payment-status] error consultando ePayco:', error);
    // Ante un fallo de red, no afirmamos rechazo: 'unknown'.
    return NextResponse.json({ state: 'unknown' }, { status: 200 });
  }
}
