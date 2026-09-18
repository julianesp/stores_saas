/**
 * Parser de importación de facturas de venta desde Siigo.
 *
 * Siigo (software contable colombiano) exporta las ventas como un reporte
 * Excel/CSV donde CADA FILA es una LÍNEA de factura (un producto), no una
 * factura completa. Varias filas con el mismo número de documento pertenecen
 * a la misma factura. Este módulo:
 *
 *   1. Lee el archivo (.xlsx / .csv) con ExcelJS.
 *   2. Detecta la fila de encabezados y mapea columnas de Siigo -> campos posib,
 *      tolerando variaciones de nombre/mayúsculas/acentos (Siigo cambia los
 *      encabezados según el reporte: "Ventas", "Documentos", "Detalle de ventas").
 *   3. Agrupa las líneas por número de documento en facturas completas.
 *   4. Normaliza al modelo POS de posib (subtotal, tax, discount, total,
 *      payment_method, items[]), listo para POST /api/sales/import.
 *
 * Nota de alcance: son ventas HISTÓRICAS. No se descuenta stock y las
 * retenciones (ReteFuente/ReteIVA/ReteICA) de Siigo se ignoran porque el modelo
 * POS de posib no las representa; solo se conserva el IVA/INC como `tax`.
 */

async function loadExcelJS() {
  return (await import("exceljs")).default;
}

// ---- Modelo normalizado que consume el backend ----

export interface SiigoImportItem {
  /** Código del producto en Siigo (se usa como barcode/clave de match). */
  code: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  /** IVA + INC de la línea, en pesos. */
  tax: number;
  subtotal: number; // quantity * unit_price - discount (sin impuesto)
}

export interface SiigoImportInvoice {
  /** Consecutivo/número de documento de Siigo (ej. "FV-1-1234"). Clave de dedupe. */
  document_number: string;
  date: string | null; // ISO yyyy-mm-dd
  customer_id_number: string | null; // NIT / CC del tercero
  customer_name: string | null;
  payment_method: PosibPaymentMethod;
  notes: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  items: SiigoImportItem[];
}

export type PosibPaymentMethod =
  | "efectivo"
  | "nequi"
  | "daviplata"
  | "tarjeta"
  | "transferencia"
  | "credito";

export interface SiigoParseResult {
  invoices: SiigoImportInvoice[];
  /** Filas que no se pudieron interpretar (número de fila + motivo). */
  warnings: Array<{ row: number; reason: string }>;
  /** Columnas del encabezado que sí se reconocieron, para depurar el mapeo. */
  detectedColumns: Record<string, string>;
}

// ---- Diccionario de sinónimos de columnas (Siigo varía los encabezados) ----
// Las claves son campos internos; los valores son fragmentos que buscamos en el
// encabezado ya normalizado (sin acentos, minúsculas, sin espacios extra).
const COLUMN_SYNONYMS: Record<string, string[]> = {
  document_number: [
    "numero documento",
    "no documento",
    "nro documento",
    "num documento",
    "documento",
    "comprobante",
    "factura",
    "consecutivo",
  ],
  prefix: ["prefijo"],
  date: ["fecha elaboracion", "fecha documento", "fecha", "fecha de venta"],
  customer_id_number: [
    "identificacion",
    "nit",
    "nit/cc",
    "cedula",
    "documento tercero",
    "identificacion tercero",
  ],
  customer_name: [
    "nombre tercero",
    "razon social",
    "cliente",
    "tercero",
    "nombre cliente",
    "nombre del tercero",
  ],
  payment_method: [
    "forma de pago",
    "forma pago",
    "medio de pago",
    "medio pago",
    "metodo de pago",
    "tipo de pago",
  ],
  product_code: [
    "codigo producto",
    "codigo del producto",
    "codigo",
    "referencia",
    "cod producto",
    "item",
  ],
  product_name: [
    "nombre producto",
    "descripcion producto",
    "producto",
    "descripcion",
    "detalle",
    "nombre del producto",
  ],
  quantity: ["cantidad", "cant", "unidades"],
  unit_price: [
    "valor unitario",
    "precio unitario",
    "vr unitario",
    "precio",
    "valor unit",
  ],
  discount: ["descuento", "dcto", "valor descuento", "% descuento"],
  tax: ["iva", "valor iva", "impuesto", "inc", "impoconsumo"],
  line_total: [
    "valor total",
    "total linea",
    "total item",
    "subtotal",
    "vr total",
    "total",
  ],
  notes: ["observaciones", "nota", "notas", "observacion"],
};

