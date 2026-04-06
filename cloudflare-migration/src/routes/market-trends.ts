import { Hono } from 'hono';
import type { Env, APIResponse, Tenant } from '../types';

const app = new Hono<{ Bindings: Env }>();

export interface TrendingProduct {
  product_name: string;
  total_quantity_sold: number;
  store_count: number;       // cuántas tiendas lo venden
  avg_sale_price: number;
}

export interface MarketTrendsData {
  city: string | null;
  city_trends: TrendingProduct[];
  national_trends: TrendingProduct[];
  generated_at: string;
}

/**
 * GET /api/market/trends
 * Retorna productos más vendidos en la ciudad del solicitante y a nivel nacional.
 * Solo agrega datos anónimos (sin identificar tiendas específicas).
 * Disponible para usuarios en trial activo, plan activo, o superadmin.
 */
app.get('/trends', async (c) => {
  try {
    const tenant: Tenant = c.get('tenant');

    // Obtener el perfil del solicitante para saber su ciudad y verificar acceso
    const currentProfile = await c.env.DB.prepare(
      'SELECT id, store_city, subscription_status, trial_end_date, has_ai_addon, is_superadmin FROM user_profiles WHERE id = ?'
    )
      .bind(tenant.id)
      .first<any>();

    if (!currentProfile) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'Perfil no encontrado',
        data: null,
      }, 404);
    }

    // Verificar acceso: trial activo, suscripción activa, o superadmin
    const now = new Date();
    const isTrialActive =
      currentProfile.subscription_status === 'trial' &&
      currentProfile.trial_end_date &&
      new Date(currentProfile.trial_end_date) > now;
    const isActive = currentProfile.subscription_status === 'active';
    const isSuperadmin = currentProfile.is_superadmin === 1;

    if (!isTrialActive && !isActive && !isSuperadmin) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'Suscripción requerida para acceder a tendencias del mercado',
        data: null,
      }, 403);
    }

    const storeCity = currentProfile.store_city as string | null;

    // Periodo de análisis: últimos 30 días
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // ── Tendencias Nacionales ──────────────────────────────────────────────
    // Productos más vendidos en todas las tiendas activas (trial + activas)
    // Excluimos el tenant actual para no sesgar con sus propios datos
    const nationalResult = await c.env.DB.prepare(`
      SELECT
        p.name AS product_name,
        SUM(si.quantity) AS total_quantity_sold,
        COUNT(DISTINCT si.tenant_id) AS store_count,
        AVG(si.unit_price) AS avg_sale_price
      FROM sale_items si
      INNER JOIN products p ON p.id = si.product_id AND p.tenant_id = si.tenant_id
      INNER JOIN sales s ON s.id = si.sale_id AND s.tenant_id = si.tenant_id
      INNER JOIN user_profiles up ON up.id = si.tenant_id
      WHERE
        s.status = 'completada'
        AND s.created_at >= ?
        AND si.tenant_id != ?
        AND (up.subscription_status = 'active' OR (up.subscription_status = 'trial' AND up.trial_end_date > ?))
      GROUP BY p.name
      ORDER BY total_quantity_sold DESC
      LIMIT 15
    `)
      .bind(thirtyDaysAgo, tenant.id, now.toISOString())
      .all<any>();

    const nationalTrends: TrendingProduct[] = (nationalResult.results || []).map((r: any) => ({
      product_name: r.product_name,
      total_quantity_sold: r.total_quantity_sold,
      store_count: r.store_count,
      avg_sale_price: Math.round(r.avg_sale_price || 0),
    }));

    // ── Tendencias por Ciudad ──────────────────────────────────────────────
    let cityTrends: TrendingProduct[] = [];

    if (storeCity) {
      const normalizedCity = storeCity.trim().toLowerCase();

      const cityResult = await c.env.DB.prepare(`
        SELECT
          p.name AS product_name,
          SUM(si.quantity) AS total_quantity_sold,
          COUNT(DISTINCT si.tenant_id) AS store_count,
          AVG(si.unit_price) AS avg_sale_price
        FROM sale_items si
        INNER JOIN products p ON p.id = si.product_id AND p.tenant_id = si.tenant_id
        INNER JOIN sales s ON s.id = si.sale_id AND s.tenant_id = si.tenant_id
        INNER JOIN user_profiles up ON up.id = si.tenant_id
        WHERE
          s.status = 'completada'
          AND s.created_at >= ?
          AND si.tenant_id != ?
          AND LOWER(TRIM(up.store_city)) = ?
          AND (up.subscription_status = 'active' OR (up.subscription_status = 'trial' AND up.trial_end_date > ?))
        GROUP BY p.name
        ORDER BY total_quantity_sold DESC
        LIMIT 15
      `)
        .bind(thirtyDaysAgo, tenant.id, normalizedCity, now.toISOString())
        .all<any>();

      cityTrends = (cityResult.results || []).map((r: any) => ({
        product_name: r.product_name,
        total_quantity_sold: r.total_quantity_sold,
        store_count: r.store_count,
        avg_sale_price: Math.round(r.avg_sale_price || 0),
      }));
    }

    const data: MarketTrendsData = {
      city: storeCity || null,
      city_trends: cityTrends,
      national_trends: nationalTrends,
      generated_at: now.toISOString(),
    };

    return c.json<APIResponse<MarketTrendsData>>({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching market trends:', error);
    return c.json<APIResponse<null>>({
      success: false,
      error: error.message || 'Error al obtener tendencias del mercado',
      data: null,
    }, 500);
  }
});

export default app;
