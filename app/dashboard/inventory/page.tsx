"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getProducts,
  getCategories,
  updateProduct,
} from "@/lib/cloudflare-api";
import { Product, Category } from "@/lib/types";
import {
  Package,
  AlertTriangle,
  Search,
  Edit,
  Plus,
  Minus,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function InventoryContent() {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Estados para el modal de edición
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState<number>(0);
  const [stockAdjustment, setStockAdjustment] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Detectar si viene el parámetro lowStock en la URL
  useEffect(() => {
    const lowStockParam = searchParams.get("lowStock");
    if (lowStockParam === "true") {
      setShowLowStockOnly(true);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        getProducts(getToken),
        getCategories(getToken),
      ]);
      setProducts(productsData as Product[]);
      setCategories(categoriesData as Category[]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !filterCategory || product.category_id === filterCategory;
    const matchesLowStock =
      !showLowStockOnly || product.stock <= product.min_stock;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const lowStockProducts = filteredProducts.filter(
    (p) => p.stock <= p.min_stock
  );
  const totalValue = filteredProducts.reduce(
    (sum, p) => sum + p.stock * p.cost_price,
    0
  );

  // Función para abrir el modal de edición
  const handleEditStock = (product: Product) => {
    setEditingProduct(product);
    setNewStock(product.stock);
    setStockAdjustment(0);
  };

  // Función para actualizar el stock
  const handleUpdateStock = async () => {
    if (!editingProduct) return;

    try {
      setIsUpdating(true);

      await updateProduct(editingProduct.id, { stock: newStock }, getToken);

      toast.success(
        `Stock actualizado: ${editingProduct.name} ahora tiene ${newStock} unidades`
      );

      // Recargar productos
      await fetchData();

      // Cerrar modal
      setEditingProduct(null);
      setNewStock(0);
      setStockAdjustment(0);
    } catch (error) {
      console.error("Error updating stock:", error);
      toast.error("Error al actualizar el stock");
    } finally {
      setIsUpdating(false);
    }
  };

  // Función para ajustar el stock con los botones +/-
  const adjustStock = (amount: number) => {
    const newValue = Math.max(0, newStock + amount);
    setNewStock(newValue);
    setStockAdjustment(stockAdjustment + amount);
  };

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
        <p className="text-gray-500">
          Gestiona la cantidad disponible de tus productos
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Productos
            </CardTitle>
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
            <div className="text-2xl font-bold">
              {formatCurrency(totalValue)}
            </div>
            <p className="text-xs text-gray-500">valor del inventario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cantidad Baja</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {lowStockProducts.length}
            </div>
            <p className="text-xs text-gray-500">productos con cantidad baja</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
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

            {/* Filtro de cantidad baja */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lowStockFilter"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <label
                htmlFor="lowStockFilter"
                className="text-sm font-medium flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Mostrar solo productos con cantidad baja
              </label>
            </div>
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
              <p className="mt-4 text-gray-500">
                No hay productos en el inventario
              </p>
              <Button
                className="mt-4"
                onClick={() =>
                  (window.location.href = "/dashboard/products/new")
                }
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
                    <th className="text-right p-4 font-medium">Disponible</th>
                    <th className="text-right p-4 font-medium">Mín.</th>
                    <th className="text-right p-4 font-medium">Costo</th>
                    <th className="text-right p-4 font-medium">Venta</th>
                    <th className="text-right p-4 font-medium">Valor Total</th>
                    <th className="text-center p-4 font-medium">Estado</th>
                    <th className="text-center p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const isLowStock = product.stock <= product.min_stock;
                    const totalValue = product.stock * product.cost_price;

                    return (
                      <tr
                        key={product.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-4">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.category_id && (
                              <div className="text-sm text-gray-500">
                                {
                                  categories.find(
                                    (c) => c.id === product.category_id
                                  )?.name
                                }
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-black text-sm">
                          {product.barcode || "-"}
                        </td>
                        <td className="p-4 text-right font-medium">
                          {product.stock}
                        </td>
                        <td className="p-4 text-right text-black">
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
                              <AlertTriangle className="h-3 w-3 text-black" />
                              Bajo
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditStock(product)}
                            className="gap-2"
                          >
                            <Edit className="h-3 w-3 text-black" />
                            Ajustar Stock
                          </Button>
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

      {/* Modal de edición de stock */}
      <Dialog
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Stock</DialogTitle>
            <DialogDescription className="text-black">
              Actualiza la cantidad disponible de {editingProduct?.name}
            </DialogDescription>
          </DialogHeader>

          {editingProduct && (
            <div className="space-y-4 py-4">
              {/* Stock actual */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-black">Stock actual</p>
                <p className="text-2xl font-bold">
                  {editingProduct.stock} unidades
                </p>
              </div>

              {/* Botones de ajuste rápido */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-black">Ajuste rápido</p>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => adjustStock(-10)}
                    className="gap-1"
                  >
                    <Minus className="h-3 w-3 text-black" />
                    10
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => adjustStock(-1)}
                    className="gap-1"
                  >
                    <Minus className="h-3 w-3 text-black" />1
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => adjustStock(1)}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3 text-black" />1
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => adjustStock(10)}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3 text-black" />
                    10
                  </Button>
                </div>
              </div>

              {/* Input manual */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nuevo stock</label>
                <Input
                  type="number"
                  min="0"
                  value={newStock}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setNewStock(Math.max(0, value));
                    setStockAdjustment(value - editingProduct.stock);
                  }}
                  className="text-lg font-semibold"
                />
              </div>

              {/* Resumen del cambio */}
              {stockAdjustment !== 0 && (
                <div
                  className={`p-3 rounded-lg ${
                    stockAdjustment > 0
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      stockAdjustment > 0 ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    {stockAdjustment > 0 ? "+ " : ""}
                    {stockAdjustment} unidades
                  </p>
                  <p className="text-xs text-black mt-1">
                    {editingProduct.stock} → {newStock} unidades
                  </p>
                </div>
              )}

              {/* Alertas */}
              {newStock <= editingProduct.min_stock && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <p className="text-sm text-orange-800">
                    Stock por debajo del mínimo ({editingProduct.min_stock}{" "}
                    unidades)
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingProduct(null)}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleUpdateStock}
              disabled={
                isUpdating ||
                !editingProduct ||
                newStock === editingProduct.stock
              }
            >
              {isUpdating ? "Actualizando..." : "Actualizar Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Cargando inventario...</p>
        </div>
      }
    >
      <InventoryContent />
    </Suspense>
  );
}
