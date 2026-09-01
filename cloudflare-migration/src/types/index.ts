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
  // Emisor (issuer) esperado del JWT de Clerk, p. ej.
  // "https://clerk.posib.dev" (prod) o "https://<slug>.clerk.accounts.dev" (dev).
  // Se usa para verificar la firma del token contra el JWKS de Clerk.
  CLERK_JWT_ISSUER?: string;

  // Wompi credentials for SaaS subscriptions (Admin account)
  ADMIN_WOMPI_PUBLIC_KEY?: string;
  ADMIN_WOMPI_PRIVATE_KEY?: string;

  // CRON secret for scheduled tasks
  CRON_SECRET?: string;

  // Resend API key para el envío de emails (marketing/transaccionales)
  RESEND_API_KEY?: string;

  // Telegram bot (avisos de productos próximos a vencer)
  TELEGRAM_BOT_TOKEN?: string;
  // Secret token que Telegram reenvía en el header del webhook (opcional pero
  // recomendado): se configura al registrar el webhook con setWebhook.
  TELEGRAM_WEBHOOK_SECRET?: string;

  // D1 shared database
  DB: D1Database;

  // R2 bucket para almacenar facturas en PDF
  FACTURAS_BUCKET: R2Bucket;
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
