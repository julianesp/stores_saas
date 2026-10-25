import {
  computeInventoryInvestment,
  computeProfit,
  computePurchaseInvoices,
  computePurchasePlan,
  getItemCost,
  getItemRevenue,
  salePriceForMarkup,
  startOfDay,
} from '../profit-helpers';
import type { Product } from '../cloudflare-api';
import type { PurchaseOrderWithItems } from '../types';

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

describe('computeInventoryInvestment', () => {
  it('suma lo invertido (stock × costo) y lo que entraría al venderlo todo', () => {
    const result = computeInventoryInvestment([
      product({ id: 'a', stock: 10 }), // invierte 10.000, vende 15.000
      product({ id: 'b', stock: 4, cost_price: 5000, sale_price: 6000 }), // 20.000 → 24.000
    ]);

    expect(result.invested).toBe(30000);
    expect(result.expectedRevenue).toBe(39000);
    expect(result.expectedProfit).toBe(9000);
    expect(result.markup).toBe(30);
    // Ordenado de mayor a menor inversión
    expect(result.rows.map((r) => r.product.id)).toEqual(['b', 'a']);
  });

  it('ignora productos sin stock, inactivos o que no controlan inventario', () => {
    const result = computeInventoryInvestment([
      product({ id: 'agotado', stock: 0 }),
      product({ id: 'negativo', stock: -3 }),
      product({ id: 'inactivo', is_active: 0 }),
      product({ id: 'servicio', track_inventory: 0 }),
    ]);

    expect(result.rows).toEqual([]);
    expect(result.invested).toBe(0);
    expect(result.markup).toBe(0);
  });

  it('separa los productos sin costo para no inflar la ganancia', () => {
    const result = computeInventoryInvestment([
      product({ id: 'a', stock: 10 }),
      product({ id: 'sin-costo', stock: 2, cost_price: 0, sale_price: 3000 }),
    ]);

    expect(result.expectedProfit).toBe(5000);
    expect(result.withoutCost).toEqual({ count: 1, saleValue: 6000 });
  });
});

describe('computePurchasePlan', () => {
  it('calcula inversión, venta, ganancia y porcentajes de una compra', () => {
    // 24 gaseosas a $2.000, vendidas a $2.500
    expect(computePurchasePlan(2000, 24, 2500)).toEqual({
      invested: 48000,
      revenue: 60000,
      profit: 12000,
      markup: 25,
      margin: 20,
    });
  });

  it('no divide por cero con campos vacíos', () => {
    expect(computePurchasePlan(0, 0, 0)).toEqual({
      invested: 0,
      revenue: 0,
      profit: 0,
      markup: 0,
      margin: 0,
    });
  });
});

describe('salePriceForMarkup', () => {
  it('sube el costo en el % pedido y redondea hacia arriba a $50', () => {
    expect(salePriceForMarkup(2000, 25)).toBe(2500);
    expect(salePriceForMarkup(1730, 30)).toBe(2250); // 2.249 → 2.250
  });
});

describe('computePurchaseInvoices', () => {
  function order(overrides: Partial<PurchaseOrderWithItems>): PurchaseOrderWithItems {
    return {
      id: 'po1',
      user_profile_id: 't1',
      supplier_id: 's1',
      order_number: 'OC-1',
      status: 'recibida',
      order_date: '2026-10-01T10:00:00Z',
      subtotal: 0,
      tax: 0,
      total: 0,
      created_at: '',
      updated_at: '',
      items: [],
      ...overrides,
    } as PurchaseOrderWithItems;
  }
  const item = (product_id: string, quantity: number, unit_cost: number) => ({
    id: `i-${product_id}`,
    purchase_order_id: 'po1',
    product_id,
    product_name: `Nombre ${product_id}`,
    quantity,
    unit_cost,
    subtotal: quantity * unit_cost,
    created_at: '',
  });

  const products = new Map([
    ['gaseosa', product({ id: 'gaseosa', name: 'Gaseosa', sale_price: 2500 })],
    ['arroz', product({ id: 'arroz', name: 'Arroz', sale_price: 4000 })],
  ]);

  it('calcula por factura lo invertido y lo que entra a los precios de venta actuales', () => {
    const [invoice] = computePurchaseInvoices(
      [
        order({
          total: 68000,
          supplier: { id: 's1', name: 'Postobón' } as PurchaseOrderWithItems['supplier'],
          items: [item('gaseosa', 24, 2000), item('arroz', 10, 2000)],
        }),
      ],
      products
    );

    expect(invoice.supplierName).toBe('Postobón');
    expect(invoice.invested).toBe(68000);
    expect(invoice.expectedRevenue).toBe(24 * 2500 + 10 * 4000); // 100.000
    expect(invoice.expectedProfit).toBe(32000);
    expect(invoice.lines[0]).toMatchObject({ name: 'Gaseosa', invested: 48000, expectedProfit: 12000 });
  });

  it('marca los productos que ya no existen y no inventa lo que entraría por ellos', () => {
    const [invoice] = computePurchaseInvoices(
      [order({ total: 5000, items: [item('borrado', 5, 1000)] })],
      products
    );

    expect(invoice.linesWithoutPrice).toBe(1);
    expect(invoice.lines[0]).toMatchObject({
      name: 'Nombre borrado',
      unitSalePrice: null,
      expectedProfit: null,
    });
    expect(invoice.expectedRevenue).toBe(0);
  });

  it('excluye las canceladas y ordena de la más reciente a la más vieja', () => {
    const result = computePurchaseInvoices(
      [
        order({ id: 'vieja', order_date: '2026-09-01T00:00:00Z' }),
        order({ id: 'cancelada', status: 'cancelada', order_date: '2026-10-20T00:00:00Z' }),
        order({ id: 'nueva', order_date: '2026-10-10T00:00:00Z' }),
      ],
      products
    );

    expect(result.map((r) => r.order.id)).toEqual(['nueva', 'vieja']);
  });
});
