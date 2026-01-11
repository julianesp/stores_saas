/**
 * Purchase Orders API Routes
 * Gestión de órdenes de compra a proveedores
 */

import { Hono } from 'hono';
import type { Env, Tenant, APIResponse } from '../types';
import { TenantDB, generateId } from '../utils/db-helpers';

const app = new Hono<{ Bindings: Env }>();

interface PurchaseOrder {
  id: string;
  tenant_id: string;
  supplier_id: string;
  order_number: string;
  status: 'pendiente' | 'recibida' | 'cancelada';
  order_date: string;
  expected_date?: string;
  received_date?: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface PurchaseOrderItem {
  id: string;
  tenant_id: string;
  purchase_order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
  created_at: string;
}

// GET /api/purchase-orders - Get all purchase orders
app.get('/', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const orders = await tenantDB.getAll<PurchaseOrder>('purchase_orders');

    // Get all items for all orders
    const allItems = await tenantDB.getAll<PurchaseOrderItem>('purchase_order_items');

    // Group items by order_id
    const itemsMap = new Map<string, PurchaseOrderItem[]>();
    allItems.forEach(item => {
      if (!itemsMap.has(item.purchase_order_id)) {
        itemsMap.set(item.purchase_order_id, []);
      }
      itemsMap.get(item.purchase_order_id)!.push(item);
    });

    // Add items to each order
    const ordersWithItems = orders.map(order => ({
      ...order,
      items: itemsMap.get(order.id) || []
    }));

    return c.json<APIResponse<Array<PurchaseOrder & { items: PurchaseOrderItem[] }>>>(
{
        success: true,
        data: ordersWithItems,
      });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return c.json<APIResponse>(
      {
        success: false,
        error: 'Failed to fetch purchase orders',
      },
      500
    );
  }
});

// GET /api/purchase-orders/:id - Get single purchase order
app.get('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const orderId = c.req.param('id');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const order = await tenantDB.getById<PurchaseOrder>('purchase_orders', orderId);

    if (!order) {
      return c.json<APIResponse>(
        {
          success: false,
          error: 'Purchase order not found',
        },
        404
      );
    }

    // Get order items
    const items = await tenantDB.query<PurchaseOrderItem>(
      'purchase_order_items',
      'purchase_order_id = ?',
      [orderId]
    );

    return c.json<APIResponse<PurchaseOrder & { items: PurchaseOrderItem[] }>>(
      {
        success: true,
        data: { ...order, items },
      }
    );
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    return c.json<APIResponse>(
      {
        success: false,
        error: 'Failed to fetch purchase order',
      },
      500
    );
  }
});

// GET /api/purchase-orders/supplier/:supplierId - Get orders by supplier
app.get('/supplier/:supplierId', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const supplierId = c.req.param('supplierId');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const orders = await tenantDB.query<PurchaseOrder>(
      'purchase_orders',
      'supplier_id = ?',
      [supplierId]
    );

    // Get all items for these orders
    const allItems = await tenantDB.getAll<PurchaseOrderItem>('purchase_order_items');

    // Group items by order_id
    const itemsMap = new Map<string, PurchaseOrderItem[]>();
    allItems.forEach(item => {
      if (!itemsMap.has(item.purchase_order_id)) {
        itemsMap.set(item.purchase_order_id, []);
      }
      itemsMap.get(item.purchase_order_id)!.push(item);
    });

    // Add items to each order
    const ordersWithItems = orders.map(order => ({
      ...order,
      items: itemsMap.get(order.id) || []
    }));

    return c.json<APIResponse<Array<PurchaseOrder & { items: PurchaseOrderItem[] }>>>({
      success: true,
      data: ordersWithItems,
    });
  } catch (error) {
    console.error('Error fetching supplier purchase orders:', error);
    return c.json<APIResponse>(
      {
        success: false,
        error: 'Failed to fetch supplier purchase orders',
      },
      500
    );
  }
});

