'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import {
  ShoppingCart,
  Sparkles,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  CreditCard,
  Package,
  ArrowLeft,
  Edit2,
  PackageSearch,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SupplierForm } from '@/components/suppliers/supplier-form';
import { getSupplierById, getSupplierProducts } from '@/lib/cloudflare-api';
import type { Product } from '@/lib/cloudflare-api';
import type { Supplier } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function SupplierDetailPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchSupplier();
    fetchProducts();
  }, [supplierId]);

  const fetchSupplier = async () => {
    try {
      const data = await getSupplierById(supplierId, getToken);
      setSupplier(data);
    } catch {
      toast.error('Error al cargar proveedor');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const data = await getSupplierProducts(supplierId, getToken);
      setProducts(data);
    } catch {
      // silencioso si no hay productos
    } finally {
      setLoadingProducts(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-gray-500">Cargando...</div>;
  if (!supplier) return <div className="py-8 text-center text-gray-500">Proveedor no encontrado</div>;

  const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0);
  const totalCostValue = products.reduce((s, p) => s + (p.cost_price || 0) * (p.stock || 0), 0);
  const lowStock = products.filter((p) => p.stock <= p.min_stock);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/suppliers')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{supplier.name}</h1>
          <p className="text-sm text-gray-500">
            {supplier.contact_name && `${supplier.contact_name} · `}
            {supplier.city}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing(!editing)}
        >
          <Edit2 className="h-4 w-4 mr-1.5" />
          {editing ? 'Cerrar' : 'Editar'}
        </Button>
      </div>

      {/* Formulario de edición (colapsable) */}
      {editing && (
        <SupplierForm
          initialData={supplier}
          supplierId={supplierId}
        />
      )}

      {/* Info rápida del proveedor */}
      {!editing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {supplier.phone && (
            <a
              href={`tel:${supplier.phone}`}
              className="flex items-center gap-3 p-3 rounded-xl border bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 rounded-full bg-brand/10">
                <Phone className="h-4 w-4 text-brand" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Celular</p>
                <p className="font-medium text-sm truncate">{supplier.phone}</p>
              </div>
            </a>
          )}
          {(supplier.whatsapp || supplier.phone) && (
            <a
              href={`https://wa.me/57${(supplier.whatsapp || supplier.phone)?.replace(/\s/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 rounded-full bg-green-100">
                <MessageCircle className="h-4 w-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">WhatsApp</p>
                <p className="font-medium text-sm truncate">
                  {supplier.whatsapp || supplier.phone}
                </p>
              </div>
            </a>
          )}
          {supplier.city && (
            <div className="flex items-center gap-3 p-3 rounded-xl border bg-white">
              <div className="p-2 rounded-full bg-blue-100">
                <MapPin className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Ciudad</p>
                <p className="font-medium text-sm">{supplier.city}</p>
              </div>
            </div>
          )}
          {supplier.visit_day && (
            <div className="flex items-center gap-3 p-3 rounded-xl border bg-white">
              <div className="p-2 rounded-full bg-purple-100">
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Día de visita</p>
                <p className="font-medium text-sm capitalize">{supplier.visit_day}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 p-3 rounded-xl border bg-white">
            <div className="p-2 rounded-full bg-orange-100">
              <CreditCard className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Forma de pago</p>
              <p className="font-medium text-sm capitalize">
                {supplier.payment_type}
                {supplier.payment_type === 'credito' && supplier.credit_days > 0 &&
                  ` · ${supplier.credit_days} días`}
              </p>
            </div>
          </div>
          {supplier.tax_id && (
            <div className="flex items-center gap-3 p-3 rounded-xl border bg-white">
              <div className="p-2 rounded-full bg-gray-100">
                <Package className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">NIT / RUT</p>
                <p className="font-medium text-sm">{supplier.tax_id}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notas */}
      {!editing && supplier.notes && (
        <div className="px-4 py-3 rounded-xl border bg-yellow-50 text-sm text-yellow-900">
          <span className="font-medium">Nota: </span>{supplier.notes}
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/suppliers/${supplierId}/scan-invoice`}>
          <Button size="sm" className="bg-brand hover:bg-brand-hover text-white">
            <Sparkles className="mr-2 h-4 w-4" />
            Subir compra por foto
          </Button>
        </Link>
        <Link href={`/dashboard/suppliers/${supplierId}/new-purchase`}>
          <Button size="sm" variant="outline">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Nueva orden de compra
          </Button>
        </Link>
      </div>

      {/* Resumen de inventario */}
      {!loadingProducts && products.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-brand">{products.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Productos</p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{totalStock.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">Unidades en stock</p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center">
            <p className="text-lg font-bold text-gray-800">{formatCurrency(totalCostValue)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Valor en inventario</p>
          </div>
        </div>
      )}

      {/* Alerta stock bajo */}
      {!loadingProducts && lowStock.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-orange-200 bg-orange-50 text-sm text-orange-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium">{lowStock.length} producto{lowStock.length > 1 ? 's' : ''}</span>
            {' '}con stock bajo: {lowStock.map((p) => p.name).join(', ')}
          </span>
        </div>
      )}

      {/* Lista de productos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <PackageSearch className="h-5 w-5" />
              Productos de este proveedor
              {products.length > 0 && (
                <Badge variant="secondary">{products.length}</Badge>
              )}
            </CardTitle>
            <Link href="/dashboard/products/new">
              <Button size="sm" variant="outline">
                <Package className="mr-1.5 h-4 w-4" />
                Agregar producto
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loadingProducts ? (
            <div className="py-8 text-center text-gray-400">Cargando productos...</div>
          ) : products.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <PackageSearch className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-1">Sin productos registrados</p>
              <p className="text-xs mb-4">
                Usa "Subir compra por foto" para agregar productos rápido,<br />
                o crea uno manual desde el inventario.
              </p>
              <Link href={`/dashboard/suppliers/${supplierId}/scan-invoice`}>
                <Button size="sm" className="bg-brand hover:bg-brand-hover text-white">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Subir compra por foto
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {products.map((product) => {
                const isLow = product.stock <= product.min_stock;
                const margin =
                  product.cost_price > 0
                    ? Math.round(((product.sale_price - product.cost_price) / product.cost_price) * 100)
                    : null;
                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    {/* Indicador stock */}
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isLow ? 'bg-orange-400' : 'bg-green-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      {product.barcode && (
                        <p className="text-xs text-gray-400">{product.barcode}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatCurrency(product.sale_price)}</p>
                      <p className="text-xs text-gray-400">
                        costo {formatCurrency(product.cost_price)}
                        {margin !== null && (
                          <span className="ml-1 text-green-600">+{margin}%</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0 w-16">
                      <p
                        className={`text-sm font-semibold ${
                          isLow ? 'text-orange-500' : 'text-gray-700'
                        }`}
                      >
                        {product.stock}
                      </p>
                      <p className="text-xs text-gray-400">en stock</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estadísticas rápidas si hay productos */}
      {!loadingProducts && products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              Rentabilidad por producto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {[...products]
                .filter((p) => p.cost_price > 0)
                .sort(
                  (a, b) =>
                    (b.sale_price - b.cost_price) / b.cost_price -
                    (a.sale_price - a.cost_price) / a.cost_price,
                )
                .slice(0, 5)
                .map((product) => {
                  const margin = Math.round(
                    ((product.sale_price - product.cost_price) / product.cost_price) * 100,
                  );
                  const barWidth = Math.min(margin, 100);
                  return (
                    <div key={product.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="truncate max-w-[60%]">{product.name}</span>
                        <span
                          className={`font-semibold ${
                            margin >= 30
                              ? 'text-green-600'
                              : margin >= 15
                              ? 'text-yellow-600'
                              : 'text-red-500'
                          }`}
                        >
                          {margin}% margen
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100">
                        <div
                          className={`h-1.5 rounded-full ${
                            margin >= 30
                              ? 'bg-green-400'
                              : margin >= 15
                              ? 'bg-yellow-400'
                              : 'bg-red-400'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
