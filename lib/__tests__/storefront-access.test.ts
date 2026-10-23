import { getStorefrontBlockMessage, hasStorefrontAccess } from '../storefront-access';
import type { UserProfile } from '../types';

jest.mock('../cloudflare-api', () => ({}));

const profile = (overrides: Partial<UserProfile>) =>
  ({ id: 'u1', clerk_user_id: 'c1', email: 'a@b.co', role: 'admin', ...overrides }) as UserProfile;

describe('hasStorefrontAccess', () => {
  it('sin perfil: sin acceso', () => {
    expect(hasStorefrontAccess(null)).toMatchObject({ hasAccess: false, reason: 'no_subscription' });
  });

  it('trial: acceso por prueba gratuita', () => {
    expect(hasStorefrontAccess(profile({ subscription_status: 'trial' }))).toMatchObject({
      hasAccess: true,
      reason: 'trial',
    });
  });

  it('plan activo sin add-on: lo invita a activar la tienda', () => {
    expect(hasStorefrontAccess(profile({ subscription_status: 'active' }))).toMatchObject({
      hasAccess: false,
      reason: 'basic_plan',
    });
  });

  it('plan activo con add-on: acceso', () => {
    expect(
      hasStorefrontAccess(profile({ subscription_status: 'active', has_store_addon: true }))
    ).toMatchObject({ hasAccess: true });
  });

  it('suscripción vencida: lo invita a renovar', () => {
    expect(hasStorefrontAccess(profile({ subscription_status: 'expired' }))).toMatchObject({
      hasAccess: false,
      reason: 'expired',
    });
  });
});

describe('getStorefrontBlockMessage', () => {
  it('muestra el precio del add-on a quien tiene el plan básico', () => {
    expect(getStorefrontBlockMessage('basic_plan').html).toContain('$14.900/mes');
  });

  it('usa el mensaje genérico para razones desconocidas', () => {
    expect(getStorefrontBlockMessage('otra').title).toBe('🏪 Tienda Online');
  });
});
