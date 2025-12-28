'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getStoreConfig,
  StoreConfig,
  createOrder,
  CreateOrderData,
  calculateDiscountedPrice,
} from '@/lib/storefront-api';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  ShoppingCart,
  User,
  Phone,
  Mail,
  MapPin,
  Store,
  Truck,
  MessageSquare,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
  discount_percentage?: number;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);

  // Datos del formulario
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'shipping'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Datos del pedido completado
  const [orderNumber, setOrderNumber] = useState('');
  const [orderTotal, setOrderTotal] = useState(0);
  const [storeWhatsApp, setStoreWhatsApp] = useState('');

  useEffect(() => {
    loadConfigAndCart();
  }, [slug]);

  const loadConfigAndCart = async () => {
    try {
      setLoading(true);
      const configData = await getStoreConfig(slug);
      setConfig(configData);

      // Establecer método de entrega por defecto según configuración
      if (configData.store_pickup_enabled && !configData.store_shipping_enabled) {
        setDeliveryMethod('pickup');
      } else if (!configData.store_pickup_enabled && configData.store_shipping_enabled) {
        setDeliveryMethod('shipping');
      }

      // Cargar carrito desde localStorage
      const cartKey = `cart_${slug}`;
      const savedCart = localStorage.getItem(cartKey);
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          if (parsedCart.length === 0) {
            // Carrito vacío, redirigir
            router.push(`/store/${slug}/cart`);
            return;
          }
          setCart(parsedCart);
        } catch {
          router.push(`/store/${slug}/cart`);
        }
      } else {
        router.push(`/store/${slug}/cart`);
      }
    } catch (err: any) {
      console.error('Error loading checkout:', err);
      toast.error('Error al cargar el checkout');
    } finally {
      setLoading(false);
    }
  };

  const calculateItemTotal = (item: CartItem): number => {
    const hasOffer = item.discount_percentage && item.discount_percentage > 0;
    const finalPrice = hasOffer
      ? calculateDiscountedPrice(item.price, item.discount_percentage!)
      : item.price;
    return finalPrice * item.quantity;
  };

  const subtotal = cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const totalDiscount = cart.reduce((sum, item) => {
    if (item.discount_percentage && item.discount_percentage > 0) {
      const originalTotal = item.price * item.quantity;
      const discountedTotal = calculateItemTotal(item);
      return sum + (originalTotal - discountedTotal);
    }
    return sum;
  }, 0);
  const total = subtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!customerName.trim()) {
      toast.error('Por favor ingresa tu nombre');
      return;
    }

    if (!customerPhone.trim()) {
      toast.error('Por favor ingresa tu teléfono');
      return;
    }

    if (deliveryMethod === 'shipping' && !deliveryAddress.trim()) {
      toast.error('Por favor ingresa la dirección de entrega');
      return;
    }

    if (config?.store_min_order && total < config.store_min_order) {
      toast.error(`El pedido mínimo es de ${formatCurrency(config.store_min_order)}`);
      return;
    }

    try {
      setSubmitting(true);

      // Preparar datos del pedido
      const orderData: CreateOrderData = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || undefined,
        delivery_method: deliveryMethod,
        delivery_address: deliveryMethod === 'shipping' ? deliveryAddress.trim() : undefined,
        notes: notes.trim() || undefined,
        items: cart.map((item) => {
          const hasOffer = item.discount_percentage && item.discount_percentage > 0;
          const finalPrice = hasOffer
            ? calculateDiscountedPrice(item.price, item.discount_percentage!)
            : item.price;

          return {
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: finalPrice,
            discount_percentage: item.discount_percentage,
          };
        }),
      };

      // Crear pedido
      const response = await createOrder(slug, orderData);

      // Guardar datos del pedido
      setOrderNumber(response.order_number);
      setOrderTotal(response.total);
      setStoreWhatsApp(response.store_whatsapp || config?.store_whatsapp || '');

      // Limpiar carrito
      localStorage.removeItem(`cart_${slug}`);
      setCart([]);

      // Marcar como completado
      setOrderCompleted(true);

      toast.success('¡Pedido realizado con éxito!');
    } catch (err: any) {
      console.error('Error creating order:', err);
      toast.error(err.message || 'Error al crear el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const sendWhatsAppMessage = () => {
    if (!storeWhatsApp) return;

    const phone = storeWhatsApp.replace(/\D/g, '');

    // Generar mensaje detallado
    let message = `🛍️ *Nuevo Pedido Web*\n\n`;
    message += `📋 *Pedido:* ${orderNumber}\n`;
    message += `👤 *Cliente:* ${customerName}\n`;
    message += `📱 *Teléfono:* ${customerPhone}\n`;
    if (customerEmail) {
      message += `📧 *Email:* ${customerEmail}\n`;
    }
    message += `\n🚚 *Método de entrega:* ${deliveryMethod === 'pickup' ? 'Recogida en tienda' : 'Envío a domicilio'}\n`;
    if (deliveryMethod === 'shipping' && deliveryAddress) {
      message += `📍 *Dirección:* ${deliveryAddress}\n`;
    }

    message += `\n📦 *Productos:*\n`;
    cart.forEach((item) => {
      const hasOffer = item.discount_percentage && item.discount_percentage > 0;
      const finalPrice = hasOffer
        ? calculateDiscountedPrice(item.price, item.discount_percentage!)
        : item.price;

      message += `• ${item.name} x${item.quantity} - ${formatCurrency(finalPrice * item.quantity)}`;
      if (hasOffer) {
        message += ` _(${item.discount_percentage}% OFF)_`;
      }
      message += `\n`;
    });

    if (totalDiscount > 0) {
      message += `\n💰 *Descuentos:* -${formatCurrency(totalDiscount)}\n`;
    }
    message += `\n💵 *TOTAL:* ${formatCurrency(orderTotal)}\n`;

    if (notes) {
      message += `\n📝 *Notas adicionales:*\n${notes}\n`;
    }

    message += `\n_Esperando confirmación y coordinación de pago_ 🙏`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando checkout...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Tienda no encontrada</h1>
          <Link href="/">
            <Button>Volver al inicio</Button>
          </Link>
        </div>
      </div>
    );
  }

  const primaryColor = config.store_primary_color || '#3B82F6';
  const secondaryColor = config.store_secondary_color || '#10B981';

  // Vista de pedido completado
  if (orderCompleted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header
          className="sticky top-0 z-50 bg-white shadow-md"
          style={{ borderBottom: `4px solid ${primaryColor}` }}
        >
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-center">
              <h1 className="text-xl font-bold">Pedido Realizado</h1>
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-12">
          <Card>
            <CardContent className="pt-8 text-center">
              <div
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ backgroundColor: `${secondaryColor}20` }}
              >
                <CheckCircle2 className="h-12 w-12" style={{ color: secondaryColor }} />
              </div>

              <h2 className="text-3xl font-bold mb-2">¡Pedido Realizado!</h2>
              <p className="text-gray-600 mb-6">
                Tu pedido ha sido registrado exitosamente
              </p>

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <p className="text-sm text-gray-600 mb-1">Número de pedido</p>
                <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                  {orderNumber}
                </p>
                <p className="text-3xl font-bold mt-4">{formatCurrency(orderTotal)}</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    📋 <strong>Siguiente paso:</strong> Envía los detalles de tu pedido por WhatsApp para coordinar el pago y la entrega
                  </p>
                </div>

                {storeWhatsApp && (
                  <Button
                    size="lg"
                    className="w-full text-lg"
                    style={{ backgroundColor: '#25D366' }}
                    onClick={sendWhatsAppMessage}
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Enviar pedido por WhatsApp
                  </Button>
                )}

                <Link href={`/store/${slug}`}>
                  <Button variant="outline" size="lg" className="w-full">
                    Volver a la tienda
                  </Button>
                </Link>
              </div>

              <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left text-sm text-gray-600">
                <p className="font-semibold mb-2">Información importante:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Tu pedido está en estado "pendiente"</li>
                  <li>Contacta a la tienda por WhatsApp para coordinar el pago</li>
                  <li>
                    {deliveryMethod === 'pickup'
                      ? 'Recoge tu pedido en la tienda una vez confirmado el pago'
                      : 'El envío se coordinará una vez confirmado el pago'}
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Formulario de checkout
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-white shadow-md"
        style={{ borderBottom: `4px solid ${primaryColor}` }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/store/${slug}/cart`}>
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-5 w-5" />
                Volver al carrito
              </Button>
            </Link>

            <h1 className="text-xl font-bold">Finalizar Pedido</h1>

            <div className="w-32"></div>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Formulario */}
            <div className="lg:col-span-2 space-y-6">
              {/* Datos del cliente */}
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" style={{ color: primaryColor }} />
                    Tus Datos
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nombre completo *</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Ej: Juan Pérez"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Teléfono *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Ej: 3001234567"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email (opcional)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Ej: correo@ejemplo.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Método de entrega */}
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Truck className="h-5 w-5" style={{ color: primaryColor }} />
                    Método de Entrega
                  </h2>

                  <RadioGroup value={deliveryMethod} onValueChange={(value: any) => setDeliveryMethod(value)}>
                    {config.store_pickup_enabled === 1 && (
                      <div className="flex items-center space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="pickup" id="pickup" />
                        <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Store className="h-5 w-5" />
                            <div>
                              <p className="font-semibold">Recogida en tienda</p>
                              <p className="text-sm text-gray-600">
                                Recoge tu pedido en la tienda
                              </p>
                              {config.store_address && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {config.store_address}
                                </p>
                              )}
                            </div>
                          </div>
                        </Label>
                      </div>
                    )}

                    {config.store_shipping_enabled === 1 && (
                      <div className="flex items-center space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="shipping" id="shipping" />
                        <Label htmlFor="shipping" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Truck className="h-5 w-5" />
                            <div>
                              <p className="font-semibold">Envío a domicilio</p>
                              <p className="text-sm text-gray-600">
                                Te lo enviamos a tu dirección
                              </p>
                            </div>
                          </div>
                        </Label>
                      </div>
                    )}
                  </RadioGroup>

                  {deliveryMethod === 'shipping' && (
                    <div className="mt-4">
                      <Label htmlFor="address">Dirección de entrega *</Label>
                      <Textarea
                        id="address"
                        placeholder="Ej: Calle 123 #45-67, Barrio Centro, Apartamento 301"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        required={deliveryMethod === 'shipping'}
                        rows={3}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Incluye todos los detalles necesarios para la entrega
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notas adicionales */}
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" style={{ color: primaryColor }} />
                    Notas Adicionales
                  </h2>

                  <Textarea
                    placeholder="¿Alguna indicación especial para tu pedido?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Resumen del pedido */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4">Resumen del Pedido</h2>

                  {/* Productos */}
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {cart.map((item) => {
                      const hasOffer = item.discount_percentage && item.discount_percentage > 0;
                      const finalPrice = hasOffer
                        ? calculateDiscountedPrice(item.price, item.discount_percentage!)
                        : item.price;

                      return (
                        <div key={item.id} className="flex justify-between text-sm">
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-gray-600">
                              {item.quantity} x {formatCurrency(finalPrice)}
                            </p>
                            {hasOffer && (
                              <span
                                className="text-xs font-bold"
                                style={{ color: secondaryColor }}
                              >
                                {item.discount_percentage}% OFF
                              </span>
                            )}
                          </div>
                          <p className="font-semibold">
                            {formatCurrency(calculateItemTotal(item))}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t pt-4 space-y-2">
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

                    <div className="border-t pt-2">
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total:</span>
                        <span style={{ color: primaryColor }}>
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {config.store_min_order && config.store_min_order > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Pedido mínimo: {formatCurrency(config.store_min_order)}
                      </p>
                      {total < config.store_min_order && (
                        <p className="text-sm font-semibold text-orange-600 mt-1">
                          Faltan {formatCurrency(config.store_min_order - total)}
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full mt-6 text-lg"
                    style={{ backgroundColor: primaryColor }}
                    disabled={submitting || (config.store_min_order ? total < config.store_min_order : false)}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Confirmar Pedido
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    Al confirmar, se creará tu pedido y podrás enviarlo por WhatsApp para coordinar el pago
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
