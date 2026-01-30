import { Permission, PermissionGroup, RoleDefinition, TeamMember, UserProfile } from './types';

// ============================================================
// GRUPOS DE PERMISOS
// ============================================================

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'dashboard',
    name: 'Dashboard y Reportes',
    description: 'Acceso al panel principal y reportes de ventas',
    permissions: ['view_dashboard', 'view_reports', 'export_reports'],
  },
  {
    id: 'pos',
    name: 'Punto de Venta',
    description: 'Operación del punto de venta y gestión de ventas',
    permissions: [
      'access_pos',
      'process_sales',
      'cancel_sales',
      'apply_discounts',
      'view_sales_history',
    ],
  },
  {
    id: 'products',
    name: 'Productos',
    description: 'Gestión del catálogo de productos',
    permissions: [
      'view_products',
      'create_products',
      'edit_products',
      'delete_products',
      'manage_stock',
      'adjust_prices',
    ],
  },
  {
    id: 'customers',
    name: 'Clientes',
    description: 'Gestión de clientes y programas de lealtad',
    permissions: [
      'view_customers',
      'create_customers',
      'edit_customers',
      'delete_customers',
      'manage_customer_credit',
      'view_customer_history',
      'manage_loyalty_points',
    ],
  },
  {
    id: 'suppliers',
    name: 'Proveedores',
    description: 'Gestión de proveedores y órdenes de compra',
    permissions: [
      'view_suppliers',
      'create_suppliers',
      'edit_suppliers',
      'delete_suppliers',
      'manage_purchase_orders',
    ],
  },
  {
    id: 'inventory',
    name: 'Inventario',
    description: 'Control y ajustes de inventario',
    permissions: ['view_inventory', 'adjust_inventory', 'view_inventory_movements'],
  },
  {
    id: 'offers',
    name: 'Ofertas y Promociones',
    description: 'Creación y gestión de ofertas especiales',
    permissions: ['view_offers', 'create_offers', 'edit_offers', 'delete_offers'],
  },
  {
    id: 'categories',
    name: 'Categorías',
    description: 'Organización de productos por categorías',
    permissions: ['view_categories', 'manage_categories'],
  },
  {
    id: 'credit',
    name: 'Crédito y Pagos',
    description: 'Gestión de créditos y cobros a clientes',
    permissions: ['view_debtors', 'receive_credit_payments', 'manage_credit_limits'],
  },
  {
    id: 'store_settings',
    name: 'Configuración de Tienda',
    description: 'Configuración general de la tienda',
    permissions: ['view_store_settings', 'edit_store_settings', 'manage_payment_methods'],
  },
  {
    id: 'online_store',
    name: 'Tienda Online (Addon)',
    description: 'Gestión de la tienda en línea',
    permissions: [
      'access_online_store',
      'manage_store_config',
      'view_online_orders',
      'manage_online_orders',
    ],
  },
  {
    id: 'email_marketing',
    name: 'Email Marketing (Addon)',
    description: 'Campañas de email y comunicaciones',
    permissions: ['access_email_marketing', 'send_campaigns', 'view_email_logs'],
  },
  {
    id: 'ai_analytics',
    name: 'Analytics con IA (Addon)',
    description: 'Análisis avanzados con inteligencia artificial',
    permissions: ['access_ai_analytics', 'generate_insights'],
  },
  {
    id: 'user_management',
    name: 'Administración de Usuarios',
    description: 'Gestión de equipo y permisos',
    permissions: ['view_users', 'invite_users', 'edit_users', 'delete_users', 'manage_permissions'],
  },
];

