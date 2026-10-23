/**
 * Abonos a ventas fiadas (/api/credit-payments) contra el esquema real de D1.
 */
import { createWorker, seed } from './helpers/worker-app';

type Worker = ReturnType<typeof createWorker>;

let w: Worker;
let saleId: string;

const customer = (id: string) =>
  w.db.get<{ current_debt: number; loyalty_points: number }>(
    'SELECT current_debt, loyalty_points FROM customers WHERE id = ?',
    id
  )!;

const sale = () =>
  w.db.get<{ status: string; payment_status: string; amount_paid: number; amount_pending: number }>(
    'SELECT status, payment_status, amount_paid, amount_pending FROM sales WHERE id = ?',
    saleId
  )!;

function abonar(amount: number, extra: Record<string, unknown> = {}) {
  return w.call('POST', '/api/credit-payments', {
    sale_id: saleId,
    customer_id: 'cli_rosa',
    amount,
    payment_method: 'efectivo',
    cashier_id: 'tenant_tienda',
    ...extra,
  });
}

beforeEach(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  w = createWorker();
  seed(w.db);

  // Doña Rosa se lleva $50.000 fiados (el front suma la deuda al cliente aparte).
  const { json } = await w.call('POST', '/api/sales', {
    total: 50000,
    payment_method: 'credito',
    customer_id: 'cli_rosa',
    points_earned: 10,
    items: [{ product_id: 'prod_gaseosa', quantity: 20, unit_price: 2500, subtotal: 50000 }],
  });
  saleId = json.data.id;
  w.db.sqlite.exec(`UPDATE customers SET current_debt = 50000 WHERE id = 'cli_rosa'`);
});

describe('POST /api/credit-payments', () => {
  it('un abono parcial deja la venta "parcial" y baja la deuda', async () => {
    const { status, json } = await abonar(20000);

    expect(status).toBe(200);
    expect(json.data.sale).toMatchObject({ amount_paid: 20000, amount_pending: 30000, payment_status: 'parcial' });
    expect(sale()).toMatchObject({ status: 'pendiente', payment_status: 'parcial' });
    expect(customer('cli_rosa').current_debt).toBe(30000);
    expect(w.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM credit_payments')!.n).toBe(1);
  });

  it('al completar el pago la venta pasa a "completada" y el cliente recibe sus puntos', async () => {
    await abonar(20000);
    const { json } = await abonar(30000);

    expect(sale()).toMatchObject({ status: 'completada', payment_status: 'pagado', amount_pending: 0 });
    expect(customer('cli_rosa')).toEqual({ current_debt: 0, loyalty_points: 105 });
    // Tenía 95 puntos: con estos 10 cruza el umbral de 100 para el descuento.
    expect(json.data).toMatchObject({ points_awarded: 10, customer_reached_reward_threshold: true });
  });

  it('los puntos solo se dan cuando la venta queda pagada', async () => {
    const { json } = await abonar(10000);
    expect(json.data.points_awarded).toBe(0);
    expect(customer('cli_rosa').loyalty_points).toBe(95);
  });

  it('rechaza abonos incompletos', async () => {
    const { status } = await abonar(20000, { payment_method: undefined });
    expect(status).toBe(400);
    expect(sale().amount_paid).toBe(0);
  });

  it('responde 404 si la venta no existe', async () => {
    expect((await abonar(1000, { sale_id: 'no-existe' })).status).toBe(404);
  });

  it('la deuda del cliente nunca queda negativa', async () => {
    w.db.sqlite.exec(`UPDATE customers SET current_debt = 5000 WHERE id = 'cli_rosa'`);
    await abonar(20000);
    expect(customer('cli_rosa').current_debt).toBe(0);
  });

  // BUGS conocidos de validación. Cuando se corrijan en el Worker, quitar `.failing`.

  it.failing('no acepta un abono mayor que el saldo pendiente', async () => {
    const { status } = await abonar(80000);
    expect(status).toBe(400);
    expect(sale().amount_pending).toBe(50000);
  });

  it.failing('no acepta abonos negativos (aumentarían la deuda)', async () => {
    const { status } = await abonar(-10000);
    expect(status).toBe(400);
    expect(customer('cli_rosa').current_debt).toBe(50000);
  });

  it.failing('no deja abonar a la venta de un cliente con el id de otro cliente', async () => {
    const { status } = await abonar(10000, { customer_id: 'cli_pedro' });
    expect(status).toBe(400);
    expect(customer('cli_pedro').current_debt).toBe(30000);
  });
});