/** Normaliza texto: minúsculas, sin acentos, colapsa espacios, sin puntuación. */
function normalize(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9\s%/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Convierte un valor de celda a número, tolerando "$", ".", "," y formato COP. */
function toNumber(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value;
  let s = value.toString().trim().replace(/\$/g, "").replace(/\s/g, "");
  if (s === "") return 0;
  // Formato colombiano: miles con "." y decimales con "," (ej. "1.234.567,89").
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // Solo coma -> decimal
    s = s.replace(",", ".");
  }
  // Si solo hay puntos, los tratamos como separador de miles cuando parecen
  // grupos de 3 (evita convertir "12.5" mal); si es un único punto con <=2
  // decimales lo dejamos como decimal.
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Convierte fechas de Siigo (Date de ExcelJS, "dd/mm/yyyy" o "yyyy-mm-dd") a ISO. */
function toISODate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  const s = value.toString().trim();
  // dd/mm/yyyy o dd-mm-yyyy
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // yyyy-mm-dd
  const ymd = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

/**
 * Mapea la forma de pago de Siigo al enum de posib.
 * Siigo suele traer texto libre ("Contado", "Crédito", "Transferencia",
 * "Efectivo", "Tarjeta", "Nequi"...). "Contado" sin más detalle -> efectivo.
 */
function mapPaymentMethod(raw: unknown): PosibPaymentMethod {
  const s = normalize(raw?.toString() ?? "");
  if (!s) return "efectivo";
  if (s.includes("credito") || s.includes("credit")) return "credito";
  if (s.includes("nequi")) return "nequi";
  if (s.includes("daviplata")) return "daviplata";
  if (s.includes("tarjeta") || s.includes("debito") || s.includes("credit card"))
    return "tarjeta";
  if (
    s.includes("transferencia") ||
    s.includes("consignacion") ||
    s.includes("pse") ||
    s.includes("banco")
  )
    return "transferencia";
  // "Contado", "Efectivo", "Caja" -> efectivo
  return "efectivo";
}

/** Detecta la fila de encabezado y construye el mapa columna -> índice (0-based). */
function detectHeader(
  rows: unknown[][],
): { headerRow: number; columnMap: Record<string, number>; detected: Record<string, string> } | null {
  // Busca en las primeras 15 filas la que reconozca más columnas.
  const maxScan = Math.min(rows.length, 15);
  let best: {
    headerRow: number;
    columnMap: Record<string, number>;
    detected: Record<string, string>;
    score: number;
  } | null = null;

  for (let r = 0; r < maxScan; r++) {
    const row = rows[r] ?? [];
    const columnMap: Record<string, number> = {};
    const detected: Record<string, string> = {};
    for (let c = 0; c < row.length; c++) {
      const header = normalize(row[c]?.toString() ?? "");
      if (!header) continue;
      for (const [field, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
        if (columnMap[field] != null) continue; // primera coincidencia gana
        // Coincidencia exacta primero, luego "empieza por" / "incluye".
        const match = synonyms.find(
          (syn) => header === syn || header.startsWith(syn) || header.includes(syn),
        );
        if (match) {
          columnMap[field] = c;
          detected[field] = row[c]?.toString() ?? "";
        }
      }
    }
    // Necesitamos al menos documento + (producto o nombre) para considerarla válida.
    const score = Object.keys(columnMap).length;
    const usable =
      columnMap.document_number != null &&
      (columnMap.product_name != null || columnMap.product_code != null);
    if (usable && (!best || score > best.score)) {
      best = { headerRow: r, columnMap, detected, score };
    }
  }
  return best;
}

/** Lee el archivo a una matriz de filas (array de arrays). */
async function readWorkbookRows(file: ArrayBuffer, isCsv: boolean): Promise<unknown[][]> {
  const ExcelJSLib = await loadExcelJS();
  const workbook = new ExcelJSLib.Workbook();
  if (isCsv) {
    // ExcelJS.csv.read acepta un stream; usamos un Blob->text y parseo simple.
    const text = new TextDecoder("utf-8").decode(file);
    return parseCsv(text);
  }
  await workbook.xlsx.load(file);
  const sheet = workbook.worksheets[0];
  const rows: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as unknown[]; // index 0 es null en ExcelJS
    rows.push(values.slice(1));
  });
  return rows;
}

