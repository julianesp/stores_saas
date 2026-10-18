/**
 * Revisión del catálogo de una tienda: qué está bien y qué conviene arreglar,
 * escrita para que el tendero la lea sin estrés.
 *
 * Sirve para dos fuentes con el mismo informe:
 *   - "siigo": el "Listado de productos" antes de importarlo (lib/siigo-products-import.ts).
 *   - "posib": los productos que la tienda ya tiene en posib.
 *
 * Todo se calcula aquí, en el navegador. Lo único que no es automático son las
 * categorías mal puestas (Monster en "Frutas y verduras"): eso lo revisa Gemini
 * aparte (POST /api/ai/category-review) y se agrega con `wrongCategories`.
 */

import { normalizeName } from "./duplicate-helpers";
import { normalizeBarcode } from "./barcode-utils";
import { looksLikeThousands, type SiigoProductRow, type SiigoProductsParseResult } from "./siigo-products-import";
import { tracksInventory, type Product, type Category } from "./types";

/** Un precio por debajo de esto casi seguro está mal escrito (en Colombia ya no circula la moneda de $50). */
export const MIN_REAL_PRICE = 100;

export interface ReviewItem {
  name: string;
  code: string | null;
  category: string | null;
  price: number;
  /** null = la fuente no trae cantidad. */
  stock: number | null;
  tracksInventory: boolean;
  /** Solo Siigo: tiene IVA y el precio NO lo incluye. */
  taxNotIncluded?: { rate: number; priceWithTax: number };
}

export interface WrongCategory {
  name: string;
  current: string;
  suggested: string;
}

export interface CatalogReview {
  source: "siigo" | "posib";
  storeName: string | null;
  total: number;
  categories: number;
  goodPrices: number;
  lowPrices: ReviewItem[];
  noPrice: ReviewItem[];
  /** Controlan inventario y no tienen unidades (o no hay dato, en Siigo). */
  noStock: ReviewItem[];
  negativeStock: number;
  /** Se venden sin controlar inventario (decisión del tendero, solo informativo). */
  untracked: number;
  taxNotIncluded: ReviewItem[];
  duplicateCodes: { count: number; examples: string[] };
  repeatedNames: { groups: number; examples: string[] };
  noCategory: ReviewItem[];
  /** null = todavía no se ha revisado con IA. */
  wrongCategories: WrongCategory[] | null;
  /** Todos los productos revisados (para la revisión de categorías con IA). */
  items: ReviewItem[];
}

export interface ReviewSummaryItem {
  key: string;
  title: string;
  count: string;
}

