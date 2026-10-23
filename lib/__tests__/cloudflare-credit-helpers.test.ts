import {
  canCustomerGetCredit,
  getCreditSales,
  updateCustomerDebt,
} from '../cloudflare-credit-helpers';
import { getCustomers, getSales, updateCustomer } from '../cloudflare-api';

jest.mock('../cloudflare-api', () => ({
  getCustomers: jest.fn(),
  updateCustomer: jest.fn(),
  getSales: jest.fn(),
  getCreditPaymentHistory: jest.fn(),
  registerCreditPayment: jest.fn(),
}));

const mockGetCustomers = getCustomers as jest.Mock;
const mockUpdateCustomer = updateCustomer as jest.Mock;
const mockGetSales = getSales as jest.Mock;
const getToken = jest.fn(async () => 'token');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockGetCustomers.mockResolvedValue([
    { id: 'rosa', name: 'Doña Rosa', credit_limit: 100000, current_debt: 70000 },
    { id: 'pedro', name: 'Pedro', credit_limit: 0, current_debt: 500000 },
  ]);
});

describe('canCustomerGetCredit (fiado)', () => {
  it('permite fiar mientras no supere el cupo', async () => {
    const result = await canCustomerGetCredit('rosa', 30000, getToken);
    expect(result).toMatchObject({ canGetCredit: true, availableCredit: 30000 });
  });

  it('bloquea si la nueva compra supera el cupo', async () => {
    const result = await canCustomerGetCredit('rosa', 30001, getToken);
    expect(result.canGetCredit).toBe(false);
    expect(result.message).toContain('Excede el límite de crédito');
  });

  it('cupo 0 significa crédito sin límite', async () => {
    const result = await canCustomerGetCredit('pedro', 1_000_000, getToken);
    expect(result).toMatchObject({ canGetCredit: true, availableCredit: Infinity });
  });

  it('cliente inexistente: no se le fía', async () => {
    expect((await canCustomerGetCredit('nadie', 1, getToken)).canGetCredit).toBe(false);
  });
});

describe('updateCustomerDebt', () => {
  it('suma la venta a crédito a la deuda actual', async () => {
    await updateCustomerDebt('rosa', 15000, getToken);
    expect(mockUpdateCustomer).toHaveBeenCalledWith('rosa', { current_debt: 85000 }, getToken);
  });

  it('un abono (monto negativo) reduce la deuda', async () => {
    await updateCustomerDebt('rosa', -20000, getToken);
    expect(mockUpdateCustomer).toHaveBeenCalledWith('rosa', { current_debt: 50000 }, getToken);
  });

  it('falla si el cliente no existe', async () => {
    await expect(updateCustomerDebt('nadie', 1, getToken)).rejects.toThrow('Cliente no encontrado');
  });
});

describe('getCreditSales', () => {
  it('devuelve solo ventas a crédito pendientes o con abono parcial', async () => {
    mockGetSales.mockResolvedValue([
      { id: '1', payment_method: 'credito', payment_status: 'pendiente' },
      { id: '2', payment_method: 'credito', payment_status: 'parcial' },
      { id: '3', payment_method: 'credito', payment_status: 'pagado' },
      { id: '4', payment_method: 'efectivo', payment_status: 'pendiente' },
    ]);
    expect((await getCreditSales(getToken)).map((s) => s.id)).toEqual(['1', '2']);
  });
});
