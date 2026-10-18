/**
 * Parser de listas de productos exportadas desde otros sistemas POS.
 *
 * Nació para el "Listado de productos / Servicios" de Siigo (abajo su mapeo
 * exacto), pero reconoce también los encabezados comunes de otros sistemas y
 * de hojas hechas a mano ("Código de barras", "Precio venta", "Existencias",
 * "Costo", "% IVA"...; ver HEADERS). Solo exige nombre y código o precio.
 *
 * Es el catálogo con el que Siigo factura (incluida la facturación electrónica
 * DIAN). Columnas que trae el reporte y cómo se pasan a posib:
 *
 *   Tipo                         Producto / Servicio (servicio => sin inventario)
 *   Código                       barcode (es la clave para no duplicar)
 *   Nombre                       name
 *   Referencia fábrica           factory_reference
 *   Categoría                    categoría (se crea si no existe)
 *   Estado                       Activo / Inactivo  -> is_active
 *   Impuesto cargo (+ Cargo 2)   "IVA 19%", "INC 8%" -> tax_label + tax_rate
 *   Descripción larga            description
 *   Es incluido                  SI = el precio ya incluye el impuesto
 *   Inventariable                Si / NO -> track_inventory
 *   Saldo cantidades             stock (Siigo permite negativos; aquí mínimo 0)
 *   Visible en facturas de venta NO => inactivo
 *   Stock mínimo                 min_stock
 *   Precio de venta 1 / 2        sale_price / sale_price_2
 *
 * En posib el precio de venta SIEMPRE incluye el impuesto (es lo que paga el
 * cliente). Si en Siigo el producto tiene IVA y "Es incluido = NO", se puede
 * sumar el impuesto al precio al importar (opción addTaxToPrice).
 */

import { normalize, readWorkbookRows, toNumber } from "./siigo-import";
import type { ImportProductRow } from "./cloudflare-api";

export interface SiigoProductRow {
  /** Fila del Excel (1-based), para mostrar avisos. */
  row: number;
  type: string;
  code: string;
  name: string;
  factoryReference: string | null;
  category: string | null;
  active: boolean;
  taxLabel: string | null;
  /** Suma de los porcentajes de "Impuesto cargo" e "Impuesto Cargo 2". */
  taxRate: number;
  description: string | null;
  /** "Es incluido": el precio de Siigo ya incluye el impuesto. */
  taxIncluded: boolean;
  inventoriable: boolean;
  /** Saldo tal cual lo trae Siigo (puede ser negativo o vacío). */
  balance: number | null;
  minStock: number;
  price1: number;
  price2: number;
  /** Costo de compra (Siigo no lo trae; otros sistemas sí). */
  cost: number;
}

export interface SiigoProductsParseResult {
  products: SiigoProductRow[];
  warnings: Array<{ row: number; reason: string }>;
  /** Nombre del negocio y NIT que Siigo pone arriba del reporte (si vienen). */
  businessName: string | null;
  nit: string | null;
}

export interface ToImportOptions {
  /** Sumar el impuesto a los precios que en Siigo NO lo incluyen. */
  addTaxToPrice: boolean;
  /** Importar todo sin control de inventario (el tendero no lleva stock). */
  noInventory: boolean;
  /** Multiplicar por 1.000 los precios menores a $100 (guardados "en miles" en Siigo). */
  fixThousands: boolean;
}

/**
 * Precios por debajo de esto se consideran escritos en miles (ej. 2 = $2.000).
 * En el catálogo real de una tienda no hay productos de $1 a $99 (la moneda más pequeña en uso es la de $100), y sí muchos
 * de $100–$400 (dulces, cubos), que quedan intactos.
 */
export const THOUSANDS_THRESHOLD = 100;

export function looksLikeThousands(p: SiigoProductRow): boolean {
  const base = p.price1 > 0 ? p.price1 : p.price2;
  return base > 0 && base < THOUSANDS_THRESHOLD;
}

/**
 * Excel le agrega ".00" a códigos de barras numéricos ("606110957779.00").
 * Solo se limpia en códigos largos (8+ dígitos = código de barras real): en los
 * internos cortos "20" y "20,0" son productos distintos en Siigo.
 */
function cleanCode(code: string): string {
  const m = code.match(/^(\d{8,})[.,]0+$/);
  return m ? m[1] : code;
}

