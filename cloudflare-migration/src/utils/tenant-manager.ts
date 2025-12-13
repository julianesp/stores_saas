/**
 * Tenant Manager - Handles multi-tenant database routing
 * Each tenant (store) has its own isolated D1 database
 */

import type { Env, Tenant } from '../types';

export class TenantManager {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Get tenant information by Clerk User ID
   */
  async getTenantByClerkId(clerkUserId: string): Promise<Tenant | null> {
    // First, try to get from KV cache (fast lookup)
    const cachedTenant = await this.env.TENANTS.get(`clerk:${clerkUserId}`, 'json');
    if (cachedTenant) {
      return cachedTenant as Tenant;
    }

    // If not in cache, query from TENANTS_DB
    const result = await this.env.TENANTS_DB
      .prepare('SELECT * FROM tenants WHERE clerk_user_id = ?')
      .bind(clerkUserId)
      .first<Tenant>();

    if (result) {
      // Cache it for 1 hour
      await this.env.TENANTS.put(
        `clerk:${clerkUserId}`,
        JSON.stringify(result),
        { expirationTtl: 3600 }
      );
    }

    return result;
  }

  /**
   * Get tenant information by tenant ID
   */
  async getTenantById(tenantId: string): Promise<Tenant | null> {
    const result = await this.env.TENANTS_DB
      .prepare('SELECT * FROM tenants WHERE id = ?')
      .bind(tenantId)
      .first<Tenant>();

    return result;
  }

  /**
   * Create a new tenant and their isolated database
   */
  async createTenant(
    id: string,
    clerkUserId: string,
    email: string
  ): Promise<Tenant> {
    const databaseName = `store_${id}`;

    // Note: Creating D1 databases dynamically requires Cloudflare API
    // This is a simplified version - in production, you'd call Cloudflare API
    // or pre-create databases and assign them here

    const tenant: Tenant = {
      id,
      clerkUserId,
      email,
      databaseName,
      databaseId: `db_${id}`, // This would come from Cloudflare API
      subscriptionStatus: 'trial',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Insert into tenants management database
    await this.env.TENANTS_DB
      .prepare(
        `INSERT INTO tenants (id, clerk_user_id, email, database_name, database_id, subscription_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        tenant.id,
        tenant.clerkUserId,
        tenant.email,
        tenant.databaseName,
        tenant.databaseId,
        tenant.subscriptionStatus,
        tenant.createdAt,
        tenant.updatedAt
      )
      .run();

    // Cache it
    await this.env.TENANTS.put(
      `clerk:${clerkUserId}`,
      JSON.stringify(tenant),
      { expirationTtl: 3600 }
    );

    return tenant;
  }

  /**
   * Update tenant subscription status
   */
  async updateTenantSubscription(
    tenantId: string,
    status: 'trial' | 'active' | 'expired' | 'canceled'
  ): Promise<void> {
    await this.env.TENANTS_DB
      .prepare(
        `UPDATE tenants
         SET subscription_status = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(status, new Date().toISOString(), tenantId)
      .run();

    // Invalidate cache
    const tenant = await this.getTenantById(tenantId);
    if (tenant) {
      await this.env.TENANTS.delete(`clerk:${tenant.clerkUserId}`);
    }
  }

  /**
   * Get D1 database binding for a specific tenant
   *
   * IMPORTANT: In production, you need to:
   * 1. Pre-create D1 databases for each tenant
   * 2. Add them to wrangler.toml as bindings
   * 3. Map tenant -> binding dynamically
   *
   * For now, this is a placeholder that shows the concept
   */
  getTenantDatabase(tenant: Tenant): D1Database {
    // In a real implementation, you would:
    // 1. Have multiple D1 bindings in wrangler.toml
    // 2. Store binding name in tenant record
    // 3. Return the correct binding from env

    // Example conceptual code:
    // return (this.env as any)[tenant.databaseBinding];

    // For now, we'll use a single shared DB (NOT RECOMMENDED FOR PRODUCTION)
    // Each tenant should have their own D1 instance
    throw new Error('getTenantDatabase not implemented - each tenant needs separate D1 binding');
  }

  /**
   * List all tenants (for admin purposes)
   */
  async listTenants(limit: number = 100, offset: number = 0): Promise<Tenant[]> {
    const result = await this.env.TENANTS_DB
      .prepare('SELECT * FROM tenants ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all<Tenant>();

    return result.results || [];
  }

  /**
   * Delete tenant and all associated data
   * DANGEROUS OPERATION - requires confirmation
   */
  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Delete from tenants DB
    await this.env.TENANTS_DB
      .prepare('DELETE FROM tenants WHERE id = ?')
      .bind(tenantId)
      .run();

    // Clear cache
    await this.env.TENANTS.delete(`clerk:${tenant.clerkUserId}`);

    // Note: Also need to delete the tenant's D1 database via Cloudflare API
    // This would require calling the Cloudflare API to drop the database
  }
}

/**
 * Helper function to generate tenant ID
 */
export function generateTenantId(): string {
  return `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
