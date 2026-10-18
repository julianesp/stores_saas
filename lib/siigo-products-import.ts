/**
 * Parser del "Listado de productos / Servicios" exportado desde Siigo.
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
}

// Encabezados ya normalizados (sin acentos, minúsculas) -> campo interno.
const HEADERS: Record<string, string[]> = {
  type: ["tipo"],
  code: ["codigo", "codigo producto", "cod"],
  name: ["nombre", "nombre producto", "descripcion"],
  factoryReference: ["referencia fabrica", "referencia de fabrica", "referencia"],
  category: ["categoria", "linea", "grupo"],
  status: ["estado"],
  tax1: ["impuesto cargo", "impuesto cargo 1", "impuesto"],
  tax2: ["impuesto cargo 2"],
  description: ["descripcion larga"],
  taxIncluded: ["es incluido", "iva incluido", "impuesto incluido"],
  inventoriable: ["inventariable"],
  balance: ["saldo cantidades", "saldo", "existencias", "cantidad"],
  visible: ["visible en facturas de venta", "visible en facturas"],
  minStock: ["stock minimo"],
  price1: ["precio de venta 1", "precio venta 1", "precio de venta", "precio"],
  price2: ["precio de venta 2", "precio venta 2"],
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

/** "IVA 19%" -> 19 ; "INC 8 %" -> 8 ; "Excluido" -> 0 */
function parseTaxRate(label: string): number {
  const m = label.match(/(\d+(?:[.,]\d+)?)\s*%/);
  return m ? parseFloat(m[1].replace(",", ".")) : 0;
}

function detectHeader(rows: unknown[][]): { headerRow: number; columns: Record<string, number> } | null {
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const row = rows[r] ?? [];
    const columns: Record<string, number> = {};
    for (let c = 0; c < row.length; c++) {
      const header = normalize(cellText(row[c]));
      if (!header) continue;
      // Coincidencia exacta: "impuesto cargo" y "impuesto cargo 2" son columnas distintas.
      for (const [field, names] of Object.entries(HEADERS)) {
        if (columns[field] == null && names.includes(header)) columns[field] = c;
      }
    }
    if (columns.code != null && columns.name != null) return { headerRow: r, columns };
  }
  return null;
}

export async function parseSiigoProductsFile(file: File): Promise<SiigoProductsParseResult> {
  const isCsv = /\.csv$/i.test(file.name);
  const rows = await readWorkbookRows(await file.arrayBuffer(), isCsv);

  const header = detectHeader(rows);
  if (!header) {
    throw new Error(
      'No se encontraron las columnas "Código" y "Nombre". ¿Es el "Listado de productos / Servicios" de Siigo?',
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
    const code = cellText(get(row, "code"));
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
      warnings.push({ row: rowNumber, reason: `Código ${code} repetido — se omite "${name}"` });
      continue;
    }
    if (code) seenCodes.add(code);

    const tax1 = cellText(get(row, "tax1"));
    const tax2 = cellText(get(row, "tax2"));
    const taxLabel = [tax1, tax2].filter(Boolean).join(" + ") || null;
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
      active: (!status || status === "activo") && (!visibleRaw || isYes(visibleRaw)),
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
    };

    if (product.price1 <= 0 && product.price2 <= 0) {
      warnings.push({ row: rowNumber, reason: `"${name}" no tiene precio de venta — entra en $0` });
    }
    products.push(product);
  }

  return { products, warnings, businessName, nit };
}

/** Precio final (con impuesto) que se guardará en posib. */
export function finalSalePrice(p: SiigoProductRow, addTaxToPrice: boolean): number {
  const base = p.price1 > 0 ? p.price1 : p.price2;
  if (addTaxToPrice && p.taxRate > 0 && !p.taxIncluded) {
    return Math.round(base * (1 + p.taxRate / 100));
  }
  return base;
}

/** Convierte las filas de Siigo al formato de POST /api/products/import. */
export function toImportRows(products: SiigoProductRow[], opts: ToImportOptions): ImportProductRow[] {
  return products.map((p) => {
    const addTax = opts.addTaxToPrice && p.taxRate > 0 && !p.taxIncluded;
    const price2 = p.price1 > 0 && p.price2 > 0 ? p.price2 : 0;
    return {
      barcode: p.code || null,
      name: p.name,
      description: p.description,
      category_name: p.category,
      sale_price: finalSalePrice(p, opts.addTaxToPrice),
      sale_price_2: price2 ? (addTax ? Math.round(price2 * (1 + p.taxRate / 100)) : price2) : null,
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
