import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLE_DEFINITIONS,
  getPermissionGroupsWithStatus,
  getPermissionsForRole,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  validateCustomPermissions,
} from '../permissions';
import type { Permission, TeamMember, UserProfile } from '../types';

const owner = {
  id: 'u1',
  clerk_user_id: 'c1',
  email: 'dueno@tienda.co',
  role: 'admin',
  subscription_status: 'active',
} as UserProfile;

function member(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 'm1',
    owner_id: 'u1',
    email: 'cajera@tienda.co',
    role: 'custom',
    permissions: [],
    status: 'active',
    invitation_status: 'accepted',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

beforeEach(() => {
  // hasPermission deja trazas de depuración en consola; aquí solo hacen ruido.
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

describe('hasPermission', () => {
  it('el dueño de la tienda tiene todos los permisos', () => {
    expect(hasPermission(owner, 'delete_users')).toBe(true);
    expect(hasPermission(owner, 'manage_permissions')).toBe(true);
  });

  it('un miembro admin activo tiene todos los permisos', () => {
    expect(hasPermission(member({ role: 'admin' }), 'delete_products')).toBe(true);
  });

  it('un miembro inactivo o suspendido no tiene ningún permiso, aunque sea admin', () => {
    expect(hasPermission(member({ role: 'admin', status: 'inactive' }), 'access_pos')).toBe(false);
    expect(
      hasPermission(member({ permissions: ['access_pos'], status: 'suspended' }), 'access_pos')
    ).toBe(false);
  });

  it('un miembro personalizado solo tiene los permisos que se le asignaron', () => {
    const cajera = member({ permissions: ['access_pos', 'process_sales'] });
    expect(hasPermission(cajera, 'process_sales')).toBe(true);
    expect(hasPermission(cajera, 'cancel_sales')).toBe(false);
  });
});

describe('hasAllPermissions / hasAnyPermission', () => {
  const cajera = member({ permissions: ['access_pos', 'view_products'] });

  it('hasAllPermissions exige todos', () => {
    expect(hasAllPermissions(cajera, ['access_pos', 'view_products'])).toBe(true);
    expect(hasAllPermissions(cajera, ['access_pos', 'edit_products'])).toBe(false);
  });

  it('hasAnyPermission basta con uno', () => {
    expect(hasAnyPermission(cajera, ['edit_products', 'view_products'])).toBe(true);
    expect(hasAnyPermission(cajera, ['edit_products', 'delete_products'])).toBe(false);
  });
});

describe('roles predefinidos', () => {
  const allPermissions = PERMISSION_GROUPS.flatMap((g) => g.permissions);

  it('el rol admin incluye todos los permisos de todos los grupos', () => {
    expect(new Set(getPermissionsForRole('admin'))).toEqual(new Set(allPermissions));
  });

  it('el cajero puede vender pero no cancelar ventas ni administrar usuarios', () => {
    const cajero = getPermissionsForRole('cajero');
    expect(cajero).toEqual(expect.arrayContaining(['access_pos', 'process_sales']));
    expect(cajero).not.toContain('cancel_sales');
    expect(cajero).not.toContain('manage_permissions');
  });

  it('el rol custom arranca sin permisos', () => {
    expect(getPermissionsForRole('custom')).toEqual([]);
  });

  it('los permisos predefinidos son coherentes según las reglas de validación', () => {
    for (const role of ROLE_DEFINITIONS) {
      expect(validateCustomPermissions(role.permissions)).toEqual({ valid: true, errors: [] });
    }
  });

  it('todo permiso de los grupos tiene una etiqueta en español', () => {
    for (const permission of allPermissions) {
      expect(PERMISSION_LABELS[permission]).toBeTruthy();
    }
  });
});

describe('validateCustomPermissions', () => {
  it.each<[Permission[], string]>([
    [['manage_stock'], 'Para gestionar stock debe tener permiso para ver productos'],
    [['edit_products'], 'Para editar o eliminar productos debe tener permiso para verlos'],
    [['process_sales'], 'Para procesar ventas debe tener acceso al POS'],
    [['manage_customer_credit'], 'Para gestionar crédito debe tener permiso para ver clientes'],
    [['receive_credit_payments'], 'Para recibir pagos debe tener permiso para ver deudores'],
  ])('rechaza %j sin su permiso de vista', (permissions, error) => {
    const result = validateCustomPermissions(permissions);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(error);
  });

  it('acepta una combinación coherente', () => {
    expect(
      validateCustomPermissions(['access_pos', 'process_sales', 'view_debtors', 'receive_credit_payments'])
    ).toEqual({ valid: true, errors: [] });
  });
});

describe('getPermissionGroupsWithStatus', () => {
  it('marca habilitados solo los permisos que el miembro tiene', () => {
    const groups = getPermissionGroupsWithStatus(member({ permissions: ['view_offers'] }));
    const offers = groups.find((g) => g.id === 'offers')!;
    expect(offers.permissionsWithStatus).toEqual([
      { permission: 'view_offers', enabled: true },
      { permission: 'create_offers', enabled: false },
      { permission: 'edit_offers', enabled: false },
      { permission: 'delete_offers', enabled: false },
    ]);
  });
});
