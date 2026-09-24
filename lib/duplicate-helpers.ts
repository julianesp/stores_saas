/**
 * Detección de productos repetidos (duplicados)
 *
 * El tendero suele terminar con el mismo producto cargado varias veces
 * (por ejemplo al escanear un código dos veces, o al escribir el nombre con
 * variaciones). Esto genera "productos sueltos" que dispersan el stock y
 * ensucian el inventario. Aquí agrupamos los candidatos a repetidos para que
 * el tendero pueda revisarlos y fusionarlos.
 *
 * Criterios de detección (ver `DuplicateReason`):
 *  - `barcode`: mismo código de barras (el más confiable, sin falsos positivos).
 *  - `name`: nombre igual o muy parecido (normalizando mayúsculas/tildes/espacios).
 *  - `name_category`: nombre parecido + misma categoría (más estricto).
 *
 * Un grupo puede cumplir varios criterios a la vez; se reportan todos.
 */

import { ProductWithRelations } from './types';

export type DuplicateReason = 'barcode' | 'name' | 'name_category';

export interface DuplicateGroup {
  /** Clave única del grupo (para keys de React) */
  key: string;
  /** Motivos por los que estos productos se consideran repetidos */
  reasons: DuplicateReason[];
  /** Etiqueta legible del grupo (nombre o código representativo) */
  label: string;
  /** Los productos que forman el grupo (2 o más) */
  products: ProductWithRelations[];
}

/**
 * Normaliza un nombre para comparar: minúsculas, sin tildes, sin signos de
 * puntuación y colapsando espacios. Así "Coca-Cola 350ml" y "coca cola 350 ml"
 * se consideran el mismo nombre base.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar tildes/diacríticos
    .replace(/[^a-z0-9\s]/g, ' ') // signos de puntuación -> espacio
    // Separar números pegados a letras para que "350ml" == "350 ml"
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normaliza un código de barras (quita espacios y ceros a la izquierda irrelevantes). */
function normalizeBarcode(barcode?: string): string {
  return (barcode || '').trim();
}

/**
 * Combina grupos que comparten productos. La detección corre por varios
 * criterios y un mismo producto puede caer en más de un grupo; los unimos
 * para que el tendero vea un solo grupo consolidado por conjunto de productos.
 */
function mergeOverlappingGroups(
  rawGroups: { reason: DuplicateReason; products: ProductWithRelations[] }[]
): DuplicateGroup[] {
  // Union-Find sencillo por id de producto
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) && parent.get(root) !== root) {
      root = parent.get(root)!;
    }
    // path compression
    let cur = x;
    while (parent.get(cur) && parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    parent.set(find(a), find(b));
  };

  const productById = new Map<string, ProductWithRelations>();
  for (const g of rawGroups) {
    for (const p of g.products) {
      if (!parent.has(p.id)) parent.set(p.id, p.id);
      productById.set(p.id, p);
    }
    // Unir todos los productos del grupo entre sí
    for (let i = 1; i < g.products.length; i++) {
      union(g.products[0].id, g.products[i].id);
    }
  }

  // Agrupar por raíz y acumular motivos
  const byRoot = new Map<string, { products: Set<string>; reasons: Set<DuplicateReason> }>();
  for (const g of rawGroups) {
    const root = find(g.products[0].id);
    if (!byRoot.has(root)) {
      byRoot.set(root, { products: new Set(), reasons: new Set() });
    }
    const entry = byRoot.get(root)!;
    entry.reasons.add(g.reason);
    for (const p of g.products) entry.products.add(p.id);
  }

  const result: DuplicateGroup[] = [];
  for (const [root, entry] of byRoot) {
    const products = Array.from(entry.products)
      .map(id => productById.get(id)!)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (products.length < 2) continue;

    // Etiqueta representativa: el código de barras común, o el nombre más corto
    const commonBarcode = products.every(
      p => normalizeBarcode(p.barcode) && normalizeBarcode(p.barcode) === normalizeBarcode(products[0].barcode)
    )
      ? normalizeBarcode(products[0].barcode)
      : '';
    const label = commonBarcode
      ? `${products[0].name} · ${commonBarcode}`
      : products[0].name;

    result.push({
      key: root,
      reasons: Array.from(entry.reasons),
      label,
      products,
    });
  }

  // Ordenar: primero los grupos con más productos (más impacto al limpiar)
  result.sort((a, b) => b.products.length - a.products.length);
  return result;
}

export interface FindDuplicatesOptions {
  byBarcode?: boolean;
  byName?: boolean;
  byNameCategory?: boolean;
}

/**
 * Encuentra grupos de productos repetidos según los criterios habilitados.
 * Por defecto usa los tres criterios.
 */
export function findDuplicateGroups(
  products: ProductWithRelations[],
  options: FindDuplicatesOptions = {}
): DuplicateGroup[] {
  const { byBarcode = true, byName = true, byNameCategory = true } = options;

  const rawGroups: { reason: DuplicateReason; products: ProductWithRelations[] }[] = [];

  // 1) Por código de barras (ignorando productos sin código)
  if (byBarcode) {
    const byCode = new Map<string, ProductWithRelations[]>();
    for (const p of products) {
      const code = normalizeBarcode(p.barcode);
      if (!code) continue;
      if (!byCode.has(code)) byCode.set(code, []);
      byCode.get(code)!.push(p);
    }
    for (const group of byCode.values()) {
      if (group.length > 1) rawGroups.push({ reason: 'barcode', products: group });
    }
  }

  // 2) Por nombre normalizado
  if (byName) {
    const byNorm = new Map<string, ProductWithRelations[]>();
    for (const p of products) {
      const norm = normalizeName(p.name);
      if (!norm) continue;
      if (!byNorm.has(norm)) byNorm.set(norm, []);
      byNorm.get(norm)!.push(p);
    }
    for (const group of byNorm.values()) {
      if (group.length > 1) rawGroups.push({ reason: 'name', products: group });
    }
  }

  // 3) Por nombre normalizado + categoría (más estricto)
  if (byNameCategory) {
    const byNameCat = new Map<string, ProductWithRelations[]>();
    for (const p of products) {
      const norm = normalizeName(p.name);
      if (!norm) continue;
      const key = `${norm}::${p.category_id || 'sin-categoria'}`;
      if (!byNameCat.has(key)) byNameCat.set(key, []);
      byNameCat.get(key)!.push(p);
    }
    for (const group of byNameCat.values()) {
      if (group.length > 1) rawGroups.push({ reason: 'name_category', products: group });
    }
  }

  return mergeOverlappingGroups(rawGroups);
}

/** Etiqueta legible para cada motivo (para la UI). */
export function reasonLabel(reason: DuplicateReason): string {
  switch (reason) {
    case 'barcode':
      return 'Mismo código de barras';
    case 'name':
      return 'Nombre igual o parecido';
    case 'name_category':
      return 'Mismo nombre y categoría';
  }
}
