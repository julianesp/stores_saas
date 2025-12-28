'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { getSales, updateSale } from '@/lib/cloudflare-api';
import { Sale } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Phone,
  User,
  MapPin,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Swal from 'sweetalert2';

export default function WebOrdersPage() {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Sale | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const allSales = await getSales(getToken);

      // Filtrar solo pedidos web (que tienen sale_number que empieza con "WEB-")
      const webOrders = allSales.filter(sale =>
        sale.sale_number.startsWith('WEB-')
      );

      // Ordenar por fecha (más recientes primero)
      webOrders.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setOrders(webOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);

    const result = await Swal.fire({
      title: '¿Confirmar pago recibido?',
      html: `
        <p class="text-gray-600 mb-4">Estás a punto de confirmar el pago de:</p>
        <div class="bg-blue-50 p-4 rounded-lg mb-4">
          <p class="font-bold text-lg text-blue-900">${formatCurrency(order?.total || 0)}</p>
          <p class="text-sm text-gray-600 mt-1">Pedido: ${order?.sale_number}</p>
        </div>
        <p class="text-sm text-orange-600">⚠️ El inventario se descontará automáticamente</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, confirmar pago',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await updateSale(orderId, {
        status: 'completada',
        payment_status: 'pagado',
        amount_paid: order?.total || 0,
        amount_pending: 0,
      } as any, getToken);

      await Swal.fire({
        title: '¡Pago confirmado!',
        text: 'El stock ha sido actualizado correctamente',
        icon: 'success',
        confirmButtonColor: '#16a34a',
        timer: 2000,
      });

      loadOrders();
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      await Swal.fire({
        title: 'Error',
        text: error.message || 'Error al confirmar pago',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    }
  };

  const rejectOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);

    const result = await Swal.fire({
      title: '¿Rechazar este pedido?',
      html: `
        <p class="text-gray-600 mb-4">Vas a rechazar el pedido:</p>
        <div class="bg-red-50 p-4 rounded-lg mb-4">
          <p class="font-bold text-lg text-red-900">${order?.sale_number}</p>
          <p class="text-sm text-gray-600 mt-1">${formatCurrency(order?.total || 0)}</p>
        </div>
        <p class="text-sm text-gray-600">El pedido se marcará como cancelado</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, rechazar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await updateSale(orderId, {
        status: 'cancelada',
        payment_status: 'pendiente', // Mantener como pendiente ya que no se pagó
      } as any, getToken);

      await Swal.fire({
        title: 'Pedido rechazado',
        text: 'El pedido ha sido cancelado',
        icon: 'success',
        confirmButtonColor: '#16a34a',
        timer: 2000,
      });

      loadOrders();
    } catch (error: any) {
      console.error('Error rejecting order:', error);
      await Swal.fire({
        title: 'Error',
        text: error.message || 'Error al rechazar pedido',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    }
  };

  const viewOrderDetails = (order: Sale) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case 'completada':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Confirmado</Badge>;
      case 'cancelada':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const extractCustomerInfo = (notes: string) => {
    const info: any = {};

    const nameMatch = notes.match(/Cliente: (.+)/);
    if (nameMatch) info.name = nameMatch[1].trim();

    const phoneMatch = notes.match(/Teléfono: (.+)/);
    if (phoneMatch) info.phone = phoneMatch[1].trim();

    const emailMatch = notes.match(/Email: (.+)/);
    if (emailMatch) info.email = emailMatch[1].trim();

    const deliveryMatch = notes.match(/Entrega: (.+)/);
    if (deliveryMatch) info.delivery = deliveryMatch[1].trim();

    const addressMatch = notes.match(/Dirección: (.+)/);
    if (addressMatch) info.address = addressMatch[1].trim();

    const shippingMatch = notes.match(/Costo de envío: \$(.+)/);
    if (shippingMatch) info.shippingCost = shippingMatch[1].trim();

    const customerNotesMatch = notes.match(/Notas: (.+)/);
    if (customerNotesMatch) info.customerNotes = customerNotesMatch[1].trim();

    return info;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pedidos Web</h1>
          <p className="text-gray-500">Gestiona los pedidos de tu tienda online</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-yellow-700">
            <Clock className="h-4 w-4 mr-1" />
            {orders.filter(o => o.status === 'pendiente').length} Pendientes
          </Badge>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingCart className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay pedidos web
            </h3>
            <p className="text-gray-500">
              Los pedidos de tu tienda online aparecerán aquí
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const customerInfo = extractCustomerInfo(order.notes || '');

            return (
              <Card key={order.id} className={order.status === 'pendiente' ? 'border-yellow-300 border-2' : ''}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">{order.sale_number}</h3>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString('es-CO', {
                          dateStyle: 'full',
                          timeStyle: 'short'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      {customerInfo.name && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{customerInfo.name}</span>
                        </div>
                      )}
                      {customerInfo.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{customerInfo.phone}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {customerInfo.delivery && (
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span>{customerInfo.delivery}</span>
                        </div>
                      )}
                      {customerInfo.address && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="line-clamp-1">{customerInfo.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewOrderDetails(order)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver detalles
                    </Button>

                    {order.status === 'pendiente' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => confirmPayment(order.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirmar Pago
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectOrder(order.id)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de detalles */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Pedido</DialogTitle>
            <DialogDescription>
              {selectedOrder?.sale_number}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Información del Cliente</h4>
                <div className="space-y-1 text-sm">
                  <pre className="whitespace-pre-wrap text-gray-700">
                    {selectedOrder.notes}
                  </pre>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Resumen del Pedido</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento:</span>
                      <span>-{formatCurrency(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Total:</span>
                    <span>{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Estado</h4>
                <div className="flex gap-2">
                  {getStatusBadge(selectedOrder.status)}
                  {selectedOrder.payment_status && (
                    <Badge variant="outline">
                      Pago: {selectedOrder.payment_status}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