// Encabezados ya normalizados (sin acentos, minúsculas) -> campo interno.
// Primero los de Siigo y después variantes de otros sistemas POS (Alegra, Loggro,
// Vendty, hojas de Excel hechas a mano...). Si dos columnas sirven para el mismo
// campo, gana la que coincide con el sinónimo más arriba en la lista.
const HEADERS: Record<string, string[]> = {
  type: ["tipo", "tipo producto", "tipo de producto"],
  code: [
    "codigo", "codigo de barras", "codigo barras", "cod barras", "barcode", "ean",
    "codigo producto", "codigo del producto", "sku", "cod", "id producto",
  ],
  name: [
    "nombre", "nombre producto", "nombre del producto", "producto", "articulo",
    "nombre articulo", "item", "descripcion",
  ],
  factoryReference: ["referencia fabrica", "referencia de fabrica", "referencia"],
  category: ["categoria", "categoria producto", "linea", "grupo", "familia", "departamento", "seccion"],
  status: ["estado", "activo"],
  tax1: [
    "impuesto cargo", "impuesto cargo 1", "impuesto", "iva", "% iva", "porcentaje iva",
    "tarifa iva", "iva %", "tasa iva",
  ],
  tax2: ["impuesto cargo 2", "inc", "impoconsumo", "impuesto al consumo"],
  description: ["descripcion larga", "detalle", "observaciones"],
  taxIncluded: ["es incluido", "iva incluido", "impuesto incluido", "precio incluye iva", "incluye iva"],
  inventoriable: ["inventariable", "controla inventario", "maneja inventario"],
  balance: [
    "saldo cantidades", "saldo", "existencias", "existencia", "stock", "cantidad",
    "cantidad disponible", "inventario", "unidades", "stock actual",
  ],
  visible: ["visible en facturas de venta", "visible en facturas"],
  minStock: ["stock minimo", "cantidad minima", "inventario minimo", "minimo", "existencia minima"],
  price1: [
    "precio de venta 1", "precio venta 1", "precio de venta", "precio venta", "precio",
    "valor venta", "precio al publico", "pvp", "precio unitario", "valor unitario", "precio 1",
  ],
  price2: ["precio de venta 2", "precio venta 2", "precio 2", "precio mayorista", "precio por mayor"],
  cost: [
    "costo", "costo unitario", "precio de compra", "precio compra", "precio costo",
    "valor compra", "costo promedio", "ultimo costo",
  ],
};

/** Texto plano de una celda de ExcelJS (texto enriquecido, fórmulas, hipervínculos). */
function cellText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().split("T")[0];
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.richText)) {
      return (v.richText as Array<{ text: string }>).map((t) => t.text).join("").trim();
    }
    if ("result" in v) return cellText(v.result);
    if ("text" in v) return cellText(v.text);
    return "";
  }
  return String(value).trim();
}

function cellNumber(value: unknown): number {
  const text = cellText(value);
  return text === "" ? 0 : toNumber(typeof value === "number" ? value : text);
}

const isYes = (value: unknown) => /^(si|s|yes|1|true)$/.test(normalize(cellText(value)));

/** "IVA 19%" -> 19 ; "INC 8 %" -> 8 ; "19" -> 19 ; "0,19" -> 19 ; "Excluido" -> 0 */
function parseTaxRate(label: string): number {
  const m = label.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (m) return parseFloat(m[1].replace(",", "."));
  // Otros sistemas exportan solo el número: 19 o 0,19.
  if (/^\d+(?:[.,]\d+)?$/.test(label.trim())) {
    const value = parseFloat(label.trim().replace(",", "."));
    return value > 0 && value < 1 ? Math.round(value * 100) : value <= 100 ? value : 0;
  }
  return 0;
}

function detectHeader(rows: unknown[][]): { headerRow: number; columns: Record<string, number> } | null {
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const row = rows[r] ?? [];
    const columns: Record<string, number> = {};
    const rank: Record<string, number> = {};
    for (let c = 0; c < row.length; c++) {
      const header = normalize(cellText(row[c]));
      if (!header) continue;
      // Coincidencia exacta: "impuesto cargo" y "impuesto cargo 2" son columnas distintas.
      for (const [field, names] of Object.entries(HEADERS)) {
        const idx = names.indexOf(header);
        if (idx >= 0 && (rank[field] == null || idx < rank[field])) {
          columns[field] = c;
          rank[field] = idx;
        }
      }
    }
    // Una columna no puede ser nombre y descripción a la vez.
    if (columns.description != null && columns.description === columns.name) delete columns.description;
    // Sin columna de código, algunos sistemas usan la "Referencia" como código.
    if (columns.code == null && columns.factoryReference != null) {
      columns.code = columns.factoryReference;
      delete columns.factoryReference;
    }
    if (columns.name != null && (columns.code != null || columns.price1 != null)) {
      return { headerRow: r, columns };
    }
  }
  return null;
}

