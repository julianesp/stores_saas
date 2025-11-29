// Tipos para las tablas de la base de datos

export interface UserProfile {
  id: string;
  clerk_user_id: string;
  email: string;
  role: 'admin' | 'cajero' | 'cliente';
  full_name?: string;
  phone?: string;
  is_superadmin?: boolean; // Solo para admin@neurai.dev

  // Campos de suscripción
  subscription_status: 'trial' | 'active' | 'expired' | 'canceled';
  trial_start_date?: string;
  trial_end_date?: string;
  subscription_id?: string; // ID de la transacción/suscripción en Wompi
  last_payment_date?: string;
  next_billing_date?: string;
  wompi_customer_id?: string;
  plan_id?: string; // ID del plan de suscripción

  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
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
  created_at: string;
  updated_at: string;
}

export interface ProductWithRelations extends Product {
  category?: Category;
  supplier?: Supplier;
  active_offer?: Offer;
}

export interface Customer {
  id: string;
  user_profile_id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  id_number?: string;
  loyalty_points: number;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  sale_number: string;
  customer_id?: string;
  cashier_id: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: 'efectivo' | 'tarjeta' | 'transferencia';
  status: 'completada' | 'cancelada' | 'pendiente';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SaleWithRelations extends Sale {
  customer?: Customer;
  cashier?: UserProfile;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  created_at: string;
}

export interface SaleItemWithProduct extends SaleItem {
  product?: Product;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  type: 'entrada' | 'salida' | 'ajuste';
  quantity: number;
  reason?: string;
  reference_id?: string;
  user_id?: string;
  created_at: string;
}

export interface Offer {
  id: string;
  product_id: string;
  discount_percentage: number;
  discount_amount?: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  reason?: 'proximoAVencer' | 'promocion' | 'liquidacion';
  created_at: string;
  updated_at: string;
}

export interface OfferWithProduct extends Offer {
  product?: Product;
}

export interface ShoppingCart {
  id: string;
  customer_id: string;
  status: 'activo' | 'completado' | 'abandonado';
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface CartItemWithProduct extends CartItem {
  product?: ProductWithRelations;
}

// Tipos para reportes
export interface DailySalesReport {
  date: string;
  total_sales: number;
  total_amount: number;
  total_items: number;
  payment_methods: {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
  };
}

export interface ProductSalesReport {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  total_revenue: number;
}

export interface InventoryAlert {
  product_id: string;
  product_name: string;
  current_stock: number;
  min_stock: number;
  status: 'low' | 'critical' | 'out';
}

// Tipos para suscripciones
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: 'COP';
  interval: 'monthly' | 'yearly';
  features: string[];
  popular?: boolean;
}

export interface SubscriptionStatus {
  canAccess: boolean;
  status: 'trial' | 'active' | 'expired' | 'canceled';
  daysLeft?: number;
  nextBillingDate?: string;
}

export interface PaymentTransaction {
  id: string;
  user_profile_id: string;
  wompi_transaction_id: string;
  amount: number;
  currency: 'COP';
  status: 'APPROVED' | 'DECLINED' | 'PENDING' | 'ERROR';
  payment_method_type?: string;
  reference?: string;
  created_at: string;
}
