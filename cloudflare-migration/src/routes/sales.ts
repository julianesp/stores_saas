/**
 * Sales API Routes
 * Todas las ventas están aisladas por tenant automáticamente
 */

import { Hono } from 'hono';
import type { Env, Tenant, APIResponse } from '../types';
import { TenantDB, generateId } from '../utils/db-helpers';

const app = new Hono<{ Bindings: Env }>();

interface Sale {
  id: string;
  tenant_id: string;
  sale_number: string;
  cashier_id: string;
  customer_id?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: string;
  status: string;
  points_earned?: number;
  created_at: string;
  updated_at: string;
}

interface SaleItem {
  id: string;
  tenant_id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  created_at: string;
}

// GET /api/sales - Get all sales with items
app.get('/', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const sales = await tenantDB.getAll<Sale>('sales');

    // Get all sale_items for this tenant
    const allItems = await tenantDB.getAll<SaleItem>('sale_items');

    // Group items by sale_id
    const itemsMap = new Map<string, SaleItem[]>();
    allItems.forEach(item => {
      if (!itemsMap.has(item.sale_id)) {
        itemsMap.set(item.sale_id, []);
      }
      itemsMap.get(item.sale_id)!.push(item);
    });

    // Add items to each sale
    const salesWithItems = sales.map(sale => ({
      ...sale,
      items: itemsMap.get(sale.id) || []
    }));

    return c.json<APIResponse<Array<Sale & { items: SaleItem[] }>>>({
      success: true,
      data: salesWithItems,
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch sales',
    }, 500);
  }
});

// GET /api/sales/:id - Get single sale with items
app.get('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const saleId = c.req.param('id');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const sale = await tenantDB.getById<Sale>('sales', saleId);

    if (!sale) {
      return c.json<APIResponse>({
        success: false,
        error: 'Sale not found',
      }, 404);
    }

    // Get sale items
    const items = await tenantDB.query<SaleItem>('sale_items', 'sale_id = ?', [saleId]);

    return c.json<APIResponse<Sale & { items: SaleItem[] }>>({
      success: true,
      data: { ...sale, items },
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch sale',
    }, 500);
  }
});

// POST /api/sales - Create new sale (POS transaction)
app.post('/', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const body = await c.req.json();

    if (!body.total || !body.payment_method || !body.items || body.items.length === 0) {
      return c.json<APIResponse>({
        success: false,
        error: 'Missing required fields: total, payment_method, items',
      }, 400);
    }

    // Validar cada item para evitar que se inserten valores undefined en D1
    for (const item of body.items) {
      if (!item.product_id || typeof item.quantity !== 'number' || item.quantity <= 0 || typeof item.unit_price !== 'number' || typeof item.subtotal !== 'number') {
        return c.json<APIResponse>({
          success: false,
          error: 'Invalid item data: each item must include product_id (string), quantity (number > 0), unit_price (number) and subtotal (number)',
        }, 400);
      }
    }

    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    // Generate sale number
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const saleCount = await tenantDB.count('sales');
    const saleNumber = `VTA-${dateStr}-${String(saleCount + 1).padStart(6, '0')}`;

    const saleData: any = {
      id: generateId('sale'),
      sale_number: saleNumber,
      cashier_id: body.cashier_id || tenant.id,
      customer_id: body.customer_id ?? null,
      subtotal: body.subtotal ?? 0,
      tax: body.tax ?? 0,
      discount: body.discount ?? 0,
      total: body.total,
      payment_method: body.payment_method,
      status: body.status || 'completada',
      points_earned: body.points_earned ?? 0,
      notes: body.notes ?? null,
    };

    // Add credit sale fields only if payment method is credit
    if (body.payment_method === 'credito') {
      saleData.payment_status = body.payment_status ?? 'pendiente';
      saleData.amount_paid = body.amount_paid ?? 0;
      saleData.amount_pending = body.amount_pending ?? body.total;
      saleData.due_date = body.due_date ?? null;
    } else {
      saleData.payment_status = null;
      saleData.amount_paid = null;
      saleData.amount_pending = null;
      saleData.due_date = null;
    }

    // Insert sale
    await tenantDB.insert('sales', saleData);

    // Insert sale items
    const itemsToInsert = body.items.map((item: any) => ({
      id: generateId('item'),
      sale_id: saleData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount || 0,
      subtotal: item.subtotal,
    }));

    await tenantDB.batchInsert('sale_items', itemsToInsert);

    // Update product stock for each item
    for (const item of body.items) {
      // Get current product
      const product = await tenantDB.getById<any>('products', item.product_id);
      if (product) {
        const newStock = product.stock - item.quantity;
        await tenantDB.update('products', item.product_id, {
          stock: newStock
        });
      }
    }

    // Get complete sale with items
    const sale = await tenantDB.getById<Sale>('sales', saleData.id);
    const items = await tenantDB.query<SaleItem>('sale_items', 'sale_id = ?', [saleData.id]);

    return c.json<APIResponse<Sale & { items: SaleItem[] }>>({
      success: true,
      data: { ...sale!, items },
      message: 'Sale created successfully',
    }, 201);
  } catch (error: any) {
    console.error('Error creating sale:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to create sale',
    }, 500);
  }
});

// PUT /api/sales/:id - Update sale (mainly for confirming web orders)
app.put('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const saleId = c.req.param('id');

  try {
    const body = await c.req.json();
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    // Obtener la venta actual
    const existingSale = await tenantDB.getById<Sale>('sales', saleId);
    if (!existingSale) {
      return c.json<APIResponse>({
        success: false,
        error: 'Sale not found',
      }, 404);
    }

    // Verificar si es un pedido web que se está confirmando
    const isWebOrder = existingSale.sale_number.startsWith('WEB-');
    const isConfirmingPayment = body.status === 'completada' && existingSale.status === 'pendiente';

    // Si es un pedido web que se está confirmando, descontar inventario
    if (isWebOrder && isConfirmingPayment) {
      // Obtener los items del pedido
      const items = await tenantDB.query<SaleItem>('sale_items', 'sale_id = ?', [saleId]);

      // Descontar stock de cada producto
      for (const item of items) {
        const product = await tenantDB.getById<any>('products', item.product_id);
        if (product) {
          const newStock = product.stock - item.quantity;

          // Validar que hay suficiente stock
          if (newStock < 0) {
            return c.json<APIResponse>({
              success: false,
              error: `No hay suficiente stock para el producto ${product.name}. Stock actual: ${product.stock}, requerido: ${item.quantity}`,
            }, 400);
          }

          await tenantDB.update('products', item.product_id, {
            stock: newStock
          });
        }
      }
    }

    // Actualizar la venta
    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.payment_status !== undefined) updateData.payment_status = body.payment_status;
    if (body.amount_paid !== undefined) updateData.amount_paid = body.amount_paid;
    if (body.amount_pending !== undefined) updateData.amount_pending = body.amount_pending;
    if (body.notes !== undefined) updateData.notes = body.notes;

    await tenantDB.update('sales', saleId, updateData);

    // Obtener venta actualizada
    const updatedSale = await tenantDB.getById<Sale>('sales', saleId);
    const items = await tenantDB.query<SaleItem>('sale_items', 'sale_id = ?', [saleId]);

    return c.json<APIResponse<Sale & { items: SaleItem[] }>>({
      success: true,
      data: { ...updatedSale!, items },
      message: 'Sale updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating sale:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to update sale',
    }, 500);
  }
});

export default app;
