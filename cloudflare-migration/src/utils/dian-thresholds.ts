/**
 * Topes de la DIAN según lo que vende la tienda en el año.
 *
 * - 3.500 UVT de ingresos brutos (año anterior o año en curso): deja de ser
 *   "no responsable de IVA" y debe facturar electrónicamente desde la primera
 *   venta que lo supere (art. 437 par. 3 E.T.; Res. DIAN 000227 de 2025).
 * - 1.400 UVT de ingresos brutos: debe declarar renta el año siguiente.
 *
 * La UVT la fija la DIAN cada diciembre: agregar el año nuevo a UVT_BY_YEAR.
 */

export const UVT_BY_YEAR: Record<number, number> = {
  2024: 47065, // Res. DIAN 000187 de 2023
  2025: 49799, // Res. DIAN 000193 de 2024
  2026: 52374, // Res. DIAN 000238 de 2025
};

export const E_INVOICE_UVT = 3500;
export const INCOME_TAX_UVT = 1400;

export type DianLevel = 'ok' | 'aviso' | 'importante' | 'obligado';

export interface DianThresholdsInput {
  year: number;
  /** Ventas del año en curso (sin canceladas), en COP. */
  yearSales: number;
  /** Ventas del año anterior registradas en posib, en COP. */
  previousYearSales: number;
  /** Primera venta del año en curso (para estimar el ritmo), o null. */
  firstSaleAt: number | null;
  /** El tendero indicó que ya factura electrónicamente / es responsable de IVA. */
  alreadyInvoicing: boolean;
}