/** Parser CSV mínimo con soporte de comillas y separador coma o punto y coma. */
function parseCsv(text: string): unknown[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
  const rows: unknown[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // ignora, el \n cierra la fila
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Punto de entrada: parsea un archivo de Siigo y devuelve facturas normalizadas.
 * @param file  Contenido del archivo (ArrayBuffer).
 * @param filename  Nombre del archivo (para detectar .csv vs .xlsx).
 */
export async function parseSiigoFile(
  file: ArrayBuffer,
  filename: string,
): Promise<SiigoParseResult> {
  const isCsv = /\.csv$/i.test(filename);
  const rows = await readWorkbookRows(file, isCsv);
  const warnings: SiigoParseResult["warnings"] = [];

  const header = detectHeader(rows);
  if (!header) {
    throw new Error(
      "No se reconoció el formato del archivo de Siigo. Verifica que contenga columnas de número de documento y producto.",
    );
  }

  const { headerRow, columnMap, detected } = header;
  const get = (row: unknown[], field: string): unknown =>
    columnMap[field] != null ? row[columnMap[field]] : undefined;

  // Agrupamos líneas por número de documento.
  const byDocument = new Map<string, SiigoImportInvoice>();

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const rawDoc = get(row, "document_number");
    const docNumber = rawDoc?.toString().trim();
    const productName = get(row, "product_name")?.toString().trim();
    const productCode = get(row, "product_code")?.toString().trim();

    // Fila vacía o sin datos útiles -> se ignora silenciosamente.
    if (!docNumber && !productName && !productCode) continue;
    if (!docNumber) {
      warnings.push({ row: r + 1, reason: "Sin número de documento" });
      continue;
    }
    if (!productName && !productCode) {
      warnings.push({ row: r + 1, reason: `Documento ${docNumber} sin producto` });
      continue;
    }

    const prefix = get(row, "prefix")?.toString().trim();
    const documentKey = prefix ? `${prefix}-${docNumber}` : docNumber;

    const quantity = toNumber(get(row, "quantity")) || 1;
    const unitPrice = toNumber(get(row, "unit_price"));
    const discount = toNumber(get(row, "discount"));
    const tax = toNumber(get(row, "tax"));
    // subtotal de línea = base gravable (sin impuesto). Si Siigo trae "valor
    // total" con impuesto incluido lo reconstruimos restando el IVA.
    let lineSubtotal = quantity * unitPrice - discount;
    const lineTotalRaw = toNumber(get(row, "line_total"));
    if (unitPrice === 0 && lineTotalRaw > 0) {
      // Solo tenemos el total de línea: lo usamos como base menos impuesto.
      lineSubtotal = lineTotalRaw - tax;
    }
    if (lineSubtotal < 0) lineSubtotal = 0;

    const item: SiigoImportItem = {
      code: productCode || null,
      name: productName || productCode || "Producto sin nombre",
      quantity,
      unit_price: unitPrice || (quantity ? lineSubtotal / quantity : 0),
      discount,
      tax,
      subtotal: lineSubtotal,
    };

    let invoice = byDocument.get(documentKey);
    if (!invoice) {
      invoice = {
        document_number: documentKey,
        date: toISODate(get(row, "date")),
        customer_id_number: get(row, "customer_id_number")?.toString().trim() || null,
        customer_name: get(row, "customer_name")?.toString().trim() || null,
        payment_method: mapPaymentMethod(get(row, "payment_method")),
        notes: get(row, "notes")?.toString().trim() || null,
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        items: [],
      };
      byDocument.set(documentKey, invoice);
    }

    invoice.items.push(item);
    invoice.subtotal += item.subtotal;
    invoice.tax += item.tax;
    invoice.discount += item.discount;
    invoice.total += item.subtotal + item.tax;
  }

  // Redondeo defensivo a 2 decimales para evitar arrastre de flotantes.
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const invoices = Array.from(byDocument.values()).map((inv) => ({
    ...inv,
    subtotal: round2(inv.subtotal),
    tax: round2(inv.tax),
    discount: round2(inv.discount),
    total: round2(inv.total),
    items: inv.items.map((it) => ({
      ...it,
      unit_price: round2(it.unit_price),
      discount: round2(it.discount),
      tax: round2(it.tax),
      subtotal: round2(it.subtotal),
    })),
  }));

  if (invoices.length === 0) {
    warnings.push({ row: headerRow + 1, reason: "No se encontró ninguna factura con datos" });
  }

  return { invoices, warnings, detectedColumns: detected };
}
