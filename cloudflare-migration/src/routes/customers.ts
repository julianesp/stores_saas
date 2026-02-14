/**
 * Customers API Routes
 * Todos los clientes están aislados por tenant automáticamente
 */

import { Hono } from 'hono';
import type { Env, Tenant, APIResponse } from '../types';
import { TenantDB, generateId } from '../utils/db-helpers';

const app = new Hono<{ Bindings: Env }>();

interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  email: string; // Obligatorio para recordatorios de pago
  phone: string; // Obligatorio para recordatorios de pago
  address?: string;
  city?: string;
  id_number?: string;
  loyalty_points: number;
  created_at: string;
  updated_at: string;
}

// GET /api/customers - Get all customers
app.get('/', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const customers = await tenantDB.getAll<Customer>('customers');

    return c.json<APIResponse<Customer[]>>({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch customers',
    }, 500);
  }
});

// GET /api/customers/:id - Get single customer
app.get('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const customerId = c.req.param('id');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const customer = await tenantDB.getById<Customer>('customers', customerId);

    if (!customer) {
      return c.json<APIResponse>({
        success: false,
        error: 'Customer not found',
      }, 404);
    }

    return c.json<APIResponse<Customer>>({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch customer',
    }, 500);
  }
});

// POST /api/customers - Create new customer
app.post('/', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const body = await c.req.json();

    // Validar campos obligatorios
    if (!body.name) {
      return c.json<APIResponse>({
        success: false,
        error: 'El nombre es requerido',
      }, 400);
    }

    if (!body.email || body.email.trim() === '') {
      return c.json<APIResponse>({
        success: false,
        error: 'El email es requerido para enviar recordatorios de pago',
      }, 400);
    }

    if (!body.phone || body.phone.trim() === '') {
      return c.json<APIResponse>({
        success: false,
        error: 'El teléfono es requerido para enviar recordatorios de pago',
      }, 400);
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return c.json<APIResponse>({
        success: false,
        error: 'El email no tiene un formato válido',
      }, 400);
    }

    // Validar que el teléfono tenga al menos 7 dígitos
    const phoneDigits = body.phone.replace(/\D/g, '');
    if (phoneDigits.length < 7) {
      return c.json<APIResponse>({
        success: false,
        error: 'El teléfono debe tener al menos 7 dígitos',
      }, 400);
    }

    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    const customerData = {
      id: generateId('cust'),
      name: body.name,
      email: body.email.trim(),
      phone: body.phone.trim(),
      address: body.address || null,
      city: body.city || null,
      id_number: body.id_number || null,
      loyalty_points: body.loyalty_points || 0,
    };

    await tenantDB.insert('customers', customerData);
    const customer = await tenantDB.getById<Customer>('customers', customerData.id);

    return c.json<APIResponse<Customer>>({
      success: true,
      data: customer!,
      message: 'Customer created successfully',
    }, 201);
  } catch (error) {
    console.error('Error creating customer:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to create customer',
    }, 500);
  }
});

// PUT /api/customers/:id - Update customer
app.put('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const customerId = c.req.param('id');

  try {
    const body = await c.req.json();
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    const existing = await tenantDB.getById('customers', customerId);
    if (!existing) {
      return c.json<APIResponse>({
        success: false,
        error: 'Customer not found',
      }, 404);
    }

    await tenantDB.update('customers', customerId, body);
    const customer = await tenantDB.getById<Customer>('customers', customerId);

    return c.json<APIResponse<Customer>>({
      success: true,
      data: customer!,
      message: 'Customer updated successfully',
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to update customer',
    }, 500);
  }
});

// DELETE /api/customers/:id - Delete customer
app.delete('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const customerId = c.req.param('id');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    const existing = await tenantDB.getById('customers', customerId);
    if (!existing) {
      return c.json<APIResponse>({
        success: false,
        error: 'Customer not found',
      }, 404);
    }

    await tenantDB.delete('customers', customerId);

    return c.json<APIResponse>({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to delete customer',
    }, 500);
  }
});

export default app;
