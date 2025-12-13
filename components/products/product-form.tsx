'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCategories, getSuppliers, createProduct, updateProduct, createCategory, createSupplier } from '@/lib/cloudflare-api';
import { Category, Supplier } from '@/lib/types';
import { toast } from 'sonner';
import { Scan, Camera, X, Plus } from 'lucide-react';
import { ImageUploader } from './image-uploader';
import dynamic from 'next/dynamic';

// Importar el escáner de códigos de barras de forma dinámica (solo en cliente)
const BarcodeScannerComponent = dynamic(
  () => import('react-qr-barcode-scanner'),
  { ssr: false }
) as any;

const productSchema = z.object({
  barcode: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  category_id: z.string().optional(),
  supplier_id: z.string().optional(),
  cost_price: z.number().min(0, 'El precio de compra debe ser mayor a 0'),
  sale_price: z.number().min(0, 'El precio de venta debe ser mayor a 0'),
  stock: z.number().int().min(0, 'La cantidad disponible debe ser mayor o igual a 0'),
  min_stock: z.number().int().min(0, 'El mínimo disponible debe ser mayor o igual a 0'),
  expiration_date: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: any;
  productId?: string;
}

export function ProductForm({ initialData, productId }: ProductFormProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productImages, setProductImages] = useState<string[]>(initialData?.images || []);
  const [showScanner, setShowScanner] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSupplierData, setNewSupplierData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || {
      stock: 0,
      min_stock: 10,
    },
  });

  const handleBarcodeDetected = (data: string) => {
    if (data) {
      setValue('barcode', data);
      setShowScanner(false);
      toast.success('Código escaneado correctamente');
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await getCategories(getToken) as Category[];
      // Ordenar por nombre manualmente
      data.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const data = await getSuppliers(getToken) as Supplier[];
      data.sort((a, b) => a.name.localeCompare(b.name));
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Error al cargar proveedores');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('El nombre de la categoría es requerido');
      return;
    }

    try {
      const newCategory = await createCategory({ name: newCategoryName.trim() }, getToken) as Category;
      toast.success('Categoría creada correctamente');
      await fetchCategories();
      setValue('category_id', newCategory.id);
      setNewCategoryName('');
      setShowNewCategory(false);
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Error al crear la categoría');
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierData.name.trim()) {
      toast.error('El nombre del proveedor es requerido');
      return;
    }

    try {
      const supplierData: any = {
        name: newSupplierData.name.trim(),
        phone: newSupplierData.phone.trim() || undefined,
        email: newSupplierData.email.trim() || undefined,
      };
      const newSupplier = await createSupplier(supplierData, getToken) as Supplier;
      toast.success('Proveedor creado correctamente');
      await fetchSuppliers();
      setValue('supplier_id', newSupplier.id);
      setNewSupplierData({ name: '', phone: '', email: '' });
      setShowNewSupplier(false);
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast.error('Error al crear el proveedor');
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    try {
      // Incluir las imágenes en los datos
      const productData: any = {
        ...data,
        images: productImages,
      };

      if (productId) {
        await updateProduct(productId, productData, getToken);
        toast.success('Producto actualizado correctamente');
      } else {
        await createProduct(productData, getToken);
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
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="barcode"
                    {...register('barcode', {
                      setValueAs: (value) => value?.trim() || undefined,
                    })}
                    placeholder="Escanea o escribe el código"
                    className="pr-10"
                    autoFocus={!productId}
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <Scan className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="shrink-0 bg-blue-600 hover:bg-blue-700"
                  size="default"
                >
                  <Camera className="h-5 w-5 md:mr-2" />
                  <span className="hidden md:inline">Escanear</span>
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Toca el botón de la cámara para escanear con tu móvil
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
            {/* Categoría */}
            <div className="space-y-2">
              <Label htmlFor="category_id">Categoría</Label>
              {!showNewCategory ? (
                <div className="flex gap-2">
                  <select
                    id="category_id"
                    {...register('category_id')}
                    className="flex-1 h-9 rounded-md border border-gray-300 px-3 text-sm"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    title="Crear nueva categoría"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Nueva Categoría</span>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowNewCategory(false);
                        setNewCategoryName('');
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Nombre de la categoría"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCategory();
                      }
                    }}
                    className="h-8"
                  />
                  <Button
                    type="button"
                    onClick={handleCreateCategory}
                    size="sm"
                    className="w-full h-8"
                  >
                    Crear Categoría
                  </Button>
                </div>
              )}
            </div>

            {/* Proveedor */}
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Proveedor</Label>
              {!showNewSupplier ? (
                <div className="flex gap-2">
                  <select
                    id="supplier_id"
                    {...register('supplier_id')}
                    className="flex-1 h-9 rounded-md border border-gray-300 px-3 text-sm"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={() => setShowNewSupplier(true)}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    title="Crear nuevo proveedor"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-900">Nuevo Proveedor</span>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowNewSupplier(false);
                        setNewSupplierData({ name: '', phone: '', email: '' });
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Nombre del proveedor *"
                    value={newSupplierData.name}
                    onChange={(e) => setNewSupplierData({ ...newSupplierData, name: e.target.value })}
                    className="h-8"
                  />
                  <Input
                    placeholder="Teléfono"
                    value={newSupplierData.phone}
                    onChange={(e) => setNewSupplierData({ ...newSupplierData, phone: e.target.value })}
                    className="h-8"
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={newSupplierData.email}
                    onChange={(e) => setNewSupplierData({ ...newSupplierData, email: e.target.value })}
                    className="h-8"
                  />
                  <Button
                    type="button"
                    onClick={handleCreateSupplier}
                    size="sm"
                    className="w-full h-8"
                  >
                    Crear Proveedor
                  </Button>
                </div>
              )}
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
              <Label htmlFor="stock">Cantidad Disponible *</Label>
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
              <Label htmlFor="min_stock">Mínimo Disponible *</Label>
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

      <Card>
        <CardHeader>
          <CardTitle>Imagen del Producto</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploader
            productId={productId}
            initialImages={productImages}
            onChange={setProductImages}
            maxImages={1}
          />
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

      {/* Modal del Escáner de Códigos de Barras */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full overflow-hidden">
            <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-6 w-6" />
                <h2 className="text-xl font-bold">Escanear Código de Barras</h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowScanner(false)}
                className="text-white hover:bg-blue-700"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4 text-center">
                Apunta la cámara hacia el código de barras del producto
              </p>
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                {typeof window !== 'undefined' && (
                  <BarcodeScannerComponent
                    onUpdate={(err: any, result: any) => {
                      if (result) {
                        handleBarcodeDetected(result.getText());
                      }
                    }}
                  />
                )}
              </div>
              <div className="mt-4 text-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowScanner(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
