/**
 * Shipping Zones API Routes
 * Gestiona las zonas de envío y sus costos por tienda
 */

import { Hono } from 'hono';
import type { Env, Tenant, APIResponse } from '../types';
import { TenantDB, generateId } from '../utils/db-helpers';

const app = new Hono<{ Bindings: Env }>();

interface ShippingZone {
  id: string;
  tenant_id: string;
  zone_name: string;
  shipping_cost: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// GET /api/shipping-zones - Obtener todas las zonas de envío del tenant
app.get('/', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const zones = await tenantDB.getAll<ShippingZone>('shipping_zones');

    return c.json<APIResponse<ShippingZone[]>>({
      success: true,
      data: zones,
    });
  } catch (error) {
    console.error('Error fetching shipping zones:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch shipping zones',
    }, 500);
  }
});

// POST /api/shipping-zones - Crear nueva zona de envío
app.post('/', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const body = await c.req.json();

    if (!body.zone_name || typeof body.shipping_cost !== 'number') {
      return c.json<APIResponse>({
        success: false,
        error: 'Missing required fields: zone_name, shipping_cost',
      }, 400);
    }

    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    const zoneData = {
      id: generateId('zone'),
      zone_name: body.zone_name.trim(),
      shipping_cost: body.shipping_cost,
      is_active: body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1,
    };

    await tenantDB.insert('shipping_zones', zoneData);

    const zone = await tenantDB.getById<ShippingZone>('shipping_zones', zoneData.id);

    return c.json<APIResponse<ShippingZone>>({
      success: true,
      data: zone!,
      message: 'Shipping zone created successfully',
    }, 201);
  } catch (error: any) {
    console.error('Error creating shipping zone:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to create shipping zone',
    }, 500);
  }
});

// PUT /api/shipping-zones/:id - Actualizar zona de envío
app.put('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const zoneId = c.req.param('id');

  try {
    const body = await c.req.json();
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    const zone = await tenantDB.getById<ShippingZone>('shipping_zones', zoneId);

    if (!zone) {
      return c.json<APIResponse>({
        success: false,
        error: 'Shipping zone not found',
      }, 404);
    }

    const updateData: any = {};

    if (body.zone_name !== undefined) {
      updateData.zone_name = body.zone_name.trim();
    }

    if (body.shipping_cost !== undefined) {
      updateData.shipping_cost = body.shipping_cost;
    }

    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active ? 1 : 0;
    }

    await tenantDB.update('shipping_zones', zoneId, updateData);

    const updatedZone = await tenantDB.getById<ShippingZone>('shipping_zones', zoneId);

    return c.json<APIResponse<ShippingZone>>({
      success: true,
      data: updatedZone!,
      message: 'Shipping zone updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating shipping zone:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to update shipping zone',
    }, 500);
  }
});

// DELETE /api/shipping-zones/:id - Eliminar zona de envío
app.delete('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const zoneId = c.req.param('id');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    const zone = await tenantDB.getById<ShippingZone>('shipping_zones', zoneId);

    if (!zone) {
      return c.json<APIResponse>({
        success: false,
        error: 'Shipping zone not found',
      }, 404);
    }

    await tenantDB.delete('shipping_zones', zoneId);

    return c.json<APIResponse>({
      success: true,
      message: 'Shipping zone deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting shipping zone:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to delete shipping zone',
    }, 500);
  }
});

export default app;
