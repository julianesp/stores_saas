'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getCustomerById, getUserProfile } from '@/lib/cloudflare-api';
import {
  getCustomerCreditSales,
  getCreditPaymentHistory,
  registerCreditPayment,
  updateCustomerCreditLimit,
} from '@/lib/cloudflare-credit-helpers';
import { Customer, Sale, UserProfile } from '@/lib/types';
import type { CreditPaymentData } from '@/lib/cloudflare-api';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Receipt,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Swal from 'sweetalert2';

export default function DebtorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const customerId = params.id as string;

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [creditSales, setCreditSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<CreditPaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreditLimitModal, setShowCreditLimitModal] = useState(false);

  // Form states
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>(
    'efectivo'
  );
  const [paymentNotes, setPaymentNotes] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('');

  useEffect(() => {
    loadDebtorData();
  }, [customerId]);

  const loadDebtorData = async () => {
    try {
      setLoading(true);

      // Load user profile if not already loaded
      if (!userProfile) {
        const profile = await getUserProfile(getToken);
        setUserProfile(profile);
      }

      const customerData = await getCustomerById(customerId, getToken);
      setCustomer(customerData);

      const sales = await getCustomerCreditSales(customerId, getToken);
      setCreditSales(sales);
    } catch (error) {
      console.error('Error loading debtor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaleClick = async (sale: Sale) => {
    setSelectedSale(sale);
    const history = await getCreditPaymentHistory(sale.id, getToken);
    setPaymentHistory(history);
    setShowPaymentModal(true);
    setPaymentAmount(sale.amount_pending?.toString() || '0');
  };

  const handleRegisterPayment = async () => {
    if (!selectedSale || !userProfile) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El monto debe ser mayor a cero',
      });
      return;
    }

    if (amount > (selectedSale.amount_pending || 0)) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El monto no puede ser mayor al saldo pendiente',
      });
      return;
    }

    try {
      await registerCreditPayment(
        selectedSale.id,
        customerId,
        amount,
        paymentMethod,
        userProfile.id,
        paymentNotes,
        getToken
      );

      Swal.fire({
        icon: 'success',
        title: 'Pago registrado',
        text: 'El pago se ha registrado correctamente',
      });

      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNotes('');
      loadDebtorData();
    } catch (error) {
      console.error('Error registering payment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo registrar el pago',
      });
    }
  };

  const handleUpdateCreditLimit = async () => {
    if (!customer) return;

    const limit = parseFloat(newCreditLimit);
    if (isNaN(limit) || limit < 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El límite debe ser un número válido',
      });
      return;
    }

    try {
      await updateCustomerCreditLimit(customerId, limit, getToken);

      Swal.fire({
        icon: 'success',
        title: 'Límite actualizado',
        text: 'El límite de crédito se ha actualizado correctamente',
      });

      setShowCreditLimitModal(false);
      setNewCreditLimit('');
      loadDebtorData();
    } catch (error) {
      console.error('Error updating credit limit:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el límite de crédito',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando información...</p>
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

  const creditLimit = customer.credit_limit || 0;
  const currentDebt = customer.current_debt || 0;
  const availableCredit = creditLimit - currentDebt;
  const debtPercentage = creditLimit > 0 ? (currentDebt / creditLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{customer.name}</h1>
          <p className="text-gray-500">Detalles del deudor y gestión de pagos</p>
        </div>
      </div>

      {/* Información del Cliente */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Información
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="truncate">{customer.email}</span>
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
                <span className="truncate">{customer.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Límite de Crédito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              ${creditLimit.toLocaleString('es-CO')}
            </div>
            <Button
              variant="link"
              className="p-0 h-auto text-xs"
              onClick={() => {
                setNewCreditLimit(creditLimit.toString());
                setShowCreditLimitModal(true);
              }}
            >
              Modificar límite
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-red-600" />
              Deuda Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              ${currentDebt.toLocaleString('es-CO')}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {debtPercentage.toFixed(0)}% del límite
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Crédito Disponible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${availableCredit > 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${availableCredit.toLocaleString('es-CO')}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {(100 - debtPercentage).toFixed(0)}% disponible
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estado del crédito */}
      {debtPercentage >= 90 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Crédito Crítico</h3>
                <p className="text-sm text-red-700">
                  Este cliente ha alcanzado el {debtPercentage.toFixed(0)}% de su límite de crédito
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ventas a crédito pendientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Ventas a Crédito Pendientes ({creditSales.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {creditSales.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
              <p className="text-gray-500">No tiene ventas a crédito pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {creditSales.map((sale) => (
                <div
                  key={sale.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleSaleClick(sale)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">Venta #{sale.sale_number}</h3>
                      <p className="text-sm text-gray-500">
                        {format(new Date(sale.created_at), 'PPP', { locale: es })}
                      </p>
                      {sale.due_date && (
                        <p className="text-sm text-orange-600">
                          Vence: {format(new Date(sale.due_date), 'PPP', { locale: es })}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        sale.payment_status === 'pendiente'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {sale.payment_status === 'pendiente' ? 'Pendiente' : 'Pago Parcial'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total</p>
                      <p className="font-semibold">${sale.total.toLocaleString('es-CO')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pagado</p>
                      <p className="font-semibold text-green-600">
                        ${(sale.amount_paid || 0).toLocaleString('es-CO')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pendiente</p>
                      <p className="font-semibold text-red-600">
                        ${(sale.amount_pending || 0).toLocaleString('es-CO')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de registro de pago */}
      {showPaymentModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Registrar Pago - Venta #{selectedSale.sale_number}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Información de la venta */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="font-semibold">${selectedSale.total.toLocaleString('es-CO')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pagado</p>
                  <p className="font-semibold text-green-600">
                    ${(selectedSale.amount_paid || 0).toLocaleString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pendiente</p>
                  <p className="font-semibold text-red-600">
                    ${(selectedSale.amount_pending || 0).toLocaleString('es-CO')}
                  </p>
                </div>
              </div>

              {/* Historial de pagos */}
              {paymentHistory.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Historial de Pagos</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium">
                            ${payment.amount.toLocaleString('es-CO')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {payment.created_at ? format(new Date(payment.created_at), 'PPp', { locale: es }) : 'N/A'}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {payment.payment_method}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulario de pago */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Monto a Pagar</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1000"
                  />
                </div>

                <div>
                  <Label htmlFor="payment_method">Método de Pago</Label>
                  <select
                    id="payment_method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Agregar notas sobre el pago..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleRegisterPayment} className="flex-1">
                  Registrar Pago
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentAmount('');
                    setPaymentNotes('');
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de límite de crédito */}
      {showCreditLimitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Modificar Límite de Crédito</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="credit_limit">Nuevo Límite de Crédito</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="10000"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Límite actual: ${creditLimit.toLocaleString('es-CO')}
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleUpdateCreditLimit} className="flex-1">
                  Actualizar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreditLimitModal(false);
                    setNewCreditLimit('');
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
