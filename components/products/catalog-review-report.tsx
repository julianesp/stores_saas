"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Copy, Download, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { tenantHeaders } from "@/lib/cloudflare-api";
import { formatCurrency } from "@/lib/utils";
import {
  MIN_REAL_PRICE,
  summarize,
  whatsappText,
  type CatalogReview,
  type WrongCategory,
} from "@/lib/catalog-review";

const n = (v: number) => v.toLocaleString("es-CO");
const AI_BATCH = 500;
const AI_RETRIES = 4;
const AI_RETRY_WAIT_MS = 15_000;
/** "1 tiene" / "3 tienen" */
const plural = (count: number, one: string, many: string) => `${n(count)} ${count === 1 ? one : many}`;
const listNames = (names: string[]) => names.map((name) => `"${name}"`).join(", ");

interface Props {
  review: CatalogReview;
}

/**
 * Informe de revisión del catálogo para el tendero: lo que está bien, lo que
 * conviene arreglar (con ejemplos de su propia tienda) y consejos. Se puede
 * guardar en PDF (impresión del navegador) o copiar como texto para WhatsApp.
 */
export function CatalogReviewReport({ review: baseReview }: Props) {
  const [wrongCategories, setWrongCategories] = useState<WrongCategory[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiWaiting, setAiWaiting] = useState(false);
  const [showAllWrong, setShowAllWrong] = useState(false);

  const review = useMemo(() => ({ ...baseReview, wrongCategories }), [baseReview, wrongCategories]);
  const pending = summarize(review);
  const fromSiigo = review.source === "siigo";
  const withCategory = useMemo(
    () => review.items.filter((i) => i.category),
    [review.items],
  );

  const runCategoryReview = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiProgress(0);
    const found: WrongCategory[] = [];
    try {
      // Tandas de 500: cada consulta tarda unos 10 segundos.
      for (let start = 0; start < withCategory.length; start += AI_BATCH) {
        const batch = withCategory.slice(start, start + AI_BATCH);
        let res: Response | null = null;
        let data: { error?: string; findings?: unknown } = {};
        // La key gratis de Gemini se satura seguido (503): esperar y reintentar.
        for (let attempt = 1; attempt <= AI_RETRIES; attempt++) {
          res = await fetch("/api/ai/category-review", {
            method: "POST",
            headers: tenantHeaders(),
            body: JSON.stringify({ items: batch.map((i) => ({ n: i.name, c: i.category })) }),
          });
          data = await res.json().catch(() => ({}));
          if (res.status !== 503 || attempt === AI_RETRIES) break;
          setAiWaiting(true);
          await new Promise((resolve) => setTimeout(resolve, AI_RETRY_WAIT_MS));
          setAiWaiting(false);
        }
        if (!res?.ok) throw new Error(data.error || "No se pudo revisar las categorías.");
        for (const f of (data.findings ?? []) as Array<{ i: number; suggested: string }>) {
          const item = batch[f.i];
          if (item) found.push({ name: item.name, current: item.category ?? "", suggested: f.suggested });
        }
        setAiProgress(Math.min(start + AI_BATCH, withCategory.length));
      }
      setWrongCategories(found);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo revisar las categorías.";
      // Si alcanzó a revisar una parte, se muestra lo encontrado hasta ahí.
      if (found.length > 0) setWrongCategories(found);
      setAiError(found.length > 0 ? `${message} Se muestran los productos revisados hasta ahora.` : message);
    } finally {
      setAiLoading(false);
    }
  };

  const copyWhatsapp = async () => {
    const text = whatsappText(review);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Resumen copiado. Pégalo en WhatsApp.");
    } catch {
      toast.error("No se pudo copiar. Intenta de nuevo.");
    }
  };

  const prices = [...review.noPrice, ...review.lowPrices];
  const visibleWrong = showAllWrong ? wrongCategories ?? [] : (wrongCategories ?? []).slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Solo se imprime el informe (Guardar como PDF), sin menú ni encabezado de la app */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 14mm; }
          body * { visibility: hidden !important; }
          #catalog-review, #catalog-review * { visibility: visible !important; }
          #catalog-review { position: absolute; left: 0; top: 0; width: 100%; }
          #catalog-review .no-print { display: none !important; }
          #catalog-review .review-block { break-inside: avoid; }
          html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print flex flex-wrap gap-2 justify-end">
        <Button variant="outline" onClick={copyWhatsapp}>
          <Copy className="w-4 h-4 mr-2" />
          Copiar resumen para WhatsApp
        </Button>
        <Button onClick={() => window.print()}>
          <Download className="w-4 h-4 mr-2" />
          Descargar PDF
        </Button>
      </div>

      <article
        id="catalog-review"
        className="mx-auto max-w-3xl space-y-7 rounded-xl border bg-white p-5 sm:p-8 text-[15px] leading-relaxed text-gray-800"
      >
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            Revisión de {fromSiigo ? "la lista de productos" : "su catálogo"}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-balance">
            {review.storeName ?? "Su tienda"}
            {fromSiigo ? ", lista para pasar a posib" : ""}
          </h2>
          <p className="text-gray-600">
            {pending.length === 0
              ? "Revisamos todos los productos y no encontramos nada por arreglar."
              : `Revisamos ${n(review.total)} productos. La mayoría está bien. ${pending.length === 1 ? "Aquí está la cosa" : `Aquí están las ${pending.length} cosas`} que conviene arreglar, con calma: no hace falta hacerlo todo de una vez${fromSiigo ? " y se puede empezar a vender en posib el mismo día" : ""}.`}
          </p>
        </header>

        <section className="review-block rounded-xl bg-brand-light p-5 space-y-3">
          <h3 className="font-bold text-gray-900">Lo que ya está bien</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Figure value={review.total} label="productos registrados" />
            <Figure value={review.categories} label="categorías para ordenarlos" />
            <Figure value={review.goodPrices} label="productos con el precio bien escrito" />
          </div>
          {review.untracked > 0 && !fromSiigo && (
            <p className="text-sm text-gray-600">
              {plural(review.untracked, "se vende", "se venden")} sin controlar inventario, como usted lo eligió.
            </p>
          )}
        </section>

        {pending.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900">
              {pending.length === 1 ? "Una cosa para mejorar" : `${pending.length} cosas para mejorar`}
            </h3>
            <ol className="space-y-3">
              {pending.map((item, index) => (
                <li key={item.key} className="review-block relative rounded-xl border p-5 pl-14 space-y-2">
                  <span className="absolute left-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-brand text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <h4 className="font-semibold text-gray-900">{item.title}</h4>
                  <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    {item.count}
                  </span>

                  {item.key === "prices" && (
                    <>
                      <p>
                        {review.lowPrices.length > 0 &&
                          `${plural(review.lowPrices.length, "tiene", "tienen")} un precio menor a ${formatCurrency(MIN_REAL_PRICE)}, casi siempre porque se escribió sin los ceros. `}
                        {review.noPrice.length > 0 && `${plural(review.noPrice.length, "no tiene", "no tienen")} precio.`}
                      </p>
                      <Examples>
                        {prices.slice(0, 3).map((p) => (
                          <li key={p.name + p.code}>
                            <b>{p.name}</b>{" "}
                            {p.price > 0 ? (
                              <>
                                aparece en <b>{p.price.toLocaleString("es-CO")}</b> y seguramente es{" "}
                                <b>{formatCurrency(p.price * 1000)}</b>
                              </>
                            ) : (
                              "no tiene precio"
                            )}
                          </li>
                        ))}
                      </Examples>
                      <Todo>
                        En posib, dentro de Productos, el botón &quot;Precios por revisar&quot; muestra todos
                        estos productos. Se pueden corregir de a poquitos, por ejemplo cuando se vendan.
                      </Todo>
                    </>
                  )}

                  {item.key === "stock" && (
                    <>
                      <p>
                        {fromSiigo
                          ? "En el sistema anterior estos productos no tienen cantidad guardada"
                          : "Estos productos controlan inventario pero no tienen unidades"}
                        {review.negativeStock > 0 &&
                          `, y ${n(review.negativeStock)} están en negativo porque se vendieron sin registrar la mercancía que llegó`}
                        .
                      </p>
                      <Todo>
                        {fromSiigo
                          ? "Al importar se puede marcar \"Vender sin controlar inventario\" para vender desde el primer día. "
                          : ""}
                        Cuando haya un rato, cuente primero lo que más se vende y anótelo en Inventario. Desde ahí,
                        cada vez que llegue mercancía, regístrela ese mismo día.
                      </Todo>
                    </>
                  )}

                  {item.key === "tax" && (
                    <>
                      <p>
                        Tienen IVA, pero el precio está guardado <b>sin</b> el IVA y el sistema anterior se lo
                        suma al facturar. En posib el precio es el que paga el cliente, ya con IVA.
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm tabular-nums">
                          <thead>
                            <tr className="border-b text-left text-gray-500">
                              <th className="py-1.5 pr-3 font-medium">Producto</th>
                              <th className="py-1.5 pr-3 text-right font-medium">Precio guardado</th>
                              <th className="py-1.5 text-right font-medium">Con IVA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {review.taxNotIncluded.slice(0, 5).map((p) => (
                              <tr key={p.name + p.code} className="border-b">
                                <td className="py-1.5 pr-3">{p.name}</td>
                                <td className="py-1.5 pr-3 text-right">{formatCurrency(p.price)}</td>
                                <td className="py-1.5 text-right">
                                  {formatCurrency(p.taxNotIncluded!.priceWithTax)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <Todo>
                        Defina cuál de los dos precios le cobra hoy al cliente. La importación tiene la opción de
                        sumar el IVA a estos productos.
                      </Todo>
                    </>
                  )}

                  {item.key === "repeated" && (
                    <>
                      {review.duplicateCodes.count > 0 && (
                        <p>
                          {plural(review.duplicateCodes.count, "producto tiene", "productos tienen")} el mismo código que otro
                          {review.duplicateCodes.examples.length > 0 &&
                            `, por ejemplo ${listNames(review.duplicateCodes.examples)}`}
                          .{fromSiigo && " Al importar queda uno solo, sin hacer nada."}
                        </p>
                      )}
                      {review.repeatedNames.groups > 0 && (
                        <p>
                          {plural(review.repeatedNames.groups, "nombre se repite", "nombres se repiten")}
                          {review.repeatedNames.examples.length > 0 &&
                            `, como ${listNames(review.repeatedNames.examples)}`}
                          . A veces son el mismo producto guardado dos veces y a veces son productos distintos
                          con el nombre incompleto.
                        </p>
                      )}
                      <Todo>
                        En Productos, los botones &quot;Repetidos&quot; y &quot;Nombres repetidos&quot; ayudan a
                        unirlos o a ponerles un nombre que los distinga (marca, sabor y tamaño).
                      </Todo>
                    </>
                  )}

                  {item.key === "categories" && (
                    <>
                      {review.noCategory.length > 0 && (
                        <p>
                          {plural(review.noCategory.length, "producto no tiene", "productos no tienen")} categoría, como{" "}
                          {listNames(review.noCategory.slice(0, 3).map((p) => p.name))}.
                        </p>
                      )}
                      {wrongCategories && wrongCategories.length > 0 && (
                        <>
                          <p>Estos productos están en una categoría que no les corresponde:</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-left text-gray-500">
                                  <th className="py-1.5 pr-3 font-medium">Producto</th>
                                  <th className="py-1.5 pr-3 font-medium">Está en</th>
                                  <th className="py-1.5 font-medium">Debería ir en</th>
                                </tr>
                              </thead>
                              <tbody>
                                {visibleWrong.map((w) => (
                                  <tr key={w.name + w.current} className="border-b">
                                    <td className="py-1.5 pr-3">{w.name}</td>
                                    <td className="py-1.5 pr-3 text-gray-500">{w.current}</td>
                                    <td className="py-1.5 font-medium">{w.suggested}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {wrongCategories.length > 8 && (
                            <button
                              type="button"
                              className="no-print text-sm font-medium text-brand hover:underline"
                              onClick={() => setShowAllWrong(!showAllWrong)}
                            >
                              {showAllWrong ? "Ver menos" : `Ver los ${wrongCategories.length}`}
                            </button>
                          )}
                        </>
                      )}
                      <Todo>
                        No es urgente. Cuando vea uno así, ábralo en Productos y cámbiele la categoría.
                      </Todo>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Revisión de categorías con IA (no se imprime el botón, solo el resultado) */}
        {wrongCategories === null && withCategory.length > 0 && (
          <section className="no-print review-block rounded-xl border border-dashed p-5 space-y-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand" />
              ¿Hay productos en la categoría equivocada?
            </h3>
            <p className="text-sm text-gray-600">
              La IA lee los {n(withCategory.length)}{" "}productos y avisa cuáles están mal ubicados (por ejemplo,
              una bebida en &quot;Frutas y verduras&quot;). Se revisan de a 500 productos, unos 10 segundos por tanda.
            </p>
            {aiError && <p className="text-sm text-red-600">{aiError}</p>}
            <Button variant="outline" onClick={runCategoryReview} disabled={aiLoading}>
              {aiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {aiWaiting
                    ? "La IA está ocupada, reintentando…"
                    : `Revisando ${n(aiProgress)} de ${n(withCategory.length)}…`}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Revisar categorías con IA
                </>
              )}
            </Button>
          </section>
        )}
        {wrongCategories !== null && wrongCategories.length === 0 && (
          <p className="no-print flex items-center gap-2 text-sm text-brand">
            <CheckCircle2 className="w-4 h-4" />
            La IA no encontró productos en una categoría equivocada.
          </p>
        )}

        <section className="review-block space-y-2">
          <h3 className="text-lg font-bold text-gray-900">Para que los productos queden bien de aquí en adelante</h3>
          <ul className="list-disc space-y-1.5 pl-5 marker:text-brand">
            <li>Escriba siempre el precio completo, con los ceros: 2.000 y no 2.</li>
            <li>Antes de crear un producto nuevo, búsquelo. Si ya existe, no lo cree otra vez.</li>
            <li>Use el código de barras que trae el empaque. Con el lector, se registra solo y sin errores.</li>
            <li>Póngale a cada producto la categoría que le corresponde, así lo encuentra más rápido.</li>
            <li>Cuando llegue mercancía, regístrela ese mismo día.</li>
          </ul>
        </section>

        <footer className="border-t pt-4 text-sm text-gray-500">
          Revisión generada por posib · posib.dev ·{" "}
          {new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
        </footer>
      </article>
    </div>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-brand tabular-nums">{n(value)}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

function Examples({ children }: { children: React.ReactNode }) {
  return <ul className="border-l-2 pl-3 text-sm text-gray-600 space-y-0.5">{children}</ul>;
}

function Todo({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-medium">
      <span className="font-semibold text-brand">Qué hacer: </span>
      {children}
    </p>
  );
}
