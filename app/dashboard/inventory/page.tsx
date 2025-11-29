'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAllDocuments } from '@/lib/firestore-helpers';
import { Product, Category } from '@/lib/types';
import { Package, AlertTriangle, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        getAllDocuments('products'),
        getAllDocuments('categories'),
      ]);
      setProducts(productsData as Product[]);
      setCategories(categoriesData as Category[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = filteredProducts.filter(p => p.stock <= p.min_stock);
  const totalValue = filteredProducts.reduce((sum, p) => sum + (p.stock * p.cost_price), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando inventario...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventario</h1>
        <p className="text-gray-500">Gestiona el stock de tus productos</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredProducts.length}</div>
            <p className="text-xs text-gray-500">productos en inventario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-gray-500">valor del inventario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</div>
            <p className="text-xs text-gray-500">productos con stock bajo</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o código de barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de inventario */}
      <Card>
        <CardHeader>
          <CardTitle>Productos en Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500">No hay productos en el inventario</p>
              <Button
                className="mt-4"
                onClick={() => window.location.href = '/dashboard/products/new'}
              >
                Agregar Producto
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Producto</th>
                    <th className="text-left p-4 font-medium">Código</th>
                    <th className="text-right p-4 font-medium">Stock</th>
                    <th className="text-right p-4 font-medium">Mín.</th>
                    <th className="text-right p-4 font-medium">Costo</th>
                    <th className="text-right p-4 font-medium">Venta</th>
                    <th className="text-right p-4 font-medium">Valor Total</th>
                    <th className="text-center p-4 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const isLowStock = product.stock <= product.min_stock;
                    const totalValue = product.stock * product.cost_price;

                    return (
                      <tr key={product.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.category_id && (
                              <div className="text-sm text-gray-500">
                                {categories.find(c => c.id === product.category_id)?.name}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-gray-600 text-sm">
                          {product.barcode || '-'}
                        </td>
                        <td className="p-4 text-right font-medium">
                          {product.stock}
                        </td>
                        <td className="p-4 text-right text-gray-600">
                          {product.min_stock}
                        </td>
                        <td className="p-4 text-right">
                          {formatCurrency(product.cost_price)}
                        </td>
                        <td className="p-4 text-right">
                          {formatCurrency(product.sale_price)}
                        </td>
                        <td className="p-4 text-right font-medium">
                          {formatCurrency(totalValue)}
                        </td>
                        <td className="p-4 text-center">
                          {isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <AlertTriangle className="h-3 w-3" />
                              Bajo
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
