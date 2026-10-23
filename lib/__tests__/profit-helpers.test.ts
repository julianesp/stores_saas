import { computeProfit, getItemCost, getItemRevenue, startOfDay } from '../profit-helpers';
import type { Product } from '../cloudflare-api';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    tenant_id: 't1',
    name: 'Producto',
    cost_price: 1000,
    sale_price: 1500,
    stock: 10,
    min_stock: 1,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

// Cubeta de 30 huevos: cuesta $12.000, se vende suelto a $600 el huevo.
const cubeta = product({
  id: 'huevos',
  cost_price: 12000,
  sale_price: 15000,
  sell_by_unit: true,
  units_per_package: 30,
  price_per_unit: 600,
});

describe('getItemCost', () => {
  it('multiplica el costo actual por la cantidad', () => {
    expect(getItemCost({ product_id: 'p1', quantity: 3, unit_price: 1500 }, product())).toBe(3000);
  });

  it('es 0 si el producto ya no existe', () => {
    expect(getItemCost({ product_id: 'x', quantity: 3, unit_price: 1500 })).toBe(0);
  });

  it('prorratea el costo del paquete cuando se vende por unidad suelta', () => {
    // 5 huevos sueltos = 5 × (12.000 / 30) = 2.000
    expect(getItemCost({ product_id: 'huevos', quantity: 5, unit_price: 600 }, cubeta)).toBe(2000);
  });

  it('usa el costo del paquete completo cuando se vende la cubeta entera', () => {
    expect(getItemCost({ product_id: 'huevos', quantity: 1, unit_price: 15000 }, cubeta)).toBe(12000);
  });
});

describe('getItemRevenue', () => {
  it('prefiere el subtotal guardado en la venta', () => {
    expect(getItemRevenue({ product_id: 'p1', quantity: 2, unit_price: 1500, subtotal: 2800 })).toBe(
      2800
    );
  });

  it('si no hay subtotal, calcula precio × cantidad − descuento', () => {
    expect(getItemRevenue({ product_id: 'p1', quantity: 2, unit_price: 1500, discount: 200 })).toBe(
      2800
    );
  });
});

describe('computeProfit', () => {
  it('suma ingresos, costos, ganancia y margen de varias ventas', () => {
    const products = new Map([
      ['p1', product()],
      ['huevos', cubeta],
    ]);
    const sales = [
      { items: [{ product_id: 'p1', quantity: 2, unit_price: 1500 }] }, // 3.000 − 2.000
      { items: [{ product_id: 'huevos', quantity: 10, unit_price: 600 }] }, // 6.000 − 4.000
      {}, // venta sin items
    ];

    expect(computeProfit(sales, products)).toEqual({
      revenue: 9000,
      cost: 6000,
      profit: 3000,
      margin: (3000 / 9000) * 100,
    });
  });

  it('el margen es 0 cuando no hay ingresos (sin dividir por cero)', () => {
    expect(computeProfit([], new Map())).toEqual({ revenue: 0, cost: 0, profit: 0, margin: 0 });
  });
});

describe('startOfDay', () => {
  it('quita la hora conservando el día local', () => {
    expect(startOfDay(new Date(2026, 9, 22, 18, 45, 10))).toEqual(new Date(2026, 9, 22));
  });
});
