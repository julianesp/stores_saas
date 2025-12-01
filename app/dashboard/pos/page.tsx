'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Search, ShoppingCart, Trash2, Plus, Minus, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { queryDocuments, createDocument, generateSaleNumber } from '@/lib/firestore-helpers';
import { Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import Swal from '@/lib/sweetalert';

interface CartItem {
  product: Product;
  quantity: number;
}

export default function POSPage() {
  const { user } = useUser();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [processing, setProcessing] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const data = (await queryDocuments('products', [
        { field: 'stock', operator: '>', value: 0 }
      ])) as Product[];
      // Ordenar por nombre manualmente
      data.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    // Auto-focus en el input de código de barras
    barcodeRef.current?.focus();
  }, [fetchProducts]);

  const handleBarcodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const product = products.find(p => p.barcode === barcodeInput.trim());
    if (product) {
      addToCart(product);
      setBarcodeInput('');
      Swal.productAdded(product.name, 1);
    } else {
      Swal.error('Producto no encontrado', 'Código no registrado');
    }
    barcodeRef.current?.focus();
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          Swal.warning('Stock insuficiente', 'No hay más unidades disponibles');
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const newQuantity = item.quantity + delta;
          if (newQuantity <= 0) return item;
          if (newQuantity > item.product.stock) {
            Swal.warning('Stock insuficiente', 'No hay más unidades disponibles');
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.sale_price * item.quantity), 0);
  };

  const processSale = async () => {
    if (cart.length === 0) {
      Swal.warning('El carrito está vacío', 'Agrega productos antes de procesar la venta');
      return;
    }

    setProcessing(true);
    Swal.loading('Procesando venta...');
    try {
      // Obtener o crear user_profile
      let userProfile = null;
      const existingProfiles = await queryDocuments('user_profiles', [
        { field: 'clerk_user_id', operator: '==', value: user?.id }
      ]);

      if (existingProfiles.length > 0) {
        userProfile = existingProfiles[0];
      } else {
        // Crear nuevo perfil con período de prueba
        const now = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 30);

        userProfile = await createDocument('user_profiles', {
          clerk_user_id: user?.id,
          email: user?.emailAddresses[0]?.emailAddress,
          role: 'cajero',
          full_name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          subscription_status: 'trial',
          trial_start_date: now.toISOString(),
          trial_end_date: trialEnd.toISOString(),
        });
      }

      const total = calculateTotal();
      const saleNumber = await generateSaleNumber();

      // Crear la venta
      const sale = await createDocument('sales', {
        sale_number: saleNumber,
        cashier_id: userProfile.id,
        subtotal: total,
        tax: 0,
        discount: 0,
        total: total,
        payment_method: paymentMethod,
        status: 'completada'
      });

      // Crear items de venta
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.sale_price,
        discount: 0,
        subtotal: item.product.sale_price * item.quantity
      }));

      // Crear cada item de venta
      for (const item of saleItems) {
        await createDocument('sale_items', item);
      }

      Swal.closeLoading();
      Swal.saleCompleted(saleNumber, total);
      setCart([]);
      fetchProducts(); // Actualizar inventario
      barcodeRef.current?.focus();
    } catch (error) {
      console.error('Error processing sale:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar la venta';
      Swal.closeLoading();
      Swal.error(errorMessage, 'Error en la venta');
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Punto de Venta</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel izquierdo - Productos */}
        <div className="lg:col-span-2 space-y-4">
          {/* Búsqueda por código de barras */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Escanear Código de Barras</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBarcodeSearch} className="flex gap-2">
                <Input
                  ref={barcodeRef}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Escanea o ingresa código de barras..."
                  className="flex-1"
                />
                <Button type="submit">Buscar</Button>
              </form>
            </CardContent>
          </Card>

          {/* Búsqueda de productos */}
          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar productos..."
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                {filteredProducts.map(product => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-medium text-sm mb-1">{product.name}</h4>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(product.sale_price)}
                      </p>
                      <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel derecho - Carrito */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Carrito ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4">
                {cart.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Carrito vacío</p>
                ) : (
                  cart.map(item => (
                    <div key={item.product.id} className="flex items-center gap-2 p-2 border rounded">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(item.product.sale_price)} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <>
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-blue-600">{formatCurrency(calculateTotal())}</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Método de Pago:</label>
                      <select
                        value={paymentMethod}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPaymentMethod(e.target.value as 'efectivo' | 'tarjeta' | 'transferencia')}
                        className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia</option>
                      </select>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={processSale}
                      disabled={processing}
                    >
                      <DollarSign className="mr-2 h-5 w-5" />
                      {processing ? 'Procesando...' : 'Procesar Venta'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
