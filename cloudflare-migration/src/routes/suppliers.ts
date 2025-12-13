/**
 * Suppliers API Routes
 * Gestión completa de proveedores con tracking de compras
 */

import { Hono } from 'hono';
import type { Env, Tenant, APIResponse } from '../types';
import { TenantDB, generateId } from '../utils/db-helpers';

const app = new Hono<{ Bindings: Env }>();

interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  notes?: string;
  // Nuevos campos
  tax_id?: string;
  payment_type: 'contado' | 'credito';
  credit_days: number;
  credit_limit: number;
  current_debt: number;
  default_discount: number;
  visit_day?: string;
  website?: string;
  whatsapp?: string;
  business_hours?: string;
  rating?: number;
  status: 'activo' | 'inactivo' | 'suspendido';
  delivery_days: number;
  minimum_order: number;
  total_purchased: number;
  last_purchase_date?: string;
  created_at: string;
  updated_at: string;
}

// GET /api/suppliers - Get all suppliers
app.get('/', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const suppliers = await tenantDB.getAll<Supplier>('suppliers');

    return c.json<APIResponse<Supplier[]>>({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch suppliers',
    }, 500);
  }
});

// GET /api/suppliers/:id - Get single supplier
app.get('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const supplierId = c.req.param('id');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const supplier = await tenantDB.getById<Supplier>('suppliers', supplierId);

    if (!supplier) {
      return c.json<APIResponse>({
        success: false,
        error: 'Supplier not found',
      }, 404);
    }

    return c.json<APIResponse<Supplier>>({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch supplier',
    }, 500);
  }
});

// POST /api/suppliers - Create new supplier
app.post('/', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const body = await c.req.json();

    if (!body.name) {
      return c.json<APIResponse>({
        success: false,
        error: 'Missing required field: name',
      }, 400);
    }

    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    const supplierData = {
      id: generateId('sup'),
      name: body.name,
      contact_name: body.contact_name ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      address: body.address ?? null,
      city: body.city ?? null,
      notes: body.notes ?? null,
      tax_id: body.tax_id ?? null,
      payment_type: body.payment_type || 'contado',
      credit_days: body.credit_days ?? 0,
      credit_limit: body.credit_limit ?? 0,
      current_debt: 0,
      default_discount: body.default_discount ?? 0,
      visit_day: body.visit_day ?? null,
      website: body.website ?? null,
      whatsapp: body.whatsapp ?? null,
      business_hours: body.business_hours ?? null,
      rating: body.rating ?? null,
      status: body.status || 'activo',
      delivery_days: body.delivery_days ?? 0,
      minimum_order: body.minimum_order ?? 0,
      total_purchased: 0,
      last_purchase_date: null,
    };

    await tenantDB.insert('suppliers', supplierData);

    const supplier = await tenantDB.getById<Supplier>('suppliers', supplierData.id);

    return c.json<APIResponse<Supplier>>({
      success: true,
      data: supplier!,
      message: 'Supplier created successfully',
    }, 201);
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to create supplier',
    }, 500);
  }
});

// PUT /api/suppliers/:id - Update supplier
app.put('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const supplierId = c.req.param('id');

  try {
    const body = await c.req.json();
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    const existing = await tenantDB.getById('suppliers', supplierId);
    if (!existing) {
      return c.json<APIResponse>({
        success: false,
        error: 'Supplier not found',
      }, 404);
    }

    // Update supplier
    await tenantDB.update('suppliers', supplierId, body);

    const supplier = await tenantDB.getById<Supplier>('suppliers', supplierId);

    return c.json<APIResponse<Supplier>>({
      success: true,
      data: supplier!,
      message: 'Supplier updated successfully',
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to update supplier',
    }, 500);
  }
});

// DELETE /api/suppliers/:id - Delete supplier
app.delete('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const supplierId = c.req.param('id');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    const existing = await tenantDB.getById('suppliers', supplierId);
    if (!existing) {
      return c.json<APIResponse>({
        success: false,
        error: 'Supplier not found',
      }, 404);
    }

    await tenantDB.delete('suppliers', supplierId);

    return c.json<APIResponse>({
      success: true,
      message: 'Supplier deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to delete supplier',
    }, 500);
  }
});

// GET /api/suppliers/:id/products - Get products from supplier
app.get('/:id/products', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const supplierId = c.req.param('id');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    const products = await tenantDB.query('products', 'supplier_id = ?', [supplierId]);

    return c.json<APIResponse<any[]>>({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Error fetching supplier products:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch supplier products',
    }, 500);
  }
});

// GET /api/suppliers/:id/stats - Get supplier statistics
app.get('/:id/stats', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const supplierId = c.req.param('id');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    // Get supplier
    const supplier = await tenantDB.getById<Supplier>('suppliers', supplierId);
    if (!supplier) {
      return c.json<APIResponse>({
        success: false,
        error: 'Supplier not found',
      }, 404);
    }

    // Count products
    const productCount = await tenantDB.count('products', 'supplier_id = ?', [supplierId]);

    // Get purchase orders count (if table exists)
    let purchaseOrdersCount = 0;
    try {
      purchaseOrdersCount = await tenantDB.count('purchase_orders', 'supplier_id = ?', [supplierId]);
    } catch (e) {
      // Table might not exist yet
    }

    const stats = {
      supplier_name: supplier.name,
      total_products: productCount,
      total_purchased: supplier.total_purchased,
      current_debt: supplier.current_debt,
      credit_available: supplier.credit_limit - supplier.current_debt,
      purchase_orders_count: purchaseOrdersCount,
      last_purchase_date: supplier.last_purchase_date,
      status: supplier.status,
      rating: supplier.rating,
    };

    return c.json<APIResponse<typeof stats>>({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching supplier stats:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch supplier statistics',
    }, 500);
  }
});

export default app;
