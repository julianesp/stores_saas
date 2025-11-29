'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-gray-500">Gestiona tu base de clientes</p>
        </div>
        <Link href="/dashboard/customers/new">
          <Button><Plus className="mr-2 h-4 w-4" />Nuevo Cliente</Button>
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
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Nombre</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Teléfono</th>
                  <th className="text-right py-3 px-4">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{c.name}</td>
                    <td className="py-3 px-4">{c.email || '-'}</td>
                    <td className="py-3 px-4">{c.phone || '-'}</td>
                    <td className="py-3 px-4 text-right">{c.loyalty_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
