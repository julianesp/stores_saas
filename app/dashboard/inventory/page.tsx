"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getProducts,
  getCategories,
  updateProduct,
} from "@/lib/cloudflare-api";
import { Product, Category, tracksInventory } from "@/lib/types";
import {
  Package,
  AlertTriangle,
  Search,
  Edit,
  Plus,
  Minus,
  CalendarClock,
  Tags,
  ArrowUpDown,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getExpirationInfo, type ExpirationSeverity } from "@/lib/expiration-helpers";
import { findRepeatedNameGroups } from "@/lib/duplicate-helpers";
import { RepeatedNamesModal } from "@/components/products/repeated-names-modal";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageGlossary } from "@/components/dashboard/page-glossary";

// Foto principal del producto. `images` puede llegar como arreglo o como JSON en texto.
const getProductThumbnail = (product: Product): string | undefined => {
  let images: unknown = product.images;
  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = [];
    }
  }
  if (Array.isArray(images) && images.length > 0) {
    return images[product.main_image_index ?? 0] || images[0];
  }
  return product.image_url || undefined;
};

// Margen sobre el precio de venta: cuánto de cada peso vendido es ganancia.
// Se usa para el color de la ganancia por unidad (rojo si es muy poca).
// null cuando no hay costo o precio registrado (no se puede calcular).
const getMarginPercent = (product: Product): number | null => {
  if (!product.cost_price || !product.sale_price) return null;
  return ((product.sale_price - product.cost_price) / product.sale_price) * 100;
};

const marginClass = (margin: number): string => {
  if (margin < 10) return "text-red-600";
  if (margin < 20) return "text-amber-600";
  return "text-green-600";
};

