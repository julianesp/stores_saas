"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  Upload,
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  parseSiigoProductsFile,
  finalSalePrice,
  looksLikeThousands,
  toImportRows,
  type SiigoProductsParseResult,
} from "@/lib/siigo-products-import";
import { importProducts, type ImportProductsResult } from "@/lib/cloudflare-api";

// Tandas pequeñas: el Worker tiene poco tiempo de CPU por petición.
const BATCH_SIZE = 250;

export default function ImportProductsPage() {
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<SiigoProductsParseResult | null>(null);
  const [noInventory, setNoInventory] = useState(false);
  const [addTaxToPrice, setAddTaxToPrice] = useState(true);
  const [fixThousands, setFixThousands] = useState(false);
  const priceOpts = { addTaxToPrice, fixThousands };
  const [updateExisting, setUpdateExisting] = useState(false);
  const [search, setSearch] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ImportProductsResult | null>(null);

  const products = useMemo(() => parsed?.products ?? [], [parsed]);

  const stats = useMemo(() => {
    const withTax = products.filter((p) => p.taxRate > 0);
    return {
      categories: new Set(products.map((p) => p.category).filter(Boolean)).size,
      withTax,
      taxNotIncluded: withTax.filter((p) => !p.taxIncluded),
      withStock: products.filter((p) => (p.balance ?? 0) > 0).length,
      inactive: products.filter((p) => !p.active).length,
      withPrice2: products.filter((p) => p.price1 > 0 && p.price2 > 0).length,
      notInventoriable: products.filter((p) => !p.inventoriable).length,
      inThousands: products.filter(looksLikeThousands),
    };
  }, [products]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            (p.category ?? "").toLowerCase().includes(q),
        )
      : products;
    return list.slice(0, 100);
  }, [products, search]);

  const reset = () => {
    setParsed(null);
    setResult(null);
    setProgress(null);
    setSearch("");
  };

  const handleFile = async (file: File) => {
    reset();
    setFileName(file.name);
    setParsing(true);
    try {
      const res = await parseSiigoProductsFile(file);
      setParsed(res);
      // Si casi nada tiene saldo positivo, el negocio no lleva inventario en Siigo.
      const withStock = res.products.filter((p) => (p.balance ?? 0) > 0).length;
      setNoInventory(res.products.length > 0 && withStock / res.products.length < 0.2);
      if (res.products.length === 0) {
        toast.error("No se encontraron productos en el archivo.");
      } else {
        toast.success(`Se reconocieron ${res.products.length} productos. Revisa antes de importar.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al leer el archivo.");
      setFileName(null);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (products.length === 0) return;
    const rows = toImportRows(products, { addTaxToPrice, noInventory, fixThousands });
    const total: ImportProductsResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      categoriesCreated: 0,
      errors: [],
    };
    setProgress({ done: 0, total: rows.length });
    try {
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const res = await importProducts(rows.slice(i, i + BATCH_SIZE), updateExisting, getToken);
        total.created += res.created;
        total.updated += res.updated;
        total.skipped += res.skipped;
        total.categoriesCreated += res.categoriesCreated;
        total.errors.push(...res.errors);
        setProgress({ done: Math.min(i + BATCH_SIZE, rows.length), total: rows.length });
      }
      setResult(total);
      toast.success(`Listo: ${total.created} productos creados.`);
    } catch (err) {
      // Lo ya importado queda guardado; al reintentar se omiten (mismo código).
      setResult(total);
      toast.error(
        `${err instanceof Error ? err.message : "Error al importar"}. ` +
          "Puedes volver a importar el archivo: los productos ya creados se omiten.",
      );
    } finally {
      setProgress(null);
    }
  };

  const importing = progress !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Importar productos desde Siigo</h1>
          <p className="text-sm text-muted-foreground">
            Sube el &quot;Listado de productos / Servicios&quot; exportado desde Siigo (.xlsx). Se
            pasan códigos, nombres, categorías, precios, IVA y stock.
          </p>
        </div>
      </div>

      {/* Zona de carga */}
      <Card>
        <CardContent className="pt-6">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => !importing && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file && !importing) handleFile(file);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            {parsing ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p>Leyendo archivo…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="font-medium break-all">
                  {fileName ?? "Haz clic o arrastra el archivo de Siigo aquí"}
                </p>
                <p className="text-xs text-muted-foreground">
                  En Siigo: Inventario → Productos → Exportar a Excel
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {parsed && products.length > 0 && !result && (
        <>
          {/* Resumen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {parsed.businessName ?? "Catálogo de Siigo"}
                {parsed.nit && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    NIT {parsed.nit}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Productos" value={products.length} />
                <Stat label="Categorías" value={stats.categories} />
                <Stat label="Con IVA" value={stats.withTax.length} />
                <Stat label="Con stock en Siigo" value={stats.withStock} />
              </div>
              {(stats.inactive > 0 || stats.withPrice2 > 0 || stats.notInventoriable > 0) && (
                <p className="text-xs text-muted-foreground mt-3">
                  {stats.inactive > 0 && `${stats.inactive} inactivo(s) (no saldrán en la caja). `}
                  {stats.withPrice2 > 0 && `${stats.withPrice2} con segundo precio de venta. `}
                  {stats.notInventoriable > 0 &&
                    `${stats.notInventoriable} marcado(s) "no inventariable" en Siigo.`}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Opciones */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Antes de importar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Option
                checked={noInventory}
                onChange={setNoInventory}
                title="Vender sin controlar inventario"
                detail={
                  `Solo ${stats.withStock} de ${products.length} productos tienen unidades en Siigo. ` +
                  "Con esta opción todos se pueden vender en la caja aunque no tengan stock cargado. " +
                  "Luego puedes activar el control de inventario producto por producto."
                }
              />
              {stats.inThousands.length > 0 && (
                <div>
                  <Option
                    checked={fixThousands}
                    onChange={setFixThousands}
                    title={`${stats.inThousands.length} precio(s) parecen estar escritos en miles`}
                    detail={
                      "En Siigo estos productos valen menos de $100 (ej. 2 en vez de 2.000). " +
                      "Sin marcar, se importan tal cual y el tendero los revisa en Productos → \"Precios por revisar\". " +
                      "Marcado, se multiplican por 1.000 al importar."
                    }
                  />
                  <ul className="mt-2 ml-7 text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
                    {stats.inThousands.slice(0, 50).map((p) => (
                      <li key={p.row}>
                        {p.name}: {(p.price1 || p.price2).toLocaleString("es-CO")}
                        {fixThousands && (
                          <>
                            {" → "}
                            <span className="font-medium text-foreground">
                              {formatCurrency(finalSalePrice(p, priceOpts))}
                            </span>
                          </>
                        )}
                      </li>
                    ))}
                    {stats.inThousands.length > 50 && (
                      <li>…y {stats.inThousands.length - 50} más.</li>
                    )}
                  </ul>
                </div>
              )}
              {stats.taxNotIncluded.length > 0 && (
                <div>
                  <Option
                    checked={addTaxToPrice}
                    onChange={setAddTaxToPrice}
                    title={`Sumar el IVA al precio de ${stats.taxNotIncluded.length} producto(s)`}
                    detail={
                      'En Siigo estos productos tienen el IVA "no incluido": Siigo lo suma al facturar. ' +
                      "En posib el precio de venta es el que paga el cliente, con IVA."
                    }
                  />
                  <ul className="mt-2 ml-7 text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
                    {stats.taxNotIncluded.map((p) => (
                      <li key={p.row}>
                        {p.name}: {p.price1 || p.price2} →{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(finalSalePrice(p, priceOpts))}
                        </span>{" "}
                        ({p.taxLabel})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Option
                checked={updateExisting}
                onChange={setUpdateExisting}
                title="Actualizar los productos que ya existen en posib"
                detail="Si un código ya está en posib, se actualizan nombre, precio, categoría e IVA (el stock y el costo no se tocan). Sin marcar, esos productos se dejan igual."
              />
            </CardContent>
          </Card>

          {/* Avisos */}
          {parsed.warnings.length > 0 && (
            <Card className="border-amber-300">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  {parsed.warnings.length} aviso(s)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                  {parsed.warnings.map((w, i) => (
                    <li key={i}>
                      Fila {w.row}: {w.reason}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Previsualización */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base">Previsualización</CardTitle>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importando {progress.done} de {progress.total}…
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Importar {products.length} productos
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <input
                type="search"
                placeholder="Buscar por nombre, código o categoría…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full mb-3 rounded-md border px-3 py-2 text-sm bg-background"
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4">Código</th>
                      <th className="py-2 pr-4">Nombre</th>
                      <th className="py-2 pr-4">Categoría</th>
                      <th className="py-2 pr-4">IVA</th>
                      <th className="py-2 pr-4 text-right">Stock</th>
                      <th className="py-2 text-right">Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((p) => (
                      <tr key={p.row} className={`border-b ${p.active ? "" : "opacity-50"}`}>
                        <td className="py-2 pr-4 font-mono text-xs">{p.code}</td>
                        <td className="py-2 pr-4">{p.name}</td>
                        <td className="py-2 pr-4 text-xs">{p.category ?? "—"}</td>
                        <td className="py-2 pr-4 text-xs">{p.taxLabel ?? "—"}</td>
                        <td className="py-2 pr-4 text-right">
                          {noInventory || !p.inventoriable ? (
                            <span className="text-xs text-muted-foreground">Sin control</span>
                          ) : (
                            Math.max(0, p.balance ?? 0)
                          )}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(finalSalePrice(p, priceOpts))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground mt-2">
                  Mostrando {visible.length} de {products.length}. Se importarán todos.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Resultado */}
      {result && (
        <Card className="border-green-300">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              Importación terminada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Productos creados" value={result.created} />
              <Stat label="Actualizados" value={result.updated} />
              <Stat label="Ya existían (sin cambios)" value={result.skipped} />
              <Stat label="Categorías creadas" value={result.categoriesCreated} />
            </div>
            {result.errors.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-amber-700 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  {result.errors.length} producto(s) no se pudieron importar
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      <span className="font-mono text-xs">{e.code || "(sin código)"}</span> {e.name}:{" "}
                      {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Link href="/dashboard/products">
                <Button>Ver productos</Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  reset();
                  setFileName(null);
                }}
              >
                Importar otro archivo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Option({
  checked,
  onChange,
  title,
  detail,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  detail: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4"
      />
      <span>
        <span className="font-medium text-sm">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center">
      <p className="text-2xl font-bold">{value.toLocaleString("es-CO")}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
