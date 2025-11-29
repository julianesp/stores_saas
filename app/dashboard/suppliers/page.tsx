'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { getAllDocuments, deleteDocument } from '@/lib/firestore-helpers';
import { Supplier } from '@/lib/types';
import { toast } from 'sonner';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const data = await getAllDocuments('suppliers') as Supplier[];
      // Ordenar por nombre manualmente
      data.sort((a, b) => a.name.localeCompare(b.name));
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;

    try {
      await deleteDocument('suppliers', id);
      toast.success('Proveedor eliminado');
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Error al eliminar proveedor');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Proveedores</h1>
          <p className="text-gray-500">Gestiona tus proveedores</p>
        </div>
        <Link href="/dashboard/suppliers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proveedor
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">Cargando proveedores...</div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay proveedores registrados</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suppliers.map((supplier) => (
                <Card key={supplier.id} className="border-2">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{supplier.name}</h3>
                        {supplier.contact_name && (
                          <p className="text-sm text-gray-500">Contacto: {supplier.contact_name}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Link href={`/dashboard/suppliers/${supplier.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSupplier(supplier.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {supplier.email && <p>Email: {supplier.email}</p>}
                    {supplier.phone && <p>Teléfono: {supplier.phone}</p>}
                    {supplier.city && <p>Ciudad: {supplier.city}</p>}
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
