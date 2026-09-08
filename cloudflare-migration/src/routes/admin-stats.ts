import { Hono } from 'hono';
import type { Env, APIResponse, Tenant } from '../types';

const app = new Hono<{ Bindings: Env }>();

interface StoreStats {
  storeId: string;
  storeName: string;
  storeEmail: string;
  subscriptionStatus: string;
  stats: {
    productsCount: number;
    salesCount: number;
    salesTotal: number;
    customersCount: number;
    lastSaleDate: string | null;
    isActive: boolean;
    // Tienda online: los pedidos web se guardan como ventas con sale_number LIKE 'WEB-%'.
    // webOrdersCount/Total cuentan solo pedidos completados (venta efectiva);
    // webOrdersReceived cuenta todos los pedidos web recibidos (demanda), sin filtrar estado.
    webOrdersReceived: number;
    webOrdersCount: number;
    webOrdersTotal: number;
    lastWebOrderDate: string | null;
    storeEnabled: boolean;
    hasStoreAddon: boolean;
    hasStoreSlug: boolean;
    usesStorefront: boolean;
  };
}

/**
 * GET /api/admin/stats
 * Obtener estadísticas de uso de todas las tiendas
 * Solo para super admins
 */
app.get('/stats', async (c) => {
  try {
    const tenant: Tenant = c.get('tenant');

    // Verificar que el usuario sea super admin
    const currentProfile = await c.env.DB.prepare(
      'SELECT * FROM user_profiles WHERE clerk_user_id = ?'
    )
      .bind(tenant.clerk_user_id)
      .first<any>();

    if (!currentProfile?.is_superadmin) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'No tienes permisos para acceder a esta información',
        data: null
      }, 403);
    }

    // Obtener todos los user profiles (tiendas)
    const allProfiles = await c.env.DB.prepare(
      'SELECT * FROM user_profiles WHERE is_superadmin = 0 OR is_superadmin IS NULL ORDER BY created_at DESC'
    ).all<any>();

    const stores = allProfiles.results || [];

    // Obtener estadísticas para cada tienda
    const storeStats: StoreStats[] = await Promise.all(
      stores.map(async (store) => {
        try {
          // DEBUG: Log para ver qué tenant_id estamos usando
          console.log(`[ADMIN-STATS] Getting stats for store: ${store.id} (${store.email})`);

          // Contar productos
          const productsResult = await c.env.DB.prepare(
            'SELECT COUNT(*) as count FROM products WHERE tenant_id = ?'
          )
            .bind(store.id)
            .first<{ count: number }>();

          const productsCount = productsResult?.count || 0;

          // DEBUG: Log para ver cuántos productos encontramos
          console.log(`[ADMIN-STATS] Store ${store.email} has ${productsCount} products with tenant_id=${store.id}`);

          // Contar ventas y obtener total
          const salesResult = await c.env.DB.prepare(
            'SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE tenant_id = ? AND status = ?'
          )
            .bind(store.id, 'completada')
            .first<{ count: number; total: number }>();

          const salesCount = salesResult?.count || 0;
          const salesTotal = salesResult?.total || 0;

          // Contar clientes
          const customersResult = await c.env.DB.prepare(
            'SELECT COUNT(*) as count FROM customers WHERE tenant_id = ?'
          )
            .bind(store.id)
            .first<{ count: number }>();

          const customersCount = customersResult?.count || 0;

          // Obtener fecha de la última venta
          const lastSaleResult = await c.env.DB.prepare(
            'SELECT created_at FROM sales WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1'
          )
            .bind(store.id, 'completada')
            .first<{ created_at: string }>();

          const lastSaleDate = lastSaleResult?.created_at || null;

          // --- Métricas de la tienda online ---
          // Los pedidos hechos desde la tienda pública se guardan como ventas
          // con sale_number que empieza por 'WEB-' (ver routes/storefront.ts).
          // Demanda: todos los pedidos web recibidos, sin importar el estado.
          const webReceivedResult = await c.env.DB.prepare(
            "SELECT COUNT(*) as count FROM sales WHERE tenant_id = ? AND sale_number LIKE 'WEB-%'"
          )
            .bind(store.id)
            .first<{ count: number }>();

          const webOrdersReceived = webReceivedResult?.count || 0;

          // Venta efectiva: solo pedidos web completados.
          const webCompletedResult = await c.env.DB.prepare(
            "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE tenant_id = ? AND status = ? AND sale_number LIKE 'WEB-%'"
          )
            .bind(store.id, 'completada')
            .first<{ count: number; total: number }>();

          const webOrdersCount = webCompletedResult?.count || 0;
          const webOrdersTotal = webCompletedResult?.total || 0;

          // Último pedido web (cualquier estado) para ver actividad reciente.
          const lastWebOrderResult = await c.env.DB.prepare(
            "SELECT created_at FROM sales WHERE tenant_id = ? AND sale_number LIKE 'WEB-%' ORDER BY created_at DESC LIMIT 1"
          )
            .bind(store.id)
            .first<{ created_at: string }>();

          const lastWebOrderDate = lastWebOrderResult?.created_at || null;

          const storeEnabled = store.store_enabled === 1;
          const hasStoreAddon = store.has_store_addon === 1;
          const hasStoreSlug = !!store.store_slug;
          // "Usa la tienda" = tiene ≥1 pedido web completado (venta efectiva).
          const usesStorefront = webOrdersCount > 0;

          return {
            storeId: store.id,
            storeName: store.full_name || store.email,
            storeEmail: store.email,
            subscriptionStatus: store.subscription_status,
            stats: {
              productsCount,
              salesCount,
              salesTotal,
              customersCount,
              lastSaleDate,
              isActive: salesCount > 0 || productsCount > 0,
              webOrdersReceived,
              webOrdersCount,
              webOrdersTotal,
              lastWebOrderDate,
              storeEnabled,
              hasStoreAddon,
              hasStoreSlug,
              usesStorefront,
            },
          };
        } catch (error) {
          console.error(`Error getting stats for store ${store.id}:`, error);
          return {
            storeId: store.id,
            storeName: store.full_name || store.email,
            storeEmail: store.email,
            subscriptionStatus: store.subscription_status,
            stats: {
              productsCount: 0,
              salesCount: 0,
              salesTotal: 0,
              customersCount: 0,
              lastSaleDate: null,
              isActive: false,
              webOrdersReceived: 0,
              webOrdersCount: 0,
              webOrdersTotal: 0,
              lastWebOrderDate: null,
              storeEnabled: false,
              hasStoreAddon: false,
              hasStoreSlug: false,
              usesStorefront: false,
            },
          };
        }
      })
    );

    return c.json<APIResponse<StoreStats[]>>({
      success: true,
      data: storeStats
    });

  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return c.json<APIResponse<null>>({
      success: false,
      error: error.message || 'Failed to fetch admin stats',
      data: null
    }, 500);
  }
});

export default app;
