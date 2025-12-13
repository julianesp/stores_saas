'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Trash2, ShoppingCart, Search } from 'lucide-react';
import { getSupplierById } from '@/lib/cloudflare-api';
import { getProducts, createPurchaseOrder } from '@/lib/cloudflare-api';
import type { Supplier, Product } from '@/lib/types';
import type { PurchaseOrderItem } from '@/lib/cloudflare-api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [supplierId]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.includes(searchTerm)
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const loadData = async () => {
    try {
      setLoading(true);
      const supplierData = await getSupplierById(supplierId, getToken);
      setSupplier(supplierData);

      const allProducts = await getProducts(getToken);
      // Normalizar el campo images para compatibilidad con el tipo Product
      const normalizedProducts = allProducts.map(p => ({
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
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const suggestSalePrice = (cost: number, marginPercent: number = 30): number => {
    return cost * (1 + marginPercent / 100);
  };

  const addProduct = (product: Product) => {
    const existing = orderItems.find(item => item.product_id === product.id);

    if (existing) {
      toast.error('Este producto ya está en la orden');
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
    setSearchTerm('');
  };

  const removeProduct = (productId: string) => {
    setOrderItems(orderItems.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setOrderItems(orderItems.map(item =>
      item.product_id === productId ? { ...item, quantity } : item
    ));
  };

  const updateCost = (productId: string, cost: number) => {
    if (cost < 0) return;
    setOrderItems(orderItems.map(item =>
      item.product_id === productId
        ? { ...item, unit_cost: cost, suggested_price: suggestSalePrice(cost, 30) }
        : item
    ));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (orderItems.length === 0) {
      toast.error('Agrega al menos un producto a la orden');
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
        getToken
      );

      toast.success('Orden de compra creada exitosamente');
      router.push(`/dashboard/suppliers/${supplierId}`);
    } catch (error) {
      console.error('Error creating purchase order:', error);
      toast.error('Error al crear la orden de compra');
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
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
          >
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
              <CardTitle>Agregar Productos</CardTitle>
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
                            Disponible: {product.stock} | Costo: {formatCurrency(product.cost_price)}
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
                    <p className="text-xs text-gray-500 font-medium">Productos disponibles ({products.length})</p>
                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      {products.length > 0 ? (
                        products.slice(0, 10).map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => addProduct(product)}
                            className="w-full p-3 hover:bg-gray-50 border-b last:border-b-0 text-left"
                          >
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-gray-500">
                              Stock: {product.stock} | Costo: {formatCurrency(product.cost_price)}
                            </p>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No hay productos disponibles. <br/>
                          <span className="text-xs">Crea productos primero en el menú Productos.</span>
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
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Notas
                </label>
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
                  <div key={item.product_id} className="border rounded-lg p-4 bg-gray-50">
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
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 1)}
                          className="text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          Costo Unitario
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_cost}
                          onChange={(e) => updateCost(item.product_id, parseFloat(e.target.value) || 0)}
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
                      Precio sugerido de venta (30% margen): {formatCurrency(item.suggested_price)}
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="border-t-2 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total de la Orden:</span>
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
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving || orderItems.length === 0}
            className="min-w-32"
          >
            {saving ? 'Guardando...' : 'Crear Orden'}
          </Button>
        </div>
      </form>
    </div>
  );
}
