import {
  REWARD_CONSTANTS,
  calculatePointsForPurchase,
  getPointsMilestoneMessage,
  redeemPointsForDiscount,
} from '../loyalty-helpers';
import { getCustomerById, updateCustomer } from '../cloudflare-api';

jest.mock('../cloudflare-api', () => ({
  getCustomerById: jest.fn(),
  updateCustomer: jest.fn(),
}));

const getToken = jest.fn(async () => 'token');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('calculatePointsForPurchase', () => {
  beforeEach(() => {
    // Sin configuración propia en la API → se usan los niveles por defecto.
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as jest.Mock;
  });

  it.each([
    [19999, 0],
    [20000, 5],
    [75000, 10],
    [150000, 25],
    [499999, 50],
    [2_000_000, 100],
  ])('una compra de $%d da %d puntos con los niveles por defecto', async (amount, points) => {
    expect(await calculatePointsForPurchase('c1', amount)).toBe(points);
  });

  it('respeta los niveles personalizados de la tienda', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        enabled: true,
        tiers: [{ min_amount: 0, max_amount: Infinity, points: 7, name: 'Todo' }],
      }),
    }) as jest.Mock;
    expect(await calculatePointsForPurchase('c1', 1000)).toBe(7);
  });

  it('no da puntos si la tienda desactivó el programa', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: false, tiers: [] }),
    }) as jest.Mock;
    expect(await calculatePointsForPurchase('c1', 1_000_000)).toBe(0);
  });
});

describe('redeemPointsForDiscount', () => {
  it('descuenta 100 puntos y da 10% de la compra', async () => {
    (getCustomerById as jest.Mock).mockResolvedValue({ id: 'c1', loyalty_points: 130 });
    const result = await redeemPointsForDiscount('c1', 45550, getToken);
    expect(result).toEqual({ discount: 4555, pointsRedeemed: REWARD_CONSTANTS.POINTS_FOR_DISCOUNT });
    expect(updateCustomer).toHaveBeenCalledWith('c1', { loyalty_points: 30 }, getToken);
  });

  it('no deja canjear con puntos insuficientes', async () => {
    (getCustomerById as jest.Mock).mockResolvedValue({ id: 'c1', loyalty_points: 99 });
    await expect(redeemPointsForDiscount('c1', 10000, getToken)).rejects.toThrow(
      'Puntos insuficientes'
    );
    expect(updateCustomer).not.toHaveBeenCalled();
  });
});

describe('getPointsMilestoneMessage', () => {
  it('felicita según los puntos ganados', () => {
    expect(getPointsMilestoneMessage(0)).toBeNull();
    expect(getPointsMilestoneMessage(5)).toContain('¡Genial!');
    expect(getPointsMilestoneMessage(100)).toContain('Ya puedes canjear');
  });
});
