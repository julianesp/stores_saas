/**
 * ePayco Storefront Routes
 * Endpoints públicos para pagos con ePayco en tiendas online de comerciantes
 */

import { Hono } from 'hono';
import type { Env, APIResponse } from '../types';

const app = new Hono<{ Bindings: Env }>();

// POST /api/storefront/epayco/create-session/:slug
// Crea una sesión de checkout de ePayco usando las credenciales del comerciante
app.post('/create-session/:slug', async (c) => {
  const slug = c.req.param('slug');

  try {
    const body = await c.req.json();
    const { order_id, order_number, amount, currency = 'COP', customer_email, customer_name, customer_phone, description } = body;

    if (!order_id || !order_number || !amount) {
      return c.json<APIResponse>({
        success: false,
        error: 'Faltan campos requeridos: order_id, order_number, amount',
      }, 400);
    }

    // Obtener credenciales ePayco del comerciante por slug
    const store = await c.env.DB.prepare(
      `SELECT id, store_name, epayco_public_key, epayco_private_key, epayco_customer_id, epayco_enabled
       FROM user_profiles
       WHERE store_slug = ? AND store_enabled = 1`
    )
      .bind(slug)
      .first<{
        id: string;
        store_name?: string;
        epayco_public_key?: string;
        epayco_private_key?: string;
        epayco_customer_id?: string;
        epayco_enabled: number;
      }>();

    if (!store) {
      return c.json<APIResponse>({
        success: false,
        error: 'Tienda no encontrada o deshabilitada',
      }, 404);
    }

    if (!store.epayco_enabled) {
      return c.json<APIResponse>({
        success: false,
        error: 'Pagos con ePayco no habilitados para esta tienda',
      }, 400);
    }

    if (!store.epayco_public_key || !store.epayco_private_key || !store.epayco_customer_id) {
      return c.json<APIResponse>({
        success: false,
        error: 'Credenciales de ePayco no configuradas',
      }, 400);
    }

    // Autenticarse con ePayco Apify
    const loginResponse = await fetch('https://apify.epayco.co/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: store.epayco_public_key,
        privateKey: store.epayco_private_key,
      }),
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text().catch(() => '');
      console.error('ePayco login error:', loginResponse.status, errorText);
      return c.json<APIResponse>({
        success: false,
        error: 'Error al autenticarse con ePayco',
      }, 502);
    }

    const loginData = await loginResponse.json() as any;
    const apifyToken = loginData?.token || loginData?.bearer_token;

    if (!apifyToken) {
      console.error('ePayco login response missing token:', JSON.stringify(loginData));
      return c.json<APIResponse>({
        success: false,
        error: 'No se obtuvo token de ePayco',
      }, 502);
    }

    // Construir URL de confirmación
    const confirmationUrl = `https://posib.dev/store/${slug}/payment-confirmation`;

    // Crear sesión de checkout en ePayco
    const sessionResponse = await fetch('https://apify.epayco.co/payment/session/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apifyToken}`,
      },
      body: JSON.stringify({
        p_cust_id_cliente: store.epayco_customer_id,
        p_key: store.epayco_public_key,
        p_amount: String(amount),
        p_currency_code: currency,
        p_description: description || `Pedido ${order_number}${customer_name ? ` - ${customer_name}` : ''}`,
        p_extra1: order_id,
        p_extra2: order_number,
        p_extra3: slug,
        p_email_billing: customer_email || '',
        p_name_billing: customer_name || '',
        p_phone_billing: customer_phone || '',
        p_url_response: confirmationUrl,
        p_url_confirmation: confirmationUrl,
        p_ref_payco: order_number,
      }),
    });

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text().catch(() => '');
      console.error('ePayco session error:', sessionResponse.status, errorText);
      return c.json<APIResponse>({
        success: false,
        error: 'Error al crear sesión de pago en ePayco',
      }, 502);
    }

    const sessionData = await sessionResponse.json() as any;
    const sessionId = sessionData?.sessionId || sessionData?.data?.sessionId || sessionData?.id;

    if (!sessionId) {
      console.error('ePayco session response missing sessionId:', JSON.stringify(sessionData));
      return c.json<APIResponse>({
        success: false,
        error: 'No se obtuvo sessionId de ePayco',
      }, 502);
    }

    // Guardar referencia de la sesión en las notas del pedido
    await c.env.DB.prepare(
      `UPDATE sales
       SET notes = COALESCE(notes, '') || '\nePayco Session ID: ' || ?
       WHERE id = ? AND tenant_id = ?`
    )
      .bind(sessionId, order_id, store.id)
      .run();

    return c.json<APIResponse>({
      success: true,
      data: {
        session_id: sessionId,
      },
    });

  } catch (error: any) {
    console.error('Error creating ePayco session:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Error al crear sesión de pago',
    }, 500);
  }
});

// GET /api/storefront/epayco/transaction/:refPayco
// Consulta el estado de una transacción ePayco por ref_payco
app.get('/transaction/:refPayco', async (c) => {
  const refPayco = c.req.param('refPayco');

  try {
    if (!refPayco) {
      return c.json<APIResponse>({
        success: false,
        error: 'refPayco es requerido',
      }, 400);
    }

    // Consultar estado de la transacción en ePayco
    const epaycoResponse = await fetch(
      `https://secure.epayco.co/validation/v1/reference/${encodeURIComponent(refPayco)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!epaycoResponse.ok) {
      const errorText = await epaycoResponse.text().catch(() => '');
      console.error('ePayco transaction lookup error:', epaycoResponse.status, errorText);
      return c.json<APIResponse>({
        success: false,
        error: 'Error al consultar transacción en ePayco',
      }, 502);
    }

    const epaycoData = await epaycoResponse.json() as any;

    if (!epaycoData?.success) {
      return c.json<APIResponse>({
        success: false,
        error: epaycoData?.titleResponse || 'Transacción no encontrada',
      }, 404);
    }

    const tx = epaycoData.data;

    // Normalizar estado ePayco a valores internos
    const stateMap: Record<string, string> = {
      'Aceptada': 'APPROVED',
      'Rechazada': 'DECLINED',
      'Pendiente': 'PENDING',
      'Fallida': 'DECLINED',
      'Cancelada': 'DECLINED',
      'Revertida': 'DECLINED',
    };

    const normalizedStatus = stateMap[tx?.x_transaction_state] || 'PENDING';

    return c.json<APIResponse>({
      success: true,
      data: {
        ref_payco: tx?.x_ref_payco,
        transaction_id: tx?.x_transaction_id,
        status: normalizedStatus,
        status_raw: tx?.x_transaction_state,
        amount: parseFloat(tx?.x_amount || '0'),
        currency: tx?.x_currency_code,
        payment_method: tx?.x_franchise || tx?.x_type_payment,
        approval_code: tx?.x_approval_code,
        transaction_date: tx?.x_transaction_date,
        bank_name: tx?.x_bank_name,
        description: tx?.x_description,
        extra1: tx?.x_extra1,
        extra2: tx?.x_extra2,
        extra3: tx?.x_extra3,
        customer_email: tx?.x_customer_email || tx?.x_cardnumber,
        error_code: tx?.x_error_code,
        error_code_ewallet: tx?.x_error_code_ewallet,
      },
    });

  } catch (error: any) {
    console.error('Error fetching ePayco transaction:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Error al consultar transacción',
    }, 500);
  }
});

export default app;
