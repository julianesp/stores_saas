/**
 * Cloudflare Workers API Client
 *
 * Este módulo reemplaza las llamadas directas a Firebase/Firestore
 * por llamadas HTTP a nuestra API de Cloudflare Workers.
 *
 * Uso:
 * import { getProducts, createProduct } from '@/lib/cloudflare-api';
 *
 * const products = await getProducts(getToken);
 */

import type { PurchaseOrderWithItems } from '@/lib/types';

// URL base de la API de Cloudflare Workers
const API_BASE_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';

/**
 * Tipo para la función que obtiene el token de Clerk
 */
export type GetTokenFn = () => Promise<string | null>;

/**
 * Response estándar de la API
 */
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Realizar petición HTTP a la API
 */
async function fetchAPI<T = any>(
  endpoint: string,
  getToken: GetTokenFn,
  options: RequestInit = {}
): Promise<T> {
  try {
    // Obtener token JWT de Clerk
    const token = await getToken();

    if (!token) {
      throw new Error('No se pudo obtener el token de autenticación');
    }

    // Configurar headers
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');

    // Realizar petición
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Intentar parsear JSON - si falla, obtener texto para mensaje de error
    let data: APIResponse<T> | undefined;
    try {
      data = await response.json();
    } catch (err) {
      // respuesta no JSON (p. ej. vacío), construir un mensaje legible
      const text = await response.text().catch(() => '');
      if (!response.ok) {
        throw new Error(text || `Error ${response.status}: ${response.statusText || response.status}`);
      }
      // Si está todo ok pero no hay JSON (común en DELETE), retornar vacío
      // Para operaciones como DELETE que devuelven void
      return undefined as unknown as T;
    }

    // Para DELETE y otras operaciones que retornan void, data puede ser undefined
    // Solo validar si la operación falló
    if (!response.ok) {
      // Si no hay data pero falló, construir error
      if (!data) {
        throw new Error(`Error ${response.status}: ${response.statusText || response.status}`);
      }
    }

    // Si no hay data pero response.ok es true, es una operación exitosa sin body
    if (!data && response.ok) {
      return undefined as unknown as T;
    }

    // Manejar errores: construir mensaje seguro incluso si data.error es undefined o un objeto
    if (!response.ok || (data && !data.success)) {
      let msg = '';
      if (data && typeof data.error === 'string' && data.error.trim()) msg = data.error;
      else if (data && typeof data.message === 'string' && data.message.trim()) msg = data.message;
      else if (data) msg = JSON.stringify(data);
      msg = msg || `Error ${response.status}: ${response.statusText || response.status}`;
      throw new Error(msg);
    }

    return data?.data as T;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// ============================================
// PRODUCTOS
// ============================================

export interface Product {
  id: string;
  tenant_id: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  cost_price: number;
  sale_price: number;
  stock: number;
  min_stock: number;
  expiration_date?: string;
  image_url?: string;
  images?: string;
  created_at: string;
  updated_at: string;
}

export async function getProducts(getToken: GetTokenFn): Promise<Product[]> {
  return fetchAPI<Product[]>('/api/products', getToken);
}

export async function getProductById(id: string, getToken: GetTokenFn): Promise<Product> {
  return fetchAPI<Product>(`/api/products/${id}`, getToken);
}

export async function createProduct(data: Partial<Product>, getToken: GetTokenFn): Promise<Product> {
  return fetchAPI<Product>('/api/products', getToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProduct(id: string, data: Partial<Product>, getToken: GetTokenFn): Promise<Product> {
  return fetchAPI<Product>(`/api/products/${id}`, getToken, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(id: string, getToken: GetTokenFn): Promise<void> {
  return fetchAPI<void>(`/api/products/${id}`, getToken, {
    method: 'DELETE',
  });
}

export async function searchProducts(query: string, getToken: GetTokenFn): Promise<Product[]> {
  return fetchAPI<Product[]>(`/api/products/search?q=${encodeURIComponent(query)}`, getToken);
}

export async function getLowStockProducts(getToken: GetTokenFn): Promise<Product[]> {
  return fetchAPI<Product[]>('/api/products/low-stock', getToken);
}

// ============================================
// CLIENTES
// ============================================

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  id_number?: string;
  loyalty_points: number;
  current_debt?: number;
  credit_limit?: number;
  created_at: string;
  updated_at: string;
}

export async function getCustomers(getToken: GetTokenFn): Promise<Customer[]> {
  return fetchAPI<Customer[]>('/api/customers', getToken);
}

export async function getCustomerById(id: string, getToken: GetTokenFn): Promise<Customer> {
  return fetchAPI<Customer>(`/api/customers/${id}`, getToken);
}

export async function createCustomer(data: Partial<Customer>, getToken: GetTokenFn): Promise<Customer> {
  return fetchAPI<Customer>('/api/customers', getToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCustomer(id: string, data: Partial<Customer>, getToken: GetTokenFn): Promise<Customer> {
  return fetchAPI<Customer>(`/api/customers/${id}`, getToken, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCustomer(id: string, getToken: GetTokenFn): Promise<void> {
  return fetchAPI<void>(`/api/customers/${id}`, getToken, {
    method: 'DELETE',
  });
}

// ============================================
// CATEGORÍAS
// ============================================

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export async function getCategories(getToken: GetTokenFn): Promise<Category[]> {
  return fetchAPI<Category[]>('/api/categories', getToken);
}

export async function getCategoryById(id: string, getToken: GetTokenFn): Promise<Category> {
  return fetchAPI<Category>(`/api/categories/${id}`, getToken);
}

export async function createCategory(data: Partial<Category>, getToken: GetTokenFn): Promise<Category> {
  return fetchAPI<Category>('/api/categories', getToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCategory(id: string, data: Partial<Category>, getToken: GetTokenFn): Promise<Category> {
  return fetchAPI<Category>(`/api/categories/${id}`, getToken, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: string, getToken: GetTokenFn): Promise<void> {
  return fetchAPI<void>(`/api/categories/${id}`, getToken, {
    method: 'DELETE',
  });
}

// ============================================
// PROVEEDORES
// ============================================

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  notes?: string;
  tax_id?: string;
  payment_type: 'contado' | 'credito';
  credit_days: number;
  credit_limit: number;
  current_debt: number;
  default_discount: number;
  visit_day?: string;
  website?: string;
  whatsapp?: string;
  business_hours?: string;
  rating?: number;
  status: 'activo' | 'inactivo' | 'suspendido';
  delivery_days: number;
  minimum_order: number;
  total_purchased: number;
  last_purchase_date?: string;
  created_at: string;
  updated_at: string;
}

export async function getSuppliers(getToken: GetTokenFn): Promise<Supplier[]> {
  return fetchAPI<Supplier[]>('/api/suppliers', getToken);
}

export async function getSupplierById(id: string, getToken: GetTokenFn): Promise<Supplier> {
  return fetchAPI<Supplier>(`/api/suppliers/${id}`, getToken);
}

export async function createSupplier(data: Partial<Supplier>, getToken: GetTokenFn): Promise<Supplier> {
  return fetchAPI<Supplier>('/api/suppliers', getToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSupplier(id: string, data: Partial<Supplier>, getToken: GetTokenFn): Promise<Supplier> {
  return fetchAPI<Supplier>(`/api/suppliers/${id}`, getToken, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSupplier(id: string, getToken: GetTokenFn): Promise<void> {
  return fetchAPI<void>(`/api/suppliers/${id}`, getToken, {
    method: 'DELETE',
  });
}

export interface SupplierStats {
  supplier_name: string;
  total_products: number;
  total_purchased: number;
  current_debt: number;
  credit_available: number;
  purchase_orders_count: number;
  last_purchase_date?: string;
  status: string;
  rating?: number;
}

// export async function getSuppliers(getToken: GetTokenFn): Promise<Supplier[]> {
//   return fetchAPI<Supplier[]>('/api/suppliers', getToken);
// }

// export async function getSupplierById(id: string, getToken: GetTokenFn): Promise<Supplier> {
//   return fetchAPI<Supplier>(`/api/suppliers/${id}`, getToken);
// }

// export async function createSupplier(data: Partial<Supplier>, getToken: GetTokenFn): Promise<Supplier> {
//   return fetchAPI<Supplier>('/api/suppliers', getToken, {
//     method: 'POST',
//     body: JSON.stringify(data),
//   });
// }

// export async function updateSupplier(id: string, data: Partial<Supplier>, getToken: GetTokenFn): Promise<Supplier> {
//   return fetchAPI<Supplier>(`/api/suppliers/${id}`, getToken, {
//     method: 'PUT',
//     body: JSON.stringify(data),
//   });
// }

// export async function deleteSupplier(id: string, getToken: GetTokenFn): Promise<void> {
//   return fetchAPI<void>(`/api/suppliers/${id}`, getToken, {
//     method: 'DELETE',
//   });
// }

export async function getSupplierProducts(id: string, getToken: GetTokenFn): Promise<Product[]> {
  return fetchAPI<Product[]>(`/api/suppliers/${id}/products`, getToken);
}

export async function getSupplierStats(id: string, getToken: GetTokenFn): Promise<SupplierStats> {
  return fetchAPI<SupplierStats>(`/api/suppliers/${id}/stats`, getToken);
}

// ============================================
// PURCHASE ORDERS
// ============================================

export interface PurchaseOrderItem {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  subtotal?: number;
}

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  supplier_id: string;
  order_number: string;
  status: 'pendiente' | 'recibida' | 'cancelada';
  order_date: string;
  expected_date?: string;
  received_date?: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: PurchaseOrderItem[];
}

export async function getPurchaseOrders(getToken: GetTokenFn): Promise<PurchaseOrder[]> {
  return fetchAPI<PurchaseOrder[]>('/api/purchase-orders', getToken);
}

export async function getPurchaseOrderById(id: string, getToken: GetTokenFn): Promise<PurchaseOrder> {
  return fetchAPI<PurchaseOrder>(`/api/purchase-orders/${id}`, getToken);
}

export async function getPurchaseOrdersBySupplier(supplierId: string, getToken: GetTokenFn): Promise<PurchaseOrderWithItems[]> {
  return fetchAPI<PurchaseOrderWithItems[]>(`/api/purchase-orders/supplier/${supplierId}`, getToken);
}

export async function createPurchaseOrder(data: Partial<PurchaseOrder>, getToken: GetTokenFn): Promise<PurchaseOrder> {
  return fetchAPI<PurchaseOrder>('/api/purchase-orders', getToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePurchaseOrder(id: string, data: Partial<PurchaseOrder>, getToken: GetTokenFn): Promise<PurchaseOrder> {
  return fetchAPI<PurchaseOrder>(`/api/purchase-orders/${id}`, getToken, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function receivePurchaseOrder(id: string, getToken: GetTokenFn): Promise<PurchaseOrder> {
  return fetchAPI<PurchaseOrder>(`/api/purchase-orders/${id}/receive`, getToken, {
    method: 'PUT',
  });
}

export async function deletePurchaseOrder(id: string, getToken: GetTokenFn): Promise<void> {
  return fetchAPI<void>(`/api/purchase-orders/${id}`, getToken, {
    method: 'DELETE',
  });
}

// ============================================
// VENTAS
// ============================================

export interface SaleItem {
  id: string;
  tenant_id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  created_at: string;
}

export interface Sale {
  id: string;
  tenant_id: string;
  sale_number: string;
  cashier_id: string;
  customer_id?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: 'efectivo' | 'tarjeta' | 'transferencia' | 'credito';
  payment_status?: 'pagado' | 'pendiente' | 'parcial';
  status: 'completada' | 'cancelada' | 'pendiente';
  points_earned?: number;
  created_at: string;
  updated_at: string;
  items?: SaleItem[];
}

export interface UserProfile {
  id: string;
  clerk_user_id: string;
  email: string;
  role: 'admin' | 'cajero' | 'cliente';
  full_name?: string;
  phone?: string;
  is_superadmin?: boolean;
  subscription_status: 'trial' | 'active' | 'expired' | 'canceled';
  trial_start_date?: string;
  trial_end_date?: string;
  subscription_id?: string;
  last_payment_date?: string;
  next_billing_date?: string;
  wompi_customer_id?: string;
  plan_id?: string;
  has_ai_addon?: boolean;
  auto_reports_enabled?: boolean;
  auto_reports_time?: string;
  auto_reports_email?: string;

  // Configuración del Storefront (Tienda Online)
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
  store_enabled?: boolean;
  store_terms?: string;
  store_shipping_enabled?: boolean;
  store_pickup_enabled?: boolean;
  store_min_order?: number;
  store_nequi_number?: string;

  // Configuración de Wompi
  wompi_public_key?: string;
  wompi_private_key?: string;
  wompi_enabled?: boolean;

  created_at: string;
  updated_at: string;
}

export async function getSales(getToken: GetTokenFn): Promise<Sale[]> {
  return fetchAPI<Sale[]>('/api/sales', getToken);
}

export async function getSaleById(id: string, getToken: GetTokenFn): Promise<Sale> {
  return fetchAPI<Sale>(`/api/sales/${id}`, getToken);
}

export async function createSale(data: Partial<Sale>, getToken: GetTokenFn): Promise<Sale> {
  return fetchAPI<Sale>('/api/sales', getToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSale(id: string, data: Partial<Sale>, getToken: GetTokenFn): Promise<Sale> {
  return fetchAPI<Sale>(`/api/sales/${id}`, getToken, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ============================================
// USER PROFILES
// ============================================

export async function getUserProfile(getToken: GetTokenFn): Promise<UserProfile> {
  return fetchAPI<UserProfile>('/api/user-profiles', getToken);
}

export async function getAllUserProfiles(getToken: GetTokenFn): Promise<UserProfile[]> {
  return fetchAPI<UserProfile[]>('/api/user-profiles/all', getToken);
}

export async function createUserProfile(data: Partial<UserProfile>, getToken: GetTokenFn): Promise<UserProfile> {
  // Note: User profiles are usually auto-created by the auth middleware
  // This function exists for manual profile creation if needed
  const profileId = `usr_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const now = new Date().toISOString();

  const profile = {
    id: profileId,
    created_at: now,
    updated_at: now,
    ...data,
  };

  // Use PUT to create/update - the backend handles this via middleware
  // For now, this will just return the profile data
  // The actual creation happens in the middleware on first API call
  return profile as UserProfile;
}

export async function updateUserProfile(id: string, data: Partial<UserProfile>, getToken: GetTokenFn): Promise<UserProfile> {
  return fetchAPI<UserProfile>(`/api/user-profiles/${id}`, getToken, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ============================================
// CREDIT PAYMENTS - Pagos de Crédito
// ============================================

export interface CreditPaymentData {
  id?: string; // Opcional al crear, presente cuando se retorna
  sale_id: string;
  customer_id: string;
  amount: number;
  payment_method: 'efectivo' | 'tarjeta' | 'transferencia';
  cashier_id: string;
  notes?: string;
  created_at?: string; // Opcional al crear, presente cuando se retorna
}

export async function getCreditPaymentHistory(saleId: string, getToken: GetTokenFn): Promise<CreditPaymentData[]> {
  return fetchAPI<CreditPaymentData[]>(`/api/credit-payments/sale/${saleId}`, getToken);
}

export async function getCustomerCreditPayments(customerId: string, getToken: GetTokenFn): Promise<CreditPaymentData[]> {
  return fetchAPI<CreditPaymentData[]>(`/api/credit-payments/customer/${customerId}`, getToken);
}

export async function registerCreditPayment(data: CreditPaymentData, getToken: GetTokenFn): Promise<{ payment: CreditPaymentData; sale: Sale }> {
  return fetchAPI<{ payment: CreditPaymentData; sale: Sale }>('/api/credit-payments', getToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================
// OFFERS - Ofertas y Promociones
// ============================================

export interface Offer {
  id: string;
  tenant_id: string;
  product_id: string;
  discount_percentage: number;
  discount_amount?: number;
  start_date: string;
  end_date: string;
  is_active: number;
  reason?: 'proximoAVencer' | 'promocion' | 'liquidacion';
  created_at: string;
  updated_at: string;
}

export async function getOffers(getToken: GetTokenFn): Promise<Offer[]> {
  return fetchAPI<Offer[]>('/api/offers', getToken);
}

export async function getOfferById(id: string, getToken: GetTokenFn): Promise<Offer> {
  return fetchAPI<Offer>(`/api/offers/${id}`, getToken);
}

export async function createOffer(data: Partial<Offer>, getToken: GetTokenFn): Promise<Offer> {
  return fetchAPI<Offer>('/api/offers', getToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateOffer(id: string, data: Partial<Offer>, getToken: GetTokenFn): Promise<Offer> {
  return fetchAPI<Offer>(`/api/offers/${id}`, getToken, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteOffer(id: string, getToken: GetTokenFn): Promise<void> {
  return fetchAPI<void>(`/api/offers/${id}`, getToken, {
    method: 'DELETE',
  });
}

export async function getProductOffers(productId: string, getToken: GetTokenFn): Promise<Offer[]> {
  return fetchAPI<Offer[]>(`/api/offers/product/${productId}`, getToken);
}

export async function getActiveOffers(getToken: GetTokenFn): Promise<Offer[]> {
  return fetchAPI<Offer[]>('/api/offers/active', getToken);
}

// ============================================
// PAYMENT TRANSACTIONS - Transacciones de Pago
// ============================================

export interface PaymentTransaction {
  id: string;
  user_profile_id: string;
  wompi_transaction_id: string;
  amount: number;
  currency: string;
  status: 'APPROVED' | 'DECLINED' | 'PENDING' | 'ERROR';
  payment_method_type?: string;
  reference?: string;
  created_at: string;
}

export async function getAllPaymentTransactions(getToken: GetTokenFn): Promise<PaymentTransaction[]> {
  return fetchAPI<PaymentTransaction[]>('/api/payment-transactions', getToken);
}

export async function getMyPaymentTransactions(getToken: GetTokenFn): Promise<PaymentTransaction[]> {
  return fetchAPI<PaymentTransaction[]>('/api/payment-transactions/my', getToken);
}

export async function getUserPaymentTransactions(userId: string, getToken: GetTokenFn): Promise<PaymentTransaction[]> {
  return fetchAPI<PaymentTransaction[]>(`/api/payment-transactions/user/${userId}`, getToken);
}

export async function getPaymentTransactionById(id: string, getToken: GetTokenFn): Promise<PaymentTransaction> {
  return fetchAPI<PaymentTransaction>(`/api/payment-transactions/${id}`, getToken);
}

export async function createPaymentTransaction(data: Partial<PaymentTransaction>, getToken: GetTokenFn): Promise<PaymentTransaction> {
  return fetchAPI<PaymentTransaction>('/api/payment-transactions', getToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePaymentTransaction(id: string, data: Partial<PaymentTransaction>, getToken: GetTokenFn): Promise<PaymentTransaction> {
  return fetchAPI<PaymentTransaction>(`/api/payment-transactions/${id}`, getToken, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Hook personalizado para usar con React
 * (Para usar en componentes)
 */
export function useCloudflareAPI() {
  // Este hook se puede expandir según necesidades
  return {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    getLowStockProducts,
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierProducts,
    getSupplierStats,
    getSales,
    getSaleById,
    createSale,
  };
}

/**
 * Configurar URL base de la API (útil para desarrollo local)
 */
export function setAPIBaseURL(url: string) {
  // Esta función permite cambiar la URL base dinámicamente si es necesario
  console.warn('Changing API base URL to:', url);
  // Nota: En producción, usar siempre la variable de entorno
}
