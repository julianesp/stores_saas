'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, Package, Tag, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllDocuments, deleteDocument, queryDocuments, getDocumentById } from '@/lib/firestore-helpers';
import { Product, ProductWithRelations, Category, Supplier } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import Swal from '@/lib/sweetalert';
import { CategoryManagerModal } from '@/components/products/category-manager-modal';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // Obtener todos los productos
      const productsData = await getAllDocuments('products') as Product[];

      // Obtener categorías y proveedores para hacer el join manualmente
      const categories = await getAllDocuments('categories') as Category[];
      const suppliers = await getAllDocuments('suppliers') as Supplier[];

      // Crear un mapa para acceso rápido
      const categoriesMap = new Map(categories.map(c => [c.id, c]));
      const suppliersMap = new Map(suppliers.map(s => [s.id, s]));

      // Combinar los datos
      const productsWithRelations: ProductWithRelations[] = productsData.map(product => ({
        ...product,
        category: product.category_id ? categoriesMap.get(product.category_id) : undefined,
        supplier: product.supplier_id ? suppliersMap.get(product.supplier_id) : undefined,
      }));

      // Ordenar por nombre
      productsWithRelations.sort((a, b) => a.name.localeCompare(b.name));

      setProducts(productsWithRelations);
    } catch (error) {
      console.error('Error fetching products:', error);
      Swal.error('Error al cargar productos', 'Intenta recargar la página');
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    const product = products.find(p => p.id === id);
    const productName = product?.name || 'este producto';

    const confirmed = await Swal.deleteConfirm(
      productName,
      'Esta acción no se puede deshacer'
    );

    if (!confirmed) return;

    try {
      Swal.loading('Eliminando producto...');
      await deleteDocument('products', id);
      Swal.closeLoading();
      Swal.success('Producto eliminado correctamente');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      Swal.closeLoading();
      Swal.error('No se pudo eliminar el producto', 'Intenta de nuevo');
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <CategoryManagerModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onUpdate={fetchProducts}
      />

      <div className="space-y-6">
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-gray-500">Gestiona el inventario de productos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCategoryModal(true)}>
            <Tag className="mr-2 h-4 w-4" />
            Categorías
          </Button>
          <Link href="/dashboard/products/quick-add">
            <Button variant="outline">
              <Camera className="mr-2 h-4 w-4" />
              Agregar Rápido
            </Button>
          </Link>
          <Link href="/dashboard/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o código de barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando productos...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron productos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Código</th>
                    <th className="text-left py-3 px-4">Nombre</th>
                    <th className="text-left py-3 px-4">Categoría</th>
                    <th className="text-left py-3 px-4">Proveedor</th>
                    <th className="text-right py-3 px-4">Precio Compra</th>
                    <th className="text-right py-3 px-4">Precio Venta</th>
                    <th className="text-right py-3 px-4">Stock</th>
                    <th className="text-right py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{product.barcode || 'N/A'}</td>
                      <td className="py-3 px-4 font-medium">{product.name}</td>
                      <td className="py-3 px-4">{product.category?.name || '-'}</td>
                      <td className="py-3 px-4">{product.supplier?.name || '-'}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(product.cost_price)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(product.sale_price)}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block px-2 py-1 rounded text-sm ${
                            product.stock <= product.min_stock
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-end">
                          <Link href={`/dashboard/products/${product.id}`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
}
