/**
 * Products API Routes
 * Todos los productos están aislados por tenant automáticamente
 */

import { Hono } from 'hono';
import type { Env, Tenant, APIResponse } from '../types';
import { TenantDB, generateId } from '../utils/db-helpers';

const app = new Hono<{ Bindings: Env }>();

interface Product {
  id: string;
  tenant_id: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  cost_price: number;
  sale_price: number;
  stock: number;
  min_stock: number;
  expiration_date?: string;
  image_url?: string;
  images?: string;
  // Campos para venta por unidades
  sell_by_unit?: number;
  units_per_package?: number;
  unit_name?: string;
  package_name?: string;
  price_per_unit?: number;
  created_at: string;
  updated_at: string;
}

// GET /api/products - Get all products for the tenant
app.get('/', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const products = await tenantDB.getAll<Product>('products');

    // Parse images field from JSON string to array
    const productsWithParsedImages = products.map(product => ({
      ...product,
      images: product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : []
    }));

    return c.json<APIResponse<Product[]>>({
      success: true,
      data: productsWithParsedImages,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch products',
    }, 500);
  }
});

// GET /api/products/:id - Get single product
app.get('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const productId = c.req.param('id');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const product = await tenantDB.getById<Product>('products', productId);

    if (!product) {
      return c.json<APIResponse>({
        success: false,
        error: 'Product not found',
      }, 404);
    }

    // Parse images field from JSON string to array
    const productWithParsedImages = {
      ...product,
      images: product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : []
    };

    return c.json<APIResponse<Product>>({
      success: true,
      data: productWithParsedImages,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch product',
    }, 500);
  }
});

// POST /api/products - Create new product
app.post('/', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const body = await c.req.json();

    // Validate input
    if (!body.name || body.sale_price === undefined) {
      return c.json<APIResponse>({
        success: false,
        error: 'Missing required fields: name, sale_price',
      }, 400);
    }

    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    const productData = {
      id: generateId('prod'),
      barcode: body.barcode || null,
      name: body.name,
      description: body.description || null,
      category_id: body.category_id || null,
      supplier_id: body.supplier_id || null,
      cost_price: body.cost_price || 0,
      sale_price: body.sale_price,
      stock: body.stock || 0,
      min_stock: body.min_stock || 0,
      expiration_date: body.expiration_date || null,
      image_url: body.image_url || null,
      images: body.images ? JSON.stringify(body.images) : null,
    };

    await tenantDB.insert('products', productData);

    const product = await tenantDB.getById<Product>('products', productData.id);

    return c.json<APIResponse<Product>>({
      success: true,
      data: product!,
      message: 'Product created successfully',
    }, 201);
  } catch (error: any) {
    console.error('Error creating product:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to create product',
    }, 500);
  }
});

// PUT /api/products/:id - Update product
app.put('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const productId = c.req.param('id');

  try {
    const body = await c.req.json();
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    // Check if product exists (and belongs to this tenant)
    const existing = await tenantDB.getById('products', productId);
    if (!existing) {
      return c.json<APIResponse>({
        success: false,
        error: 'Product not found',
      }, 404);
    }

    // Prepare update data - serialize images array to JSON string if present
    const updateData = { ...body };
    if (updateData.images && Array.isArray(updateData.images)) {
      updateData.images = JSON.stringify(updateData.images);
    }

    // Update product
    await tenantDB.update('products', productId, updateData);

    const product = await tenantDB.getById<Product>('products', productId);

    return c.json<APIResponse<Product>>({
      success: true,
      data: product!,
      message: 'Product updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to update product',
    }, 500);
  }
});

// DELETE /api/products/:id - Delete product
app.delete('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const productId = c.req.param('id');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    // Check if exists
    const existing = await tenantDB.getById('products', productId);
    if (!existing) {
      return c.json<APIResponse>({
        success: false,
        error: 'Product not found',
      }, 404);
    }

    // Check if product has sales (we should NOT delete products with sales history)
    const salesCount = await c.env.DB
      .prepare('SELECT COUNT(*) as count FROM sale_items WHERE tenant_id = ? AND product_id = ?')
      .bind(tenant.id, productId)
      .first<{ count: number }>();

    if (salesCount && salesCount.count > 0) {
      return c.json<APIResponse>({
        success: false,
        error: 'No se puede eliminar un producto que tiene ventas registradas. En su lugar, puedes establecer su stock en 0.',
      }, 400);
    }

    // Delete related records that don't have CASCADE
    // Delete inventory movements
    await c.env.DB
      .prepare('DELETE FROM inventory_movements WHERE tenant_id = ? AND product_id = ?')
      .bind(tenant.id, productId)
      .run();

    // Delete cart items
    await c.env.DB
      .prepare('DELETE FROM cart_items WHERE tenant_id = ? AND product_id = ?')
      .bind(tenant.id, productId)
      .run();

    // Delete purchase order items
    await c.env.DB
      .prepare('DELETE FROM purchase_order_items WHERE tenant_id = ? AND product_id = ?')
      .bind(tenant.id, productId)
      .run();

    // Delete offers (these should CASCADE but let's be explicit)
    await c.env.DB
      .prepare('DELETE FROM offers WHERE tenant_id = ? AND product_id = ?')
      .bind(tenant.id, productId)
      .run();

    // Delete stock alert subscriptions (these should CASCADE but let's be explicit)
    await c.env.DB
      .prepare('DELETE FROM stock_alert_subscriptions WHERE product_id = ?')
      .bind(productId)
      .run();

    // Finally, delete the product
    await tenantDB.delete('products', productId);

    return c.json<APIResponse>({
      success: true,
      data: null,
      message: 'Product deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to delete product',
    }, 500);
  }
});

// GET /api/products/search - Search products
app.get('/search', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const query = c.req.query('q') || '';
  const category = c.req.query('category');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    let products: Product[];

    if (category) {
      // Search by category
      products = await tenantDB.query<Product>(
        'products',
        'category_id = ? AND name LIKE ?',
        [category, `%${query}%`]
      );
    } else {
      // Simple search
      products = await tenantDB.search<Product>('products', 'name', query);
    }

    // Parse images field from JSON string to array
    const productsWithParsedImages = products.map(product => ({
      ...product,
      images: product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : []
    }));

    return c.json<APIResponse<Product[]>>({
      success: true,
      data: productsWithParsedImages,
    });
  } catch (error) {
    console.error('Error searching products:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to search products',
    }, 500);
  }
});

// GET /api/products/low-stock - Products with low stock
app.get('/low-stock', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    // Products where stock <= min_stock
    const products = await tenantDB.raw<Product>(
      `SELECT * FROM products WHERE tenant_id = ? AND stock <= min_stock ORDER BY (stock - min_stock) ASC`,
      []
    );

    // Parse images field from JSON string to array
    const productsWithParsedImages = products.map(product => ({
      ...product,
      images: product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : []
    }));

    return c.json<APIResponse<Product[]>>({
      success: true,
      data: productsWithParsedImages,
    });
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch low stock products',
    }, 500);
  }
});

export default app;
