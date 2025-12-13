'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { ShoppingCart, Plus, Trash2, Edit, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SupplierForm } from '@/components/suppliers/supplier-form';
import { getSupplierById, getSupplierProducts, deleteProduct } from '@/lib/cloudflare-api';
import type { Supplier, Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function EditSupplierPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    fetchSupplier();
    fetchProducts();
  }, [params.id]);

  const fetchSupplier = async () => {
    try {
      const data = await getSupplierById(params.id as string, getToken);
      setSupplier(data);
    } catch (error) {
      console.error('Error fetching supplier:', error);
      toast.error('Error al cargar proveedor');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const data = await getSupplierProducts(params.id as string, getToken);
      // Normalizar el campo images para compatibilidad
      const normalizedProducts = data.map(p => ({
        ...p,
        images: Array.isArray(p.images)
          ? p.images
          : p.images
            ? [p.images]
            : p.image_url
              ? [p.image_url]
              : undefined,
      }));
      setProducts(normalizedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${productName}" del catálogo de este proveedor?`)) return;

    try {
      await deleteProduct(productId, getToken);
      toast.success('Producto eliminado');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar producto');
    }
  };

  if (loading) return <div className="py-8 text-center">Cargando...</div>;
  if (!supplier) return <div className="py-8 text-center">Proveedor no encontrado</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Editar Proveedor</h1>
          <p className="text-gray-500">Actualiza la información del proveedor</p>
        </div>
      </div>

      <SupplierForm initialData={supplier} supplierId={params.id as string} />

      {/* Productos del Proveedor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Productos de este Proveedor ({products.length})
            </CardTitle>
            <Link href={`/dashboard/products/new?supplier_id=${params.id}`}>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Producto
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loadingProducts ? (
            <div className="text-center py-8 text-gray-500">Cargando productos...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay productos registrados para este proveedor</p>
              <Link href={`/dashboard/products/new?supplier_id=${params.id}`}>
                <Button className="mt-4" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Primer Producto
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {product.images && product.images.length > 0 && (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>Disponible: {product.stock}</span>
                          <span>Costo: {formatCurrency(product.cost_price)}</span>
                          <span>Venta: {formatCurrency(product.sale_price)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/products/${product.id}`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteProduct(product.id, product.name)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
