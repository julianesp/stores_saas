import {
  checkSubscriptionStatus,
  evaluateSubscriptionStatus,
  hasAIAccess,
  hasStoreAccess,
} from '../cloudflare-subscription-helpers';
import { ApiError, getUserProfile, updateUserProfile } from '../cloudflare-api';
import type { UserProfile } from '../types';

jest.mock('../cloudflare-api', () => {
  const actual = jest.requireActual('../cloudflare-api');
  return {
    ApiError: actual.ApiError,
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
  };
});

const mockGetUserProfile = getUserProfile as jest.Mock;
const mockUpdateUserProfile = updateUserProfile as jest.Mock;
const getToken = jest.fn(async () => 'token');

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'u1',
    clerk_user_id: 'c1',
    email: 'tendero@tienda.co',
    role: 'admin',
    subscription_status: 'trial',
    ...overrides,
  } as UserProfile;
}

const localDate = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h).toISOString();

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 22, 20, 30)); // 22 oct 2026, 8:30 p. m.
  jest.clearAllMocks();
  mockUpdateUserProfile.mockResolvedValue({});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.useRealTimers());

describe('evaluateSubscriptionStatus', () => {
  it('sin perfil devuelve "unknown" (error de conexión), no "expired"', async () => {
    expect(await evaluateSubscriptionStatus(null, getToken)).toEqual({
      canAccess: false,
      status: 'unknown',
    });
  });

  it('el superadmin siempre tiene acceso aunque su suscripción figure vencida', async () => {
    const result = await evaluateSubscriptionStatus(
      profile({ is_superadmin: true, subscription_status: 'expired' }),
      getToken
    );
    expect(result).toEqual({ canAccess: true, status: 'active' });
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
  });

  it('trial vigente: calcula días restantes por fecha, sin importar la hora', async () => {
    const result = await evaluateSubscriptionStatus(
      profile({ trial_end_date: localDate(2026, 10, 25, 1) }),
      getToken
    );
    expect(result).toEqual({ canAccess: true, status: 'trial', daysLeft: 3 });
  });

  it('el último día del trial todavía da acceso', async () => {
    const result = await evaluateSubscriptionStatus(
      profile({ trial_end_date: localDate(2026, 10, 22, 0) }),
      getToken
    );
    expect(result).toMatchObject({ canAccess: true, daysLeft: 0 });
  });

  it('trial vencido: bloquea y lo marca como expirado en la API', async () => {
    const result = await evaluateSubscriptionStatus(
      profile({ trial_end_date: localDate(2026, 10, 21, 23) }),
      getToken
    );
    expect(result).toEqual({ canAccess: false, status: 'expired', daysLeft: 0 });
    expect(mockUpdateUserProfile).toHaveBeenCalledWith(
      'u1',
      { subscription_status: 'expired' },
      getToken
    );
  });

  it('trial sin fecha de fin: le asigna 30 días desde hoy a medianoche', async () => {
    await evaluateSubscriptionStatus(profile({ trial_end_date: undefined }), getToken);
    expect(mockUpdateUserProfile).toHaveBeenCalledWith(
      'u1',
      { trial_end_date: new Date(2026, 10, 21).toISOString() },
      getToken
    );
  });

  it('activa con próximo pago en el futuro: da acceso y días restantes', async () => {
    const result = await evaluateSubscriptionStatus(
      profile({ subscription_status: 'active', next_billing_date: localDate(2026, 11, 1) }),
      getToken
    );
    expect(result).toMatchObject({ canAccess: true, status: 'active', daysLeft: 10 });
  });

  it('activa con el pago vencido: la expira', async () => {
    const result = await evaluateSubscriptionStatus(
      profile({ subscription_status: 'active', next_billing_date: localDate(2026, 10, 20) }),
      getToken
    );
    expect(result).toEqual({ canAccess: false, status: 'expired', daysLeft: 0 });
    expect(mockUpdateUserProfile).toHaveBeenCalledTimes(1);
  });

  it.each(['expired', 'canceled'] as const)('estado %s: sin acceso', async (status) => {
    expect(
      await evaluateSubscriptionStatus(profile({ subscription_status: status }), getToken)
    ).toEqual({ canAccess: false, status });
  });

  it('si falla marcar como expirado con un error de red, devuelve "unknown"', async () => {
    mockUpdateUserProfile.mockRejectedValue(new Error('Network error'));
    const result = await evaluateSubscriptionStatus(
      profile({ trial_end_date: localDate(2026, 10, 1) }),
      getToken
    );
    expect(result.status).toBe('unknown');
  });
});

describe('checkSubscriptionStatus', () => {
  it('un 402 del Worker se trata como suscripción vencida', async () => {
    mockGetUserProfile.mockRejectedValue(new ApiError('Payment required', 402));
    expect(await checkSubscriptionStatus(getToken)).toEqual({
      canAccess: false,
      status: 'expired',
      daysLeft: 0,
    });
  });

  it('un 401/503 NO empuja a pagar: es "unknown"', async () => {
    mockGetUserProfile.mockRejectedValue(new ApiError('Unauthorized', 401));
    expect((await checkSubscriptionStatus(getToken)).status).toBe('unknown');
    mockGetUserProfile.mockRejectedValue(new ApiError('D1 limit', 503));
    expect((await checkSubscriptionStatus(getToken)).status).toBe('unknown');
  });
});

describe('hasStoreAccess (add-on Tienda Online)', () => {
  it('gratis durante el trial', () => {
    expect(hasStoreAccess(profile({ subscription_status: 'trial' }))).toBe(true);
  });

  it('con plan activo solo si pagó el add-on y no ha vencido', () => {
    expect(hasStoreAccess(profile({ subscription_status: 'active' }))).toBe(false);
    expect(
      hasStoreAccess(
        profile({
          subscription_status: 'active',
          has_store_addon: true,
          store_addon_expires_at: localDate(2026, 11, 22),
        })
      )
    ).toBe(true);
    expect(
      hasStoreAccess(
        profile({
          subscription_status: 'active',
          has_store_addon: true,
          store_addon_expires_at: localDate(2026, 10, 1),
        })
      )
    ).toBe(false);
  });

  it('el add-on legacy sin fecha de vencimiento sigue activo', () => {
    expect(hasStoreAccess(profile({ subscription_status: 'active', has_store_addon: true }))).toBe(
      true
    );
  });

  it('con la suscripción vencida no hay tienda aunque tenga el add-on', () => {
    expect(hasStoreAccess(profile({ subscription_status: 'expired', has_store_addon: true }))).toBe(
      false
    );
  });
});

describe('hasAIAccess', () => {
  it('incluida en trial y plan activo; no en vencido', () => {
    expect(hasAIAccess(profile({ subscription_status: 'trial' }))).toBe(true);
    expect(hasAIAccess(profile({ subscription_status: 'active' }))).toBe(true);
    expect(hasAIAccess(profile({ subscription_status: 'expired' }))).toBe(false);
    expect(hasAIAccess(profile({ subscription_status: 'expired', is_superadmin: true }))).toBe(true);
  });
});