// ============================================================
// ROLES PREDEFINIDOS
// ============================================================

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    role: 'admin',
    name: 'Administrador',
    description: 'Acceso completo a todas las funcionalidades del sistema',
    isCustomizable: false,
    permissions: [
      // Dashboard
      'view_dashboard',
      'view_reports',
      'export_reports',
      // POS
      'access_pos',
      'process_sales',
      'cancel_sales',
      'apply_discounts',
      'view_sales_history',
      // Productos
      'view_products',
      'create_products',
      'edit_products',
      'delete_products',
      'manage_stock',
      'adjust_prices',
      // Clientes
      'view_customers',
      'create_customers',
      'edit_customers',
      'delete_customers',
      'manage_customer_credit',
      'view_customer_history',
      'manage_loyalty_points',
      // Proveedores
      'view_suppliers',
      'create_suppliers',
      'edit_suppliers',
      'delete_suppliers',
      'manage_purchase_orders',
      // Inventario
      'view_inventory',
      'adjust_inventory',
      'view_inventory_movements',
      // Ofertas
      'view_offers',
      'create_offers',
      'edit_offers',
      'delete_offers',
      // Categorías
      'view_categories',
      'manage_categories',
      // Crédito
      'view_debtors',
      'receive_credit_payments',
      'manage_credit_limits',
      // Configuración
      'view_store_settings',
      'edit_store_settings',
      'manage_payment_methods',
      // Tienda Online
      'access_online_store',
      'manage_store_config',
      'view_online_orders',
      'manage_online_orders',
      // Email Marketing
      'access_email_marketing',
      'send_campaigns',
      'view_email_logs',
      // AI Analytics
      'access_ai_analytics',
      'generate_insights',
      // Usuarios
      'view_users',
      'invite_users',
      'edit_users',
      'delete_users',
      'manage_permissions',
    ],
  },
  {
    role: 'cajero',
    name: 'Cajero',
    description: 'Acceso operativo para realizar ventas y consultas básicas',
    isCustomizable: true,
    permissions: [
      // Dashboard (solo vista)
      'view_dashboard',
      'view_reports',
      // POS
      'access_pos',
      'process_sales',
      'apply_discounts',
      'view_sales_history',
      // Productos (solo vista y búsqueda)
      'view_products',
      // Clientes (vista básica y creación)
      'view_customers',
      'create_customers',
      'view_customer_history',
      // Inventario (solo vista)
      'view_inventory',
      // Categorías (solo vista)
      'view_categories',
      // Crédito
      'view_debtors',
      'receive_credit_payments',
    ],
  },
  {
    role: 'custom',
    name: 'Personalizado',
    description: 'Permisos personalizados según las necesidades específicas',
    isCustomizable: true,
    permissions: [], // Se asignan manualmente
  },
];

// ============================================================
// HELPERS DE PERMISOS
// ============================================================

/**
 * Obtiene todos los permisos de un rol predefinido
 */
export function getPermissionsForRole(role: 'admin' | 'cajero' | 'custom'): Permission[] {
  const roleDefinition = ROLE_DEFINITIONS.find((r) => r.role === role);
  return roleDefinition ? roleDefinition.permissions : [];
}

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function hasPermission(
  user: TeamMember | UserProfile,
  permission: Permission
): boolean {
  // Si es el dueño de la tienda (UserProfile), tiene todos los permisos
  if ('subscription_status' in user) {
    return true;
  }

  // Si es un TeamMember
  const teamMember = user as TeamMember;

  // Verificar si el usuario está activo
  if (teamMember.status !== 'active') {
    return false;
  }

  // Si es admin, tiene todos los permisos
  if (teamMember.role === 'admin') {
    return true;
  }

  // Verificar en la lista de permisos
  return teamMember.permissions.includes(permission);
}

/**
 * Verifica si un usuario tiene todos los permisos especificados
 */
export function hasAllPermissions(
  user: TeamMember | UserProfile,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}

/**
 * Verifica si un usuario tiene al menos uno de los permisos especificados
 */
