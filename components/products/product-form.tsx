'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllDocuments, createDocument, updateDocument } from '@/lib/firestore-helpers';
import { Category, Supplier } from '@/lib/types';
import { toast } from 'sonner';
import { Scan } from 'lucide-react';

const productSchema = z.object({
  barcode: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  category_id: z.string().optional(),
  supplier_id: z.string().optional(),
  cost_price: z.number().min(0, 'El precio de compra debe ser mayor a 0'),
  sale_price: z.number().min(0, 'El precio de venta debe ser mayor a 0'),
  stock: z.number().int().min(0, 'El stock debe ser mayor o igual a 0'),
  min_stock: z.number().int().min(0, 'El stock mínimo debe ser mayor o igual a 0'),
  expiration_date: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: any;
  productId?: string;
}

export function ProductForm({ initialData, productId }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || {
      stock: 0,
      min_stock: 10,
    },
  });

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await getAllDocuments('categories') as Category[];
      // Ordenar por nombre manualmente
      data.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const data = await getAllDocuments('suppliers') as Supplier[];
      // Ordenar por nombre manualmente
      data.sort((a, b) => a.name.localeCompare(b.name));
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    try {
      if (productId) {
        await updateDocument('products', productId, data);
        toast.success('Producto actualizado correctamente');
      } else {
        await createDocument('products', data);
        toast.success('Producto creado correctamente');
      }

      router.push('/dashboard/products');
      router.refresh();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Error al guardar producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barcode" className="flex items-center gap-2">
                <Scan className="h-4 w-4 text-blue-600" />
                Código de Barras
              </Label>
              <div className="relative">
                <Input
                  id="barcode"
                  {...register('barcode', {
                    setValueAs: (value) => value?.trim() || undefined,
                  })}
                  placeholder="Escanea o escribe el código de barras"
                  className="pr-10"
                  autoFocus={!productId}
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <Scan className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Usa un lector de códigos de barras o escribe manualmente
              </p>
              {errors.barcode && (
                <p className="text-sm text-red-600">{errors.barcode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Nombre del producto"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              {...register('description')}
              className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Descripción del producto..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">Categoría</Label>
              <select
                id="category_id"
                {...register('category_id')}
                className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
              >
                <option value="">Seleccionar categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_id">Proveedor</Label>
              <select
                id="supplier_id"
                {...register('supplier_id')}
                className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
              >
                <option value="">Seleccionar proveedor</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Precios e Inventario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_price">Precio de Compra *</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                {...register('cost_price', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.cost_price && (
                <p className="text-sm text-red-600">{errors.cost_price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale_price">Precio de Venta *</Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                {...register('sale_price', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.sale_price && (
                <p className="text-sm text-red-600">{errors.sale_price.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Stock Actual *</Label>
              <Input
                id="stock"
                type="number"
                {...register('stock', { valueAsNumber: true })}
                placeholder="0"
              />
              {errors.stock && (
                <p className="text-sm text-red-600">{errors.stock.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_stock">Stock Mínimo *</Label>
              <Input
                id="min_stock"
                type="number"
                {...register('min_stock', { valueAsNumber: true })}
                placeholder="10"
              />
              {errors.min_stock && (
                <p className="text-sm text-red-600">{errors.min_stock.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiration_date">Fecha de Vencimiento</Label>
            <Input
              id="expiration_date"
              type="date"
              {...register('expiration_date')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : productId ? 'Actualizar' : 'Crear'} Producto
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
