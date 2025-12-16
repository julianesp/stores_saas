'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { Search, ShoppingCart, Trash2, Plus, Minus, DollarSign, User, X, Package, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProducts, createProduct, updateProduct, getCustomers, getCustomerById, createCustomer, updateCustomer, getCategories, createCategory, updateCategory, getSales, createSale, getUserProfile } from '@/lib/cloudflare-api';
import { Product, Customer, Category } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { calculatePointsForPurchase, addPointsToCustomer, canRedeemDiscount, redeemPointsForDiscount, getPointsMilestoneMessage, REWARD_CONSTANTS } from '@/lib/loyalty-helpers';
import { canCustomerGetCredit, updateCustomerDebt } from '@/lib/cloudflare-credit-helpers';
import Swal from '@/lib/sweetalert';

interface CartItem {
  product: Product;
  quantity: number;
}

export default function POSPage() {
  const { getToken } = useAuth();

  const { user } = useUser();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'credito'>('efectivo');
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
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [scanSuccess, setScanSuccess] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const handleCreateCustomer = async () => {
    if (!newCustomerData.name.trim()) {
      Swal.warning('Nombre requerido', 'Debes ingresar el nombre del cliente');
      return;
    }

    try {
      const customerData: any = {
        name: newCustomerData.name.trim(),
        phone: newCustomerData.phone.trim() || undefined,
        email: newCustomerData.email.trim() || undefined,
        loyalty_points: 0,
      };

      const newCustomer = await createCustomer(customerData, getToken) as any as Customer;

      Swal.success('Cliente creado', `${newCustomer.name} ha sido agregado exitosamente`);

      // Seleccionar automáticamente el nuevo cliente
      setSelectedCustomer(newCustomer);

      // Limpiar el formulario y cerrarlo
      setNewCustomerData({ name: '', phone: '', email: '' });
      setShowNewCustomerForm(false);
      setShowCustomerSearch(false);

      // Actualizar lista de clientes
      await fetchCustomers();
    } catch (error) {
      console.error('Error creating customer:', error);
      Swal.error('Error al crear cliente', 'Intenta nuevamente');
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      const data = (await getProducts(getToken)) as Product[];
      // Filtrar productos con stock > 0
      const productsInStock = data.filter(p => p.stock > 0);
      // Ordenar por nombre manualmente
      productsInStock.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(productsInStock);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, [getToken]);

  const fetchCustomers = useCallback(async () => {
    try {
      const data = (await getCustomers(getToken)) as Customer[];
      data.sort((a, b) => a.name.localeCompare(b.name));
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = (await getCategories(getToken)) as Category[];
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
      // Efecto visual de éxito
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 500);

      addToCart(product);
      setBarcodeInput('');

      // Toast pequeño y no intrusivo
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
          Swal.warning('Cantidad insuficiente', 'No hay más unidades disponibles');
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
            Swal.warning('Cantidad insuficiente', 'No hay más unidades disponibles');
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
            Swal.warning('Cantidad insuficiente', `Solo hay ${item.product.stock} unidades disponibles`);
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

    // Validar venta a crédito
    if (paymentMethod === 'credito') {
      if (!selectedCustomer) {
        Swal.warning('Cliente requerido', 'Debes seleccionar un cliente para vender a crédito');
        return;
      }

      const total = calculateTotal();
      const creditCheck = await canCustomerGetCredit(selectedCustomer.id, total, getToken);

      if (!creditCheck.canGetCredit) {
        Swal.error('Crédito no disponible', creditCheck.message || 'Este cliente no puede recibir más crédito');
        return;
      }
    }

    setProcessing(true);
    Swal.loading('Procesando venta...');
    try {
      // Obtener user_profile del usuario actual
      let userProfile = null;
      try {
        userProfile = await getUserProfile(getToken);
      } catch (error) {
        console.error('User profile not found:', error);
        Swal.closeLoading();
        Swal.error('Error', 'Perfil de usuario no encontrado. Asegúrate de haber iniciado sesión correctamente.');
        setProcessing(false);
        return;
      }

      if (!userProfile || !userProfile.id) {
        Swal.closeLoading();
        Swal.error('Perfil inválido', 'No se pudo obtener información del usuario autenticado.');
        setProcessing(false);
        return;
      }

      const subtotal = cart.reduce((sum, item) => sum + (item.product.sale_price * item.quantity), 0);
      // El número de venta se genera automáticamente en la API de Cloudflare

      // Canjear puntos por descuento si aplica
      let appliedDiscount = 0;
      let pointsRedeemed = 0;
      if (selectedCustomer && applyDiscount) {
        const redeemResult = await redeemPointsForDiscount(selectedCustomer.id, subtotal, getToken);
        appliedDiscount = redeemResult.discount;
        pointsRedeemed = redeemResult.pointsRedeemed;
      }

      const total = subtotal - appliedDiscount;

      // Calcular puntos si hay un cliente seleccionado (después de aplicar descuento)
      // NOTA: En ventas a crédito, los puntos NO se asignan hasta que se pague completamente
      let pointsEarned = 0;
      let pointsToAssignNow = 0;

      if (selectedCustomer) {
        // Calcular puntos basados en el total de la compra
        pointsEarned = await calculatePointsForPurchase(userProfile.id, total);

        // Solo asignar puntos inmediatamente si NO es venta a crédito
        if (paymentMethod !== 'credito') {
          pointsToAssignNow = pointsEarned;
        } else {
          // En ventas a crédito, guardamos los puntos en la venta
          // pero NO los asignamos al cliente hasta que se pague completamente
          pointsToAssignNow = 0;
        }
      }

      // Crear la venta
      const saleData: any = {
        // sale_number se genera automáticamente en la API
        cashier_id: userProfile.id,
        customer_id: selectedCustomer?.id || null,
        subtotal: subtotal,
        tax: 0,
        discount: appliedDiscount,
        total: total,
        payment_method: paymentMethod,
        status: paymentMethod === 'credito' ? 'pendiente' : 'completada',
        points_earned: pointsEarned || 0,
        notes: null,
      };

      // Campos específicos para ventas a crédito
      if (paymentMethod === 'credito') {
        saleData.payment_status = 'pendiente';
        saleData.amount_paid = 0;
        saleData.amount_pending = total;
        // Fecha de vencimiento: 30 días desde hoy
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        saleData.due_date = dueDate.toISOString();
      } else {
        saleData.payment_status = null;
        saleData.amount_paid = null;
        saleData.amount_pending = null;
        saleData.due_date = null;
      }

      // Agregar items a la venta (la API de Cloudflare los crea automáticamente)
      saleData.items = cart.map(cartItem => ({
        product_id: cartItem.product.id,
        quantity: cartItem.quantity,
        unit_price: cartItem.product.sale_price,
        discount: 0,
        subtotal: cartItem.product.sale_price * cartItem.quantity
      }));

      // Validación básica antes de enviar al API para evitar errores de D1 por valores undefined
      if (!saleData.total || !saleData.payment_method || !Array.isArray(saleData.items) || saleData.items.length === 0) {
        Swal.closeLoading();
        Swal.error('Datos de venta inválidos', 'Faltan campos requeridos (total, payment_method o items)');
        setProcessing(false);
        return;
      }

      for (const item of saleData.items) {
        if (!item.product_id || typeof item.quantity !== 'number' || item.quantity <= 0 || typeof item.unit_price !== 'number' || typeof item.subtotal !== 'number') {
          Swal.closeLoading();
          Swal.error('Datos de producto inválidos', 'Revisa los productos en el carrito (id, cantidad o precio inválidos)');
          setProcessing(false);
          return;
        }
      }

      const sale = await createSale(saleData, getToken);

      // Actualizar el stock de los productos
      for (const cartItem of cart) {
        const newStock = cartItem.product.stock - cartItem.quantity;
        await updateProduct(cartItem.product.id, {
          stock: newStock
        }, getToken);

        // TODO: Implementar API endpoint para inventory_movements
        // Por ahora la cantidad se actualiza pero no se registra el movimiento de inventario
        // Esto se puede implementar más adelante creando una ruta /api/inventory-movements
      }

      // Asignar puntos al cliente si aplica (solo para ventas NO a crédito)
      let customerReachedRewardThreshold = false;
      let customerNewPoints = 0;

      if (selectedCustomer && pointsToAssignNow > 0) {
        await addPointsToCustomer(selectedCustomer.id, pointsToAssignNow, getToken);

        // Verificar si el cliente alcanzó el umbral para obtener descuento
        const updatedCustomer = await getCustomerById(selectedCustomer.id, getToken);
        customerNewPoints = (updatedCustomer as any).loyalty_points || 0;

        // Si el cliente ahora tiene >= 100 puntos y antes tenía < 100, alcanzó el umbral
        const previousPoints = selectedCustomer.loyalty_points || 0;
        const REWARD_THRESHOLD = REWARD_CONSTANTS.POINTS_FOR_DISCOUNT;

        if (previousPoints < REWARD_THRESHOLD && customerNewPoints >= REWARD_THRESHOLD) {
          customerReachedRewardThreshold = true;
        }
      }

      // Actualizar deuda del cliente si es venta a crédito
      if (paymentMethod === 'credito' && selectedCustomer) {
        await updateCustomerDebt(selectedCustomer.id, total, getToken);
      }

      Swal.closeLoading();

      // Mostrar notificación especial si el cliente alcanzó el umbral de recompensa
      if (customerReachedRewardThreshold && selectedCustomer) {
        await Swal.custom({
          icon: 'success',
          title: '🎉 ¡Cliente Alcanzó Recompensa!',
          html: `
            <div class="text-left space-y-3">
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                <p class="text-lg font-bold text-yellow-800 mb-2">
                  🏆 ${selectedCustomer.name}
                </p>
                <p class="text-sm text-gray-700 mb-2">
                  Ahora tiene <strong class="text-yellow-600">${customerNewPoints} puntos acumulados</strong>
                </p>
                <p class="text-sm text-green-700 font-semibold">
                  ✓ Ya puede canjear un descuento del ${REWARD_CONSTANTS.DISCOUNT_PERCENTAGE}% en su próxima compra
                </p>
              </div>
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-600">
                <p><strong>Recuerda:</strong> El cliente puede canjear ${REWARD_CONSTANTS.POINTS_FOR_DISCOUNT} puntos por un ${REWARD_CONSTANTS.DISCOUNT_PERCENTAGE}% de descuento en su próxima compra.</p>
              </div>
            </div>
          `,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#EAB308',
          timer: 8000,
          timerProgressBar: true,
        });
      }

      // Mostrar mensaje personalizado
      if (selectedCustomer) {
        let htmlContent = `
          <p class="text-lg mb-2">Venta #${sale.sale_number}</p>
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
          if (paymentMethod === 'credito') {
            // Para ventas a crédito, mostrar que los puntos se asignarán al pagar
            htmlContent += `
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                <p class="text-sm font-bold text-yellow-600">⏳ ${pointsEarned} puntos pendientes</p>
                <p class="text-xs text-gray-600 mt-1">Se asignarán cuando se complete el pago</p>
              </div>
            `;
          } else {
            // Para ventas normales, mostrar que los puntos ya se asignaron
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
        }

        // Agregar mensaje especial para ventas a crédito
        if (paymentMethod === 'credito') {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);
          htmlContent += `
            <div class="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
              <p class="text-sm font-semibold text-orange-800">💳 Venta a Crédito</p>
              <p class="text-xs text-gray-600 mt-1">Fecha de vencimiento: ${dueDate.toLocaleDateString('es-CO')}</p>
            </div>
          `;
        }

        await Swal.custom({
          title: paymentMethod === 'credito' ? 'Venta a Crédito Registrada' : 'Venta Completada',
          html: htmlContent,
          icon: 'success',
          confirmButtonText: 'Aceptar'
        });
      } else {
        Swal.saleCompleted(sale.sale_number, total);
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

  // Modal cuando no hay productos
  if (products.length === 0) {
    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Package className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Bienvenido al Punto de Venta!
            </h2>
            <p className="text-gray-600">
              Para comenzar a vender, primero necesitas agregar productos a tu inventario.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href="/dashboard/products/new"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              <Plus className="inline-block h-5 w-5 mr-2 -mt-1" />
              Crear Mi Primer Producto
            </a>

            <button
              onClick={async () => {
                const response = await fetch('/api/seed-products', { method: 'POST' });
                const data = await response.json();
                if (response.ok) {
                  Swal.success('¡Productos creados!', data.message);
                  fetchProducts();
                } else {
                  Swal.error('Error', data.error || 'No se pudieron crear productos de ejemplo');
                }
              }}
              className="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              <Package className="inline-block h-5 w-5 mr-2 -mt-1" />
              Crear Productos de Ejemplo
            </button>

            <a
              href="/dashboard/products"
              className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Ver Todos los Productos
            </a>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              💡 <strong>Consejo:</strong> Puedes crear productos de ejemplo para probar el sistema rápidamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* <h1 className="text-2xl md:text-3xl font-bold">Punto de Venta</h1> */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Panel izquierdo - Productos */}
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
          {/* Búsqueda por código de barras */}
          <Card className={`border-2 shadow-lg transition-all duration-300 ${
            scanSuccess
              ? 'border-green-500 bg-green-50'
              : 'border-blue-500 bg-gradient-to-r from-blue-50 to-white'
          }`}>
            <CardContent className="pt-6">
              <form onSubmit={handleBarcodeSearch} className="space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg transition-colors ${
                    scanSuccess ? 'bg-green-600' : 'bg-blue-600'
                  }`}>
                    <Scan className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">
                      {scanSuccess ? '✓ Producto Agregado' : 'Escanear Producto'}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {scanSuccess ? 'Escanea el siguiente producto' : 'Escanea o escribe el código de barras'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      ref={barcodeRef}
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      placeholder="Escanea aquí el código de barras..."
                      className={`h-14 text-xl font-mono tracking-wider border-2 focus:ring-2 pl-12 transition-colors ${
                        scanSuccess
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                          : 'border-blue-300 focus:border-blue-500 focus:ring-blue-200'
                      }`}
                      autoComplete="off"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <Scan className={`h-6 w-6 ${
                        scanSuccess ? 'text-green-600' : 'text-blue-600 animate-pulse'
                      }`} />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className={`shrink-0 h-14 px-6 transition-colors ${
                      scanSuccess
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Search className="h-5 w-5 mr-2" />
                    Agregar
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className={`h-1.5 w-1.5 rounded-full ${
                    scanSuccess ? 'bg-green-500 animate-ping' : 'bg-green-500'
                  }`}></div>
                  <span>
                    {scanSuccess
                      ? 'Producto agregado al carrito'
                      : 'Listo para escanear - Presiona Enter o click en Agregar'
                    }
                  </span>
                </div>
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
                      {/* Imagen del producto */}
                      <div className="relative w-full aspect-square mb-2 bg-gray-50 rounded-md overflow-hidden">
                        {product.images && product.images.length > 0 ? (
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-contain p-2"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 md:h-12 md:w-12 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-xs md:text-sm mb-1 line-clamp-2">{product.name}</h4>
                      <p className="text-sm md:text-lg font-bold text-blue-600">
                        {formatCurrency(product.sale_price)}
                      </p>
                      <p className="text-xs text-gray-500">Disponible: {product.stock}</p>
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

                        {/* Botón para crear nuevo cliente */}
                        {!showNewCustomerForm && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => setShowNewCustomerForm(true)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Crear Nuevo Cliente
                          </Button>
                        )}

                        {/* Formulario de creación de cliente */}
                        {showNewCustomerForm && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-gray-700">Nuevo Cliente</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setShowNewCustomerForm(false);
                                  setNewCustomerData({ name: '', phone: '', email: '' });
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <Input
                              placeholder="Nombre *"
                              value={newCustomerData.name}
                              onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                              className="text-xs h-8"
                            />
                            <Input
                              placeholder="Teléfono"
                              value={newCustomerData.phone}
                              onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                              className="text-xs h-8"
                            />
                            <Input
                              placeholder="Email"
                              type="email"
                              value={newCustomerData.email}
                              onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                              className="text-xs h-8"
                            />
                            <Button
                              size="sm"
                              className="w-full text-xs h-8"
                              onClick={handleCreateCustomer}
                            >
                              Crear Cliente
                            </Button>
                          </div>
                        )}

                        {/* Lista de clientes con scroll mejorado */}
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {customers
                            .filter(c =>
                              c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                              c.phone?.includes(customerSearchTerm) ||
                              c.email?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                            )
                            .slice(0, 10)
                            .map(customer => (
                              <button
                                key={customer.id}
                                onClick={async () => {
                                  setSelectedCustomer(customer);
                                  setShowCustomerSearch(false);
                                  setCustomerSearchTerm('');
                                  setShowNewCustomerForm(false);

                                  // Verificar si el cliente puede canjear puntos
                                  const eligible = await canRedeemDiscount(customer.id, getToken);
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
                          className="h-7 w-7 p-0 md:h-8 md:w-8 shrink-0"
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
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPaymentMethod(e.target.value as 'efectivo' | 'tarjeta' | 'transferencia' | 'credito')}
                        className="w-full h-9 md:h-10 rounded-md border border-gray-300 px-3 text-sm"
                      >
                        <option value="efectivo">Efectivo</option>
                        {/* <option value="tarjeta">Tarjeta</option> */}
                        <option value="transferencia">Transferencia</option>
                        <option value="credito" disabled={!selectedCustomer}>
                          Crédito {!selectedCustomer && '(Requiere cliente)'}
                        </option>
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
