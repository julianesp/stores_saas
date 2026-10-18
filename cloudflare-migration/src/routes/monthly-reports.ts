/**
 * Informes mensuales de ventas: registro de descargas.
 *
 * El PDF se arma en el navegador (lib/monthly-sales-report.ts); el Worker solo
 * recuerda qué meses ya descargó la tienda, para que el aviso al abrir el
 * sistema no vuelva a salir en ningún dispositivo.
 *
 *   GET  /downloads          -> { months: ['2026-09', ...] }
 *   POST /downloads { month } -> registra la descarga (idempotente)
 */

import { Hono } from 'hono';
import type { Tenant, APIResponse, AppEnv } from '../types';

const app = new Hono<AppEnv>();

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

app.get('/downloads', async (c) => {
  const tenant: Tenant = c.get('tenant');
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT month FROM monthly_report_downloads WHERE tenant_id = ? ORDER BY month DESC'
    )
      .bind(tenant.id)
      .all<{ month: string }>();
    return c.json<APIResponse<{ months: string[] }>>({
      success: true,
      data: { months: (results || []).map((r) => r.month) },
    });
  } catch (error: any) {
    console.error('Error leyendo descargas de informes:', error);
    return c.json<APIResponse>({ success: false, error: 'No se pudieron leer los informes' }, 500);
  }
});

app.post('/downloads', async (c) => {
  const tenant: Tenant = c.get('tenant');
  try {
    const { month } = await c.req.json<{ month?: string }>();
    if (!month || !MONTH_RE.test(month)) {
      return c.json<APIResponse>({ success: false, error: 'Mes inválido (formato YYYY-MM)' }, 400);
    }
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO monthly_report_downloads (tenant_id, month) VALUES (?, ?)'
    )
      .bind(tenant.id, month)
      .run();
    return c.json<APIResponse>({ success: true });
  } catch (error: any) {
    console.error('Error registrando descarga de informe:', error);
    return c.json<APIResponse>({ success: false, error: 'No se pudo registrar la descarga' }, 500);
  }
});

export default app;
