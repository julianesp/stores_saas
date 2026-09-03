/**
 * Tipos de negocio (clasificación de tiendas).
 *
 * Este archivo es la ÚNICA fuente de verdad para la clasificación de tiendas:
 * qué tipos de negocio existen, con qué plan/precio se venden y cómo se adapta
 * la interfaz a cada uno. Para cambiar un precio, ocultar un módulo o ajustar
 * el vocabulario de un tipo, edita el array `BUSINESS_TYPES` de abajo.
 *
 * ── Modelo de suscripción ──────────────────────────────────────────────────
 * Cada tipo de negocio ES un plan de suscripción distinto (con su propio
 * `planId` y `price`). Al pagar, el tendero elige su tipo de negocio; el
 * webhook de ePayco guarda ese `planId` y, a partir de él, el `business_type`
 * del perfil. Ver:
 *   - lib/epayco.ts            → catálogo SUBSCRIPTION_PLANS (deriva de aquí)
 *   - app/api/webhooks/epayco  → activa la cuenta y guarda business_type
 *   - app/dashboard/subscription → el tendero elige y paga
 *
 * ── Cómo cambiar los precios ───────────────────────────────────────────────
 * Edita el campo `price` de cada tipo abajo. No hay que tocar nada más:
 * epayco.ts y la página de suscripción los leen de aquí.
 */

/** Identificadores estables de tipo de negocio. No renombrar (se guardan en BD). */
export type BusinessTypeId =
  | 'abarrotes'
  | 'papeleria'
  | 'comidas_rapidas'
  | 'licorera'
  | 'farmacia';

/** IDs de módulos del sidebar que un tipo de negocio puede ocultar. */
export type StoreModuleId =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'customers'
  | 'debtors'
  | 'suppliers'
  | 'purchase-stats'
  | 'sales'
  | 'profitability'
  | 'offers'
  | 'inventory'
  | 'analytics'
  | 'email-settings';

export interface BusinessTypeFeatures {
  /** Mostrar el campo de fecha de vencimiento en productos. */
  showExpiration: boolean;
  /** Mostrar el escáner/campo de código de barras en productos. */
  showBarcode: boolean;
  /** El negocio maneja fiado / cuentas por cobrar de forma habitual. */
  showFiado: boolean;
  /** El negocio trabaja con proveedores y órdenes de compra. */
  showSuppliers: boolean;
}

export interface BusinessType {
  /** Identificador estable. Se guarda en user_profiles.business_type. */
  id: BusinessTypeId;
  /** Nombre visible del tipo de negocio. */
  name: string;
  /** Descripción corta para la tarjeta de selección. */
  description: string;
  /** Emoji/ícono para mostrar en la selección (sin dependencias externas). */
  emoji: string;
  /** ID del plan de suscripción en ePayco (único por tipo). */
  planId: string;
  /** Precio mensual en COP. PLACEHOLDER: ajustar cuando estén los definitivos. */
  price: number;
  /** Cómo se llaman los "productos" en este negocio (singular / plural). */
  vocabulary: {
    itemSingular: string; // ej: "Producto", "Plato", "Medicamento"
    itemPlural: string;   // ej: "Productos", "Platos", "Medicamentos"
  };
  /** Módulos del sidebar que NO se muestran para este tipo de negocio. */
  hiddenModules: StoreModuleId[];
  /** Interruptores de features de la interfaz. */
  features: BusinessTypeFeatures;
}

/** Tipo de negocio por defecto (comportamiento histórico = tienda completa). */
export const DEFAULT_BUSINESS_TYPE: BusinessTypeId = 'abarrotes';

export const BUSINESS_TYPES: BusinessType[] = [
  {
    id: 'abarrotes',
    name: 'Abarrotes / Minimercado',
    description:
      'Tienda de barrio completa: control de vencimientos, fiado, código de barras y proveedores.',
    emoji: '🛒',
    planId: 'plan-abarrotes-monthly',
    price: 24900,
    vocabulary: { itemSingular: 'Producto', itemPlural: 'Productos' },
    hiddenModules: [],
    features: {
      showExpiration: true,
      showBarcode: true,
      showFiado: true,
      showSuppliers: true,
    },
  },
  {
    id: 'papeleria',
    name: 'Papelería',
    description:
      'Útiles escolares y de oficina. Sin vencimientos, foco en variedad de artículos.',
    emoji: '✏️',
    planId: 'plan-papeleria-monthly',
    price: 19900,
    vocabulary: { itemSingular: 'Artículo', itemPlural: 'Artículos' },
    hiddenModules: [],
    features: {
      showExpiration: false,
      showBarcode: true,
      showFiado: true,
      showSuppliers: true,
    },
  },
  {
    id: 'comidas_rapidas',
    name: 'Comidas rápidas / Pizzería',
    description:
      'Platos y combos preparados. Sin código de barras ni inventario perecedero clásico.',
    emoji: '🍕',
    planId: 'plan-comidas-rapidas-monthly',
    price: 19900,
    vocabulary: { itemSingular: 'Plato', itemPlural: 'Platos y combos' },
    hiddenModules: ['inventory'],
    features: {
      showExpiration: false,
      showBarcode: false,
      showFiado: true,
      showSuppliers: false,
    },
  },
  {
    id: 'licorera',
    name: 'Licorera / Estanco',
    description:
      'Licores y cigarrillos. Ticket promedio alto, sin fecha de vencimiento.',
    emoji: '🍾',
    planId: 'plan-licorera-monthly',
    price: 24900,
    vocabulary: { itemSingular: 'Producto', itemPlural: 'Productos' },
    hiddenModules: [],
    features: {
      showExpiration: false,
      showBarcode: true,
      showFiado: true,
      showSuppliers: true,
    },
  },
  {
    id: 'farmacia',
    name: 'Farmacia / Droguería',
    description:
      'Medicamentos y productos de salud. Control estricto de vencimientos.',
    emoji: '💊',
    planId: 'plan-farmacia-monthly',
    price: 29900,
    vocabulary: { itemSingular: 'Medicamento', itemPlural: 'Medicamentos' },
    hiddenModules: [],
    features: {
      showExpiration: true,
      showBarcode: true,
      showFiado: true,
      showSuppliers: true,
    },
  },
];

/** Devuelve el tipo de negocio por su id, o el por defecto (abarrotes) si no existe. */
export function getBusinessType(id?: string | null): BusinessType {
  const found = BUSINESS_TYPES.find((t) => t.id === id);
  return found ?? BUSINESS_TYPES.find((t) => t.id === DEFAULT_BUSINESS_TYPE)!;
}

/** Devuelve el tipo de negocio asociado a un planId, o null si no corresponde a ninguno. */
export function getBusinessTypeByPlanId(planId?: string | null): BusinessType | null {
  return BUSINESS_TYPES.find((t) => t.planId === planId) ?? null;
}

/** true si el planId corresponde a un plan de tipo de negocio (no un add-on). */
export function isBusinessPlanId(planId?: string | null): boolean {
  return getBusinessTypeByPlanId(planId) !== null;
}

/** Módulos ocultos para un business_type dado (vacío si no se reconoce). */
export function getHiddenModules(businessType?: string | null): StoreModuleId[] {
  return getBusinessType(businessType).hiddenModules;
}