export interface DianThresholds {
  year: number;
  uvt: number;
  /** true si la DIAN aún no publicó la UVT del año y se usa la última conocida. */
  uvtEstimated: boolean;
  eInvoiceCap: number;
  incomeTaxCap: number;
  yearSales: number;
  remaining: number;
  percent: number;
  previousYear: { year: number; sales: number; cap: number; exceeded: boolean };
  /** Proyección de cierre de año al ritmo actual, o null si no hay datos suficientes. */
  projectedYearSales: number | null;
  /** Fecha estimada (YYYY-MM-DD, Colombia) en que llegaría al tope este año, o null. */
  projectedCapDate: string | null;
  incomeTaxExceeded: boolean;
  level: DianLevel;
  alreadyInvoicing: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const CO_OFFSET_MS = 5 * 60 * 60 * 1000;

export function uvtFor(year: number): { uvt: number; estimated: boolean } {
  if (UVT_BY_YEAR[year]) return { uvt: UVT_BY_YEAR[year], estimated: false };
  const known = Object.keys(UVT_BY_YEAR).map(Number).filter((y) => y <= year);
  const latest = known.length ? Math.max(...known) : Math.min(...Object.keys(UVT_BY_YEAR).map(Number));
  return { uvt: UVT_BY_YEAR[latest], estimated: true };
}

/** Inicio del año en Colombia (UTC-5) como instante UTC. */
export function coYearStart(year: number): number {
  return Date.UTC(year, 0, 1) + CO_OFFSET_MS;
}

export function coYear(now: number): number {
  return new Date(now - CO_OFFSET_MS).getUTCFullYear();
}

export function evaluateDianThresholds(input: DianThresholdsInput, now = Date.now()): DianThresholds {
  const { year, yearSales, previousYearSales } = input;
  const { uvt, estimated } = uvtFor(year);
  const prev = uvtFor(year - 1);
  const eInvoiceCap = E_INVOICE_UVT * uvt;
  const incomeTaxCap = INCOME_TAX_UVT * uvt;
  const previousCap = E_INVOICE_UVT * prev.uvt;
  const previousExceeded = previousYearSales >= previousCap;

  // Ritmo: desde la primera venta del año (una tienda que empezó en octubre no
  // tiene ventas de enero a septiembre en posib, y diluiría el promedio).
  const yearStart = coYearStart(year);
  const yearEnd = coYearStart(year + 1);
  let projectedYearSales: number | null = null;
  let projectedCapDate: string | null = null;
  if (input.firstSaleAt !== null && yearSales > 0) {
    const from = Math.max(yearStart, input.firstSaleAt);
    const elapsedDays = (now - from) / DAY_MS;
    // Con menos de 2 semanas de datos la proyección no es confiable.
    if (elapsedDays >= 14) {
      const perDay = yearSales / elapsedDays;
      projectedYearSales = Math.round(yearSales + perDay * Math.max(0, (yearEnd - now) / DAY_MS));
      if (yearSales < eInvoiceCap && perDay > 0) {
        const reachAt = now + ((eInvoiceCap - yearSales) / perDay) * DAY_MS;
        if (reachAt < yearEnd) projectedCapDate = new Date(reachAt - CO_OFFSET_MS).toISOString().slice(0, 10);
      }
    }
  }

  const percent = eInvoiceCap > 0 ? (yearSales / eInvoiceCap) * 100 : 0;
  const level: DianLevel =
    yearSales >= eInvoiceCap || previousExceeded
      ? 'obligado'
      : percent >= 90
        ? 'importante'
        : percent >= 70
          ? 'aviso'
          : 'ok';

  return {
    year,
    uvt,
    uvtEstimated: estimated,
    eInvoiceCap,
    incomeTaxCap,
    yearSales,
    remaining: Math.max(0, eInvoiceCap - yearSales),
    percent: Math.round(percent * 10) / 10,
    previousYear: { year: year - 1, sales: previousYearSales, cap: previousCap, exceeded: previousExceeded },
    projectedYearSales,
    projectedCapDate,
    incomeTaxExceeded: yearSales >= incomeTaxCap,
    level,
    alreadyInvoicing: input.alreadyInvoicing,
  };
}

// --- Avisos (Telegram, correo, campana) ---

const LEVEL_RANK: Record<DianLevel, number> = { ok: 0, aviso: 1, importante: 2, obligado: 3 };

/**
 * ¿Hay que avisarle al tendero? Solo cuando sube de nivel dentro del año
 * (`lastSent` = 'AAAA:nivel' del último aviso). Un año nuevo vuelve a empezar.
 */
export function shouldNotify(result: DianThresholds, lastSent: string | null): boolean {
  if (result.alreadyInvoicing || result.level === 'ok') return false;
  const [sentYear, sentLevel] = (lastSent || '').split(':');
  if (Number(sentYear) !== result.year) return true;
  return LEVEL_RANK[result.level] > (LEVEL_RANK[sentLevel as DianLevel] ?? 0);
}

const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function formatCoDate(isoDay: string): string {
  const [, m, d] = isoDay.split('-').map(Number);
  return `${d} de ${MONTHS[m - 1]}`;
}

/** Título y párrafos del aviso, en texto plano (cada canal le da formato). */
export function dianAlertMessage(r: DianThresholds): { title: string; lines: string[] } {
  const sold = `En ${r.year} llevas ${cop(r.yearSales)} en ventas registradas en posib (${r.percent.toLocaleString('es-CO')} % del tope).`;
  const footer =
    'Se calcula solo con las ventas registradas en posib. La DIAN cuenta todos tus ingresos y consignaciones: confírmalo con tu contador.';

  if (r.level === 'obligado') {
    const reason = r.previousYear.exceeded
      ? `En ${r.previousYear.year} vendiste ${cop(r.previousYear.sales)}, por encima del tope de ${cop(r.previousYear.cap)} (3.500 UVT).`
      : `Superaste el tope de ${cop(r.eInvoiceCap)} (3.500 UVT de ${r.year}).`;
    return {
      title: '🔴 Debes facturar electrónicamente',
      lines: [
        reason,
        'Desde ese momento la DIAN te exige factura electrónica en cada venta y pasas a ser responsable de IVA. No hacerlo puede traer multas o el cierre del local.',
        sold,
        footer,
      ],
    };
  }

  const projection = r.projectedCapDate
    ? `A tu ritmo actual llegarías al tope alrededor del ${formatCoDate(r.projectedCapDate)}.`
    : null;
  return {
    title: r.level === 'importante' ? '🟠 Importante: estás cerca del tope de la DIAN' : '🟡 Aviso: te acercas al tope de la DIAN',
    lines: [
      sold,
      `Te quedan ${cop(r.remaining)} antes de llegar a ${cop(r.eInvoiceCap)} (3.500 UVT). Si lo superas, debes facturar electrónicamente desde esa venta.`,
      ...(projection ? [projection] : []),
      'Prepárate desde ya: habla con tu contador y habilita la facturación electrónica antes de llegar al tope.',
      footer,
    ],
  };
}
