/**
 * Salud de una tienda cliente: reglas que convierten sus números en un puntaje
 * y en una lista de cosas que debe ajustar. Lo usa GET /api/admin/health.
 */

export type HealthSeverity = 'critical' | 'warning' | 'info';
export type HealthLevel = 'bien' | 'atencion' | 'riesgo';

export interface StoreHealthInput {
  createdAt: string | null;
  subscriptionStatus: string;
  trialEndDate: string | null;
  hasTelegram: boolean;
  lastSaleAt: string | null;
  sales7d: number;
  sales30d: number;
  activeProducts: number;
  productsWithoutCost: number;
  productsWithoutPrice: number;
  negativeStock: number;
  expiredWithStock: number;
  repeatedNames: number;
  oldCreditCount: number;
  oldCreditAmount: number;
}

export interface HealthIssue {
  code: string;
  severity: HealthSeverity;
  title: string;
  advice: string;
}

export interface StoreHealthResult {
  score: number;
  level: HealthLevel;
  daysSinceLastSale: number | null;
  trialDaysLeft: number | null;
  issues: HealthIssue[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const PENALTY: Record<HealthSeverity, number> = { critical: 30, warning: 12, info: 4 };
const SEVERITY_ORDER: Record<HealthSeverity, number> = { critical: 0, warning: 1, info: 2 };

// D1 mezcla 'YYYY-MM-DD HH:MM:SS' (UTC, de datetime('now')) con ISO de JavaScript.
export function parseDbDate(value: string | null | undefined): number | null {
  if (!value) return null;
  let iso = value.trim().replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) iso += 'T00:00:00';
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(iso)) iso += 'Z';
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : time;
}

const plural = (n: number, singular: string, pluralForm: string) => `${n} ${n === 1 ? singular : pluralForm}`;
const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

export function evaluateStoreHealth(input: StoreHealthInput, now = Date.now()): StoreHealthResult {
  const issues: HealthIssue[] = [];
  const add = (code: string, severity: HealthSeverity, title: string, advice: string) =>
    issues.push({ code, severity, title, advice });

  const created = parseDbDate(input.createdAt);
  const accountAgeDays = created === null ? null : Math.floor((now - created) / DAY_MS);
  const lastSale = parseDbDate(input.lastSaleAt);
  const daysSinceLastSale = lastSale === null ? null : Math.max(0, Math.floor((now - lastSale) / DAY_MS));
  const trialEnd = parseDbDate(input.trialEndDate);
  const trialDaysLeft =
    input.subscriptionStatus === 'trial' && trialEnd !== null ? Math.ceil((trialEnd - now) / DAY_MS) : null;
  // Una cuenta recién creada todavía no tiene por qué haber cargado ni vendido nada.
  const isNew = accountAgeDays !== null && accountAgeDays < 3;

  // --- Uso ---
  if (input.activeProducts === 0) {
    if (!isNew) {
      add('sin_productos', 'critical', 'No ha cargado productos', 'Ayudarle a importar el inventario (Excel, Siigo o foto de factura).');
    }
  } else if (lastSale === null) {
    if (!isNew) {
      add('sin_ventas', 'critical', 'Nunca ha registrado una venta', 'Tiene productos pero no usa el punto de venta: mostrarle cómo vender.');
    }
  } else if (daysSinceLastSale !== null && daysSinceLastSale >= 14) {
    add('inactiva', 'critical', `Lleva ${daysSinceLastSale} días sin vender`, 'Probablemente dejó de usar el sistema: escribirle para saber por qué.');
  } else if (daysSinceLastSale !== null && daysSinceLastSale >= 4) {
    add('poca_actividad', 'warning', `Lleva ${daysSinceLastSale} días sin vender`, 'Una tienda de barrio vende a diario: confirmar que siga registrando las ventas.');
  }

  // --- Suscripción ---
  if (trialDaysLeft !== null && trialDaysLeft >= 0 && trialDaysLeft <= 5) {
    const lowUse = input.sales30d < 30;
    add(
      'trial_por_vencer',
      lowUse ? 'critical' : 'warning',
      trialDaysLeft === 0 ? 'La prueba gratis termina hoy' : `La prueba gratis termina en ${plural(trialDaysLeft, 'día', 'días')}`,
      lowUse
        ? 'Usa poco el sistema: acompañarle antes de que termine o no va a pagar.'
        : 'Lo usa bien: recordarle el pago del Plan Básico.'
    );
  }

  // --- Calidad del inventario ---
  const pct = (n: number) => (input.activeProducts > 0 ? n / input.activeProducts : 0);

  if (input.productsWithoutCost > 0 && pct(input.productsWithoutCost) >= 0.2) {
    add(
      'sin_costo',
      pct(input.productsWithoutCost) >= 0.5 ? 'critical' : 'warning',
      `${plural(input.productsWithoutCost, 'producto', 'productos')} sin precio de costo`,
      'La ganancia y la rentabilidad le salen infladas: que llene el costo (o lo suba por foto de factura).'
    );
  }
  if (input.productsWithoutPrice > 0) {
    add(
      'sin_precio',
      'warning',
      `${plural(input.productsWithoutPrice, 'producto', 'productos')} sin precio de venta`,
      'Al venderlos el total queda en $0: completar el precio.'
    );
  }
  if (input.negativeStock > 0) {
    add(
      'stock_negativo',
      input.negativeStock >= 10 ? 'warning' : 'info',
      `${plural(input.negativeStock, 'producto', 'productos')} con stock negativo`,
      'Vende más de lo que tiene registrado: no está cargando las compras al proveedor.'
    );
  }
  if (input.expiredWithStock > 0) {
    add(
      'vencidos',
      'warning',
      `${plural(input.expiredWithStock, 'producto vencido', 'productos vencidos')} con existencias`,
      'Revisar Ofertas / próximos a vencer y sacarlos del inventario.'
    );
  }
  if (input.repeatedNames > 0) {
    add(
      'nombres_repetidos',
      'info',
      `${plural(input.repeatedNames, 'nombre repetido', 'nombres repetidos')} en el catálogo`,
      'Confunde al buscar en caja: usar "Revisar catálogo" para renombrarlos.'
    );
  }

  // --- Fiado ---
  if (input.oldCreditCount > 0) {
    add(
      'fiado_viejo',
      input.oldCreditAmount >= 500000 ? 'warning' : 'info',
      `${cop(input.oldCreditAmount)} fiados hace más de 30 días`,
      `${plural(input.oldCreditCount, 'venta fiada sigue', 'ventas fiadas siguen')} sin pagar: activar los recordatorios de fiado.`
    );
  }

  // --- Funciones que no aprovecha ---
  if (!input.hasTelegram && input.activeProducts > 0) {
    add('sin_telegram', 'info', 'No tiene avisos por Telegram', 'Mostrarle el resumen diario y las alertas de vencimiento.');
  }

  issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const score = Math.max(0, 100 - issues.reduce((sum, issue) => sum + PENALTY[issue.severity], 0));
  const level: HealthLevel = score >= 80 ? 'bien' : score >= 50 ? 'atencion' : 'riesgo';

  return { score, level, daysSinceLastSale, trialDaysLeft, issues };
}
