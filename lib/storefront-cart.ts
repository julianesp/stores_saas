/**
 * Carrito de la tienda pública (localStorage, sin autenticación).
 *
 * Única fuente del tipo de item y de la lectura/escritura del carrito.
 * Toda escritura dispara CART_UPDATED_EVENT para que el contador del navbar
 * se actualice en la misma pestaña (el evento nativo "storage" solo se
 * dispara en otras pestañas).
 */

export interface StoreCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  image: string | null;
  discount_percentage?: number;
}

export const CART_UPDATED_EVENT = 'store-cart-updated';

const cartKey = (slug: string) => `cart_${slug}`;

export function readCart(slug: string): StoreCartItem[] {
  try {
    const saved = localStorage.getItem(cartKey(slug));
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCart(slug: string, cart: StoreCartItem[]): void {
  if (cart.length === 0) {
    localStorage.removeItem(cartKey(slug));
  } else {
    localStorage.setItem(cartKey(slug), JSON.stringify(cart));
  }
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function cartItemCount(cart: StoreCartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Pedido recién creado que espera el pago por Nequi. Se guarda para que, si el
 * cliente recarga la página o vuelve más tarde, pueda seguir ingresando la
 * referencia de su pago (el carrito ya se vació al crear el pedido).
 */
export interface PendingOrder {
  orderNumber: string;
  token: string;
  total: number;
  shippingCost: number;
  storeWhatsApp: string;
  items: StoreCartItem[];
  customerName: string;
  customerPhone: string;
  deliveryMethod: 'pickup' | 'shipping';
  deliveryAddress: string;
  notes: string;
  paymentReference: string | null;
  createdAt: number;
}

const PENDING_ORDER_TTL_MS = 24 * 60 * 60 * 1000;

const pendingOrderKey = (slug: string) => `pending_order_${slug}`;

export function readPendingOrder(slug: string): PendingOrder | null {
  try {
    const saved = localStorage.getItem(pendingOrderKey(slug));
    if (!saved) return null;
    const parsed = JSON.parse(saved) as PendingOrder;
    if (
      !parsed?.orderNumber ||
      !parsed?.token ||
      Date.now() - parsed.createdAt > PENDING_ORDER_TTL_MS
    ) {
      localStorage.removeItem(pendingOrderKey(slug));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writePendingOrder(slug: string, order: PendingOrder): void {
  try {
    localStorage.setItem(pendingOrderKey(slug), JSON.stringify(order));
  } catch {
    // Sin localStorage la vista del pedido funciona igual hasta que se recargue.
  }
}

export function clearPendingOrder(slug: string): void {
  try {
    localStorage.removeItem(pendingOrderKey(slug));
  } catch {
    // Nada que limpiar.
  }
}
