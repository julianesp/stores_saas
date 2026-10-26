/**
 * Salud de las tiendas (/api/admin/health): reglas del puntaje y la ruta real
 * contra el esquema de D1.
 */
import { Hono } from 'hono';
import storeHealthRoutes from '../../cloudflare-migration/src/routes/store-health';
import { evaluateStoreHealth, type StoreHealthInput } from '../../cloudflare-migration/src/utils/store-health';
import { D1DatabaseFake } from './helpers/d1-sqlite';

const NOW = Date.parse('2026-10-26T15:00:00Z');
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();

const healthy: StoreHealthInput = {
  createdAt: daysAgo(90),
  subscriptionStatus: 'active',
  trialEndDate: null,
  hasTelegram: true,
  lastSaleAt: daysAgo(0),
  sales7d: 80,
  sales30d: 300,
  activeProducts: 200,
  productsWithoutCost: 0,
  productsWithoutPrice: 0,
  negativeStock: 0,
  expiredWithStock: 0,
  repeatedNames: 0,
  oldCreditCount: 0,
  oldCreditAmount: 0,
};

const codes = (input: Partial<StoreHealthInput>) =>
  evaluateStoreHealth({ ...healthy, ...input }, NOW).issues.map((i) => i.code);

describe('evaluateStoreHealth', () => {
  it('una tienda que vende a diario y tiene el inventario completo queda en 100', () => {
    expect(evaluateStoreHealth(healthy, NOW)).toMatchObject({ score: 100, level: 'bien', issues: [] });
  });

  it('marca la inactividad según los días sin vender', () => {
    expect(codes({ lastSaleAt: daysAgo(5) })).toEqual(['poca_actividad']);
    const inactive = evaluateStoreHealth({ ...healthy, lastSaleAt: daysAgo(20) }, NOW);
    expect(inactive.issues[0]).toMatchObject({ code: 'inactiva', severity: 'critical', title: 'Lleva 20 días sin vender' });
    expect(inactive.daysSinceLastSale).toBe(20);
  });

  it('no le exige nada a una cuenta de menos de 3 días', () => {
    expect(codes({ createdAt: daysAgo(1), activeProducts: 0, lastSaleAt: null, hasTelegram: false })).toEqual([]);
    expect(codes({ createdAt: daysAgo(10), activeProducts: 0, lastSaleAt: null })).toEqual(['sin_productos']);
    expect(codes({ createdAt: daysAgo(10), lastSaleAt: null })).toEqual(['sin_ventas']);
  });

  it('el fin de la prueba es crítico solo si la tienda usa poco el sistema', () => {
    const trial = { subscriptionStatus: 'trial', trialEndDate: daysAgo(-3) };
    const lowUse = evaluateStoreHealth({ ...healthy, ...trial, sales30d: 5 }, NOW);
    expect(lowUse.trialDaysLeft).toBe(3);
    expect(lowUse.issues[0]).toMatchObject({ code: 'trial_por_vencer', severity: 'critical' });
    expect(evaluateStoreHealth({ ...healthy, ...trial }, NOW).issues[0].severity).toBe('warning');
    expect(codes({ ...trial, trialEndDate: daysAgo(-20) })).toEqual([]);
  });

  it('productos sin costo: aviso desde el 20 %, crítico desde el 50 %', () => {
    expect(codes({ productsWithoutCost: 30 })).toEqual([]);
    expect(evaluateStoreHealth({ ...healthy, productsWithoutCost: 50 }, NOW).issues[0].severity).toBe('warning');
    expect(evaluateStoreHealth({ ...healthy, productsWithoutCost: 120 }, NOW).issues[0].severity).toBe('critical');
  });

  it('ordena por gravedad y baja el puntaje hasta "riesgo"', () => {
    const result = evaluateStoreHealth(
      { ...healthy, lastSaleAt: daysAgo(30), negativeStock: 3, hasTelegram: false, expiredWithStock: 2 },
      NOW
    );
    expect(result.issues.map((i) => i.severity)).toEqual(['critical', 'warning', 'info', 'info']);
    expect(result.score).toBe(100 - 30 - 12 - 4 - 4);
    expect(result.level).toBe('atencion');
    expect(evaluateStoreHealth({ ...healthy, lastSaleAt: daysAgo(30), productsWithoutCost: 150 }, NOW).level).toBe('riesgo');
  });

  it('entiende las fechas de D1 sin zona horaria', () => {
    expect(evaluateStoreHealth({ ...healthy, lastSaleAt: '2026-10-20 15:00:00' }, NOW).daysSinceLastSale).toBe(6);
  });
});

