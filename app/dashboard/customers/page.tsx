'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Users, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getAllDocuments } from '@/lib/firestore-helpers';
import { Customer } from '@/lib/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await getAllDocuments('customers') as Customer[];
        // Ordenar por nombre manualmente
        data.sort((a, b) => a.name.localeCompare(b.name));
        setCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    };
    fetchCustomers();
  }, []);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Clientes</h1>
          <p className="text-gray-500 text-sm md:text-base">Gestiona tu base de clientes</p>
        </div>
        <Link href="/dashboard/customers/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />Nuevo Cliente</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          {customers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500">No hay clientes registrados</p>
            </div>
          ) : (
            <>
              {/* Vista de tabla para desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Nombre</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Teléfono</th>
                      <th className="text-right py-3 px-4">Puntos</th>
                      <th className="text-center py-3 px-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{c.name}</td>
                        <td className="py-3 px-4">{c.email || '-'}</td>
                        <td className="py-3 px-4">{c.phone || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center justify-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-semibold">
                            {c.loyalty_points}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link href={`/dashboard/customers/${c.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Ver Detalles
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista de cards para móvil */}
              <div className="md:hidden space-y-3">
                {customers.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-base mb-2">{c.name}</h3>
                      <div className="space-y-1 text-sm mb-3">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Email:</span>
                          <span className="truncate ml-2">{c.email || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Teléfono:</span>
                          <span>{c.phone || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Puntos:</span>
                          <span className="inline-flex items-center justify-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-semibold">
                            {c.loyalty_points}
                          </span>
                        </div>
                      </div>
                      <Link href={`/dashboard/customers/${c.id}`} className="block">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Historial de Compras
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
