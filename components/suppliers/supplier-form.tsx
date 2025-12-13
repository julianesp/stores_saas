'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createSupplier, updateSupplier } from '@/lib/cloudflare-api';
import { toast } from 'sonner';

interface SupplierFormProps {
  initialData?: any;
  supplierId?: string;
}

export function SupplierForm({ initialData, supplierId }: SupplierFormProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: initialData || {
      payment_type: 'contado',
      status: 'activo',
      credit_days: 0,
      credit_limit: 0,
      default_discount: 0,
      delivery_days: 0,
      minimum_order: 0,
      rating: 0,
    }
  });

  const paymentType = watch('payment_type');

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Convertir valores numéricos
      const supplierData = {
        ...data,
        credit_days: Number(data.credit_days) || 0,
        credit_limit: Number(data.credit_limit) || 0,
        default_discount: Number(data.default_discount) || 0,
        delivery_days: Number(data.delivery_days) || 0,
        minimum_order: Number(data.minimum_order) || 0,
        rating: data.rating ? Number(data.rating) : null,
      };

      if (supplierId) {
        await updateSupplier(supplierId, supplierData, getToken);
        toast.success('Proveedor actualizado');
      } else {
        await createSupplier(supplierData, getToken);
        toast.success('Proveedor creado');
      }
      router.push('/dashboard/suppliers');
      router.refresh();
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      toast.error(error.message || 'Error al guardar proveedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Información Básica */}
      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Proveedor *</Label>
              <Input id="name" {...register('name', { required: true })} placeholder="Ej: Distribuidora ABC" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Persona de Contacto</Label>
              <Input id="contact_name" {...register('contact_name')} placeholder="Ej: Juan Pérez" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} placeholder="correo@ejemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...register('phone')} placeholder="300 123 4567" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" {...register('city')} placeholder="Ej: Bogotá" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" {...register('address')} placeholder="Calle 123 #45-67" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información Comercial */}
      <Card>
        <CardHeader>
          <CardTitle>Información Comercial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tax_id">NIT / RUT</Label>
              <Input id="tax_id" {...register('tax_id')} placeholder="123456789-0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_type">Tipo de Pago *</Label>
              <select
                id="payment_type"
                {...register('payment_type')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="contado">Contado</option>
                <option value="credito">Crédito</option>
              </select>
            </div>
          </div>
          {paymentType === 'credito' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="credit_days">Días de Crédito</Label>
                <Input
                  id="credit_days"
                  type="number"
                  min="0"
                  {...register('credit_days')}
                  placeholder="30"
                />
                <p className="text-xs text-gray-500">Días de plazo que otorga el proveedor</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit_limit">Límite de Crédito ($)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('credit_limit')}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500">Cupo máximo disponible con este proveedor</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default_discount">Descuento Habitual (%)</Label>
              <Input
                id="default_discount"
                type="number"
                min="0"
                max="100"
                step="0.01"
                {...register('default_discount')}
                placeholder="0"
              />
              <p className="text-xs text-gray-500">Descuento que usualmente otorga el proveedor</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minimum_order">Pedido Mínimo ($)</Label>
              <Input
                id="minimum_order"
                type="number"
                min="0"
                step="0.01"
                {...register('minimum_order')}
                placeholder="0"
              />
              <p className="text-xs text-gray-500">Monto mínimo de compra requerido</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información de Contacto Extendida */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Contacto Extendida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">Sitio Web</Label>
              <Input id="website" {...register('website')} placeholder="https://www.ejemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" {...register('whatsapp')} placeholder="300 123 4567" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business_hours">Horario de Atención</Label>
              <Input id="business_hours" {...register('business_hours')} placeholder="Lun-Vie 8am-5pm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit_day">Día de Visita del Vendedor</Label>
              <select
                id="visit_day"
                {...register('visit_day')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Sin día fijo</option>
                <option value="lunes">Lunes</option>
                <option value="martes">Martes</option>
                <option value="miércoles">Miércoles</option>
                <option value="jueves">Jueves</option>
                <option value="viernes">Viernes</option>
                <option value="sábado">Sábado</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Control y Evaluación */}
      <Card>
        <CardHeader>
          <CardTitle>Control y Evaluación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Estado *</Label>
              <select
                id="status"
                {...register('status')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="suspendido">Suspendido</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery_days">Días de Entrega</Label>
              <Input
                id="delivery_days"
                type="number"
                min="0"
                {...register('delivery_days')}
                placeholder="0"
              />
              <p className="text-xs text-gray-500">Días que toma entregar el pedido</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Calificación (1-5)</Label>
              <Input
                id="rating"
                type="number"
                min="1"
                max="5"
                step="0.1"
                {...register('rating')}
                placeholder="5"
              />
              <p className="text-xs text-gray-500">Tu evaluación del proveedor</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notas */}
      <Card>
        <CardHeader>
          <CardTitle>Notas Adicionales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              {...register('notes')}
              className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Información adicional sobre el proveedor..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : supplierId ? 'Actualizar Proveedor' : 'Crear Proveedor'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
