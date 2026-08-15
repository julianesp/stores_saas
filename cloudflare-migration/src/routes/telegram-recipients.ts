/**
 * Telegram recipients (autenticado)
 *
 * CRUD de destinatarios adicionales de Telegram por tienda. El dueño gestiona
 * aquí a quién más se le envían las notificaciones (empleada, socios, etc.).
 * Se monta DESPUÉS del authMiddleware, así que `c.get('tenant')` identifica al
 * dueño. La vinculación (conectar el chat) la hace cada persona con su código
 * vía el webhook público del bot.
 *
 * Rutas (bajo /api/telegram-recipients):
 *   GET    /            -> lista los destinatarios del tenant
 *   POST   /            -> crea un destinatario { name } y devuelve su link_code
 *   POST   /:id/code    -> regenera el código de un destinatario
 *   PATCH  /:id         -> actualiza { name?, enabled? }
 *   DELETE /:id         -> elimina un destinatario
 */

import { Hono } from 'hono';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

// Código legible sin caracteres ambiguos (mismo alfabeto que el front)
function generateLinkCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < bytes.length; i++) code += alphabet[bytes[i] % alphabet.length];
  return code;
}

function getTenantId(c: any): string | null {
  const tenant = c.get('tenant');
  return tenant?.id || null;
}

// GET / - lista destinatarios del tenant
app.get('/', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ success: false, error: 'No tenant' }, 400);

  const rows = await c.env.DB
    .prepare(
      `SELECT id, name, chat_id, link_code, enabled, created_at
       FROM telegram_recipients WHERE tenant_id = ? ORDER BY created_at ASC`
    )
    .bind(tenantId)
    .all();

  return c.json({ success: true, data: rows.results || [] });
});

// POST / - crea un destinatario y devuelve su código de vinculación
app.post('/', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ success: false, error: 'No tenant' }, 400);

  const body = await c.req.json<{ name?: string }>().catch(() => ({} as any));
  const name = (body.name || '').trim();
  if (!name) return c.json({ success: false, error: 'El nombre es obligatorio' }, 400);

  const id = crypto.randomUUID();
  const code = generateLinkCode();
  const now = new Date().toISOString();

  await c.env.DB
    .prepare(
      `INSERT INTO telegram_recipients (id, tenant_id, name, link_code, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`
    )
    .bind(id, tenantId, name, code, now, now)
    .run();

  return c.json({ success: true, data: { id, name, link_code: code, chat_id: null, enabled: 1 } });
});

// POST /:id/code - regenera el código de vinculación de un destinatario
app.post('/:id/code', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ success: false, error: 'No tenant' }, 400);
  const id = c.req.param('id');

  const code = generateLinkCode();
  const res = await c.env.DB
    .prepare(
      `UPDATE telegram_recipients SET link_code = ?, updated_at = ?
       WHERE id = ? AND tenant_id = ?`
    )
    .bind(code, new Date().toISOString(), id, tenantId)
    .run();

  if (!res.meta.changes) return c.json({ success: false, error: 'No encontrado' }, 404);
  return c.json({ success: true, data: { id, link_code: code } });
});

// PATCH /:id - actualiza name y/o enabled
app.patch('/:id', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ success: false, error: 'No tenant' }, 400);
  const id = c.req.param('id');
  const body = await c.req.json<{ name?: string; enabled?: number | boolean }>().catch(() => ({} as any));

  const updates: string[] = [];
  const values: any[] = [];
  if (typeof body.name === 'string' && body.name.trim()) {
    updates.push('name = ?');
    values.push(body.name.trim());
  }
  if (body.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(body.enabled ? 1 : 0);
  }
  if (updates.length === 0) return c.json({ success: false, error: 'Nada que actualizar' }, 400);

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id, tenantId);

  const res = await c.env.DB
    .prepare(`UPDATE telegram_recipients SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`)
    .bind(...values)
    .run();

  if (!res.meta.changes) return c.json({ success: false, error: 'No encontrado' }, 404);
  return c.json({ success: true });
});

// DELETE /:id - elimina un destinatario
app.delete('/:id', async (c) => {
  const tenantId = getTenantId(c);
  if (!tenantId) return c.json({ success: false, error: 'No tenant' }, 400);
  const id = c.req.param('id');

  const res = await c.env.DB
    .prepare('DELETE FROM telegram_recipients WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .run();

  if (!res.meta.changes) return c.json({ success: false, error: 'No encontrado' }, 404);
  return c.json({ success: true });
});

export default app;
