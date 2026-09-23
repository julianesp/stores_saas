/**
 * Copia de seguridad de ventas a Google Drive.
 *
 * Dos routers según el orden del middleware en index.ts:
 *
 *   backupAuth   -> montado DESPUÉS del authMiddleware, bajo /api/backup.
 *                   Rutas del tendero (identificado por c.get('tenant')):
 *                     GET   /settings   -> configuración + estado de la última copia
 *                     PATCH /settings   -> { enabled?, backup_time? }
 *                     GET   /history     -> últimas copias registradas
 *
 *   backupPublic -> montado ANTES del authMiddleware, bajo /api/backup-internal.
 *                   Rutas internas sin JWT de Clerk, protegidas por CRON_SECRET
 *                   (cabecera X-Cron-Secret). Las llaman el flujo OAuth de Next.js
 *                   y el cron del Worker:
 *                     POST /credentials       -> guarda refresh_token + carpeta (tras OAuth)
 *                     POST /disconnect        -> borra credenciales
 *                     GET  /credentials/:id   -> lee credenciales de un tenant (para refrescar)
 *                     GET  /due?hour=HH       -> tenants a respaldar a esa hora Colombia
 *                     GET  /pending-yesterday -> copias de ayer no subidas (verificación matutina)
 *                     POST /record            -> registra el resultado de una copia
 *
 * El Excel se genera y se sube a Drive en Next.js (ExcelJS + SDK de Google no
 * están en el runtime del Worker); el Worker solo guarda estado en D1.
 */

import { Hono } from 'hono';
import type { Env } from '../types';

// --- Router autenticado (tendero) -------------------------------------------

const backupAuth = new Hono<{ Bindings: Env }>();

function getTenantId(c: any): string | null {
  const tenant = c.get('tenant');
  return tenant?.id || null;
}

// GET /settings - configuración del tenant + estado de la última copia
backupAuth.get('/settings', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ success: false, error: 'No tenant' }, 400);

  const settings = await c.env.DB
    .prepare(
      `SELECT enabled, backup_time, google_email, drive_folder_id, connected_at
       FROM drive_backup_settings WHERE user_profile_id = ?`
    )
    .bind(tenantId)
    .first<any>();

  const lastBackup = await c.env.DB
    .prepare(
      `SELECT backup_date, status, drive_file_link, sales_count, uploaded_at, last_error
       FROM drive_backups WHERE user_profile_id = ?
       ORDER BY backup_date DESC LIMIT 1`
    )
    .bind(tenantId)
    .first<any>();

  return c.json({
    success: true,
    data: {
      connected: !!settings?.google_email,
      enabled: settings?.enabled === 1,
      backup_time: settings?.backup_time || '22:00',
      google_email: settings?.google_email || null,
      connected_at: settings?.connected_at || null,
      last_backup: lastBackup || null,
    },
  });
});

// PATCH /settings - actualiza enabled y/o backup_time
backupAuth.patch('/settings', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ success: false, error: 'No tenant' }, 400);

  const body = await c.req
    .json<{ enabled?: boolean | number; backup_time?: string }>()
    .catch(() => ({} as any));

  const updates: string[] = [];
  const values: any[] = [];

  if (body.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(body.enabled ? 1 : 0);
  }
  if (typeof body.backup_time === 'string' && /^\d{2}:\d{2}$/.test(body.backup_time)) {
    updates.push('backup_time = ?');
    values.push(body.backup_time);
  }
  if (updates.length === 0) return c.json({ success: false, error: 'Nada que actualizar' }, 400);

  const now = new Date().toISOString();
  updates.push('updated_at = ?');
  values.push(now);

  // Upsert: la fila puede no existir aún si el tendero ajusta la hora antes de conectar.
  await c.env.DB
    .prepare(
      `INSERT INTO drive_backup_settings (user_profile_id, enabled, backup_time, created_at, updated_at)
       VALUES (?, 0, '22:00', ?, ?)
       ON CONFLICT(user_profile_id) DO UPDATE SET ${updates.join(', ')}`
    )
    .bind(tenantId, now, now, ...values)
    .run();

  return c.json({ success: true });
});

// GET /history - últimas copias registradas
backupAuth.get('/history', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ success: false, error: 'No tenant' }, 400);

  const rows = await c.env.DB
    .prepare(
      `SELECT backup_date, status, drive_file_link, sales_count, attempts, uploaded_at, last_error
       FROM drive_backups WHERE user_profile_id = ?
       ORDER BY backup_date DESC LIMIT 30`
    )
    .bind(tenantId)
    .all();

  return c.json({ success: true, data: rows.results || [] });
});

