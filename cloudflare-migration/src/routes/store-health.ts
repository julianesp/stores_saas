/**
 * GET /api/admin/health — salud de cada tienda cliente (solo superadmin).
 *
 * Cada métrica sale de una sola consulta agrupada por tenant_id (no una por
 * tienda), para no gastar el límite diario de lecturas de D1. Las reglas del
 * puntaje viven en utils/store-health.ts.
 */

import { Hono } from 'hono';
import type { AppEnv, APIResponse } from '../types';
import { evaluateStoreHealth, type HealthIssue, type HealthLevel } from '../utils/store-health';

const DAY_MS = 24 * 60 * 60 * 1000;
const CO_OFFSET_MS = 5 * 60 * 60 * 1000;

export interface StoreHealthRow {
  storeId: string;
  storeName: string;
  email: string;
  phone: string | null;
  businessType: string | null;
  subscriptionStatus: string;
  createdAt: string | null;
  lastSaleAt: string | null;
  sales7d: number;
  sales30d: number;
  revenue30d: number;
  activeProducts: number;
  score: number;
  level: HealthLevel;
  daysSinceLastSale: number | null;
  trialDaysLeft: number | null;
  issues: HealthIssue[];
}

type Agg = Record<string, number | string | null> & { tenant_id: string };

const byTenant = (rows: unknown[]) => new Map((rows as Agg[]).map((r) => [r.tenant_id, r]));
const num = (row: Agg | undefined, key: string) => Number(row?.[key] ?? 0) || 0;
const day = (time: number) => new Date(time).toISOString().slice(0, 10);

const app = new Hono<AppEnv>();

app.get('/', async (c) => {
  const tenant = c.get('tenant');
  if (!tenant.is_superadmin) {
    return c.json<APIResponse<null>>(
      { success: false, error: 'No tienes permisos para acceder a esta información', data: null },
      403
    );
  }

  try {
    const now = Date.now();
    // Cortes por fecha (YYYY-MM-DD): comparan bien tanto con ISO como con datetime('now').
    const since7 = day(now - 7 * DAY_MS);
    const since30 = day(now - 30 * DAY_MS);
    const todayCo = day(now - CO_OFFSET_MS);
    const db = c.env.DB;

    const [profiles, sales, products, repeated, credit] = await db.batch([
      db.prepare(
        `SELECT * FROM user_profiles
         WHERE COALESCE(is_superadmin, 0) = 0
         ORDER BY created_at DESC`
      ),
      db
        .prepare(
          `SELECT tenant_id,
                  MAX(created_at) AS last_sale_at,
                  SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS sales_7d,
                  SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS sales_30d,
                  SUM(CASE WHEN created_at >= ? THEN total ELSE 0 END) AS revenue_30d
           FROM sales WHERE status != 'cancelada'
           GROUP BY tenant_id`
        )
        .bind(since7, since30, since30),
      db
        .prepare(
          `SELECT tenant_id,
                  COUNT(*) AS active_products,
                  SUM(CASE WHEN COALESCE(cost_price, 0) <= 0 THEN 1 ELSE 0 END) AS without_cost,
                  SUM(CASE WHEN COALESCE(sale_price, 0) <= 0 THEN 1 ELSE 0 END) AS without_price,
                  SUM(CASE WHEN COALESCE(track_inventory, 1) = 1 AND stock < 0 THEN 1 ELSE 0 END) AS negative_stock,
                  SUM(CASE WHEN expiration_date IS NOT NULL AND expiration_date != ''
                            AND substr(expiration_date, 1, 10) < ? AND stock > 0 THEN 1 ELSE 0 END) AS expired_with_stock
           FROM products WHERE COALESCE(is_active, 1) = 1
           GROUP BY tenant_id`
        )
        .bind(todayCo),
      db.prepare(
        `SELECT tenant_id, COUNT(*) AS repeated_names FROM (
           SELECT tenant_id FROM products WHERE COALESCE(is_active, 1) = 1
           GROUP BY tenant_id, lower(trim(name)) HAVING COUNT(*) > 1
         ) GROUP BY tenant_id`
      ),
      db
        .prepare(
          `SELECT tenant_id, COUNT(*) AS old_credit_count, COALESCE(SUM(amount_pending), 0) AS old_credit_amount
           FROM sales
           WHERE payment_method = 'credito' AND payment_status IN ('pendiente', 'parcial')
             AND status != 'cancelada' AND COALESCE(amount_pending, 0) > 0 AND created_at < ?
           GROUP BY tenant_id`
        )
        .bind(since30),
    ]);

    const salesBy = byTenant(sales.results);
    const productsBy = byTenant(products.results);
    const repeatedBy = byTenant(repeated.results);
    const creditBy = byTenant(credit.results);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: StoreHealthRow[] = (profiles.results as any[]).map((p) => {
      const s = salesBy.get(p.id);
      const pr = productsBy.get(p.id);
      const lastSaleAt = (s?.last_sale_at as string | null) ?? null;

      const health = evaluateStoreHealth(
        {
          createdAt: p.created_at ?? null,
          subscriptionStatus: p.subscription_status,
          trialEndDate: p.trial_end_date ?? null,
          hasTelegram: !!p.telegram_chat_id,
          lastSaleAt,
          sales7d: num(s, 'sales_7d'),
          sales30d: num(s, 'sales_30d'),
          activeProducts: num(pr, 'active_products'),
          productsWithoutCost: num(pr, 'without_cost'),
          productsWithoutPrice: num(pr, 'without_price'),
          negativeStock: num(pr, 'negative_stock'),
          expiredWithStock: num(pr, 'expired_with_stock'),
          repeatedNames: num(repeatedBy.get(p.id), 'repeated_names'),
          oldCreditCount: num(creditBy.get(p.id), 'old_credit_count'),
          oldCreditAmount: num(creditBy.get(p.id), 'old_credit_amount'),
        },
        now
      );

      return {
        storeId: p.id,
        storeName: p.store_name || p.full_name || p.email,
        email: p.email,
        phone: p.store_whatsapp || p.phone || null,
        businessType: p.business_type ?? null,
        subscriptionStatus: p.subscription_status,
        createdAt: p.created_at ?? null,
        lastSaleAt,
        sales7d: num(s, 'sales_7d'),
        sales30d: num(s, 'sales_30d'),
        revenue30d: num(s, 'revenue_30d'),
        activeProducts: num(pr, 'active_products'),
        ...health,
      };
    });

    // Peor primero; a igual puntaje, la que más vende (perderla duele más).
    rows.sort((a, b) => a.score - b.score || b.sales30d - a.sales30d);

    return c.json<APIResponse<{ generatedAt: string; stores: StoreHealthRow[] }>>({
      success: true,
      data: { generatedAt: new Date(now).toISOString(), stores: rows },
    });
  } catch (error) {
    console.error('[store-health] Error calculando la salud de las tiendas:', error);
    return c.json<APIResponse<null>>(
      { success: false, error: 'No se pudo calcular la salud de las tiendas', data: null },
      500
    );
  }
});

export default app;
