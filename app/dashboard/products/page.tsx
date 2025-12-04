'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, Package, Tag, Camera, AlertTriangle } from 'lucide-react';
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // Obtener todos los productos
      const productsData = await getAllDocuments('products') as Product[];

      // Obtener categorías y proveedores para hacer el join manualmente
      const categoriesData = await getAllDocuments('categories') as Category[];
      const suppliers = await getAllDocuments('suppliers') as Supplier[];

      // Ordenar categorías por nombre
      categoriesData.sort((a, b) => a.name.localeCompare(b.name));

      // Crear un mapa para acceso rápido
      const categoriesMap = new Map(categoriesData.map(c => [c.id, c]));
      const suppliersMap = new Map(suppliers.map(s => [s.id, s]));

      // Combinar los datos
      const productsWithRelations: ProductWithRelations[] = productsData.map(product => ({
        ...product,
        category: product.category_id ? categoriesMap.get(product.category_id) : undefined,
        supplier: product.supplier_id ? suppliersMap.get(product.supplier_id) : undefined,
      }));

      // Ordenar por nombre
      productsWithRelations.sort((a, b) => a.name.localeCompare(b.name));

      setCategories(categoriesData);
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

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    const matchesOutOfStock = !showOutOfStock || product.stock === 0;
    return matchesSearch && matchesCategory && matchesOutOfStock;
  });

  // Calcular productos agotados (stock = 0)
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  return (
    <>
      <CategoryManagerModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onUpdate={fetchProducts}
      />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Productos</h1>
          <p className="text-gray-500 text-sm md:text-base">Gestiona el inventario de productos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowCategoryModal(true)} className="flex-1 sm:flex-none">
            <Tag className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Categorías</span>
            <span className="sm:hidden">Cat.</span>
          </Button>
          <Button
            variant={showOutOfStock ? "default" : "outline"}
            onClick={() => {
              setShowOutOfStock(!showOutOfStock);
              if (!showOutOfStock) {
                setSelectedCategory('all'); // Reset category filter when showing out of stock
              }
            }}
            className="flex-1 sm:flex-none"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Agotados</span>
            <span className="sm:hidden">Agot.</span>
            {outOfStockCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                {outOfStockCount}
              </span>
            )}
          </Button>
          <Link href="/dashboard/products/quick-add" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Agregar Rápido</span>
              <span className="sm:hidden">Rápido</span>
            </Button>
          </Link>
          <Link href="/dashboard/products/new" className="flex-1 sm:flex-none">
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo
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
          {/* Filtros de categoría */}
          <div className="mb-6 pb-4 border-b">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos ({products.length})
              </button>
              {categories.map((category) => {
                const categoryCount = products.filter(p => p.category_id === category.id).length;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name} ({categoryCount})
                  </button>
                );
              })}
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8">Cargando productos...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron productos</p>
            </div>
          ) : (
            <>
              {/* Vista de tabla para desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Imagen</th>
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
                        <td className="py-3 px-4">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded border"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </td>
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

              {/* Vista de cards para móvil y tablet */}
              <div className="lg:hidden space-y-4">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-20 h-20 object-cover rounded border"
                            />
                          ) : (
                            <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg mb-1 truncate">{product.name}</h3>
                          <p className="text-xs text-gray-500 mb-2 font-mono">{product.barcode || 'Sin código'}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Categoría:</span>
                              <p className="font-medium truncate">{product.category?.name || '-'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Stock:</span>
                              <p>
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs ${
                                    product.stock <= product.min_stock
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {product.stock}
                                </span>
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">P. Compra:</span>
                              <p className="font-medium">{formatCurrency(product.cost_price)}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">P. Venta:</span>
                              <p className="font-medium text-blue-600">{formatCurrency(product.sale_price)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Link href={`/dashboard/products/${product.id}`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full">
                                <Edit className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteProduct(product.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
}
