'use client';

import { useMemo, useState } from 'react';
import {
  Calculator,
  ChevronDown,
  ChevronRight,
  Coins,
  FileText,
  Search,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Product } from '@/lib/cloudflare-api';
import type { PurchaseOrderWithItems } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  computeInventoryInvestment,
  computePurchaseInvoices,
  computePurchasePlan,
  salePriceForMarkup,
} from '@/lib/profit-helpers';

const TOP_ROWS = 10;
const TOP_INVOICES = 10;

/** Convierte lo escrito en un campo de plata/cantidad a número (acepta "2.500"). */
function parseAmount(value: string): number {
  const n = Number(value.replace(/[^\d,]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/**
 * "Tu inversión y lo que vas a ganar": cuánta plata hay metida en la mercancía
 * de la bodega y cuánto deja al venderla, más una calculadora para planear una
 * compra al proveedor antes de hacerla.
 */
export function InvestmentSection({
  products,
  purchaseOrders,
}: {
  products: Product[];
  purchaseOrders: PurchaseOrderWithItems[];
}) {
  const investment = useMemo(() => computeInventoryInvestment(products), [products]);
  const [showAll, setShowAll] = useState(false);

  const visibleRows = showAll ? investment.rows : investment.rows.slice(0, TOP_ROWS);

  return (
    <div data-guide="profit-investment" className="space-y-6">
      <PurchaseInvoicesCard products={products} purchaseOrders={purchaseOrders} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-brand" />
            Tu inversión en mercancía
          </CardTitle>
          <p className="text-sm text-gray-500">
            La plata que tienes metida en lo que hay en la tienda ahora mismo y
            lo que te queda si lo vendes todo a los precios actuales.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-gray-500">Tienes invertido</p>
              <p className="font-num text-2xl font-bold">
                {formatCurrency(investment.invested)}
              </p>
              <p className="text-xs text-gray-400">stock × precio de costo</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-gray-500">Si lo vendes todo, te entra</p>
              <p className="font-num text-2xl font-bold">
                {formatCurrency(investment.expectedRevenue)}
              </p>
              <p className="text-xs text-gray-400">stock × precio de venta</p>
            </div>
            <div className="rounded-lg border border-brand/25 bg-brand-light p-4">
              <p className="text-sm text-brand">Vas a ganar</p>
              <p
                className={`font-num text-2xl font-bold ${
                  investment.expectedProfit >= 0 ? 'text-brand' : 'text-red-600'
                }`}
              >
                {formatCurrency(investment.expectedProfit)}
              </p>
              <p className="text-xs text-gray-500">
                {investment.invested > 0
                  ? `De cada $100 invertidos ganas $${Math.round(investment.markup)}`
                  : 'Registra el costo de tus productos para verlo'}
              </p>
            </div>
          </div>

          {investment.withoutCost.count > 0 && (
            <p className="text-sm rounded-md bg-amber-50 text-amber-800 px-3 py-2">
              {investment.withoutCost.count === 1
                ? '1 producto con existencias no tiene'
                : `${investment.withoutCost.count} productos con existencias no tienen`}{' '}
              precio de costo ({formatCurrency(investment.withoutCost.saleValue)} en
              venta) y no entran en la cuenta. Agrégales el costo en Productos para
              que el cálculo sea completo.
            </p>
          )}

          {investment.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Producto</th>
                    <th className="py-2 pr-4 text-right">Stock</th>
                    <th className="py-2 pr-4 text-right">Invertido</th>
                    <th className="py-2 pr-4 text-right">Te entra</th>
                    <th className="py-2 text-right">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.product.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4 font-medium">{row.product.name}</td>
                      <td className="py-2 pr-4 text-right">{row.units}</td>
                      <td className="py-2 pr-4 text-right">
                        {formatCurrency(row.invested)}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-500">
                        {formatCurrency(row.expectedRevenue)}
                      </td>
                      <td
                        className={`py-2 text-right font-semibold ${
                          row.expectedProfit > 0 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(row.expectedProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {investment.rows.length > TOP_ROWS && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll
                    ? 'Ver solo los 10 con más inversión'
                    : `Ver los ${investment.rows.length} productos`}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <PurchaseCalculator products={products} />
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Cada factura de compra al proveedor: lo que se invirtió y lo que va a dejar. */
function PurchaseInvoicesCard({
  products,
  purchaseOrders,
}: {
  products: Product[];
  purchaseOrders: PurchaseOrderWithItems[];
}) {
  const invoices = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return computePurchaseInvoices(purchaseOrders, byId);
  }, [products, purchaseOrders]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? invoices : invoices.slice(0, TOP_INVOICES);
  const totals = invoices.reduce(
    (acc, inv) => ({
      invested: acc.invested + inv.invested,
      revenue: acc.revenue + inv.expectedRevenue,
      profit: acc.profit + inv.expectedProfit,
    }),
    { invested: 0, revenue: 0, profit: 0 }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand" />
          Compras a proveedores
        </CardTitle>
        <p className="text-sm text-gray-500">
          Cada factura por separado: lo que pagaste y lo que te va a quedar
          cuando vendas esa mercancía a tus precios de venta actuales. Toca una
          factura para ver el detalle por producto.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {invoices.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            Todavía no hay compras registradas. Las compras que registres a un
            proveedor (a mano o con la foto de la factura) aparecerán aquí.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">
                  Invertido en {invoices.length === 1 ? '1 compra' : `${invoices.length} compras`}
                </p>
                <p className="font-num text-2xl font-bold">{formatCurrency(totals.invested)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Al venderlas te entra</p>
                <p className="font-num text-2xl font-bold">{formatCurrency(totals.revenue)}</p>
              </div>
              <div className="rounded-lg border border-brand/25 bg-brand-light p-4">
                <p className="text-sm text-brand">Vas a ganar</p>
                <p
                  className={`font-num text-2xl font-bold ${
                    totals.profit >= 0 ? 'text-brand' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(totals.profit)}
                </p>
              </div>
            </div>

            <ul className="divide-y rounded-lg border">
              {visible.map((inv) => {
                const isOpen = openId === inv.order.id;
                return (
                  <li key={inv.order.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : inv.order.id)}
                      aria-expanded={isOpen}
                      className="w-full text-left px-3 py-3 hover:bg-gray-50 flex flex-col md:flex-row md:items-center gap-2 md:gap-4"
                    >
                      <div className="flex items-start gap-2 md:flex-1 min-w-0">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 mt-1 shrink-0 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mt-1 shrink-0 text-gray-400" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{inv.supplierName}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(inv.order.order_date)} · {inv.order.order_number} ·{' '}
                            {inv.lines.length === 1 ? '1 producto' : `${inv.lines.length} productos`}
                            {inv.order.status === 'pendiente' && (
                              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                                Por recibir
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm pl-6 md:pl-0 md:w-[26rem] md:text-right">
                        <div>
                          <p className="text-xs text-gray-400">Invertido</p>
                          <p className="font-num font-semibold">{formatCurrency(inv.invested)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Te entra</p>
                          <p className="font-num">{formatCurrency(inv.expectedRevenue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Ganancia</p>
                          <p
                            className={`font-num font-semibold ${
                              inv.expectedProfit > 0 ? 'text-emerald-700' : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(inv.expectedProfit)}
                            {inv.invested > 0 && (
                              <span className="block text-xs font-normal text-gray-500">
                                {Math.round(inv.markup)}% de lo invertido
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-3 pb-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-gray-500">
                              <th className="py-2 pr-4">Producto</th>
                              <th className="py-2 pr-4 text-right">Cant.</th>
                              <th className="py-2 pr-4 text-right">Costo c/u</th>
                              <th className="py-2 pr-4 text-right">Venta c/u</th>
                              <th className="py-2 pr-4 text-right">Invertido</th>
                              <th className="py-2 pr-4 text-right">Te entra</th>
                              <th className="py-2 text-right">Ganancia</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inv.lines.map((line, i) => (
                              <tr key={`${line.productId}-${i}`} className="border-b last:border-0">
                                <td className="py-2 pr-4">{line.name}</td>
                                <td className="py-2 pr-4 text-right">{line.quantity}</td>
                                <td className="py-2 pr-4 text-right text-gray-500">
                                  {formatCurrency(line.unitCost)}
                                </td>
                                <td className="py-2 pr-4 text-right">
                                  {line.unitSalePrice === null ? '—' : formatCurrency(line.unitSalePrice)}
                                </td>
                                <td className="py-2 pr-4 text-right">{formatCurrency(line.invested)}</td>
                                <td className="py-2 pr-4 text-right text-gray-500">
                                  {line.unitSalePrice === null ? '—' : formatCurrency(line.expectedRevenue)}
                                </td>
                                <td
                                  className={`py-2 text-right font-semibold ${
                                    line.expectedProfit === null
                                      ? 'text-gray-400'
                                      : line.expectedProfit > 0
                                        ? 'text-emerald-700'
                                        : 'text-red-600'
                                  }`}
                                >
                                  {line.expectedProfit === null
                                    ? 'Sin precio'
                                    : formatCurrency(line.expectedProfit)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {inv.order.tax > 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            La factura incluye {formatCurrency(inv.order.tax)} de impuestos,
                            sumados a lo invertido.
                          </p>
                        )}
                        {inv.linesWithoutPrice > 0 && (
                          <p className="text-xs text-amber-700 mt-2">
                            {inv.linesWithoutPrice === 1
                              ? '1 producto ya no existe o no tiene precio de venta'
                              : `${inv.linesWithoutPrice} productos ya no existen o no tienen precio de venta`}
                            : no suman a lo que te entra, así que la ganancia real puede ser mayor.
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {invoices.length > TOP_INVOICES && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Ver solo las 10 más recientes' : `Ver las ${invoices.length} compras`}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Calculadora: "si compro esto, ¿cuánto invierto y cuánto gano?" */
function PurchaseCalculator({ products }: { products: Product[] }) {
  const [search, setSearch] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [units, setUnits] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [markup, setMarkup] = useState('');

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term.length < 2) return [];
    return products.filter((p) => p.name.toLowerCase().includes(term)).slice(0, 5);
  }, [products, search]);

  const pickProduct = (p: Product) => {
    setUnitCost(p.cost_price ? String(p.cost_price) : '');
    setSalePrice(p.sale_price ? String(p.sale_price) : '');
    setMarkup('');
    setSearch(p.name);
  };

  // Con un % de ganancia escrito, el precio de venta se calcula solo.
  const applyMarkup = (value: string) => {
    setMarkup(value);
    const cost = parseAmount(unitCost);
    // En el % el punto sí es decimal (12.5%), a diferencia de los montos
    const pct = Number(value.replace(',', '.').replace(/[^\d.]/g, ''));
    if (cost > 0 && value.trim() !== '' && Number.isFinite(pct)) {
      setSalePrice(String(salePriceForMarkup(cost, pct)));
    }
  };

  const plan = computePurchasePlan(
    parseAmount(unitCost),
    parseAmount(units),
    parseAmount(salePrice)
  );
  const hasData = plan.invested > 0 && plan.revenue > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5 text-brand" />
          ¿Cuánto vas a ganar con esta compra?
        </CardTitle>
        <p className="text-sm text-gray-500">
          Antes de hacerle el pedido al proveedor, calcula cuánto vas a invertir
          y cuánto te va a quedar cuando lo vendas.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Usar los precios de un producto (opcional)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {matches.length > 0 && matches[0].name !== search && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-md">
              {matches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => pickProduct(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between gap-2"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-gray-400 shrink-0">
                      {p.cost_price ? formatCurrency(p.cost_price) : 'sin costo'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label htmlFor="calc-cost">Te cuesta cada uno</Label>
            <Input
              id="calc-cost"
              inputMode="numeric"
              placeholder="$ 2.000"
              value={unitCost}
              onChange={(e) => {
                setUnitCost(e.target.value);
                setMarkup('');
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="calc-units">Cantidad que vas a comprar</Label>
            <Input
              id="calc-units"
              inputMode="numeric"
              placeholder="24"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="calc-markup">% que le quieres ganar</Label>
            <Input
              id="calc-markup"
              inputMode="numeric"
              placeholder="25"
              value={markup}
              onChange={(e) => applyMarkup(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="calc-sale">Lo vas a vender a</Label>
            <Input
              id="calc-sale"
              inputMode="numeric"
              placeholder="$ 2.500"
              value={salePrice}
              onChange={(e) => {
                setSalePrice(e.target.value);
                setMarkup('');
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Vas a invertir</p>
            <p className="font-num text-2xl font-bold">{formatCurrency(plan.invested)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Al venderlo todo te entra</p>
            <p className="font-num text-2xl font-bold">{formatCurrency(plan.revenue)}</p>
          </div>
          <div className="rounded-lg border border-brand/25 bg-brand-light p-4">
            <p className="text-sm text-brand flex items-center gap-1">
              <Coins className="h-4 w-4" /> Vas a ganar
            </p>
            <p
              className={`font-num text-2xl font-bold ${
                plan.profit >= 0 ? 'text-brand' : 'text-red-600'
              }`}
            >
              {formatCurrency(plan.profit)}
            </p>
            {hasData && (
              <p className="text-xs text-gray-500">
                {plan.markup.toFixed(0)}% sobre lo invertido · {plan.margin.toFixed(0)}%
                de lo que vendes
              </p>
            )}
          </div>
        </div>

        {hasData && plan.profit <= 0 && (
          <p className="text-sm rounded-md bg-red-50 text-red-700 px-3 py-2">
            Con ese precio no ganas nada: vendes igual o más barato de lo que te
            cuesta. Sube el precio de venta.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