function InventoryContent() {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [showRepeatedNames, setShowRepeatedNames] = useState(false);

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

  // Búsqueda y categoría: base de las tarjetas de arriba. Los filtros de cantidad baja
  // y por vencer solo afectan la tabla, para que las tarjetas no cambien al tocarlas.
  const baseProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !filterCategory || product.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredProducts = baseProducts.filter((product) => {
    const matchesLowStock =
      !showLowStockOnly ||
      (tracksInventory(product) && product.stock <= product.min_stock);
    const matchesExpiring =
      !showExpiringOnly || getExpirationInfo(product).needsAttention;
    return matchesLowStock && matchesExpiring;
  });

  // La columna de vencimiento solo se muestra si algún producto tiene fecha
  const showExpirationColumn = filteredProducts.some(
    (p) => getExpirationInfo(p).severity !== "none",
  );

  const hasActiveFilters =
    !!searchTerm || !!filterCategory || showLowStockOnly || showExpiringOnly;

  const clearFilters = () => {
    setSearchTerm("");
    setFilterCategory("");
    setShowLowStockOnly(false);
    setShowExpiringOnly(false);
  };

  // Tarjetas de arriba: al tocarlas filtran la tabla (y al tocarlas de nuevo, quitan el filtro)
  const showAllProducts = () => {
    setShowLowStockOnly(false);
    setShowExpiringOnly(false);
  };
  const toggleLowStockFilter = () => {
    setShowLowStockOnly((prev) => !prev);
    setShowExpiringOnly(false);
  };
  const toggleExpiringFilter = () => {
    setShowExpiringOnly((prev) => !prev);
    setShowLowStockOnly(false);
  };

  const repeatedNameGroups = useMemo(
    () => findRepeatedNameGroups(products),
    [products],
  );

  const lowStockProducts = baseProducts.filter(
    (p) => tracksInventory(p) && p.stock <= p.min_stock,
  );
  const expiringProducts = baseProducts.filter(
    (p) => getExpirationInfo(p).needsAttention,
  );
  const totalValue = baseProducts.reduce(
    (sum, p) => sum + p.stock * p.cost_price,
    0,
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

  // Clases del badge de vencimiento según severidad
  const expirationBadgeClass = (severity: ExpirationSeverity): string => {
    switch (severity) {
      case "expired":
        return "bg-red-100 text-red-800";
      case "critical":
        return "bg-orange-100 text-orange-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-700";
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Inventario</h1>
          <p className="text-gray-500">
            Gestiona la cantidad disponible de tus productos
          </p>
        </div>
        {repeatedNameGroups.length > 0 && (
          <Button variant="outline" onClick={() => setShowRepeatedNames(true)}>
            <Tags className="mr-2 h-4 w-4" />
            Nombres repetidos
            <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">
              {repeatedNameGroups.length}
            </span>
          </Button>
        )}
      </div>

      <RepeatedNamesModal
        isOpen={showRepeatedNames}
        onClose={() => setShowRepeatedNames(false)}
        products={products}
        onUpdate={fetchData}
      />

      {/* Estadísticas */}
      <div data-guide="inventory-stats" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <button
          type="button"
          onClick={showAllProducts}
          aria-pressed={!showLowStockOnly && !showExpiringOnly}
          title="Ver todos los productos"
          className="text-left rounded-lg cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Card
            className={`h-full ${!showLowStockOnly && !showExpiringOnly ? "border-brand ring-1 ring-brand" : ""}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Productos
              </CardTitle>
              <Package className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{baseProducts.length}</div>
              <p className="text-xs text-gray-500">productos en inventario</p>
            </CardContent>
          </Card>
        </button>

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

        <button
          type="button"
          onClick={toggleLowStockFilter}
          aria-pressed={showLowStockOnly}
          title={
            showLowStockOnly
              ? "Quitar filtro"
              : "Ver solo productos con cantidad baja"
          }
          className="text-left rounded-lg cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <Card
            className={`h-full ${showLowStockOnly ? "border-orange-500 ring-1 ring-orange-500 bg-orange-50" : ""}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cantidad Baja
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {lowStockProducts.length}
              </div>
              <p className="text-xs text-gray-500">
                {showLowStockOnly
                  ? "mostrando solo estos · toca para quitar"
                  : "toca para verlos"}
              </p>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          onClick={toggleExpiringFilter}
          aria-pressed={showExpiringOnly}
          title={
            showExpiringOnly
              ? "Quitar filtro"
              : "Ver solo productos próximos a vencer"
          }
          className="text-left rounded-lg cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
        >
          <Card
            className={`h-full ${showExpiringOnly ? "border-yellow-500 ring-1 ring-yellow-500 bg-yellow-50" : ""}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
              <CalendarClock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {expiringProducts.length}
              </div>
              <p className="text-xs text-gray-500">
                {showExpiringOnly
                  ? "mostrando solo estos · toca para quitar"
                  : "toca para verlos"}
              </p>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Filtros */}
      <Card data-guide="inventory-filters">
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

            {/* Filtro de productos por vencer */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="expiringFilter"
                checked={showExpiringOnly}
                onChange={(e) => setShowExpiringOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
              <label
                htmlFor="expiringFilter"
                className="text-sm font-medium flex items-center gap-2"
              >
                <CalendarClock className="h-4 w-4 text-yellow-600" />
                Mostrar solo productos próximos a vencer
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de inventario */}
      <Card data-guide="inventory-list">
        <CardHeader>
          <CardTitle>Productos en Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500">
                {hasActiveFilters
                  ? "Ningún producto coincide con los filtros"
                  : "No hay productos en el inventario"}
              </p>
              {hasActiveFilters ? (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={clearFilters}
                >
                  Quitar filtros
                </Button>
              ) : (
                <Button
                  className="mt-4"
                  onClick={() =>
                    (window.location.href = "/dashboard/products/new")
                  }
                >
                  Agregar Producto
                </Button>
              )}
            </div>
          ) : (
            // Columnas compactas para que la tabla quepa sin desplazamiento horizontal en
            // pantallas de laptop: código va bajo el nombre, y mínimo y estado van con el stock.
            // overflow-x-auto queda solo como respaldo para celulares.
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-600">
                    <th className="text-left px-3 py-3 font-medium">
                      Producto
                    </th>
                    <th className="text-right px-3 py-3 font-medium">
                      Disponible
                    </th>
                    <th className="text-right px-3 py-3 font-medium">Costo</th>
                    <th className="text-right px-3 py-3 font-medium">Venta</th>
                    <th className="text-right px-3 py-3 font-medium whitespace-nowrap">
                      Valor total
                    </th>
                    {showExpirationColumn && (
                      <th className="text-center px-3 py-3 font-medium">
                        Vencimiento
                      </th>
                    )}
                    <th className="text-center px-3 py-3 font-medium">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const isLowStock =
                      tracksInventory(product) &&
                      product.stock <= product.min_stock;
                    const totalValue = product.stock * product.cost_price;
                    const expInfo = getExpirationInfo(product);
                    const thumbnail = getProductThumbnail(product);
                    const margin = getMarginPercent(product);
                    const categoryName = categories.find(
                      (c) => c.id === product.category_id,
                    )?.name;

                    return (
                      <tr
                        key={product.id}
                        className={`border-b ${
                          isLowStock
                            ? "bg-orange-50 hover:bg-orange-100"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border bg-gray-100">
                              {thumbnail ? (
                                <Image
                                  src={thumbnail}
                                  alt={product.name}
                                  fill
                                  sizes="40px"
                                  className="object-contain p-0.5"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-base leading-snug">
                                {product.name}
                              </div>
                              {(categoryName || product.barcode) && (
                                <div className="text-xs text-gray-500">
                                  {categoryName}
                                  {categoryName && product.barcode && " · "}
                                  {product.barcode && (
                                    <span className="font-mono">
                                      {product.barcode}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <div
                            className={`text-base font-semibold ${isLowStock ? "text-orange-700" : ""}`}
                          >
                            {product.stock}
                          </div>
                          <div
                            className={`text-xs ${isLowStock ? "text-orange-700 font-medium" : "text-gray-500"}`}
                          >
                            {isLowStock && (
                              <AlertTriangle className="mr-0.5 inline h-3 w-3 -translate-y-px" />
                            )}
                            {isLowStock ? "Bajo · " : ""}mín.{" "}
                            {product.min_stock}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          {formatCurrency(product.cost_price)}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <div>{formatCurrency(product.sale_price)}</div>
                          {margin !== null && (
                            <div
                              className={`text-xs font-medium ${marginClass(margin)}`}
                              title={`Por cada unidad vendida a ${formatCurrency(product.sale_price)} que te costó ${formatCurrency(product.cost_price)}`}
                            >
                              {product.sale_price >= product.cost_price
                                ? `Ganas ${formatCurrency(product.sale_price - product.cost_price)} c/u`
                                : `Pierdes ${formatCurrency(product.cost_price - product.sale_price)} c/u`}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-medium whitespace-nowrap">
                          {formatCurrency(totalValue)}
                        </td>
                        {showExpirationColumn && (
                          <td className="px-3 py-3 text-center">
                            {expInfo.severity === "none" ? (
                              <span className="text-xs text-gray-400">—</span>
                            ) : expInfo.severity === "ok" ? (
                              <span className="text-xs text-gray-500">
                                {expInfo.label}
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${expirationBadgeClass(
                                  expInfo.severity,
                                )}`}
                              >
                                <CalendarClock className="h-3 w-3" />
                                {expInfo.label}
                              </span>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditStock(product)}
                              title="Ajustar stock"
                              className="gap-1.5 whitespace-nowrap"
                            >
                              <ArrowUpDown className="h-3 w-3" />
                              Ajustar
                            </Button>
                            <Link
                              href={`/dashboard/products/${product.id}`}
                              title="Editar producto (precio, categoría, mínimo...)"
                              aria-label={`Editar ${product.name}`}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:border-brand hover:text-brand"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {products.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
              <span>
                Mostrando {filteredProducts.length} de {products.length}{" "}
                {products.length === 1 ? "producto" : "productos"}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 font-medium text-brand hover:underline cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Quitar filtros
                </button>
              )}
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

      {/* Explicación en palabras sencillas de los datos de esta página */}
      <PageGlossary
        storageKey="inventory"
        items={[
          {
            term: "Ganas $ c/u",
            meaning:
              "Precio de venta menos costo. Compras a $2.000 y vendes a $4.000: ganas $2.000.",
          },
          {
            term: "Colores",
            meaning: (
              <>
                <span className="font-medium text-green-600">Verde</span> ganas
                bien, <span className="font-medium text-amber-600">ámbar</span>{" "}
                ganas poco,{" "}
                <span className="font-medium text-red-600">rojo</span> casi nada
                o pierdes.
              </>
            ),
          },
          {
            term: "Mín.",
            meaning:
              "Cantidad mínima. Al llegar a ella sale “Bajo”: toca pedir.",
          },
          {
            term: "Valor total",
            meaning: "Plata invertida: unidades × costo.",
          },
          {
            term: "Por vencer",
            meaning: "Vence en menos de 30 días o ya venció.",
          },
          {
            term: "Ajustar",
            meaning:
              "Cambia la cantidad sin vender: llegó mercancía o algo se dañó.",
          },
        ]}
      />
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
