import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SUBSCRIPTION_PLANS } from '@/lib/epayco';
import type { SubscriptionReceipt } from '@/lib/subscription-receipt-pdf';

/**
 * Datos del comprobante de pago de una suscripción, para armar el PDF en la
 * página de pago exitoso.
 *
 * La redirección de ePayco solo trae `ref_payco` (sin monto, fecha ni código),
 * así que la fuente de verdad es la validación pública de ePayco por referencia.
 * Solo se entrega si el pago está APROBADO y pertenece a quien lo pide
 * (x_extra1 = su user_profile.id): el comprobante lleva nombre, documento y
 * correo del pagador, no debe poder sacarlo cualquiera con la referencia.
 */

const API_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value);
}

export async function GET(req: NextRequest) {
  const authResult = await auth();
  if (!authResult.userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const sessionRef = req.nextUrl.searchParams.get('ref_payco')?.trim();
  if (!sessionRef) {
    return NextResponse.json({ error: 'Falta ref_payco' }, { status: 400 });
  }

  try {
    // Perfil propio (sin X-Tenant-ID: el Worker resuelve el del usuario).
    const token = await authResult.getToken();
    const profileRes = await fetch(`${API_URL}/api/user-profiles`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!profileRes.ok) {
      return NextResponse.json({ error: 'No se pudo leer tu perfil' }, { status: 502 });
    }
    const profileJson = await profileRes.json();
    const profile = profileJson?.data ?? profileJson;

    const epaycoRes = await fetch(
      `https://secure.epayco.co/validation/v1/reference/${encodeURIComponent(sessionRef)}`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' },
    );
    if (!epaycoRes.ok) {
      return NextResponse.json({ error: 'ePayco no respondió, intenta de nuevo' }, { status: 502 });
    }
    const data = (await epaycoRes.json())?.data;

    const approved =
      Number(data?.x_cod_response ?? data?.x_cod_respuesta) === 1 ||
      data?.x_transaction_state === 'Aceptada';
    if (!data || !approved) {
      return NextResponse.json({ error: 'El pago no está aprobado' }, { status: 409 });
    }

    const ownsPayment = text(data.x_extra1) === profile?.id || profile?.is_superadmin === 1 || profile?.is_superadmin === true;
    if (!ownsPayment) {
      return NextResponse.json({ error: 'Este pago no pertenece a tu cuenta' }, { status: 403 });
    }

    const planId = text(data.x_extra2);
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    const isAddon = !!plan?.isAddon;
    const validUntil =
      planId === 'addon-store-monthly'
        ? profile?.store_addon_expires_at
        : planId === 'ai-addon-monthly'
          ? profile?.ai_addon_expires_at
          : profile?.next_billing_date;

    const bank = text(data.x_bank_name);
    const franchise = text(data.x_franchise);
    const card = text(data.x_cardnumber);
    // Con tarjeta, ePayco devuelve el número enmascarado (p. ej. 457562******0326).
    const maskedCard = /\*/.test(card) ? card : '';
    const paymentMethod = [franchise, bank && bank !== franchise ? bank : '', maskedCard]
      .filter(Boolean)
      .join(' · ') || 'ePayco';

    const receipt: SubscriptionReceipt = {
      refPayco: text(data.x_ref_payco) || sessionRef,
      sessionRef,
      transactionId: text(data.x_transaction_id) || null,
      approvalCode: text(data.x_approval_code) || null,
      transactionDate: text(data.x_transaction_date) || text(data.x_fecha_transaccion) || null,
      amount: Number(data.x_amount) || 0,
      tax: Number(data.x_tax) || 0,
      currency: text(data.x_currency_code) || 'COP',
      paymentMethod,
      planName: plan?.name ?? 'Suscripción posib.dev',
      isAddon,
      customer: {
        name: [text(data.x_customer_name), text(data.x_customer_lastname)].filter(Boolean).join(' ') || text(profile?.full_name) || text(profile?.email),
        document: text(data.x_customer_document)
          ? [text(data.x_customer_doctype), text(data.x_customer_document)].filter(Boolean).join(' ')
          : null,
        email: text(data.x_customer_email) || text(profile?.email) || null,
      },
      storeName: text(profile?.store_name) || null,
      validUntil: validUntil || null,
    };

    return NextResponse.json(receipt);
  } catch (error) {
    console.error('[subscription/receipt] error:', error);
    return NextResponse.json({ error: 'No se pudo generar el comprobante' }, { status: 500 });
  }
}
