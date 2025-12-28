/**
 * Shipping Zones API functions
 */

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'https://tienda-pos-api.julii1295.workers.dev';

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ShippingZone {
  id: string;
  tenant_id: string;
  zone_name: string;
  shipping_cost: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateShippingZoneData {
  zone_name: string;
  shipping_cost: number;
  is_active?: boolean;
}

export interface UpdateShippingZoneData {
  zone_name?: string;
  shipping_cost?: number;
  is_active?: boolean;
}

/**
 * Get all shipping zones for the authenticated tenant
 */
export async function getShippingZones(getToken: () => Promise<string | null>): Promise<ShippingZone[]> {
  const token = await getToken();
  const url = `${WORKER_URL}/api/shipping-zones`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status}`);
  }

  const data: APIResponse<ShippingZone[]> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch shipping zones');
  }

  return data.data || [];
}

/**
 * Create a new shipping zone
 */
export async function createShippingZone(
  zoneData: CreateShippingZoneData,
  getToken: () => Promise<string | null>
): Promise<ShippingZone> {
  const token = await getToken();
  const url = `${WORKER_URL}/api/shipping-zones`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(zoneData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status}`);
  }

  const data: APIResponse<ShippingZone> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to create shipping zone');
  }

  return data.data as ShippingZone;
}

/**
 * Update a shipping zone
 */
export async function updateShippingZone(
  zoneId: string,
  zoneData: UpdateShippingZoneData,
  getToken: () => Promise<string | null>
): Promise<ShippingZone> {
  const token = await getToken();
  const url = `${WORKER_URL}/api/shipping-zones/${zoneId}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(zoneData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status}`);
  }

  const data: APIResponse<ShippingZone> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to update shipping zone');
  }

  return data.data as ShippingZone;
}

/**
 * Delete a shipping zone
 */
export async function deleteShippingZone(
  zoneId: string,
  getToken: () => Promise<string | null>
): Promise<void> {
  const token = await getToken();
  const url = `${WORKER_URL}/api/shipping-zones/${zoneId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status}`);
  }

  const data: APIResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to delete shipping zone');
  }
}
