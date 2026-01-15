'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { getSales, updateSale, deleteSale, getUserProfile } from '@/lib/cloudflare-api';
import { Sale, UserProfile } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ShoppingCart,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Phone,
  User,
  MapPin,
  Package,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  hasStorefrontAccess,
  getStorefrontBlockMessage,
} from '@/lib/storefront-access';
import Swal from 'sweetalert2';

export default function WebOrdersPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Sale | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState('pendiente');

  useEffect(() => {
    checkAccessAndLoadOrders();

    // Auto-refresh cada 30 segundos para mostrar cambios de estado de pago
    const interval = setInterval(() => {
      if (hasAccess) {
        loadOrders();
      }
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [hasAccess]);

  const checkAccessAndLoadOrders = async () => {
    try {
      const data = await getUserProfile(getToken);
      setProfile(data);

      // Verificar acceso a Tienda Online / Pedidos Web
      const accessCheck = hasStorefrontAccess(data);
      setHasAccess(accessCheck.hasAccess);

      // Si no tiene acceso, mostrar alerta y redirigir
      if (!accessCheck.hasAccess) {
        const message = getStorefrontBlockMessage(accessCheck.reason);

        Swal.fire({
          icon: 'warning',
          title: message.title,
          html: message.html,
          showCancelButton: true,
          confirmButtonText: 'Ver Planes de Suscripción',
          cancelButtonText: 'Volver al Dashboard',
          confirmButtonColor: '#8B5CF6',
          cancelButtonColor: '#6B7280',
          allowOutsideClick: false,
        }).then((result) => {
          if (result.isConfirmed) {
            router.push('/dashboard/subscription');
          } else {
            router.push('/dashboard');
          }
        });

        setLoading(false);
        return;
      }

      // Si tiene acceso, cargar pedidos
      await loadOrders();
    } catch (error) {
      console.error('Error checking access:', error);
      toast.error('Error al verificar acceso');
      setLoading(false);
    }
  };

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

  const deleteOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);

    const result = await Swal.fire({
      title: '¿Eliminar este pedido?',
      html: `
        <p class="text-gray-600 mb-4">Vas a <strong>eliminar permanentemente</strong> el pedido:</p>
        <div class="bg-red-50 p-4 rounded-lg mb-4">
          <p class="font-bold text-lg text-red-900">${order?.sale_number}</p>
          <p class="text-sm text-gray-600 mt-1">${formatCurrency(order?.total || 0)}</p>
        </div>
        <p class="text-sm text-red-600">⚠️ Esta acción no se puede deshacer</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await deleteSale(orderId, getToken);

      await Swal.fire({
        title: 'Pedido eliminado',
        text: 'El pedido ha sido eliminado de la base de datos',
        icon: 'success',
        confirmButtonColor: '#16a34a',
        timer: 2000,
      });

      loadOrders();
    } catch (error: any) {
      console.error('Error deleting order:', error);
      await Swal.fire({
        title: 'Error',
        text: error.message || 'Error al eliminar pedido',
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

  // Filtrar pedidos por estado
  const pendingOrders = orders.filter(o => o.status === 'pendiente');
  const completedOrders = orders.filter(o => o.status === 'completada');
  const canceledOrders = orders.filter(o => o.status === 'cancelada');

  const renderOrderCard = (order: Sale) => {
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

                    {order.status === 'cancelada' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteOrder(order.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pedidos Web</h1>
          <p className="text-gray-500">Gestiona los pedidos de tu tienda online</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="h-4 w-4 mr-1" />
            {pendingOrders.length} Pendientes
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pendiente" className="relative">
              Pendientes
              {pendingOrders.length > 0 && (
                <Badge className="ml-2 bg-yellow-600">{pendingOrders.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completada" className="relative">
              Completados
              {completedOrders.length > 0 && (
                <Badge className="ml-2 bg-green-600">{completedOrders.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cancelada" className="relative">
              Cancelados
              {canceledOrders.length > 0 && (
                <Badge className="ml-2 bg-red-600">{canceledOrders.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendiente" className="space-y-4 mt-6">
            {pendingOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Clock className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    No hay pedidos pendientes
                  </h3>
                  <p className="text-gray-500">
                    Los nuevos pedidos aparecerán aquí
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingOrders.map(renderOrderCard)
            )}
          </TabsContent>

          <TabsContent value="completada" className="space-y-4 mt-6">
            {completedOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CheckCircle className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    No hay pedidos completados
                  </h3>
                  <p className="text-gray-500">
                    Los pedidos confirmados aparecerán aquí
                  </p>
                </CardContent>
              </Card>
            ) : (
              completedOrders.map(renderOrderCard)
            )}
          </TabsContent>

          <TabsContent value="cancelada" className="space-y-4 mt-6">
            {canceledOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <XCircle className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    No hay pedidos cancelados
                  </h3>
                  <p className="text-gray-500">
                    Los pedidos rechazados aparecerán aquí
                  </p>
                </CardContent>
              </Card>
            ) : (
              canceledOrders.map(renderOrderCard)
            )}
          </TabsContent>
        </Tabs>
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
