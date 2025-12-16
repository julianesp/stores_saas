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
  has_ai_addon?: boolean; // Usuario tiene addon de IA activo

  // Configuración de reportes automáticos
  auto_reports_enabled?: boolean; // Si los reportes automáticos están activados
  auto_reports_time?: string; // Hora para generar reportes (formato HH:MM)
  auto_reports_email?: string; // Email para enviar reportes (opcional)

  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_profile_id?: string; // ID del propietario de la categoría
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  user_profile_id?: string; // ID del propietario del proveedor
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  notes?: string;
  // Información comercial
  tax_id?: string; // NIT/RUT
  payment_type: 'contado' | 'credito';
  credit_days: number; // Días de plazo si es a crédito
  credit_limit: number; // Límite de crédito con el proveedor
  current_debt: number; // Deuda actual con el proveedor
  default_discount: number; // Descuento habitual en %
  // Información de contacto extendida
  visit_day?: string; // Día habitual de visita del vendedor
  website?: string;
  whatsapp?: string;
  business_hours?: string; // Horario de atención
  // Control y evaluación
  rating?: number; // Calificación del proveedor (1-5)
  status: 'activo' | 'inactivo' | 'suspendido';
  delivery_days: number; // Días de entrega prometidos
  minimum_order: number; // Pedido mínimo
  // Estadísticas automáticas
  total_purchased: number; // Total comprado históricamente
  last_purchase_date?: string; // Última fecha de compra
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  user_profile_id?: string; // ID del propietario del producto
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
  image_url?: string; // Deprecated: mantener por compatibilidad
  images?: string[]; // Array de URLs de imágenes (actualmente solo se usa la primera)
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
  // Campos para sistema de crédito
  credit_limit?: number; // Límite de crédito autorizado
  current_debt?: number; // Deuda actual
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  user_profile_id?: string; // ID del propietario (tienda)
  sale_number: string;
  customer_id?: string;
  cashier_id: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: 'efectivo' | 'tarjeta' | 'transferencia' | 'credito';
  status: 'completada' | 'cancelada' | 'pendiente';
  notes?: string;
  points_earned?: number; // Puntos ganados por el cliente en esta compra
  // Campos para ventas a crédito
  payment_status?: 'pagado' | 'pendiente' | 'parcial'; // Estado del pago
  amount_paid?: number; // Monto pagado
  amount_pending?: number; // Monto pendiente
  due_date?: string; // Fecha límite de pago
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
  user_profile_id?: string; // ID del propietario (tienda)
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
  user_profile_id?: string; // ID del propietario (tienda)
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
  user_profile_id?: string; // ID del propietario (tienda)
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
  isAddon?: boolean; // Indica si es un add-on al plan básico
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
  currency: string;
  status: 'APPROVED' | 'DECLINED' | 'PENDING' | 'ERROR';
  payment_method_type?: string;
  reference?: string;
  created_at: string;
}

// Tipos para sistema de puntos de lealtad
export interface LoyaltyTier {
  min_amount: number;
  max_amount: number;
  points: number;
  name: string;
}

export interface LoyaltySettings {
  id: string;
  user_profile_id: string; // ID del dueño de la tienda
  enabled: boolean;
  tiers: LoyaltyTier[];
  created_at: string;
  updated_at: string;
}

export interface CustomerPurchaseHistory {
  sale_id: string;
  sale_number: string;
  date: string;
  items: SaleItemWithProduct[];
  total: number;
  points_earned: number;
  payment_method: string;
}

// Tipos para sistema de crédito/fiado
export interface CreditPayment {
  id: string;
  sale_id: string;
  customer_id: string;
  amount: number;
  payment_method: 'efectivo' | 'tarjeta' | 'transferencia';
  notes?: string;
  cashier_id: string;
  created_at: string;
}

export interface CreditPaymentWithRelations extends CreditPayment {
  sale?: Sale;
  customer?: Customer;
  cashier?: UserProfile;
}

// Tipos para sistema de notificaciones
export type NotificationType = 'stock' | 'loyalty' | 'sale' | 'system' | 'subscription';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  count?: number;
  timestamp: Date;
  read?: boolean;
}

// Tipos para Órdenes de Compra (Purchase Orders)
export type PurchaseOrderStatus = 'pendiente' | 'recibida' | 'cancelada';

export interface PurchaseOrder {
  id: string;
  user_profile_id: string;
  supplier_id: string;
  order_number: string;
  status: PurchaseOrderStatus;
  order_date: string;
  expected_date?: string;
  received_date?: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  product_name: string; // Guardamos el nombre por si el producto se elimina
  quantity: number;
  unit_cost: number;
  subtotal: number;
  created_at: string;
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  supplier?: Supplier;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderItemWithProduct extends PurchaseOrderItem {
  product?: Product;
}
