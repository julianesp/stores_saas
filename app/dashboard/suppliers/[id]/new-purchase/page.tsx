"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, ShoppingCart, Search, Scan } from "lucide-react";
import { getSupplierById } from "@/lib/cloudflare-api";
import {
  getProducts,
  createPurchaseOrder,
  createProduct,
  getCategories,
  createCategory,
} from "@/lib/cloudflare-api";
import type { Supplier, Product, Category } from "@/lib/types";
import type { PurchaseOrderItem } from "@/lib/cloudflare-api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from 'next/dynamic';

// Importar el escáner de forma dinámica para evitar problemas de SSR
const BarcodeScanner = dynamic(
  () => import('@/components/barcode-scanner').then(mod => ({ default: mod.BarcodeScanner })),
  { ssr: false }
);

interface OrderItem extends PurchaseOrderItem {
  suggested_price: number;
}

export default function NewPurchaseOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Estados para el modal de crear producto
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    barcode: "",
    category_id: "",
    cost_price: "",
    sale_price: "",
    stock: "",
    min_stock: "",
    description: "",
  });

  // Estados para el escáner de código de barras
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Estados para crear nueva categoría
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    loadData();
  }, [supplierId]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.barcode?.includes(searchTerm),
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [supplierData, allProducts, allCategories] = await Promise.all([
        getSupplierById(supplierId, getToken),
        getProducts(getToken),
        getCategories(getToken),
      ]);

      setSupplier(supplierData);
      setCategories(allCategories);

      // Normalizar el campo images para compatibilidad con el tipo Product
      const normalizedProducts = allProducts.map((p) => ({
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
      setFilteredProducts(normalizedProducts);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const suggestSalePrice = (
    cost: number,
    marginPercent: number = 30,
  ): number => {
    return cost * (1 + marginPercent / 100);
  };

  const addProduct = (product: Product) => {
    const existing = orderItems.find((item) => item.product_id === product.id);

    if (existing) {
      toast.error("Este producto ya está en la orden");
      return;
    }

    const newItem: OrderItem = {
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_cost: product.cost_price || 0,
      suggested_price: suggestSalePrice(product.cost_price || 0, 30),
    };

    setOrderItems([...orderItems, newItem]);
    setSearchTerm("");
  };

  const removeProduct = (productId: string) => {
    setOrderItems(orderItems.filter((item) => item.product_id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setOrderItems(
      orderItems.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const updateCost = (productId: string, cost: number) => {
    if (cost < 0) return;
    setOrderItems(
      orderItems.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              unit_cost: cost,
              suggested_price: suggestSalePrice(cost, 30),
            }
          : item,
      ),
    );
  };

  const calculateTotal = () => {
    return orderItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_cost,
      0,
    );
  };

  const handleBarcodeDetected = (barcode: string) => {
    setNewProduct({ ...newProduct, barcode });
    setShowBarcodeScanner(false);
    toast.success(`Código escaneado: ${barcode}`);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("El nombre de la categoría es requerido");
      return;
    }

    try {
      setCreatingCategory(true);

      const category = await createCategory(
        { name: newCategoryName.trim() },
        getToken
      );

      toast.success("Categoría creada exitosamente");

      // Recargar categorías
      const allCategories = await getCategories(getToken);
      setCategories(allCategories);

      // Seleccionar automáticamente la nueva categoría
      setNewProduct({ ...newProduct, category_id: category.id });

      // Limpiar y cerrar
      setNewCategoryName("");
      setShowCreateCategory(false);
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Error al crear la categoría");
    } finally {
      setCreatingCategory(false);
    }
  };

  const startBarcodeScanner = async () => {
    try {
      // Verificar si el navegador soporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Tu navegador no soporta acceso a la cámara");
        return;
      }

      // Verificar permisos de cámara
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" } // Usar cámara trasera en móviles
      });

      // Detener el stream inmediatamente, solo estamos verificando permisos
      stream.getTracks().forEach(track => track.stop());

      // Si llegamos aquí, tenemos permiso, mostrar el escáner
      setShowBarcodeScanner(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("No se pudo acceder a la cámara. Por favor verifica los permisos.");
    }
  };

  const handleCreateProduct = async () => {
    // Validaciones
    if (!newProduct.name.trim()) {
      toast.error("El nombre del producto es requerido");
      return;
    }

    if (!newProduct.cost_price || parseFloat(newProduct.cost_price) <= 0) {
      toast.error("El precio de costo debe ser mayor a 0");
      return;
    }

    if (!newProduct.sale_price || parseFloat(newProduct.sale_price) <= 0) {
      toast.error("El precio de venta debe ser mayor a 0");
      return;
    }

    try {
      setCreatingProduct(true);

      const productData = {
        name: newProduct.name.trim(),
        barcode: newProduct.barcode.trim() || undefined,
        category_id: newProduct.category_id || undefined,
        supplier_id: supplierId, // Asignar automáticamente el proveedor actual
        cost_price: parseFloat(newProduct.cost_price),
        sale_price: parseFloat(newProduct.sale_price),
        stock: newProduct.stock ? parseInt(newProduct.stock) : 0,
        min_stock: newProduct.min_stock ? parseInt(newProduct.min_stock) : 0,
        description: newProduct.description.trim() || undefined,
      };

      const createdProduct = await createProduct(productData, getToken);

      toast.success("Producto creado exitosamente");

      // Recargar productos
      await loadData();

      // Limpiar formulario y cerrar modal
      setNewProduct({
        name: "",
        barcode: "",
        category_id: "",
        cost_price: "",
        sale_price: "",
        stock: "",
        min_stock: "",
        description: "",
      });
      setShowCreateProductModal(false);

      // Agregar automáticamente el producto creado a la orden
      if (createdProduct) {
        const newItem: OrderItem = {
          product_id: createdProduct.id,
          product_name: createdProduct.name,
          quantity: 1,
          unit_cost: createdProduct.cost_price,
          suggested_price: suggestSalePrice(createdProduct.cost_price, 30),
        };
        setOrderItems([...orderItems, newItem]);
      }
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("Error al crear el producto");
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (orderItems.length === 0) {
      toast.error("Agrega al menos un producto a la orden");
      return;
    }

    try {
      setSaving(true);

      await createPurchaseOrder(
        {
          supplier_id: supplierId,
          items: orderItems,
          notes: notes || undefined,
          expected_date: expectedDate || undefined,
        },
        getToken,
      );

      toast.success("Orden de compra creada exitosamente");
      router.push(`/dashboard/suppliers/${supplierId}`);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      toast.error("Error al crear la orden de compra");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Proveedor no encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nueva Orden de Compra</h1>
            <p className="text-gray-500">Proveedor: {supplier.name}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Buscar y agregar productos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Agregar Productos</CardTitle>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowCreateProductModal(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Crear Producto
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Buscar producto por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Mostrar siempre algunos productos */}
              <div className="space-y-2">
                {searchTerm ? (
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.slice(0, 10).map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addProduct(product)}
                          className="w-full p-3 hover:bg-gray-50 border-b last:border-b-0 text-left"
                        >
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-gray-500">
                            Disponible: {product.stock} | Costo:{" "}
                            {formatCurrency(product.cost_price)}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No se encontraron productos
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium">
                      Productos disponibles ({products.length})
                    </p>
                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      {products.length > 0 ? (
                        products.slice(0, 10).map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => addProduct(product)}
                            className="w-full p-3 hover:bg-gray-50 border-b last:border-b-0 text-left"
                          >
                            <p className="font-medium text-sm">
                              {product.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Stock: {product.stock} | Costo:{" "}
                              {formatCurrency(product.cost_price)}
                            </p>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No hay productos disponibles. <br />
                          <span className="text-xs">
                            Crea productos primero en el menú Productos.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información adicional */}
          <Card>
            <CardHeader>
              <CardTitle>Información Adicional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Fecha Esperada de Entrega
                </label>
                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Notas adicionales sobre la orden..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de productos en la orden */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Productos en la Orden ({orderItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orderItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No hay productos en la orden</p>
                <p className="text-sm mt-1">Busca y agrega productos arriba</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orderItems.map((item) => (
                  <div
                    key={item.product_id}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProduct(item.product_id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          Cantidad
                        </label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(
                              item.product_id,
                              parseInt(e.target.value) || 1,
                            )
                          }
                          className="text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          Costo Unitario
                        </label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={item.unit_cost}
                          onChange={(e) =>
                            updateCost(
                              item.product_id,
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          Subtotal
                        </label>
                        <div className="h-10 flex items-center px-3 bg-gray-100 rounded-md text-sm font-semibold">
                          {formatCurrency(item.quantity * item.unit_cost)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-blue-600">
                      Precio sugerido de venta (30% margen):{" "}
                      {formatCurrency(item.suggested_price)}
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="border-t-2 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">
                      Total de la Orden:
                    </span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving || orderItems.length === 0}
            className="min-w-32"
          >
            {saving ? "Guardando..." : "Crear Orden"}
          </Button>
        </div>
      </form>

      {/* Modal para crear nuevo producto */}
      <Dialog
        open={showCreateProductModal}
        onOpenChange={setShowCreateProductModal}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Producto</DialogTitle>
            <DialogDescription>
              El producto se asociará automáticamente al proveedor{" "}
              {supplier?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nombre del producto */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Nombre del Producto *
              </label>
              <Input
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, name: e.target.value })
                }
                placeholder="Ej: Coca Cola 2L"
              />
            </div>

            {/* Código de barras */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Código de Barras
              </label>
              <div className="flex gap-2">
                <Input
                  value={newProduct.barcode}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, barcode: e.target.value })
                  }
                  placeholder="Escanea o ingresa manualmente"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={startBarcodeScanner}
                  className="gap-2"
                >
                  <Scan className="h-4 w-4" />
                  Escanear
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Usa la cámara para escanear el código de barras o ingrésalo manualmente
              </p>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Categoría
              </label>
              {!showCreateCategory ? (
                <div className="flex gap-2">
                  <Select
                    value={newProduct.category_id}
                    onValueChange={(value) =>
                      setNewProduct({ ...newProduct, category_id: value })
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleccionar categoría (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateCategory(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nombre de la nueva categoría"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateCategory();
                        } else if (e.key === "Escape") {
                          setShowCreateCategory(false);
                          setNewCategoryName("");
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={creatingCategory}
                      size="sm"
                    >
                      {creatingCategory ? "Creando..." : "Crear"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateCategory(false);
                        setNewCategoryName("");
                      }}
                      size="sm"
                    >
                      Cancelar
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Presiona Enter para crear o ESC para cancelar
                  </p>
                </div>
              )}
            </div>

            {/* Precios */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Precio de Costo *
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={newProduct.cost_price}
                  onChange={(e) => {
                    const cost = e.target.value;
                    setNewProduct({
                      ...newProduct,
                      cost_price: cost,
                      // Auto-calcular precio de venta con 30% de margen si está vacío
                      sale_price:
                        newProduct.sale_price ||
                        (parseFloat(cost) * 1.3).toFixed(2),
                    });
                  }}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Precio de Venta *
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={newProduct.sale_price}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, sale_price: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Stock Inicial
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={newProduct.stock}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, stock: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Stock Mínimo
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={newProduct.min_stock}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, min_stock: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Descripción
              </label>
              <textarea
                value={newProduct.description}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, description: e.target.value })
                }
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Descripción opcional del producto"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateProductModal(false)}
              disabled={creatingProduct}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateProduct}
              disabled={creatingProduct}
            >
              {creatingProduct ? "Creando..." : "Crear Producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escáner de código de barras */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={handleBarcodeDetected}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}
    </div>
  );
}
