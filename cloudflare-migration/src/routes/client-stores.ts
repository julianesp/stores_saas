/**
 * Client Stores Routes - Gestión del catálogo de tiendas clientes de la landing.
 *
 * Cada tienda puede tener, opcionalmente, un PERFIL PÚBLICO independiente
 * (imagen + contacto + enlace a Google Maps). El perfil se activa/desactiva por
 * tienda con `profile_enabled` y no tiene relación con la Tienda Online de pago.
 *
 * Todas las rutas de este archivo requieren autenticación (authMiddleware) y ser
 * superadmin. El perfil público se sirve desde stats.ts (sin autenticación).
 */

import { Hono } from 'hono';
import type { Env, APIResponse, Tenant } from '../types';

const app = new Hono<{ Bindings: Env }>();

interface ClientStoreRow {
  id: string;
  name: string;
  location: string;
  image_url: string | null;
  sort_order: number;
  is_active: number;
  slug: string | null;
  profile_enabled: number;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  facebook: string | null;
  instagram: string | null;
  maps_url: string | null;
  created_at: string;
  updated_at: string;
}

interface StoreInput {
  name?: string;
  location?: string;
  image?: string;
  sortOrder?: number;
  isActive?: boolean;
  profileEnabled?: boolean;
  slug?: string;
  description?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  facebook?: string;
  instagram?: string;
  mapsUrl?: string;
}

/**
 * Verifica que el usuario autenticado sea superadmin.
 * Devuelve una Response de error si no lo es, o null si tiene permiso.
 */
async function ensureSuperAdmin(c: any): Promise<Response | null> {
  const tenant: Tenant = c.get('tenant');
  const clerkUserId = (tenant as any).clerk_user_id;

  const profile = await c.env.DB.prepare(
    'SELECT is_superadmin FROM user_profiles WHERE clerk_user_id = ?'
  )
    .bind(clerkUserId)
    .first<{ is_superadmin: number }>();

  if (!profile?.is_superadmin) {
    return c.json<APIResponse<null>>(
      {
        success: false,
        error: 'No tienes permisos para gestionar las tiendas clientes',
        data: null,
      },
      403
    );
  }

  return null;
}

/** Convierte un texto en un slug URL-safe (minúsculas, guiones). */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos (marcas diacríticas)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Genera un slug único a partir de una base, evitando colisiones con otras
 * tiendas. `excludeId` permite conservar el slug de la propia tienda al editar.
 */