// POST /api/purchase-orders - Create new purchase order
app.post('/', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const body = await c.req.json();

    if (!body.supplier_id || !body.items || body.items.length === 0) {
      return c.json<APIResponse>(
        {
          success: false,
          error: 'Missing required fields: supplier_id, items',
        },
        400
      );
    }

    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    // Generate order number
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const orderCount = await tenantDB.count('purchase_orders');
    const orderNumber = `OC-${dateStr}-${String(orderCount + 1).padStart(6, '0')}`;

    // Calculate totals
    const subtotal = body.items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.unit_cost,
      0
    );
    const tax = body.tax ?? 0;
    const total = subtotal + tax;

    const orderData = {
      id: generateId('po'),
      supplier_id: body.supplier_id,
      order_number: orderNumber,
      status: body.status || 'pendiente',
      order_date: now.toISOString(),
      expected_date: body.expected_date ?? null,
      received_date: null,
      subtotal,
      tax,
      total,
      notes: body.notes ?? null,
    };

    // Insert order
    await tenantDB.insert('purchase_orders', orderData);

    // Insert order items
    const itemsToInsert = body.items.map((item: any) => ({
      id: generateId('poi'),
      purchase_order_id: orderData.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      subtotal: item.quantity * item.unit_cost,
    }));

    await tenantDB.batchInsert('purchase_order_items', itemsToInsert);

    // Get complete order with items
    const order = await tenantDB.getById<PurchaseOrder>('purchase_orders', orderData.id);
    const items = await tenantDB.query<PurchaseOrderItem>(
      'purchase_order_items',
      'purchase_order_id = ?',
      [orderData.id]
    );

    return c.json<APIResponse<PurchaseOrder & { items: PurchaseOrderItem[] }>>(
      {
        success: true,
        data: { ...order!, items },
        message: 'Purchase order created successfully',
      },
      201
    );
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    return c.json<APIResponse>(
      {
        success: false,
        error: error.message || 'Failed to create purchase order',
      },
      500
    );
  }
});

// PUT /api/purchase-orders/:id - Update purchase order
app.put('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const orderId = c.req.param('id');

  try {
    const body = await c.req.json();
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    const existing = await tenantDB.getById('purchase_orders', orderId);
    if (!existing) {
      return c.json<APIResponse>(
        {
          success: false,
          error: 'Purchase order not found',
        },
        404
      );
    }

    // Update order
    await tenantDB.update('purchase_orders', orderId, body);

    const order = await tenantDB.getById<PurchaseOrder>('purchase_orders', orderId);

    return c.json<APIResponse<PurchaseOrder>>({
      success: true,
      data: order!,
      message: 'Purchase order updated successfully',
    });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return c.json<APIResponse>(
      {
        success: false,
        error: 'Failed to update purchase order',
      },
      500
    );
  }
});

// PUT /api/purchase-orders/:id/receive - Mark order as received and update inventory
app.put('/:id/receive', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const orderId = c.req.param('id');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    const order = await tenantDB.getById<PurchaseOrder>('purchase_orders', orderId);
    if (!order) {
      return c.json<APIResponse>(
        {
          success: false,
          error: 'Purchase order not found',
        },
        404
      );
    }

    // Get order items
    const items = await tenantDB.query<PurchaseOrderItem>(
      'purchase_order_items',
      'purchase_order_id = ?',
      [orderId]
    );

    // Update product stock and cost for each item
    for (const item of items) {
      const product = await tenantDB.getById<any>('products', item.product_id);
      if (product) {
        const newStock = product.stock + item.quantity;
        await tenantDB.update('products', item.product_id, {
          stock: newStock,
          cost_price: item.unit_cost, // Update cost price with latest purchase cost
        });
      }
    }

    // Mark order as received
    await tenantDB.update('purchase_orders', orderId, {
      status: 'recibida',
      received_date: new Date().toISOString(),
    });

    const updatedOrder = await tenantDB.getById<PurchaseOrder>('purchase_orders', orderId);

    return c.json<APIResponse<PurchaseOrder>>({
      success: true,
      data: updatedOrder!,
      message: 'Purchase order received and inventory updated',
    });
  } catch (error) {
    console.error('Error receiving purchase order:', error);
    return c.json<APIResponse>(
      {
        success: false,
        error: 'Failed to receive purchase order',
      },
      500
    );
  }
});

// DELETE /api/purchase-orders/:id - Delete purchase order
app.delete('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const orderId = c.req.param('id');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    const existing = await tenantDB.getById('purchase_orders', orderId);
    if (!existing) {
      return c.json<APIResponse>(
        {
          success: false,
          error: 'Purchase order not found',
        },
        404
      );
    }

    // Delete order items first
    const items = await tenantDB.query<PurchaseOrderItem>(
      'purchase_order_items',
      'purchase_order_id = ?',
      [orderId]
    );
    for (const item of items) {
      await tenantDB.delete('purchase_order_items', item.id);
    }

    // Delete order
    await tenantDB.delete('purchase_orders', orderId);

    return c.json<APIResponse>({
      success: true,
      message: 'Purchase order deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    return c.json<APIResponse>(
      {
        success: false,
        error: 'Failed to delete purchase order',
      },
      500
    );
  }
});

export default app;
