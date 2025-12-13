/**
 * Categories API Routes
 * Las categorías están AISLADAS por tenant (cada tienda tiene sus propias categorías)
 */

import { Hono } from 'hono';
import type { Env, Tenant, APIResponse } from '../types';
import { generateId } from '../utils/db-helpers';

const app = new Hono<{ Bindings: Env }>();

interface Category {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// GET /api/categories - Get all categories for the current tenant
app.get('/', async (c) => {
  try {
    const tenant = c.get('tenant') as Tenant;

    const result = await c.env.DB.prepare(
      'SELECT * FROM categories WHERE tenant_id = ? ORDER BY name'
    )
      .bind(tenant.id)
      .all<Category>();

    return c.json<APIResponse<Category[]>>({
      success: true,
      data: result.results || [],
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch categories',
    }, 500);
  }
});

// GET /api/categories/:id - Get single category
app.get('/:id', async (c) => {
  const categoryId = c.req.param('id');

  try {
    const category = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?')
      .bind(categoryId)
      .first<Category>();

    if (!category) {
      return c.json<APIResponse>({
        success: false,
        error: 'Category not found',
      }, 404);
    }

    return c.json<APIResponse<Category>>({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch category',
    }, 500);
  }
});

// POST /api/categories - Create new category for the current tenant
app.post('/', async (c) => {
  try {
    const tenant = c.get('tenant') as Tenant;
    const body = await c.req.json();

    if (!body.name) {
      return c.json<APIResponse>({
        success: false,
        error: 'Missing required field: name',
      }, 400);
    }

    const categoryData = {
      id: generateId('cat'),
      tenant_id: tenant.id,
      name: body.name,
      description: body.description || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await c.env.DB.prepare(
      'INSERT INTO categories (id, tenant_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(
        categoryData.id,
        categoryData.tenant_id,
        categoryData.name,
        categoryData.description,
        categoryData.created_at,
        categoryData.updated_at
      )
      .run();

    const result = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?')
      .bind(categoryData.id)
      .first<Category>();

    return c.json<APIResponse<Category>>({
      success: true,
      data: result!,
      message: 'Category created successfully',
    }, 201);
  } catch (error) {
    console.error('Error creating category:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to create category',
    }, 500);
  }
});

// PUT /api/categories/:id - Update category
app.put('/:id', async (c) => {
  const categoryId = c.req.param('id');
  const tenant = c.get('tenant') as Tenant;

  try {
    const body = await c.req.json();

    const existing = await c.env.DB.prepare(
      'SELECT * FROM categories WHERE id = ? AND tenant_id = ?'
    )
      .bind(categoryId, tenant.id)
      .first<Category>();

    if (!existing) {
      return c.json<APIResponse>({
        success: false,
        error: 'Category not found',
      }, 404);
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if (body.description !== undefined) {
      updates.push('description = ?');
      values.push(body.description);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(categoryId);
      values.push(tenant.id);

      await c.env.DB.prepare(
        `UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`
      )
        .bind(...values)
        .run();
    }

    const category = await c.env.DB.prepare(
      'SELECT * FROM categories WHERE id = ? AND tenant_id = ?'
    )
      .bind(categoryId, tenant.id)
      .first<Category>();

    return c.json<APIResponse<Category>>({
      success: true,
      data: category!,
      message: 'Category updated successfully',
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to update category',
    }, 500);
  }
});

// DELETE /api/categories/:id - Delete category
app.delete('/:id', async (c) => {
  const categoryId = c.req.param('id');
  const tenant = c.get('tenant') as Tenant;

  try {
    const existing = await c.env.DB.prepare(
      'SELECT * FROM categories WHERE id = ? AND tenant_id = ?'
    )
      .bind(categoryId, tenant.id)
      .first<Category>();

    if (!existing) {
      return c.json<APIResponse>({
        success: false,
        error: 'Category not found',
      }, 404);
    }

    await c.env.DB.prepare('DELETE FROM categories WHERE id = ? AND tenant_id = ?')
      .bind(categoryId, tenant.id)
      .run();

    return c.json<APIResponse>({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to delete category',
    }, 500);
  }
});

export default app;