function repeatedNames(items: ReviewItem[]): CatalogReview["repeatedNames"] {
  const groups = new Map<string, ReviewItem[]>();
  for (const item of items) {
    const key = normalizeName(item.name);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const repeated = [...groups.values()].filter((g) => g.length > 1);
  return { groups: repeated.length, examples: repeated.slice(0, 3).map((g) => g[0].name) };
}

function buildReview(
  source: CatalogReview["source"],
  items: ReviewItem[],
  storeName: string | null,
  duplicateCodes: CatalogReview["duplicateCodes"],
): CatalogReview {
  const lowPrices = items.filter((i) => i.price > 0 && i.price < MIN_REAL_PRICE);
  const noPrice = items.filter((i) => i.price <= 0);
  return {
    source,
    storeName,
    total: items.length,
    categories: new Set(items.map((i) => i.category).filter(Boolean)).size,
    goodPrices: items.length - lowPrices.length - noPrice.length,
    lowPrices,
    noPrice,
    noStock: items.filter((i) => i.tracksInventory && (i.stock === null || i.stock <= 0)),
    negativeStock: items.filter((i) => i.tracksInventory && (i.stock ?? 0) < 0).length,
    untracked: items.filter((i) => !i.tracksInventory).length,
    taxNotIncluded: items.filter((i) => i.taxNotIncluded),
    duplicateCodes,
    repeatedNames: repeatedNames(items),
    noCategory: items.filter((i) => !i.category),
    wrongCategories: null,
    items,
  };
}

/** Revisión del archivo de Siigo, antes de importarlo (precios tal como están en Siigo). */
export function reviewFromSiigo(parsed: SiigoProductsParseResult): CatalogReview {
  const items: ReviewItem[] = parsed.products.map((p: SiigoProductRow) => {
    const price = p.price1 > 0 ? p.price1 : p.price2;
    return {
      name: p.name,
      code: p.code || null,
      category: p.category,
      price,
      stock: p.balance,
      tracksInventory: p.inventoriable,
      taxNotIncluded:
        p.taxRate > 0 && !p.taxIncluded
          ? { rate: p.taxRate, priceWithTax: Math.round(price * (1 + p.taxRate / 100)) }
          : undefined,
    };
  });
  // El parser ya descartó los códigos repetidos y dejó un aviso por cada uno.
  const dupWarnings = parsed.warnings.filter((w) => /repetido/.test(w.reason));
  const review = buildReview("siigo", items, parsed.businessName, {
    count: dupWarnings.length,
    examples: dupWarnings
      .slice(0, 3)
      .map((w) => w.reason.match(/"([^"]+)"/)?.[1])
      .filter((n): n is string => !!n),
  });
  // Coherente con la opción de la importación (looksLikeThousands usa el mismo límite).
  review.lowPrices = review.lowPrices.filter((i) =>
    looksLikeThousands({ price1: i.price, price2: 0 } as SiigoProductRow),
  );
  return review;
}

/** Revisión de los productos que la tienda ya tiene en posib. */
export function reviewFromPosib(
  products: Product[],
  categories: Category[],
  storeName: string | null,
): CatalogReview {
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const items: ReviewItem[] = products.map((p) => ({
    name: p.name,
    code: p.barcode || null,
    category: (p.category_id && categoryName.get(p.category_id)) || null,
    price: Number(p.sale_price) || 0,
    stock: Number(p.stock) || 0,
    tracksInventory: tracksInventory(p),
  }));

  const byCode = new Map<string, ReviewItem[]>();
  for (const item of items) {
    const code = normalizeBarcode(item.code);
    if (code) byCode.set(code, [...(byCode.get(code) ?? []), item]);
  }
  const dupGroups = [...byCode.values()].filter((g) => g.length > 1);

  return buildReview("posib", items, storeName, {
    count: dupGroups.reduce((sum, g) => sum + g.length - 1, 0),
    examples: dupGroups.slice(0, 3).map((g) => g[0].name),
  });
}

/** Lista para el resumen de arriba y el texto de WhatsApp. */
export function summarize(review: CatalogReview): ReviewSummaryItem[] {
  const n = (v: number) => v.toLocaleString("es-CO");
  const products = (v: number) => `${n(v)} ${v === 1 ? "producto" : "productos"}`;
  const out: ReviewSummaryItem[] = [];
  const prices = review.lowPrices.length + review.noPrice.length;
  if (prices > 0) out.push({ key: "prices", title: "Precios por revisar", count: products(prices) });
  if (review.noStock.length > 0)
    out.push({ key: "stock", title: "Productos sin unidades registradas", count: products(review.noStock.length) });
  if (review.taxNotIncluded.length > 0)
    out.push({ key: "tax", title: "IVA sin sumar al precio", count: products(review.taxNotIncluded.length) });
  const repeated = review.duplicateCodes.count + review.repeatedNames.groups;
  if (repeated > 0) out.push({ key: "repeated", title: "Productos repetidos", count: `${n(repeated)} ${repeated === 1 ? "caso" : "casos"}` });
  const cats = review.noCategory.length + (review.wrongCategories?.length ?? 0);
  if (cats > 0) out.push({ key: "categories", title: "Categorías por ordenar", count: products(cats) });
  return out;
}

/** Texto corto para mandar por WhatsApp. */
export function whatsappText(review: CatalogReview): string {
  const n = (v: number) => v.toLocaleString("es-CO");
  const items = summarize(review);
  const lines = [
    `Revisión de productos${review.storeName ? ` · ${review.storeName}` : ""}`,
    "",
    `Lo que está bien: ${n(review.total)} productos, ${n(review.categories)} categorías y ${n(review.goodPrices)} con el precio bien escrito.`,
  ];
  if (items.length === 0) {
    lines.push("", "No encontramos nada por arreglar. ¡Todo en orden!");
  } else {
    lines.push("", "Para mejorar, con calma:");
    for (const item of items) lines.push(`• ${item.title}: ${item.count}`);
  }
  lines.push("", "posib.dev");
  return lines.join("\n");
}
