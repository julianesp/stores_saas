/**
 * Products API Routes
 * Todos los productos están aislados por tenant automáticamente
 */

import { Hono } from 'hono';
import type { Env, Tenant, APIResponse, AppEnv } from '../types';
import { TenantDB, generateId } from '../utils/db-helpers';

const app = new Hono<AppEnv>();

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
  // Campos tipo Siigo / facturación electrónica (migración 027)
  tax_rate?: number;
  tax_label?: string;
  sale_price_2?: number;
  factory_reference?: string;
  track_inventory?: number;
  is_active?: number;
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
      sell_by_unit: body.sell_by_unit ? 1 : 0,
      units_per_package: body.units_per_package || 1,
      unit_name: body.unit_name || 'unidad',
      package_name: body.package_name || 'paquete',
      price_per_unit: body.price_per_unit || 0,
      tax_rate: Number(body.tax_rate) || 0,
      tax_label: body.tax_label || null,
      sale_price_2: body.sale_price_2 ? Number(body.sale_price_2) : null,
      factory_reference: body.factory_reference || null,
      track_inventory: body.track_inventory === false || body.track_inventory === 0 ? 0 : 1,
      is_active: body.is_active === false || body.is_active === 0 ? 0 : 1,
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
    // SQLite no acepta boolean, convertir sell_by_unit a integer
    for (const key of ['sell_by_unit', 'track_inventory', 'is_active']) {
      if (typeof updateData[key] === 'boolean') {
        updateData[key] = updateData[key] ? 1 : 0;
      }
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

// POST /api/products/import - Importar catálogo en lote (ej. "Listado de productos" de Siigo)
//
// Recibe `products[]` ya normalizados por el front (lib/siigo-products-import.ts),
// en tandas de pocos cientos para no pasar el límite de CPU del Worker.
//   - Match por código de barras (barcode). Sin código => siempre se crea.
//   - Si ya existe: se actualiza el catálogo (nombre, precios, categoría, impuesto...)
//     solo cuando `update_existing` es true; el stock y el costo NO se tocan.
//   - Categorías por nombre: se crean las que no existan.
app.post('/import', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const body = await c.req.json();
    const items: any[] = body.products;
    const updateExisting = !!body.update_existing;

    if (!Array.isArray(items) || items.length === 0) {
      return c.json<APIResponse>({
        success: false,
        error: 'Missing required field: products (non-empty array)',
      }, 400);
    }
    if (items.length > 500) {
      return c.json<APIResponse>({
        success: false,
        error: 'Máximo 500 productos por tanda',
      }, 400);
    }

    const db = c.env.DB;
    const now = new Date().toISOString();

    // --- Categorías: resolver por nombre (sin distinguir mayúsculas) y crear las nuevas ---
    const { results: cats } = await db
      .prepare('SELECT id, name FROM categories WHERE tenant_id = ?')
      .bind(tenant.id)
      .all<{ id: string; name: string }>();
    const categoryByName = new Map<string, string>();
    for (const cat of cats || []) categoryByName.set(cat.name.trim().toLowerCase(), cat.id);

    const newCategoryStmts: D1PreparedStatement[] = [];
    let categoriesCreated = 0;
    for (const item of items) {
      const catName = String(item.category_name || '').trim();
      if (!catName || categoryByName.has(catName.toLowerCase())) continue;
      const id = generateId('cat');
      categoryByName.set(catName.toLowerCase(), id);
      newCategoryStmts.push(
        db.prepare(
          'INSERT INTO categories (id, tenant_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(id, tenant.id, catName, null, now, now)
      );
      categoriesCreated++;
    }
    if (newCategoryStmts.length > 0) await db.batch(newCategoryStmts);

    // --- Productos existentes con esos códigos (consultas por lotes: D1 admite ~100 parámetros) ---
    const codes = [...new Set(
      items.map((i) => String(i.barcode || '').trim()).filter(Boolean)
    )];
    const existingByCode = new Map<string, string>();
    for (let i = 0; i < codes.length; i += 90) {
      const slice = codes.slice(i, i + 90);
      const { results } = await db
        .prepare(
          `SELECT id, barcode FROM products WHERE tenant_id = ? AND barcode IN (${slice.map(() => '?').join(', ')})`
        )
        .bind(tenant.id, ...slice)
        .all<{ id: string; barcode: string }>();
      for (const r of results || []) existingByCode.set(String(r.barcode).trim(), r.id);
    }

    const result = {
      created: 0,
      updated: 0,
      skipped: 0,
      categoriesCreated,
      errors: [] as Array<{ code: string; name: string; error: string }>,
    };

    const stmts: D1PreparedStatement[] = [];
    for (const item of items) {
      const code = String(item.barcode || '').trim();
      const name = String(item.name || '').trim();
      const salePrice = Number(item.sale_price);
      if (!name || !Number.isFinite(salePrice) || salePrice < 0) {
        result.errors.push({ code, name, error: 'Falta nombre o precio de venta' });
        continue;
      }

      const catName = String(item.category_name || '').trim();
      const fields = {
        name,
        description: item.description || null,
        category_id: catName ? categoryByName.get(catName.toLowerCase()) || null : null,
        sale_price: salePrice,
        sale_price_2: item.sale_price_2 ? Number(item.sale_price_2) : null,
        min_stock: Math.max(0, Math.round(Number(item.min_stock) || 0)),
        tax_rate: Number(item.tax_rate) || 0,
        tax_label: item.tax_label || null,
        factory_reference: item.factory_reference || null,
        track_inventory: item.track_inventory === false || item.track_inventory === 0 ? 0 : 1,
        is_active: item.is_active === false || item.is_active === 0 ? 0 : 1,
      };

      const existingId = code ? existingByCode.get(code) : undefined;
      if (existingId) {
        if (!updateExisting) {
          result.skipped++;
          continue;
        }
        const cols = Object.keys(fields);
        stmts.push(
          db.prepare(
            `UPDATE products SET ${cols.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND tenant_id = ?`
          ).bind(...Object.values(fields), now, existingId, tenant.id)
        );
        result.updated++;
        continue;
      }

      const row: Record<string, any> = {
        id: generateId('prod'),
        tenant_id: tenant.id,
        barcode: code || null,
        ...fields,
        cost_price: Math.max(0, Number(item.cost_price) || 0),
        stock: Math.max(0, Number(item.stock) || 0),
        sell_by_unit: 0,
        units_per_package: 1,
        unit_name: 'unidad',
        package_name: 'paquete',
        price_per_unit: 0,
        created_at: now,
        updated_at: now,
      };
      const cols = Object.keys(row);
      stmts.push(
        db.prepare(
          `INSERT INTO products (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
        ).bind(...Object.values(row))
      );
      if (code) existingByCode.set(code, row.id); // evita duplicar si el código se repite en la tanda
      result.created++;
    }

    if (stmts.length > 0) await db.batch(stmts);

    return c.json<APIResponse<typeof result>>({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error importing products:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to import products',
    }, 500);
  }
});

// DELETE /api/products/:id - Delete product
// POST /api/products/merge - Fusionar productos repetidos en uno solo (principal)
// Suma el stock de los duplicados al principal, reasigna el historial
// (ventas, movimientos de inventario, órdenes de compra) hacia el principal
// para NO perder integridad, y borra los productos duplicados.
app.post('/merge', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const body = await c.req.json<{ primaryId?: string; duplicateIds?: string[] }>();
    const primaryId = body.primaryId;
    const duplicateIds = (body.duplicateIds || []).filter(id => id && id !== primaryId);

    if (!primaryId || duplicateIds.length === 0) {
      return c.json<APIResponse>({
        success: false,
        error: 'Debes indicar un producto principal y al menos un duplicado.',
      }, 400);
    }

    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    // Validar que el principal existe y pertenece al tenant
    const primary = await tenantDB.getById<Product>('products', primaryId);
    if (!primary) {
      return c.json<APIResponse>({
        success: false,
        error: 'El producto principal no existe.',
      }, 404);
    }

    // Validar que todos los duplicados existen y pertenecen al tenant
    const duplicates: Product[] = [];
    for (const dupId of duplicateIds) {
      const dup = await tenantDB.getById<Product>('products', dupId);
      if (!dup) {
        return c.json<APIResponse>({
          success: false,
          error: `Uno de los productos a fusionar no existe (${dupId}).`,
        }, 404);
      }
      duplicates.push(dup);
    }

    // Stock total resultante (principal + duplicados)
    const totalStock =
      Number(primary.stock || 0) +
      duplicates.reduce((sum, d) => sum + Number(d.stock || 0), 0);

    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];

    for (const dupId of duplicateIds) {
      // Reasignar historial hacia el principal (conservar integridad)
      statements.push(
        c.env.DB
          .prepare('UPDATE sale_items SET product_id = ? WHERE tenant_id = ? AND product_id = ?')
          .bind(primaryId, tenant.id, dupId)
      );
      statements.push(
        c.env.DB
          .prepare('UPDATE inventory_movements SET product_id = ? WHERE tenant_id = ? AND product_id = ?')
          .bind(primaryId, tenant.id, dupId)
      );
      statements.push(
        c.env.DB
          .prepare('UPDATE purchase_order_items SET product_id = ? WHERE tenant_id = ? AND product_id = ?')
          .bind(primaryId, tenant.id, dupId)
      );

      // Borrar datos efímeros/regenerables del duplicado
      statements.push(
        c.env.DB
          .prepare('DELETE FROM offers WHERE tenant_id = ? AND product_id = ?')
          .bind(tenant.id, dupId)
      );
      statements.push(
        c.env.DB
          .prepare('DELETE FROM cart_items WHERE tenant_id = ? AND product_id = ?')
          .bind(tenant.id, dupId)
      );
      statements.push(
        c.env.DB
          .prepare('DELETE FROM stock_alert_subscriptions WHERE product_id = ?')
          .bind(dupId)
      );

      // Finalmente borrar el producto duplicado
      statements.push(
        c.env.DB
          .prepare('DELETE FROM products WHERE tenant_id = ? AND id = ?')
          .bind(tenant.id, dupId)
      );
    }

    // Actualizar el stock del principal con la suma total
    statements.push(
      c.env.DB
        .prepare('UPDATE products SET stock = ?, updated_at = ? WHERE tenant_id = ? AND id = ?')
        .bind(totalStock, now, tenant.id, primaryId)
    );

    // Ejecutar todo de forma atómica
    await c.env.DB.batch(statements);

    const merged = await tenantDB.getById<Product>('products', primaryId);

    return c.json<APIResponse<{ product: Product | null; mergedCount: number }>>({
      success: true,
      data: {
        product: merged,
        mergedCount: duplicateIds.length,
      },
      message: `${duplicateIds.length} producto(s) fusionado(s) en "${primary.name}".`,
    });
  } catch (error: any) {
    console.error('Error merging products:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'No se pudieron fusionar los productos.',
    }, 500);
  }
});

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
      `SELECT * FROM products WHERE tenant_id = ? AND stock <= min_stock AND COALESCE(track_inventory, 1) = 1 ORDER BY (stock - min_stock) ASC`,
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

// GET /api/products/:id/has-sales - Check if product has sales
app.get('/:id/has-sales', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const productId = c.req.param('id');

  try {
    // Check if product has sales
    const salesCount = await c.env.DB
      .prepare('SELECT COUNT(*) as count FROM sale_items WHERE tenant_id = ? AND product_id = ?')
      .bind(tenant.id, productId)
      .first<{ count: number }>();

    const hasSales = salesCount ? salesCount.count > 0 : false;

    return c.json<APIResponse<{ hasSales: boolean; salesCount: number }>>({
      success: true,
      data: {
        hasSales,
        salesCount: salesCount?.count || 0,
      },
    });
  } catch (error) {
    console.error('Error checking product sales:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to check product sales',
    }, 500);
  }
});

export default app;
