"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  getStoreConfig,
  StoreConfig,
  calculateDiscountedPrice,
} from "@/lib/storefront-api";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Package,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number; // Agregar stock para validación
  image: string | null;
  discount_percentage?: number;
}

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfigAndCart();
  }, [slug]);

  const loadConfigAndCart = async () => {
    try {
      setLoading(true);
      const configData = await getStoreConfig(slug);
      setConfig(configData);

      // Cargar carrito desde localStorage
      const cartKey = `cart_${slug}`;
      const savedCart = localStorage.getItem(cartKey);
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          setCart(parsedCart);
        } catch {
          setCart([]);
        }
      }
    } catch (err: any) {
      console.error("Error loading cart:", err);
      toast.error("Error al cargar el carrito");
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    // Encontrar el producto para verificar el stock
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;

    // Validar que no exceda el stock disponible
    if (newQuantity > item.stock) {
      toast.error(
        `Solo hay ${item.stock} unidades disponibles de este producto`
      );
      return;
    }

    const updatedCart = cart.map((cartItem) =>
      cartItem.id === itemId ? { ...cartItem, quantity: newQuantity } : cartItem
    );

    setCart(updatedCart);
    localStorage.setItem(`cart_${slug}`, JSON.stringify(updatedCart));
    toast.success("Cantidad actualizada");
  };

  const handleQuantityInput = (itemId: string, value: string) => {
    // Permitir campo vacío temporalmente mientras el usuario escribe
    if (value === "") {
      // Actualizar solo visualmente, sin guardar en localStorage todavía
      const updatedCart = cart.map((cartItem) =>
        cartItem.id === itemId ? { ...cartItem, quantity: 0 } : cartItem
      );
      setCart(updatedCart);
      return;
    }

    // Permitir solo números
    const numericValue = value.replace(/[^0-9]/g, "");

    if (numericValue === "") return;

    const quantity = parseInt(numericValue, 10);

    if (isNaN(quantity) || quantity < 1) return;

    // Encontrar el producto para verificar el stock
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;

    // Si excede el stock, ajustar al máximo disponible
    const finalQuantity = Math.min(quantity, item.stock);

    if (quantity > item.stock) {
      toast.error(
        `Solo hay ${item.stock} unidades disponibles. Ajustando al máximo.`
      );
    }

    const updatedCart = cart.map((cartItem) =>
      cartItem.id === itemId
        ? { ...cartItem, quantity: finalQuantity }
        : cartItem
    );

    setCart(updatedCart);
    localStorage.setItem(`cart_${slug}`, JSON.stringify(updatedCart));
  };

  const removeItem = (itemId: string) => {
    const updatedCart = cart.filter((item) => item.id !== itemId);
    setCart(updatedCart);
    localStorage.setItem(`cart_${slug}`, JSON.stringify(updatedCart));
    toast.success("Producto eliminado del carrito");
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(`cart_${slug}`);
    toast.success("Carrito vaciado");
  };

  const calculateItemTotal = (item: CartItem): number => {
    const hasOffer = item.discount_percentage && item.discount_percentage > 0;
    const finalPrice = hasOffer
      ? calculateDiscountedPrice(item.price, item.discount_percentage!)
      : item.price;
    return finalPrice * item.quantity;
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0
  );
  const totalDiscount = cart.reduce((sum, item) => {
    if (item.discount_percentage && item.discount_percentage > 0) {
      const originalTotal = item.price * item.quantity;
      const discountedTotal = calculateItemTotal(item);
      return sum + (originalTotal - discountedTotal);
    }
    return sum;
  }, 0);
  const total = subtotal;

  const handleCheckout = () => {
    if (config?.store_min_order && total < config.store_min_order) {
      toast.error(
        `El pedido mínimo es de ${formatCurrency(config.store_min_order)}`
      );
      return;
    }

    // Por ahora, redirigir a una página de checkout (la crearemos después)
    router.push(`/store/${slug}/checkout`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando carrito...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Tienda no encontrada
          </h1>
          <Link href="/">
            <Button>Volver al inicio</Button>
          </Link>
        </div>
      </div>
    );
  }

  const primaryColor = config.store_primary_color || "#3B82F6";
  const secondaryColor = config.store_secondary_color || "#10B981";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-white shadow-md"
        style={{ borderBottom: `4px solid ${primaryColor}` }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/store/${slug}`}>
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-5 w-5" />
                Seguir comprando
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <ShoppingCart
                className="h-5 w-5"
                style={{ color: primaryColor }}
              />
              <h1 className="text-xl font-bold">Carrito de Compras</h1>
            </div>

            {cart.length > 0 && (
              <Button
                variant="ghost"
                onClick={clearCart}
                className="text-red-600"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Vaciar
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {cart.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Tu carrito está vacío
            </h2>
            <p className="text-gray-600 mb-6">
              Agrega productos para comenzar tu compra
            </p>
            <Link href={`/store/${slug}`}>
              <Button size="lg" style={{ backgroundColor: primaryColor }}>
                Explorar productos
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lista de productos */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl font-bold mb-4">
                Productos ({cart.length})
              </h2>

              {cart.map((item) => {
                const hasOffer =
                  item.discount_percentage && item.discount_percentage > 0;
                const finalPrice = hasOffer
                  ? calculateDiscountedPrice(
                      item.price,
                      item.discount_percentage!
                    )
                  : item.price;
                const itemTotal = calculateItemTotal(item);

                return (
                  <Card
                    key={item.id}
                    className={hasOffer ? "border-2" : ""}
                    style={hasOffer ? { borderColor: secondaryColor } : {}}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Imagen */}
                        <div className="relative w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-12 w-12 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Información */}
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {item.name}
                              </h3>
                              {hasOffer && (
                                <span
                                  className="text-xs font-bold px-2 py-1 rounded text-white"
                                  style={{ backgroundColor: secondaryColor }}
                                >
                                  -{item.discount_percentage}% OFF
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {/* Precio */}
                            <div>
                              {hasOffer && (
                                <p className="text-sm text-gray-400 line-through">
                                  {formatCurrency(item.price)}
                                </p>
                              )}
                              <p
                                className="text-xl font-bold"
                                style={{
                                  color: hasOffer
                                    ? secondaryColor
                                    : primaryColor,
                                }}
                              >
                                {formatCurrency(finalPrice)}
                              </p>
                            </div>

                            {/* Selector de cantidad */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity - 1)
                                  }
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={
                                    item.quantity === 0
                                      ? ""
                                      : String(item.quantity)
                                  }
                                  onChange={(e) =>
                                    handleQuantityInput(item.id, e.target.value)
                                  }
                                  onBlur={(e) => {
                                    // Si el campo está vacío al perder foco, restaurar a 1
                                    if (
                                      !e.target.value ||
                                      parseInt(e.target.value) < 1
                                    ) {
                                      updateQuantity(item.id, 1);
                                    }
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  className="w-16 text-center text-lg font-semibold"
                                  min="1"
                                  max={item.stock}
                                  placeholder="0"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity + 1)
                                  }
                                  disabled={item.quantity >= item.stock}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>

                                <div className="ml-auto">
                                  <p className="text-sm text-gray-600">
                                    Subtotal:
                                  </p>
                                  <p className="text-lg font-bold">
                                    {formatCurrency(itemTotal)}
                                  </p>
                                </div>
                              </div>
                              {/* Indicador de stock */}
                              <p className="text-xs text-gray-500">
                                {item.quantity >= item.stock ? (
                                  <span className="text-orange-600 font-semibold">
                                    ⚠️ Stock máximo alcanzado ({item.stock}{" "}
                                    disponibles)
                                  </span>
                                ) : (
                                  <span>
                                    Disponibles: {item.stock} unidades
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Resumen del pedido */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4">Resumen del Pedido</h2>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>

                    {totalDiscount > 0 && (
                      <div
                        className="flex justify-between font-semibold"
                        style={{ color: secondaryColor }}
                      >
                        <span>Descuentos:</span>
                        <span>-{formatCurrency(totalDiscount)}</span>
                      </div>
                    )}

                    <div className="border-t pt-3">
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total:</span>
                        <span style={{ color: primaryColor }}>
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {config.store_min_order && config.store_min_order > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Pedido mínimo: {formatCurrency(config.store_min_order)}
                      </p>
                      {total < config.store_min_order && (
                        <p className="text-sm font-semibold text-orange-600 mt-1">
                          Faltan{" "}
                          {formatCurrency(config.store_min_order - total)} para
                          el mínimo
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    size="lg"
                    className="w-full text-lg"
                    style={{ backgroundColor: primaryColor }}
                    onClick={handleCheckout}
                    disabled={
                      config.store_min_order
                        ? total < config.store_min_order
                        : false
                    }
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Continuar con el pago
                  </Button>

                  {/* Información de entrega */}
                  {(config.store_shipping_enabled ||
                    config.store_pickup_enabled) && (
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="font-semibold mb-3 text-sm">
                        Opciones de entrega
                      </h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        {config.store_pickup_enabled && (
                          <div className="flex items-start gap-2">
                            <div
                              className="w-1.5 h-1.5 rounded-full mt-2"
                              style={{ backgroundColor: primaryColor }}
                            />
                            <span>Recogida en tienda</span>
                          </div>
                        )}
                        {config.store_shipping_enabled && (
                          <div className="flex items-start gap-2">
                            <div
                              className="w-1.5 h-1.5 rounded-full mt-2"
                              style={{ backgroundColor: primaryColor }}
                            />
                            <span>Envío a domicilio</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