// --- Router interno (cron / OAuth de Next.js) -------------------------------

const backupPublic = new Hono<{ Bindings: Env }>();

// Todas las rutas internas exigen el CRON_SECRET si está configurado.
backupPublic.use('/*', async (c, next) => {
  if (c.env.CRON_SECRET) {
    const provided = c.req.header('X-Cron-Secret');
    if (provided !== c.env.CRON_SECRET) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
  }
  await next();
});

// POST /credentials - guarda las credenciales de Google tras el OAuth (upsert)
backupPublic.post('/credentials', async (c) => {
  const body = await c.req
    .json<{
      user_profile_id: string;
      google_email: string;
      google_refresh_token: string;
      drive_folder_id: string;
    }>()
    .catch(() => null);

  if (!body?.user_profile_id || !body.google_refresh_token) {
    return c.json({ success: false, error: 'Faltan datos' }, 400);
  }

  const now = new Date().toISOString();
  await c.env.DB
    .prepare(
      `INSERT INTO drive_backup_settings
         (user_profile_id, enabled, backup_time, google_email, google_refresh_token, drive_folder_id, connected_at, created_at, updated_at)
       VALUES (?, 1, '22:00', ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_profile_id) DO UPDATE SET
         enabled = 1,
         google_email = excluded.google_email,
         google_refresh_token = excluded.google_refresh_token,
         drive_folder_id = excluded.drive_folder_id,
         connected_at = excluded.connected_at,
         updated_at = excluded.updated_at`
    )
    .bind(
      body.user_profile_id,
      body.google_email || null,
      body.google_refresh_token,
      body.drive_folder_id || null,
      now,
      now,
      now
    )
    .run();

  return c.json({ success: true });
});

// POST /disconnect - borra las credenciales de Google del tenant
backupPublic.post('/disconnect', async (c) => {
  const body = await c.req.json<{ user_profile_id: string }>().catch(() => null);
  if (!body?.user_profile_id) return c.json({ success: false, error: 'Falta user_profile_id' }, 400);

  await c.env.DB
    .prepare(
      `UPDATE drive_backup_settings
       SET enabled = 0, google_email = NULL, google_refresh_token = NULL,
           drive_folder_id = NULL, connected_at = NULL, updated_at = ?
       WHERE user_profile_id = ?`
    )
    .bind(new Date().toISOString(), body.user_profile_id)
    .run();

  return c.json({ success: true });
});

// GET /credentials/:id - lee credenciales de un tenant (para refrescar el token)
backupPublic.get('/credentials/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB
    .prepare(
      `SELECT s.user_profile_id, s.google_email, s.google_refresh_token, s.drive_folder_id,
              up.store_name
       FROM drive_backup_settings s
       JOIN user_profiles up ON up.id = s.user_profile_id
       WHERE s.user_profile_id = ?`
    )
    .bind(id)
    .first<any>();

  if (!row?.google_refresh_token) {
    return c.json({ success: false, error: 'No conectado' }, 404);
  }
  return c.json({ success: true, data: row });
});

// GET /due?hour=HH - tenants con respaldo activo cuya backup_time cae en esa hora
backupPublic.get('/due', async (c) => {
  const hour = c.req.query('hour'); // "22" (hora Colombia)
  if (!hour || !/^\d{2}$/.test(hour)) {
    return c.json({ success: false, error: 'hour inválida' }, 400);
  }

  const rows = await c.env.DB
    .prepare(
      `SELECT user_profile_id
       FROM drive_backup_settings
       WHERE enabled = 1
         AND google_refresh_token IS NOT NULL
         AND substr(backup_time, 1, 2) = ?`
    )
    .bind(hour)
    .all();

  return c.json({ success: true, data: rows.results || [] });
});

// GET /pending-yesterday - tenants conectados sin copia 'uploaded' de ayer
backupPublic.get('/pending-yesterday', async (c) => {
  const date = c.req.query('date'); // YYYY-MM-DD (ayer, hora Colombia) — lo calcula el cron
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ success: false, error: 'date inválida' }, 400);
  }

  // Tenants activos y conectados que NO tienen una copia 'uploaded' para esa fecha.
  const rows = await c.env.DB
    .prepare(
      `SELECT s.user_profile_id
       FROM drive_backup_settings s
       WHERE s.enabled = 1
         AND s.google_refresh_token IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM drive_backups b
           WHERE b.user_profile_id = s.user_profile_id
             AND b.backup_date = ?
             AND b.status = 'uploaded'
         )`
    )
    .bind(date)
    .all();

  return c.json({ success: true, data: rows.results || [] });
});

