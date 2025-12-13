'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Plus, Edit, Trash2, Truck, Star, MapPin, Phone, Mail, Globe, Calendar, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSuppliers, deleteSupplier } from '@/lib/cloudflare-api';
import { Supplier } from '@/lib/types';
import { toast } from 'sonner';

export default function SuppliersPage() {
  const { getToken } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const data = await getSuppliers(getToken);
      // Ordenar por nombre
      data.sort((a, b) => a.name.localeCompare(b.name));
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el proveedor "${name}"?`)) return;

    try {
      await deleteSupplier(id, getToken);
      toast.success('Proveedor eliminado');
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Error al eliminar proveedor');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      activo: 'default',
      inactivo: 'secondary',
      suspendido: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
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
              <Link href="/dashboard/suppliers/new">
                <Button className="mt-4" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primer Proveedor
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suppliers.map((supplier) => (
                <Card key={supplier.id} className="border-2 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{supplier.name}</h3>
                          {supplier.rating && renderStars(supplier.rating)}
                        </div>
                        {supplier.contact_name && (
                          <p className="text-sm text-gray-600">
                            <Phone className="h-3 w-3 inline mr-1" />
                            {supplier.contact_name}
                          </p>
                        )}
                        <div className="mt-2">
                          {getStatusBadge(supplier.status)}
                          {supplier.payment_type === 'credito' && (
                            <Badge variant="outline" className="ml-2">
                              Crédito {supplier.credit_days}d
                            </Badge>
                          )}
                        </div>
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
                          onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {supplier.tax_id && (
                      <p className="text-gray-600">
                        <span className="font-medium">NIT:</span> {supplier.tax_id}
                      </p>
                    )}
                    {supplier.email && (
                      <p className="text-gray-600 truncate">
                        <Mail className="h-3 w-3 inline mr-1" />
                        {supplier.email}
                      </p>
                    )}
                    {supplier.phone && (
                      <p className="text-gray-600">
                        <Phone className="h-3 w-3 inline mr-1" />
                        {supplier.phone}
                      </p>
                    )}
                    {supplier.city && (
                      <p className="text-gray-600">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        {supplier.city}
                      </p>
                    )}
                    {supplier.website && (
                      <p className="text-gray-600 truncate">
                        <Globe className="h-3 w-3 inline mr-1" />
                        <a
                          href={supplier.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {supplier.website.replace(/^https?:\/\//, '')}
                        </a>
                      </p>
                    )}
                    {supplier.visit_day && (
                      <p className="text-gray-600">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Visita: {supplier.visit_day.charAt(0).toUpperCase() + supplier.visit_day.slice(1)}
                      </p>
                    )}
                    {supplier.delivery_days > 0 && (
                      <p className="text-gray-600">
                        <Truck className="h-3 w-3 inline mr-1" />
                        Entrega: {supplier.delivery_days} día{supplier.delivery_days > 1 ? 's' : ''}
                      </p>
                    )}
                    {supplier.default_discount > 0 && (
                      <p className="text-green-600 font-medium">
                        Descuento habitual: {supplier.default_discount}%
                      </p>
                    )}
                    {supplier.payment_type === 'credito' && supplier.credit_limit > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-500">
                          Cupo disponible: ${((supplier.credit_limit || 0) - (supplier.current_debt || 0)).toLocaleString()}
                        </p>
                      </div>
                    )}
                    <div className="pt-3 border-t mt-3">
                      <Link href={`/dashboard/suppliers/${supplier.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          <Package className="h-4 w-4 mr-2" />
                          Ver Productos
                        </Button>
                      </Link>
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