export async function parseSiigoProductsFile(file: File): Promise<SiigoProductsParseResult> {
  const isCsv = /\.csv$/i.test(file.name);
  const rows = await readWorkbookRows(await file.arrayBuffer(), isCsv);

  const header = detectHeader(rows);
  if (!header) {
    throw new Error(
      'No se encontraron las columnas del nombre y el código (o el precio) de los productos. Revisa que la primera hoja del archivo sea la lista de productos.',
    );
  }
  const { headerRow, columns } = header;
  const get = (row: unknown[], field: string) =>
    columns[field] != null ? row[columns[field]] : undefined;

  // Arriba del encabezado Siigo pone título, razón social y NIT.
  const preamble = rows
    .slice(0, headerRow)
    .map((r) => cellText((r ?? []).find((v) => cellText(v) !== "")))
    .filter(Boolean);
  const nit = preamble.find((t) => /^\d[\d.\s-]{5,}$/.test(t)) ?? null;
  const businessName =
    preamble.find((t) => t !== nit && !/listado de productos/i.test(t)) ?? null;

  const products: SiigoProductRow[] = [];
  const warnings: SiigoProductsParseResult["warnings"] = [];
  const seenCodes = new Set<string>();

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const rowNumber = r + 1;
    const code = cleanCode(cellText(get(row, "code")));
    const name = cellText(get(row, "name"));
    // Filas vacías y pie del reporte ("Procesado en: ...", celda combinada en todas las columnas).
    if (!code && !name) continue;
    if (/^procesado en/i.test(cellText(row[0])) || /^procesado en/i.test(code)) continue;
    // Producto interno de Siigo para ventas sin catálogo: no aplica en posib.
    if (/del sistema siigo/i.test(name)) continue;
    if (!name) {
      warnings.push({ row: rowNumber, reason: `Código ${code} sin nombre — se omite` });
      continue;
    }
    if (code && seenCodes.has(code)) {
      warnings.push({ row: rowNumber, reason: `Código ${code} repetido — se omite "${name}" (queda el primero)` });
      continue;
    }
    if (code) seenCodes.add(code);

    const tax1 = cellText(get(row, "tax1"));
    const tax2 = cellText(get(row, "tax2"));
    // Otros sistemas traen solo el número ("19"): se arma la etiqueta "IVA 19%" / "INC 8%".
    const labelFor = (raw: string, kind: string) => {
      if (!raw) return "";
      if (!/^\d+(?:[.,]\d+)?$/.test(raw)) return raw;
      const rate = parseTaxRate(raw);
      return rate > 0 ? `${kind} ${rate}%` : "";
    };
    const taxLabel = [labelFor(tax1, "IVA"), labelFor(tax2, "INC")].filter(Boolean).join(" + ") || null;
    const type = cellText(get(row, "type")) || "Producto";
    const status = normalize(cellText(get(row, "status")));
    const visibleRaw = cellText(get(row, "visible"));
    const balanceRaw = cellText(get(row, "balance"));
    const inventoriableRaw = cellText(get(row, "inventoriable"));

    const product: SiigoProductRow = {
      row: rowNumber,
      type,
      code,
      name,
      factoryReference: cellText(get(row, "factoryReference")) || null,
      category: cellText(get(row, "category")) || null,
      active:
        (!status || status === "activo" || isYes(status)) && (!visibleRaw || isYes(visibleRaw)),
      taxLabel,
      taxRate: parseTaxRate(tax1) + parseTaxRate(tax2),
      description: cellText(get(row, "description")) || null,
      taxIncluded: isYes(get(row, "taxIncluded")),
      inventoriable:
        normalize(type) !== "servicio" && (!inventoriableRaw || isYes(inventoriableRaw)),
      balance: balanceRaw === "" ? null : cellNumber(get(row, "balance")),
      minStock: Math.max(0, cellNumber(get(row, "minStock"))),
      price1: cellNumber(get(row, "price1")),
      price2: cellNumber(get(row, "price2")),
      cost: Math.max(0, cellNumber(get(row, "cost"))),
    };

    if (product.price1 <= 0 && product.price2 <= 0) {
      warnings.push({ row: rowNumber, reason: `"${name}" no tiene precio de venta — entra en $0` });
    }
    products.push(product);
  }

  return { products, warnings, businessName, nit };
}

type PriceOptions = Pick<ToImportOptions, "addTaxToPrice" | "fixThousands">;

function adjustPrice(value: number, p: SiigoProductRow, opts: PriceOptions): number {
  let price = opts.fixThousands && value > 0 && value < THOUSANDS_THRESHOLD ? value * 1000 : value;
  if (opts.addTaxToPrice && p.taxRate > 0 && !p.taxIncluded) {
    price = Math.round(price * (1 + p.taxRate / 100));
  }
  // Sin redondear a pesos: un 3,5 de Siigo debe llegar como 3,5 (= $3.500) para que el tendero lo entienda.
  return Math.round(price * 100) / 100;
}

/** Precio final (con impuesto) que se guardará en posib. */
export function finalSalePrice(p: SiigoProductRow, opts: PriceOptions): number {
  return adjustPrice(p.price1 > 0 ? p.price1 : p.price2, p, opts);
}

/** Convierte las filas de Siigo al formato de POST /api/products/import. */
export function toImportRows(products: SiigoProductRow[], opts: ToImportOptions): ImportProductRow[] {
  return products.map((p) => {
    const price2 = p.price1 > 0 && p.price2 > 0 ? p.price2 : 0;
    return {
      barcode: p.code || null,
      name: p.name,
      description: p.description,
      category_name: p.category,
      sale_price: finalSalePrice(p, opts),
      sale_price_2: price2 ? adjustPrice(price2, p, opts) : null,
      cost_price: p.cost,
      stock: Math.max(0, p.balance ?? 0),
      min_stock: p.minStock,
      tax_rate: p.taxRate,
      tax_label: p.taxLabel,
      factory_reference: p.factoryReference,
      track_inventory: opts.noInventory ? false : p.inventoriable,
      is_active: p.active,
    };
  });
}
