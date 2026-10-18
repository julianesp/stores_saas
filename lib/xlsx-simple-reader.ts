/**
 * Lector mínimo de .xlsx, sin dependencias, para archivos que ExcelJS no abre.
 *
 * Siigo exporta xlsx "no estándar": etiquetas con prefijo (`<x:row>`), rutas
 * absolutas en las relaciones (`/xl/worksheets/sheet1.xml`) y celdas sin
 * referencia de columna (`<x:c t="str">` sin `r="B3"`). ExcelJS 3.x revienta con
 * ellos ("Cannot set properties of undefined (setting 'sheetNo')").
 *
 * Solo lee la PRIMERA hoja y devuelve sus filas como texto/número. Usa
 * DecompressionStream (navegador y Node 18+) para descomprimir el zip.
 */

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  localOffset: number;
}

function listZipEntries(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // End Of Central Directory: se busca desde el final (puede haber comentario).
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("El archivo no es un .xlsx válido");

  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    entries.push({
      method: view.getUint16(p + 10, true),
      compressedSize: view.getUint32(p + 20, true),
      localOffset: view.getUint32(p + 42, true),
      name: decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen)),
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readZipEntry(bytes: Uint8Array, entry: ZipEntry): Promise<string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const o = entry.localOffset;
  const start = o + 30 + view.getUint16(o + 26, true) + view.getUint16(o + 28, true);
  const data = bytes.slice(start, start + entry.compressedSize);
  if (entry.method === 0) return new TextDecoder().decode(data);
  if (entry.method !== 8) throw new Error(`Compresión zip no soportada (${entry.method})`);
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

/** Texto de todos los <t> dentro de un fragmento (strings compartidos / inline). */
function textNodes(xml: string): string {
  let out = "";
  for (const m of xml.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)) out += m[1];
  return decodeXml(out);
}

/** "B" -> 1, "AA" -> 26 */
function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/i)?.[0].toUpperCase() ?? "";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export async function readXlsxRowsSimple(file: ArrayBuffer): Promise<unknown[][]> {
  const bytes = new Uint8Array(file);
  const entries = listZipEntries(bytes);
  const byName = new Map(entries.map((e) => [e.name.replace(/^\//, ""), e]));

  // Primera hoja: la que apunta el workbook; si no se puede resolver, la primera que exista.
  let sheetPath: string | undefined;
  const wb = byName.get("xl/workbook.xml");
  const rels = byName.get("xl/_rels/workbook.xml.rels");
  if (wb && rels) {
    const wbXml = await readZipEntry(bytes, wb);
    const relsXml = await readZipEntry(bytes, rels);
    const rid = wbXml.match(/<(?:\w+:)?sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
    const rel = [...relsXml.matchAll(/<Relationship\b[^>]*>/g)]
      .map((m) => m[0])
      .find((tag) => rid && tag.includes(`Id="${rid}"`));
    const target = rel?.match(/Target="([^"]+)"/)?.[1];
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  }
  if (!sheetPath || !byName.has(sheetPath)) {
    sheetPath = [...byName.keys()].filter((n) => /^xl\/worksheets\/[^/]+\.xml$/.test(n)).sort()[0];
  }
  if (!sheetPath) throw new Error("El archivo no tiene hojas");

  const shared: string[] = [];
  const sst = byName.get("xl/sharedStrings.xml");
  if (sst) {
    const xml = await readZipEntry(bytes, sst);
    for (const m of xml.matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g)) shared.push(textNodes(m[1]));
  }

  const sheetXml = await readZipEntry(bytes, byName.get(sheetPath)!);
  const rows: unknown[][] = [];
  const rowRe = /<(?:\w+:)?row\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g;
  const cellRe = /<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g;
  for (const rowMatch of sheetXml.matchAll(rowRe)) {
    const row: unknown[] = [];
    let col = 0;
    for (const cell of (rowMatch[1] ?? "").matchAll(cellRe)) {
      const attrs = cell[1];
      const inner = cell[2] ?? "";
      const ref = attrs.match(/\br="([A-Z]+)\d*"/i)?.[1];
      if (ref) col = columnIndex(ref);
      const type = attrs.match(/\bt="([^"]+)"/)?.[1] ?? "n";
      const raw = inner.match(/<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1];
      let value: unknown = null;
      if (type === "s") value = raw != null ? shared[Number(raw)] ?? null : null;
      else if (type === "inlineStr") value = textNodes(inner);
      else if (type === "b") value = raw === "1";
      else if (raw != null && raw !== "") {
        const text = decodeXml(raw);
        value = type === "n" && Number.isFinite(Number(text)) ? Number(text) : text;
      }
      row[col] = value === "" ? null : value;
      col++;
    }
    rows.push(row);
  }
  return rows;
}