async function uniqueSlug(
  c: any,
  base: string,
  excludeId?: string
): Promise<string> {
  const root = slugify(base) || 'tienda';
  let candidate = root;
  let n = 1;

  // Reintenta con sufijos -2, -3... hasta encontrar uno libre.
  while (true) {
    const clash = await c.env.DB.prepare(
      'SELECT id FROM client_stores WHERE slug = ? AND id != ?'
    )
      .bind(candidate, excludeId || '')
      .first<{ id: string }>();

    if (!clash) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

function serialize(row: ClientStoreRow) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    image: row.image_url || '',
    sortOrder: row.sort_order,
    isActive: row.is_active === 1,
    slug: row.slug || '',
    profileEnabled: row.profile_enabled === 1,
    description: row.description || '',
    address: row.address || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    facebook: row.facebook || '',
    instagram: row.instagram || '',
    mapsUrl: row.maps_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function clean(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * GET /api/client-stores
 * Lista todas las tiendas (activas e inactivas) para el panel del superadmin.
 */
app.get('/', async (c) => {
  const denied = await ensureSuperAdmin(c);
  if (denied) return denied;

  const result = await c.env.DB.prepare(
    `SELECT * FROM client_stores ORDER BY sort_order ASC, created_at ASC`
  ).all<ClientStoreRow>();

  const stores = (result.results || []).map(serialize);
  return c.json<APIResponse<typeof stores>>({ success: true, data: stores });
});

/**
 * POST /api/client-stores
 * Crea una nueva tienda cliente.
 */
app.post('/', async (c) => {
  const denied = await ensureSuperAdmin(c);
  if (denied) return denied;

  const body = await c.req.json<StoreInput>();

  const name = body.name?.trim();
  const location = body.location?.trim();

  if (!name || !location) {
    return c.json<APIResponse<null>>(
      { success: false, error: 'Nombre y ubicación son obligatorios', data: null },
      400
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const slug = await uniqueSlug(c, body.slug?.trim() || name);

  await c.env.DB.prepare(
    `INSERT INTO client_stores (
       id, name, location, image_url, sort_order, is_active,
       slug, profile_enabled, description, address, phone, whatsapp,
       email, facebook, instagram, maps_url, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      name,
      location,
      clean(body.image),
      body.sortOrder ?? 0,
      body.isActive === false ? 0 : 1,
      slug,
      body.profileEnabled ? 1 : 0,
      clean(body.description),
      clean(body.address),
      clean(body.phone),
      clean(body.whatsapp),
      clean(body.email),
      clean(body.facebook),
      clean(body.instagram),
      clean(body.mapsUrl),
      now,
      now
    )
    .run();

  const created = await c.env.DB.prepare('SELECT * FROM client_stores WHERE id = ?')
    .bind(id)
    .first<ClientStoreRow>();

  return c.json<APIResponse<any>>({ success: true, data: serialize(created!) }, 201);
});

/**
 * PUT /api/client-stores/:id
 * Actualiza una tienda cliente existente.
 */
app.put('/:id', async (c) => {
  const denied = await ensureSuperAdmin(c);
  if (denied) return denied;

  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM client_stores WHERE id = ?')
    .bind(id)
    .first<ClientStoreRow>();

  if (!existing) {
    return c.json<APIResponse<null>>(
      { success: false, error: 'Tienda no encontrada', data: null },
      404
    );
  }

  const body = await c.req.json<StoreInput>();

  const name = body.name !== undefined ? body.name.trim() : existing.name;
  const location = body.location !== undefined ? body.location.trim() : existing.location;

  if (!name || !location) {
    return c.json<APIResponse<null>>(
      { success: false, error: 'Nombre y ubicación no pueden quedar vacíos', data: null },
      400
    );
  }

  // Recalcula el slug si se pidió uno nuevo o si aún no tiene.
  let slug = existing.slug || (await uniqueSlug(c, name, id));
  if (body.slug !== undefined && body.slug.trim()) {
    slug = await uniqueSlug(c, body.slug.trim(), id);
  }

  const pick = (input: string | undefined, current: string | null) =>
    input !== undefined ? clean(input) : current;

  await c.env.DB.prepare(
    `UPDATE client_stores SET
       name = ?, location = ?, image_url = ?, sort_order = ?, is_active = ?,
       slug = ?, profile_enabled = ?, description = ?, address = ?, phone = ?,
       whatsapp = ?, email = ?, facebook = ?, instagram = ?, maps_url = ?,
       updated_at = ?
     WHERE id = ?`
  )
    .bind(
      name,
      location,
      body.image !== undefined ? clean(body.image) : existing.image_url,
      body.sortOrder ?? existing.sort_order,
      body.isActive !== undefined ? (body.isActive ? 1 : 0) : existing.is_active,
      slug,
      body.profileEnabled !== undefined
        ? body.profileEnabled
          ? 1
          : 0
        : existing.profile_enabled,
      pick(body.description, existing.description),
      pick(body.address, existing.address),
      pick(body.phone, existing.phone),
      pick(body.whatsapp, existing.whatsapp),
      pick(body.email, existing.email),
      pick(body.facebook, existing.facebook),
      pick(body.instagram, existing.instagram),
      pick(body.mapsUrl, existing.maps_url),
      new Date().toISOString(),
      id
    )
    .run();

  const updated = await c.env.DB.prepare('SELECT * FROM client_stores WHERE id = ?')
    .bind(id)
    .first<ClientStoreRow>();

  return c.json<APIResponse<any>>({ success: true, data: serialize(updated!) });
});

/**
 * DELETE /api/client-stores/:id
 * Elimina una tienda cliente.
 */
app.delete('/:id', async (c) => {
  const denied = await ensureSuperAdmin(c);
  if (denied) return denied;

  const id = c.req.param('id');
  const result = await c.env.DB.prepare('DELETE FROM client_stores WHERE id = ?')
    .bind(id)
    .run();

  if (!result.meta.changes) {
    return c.json<APIResponse<null>>(
      { success: false, error: 'Tienda no encontrada', data: null },
      404
    );
  }

  return c.json<APIResponse<null>>({ success: true, data: null });
});

export default app;
