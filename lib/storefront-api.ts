/**
 * API functions for public storefront (no authentication required)
 */

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'https://tienda-pos-api.julii1295.workers.dev';

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StoreConfig {
  id: string;
  store_slug?: string;
  store_name?: string;
  store_description?: string;
  store_logo_url?: string;
  store_banner_url?: string;
  store_primary_color?: string;
  store_secondary_color?: string;
  store_whatsapp?: string;
  store_facebook?: string;
  store_instagram?: string;
  store_address?: string;
  store_city?: string;
  store_phone?: string;
  store_email?: string;
  store_enabled?: number;
  store_terms?: string;
  store_shipping_enabled?: number;
  store_pickup_enabled?: number;
  store_min_order?: number;
  store_nequi_number?: string;
  wompi_public_key?: string;
  wompi_private_key?: string;
  wompi_enabled?: number;
}

export interface StoreProduct {
  id: string;
  name: string;
  description?: string;
  sale_price: number;
  stock: number;
  images?: string;
  category_id?: string;
  category_name?: string;
  discount_percentage?: number;
  offer_id?: string;
}

export interface StoreCategory {
  id: string;
  name: string;
  description?: string;
  product_count: number;
}

async function fetchStorefrontAPI<T>(endpoint: string): Promise<T> {
  const url = `${WORKER_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status}`);
  }

  const data: APIResponse<T> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'API request failed');
  }

  return data.data as T;
}

/**
 * Get store configuration by slug
 */
export async function getStoreConfig(slug: string): Promise<StoreConfig> {
  return fetchStorefrontAPI<StoreConfig>(`/api/storefront/config/${slug}`);
}

/**
 * Get store products
 */
export async function getStoreProducts(slug: string, categoryId?: string): Promise<StoreProduct[]> {
  const params = categoryId ? `?category=${categoryId}` : '';
  return fetchStorefrontAPI<StoreProduct[]>(`/api/storefront/products/${slug}${params}`);
}

/**
 * Get single product details
 */
export async function getStoreProduct(slug: string, productId: string): Promise<StoreProduct> {
  return fetchStorefrontAPI<StoreProduct>(`/api/storefront/product/${slug}/${productId}`);
}

/**
 * Get store categories
 */
export async function getStoreCategories(slug: string): Promise<StoreCategory[]> {
  return fetchStorefrontAPI<StoreCategory[]>(`/api/storefront/categories/${slug}`);
}

/**
 * Calculate price with discount
 */
export function calculateDiscountedPrice(originalPrice: number, discountPercentage: number): number {
  return originalPrice - (originalPrice * discountPercentage / 100);
}

/**
 * Format product images (parse JSON string to array)
 */
export function parseProductImages(images?: string): string[] {
  if (!images) return [];
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Create order from storefront
 */
export interface CreateOrderData {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_method: 'pickup' | 'shipping';
  delivery_address?: string;
  shipping_cost?: number;
  notes?: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    discount_percentage?: number;
  }>;
}

export interface OrderResponse {
  order_id: string;
  order_number: string;
  total: number;
  store_whatsapp?: string;
  wompi_enabled?: boolean;
}

export interface WompiPaymentLinkResponse {
  payment_link_id: string;
  checkout_url: string;
  expires_at?: string;
}

export async function createOrder(slug: string, orderData: CreateOrderData): Promise<OrderResponse> {
  const url = `${WORKER_URL}/api/storefront/orders/${slug}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status}`);
  }

  const data: APIResponse<OrderResponse> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to create order');
  }

  return data.data as OrderResponse;
}

/**
 * Get active shipping zones for a store
 */
export interface ShippingZonePublic {
  id: string;
  zone_name: string;
  shipping_cost: number;
}

export async function getStoreShippingZones(slug: string): Promise<ShippingZonePublic[]> {
  return fetchStorefrontAPI<ShippingZonePublic[]>(`/api/storefront/shipping-zones/${slug}`);
}

/**
 * Create Wompi payment link for an order (public endpoint)
 */
export async function createWompiPaymentLink(
  slug: string,
  orderData: {
    order_id: string;
    order_number: string;
    amount_in_cents: number;
    customer_email?: string;
    customer_name?: string;
  }
): Promise<WompiPaymentLinkResponse> {
  const url = `${WORKER_URL}/api/storefront/wompi/create-payment-link/${slug}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status}`);
  }

  const data: APIResponse<WompiPaymentLinkResponse> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to create payment link');
  }

  return data.data as WompiPaymentLinkResponse;
}

/**
 * Get order details by order number (public endpoint)
 */
export async function getOrderByNumber(
  slug: string,
  orderNumber: string
): Promise<any> {
  const url = `${WORKER_URL}/api/storefront/orders/${slug}/${orderNumber}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status}`);
  }

  const data: APIResponse<any> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to get order');
  }

  return data.data;
}
