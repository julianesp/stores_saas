"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getStoreConfig,
  StoreConfig,
  createOrder,
  CreateOrderData,
  calculateDiscountedPrice,
  getStoreShippingZones,
  ShippingZonePublic,
} from "@/lib/storefront-api";
import { formatCurrency } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import {
  readCart,
  writeCart,
  type StoreCartItem,
} from "@/lib/storefront-cart";
import {
  ArrowLeft,
  ShoppingCart,
  User,
  Loader2,
  CheckCircle2,
  Store,
  Truck,
  MessageSquare,
  QrCode,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type CartItem = StoreCartItem;

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZonePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);

  // Datos del formulario
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "shipping">(
    "pickup"
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [notes, setNotes] = useState("");

  // Datos del pedido completado
  const [orderNumber, setOrderNumber] = useState("");
  const [orderTotal, setOrderTotal] = useState(0);
  const [storeWhatsApp, setStoreWhatsApp] = useState("");
  const [storeNequiNumber, setStoreNequiNumber] = useState("");
  // Items del pedido confirmado, preservados para el PDF (el carrito se vacía)
  const [orderItems, setOrderItems] = useState<CartItem[]>([]);
  const [orderShippingCost, setOrderShippingCost] = useState(0);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    loadConfigAndCart();
  }, [slug]);

  const loadConfigAndCart = async () => {
    try {
      setLoading(true);
      const [configData, zonesData] = await Promise.all([
        getStoreConfig(slug),
        getStoreShippingZones(slug),
      ]);
      setConfig(configData);
      setShippingZones(zonesData);

      // Establecer método de entrega por defecto según configuración
      if (
        configData.store_pickup_enabled &&
        !configData.store_shipping_enabled
      ) {
        setDeliveryMethod("pickup");
      } else if (
        !configData.store_pickup_enabled &&
        configData.store_shipping_enabled
      ) {
        setDeliveryMethod("shipping");
      }

      // Cargar carrito desde localStorage
      const parsedCart = readCart(slug);
      if (parsedCart.length === 0) {
        // Carrito vacío, redirigir
        router.push(`/store/${slug}/cart`);
        return;
      }
      setCart(parsedCart);
    } catch (err) {
      console.error("Error loading checkout:", err);
      toast.error("Error al cargar el checkout");
    } finally {
      setLoading(false);
    }
  };

  // Datos comunes para generar el comprobante PDF del pedido
  const buildOrderPdfData = () => ({
    storeName: config?.store_name || "Tienda",
    storePhone: config?.store_phone,
    storeWhatsapp: storeWhatsApp || config?.store_whatsapp,
    storeAddress: config?.store_address,
    orderNumber,
    customerName,
    customerPhone,
    deliveryMethod,
    deliveryAddress: deliveryMethod === "shipping" ? deliveryAddress : undefined,
    items: orderItems,
    shippingCost: orderShippingCost,
    notes: notes.trim() || undefined,
    primaryColor: config?.store_primary_color,
  });

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const { downloadOrderPDF } = await import("@/lib/storefront-order-pdf");
      await downloadOrderPDF(buildOrderPdfData());
    } catch (err) {
      console.error("Error generando PDF:", err);
      toast.error("No se pudo generar el comprobante");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const sendOrderByWhatsApp = () => {
    if (!storeWhatsApp) return;

    let message = `Hola! Acabo de realizar el pedido *${orderNumber}* por ${formatCurrency(orderTotal)}.\n`;
    message += `Mi nombre es ${customerName}.\n\n`;

    // Detalle de los productos pedidos, para que el tendero tenga la lista
    // también por WhatsApp (además del aviso de Telegram).
    message += `*Productos:*\n`;
    orderItems.forEach((item) => {
      const hasOffer =
        item.discount_percentage && item.discount_percentage > 0;
      const finalPrice = hasOffer
        ? calculateDiscountedPrice(item.price, item.discount_percentage!)
        : item.price;
      message += `• ${item.name} x${item.quantity} - ${formatCurrency(finalPrice * item.quantity)}\n`;
    });
    message += `\n`;

    message +=
      deliveryMethod === "pickup"
        ? "Recogeré el pedido en la tienda."
        : `Entrega a domicilio: ${deliveryAddress}.`;
    message += `\nYa realicé el pago por Nequi y adjunto el comprobante. 📎`;

    const url = buildWhatsAppLink(storeWhatsApp, message);
    if (url) window.open(url, "_blank");
  };

  // Descarga la imagen del QR de Nequi de la tienda, útil para quien paga
  // desde el mismo celular y no puede escanear su propia pantalla.
  const handleDownloadQr = async () => {
    if (!config?.payment_qr_url) return;
    try {
      const res = await fetch(config.payment_qr_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR-Nequi-${config.store_name || "tienda"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error descargando el QR:", err);
      toast.error("No se pudo descargar el QR");
    }
  };

  const calculateItemTotal = (item: CartItem): number => {
    const hasOffer = item.discount_percentage && item.discount_percentage > 0;
    const finalPrice = hasOffer
      ? calculateDiscountedPrice(item.price, item.discount_percentage!)
      : item.price;
    return finalPrice * item.quantity;
  };

  // Calcular subtotal SIN descuentos (precio original)
  const subtotalOriginal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Calcular total de descuentos
  const totalDiscount = cart.reduce((sum, item) => {
    if (item.discount_percentage && item.discount_percentage > 0) {
      const originalTotal = item.price * item.quantity;
      const discountAmount = originalTotal * (item.discount_percentage / 100);
      return sum + discountAmount;
    }
    return sum;
  }, 0);

  // Subtotal con descuentos aplicados
  const subtotal = subtotalOriginal - totalDiscount;

  const selectedZone = shippingZones.find((z) => z.id === selectedZoneId);
  const shippingAmount =
    deliveryMethod === "shipping" && selectedZone
      ? selectedZone.shipping_cost
      : 0;
  const total = subtotal + shippingAmount;

  // ¿Están todos los datos obligatorios listos para confirmar el pedido?
  // Mientras esto sea false, el botón "Confirmar Pedido" queda deshabilitado
  // (gris); cuando se completa todo, se habilita (azul).
  const meetsMinOrder = !(
    config?.store_min_order &&
    config.store_min_order > 0 &&
    subtotal < config.store_min_order
  );
  const shippingDataReady =
    deliveryMethod === "pickup" ||
    (deliveryAddress.trim().length > 0 && Boolean(selectedZoneId));
  const isFormValid =
    customerName.trim().length > 0 &&
    customerPhone.trim().length > 0 &&
    shippingDataReady &&
    meetsMinOrder;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!customerName.trim()) {
      toast.error("Por favor ingresa tu nombre");
      return;
    }

    if (!customerPhone.trim()) {
      toast.error("Por favor ingresa tu teléfono");
      return;
    }

    if (deliveryMethod === "shipping") {
      if (!deliveryAddress.trim()) {
        toast.error("Por favor ingresa la dirección de entrega");
        return;
      }
      if (!selectedZoneId) {
        toast.error("Por favor selecciona una zona de envío");
        return;
      }
    }

    // Validar pedido mínimo solo si está configurado (sobre el subtotal de
    // productos: el costo de envío no debe "completar" el mínimo)
    if (config?.store_min_order && config.store_min_order > 0 && subtotal < config.store_min_order) {
      toast.error(
        `El pedido mínimo es de ${formatCurrency(config.store_min_order)}`
      );
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
        delivery_address:
          deliveryMethod === "shipping" ? deliveryAddress.trim() : undefined,
        shipping_cost: shippingAmount > 0 ? shippingAmount : undefined,
        notes: notes.trim() || undefined,
        items: cart.map((item) => {
          const hasOffer =
            item.discount_percentage && item.discount_percentage > 0;
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
      setStoreWhatsApp(response.store_whatsapp || config?.store_whatsapp || "");
      setStoreNequiNumber(config?.store_nequi_number || "");

      // Preservar los items y el envío para el comprobante PDF antes de vaciar
      setOrderItems(cart);
      setOrderShippingCost(shippingAmount);

      // Limpiar carrito
      writeCart(slug, []);
      setCart([]);

      // Marcar como completado
      setOrderCompleted(true);

      toast.success("¡Pedido realizado con éxito!");
    } catch (err) {
      console.error("Error creating order:", err);
      toast.error(err instanceof Error ? err.message : "Error al crear el pedido");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-black">Cargando checkout...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
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

  // Vista de pedido completado
  if (orderCompleted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header
          className="sticky top-16 z-40 bg-white shadow-md"
          style={{ borderBottom: `4px solid ${primaryColor}` }}
        >
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-center">
              <h1 className="text-xl font-bold">Pedido Registrado - Paga con Nequi</h1>
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
                <CheckCircle2
                  className="h-12 w-12"
                  style={{ color: secondaryColor }}
                />
              </div>

              <h2 className="text-3xl font-bold mb-2">¡Pedido Registrado!</h2>
              <p className="text-black mb-6">
                Tu pedido ha sido creado. Ahora debes completar el pago.
              </p>

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <p className="text-sm text-black mb-1">Número de pedido</p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: primaryColor }}
                >
                  {orderNumber}
                </p>
                <p className="text-3xl font-bold mt-4">
                  {formatCurrency(orderTotal)}
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-500 rounded-lg text-left">
                  <p className="text-sm text-yellow-900">
                    ⚠️ <strong>¡IMPORTANTE!</strong> Tu pedido está registrado
                    pero aún NO está pagado. Paga con Nequi escaneando el código
                    de abajo y luego envía tu comprobante por WhatsApp.
                  </p>
                </div>

                {/* Pago con Nequi: QR de la tienda (preferido) y número */}
                {(config.payment_qr_url || storeNequiNumber) && (
                  <div className="p-5 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm font-semibold text-purple-900 mb-3 flex items-center justify-center gap-2">
                      <QrCode className="h-5 w-5" />
                      Paga con Nequi
                    </p>

                    {config.payment_qr_url && (
                      <div className="flex flex-col items-center mb-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={config.payment_qr_url}
                          alt="Código QR de Nequi para pagar"
                          className="w-52 h-52 object-contain bg-white rounded-lg p-2 border"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleDownloadQr}
                          className="mt-2 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                        >
                          <Download className="h-4 w-4 mr-1.5" />
                          Descargar QR
                        </Button>
                      </div>
                    )}

                    {storeNequiNumber && (
                      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg">
                        <div className="text-left">
                          <p className="text-xs text-purple-700">Número Nequi</p>
                          <p className="text-xl font-bold text-purple-700">
                            {storeNequiNumber}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(storeNequiNumber);
                            toast.success("Número copiado");
                          }}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                        >
                          Copiar
                        </Button>
                      </div>
                    )}

                    <p className="text-sm text-purple-700 mt-3 text-center">
                      Monto a pagar:{" "}
                      <strong>{formatCurrency(orderTotal)}</strong>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  {/* Descargar el resumen del pedido en PDF (lista de
                      productos, NO es un comprobante de pago) */}
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="w-full text-lg"
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                  >
                    {downloadingPdf ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-5 w-5 mr-2" />
                    )}
                    Descargar mi pedido (PDF)
                  </Button>

                  {/* Enviar el pedido por WhatsApp con el comprobante de pago */}
                  {storeWhatsApp && (
                    <Button
                      type="button"
                      size="lg"
                      className="w-full text-lg text-white"
                      style={{ backgroundColor: "#25D366" }}
                      onClick={sendOrderByWhatsApp}
                    >
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Enviar comprobante por WhatsApp
                    </Button>
                  )}

                  {/* Botón volver a la tienda */}
                  <Link href={`/store/${slug}`}>
                    <Button variant="outline" size="lg" className="w-full">
                      Volver a la tienda
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left text-sm text-black">
                <p className="font-semibold mb-2">¿Cómo completo mi pedido?</p>
                <ul className="space-y-1 list-decimal list-inside">
                  <li>Paga escaneando el código QR de Nequi con tu celular.</li>
                  <li>
                    Descarga el resumen de tu pedido (PDF) con la lista de
                    productos.
                  </li>
                  <li>
                    Envía por WhatsApp el comprobante del pago de Nequi para
                    confirmar tu pedido.
                  </li>
                  <li>
                    {deliveryMethod === "pickup"
                      ? "Recoge tu pedido en la tienda una vez confirmado el pago."
                      : "El domicilio ya está incluido en el total. Con tu comprobante coordinamos la entrega."}
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
      {/* Header contextual: debajo del navbar del layout (h-16), no encima */}
      <header
        className="sticky top-16 z-40 bg-white shadow-md"
        style={{ borderBottom: `4px solid ${primaryColor}` }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/store/${slug}/cart`}>
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-5 w-5 text-black" />
                <p className="text-black">Volver al carrito</p>
              </Button>
            </Link>

            <h1 className="text-xl text-black font-bold">Finalizar Pedido</h1>

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
                        placeholder="Ej: Nicola Tesla"
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
                        inputMode="numeric"
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
                    <Truck
                      className="h-5 w-5"
                      style={{ color: primaryColor }}
                    />
                    Método de Entrega
                  </h2>

                  <RadioGroup
                    value={deliveryMethod}
                    onValueChange={(value) =>
                      setDeliveryMethod(value as "pickup" | "shipping")
                    }
                  >
                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="pickup" id="pickup" />
                      <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Store className="h-5 w-5" />
                          <div>
                            <p className="font-semibold">Recogida en tienda</p>
                            <p className="text-sm text-black">
                              Recoge tu pedido en la tienda
                            </p>
                            {config.store_address && (
                              <p className="text-xs text-black mt-1">
                                {config.store_address}
                              </p>
                            )}
                          </div>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="shipping" id="shipping" />
                      <Label
                        htmlFor="shipping"
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Truck className="h-5 w-5" />
                          <div>
                            <p className="font-semibold">Envío a domicilio</p>
                            <p className="text-sm text-black">
                              Te lo enviamos a tu dirección (costo adicional)
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  {deliveryMethod === "shipping" && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <Label htmlFor="address">Dirección de entrega *</Label>
                        <Textarea
                          id="address"
                          placeholder="Ej: Calle 123 #45-67, Barrio Centro, Apartamento 301"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          required={deliveryMethod === "shipping"}
                          rows={3}
                        />
                        <p className="text-xs text-black mt-1">
                          Incluye todos los detalles necesarios para la entrega
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="shipping-zone">Zona de envío *</Label>
                        {shippingZones.length > 0 ? (
                          <Select
                            value={selectedZoneId}
                            onValueChange={setSelectedZoneId}
                          >
                            <SelectTrigger className="bg-white text-black">
                              <SelectValue placeholder="Selecciona tu zona" />
                            </SelectTrigger>
                            <SelectContent className="bg-white text-black">
                              {shippingZones.map((zone) => (
                                <SelectItem
                                  key={zone.id}
                                  value={zone.id}
                                  className="bg-white cursor-pointer text-black"
                                >
                                  {zone.zone_name} -{" "}
                                  {formatCurrency(zone.shipping_cost)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              No hay zonas de envío configuradas. Contacta a la
                              tienda por WhatsApp.
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-black mt-1">
                          El costo de envío se agregará al total de tu pedido
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notas adicionales */}
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <MessageSquare
                      className="h-5 w-5"
                      style={{ color: primaryColor }}
                    />
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
                      const hasOffer = Boolean(
                        item.discount_percentage &&
                        item.discount_percentage > 0
                      );
                      const finalPrice = hasOffer
                        ? calculateDiscountedPrice(
                            item.price,
                            item.discount_percentage!
                          )
                        : item.price;

                      return (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-black">
                              {item.quantity} x {formatCurrency(finalPrice)}
                              {hasOffer && (
                                <span className="ml-2 text-xs italic line-through text-gray-400">
                                  {formatCurrency(item.price)}
                                </span>
                              )}
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
                    {totalDiscount > 0 ? (
                      <>
                        <div className="flex justify-between text-black">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(subtotalOriginal)}</span>
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
                        <div className="flex justify-between text-black font-medium">
                          <span>Subtotal con descuentos:</span>
                          <span>{formatCurrency(subtotal)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-black">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                    )}

                    {shippingAmount > 0 && (
                      <div className="flex justify-between text-black">
                        <span>Envío:</span>
                        <span>{formatCurrency(shippingAmount)}</span>
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
                    <div className="mt-4 p-3 bg-brand-light/50 rounded-lg">
                      <p className="text-sm text-black">
                        Pedido mínimo: {formatCurrency(config.store_min_order)}
                      </p>
                      {subtotal < config.store_min_order && (
                        <p className="text-sm font-semibold text-orange-600 mt-1">
                          Faltan{" "}
                          {formatCurrency(config.store_min_order - subtotal)}
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-black text-center mt-4">
                    Al confirmar, se creará tu pedido y podrás pagar con Nequi y
                    enviar tu comprobante por WhatsApp
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Barra fija inferior con el botón de confirmar. Queda deshabilitado
            (gris) mientras falten datos y se habilita (azul) al completarlos.
            El padding inferior del contenido evita que la barra tape el resumen. */}
        <div className="h-24" aria-hidden="true" />
        <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <Button
              type="submit"
              size="lg"
              className="w-full text-lg transition-colors disabled:opacity-100 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              style={
                isFormValid && !submitting
                  ? { backgroundColor: primaryColor }
                  : undefined
              }
              disabled={submitting || !isFormValid}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {isFormValid ? "Confirmar Pedido" : "Completa tus datos"}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
