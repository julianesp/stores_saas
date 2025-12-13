'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCustomerById } from '@/lib/cloudflare-api';
import { getCustomerPurchaseHistory } from '@/lib/loyalty-helpers';
import { Customer, CustomerPurchaseHistory } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, User, Mail, Phone, MapPin, Award, ShoppingBag, Calendar, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function CustomerDetailPage() {
  const { getToken } = useAuth();

  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<CustomerPurchaseHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      const customerData = await getCustomerById(customerId, getToken);
      setCustomer(customerData as Customer);

      const history = await getCustomerPurchaseHistory(customerId) as any;
      setPurchaseHistory(history);
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando información del cliente...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cliente no encontrado</p>
      </div>
    );
  }

  const totalSpent = purchaseHistory.reduce((sum, purchase) => sum + purchase.total, 0);
  const totalPurchases = purchaseHistory.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{customer.name}</h1>
          <p className="text-gray-500">Detalles del cliente e historial de compras</p>
        </div>
      </div>

      {/* Información del Cliente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{customer.address}</span>
              </div>
            )}
            {customer.id_number && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">ID:</span>
                <span>{customer.id_number}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Puntos de Lealtad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-yellow-600">
              {customer.loyalty_points}
            </div>
            <p className="text-sm text-gray-500 mt-1">Puntos acumulados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              Estadísticas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-gray-500">Total comprado</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(totalSpent)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Número de compras</p>
              <p className="text-xl font-bold">{totalPurchases}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historial de Compras */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Historial de Compras ({purchaseHistory.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {purchaseHistory.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500">Este cliente no ha realizado compras aún</p>
            </div>
          ) : (
            <div className="space-y-4">
              {purchaseHistory.map((purchase) => (
                <Card key={purchase.sale_id} className="bg-gray-50">
                  <CardContent className="pt-4">
                    {/* Encabezado de la compra */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 pb-4 border-b">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-blue-600">
                            {purchase.sale_number}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                            Completada
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(purchase.date).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-4 w-4" />
                            {purchase.payment_method}
                          </div>
                        </div>
                      </div>
                      <div className="text-right mt-2 md:mt-0">
                        <p className="text-sm text-gray-500">Total</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(purchase.total)}
                        </p>
                        {purchase.points_earned > 0 && (
                          <p className="text-sm text-yellow-600 font-medium">
                            +{purchase.points_earned} puntos
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Lista de productos */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Productos comprados:</p>
                      <div className="space-y-2">
                        {purchase.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between bg-white p-3 rounded border"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {item.product?.name || 'Producto desconocido'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatCurrency(item.unit_price)} x {item.quantity} unidad(es)
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-blue-600">
                                {formatCurrency(item.subtotal)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
