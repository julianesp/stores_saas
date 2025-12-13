// Types for Cloudflare Workers Environment
export interface Env {
  // KV namespace for tenant metadata
  TENANTS: KVNamespace;

  // D1 database for tenant management
  TENANTS_DB: D1Database;

  // Environment variables
  ENVIRONMENT: string;
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
}

// Tenant information
export interface Tenant {
  id: string;
  clerkUserId: string;
  email: string;
  databaseName: string;
  databaseId: string;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'canceled';
  createdAt: string;
  updatedAt: string;
}

// Database binding for a specific tenant
export interface TenantContext {
  tenant: Tenant;
  db: D1Database;
}

// Clerk JWT payload
export interface ClerkJWTPayload {
  sub: string; // Clerk user ID
  email?: string;
  iat: number;
  exp: number;
  iss: string;
  [key: string]: any;
}

// API Response wrapper
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Query parameters for filtering
export interface QueryParams {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  [key: string]: any;
}
