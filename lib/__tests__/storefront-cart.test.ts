/**
 * @jest-environment jsdom
 */
import {
  CART_UPDATED_EVENT,
  cartItemCount,
  clearPendingOrder,
  readCart,
  readPendingOrder,
  writeCart,
  writePendingOrder,
  type PendingOrder,
  type StoreCartItem,
} from '../storefront-cart';

const item = (id: string, quantity: number): StoreCartItem => ({
  id,
  name: `Producto ${id}`,
  price: 2000,
  quantity,
  stock: 10,
  image: null,
});

beforeEach(() => localStorage.clear());

describe('carrito de la tienda pública', () => {
  it('guarda y lee el carrito por tienda (slug)', () => {
    writeCart('la-esquina', [item('a', 2)]);
    expect(readCart('la-esquina')).toEqual([item('a', 2)]);
    expect(readCart('otra-tienda')).toEqual([]);
  });

  it('al vaciarlo borra la clave de localStorage', () => {
    writeCart('la-esquina', [item('a', 1)]);
    writeCart('la-esquina', []);
    expect(localStorage.getItem('cart_la-esquina')).toBeNull();
  });

  it('avisa al navbar con un evento en cada escritura', () => {
    const listener = jest.fn();
    window.addEventListener(CART_UPDATED_EVENT, listener);
    writeCart('la-esquina', [item('a', 1)]);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(CART_UPDATED_EVENT, listener);
  });

  it('tolera datos corruptos en localStorage', () => {
    localStorage.setItem('cart_x', '{no es json');
    expect(readCart('x')).toEqual([]);
    localStorage.setItem('cart_y', '{"a":1}');
    expect(readCart('y')).toEqual([]);
  });

  it('cuenta unidades, no productos', () => {
    expect(cartItemCount([item('a', 2), item('b', 3)])).toBe(5);
  });
});

describe('pedido pendiente de pago por Nequi', () => {
  const order: PendingOrder = {
    orderNumber: 'PED-001',
    token: 'tok',
    total: 25000,
    shippingCost: 3000,
    storeWhatsApp: '3174503604',
    items: [item('a', 1)],
    customerName: 'Ana',
    customerPhone: '3000000000',
    deliveryMethod: 'shipping',
    deliveryAddress: 'Cra 1 # 2-3',
    notes: '',
    paymentReference: null,
    createdAt: Date.now(),
  };

  it('se recupera al volver a la página', () => {
    writePendingOrder('la-esquina', order);
    expect(readPendingOrder('la-esquina')).toEqual(order);
  });

  it('caduca a las 24 horas y se limpia', () => {
    writePendingOrder('la-esquina', { ...order, createdAt: Date.now() - 25 * 60 * 60 * 1000 });
    expect(readPendingOrder('la-esquina')).toBeNull();
    expect(localStorage.getItem('pending_order_la-esquina')).toBeNull();
  });

  it('se puede borrar manualmente', () => {
    writePendingOrder('la-esquina', order);
    clearPendingOrder('la-esquina');
    expect(readPendingOrder('la-esquina')).toBeNull();
  });
});
