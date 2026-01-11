'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { ShoppingCart, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SupplierForm } from '@/components/suppliers/supplier-form';
import { getSupplierById, getPurchaseOrdersBySupplier } from '@/lib/cloudflare-api';
import type { Supplier, PurchaseOrderWithItems, PurchaseOrderItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function EditSupplierPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithItems[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [purchasedProducts, setPurchasedProducts] = useState<Map<string, {
    product_name: string;
    total_quantity: number;
    total_amount: number;
    last_purchase_date: string;
  }>>(new Map());

  useEffect(() => {
    fetchSupplier();
    fetchPurchaseHistory();
  }, [params.id]);

  const fetchSupplier = async () => {
    try {
      const data = await getSupplierById(params.id as string, getToken);
      setSupplier(data);
    } catch (error) {
      console.error('Error fetching supplier:', error);
      toast.error('Error al cargar proveedor');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseHistory = async () => {
    try {
      setLoadingPurchases(true);
      const orders = await getPurchaseOrdersBySupplier(params.id as string, getToken);
      setPurchaseOrders(orders);

      // Agrupar productos comprados
      const productsMap = new Map<string, {
        product_name: string;
        total_quantity: number;
        total_amount: number;
        last_purchase_date: string;
      }>();

      // Solo incluir órdenes recibidas
      const receivedOrders = orders.filter(order => order.status === 'recibida');

      for (const order of receivedOrders) {
        if (order.items) {
          for (const item of order.items) {
            const existing = productsMap.get(item.product_id);
            if (existing) {
              existing.total_quantity += item.quantity;
              existing.total_amount += item.subtotal;
              if (order.received_date && order.received_date > existing.last_purchase_date) {
                existing.last_purchase_date = order.received_date;
              }
            } else {
              productsMap.set(item.product_id, {
                product_name: item.product_name,
                total_quantity: item.quantity,
                total_amount: item.subtotal,
                last_purchase_date: order.received_date || order.created_at,
              });
            }
          }
        }
      }

      setPurchasedProducts(productsMap);
    } catch (error) {
      console.error('Error fetching purchase history:', error);
    } finally {
      setLoadingPurchases(false);
    }
  };

  if (loading) return <div className="py-8 text-center">Cargando...</div>;
  if (!supplier) return <div className="py-8 text-center">Proveedor no encontrado</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Editar Proveedor</h1>
          <p className="text-gray-500">Actualiza la información del proveedor</p>
        </div>
      </div>

      <SupplierForm initialData={supplier} supplierId={params.id as string} />

      {/* Historial de Productos Comprados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Productos Comprados a este Proveedor ({purchasedProducts.size})
            </CardTitle>
            <Link href={`/dashboard/suppliers/${params.id}/new-purchase`}>
              <Button size="sm" variant="outline">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Nueva Orden de Compra
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Historial de productos que has comprado a este proveedor a través de órdenes de compra
          </p>
        </CardHeader>
        <CardContent>
          {loadingPurchases ? (
            <div className="text-center py-8 text-gray-500">Cargando historial de compras...</div>
          ) : purchasedProducts.size === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No hay historial de compras con este proveedor</p>
              <p className="text-xs mb-4">Crea una orden de compra para comenzar</p>
              <Link href={`/dashboard/suppliers/${params.id}/new-purchase`}>
                <Button variant="outline">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Crear Primera Orden
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from(purchasedProducts.entries()).map(([productId, data]) => (
                <div
                  key={productId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{data.product_name}</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mt-2">
                      <div>
                        <span className="text-gray-500">Total comprado:</span>
                        <p className="font-medium text-gray-900">{data.total_quantity} unidades</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Monto total:</span>
                        <p className="font-medium text-gray-900">{formatCurrency(data.total_amount)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Última compra:</span>
                        <p className="font-medium text-gray-900">
                          {new Date(data.last_purchase_date).toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {purchaseOrders.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-semibold mb-2">Resumen de Órdenes</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total órdenes:</span>
                  <p className="font-medium text-gray-900">{purchaseOrders.length}</p>
                </div>
                <div>
                  <span className="text-gray-500">Órdenes recibidas:</span>
                  <p className="font-medium text-green-600">
                    {purchaseOrders.filter(o => o.status === 'recibida').length}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Órdenes pendientes:</span>
                  <p className="font-medium text-yellow-600">
                    {purchaseOrders.filter(o => o.status === 'pendiente').length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
