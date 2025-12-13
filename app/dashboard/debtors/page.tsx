'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { DollarSign, Users, Eye, Search, Filter, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Customer } from '@/lib/types';
import { getDebtorCustomers } from '@/lib/cloudflare-credit-helpers';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DebtorsPage() {
  const { getToken } = useAuth();
  const [debtors, setDebtors] = useState<Customer[]>([]);
  const [filteredDebtors, setFilteredDebtors] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalDebt, setTotalDebt] = useState(0);

  useEffect(() => {
    const fetchDebtors = async () => {
      try {
        setLoading(true);
        const data = await getDebtorCustomers(getToken);
        setDebtors(data);
        setFilteredDebtors(data);

        // Calcular deuda total
        const total = data.reduce((sum, debtor) => sum + (debtor.current_debt || 0), 0);
        setTotalDebt(total);
      } catch (error) {
        console.error('Error fetching debtors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDebtors();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredDebtors(debtors);
    } else {
      const filtered = debtors.filter(
        (debtor) =>
          debtor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          debtor.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          debtor.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDebtors(filtered);
    }
  }, [searchTerm, debtors]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Clientes Deudores</h1>
          <p className="text-gray-500 text-sm md:text-base">
            Gestiona las cuentas por cobrar
          </p>
        </div>
      </div>

      {/* Resumen de deuda total */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deuda Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalDebt.toLocaleString('es-CO')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes con Deuda</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{debtors.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deuda Promedio</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${debtors.length > 0 ? Math.round(totalDebt / debtors.length).toLocaleString('es-CO') : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar cliente por nombre, teléfono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de deudores */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando deudores...</p>
            </div>
          ) : filteredDebtors.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500">
                {searchTerm
                  ? 'No se encontraron deudores con ese criterio'
                  : 'No hay clientes con deuda pendiente'}
              </p>
            </div>
          ) : (
            <>
              {/* Vista de tabla para desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Nombre</th>
                      <th className="text-left py-3 px-4">Contacto</th>
                      <th className="text-right py-3 px-4">Límite de Crédito</th>
                      <th className="text-right py-3 px-4">Deuda Actual</th>
                      <th className="text-right py-3 px-4">Crédito Disponible</th>
                      <th className="text-center py-3 px-4">Estado</th>
                      <th className="text-center py-3 px-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDebtors.map((debtor) => {
                      const creditLimit = debtor.credit_limit || 0;
                      const currentDebt = debtor.current_debt || 0;
                      const availableCredit = creditLimit - currentDebt;
                      const debtPercentage = creditLimit > 0 ? (currentDebt / creditLimit) * 100 : 0;

                      return (
                        <tr key={debtor.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{debtor.name}</td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              {debtor.phone && <div>{debtor.phone}</div>}
                              {debtor.email && (
                                <div className="text-gray-500 truncate max-w-[200px]">
                                  {debtor.email}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {creditLimit > 0 ? `$${creditLimit.toLocaleString('es-CO')}` : 'Sin límite'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-semibold text-red-600">
                              ${currentDebt.toLocaleString('es-CO')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={availableCredit > 0 ? 'text-green-600' : creditLimit === 0 ? 'text-blue-600' : 'text-red-600'}>
                              {creditLimit === 0 ? 'Ilimitado' : `$${availableCredit.toLocaleString('es-CO')}`}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-semibold ${
                                creditLimit === 0
                                  ? 'bg-blue-100 text-blue-800'
                                  : debtPercentage >= 90
                                  ? 'bg-red-100 text-red-800'
                                  : debtPercentage >= 70
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {creditLimit === 0
                                ? 'Sin Límite'
                                : debtPercentage >= 90
                                ? 'Crítico'
                                : debtPercentage >= 70
                                ? 'Alerta'
                                : 'Normal'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link href={`/dashboard/debtors/${debtor.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Detalle
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vista de cards para móvil */}
              <div className="md:hidden space-y-3">
                {filteredDebtors.map((debtor) => {
                  const creditLimit = debtor.credit_limit || 0;
                  const currentDebt = debtor.current_debt || 0;
                  const availableCredit = creditLimit - currentDebt;
                  const debtPercentage = creditLimit > 0 ? (currentDebt / creditLimit) * 100 : 0;

                  return (
                    <Card key={debtor.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-base">{debtor.name}</h3>
                          <span
                            className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-semibold ${
                              creditLimit === 0
                                ? 'bg-blue-100 text-blue-800'
                                : debtPercentage >= 90
                                ? 'bg-red-100 text-red-800'
                                : debtPercentage >= 70
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {creditLimit === 0
                              ? 'Sin Límite'
                              : debtPercentage >= 90
                              ? 'Crítico'
                              : debtPercentage >= 70
                              ? 'Alerta'
                              : 'Normal'}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm mb-3">
                          {debtor.phone && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Teléfono:</span>
                              <span>{debtor.phone}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-500">Límite:</span>
                            <span>{creditLimit > 0 ? `$${creditLimit.toLocaleString('es-CO')}` : 'Sin límite'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Deuda:</span>
                            <span className="font-semibold text-red-600">
                              ${currentDebt.toLocaleString('es-CO')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Disponible:</span>
                            <span className={availableCredit > 0 ? 'text-green-600' : creditLimit === 0 ? 'text-blue-600' : 'text-red-600'}>
                              {creditLimit === 0 ? 'Ilimitado' : `$${availableCredit.toLocaleString('es-CO')}`}
                            </span>
                          </div>
                        </div>
                        <Link href={`/dashboard/debtors/${debtor.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Detalle y Pagos
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