// GET /sales-for-day?id=<user_profile_id>&date=YYYY-MM-DD
// Ventas del día (zona Colombia) de un tenant, con sus ítems. Lo consume el
// endpoint de Next.js que arma el Excel. Autenticado por CRON_SECRET (no JWT).
backupPublic.get('/sales-for-day', async (c) => {
  const id = c.req.query('id');
  const date = c.req.query('date');
  if (!id || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ success: false, error: 'Parámetros inválidos' }, 400);
  }

  // created_at se guarda en UTC. Un día Colombia [00:00, 24:00) UTC-5 equivale a
  // [date 05:00 UTC, date+1 05:00 UTC). Filtramos por ese rango.
  const start = `${date}T05:00:00.000Z`;
  const nextDay = new Date(new Date(`${date}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const end = `${nextDay}T05:00:00.000Z`;

  const sales = await c.env.DB
    .prepare(
      `SELECT s.id, s.total, s.subtotal, s.payment_method, s.payment_status,
              s.status, s.created_at, s.customer_id,
              c.name AS customer_name
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id AND c.tenant_id = s.tenant_id
       WHERE s.tenant_id = ?
         AND s.created_at >= ? AND s.created_at < ?
       ORDER BY s.created_at ASC`
    )
    .bind(id, start, end)
    .all();

  const saleRows = (sales.results || []) as any[];

  // Ítems de esas ventas (una consulta por el rango, agrupados en memoria).
  const items = await c.env.DB
    .prepare(
      `SELECT si.sale_id, si.quantity, si.unit_price, si.subtotal,
              COALESCE(p.name, 'Producto desconocido') AS product_name
       FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.id AND si.tenant_id = p.tenant_id
       WHERE si.tenant_id = ?
         AND si.sale_id IN (SELECT id FROM sales WHERE tenant_id = ? AND created_at >= ? AND created_at < ?)`
    )
    .bind(id, id, start, end)
    .all();

  const itemsBySale = new Map<string, any[]>();
  for (const it of (items.results || []) as any[]) {
    if (!itemsBySale.has(it.sale_id)) itemsBySale.set(it.sale_id, []);
    itemsBySale.get(it.sale_id)!.push(it);
  }

  const data = saleRows.map((s) => ({ ...s, items: itemsBySale.get(s.id) || [] }));
  return c.json({ success: true, data });
});

// POST /record - registra el resultado de una copia (upsert por user+fecha)
backupPublic.post('/record', async (c) => {
  const body = await c.req
    .json<{
      user_profile_id: string;
      backup_date: string;
      status: 'uploaded' | 'failed';
      drive_file_id?: string;
      drive_file_link?: string;
      sales_count?: number;
      error?: string;
    }>()
    .catch(() => null);

  if (!body?.user_profile_id || !body.backup_date || !body.status) {
    return c.json({ success: false, error: 'Faltan datos' }, 400);
  }

  const now = new Date().toISOString();
  const uploadedAt = body.status === 'uploaded' ? now : null;

  await c.env.DB
    .prepare(
      `INSERT INTO drive_backups
         (id, user_profile_id, backup_date, status, drive_file_id, drive_file_link,
          sales_count, attempts, last_error, uploaded_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
       ON CONFLICT(user_profile_id, backup_date) DO UPDATE SET
         status = excluded.status,
         drive_file_id = COALESCE(excluded.drive_file_id, drive_backups.drive_file_id),
         drive_file_link = COALESCE(excluded.drive_file_link, drive_backups.drive_file_link),
         sales_count = excluded.sales_count,
         attempts = drive_backups.attempts + 1,
         last_error = excluded.last_error,
         uploaded_at = COALESCE(excluded.uploaded_at, drive_backups.uploaded_at),
         updated_at = excluded.updated_at`
    )
    .bind(
      crypto.randomUUID(),
      body.user_profile_id,
      body.backup_date,
      body.status,
      body.drive_file_id || null,
      body.drive_file_link || null,
      body.sales_count || 0,
      body.status === 'failed' ? body.error || 'Error desconocido' : null,
      uploadedAt,
      now,
      now
    )
    .run();

  return c.json({ success: true });
});

export { backupAuth, backupPublic };
