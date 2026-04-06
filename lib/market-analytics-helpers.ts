import type { GetTokenFn } from './cloudflare-api';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL ||
  'https://tienda-pos-api.julii1295.workers.dev';

export interface TrendingProduct {
  product_name: string;
  total_quantity_sold: number;
  store_count: number;
  avg_sale_price: number;
}

export interface MarketTrendsData {
  city: string | null;
  city_trends: TrendingProduct[];
  national_trends: TrendingProduct[];
  generated_at: string;
}

function getSelectedTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('selected_tenant_id');
}

export async function getMarketTrends(getToken: GetTokenFn): Promise<MarketTrendsData> {
  const token = await getToken();
  if (!token) throw new Error('No se pudo obtener el token de autenticación');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const tenantId = getSelectedTenantId();
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  const response = await fetch(`${API_BASE_URL}/api/market/trends`, { headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as any).error || `Error ${response.status}`);
  }

  const result = await response.json() as { success: boolean; data: MarketTrendsData; error?: string };

  if (!result.success) throw new Error(result.error || 'Error al obtener tendencias');

  return result.data;
}
