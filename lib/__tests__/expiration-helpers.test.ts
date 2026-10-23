import {
  AUTO_OFFER_DISCOUNT,
  EXPIRATION_WARNING_DAYS,
  createAutoExpirationOffers,
  filterExpiringProducts,
  getExpirationInfo,
} from '../expiration-helpers';
import { createOffer, getOffers, getProducts } from '../cloudflare-api';

jest.mock('../cloudflare-api', () => ({
  getProducts: jest.fn(),
  getOffers: jest.fn(),
  createOffer: jest.fn(),
}));

const mockGetProducts = getProducts as jest.Mock;
const mockGetOffers = getOffers as jest.Mock;
const mockCreateOffer = createOffer as jest.Mock;
const getToken = jest.fn(async () => 'token');

// Fecha local a N días de "hoy" (22 oct 2026 a mediodía, fijada con fake timers).
function inDays(days: number): string {
  const d = new Date(2026, 9, 22 + days, 15, 0, 0);
  return d.toISOString();
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 22, 12, 0, 0));
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('getExpirationInfo', () => {
  it('no marca nada si el producto no tiene fecha de vencimiento', () => {
    expect(getExpirationInfo({ expiration_date: undefined })).toEqual({
      daysToExpire: null,
      severity: 'none',
      needsAttention: false,
      label: '',
    });
  });

  it('marca como vencido un producto con fecha pasada', () => {
    const info = getExpirationInfo({ expiration_date: inDays(-2) });
    expect(info.severity).toBe('expired');
    expect(info.daysToExpire).toBe(-2);
    expect(info.label).toBe('Vencido');
    expect(info.needsAttention).toBe(true);
  });

  it('"Vence hoy" es crítico aunque la hora sea posterior a la actual', () => {
    const info = getExpirationInfo({ expiration_date: inDays(0) });
    expect(info).toMatchObject({ daysToExpire: 0, severity: 'critical', label: 'Vence hoy' });
  });

  it('usa singular para un solo día', () => {
    expect(getExpirationInfo({ expiration_date: inDays(1) }).label).toBe('Vence en 1 día');
  });

  it('es crítico hasta 7 días y warning de 8 al umbral', () => {
    expect(getExpirationInfo({ expiration_date: inDays(7) }).severity).toBe('critical');
    expect(getExpirationInfo({ expiration_date: inDays(8) }).severity).toBe('warning');
    expect(getExpirationInfo({ expiration_date: inDays(EXPIRATION_WARNING_DAYS) }).severity).toBe(
      'warning'
    );
  });

  it('después del umbral de 30 días ya no requiere atención', () => {
    const info = getExpirationInfo({ expiration_date: inDays(EXPIRATION_WARNING_DAYS + 1) });
    expect(info.severity).toBe('ok');
    expect(info.needsAttention).toBe(false);
  });
});

describe('filterExpiringProducts', () => {
  it('deja solo los que requieren atención, los más urgentes primero', () => {
    const products = [
      { name: 'Leche', expiration_date: inDays(10) },
      { name: 'Arroz', expiration_date: undefined },
      { name: 'Yogurt', expiration_date: inDays(-1) },
      { name: 'Atún', expiration_date: inDays(200) },
      { name: 'Queso', expiration_date: inDays(3) },
    ];
    expect(filterExpiringProducts(products).map((p) => p.name)).toEqual([
      'Yogurt',
      'Queso',
      'Leche',
    ]);
  });
});

describe('createAutoExpirationOffers', () => {
  const product = (id: string, name: string, days: number, stock = 5) => ({
    id,
    name,
    stock,
    expiration_date: inDays(days),
  });

  it('crea ofertas solo para productos con stock, no vencidos y sin oferta vigente', async () => {
    mockGetProducts.mockResolvedValue([
      product('p1', 'Leche', 5),
      product('p2', 'Pan', 3, 0), // sin stock
      product('p3', 'Yogurt', -1), // ya vencido
      product('p4', 'Queso', 10), // ya tiene oferta
      product('p5', 'Atún', 200), // lejos de vencer
    ]);
    mockGetOffers.mockResolvedValue([
      {
        product_id: 'p4',
        reason: 'proximoAVencer',
        is_active: 1,
        end_date: inDays(10),
      },
    ]);
    mockCreateOffer.mockResolvedValue({});

    const result = await createAutoExpirationOffers(getToken);

    expect(result).toEqual({ created: 1, skipped: 1, products: ['Leche'] });
    expect(mockCreateOffer).toHaveBeenCalledTimes(1);
    expect(mockCreateOffer).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: 'p1',
        discount_percentage: AUTO_OFFER_DISCOUNT,
        is_active: 1, // número, no boolean: así lo espera la API
        reason: 'proximoAVencer',
      }),
      getToken
    );
  });

  it('vuelve a crear la oferta si la anterior ya terminó o está inactiva', async () => {
    mockGetProducts.mockResolvedValue([product('p1', 'Leche', 5)]);
    mockGetOffers.mockResolvedValue([
      { product_id: 'p1', reason: 'proximoAVencer', is_active: 1, end_date: inDays(-1) },
      { product_id: 'p1', reason: 'proximoAVencer', is_active: 0, end_date: inDays(5) },
    ]);
    mockCreateOffer.mockResolvedValue({});

    const result = await createAutoExpirationOffers(getToken, 35);

    expect(result.created).toBe(1);
    expect(mockCreateOffer.mock.calls[0][0].discount_percentage).toBe(35);
  });

  it('si la API falla en un producto lo cuenta como omitido y sigue con los demás', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetProducts.mockResolvedValue([product('p1', 'Leche', 5), product('p2', 'Queso', 6)]);
    mockGetOffers.mockResolvedValue([]);
    mockCreateOffer.mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce({});

    const result = await createAutoExpirationOffers(getToken);

    expect(result).toEqual({ created: 1, skipped: 1, products: ['Queso'] });
  });
});