export function hasAnyPermission(
  user: TeamMember | UserProfile,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

/**
 * Obtiene los grupos de permisos con el estado de cada permiso para un usuario
 */
export function getPermissionGroupsWithStatus(
  user: TeamMember | UserProfile
): Array<PermissionGroup & { permissionsWithStatus: Array<{ permission: Permission; enabled: boolean }> }> {
  return PERMISSION_GROUPS.map((group) => ({
    ...group,
    permissionsWithStatus: group.permissions.map((permission) => ({
      permission,
      enabled: hasPermission(user, permission),
    })),
  }));
}

/**
 * Valida que los permisos de un rol personalizado sean coherentes
 */
export function validateCustomPermissions(permissions: Permission[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Si puede gestionar stock, debe poder ver productos
  if (permissions.includes('manage_stock') && !permissions.includes('view_products')) {
    errors.push('Para gestionar stock debe tener permiso para ver productos');
  }

  // Si puede editar/eliminar productos, debe poder verlos
  if (
    (permissions.includes('edit_products') || permissions.includes('delete_products')) &&
    !permissions.includes('view_products')
  ) {
    errors.push('Para editar o eliminar productos debe tener permiso para verlos');
  }

  // Si puede procesar ventas, debe poder acceder al POS
  if (permissions.includes('process_sales') && !permissions.includes('access_pos')) {
    errors.push('Para procesar ventas debe tener acceso al POS');
  }

  // Si puede gestionar crédito de clientes, debe poder ver clientes
  if (
    permissions.includes('manage_customer_credit') &&
    !permissions.includes('view_customers')
  ) {
    errors.push('Para gestionar crédito debe tener permiso para ver clientes');
  }

  // Si puede recibir pagos de crédito, debe poder ver deudores
  if (
    permissions.includes('receive_credit_payments') &&
    !permissions.includes('view_debtors')
  ) {
    errors.push('Para recibir pagos debe tener permiso para ver deudores');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Obtiene las etiquetas descriptivas de los permisos
 */
export const PERMISSION_LABELS: Record<Permission, string> = {
  // Dashboard
  view_dashboard: 'Ver Dashboard',
  view_reports: 'Ver Reportes',
  export_reports: 'Exportar Reportes',
  // POS
  access_pos: 'Acceder al Punto de Venta',
  process_sales: 'Procesar Ventas',
  cancel_sales: 'Cancelar Ventas',
  apply_discounts: 'Aplicar Descuentos',
  view_sales_history: 'Ver Historial de Ventas',
  // Productos
  view_products: 'Ver Productos',
  create_products: 'Crear Productos',
  edit_products: 'Editar Productos',
  delete_products: 'Eliminar Productos',
  manage_stock: 'Gestionar Stock',
  adjust_prices: 'Ajustar Precios',
  // Clientes
  view_customers: 'Ver Clientes',
  create_customers: 'Crear Clientes',
  edit_customers: 'Editar Clientes',
  delete_customers: 'Eliminar Clientes',
  manage_customer_credit: 'Gestionar Crédito de Clientes',
  view_customer_history: 'Ver Historial de Clientes',
  manage_loyalty_points: 'Gestionar Puntos de Lealtad',
  // Proveedores
  view_suppliers: 'Ver Proveedores',
  create_suppliers: 'Crear Proveedores',
  edit_suppliers: 'Editar Proveedores',
  delete_suppliers: 'Eliminar Proveedores',
  manage_purchase_orders: 'Gestionar Órdenes de Compra',
  // Inventario
  view_inventory: 'Ver Inventario',
  adjust_inventory: 'Ajustar Inventario',
  view_inventory_movements: 'Ver Movimientos de Inventario',
  // Ofertas
  view_offers: 'Ver Ofertas',
  create_offers: 'Crear Ofertas',
  edit_offers: 'Editar Ofertas',
  delete_offers: 'Eliminar Ofertas',
  // Categorías
  view_categories: 'Ver Categorías',
  manage_categories: 'Gestionar Categorías',
  // Crédito
  view_debtors: 'Ver Deudores',
  receive_credit_payments: 'Recibir Pagos de Crédito',
  manage_credit_limits: 'Gestionar Límites de Crédito',
  // Configuración
  view_store_settings: 'Ver Configuración de Tienda',
  edit_store_settings: 'Editar Configuración de Tienda',
  manage_payment_methods: 'Gestionar Métodos de Pago',
  // Tienda Online
  access_online_store: 'Acceder a Tienda Online',
  manage_store_config: 'Configurar Tienda Online',
  view_online_orders: 'Ver Pedidos Online',
  manage_online_orders: 'Gestionar Pedidos Online',
  // Email Marketing
  access_email_marketing: 'Acceder a Email Marketing',
  send_campaigns: 'Enviar Campañas',
  view_email_logs: 'Ver Logs de Email',
  // AI Analytics
  access_ai_analytics: 'Acceder a Analytics con IA',
  generate_insights: 'Generar Insights',
  // Usuarios
  view_users: 'Ver Usuarios',
  invite_users: 'Invitar Usuarios',
  edit_users: 'Editar Usuarios',
  delete_users: 'Eliminar Usuarios',
  manage_permissions: 'Gestionar Permisos',
};
