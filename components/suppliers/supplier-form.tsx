'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createDocument, updateDocument } from '@/lib/firestore-helpers';
import { toast } from 'sonner';

interface SupplierFormProps {
  initialData?: any;
  supplierId?: string;
}

export function SupplierForm({ initialData, supplierId }: SupplierFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm({ defaultValues: initialData || {} });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      if (supplierId) {
        await updateDocument('suppliers', supplierId, data);
        toast.success('Proveedor actualizado');
      } else {
        await createDocument('suppliers', data);
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
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Información del Proveedor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" {...register('name', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Persona de Contacto</Label>
              <Input id="contact_name" {...register('contact_name')} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...register('phone')} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" {...register('city')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" {...register('address')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              {...register('notes')}
              className="w-full min-h-[80px] rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-4 mt-6">
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : supplierId ? 'Actualizar' : 'Crear'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
