/**
 * TenantDB - Database Helper con Aislamiento Automático
 *
 * Este helper asegura que TODOS los queries incluyan tenant_id
 * para garantizar aislamiento perfecto entre tiendas
 *
 * USO:
 * const tenantDB = new TenantDB(c.env.DB, tenant.id);
 * const products = await tenantDB.getAll('products');
 */

export class TenantDB {
  private db: D1Database;
  private tenantId: string;

  constructor(db: D1Database, tenantId: string) {
    this.db = db;
    this.tenantId = tenantId;
  }

  /**
   * Get all records from a table (filtered by tenant)
   */
  async getAll<T = any>(table: string): Promise<T[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM ${table} WHERE tenant_id = ? ORDER BY created_at DESC`)
      .bind(this.tenantId)
      .all<T>();

    return results || [];
  }

  /**
   * Get a single record by ID (filtered by tenant)
   */
  async getById<T = any>(table: string, id: string): Promise<T | null> {
    return await this.db
      .prepare(`SELECT * FROM ${table} WHERE tenant_id = ? AND id = ?`)
      .bind(this.tenantId, id)
      .first<T>();
  }

  /**
   * Query with custom WHERE clause (tenant_id is automatically added)
   *
   * Example:
   * const products = await tenantDB.query('products', 'stock > ? AND sale_price < ?', [0, 10000]);
   */
  async query<T = any>(
    table: string,
    whereClause?: string,
    params: any[] = []
  ): Promise<T[]> {
    let sql = `SELECT * FROM ${table} WHERE tenant_id = ?`;
    const bindings = [this.tenantId];

    if (whereClause) {
      sql += ` AND (${whereClause})`;
      bindings.push(...params);
    }

    const { results } = await this.db
      .prepare(sql)
      .bind(...bindings)
      .all<T>();

    return results || [];
  }

  /**
   * Insert a new record (tenant_id is automatically added)
   */
  async insert(table: string, data: Record<string, any>): Promise<string> {
    // Force tenant_id
    data.tenant_id = this.tenantId;

    // Add created_at timestamp if not present
    if (!data.created_at) {
      data.created_at = new Date().toISOString();
    }
    // NOTE: Don't add updated_at on insert - only some tables have it
    // Tables like credit_payments, sale_items, etc. only have created_at

    // Filter out undefined values (D1 doesn't support undefined)
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    const columns = Object.keys(cleanData);
    const values = Object.values(cleanData);
    const placeholders = values.map(() => '?').join(', ');

    await this.db
      .prepare(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
      )
      .bind(...values)
      .run();

    return data.id;
  }

  /**
   * Update a record (tenant_id validation is automatic)
   */
  async update(table: string, id: string, data: Record<string, any>): Promise<void> {
    // Remove tenant_id from data to prevent changing it
    delete data.tenant_id;

    // Update timestamp only for tables that have updated_at
    // Some tables like credit_payments, sale_items only have created_at
    const TABLES_WITHOUT_UPDATED_AT = [
      'credit_payments',
      'sale_items',
      'purchase_order_items',
      'inventory_movements',
    ];

    if (!TABLES_WITHOUT_UPDATED_AT.includes(table) && !data.updated_at) {
      data.updated_at = new Date().toISOString();
    }

    // Filter out undefined values (D1 doesn't support undefined)
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    const sets = Object.keys(cleanData).map(k => `${k} = ?`).join(', ');
    const values = Object.values(cleanData);

    await this.db
      .prepare(
        `UPDATE ${table} SET ${sets} WHERE tenant_id = ? AND id = ?`
      )
      .bind(...values, this.tenantId, id)
      .run();
  }

  /**
   * Delete a record (tenant_id validation is automatic)
   */
  async delete(table: string, id: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM ${table} WHERE tenant_id = ? AND id = ?`)
      .bind(this.tenantId, id)
      .run();
  }

  /**
   * Count records (filtered by tenant)
   */
  async count(table: string, whereClause?: string, params: any[] = []): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${table} WHERE tenant_id = ?`;
    const bindings = [this.tenantId];

    if (whereClause) {
      sql += ` AND (${whereClause})`;
      bindings.push(...params);
    }

    const result = await this.db
      .prepare(sql)
      .bind(...bindings)
      .first<{ count: number }>();

    return result?.count || 0;
  }

  /**
   * Execute raw SQL with tenant_id automatically bound
   * USE WITH CAUTION - Prefer using the helper methods above
   */
  async raw<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const { results } = await this.db
      .prepare(sql)
      .bind(this.tenantId, ...params)
      .all<T>();

    return results || [];
  }

  /**
   * Search records (simple LIKE search)
   */
  async search<T = any>(
    table: string,
    column: string,
    searchTerm: string
  ): Promise<T[]> {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM ${table} WHERE tenant_id = ? AND ${column} LIKE ? ORDER BY created_at DESC`
      )
      .bind(this.tenantId, `%${searchTerm}%`)
      .all<T>();

    return results || [];
  }

  /**
   * Get records with pagination
   */
  async paginate<T = any>(
    table: string,
    limit: number = 50,
    offset: number = 0,
    orderBy: string = 'created_at DESC'
  ): Promise<{ data: T[]; total: number }> {
    // Get data
    const { results } = await this.db
      .prepare(
        `SELECT * FROM ${table} WHERE tenant_id = ? ORDER BY ${orderBy} LIMIT ? OFFSET ?`
      )
      .bind(this.tenantId, limit, offset)
      .all<T>();

    // Get total count
    const total = await this.count(table);

    return {
      data: results || [],
      total,
    };
  }

  /**
   * Batch insert (multiple records at once)
   */
  async batchInsert(table: string, records: Record<string, any>[]): Promise<void> {
    if (records.length === 0) return;

    // Prepare statements
    const statements = records.map(data => {
      data.tenant_id = this.tenantId;
      if (!data.created_at) data.created_at = new Date().toISOString();
      // Don't add updated_at for relation tables (sale_items, purchase_order_items, etc.)
      // Only main entity tables have updated_at

      // Filter out undefined values (D1 doesn't support undefined)
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );

      const columns = Object.keys(cleanData);
      const values = Object.values(cleanData);
      const placeholders = values.map(() => '?').join(', ');

      return this.db
        .prepare(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
        )
        .bind(...values);
    });

    // Execute as batch
    await this.db.batch(statements);
  }

  /**
   * Get the tenant ID (for debugging/logging)
   */
  getTenantId(): string {
    return this.tenantId;
  }
}

/**
 * Helper function to generate UUIDs (for IDs)
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return prefix ? `${prefix}_${timestamp}_${randomPart}` : `${timestamp}_${randomPart}`;
}

/**
 * Helper to validate that data doesn't contain tenant_id manipulation
 */
export function sanitizeData(data: Record<string, any>): Record<string, any> {
  const sanitized = { ...data };
  delete sanitized.tenant_id; // Never allow external setting of tenant_id
  return sanitized;
}
