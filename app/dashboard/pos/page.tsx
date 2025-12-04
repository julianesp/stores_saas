'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Search, ShoppingCart, Trash2, Plus, Minus, DollarSign, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { queryDocuments, createDocument, generateSaleNumber, updateDocument, getAllDocuments } from '@/lib/firestore-helpers';
import { Product, Customer, Category } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { calculatePointsForPurchase, addPointsToCustomer, canRedeemDiscount, redeemPointsForDiscount, getPointsMilestoneMessage, REWARD_CONSTANTS } from '@/lib/loyalty-helpers';
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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [canRedeem, setCanRedeem] = useState(false);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
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

  const fetchCustomers = useCallback(async () => {
    try {
      const data = (await getAllDocuments('customers')) as Customer[];
      data.sort((a, b) => a.name.localeCompare(b.name));
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = (await getAllDocuments('categories')) as Category[];
      data.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchCategories();
    // Auto-focus en el input de código de barras
    barcodeRef.current?.focus();
  }, [fetchProducts, fetchCustomers, fetchCategories]);

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

  const setDirectQuantity = (productId: string, quantity: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          if (quantity <= 0) {
            Swal.warning('Cantidad inválida', 'La cantidad debe ser mayor a 0');
            return item;
          }
          if (quantity > item.product.stock) {
            Swal.warning('Stock insuficiente', `Solo hay ${item.product.stock} unidades disponibles`);
            return { ...item, quantity: item.product.stock };
          }
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.product.sale_price * item.quantity), 0);
    return subtotal - discountAmount;
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

      const subtotal = cart.reduce((sum, item) => sum + (item.product.sale_price * item.quantity), 0);
      const saleNumber = await generateSaleNumber();

      // Canjear puntos por descuento si aplica
      let appliedDiscount = 0;
      let pointsRedeemed = 0;
      if (selectedCustomer && applyDiscount) {
        const redeemResult = await redeemPointsForDiscount(selectedCustomer.id, subtotal);
        appliedDiscount = redeemResult.discount;
        pointsRedeemed = redeemResult.pointsRedeemed;
      }

      const total = subtotal - appliedDiscount;

      // Calcular puntos si hay un cliente seleccionado (después de aplicar descuento)
      let pointsEarned = 0;
      if (selectedCustomer) {
        pointsEarned = await calculatePointsForPurchase(userProfile.id, total);
      }

      // Crear la venta
      const saleData: any = {
        sale_number: saleNumber,
        cashier_id: userProfile.id,
        subtotal: subtotal,
        tax: 0,
        discount: appliedDiscount,
        total: total,
        payment_method: paymentMethod,
        status: 'completada',
      };

      // Solo agregar customer_id si hay un cliente seleccionado
      if (selectedCustomer && selectedCustomer.id) {
        saleData.customer_id = selectedCustomer.id;
        saleData.points_earned = pointsEarned;
      }

      const sale = await createDocument('sales', saleData);

      // Crear cada item de venta y actualizar el stock
      for (const cartItem of cart) {
        // Crear el item de venta
        await createDocument('sale_items', {
          sale_id: sale.id,
          product_id: cartItem.product.id,
          quantity: cartItem.quantity,
          unit_price: cartItem.product.sale_price,
          discount: 0,
          subtotal: cartItem.product.sale_price * cartItem.quantity
        });

        // Actualizar el stock del producto
        const newStock = cartItem.product.stock - cartItem.quantity;
        await updateDocument('products', cartItem.product.id, {
          stock: newStock
        });

        // Crear movimiento de inventario para auditoría
        await createDocument('inventory_movements', {
          product_id: cartItem.product.id,
          type: 'salida',
          quantity: cartItem.quantity,
          previous_stock: cartItem.product.stock,
          new_stock: newStock,
          reference_type: 'venta',
          reference_id: sale.id,
          notes: `Venta ${saleNumber}`,
          user_id: userProfile.id
        });
      }

      // Asignar puntos al cliente si aplica
      if (selectedCustomer && pointsEarned > 0) {
        await addPointsToCustomer(selectedCustomer.id, pointsEarned);
      }

      Swal.closeLoading();

      // Mostrar mensaje personalizado
      if (selectedCustomer) {
        let htmlContent = `
          <p class="text-lg mb-2">Venta #${saleNumber}</p>
          ${appliedDiscount > 0 ? `
            <div class="bg-gray-50 p-2 rounded mb-2 text-sm">
              <p class="text-gray-600">Subtotal: ${formatCurrency(subtotal)}</p>
              <p class="text-green-600 font-semibold">Descuento (${REWARD_CONSTANTS.DISCOUNT_PERCENTAGE}%): -${formatCurrency(appliedDiscount)}</p>
              <p class="text-xs text-gray-500 mt-1">Se canjearon ${pointsRedeemed} puntos</p>
            </div>
          ` : ''}
          <p class="text-2xl font-bold text-green-600 mb-3">Total: ${formatCurrency(total)}</p>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
            <p class="text-sm text-gray-600">Cliente: <strong>${selectedCustomer.name}</strong></p>
          </div>
        `;

        if (pointsEarned > 0) {
          htmlContent += `
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
              <p class="text-lg font-bold text-yellow-600">+${pointsEarned} puntos ganados</p>
            </div>
          `;

          // Agregar mensaje de hito si aplica
          const milestoneMessage = getPointsMilestoneMessage(pointsEarned);
          if (milestoneMessage) {
            htmlContent += `
              <div class="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <p class="text-green-800">${milestoneMessage}</p>
              </div>
            `;
          }
        }

        await Swal.custom({
          title: 'Venta Completada',
          html: htmlContent,
          icon: 'success',
          confirmButtonText: 'Aceptar'
        });
      } else {
        Swal.saleCompleted(saleNumber, total);
      }

      setCart([]);
      setSelectedCustomer(null);
      setCanRedeem(false);
      setApplyDiscount(false);
      setDiscountAmount(0);
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

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4 md:space-y-6">
      {/* <h1 className="text-2xl md:text-3xl font-bold">Punto de Venta</h1> */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Panel izquierdo - Productos */}
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
          {/* Búsqueda por código de barras */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Escanear Código de Barras</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBarcodeSearch} className="flex gap-2">
                <Input
                  ref={barcodeRef}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Código de barras..."
                  className="flex-1 text-sm md:text-base"
                />
                <Button type="submit" className="flex-shrink-0">Buscar</Button>
              </form>
            </CardContent>
          </Card>

          {/* Búsqueda de productos */}
          <Card>
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar productos..."
                  className="pl-10 text-sm md:text-base"
                />
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtros de categoría */}
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3 max-h-[400px] md:max-h-[500px] overflow-y-auto">
                {filteredProducts.map(product => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-2 md:p-4">
                      <h4 className="font-medium text-xs md:text-sm mb-1 line-clamp-2">{product.name}</h4>
                      <p className="text-sm md:text-lg font-bold text-blue-600">
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
        <div className="space-y-4 order-1 lg:order-2">
          <Card className="lg:sticky lg:top-20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                Carrito ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Selector de Cliente */}
              <div className="mb-4 pb-4 border-b">
                {selectedCustomer ? (
                  <div className="space-y-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-blue-900">{selectedCustomer.name}</p>
                            <p className="text-xs text-blue-600">{selectedCustomer.loyalty_points} puntos</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setCanRedeem(false);
                            setApplyDiscount(false);
                            setDiscountAmount(0);
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Opción de canjear puntos */}
                    {canRedeem && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={applyDiscount}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setApplyDiscount(checked);

                              if (checked) {
                                const total = cart.reduce((sum, item) => sum + (item.product.sale_price * item.quantity), 0);
                                const discount = Math.round(total * (REWARD_CONSTANTS.DISCOUNT_PERCENTAGE / 100));
                                setDiscountAmount(discount);
                              } else {
                                setDiscountAmount(0);
                              }
                            }}
                            className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-900">
                              Canjear {REWARD_CONSTANTS.POINTS_FOR_DISCOUNT} puntos por {REWARD_CONSTANTS.DISCOUNT_PERCENTAGE}% de descuento
                            </p>
                            <p className="text-xs text-yellow-700">
                              {applyDiscount ? `Descuento: ${formatCurrency(discountAmount)}` : 'Marca para aplicar descuento'}
                            </p>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      {showCustomerSearch ? 'Cerrar búsqueda' : 'Seleccionar Cliente'}
                    </Button>

                    {showCustomerSearch && (
                      <div className="mt-2 space-y-2">
                        <Input
                          placeholder="Buscar cliente..."
                          value={customerSearchTerm}
                          onChange={(e) => setCustomerSearchTerm(e.target.value)}
                          className="text-sm"
                        />
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {customers
                            .filter(c =>
                              c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                              c.phone?.includes(customerSearchTerm) ||
                              c.email?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                            )
                            .slice(0, 5)
                            .map(customer => (
                              <button
                                key={customer.id}
                                onClick={async () => {
                                  setSelectedCustomer(customer);
                                  setShowCustomerSearch(false);
                                  setCustomerSearchTerm('');

                                  // Verificar si el cliente puede canjear puntos
                                  const eligible = await canRedeemDiscount(customer.id);
                                  setCanRedeem(eligible);
                                  setApplyDiscount(false);
                                  setDiscountAmount(0);
                                }}
                                className="w-full text-left p-2 hover:bg-gray-100 rounded text-xs"
                              >
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-gray-500">{customer.phone || customer.email}</p>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 md:space-y-3 max-h-[300px] md:max-h-[400px] overflow-y-auto mb-4">
                {cart.length === 0 ? (
                  <p className="text-center text-gray-500 py-6 md:py-8 text-sm">Carrito vacío</p>
                ) : (
                  cart.map(item => (
                    <div key={item.product.id} className="flex items-center gap-1 md:gap-2 p-2 border rounded">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs md:text-sm truncate">{item.product.name}</p>
                        <p className="text-xs md:text-sm text-gray-500">
                          {formatCurrency(item.product.sale_price)} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="h-7 w-7 p-0 md:h-8 md:w-8"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={item.quantity}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Permitir vacío o solo números
                            if (value === '' || /^\d+$/.test(value)) {
                              if (value === '') {
                                // Permitir campo vacío temporalmente
                                setCart(prev =>
                                  prev.map(cartItem =>
                                    cartItem.product.id === item.product.id
                                      ? { ...cartItem, quantity: 0 }
                                      : cartItem
                                  )
                                );
                              } else {
                                const val = parseInt(value);
                                setDirectQuantity(item.product.id, val);
                              }
                            }
                          }}
                          onBlur={(e) => {
                            // Al perder el foco, si está vacío o es 0, establecer en 1
                            if (e.target.value === '' || parseInt(e.target.value) === 0) {
                              setDirectQuantity(item.product.id, 1);
                            }
                          }}
                          onKeyDown={(e) => {
                            // Permitir borrar con backspace/delete
                            if (e.key === 'Backspace' || e.key === 'Delete') {
                              return;
                            }
                            // Solo permitir números y teclas de control
                            if (!/\d/.test(e.key) && !['ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className="w-10 md:w-12 h-7 md:h-8 text-center text-xs md:text-sm p-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="h-7 w-7 p-0 md:h-8 md:w-8"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromCart(item.product.id)}
                        className="h-7 w-7 p-0 md:h-8 md:w-8 flex-shrink-0"
                      >
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <>
                  <div className="border-t pt-3 md:pt-4 space-y-2 md:space-y-3">
                    {discountAmount > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(cart.reduce((sum, item) => sum + (item.product.sale_price * item.quantity), 0))}</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600 font-semibold">
                          <span>Descuento ({REWARD_CONSTANTS.DISCOUNT_PERCENTAGE}%):</span>
                          <span>-{formatCurrency(discountAmount)}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between text-base md:text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-blue-600">{formatCurrency(calculateTotal())}</span>
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-xs md:text-sm font-medium">Método de Pago:</label>
                      <select
                        value={paymentMethod}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPaymentMethod(e.target.value as 'efectivo' | 'tarjeta' | 'transferencia')}
                        className="w-full h-9 md:h-10 rounded-md border border-gray-300 px-3 text-sm"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia</option>
                      </select>
                    </div>

                    <Button
                      className="w-full text-sm md:text-base"
                      size="lg"
                      onClick={processSale}
                      disabled={processing}
                    >
                      <DollarSign className="mr-2 h-4 w-4 md:h-5 md:w-5" />
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
