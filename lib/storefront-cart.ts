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