describe('GET /api/admin/health', () => {
  let db: D1DatabaseFake;

  const call = async (isSuperadmin: boolean) => {
    const app = new Hono();
    app.use('*', async (c, next) => {
      c.set('tenant' as never, { id: 'admin', is_superadmin: isSuperadmin } as never);
      await next();
    });
    app.route('/api/admin/health', storeHealthRoutes);
    const res = await app.request('/api/admin/health', {}, { DB: db });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { status: res.status, json: (await res.json()) as any };
  };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    db = new D1DatabaseFake();
    const profile = (id: string, extra = {}) =>
      db.insert('user_profiles', {
        id,
        clerk_user_id: `clerk_${id}`,
        email: `${id}@posib.dev`,
        role: 'admin',
        subscription_status: 'active',
        created_at: '2026-01-01 00:00:00',
        ...extra,
      });
    profile('admin', { is_superadmin: 1 });
    profile('t_activa', { full_name: 'Tienda Activa', telegram_chat_id: '123' });
    profile('t_dormida', { full_name: 'Tienda Dormida', telegram_chat_id: '456' });

    const product = (id: string, tenant_id: string, extra = {}) =>
      db.insert('products', { id, tenant_id, name: id, cost_price: 1000, sale_price: 2000, stock: 5, ...extra });
    product('p1', 't_activa');
    product('p2', 't_activa', { stock: -4 });
    product('p3', 't_dormida', { cost_price: 0 });
    product('p4', 't_dormida', { name: 'p3' });
    product('p5', 't_dormida', { is_active: 0, cost_price: 0 });

    const sale = (id: string, tenant_id: string, created_at: string, extra = {}) =>
      db.insert('sales', {
        id,
        tenant_id,
        sale_number: id,
        cashier_id: tenant_id,
        total: 10000,
        payment_method: 'efectivo',
        created_at,
        ...extra,
      });
    sale('s1', 't_activa', new Date().toISOString());
    sale('s2', 't_dormida', '2026-01-10 12:00:00', {
      payment_method: 'credito',
      status: 'pendiente',
      payment_status: 'pendiente',
      amount_pending: 10000,
    });
  });

  it('solo la ve el superadmin', async () => {
    expect((await call(false)).status).toBe(403);
  });

  it('calcula las métricas por tienda y deja la peor primero', async () => {
    const { status, json } = await call(true);
    expect(status).toBe(200);

    const stores = json.data.stores;
    expect(stores.map((s: { storeId: string }) => s.storeId)).toEqual(['t_dormida', 't_activa']);

    const [dormida, activa] = stores;
    expect(dormida).toMatchObject({ storeName: 'Tienda Dormida', activeProducts: 2, level: 'riesgo' });
    expect(dormida.issues.map((i: { code: string }) => i.code)).toEqual(
      expect.arrayContaining(['inactiva', 'sin_costo', 'nombres_repetidos', 'fiado_viejo'])
    );
    expect(activa).toMatchObject({ sales30d: 1, activeProducts: 2, daysSinceLastSale: 0 });
    expect(activa.issues.map((i: { code: string }) => i.code)).toEqual(['stock_negativo']);
  });
});
