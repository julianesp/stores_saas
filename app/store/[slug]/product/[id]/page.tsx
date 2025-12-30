'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  getStoreConfig,
  getStoreProduct,
  StoreConfig,
  StoreProduct,
  calculateDiscountedPrice,
  parseProductImages,
} from '@/lib/storefront-api';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Minus,
  Package,
  Phone,
  Tag,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const productId = params.id as string;

  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    loadProduct();
  }, [slug, productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);

      const [configData, productData] = await Promise.all([
        getStoreConfig(slug),
        getStoreProduct(slug, productId),
      ]);

      setConfig(configData);
      setProduct(productData);
    } catch (err: any) {
      console.error('Error loading product:', err);
      setError(err.message || 'Error al cargar el producto');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    if (!product) return;

    try {
      // Obtener carrito actual
      const cartKey = `cart_${slug}`;
      const savedCart = localStorage.getItem(cartKey);
      let cart = savedCart ? JSON.parse(savedCart) : [];

      // Verificar si el producto ya está en el carrito
      const existingIndex = cart.findIndex((item: any) => item.id === product.id);

      if (existingIndex >= 0) {
        // Actualizar cantidad
        const newQuantity = cart[existingIndex].quantity + quantity;
        if (newQuantity > product.stock) {
          toast.error('No hay suficiente stock disponible');
          return;
        }
        cart[existingIndex].quantity = newQuantity;
      } else {
        // Agregar nuevo producto
        if (quantity > product.stock) {
          toast.error('No hay suficiente stock disponible');
          return;
        }
        cart.push({
          id: product.id,
          name: product.name,
          price: product.sale_price,
          quantity: quantity,
          image: parseProductImages(product.images)[0] || null,
          discount_percentage: product.discount_percentage || 0,
        });
      }

      // Guardar carrito
      localStorage.setItem(cartKey, JSON.stringify(cart));
      toast.success(`${quantity} ${quantity === 1 ? 'producto agregado' : 'productos agregados'} al carrito`);

      // Resetear cantidad a 1
      setQuantity(1);
    } catch (err) {
      console.error('Error adding to cart:', err);
      toast.error('Error al agregar al carrito');
    }
  };

  const openWhatsApp = () => {
    if (config?.store_whatsapp && product) {
      const phone = config.store_whatsapp.replace(/\D/g, '');
      const message = encodeURIComponent(
        `Hola! Estoy interesado en: ${product.name}\nPrecio: ${formatCurrency(product.sale_price)}`
      );
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-black">Cargando producto...</p>
        </div>
      </div>
    );
  }

  if (error || !product || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <Package className="h-16 w-16 text-black mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-black mb-2">Producto no encontrado</h1>
          <p className="text-black mb-4">{error || 'El producto que buscas no existe'}</p>
          <Link href={`/store/${slug}`}>
            <Button>Volver a la tienda</Button>
          </Link>
        </div>
      </div>
    );
  }

  const images = parseProductImages(product.images);
  const hasOffer = product.discount_percentage && product.discount_percentage > 0;
  const originalPrice = product.sale_price;
  const finalPrice = hasOffer
    ? calculateDiscountedPrice(originalPrice, product.discount_percentage!)
    : originalPrice;

  const primaryColor = config.store_primary_color || '#3B82F6';
  const secondaryColor = config.store_secondary_color || '#10B981';

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Galería de imágenes */}
          <div className="space-y-4">
            {/* Imagen principal */}
            <Card>
              <CardContent className="p-0">
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {hasOffer && (
                    <div
                      className="absolute top-4 right-4 z-10 text-white px-4 py-2 rounded-lg text-lg font-bold shadow-lg"
                      style={{ backgroundColor: secondaryColor }}
                    >
                      -{product.discount_percentage}% OFF
                    </div>
                  )}
                  {images.length > 0 ? (
                    <Image
                      src={images[selectedImage]}
                      alt={product.name}
                      fill
                      className="object-contain p-8"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-32 w-32 text-black" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Miniaturas */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? 'ring-2 ring-offset-2'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{
                      '--tw-ring-color': selectedImage === index ? primaryColor : undefined,
                    } as React.CSSProperties}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} - ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Información del producto */}
          <div className="space-y-6">
            <div>
              {product.category_name && (
                <p className="text-sm font-medium mb-2" style={{ color: primaryColor }}>
                  {product.category_name}
                </p>
              )}
              <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
                {product.name}
              </h1>

              {product.description && (
                <p className="text-black text-lg">{product.description}</p>
              )}
            </div>

            {/* Precio */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {hasOffer && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-5 w-5" style={{ color: secondaryColor }} />
                      <span className="text-lg text-black line-through">
                        {formatCurrency(originalPrice)}
                      </span>
                      <span
                        className="text-sm font-bold px-2 py-1 rounded"
                        style={{ backgroundColor: secondaryColor, color: 'white' }}
                      >
                        -{product.discount_percentage}%
                      </span>
                    </div>
                  )}
                  <p className="text-4xl font-bold" style={{ color: hasOffer ? secondaryColor : primaryColor }}>
                    {formatCurrency(finalPrice)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Stock */}
            <div className="flex items-center gap-2 text-black">
              <Package className="h-5 w-5" />
              <span>
                {product.stock > 0
                  ? `${product.stock} unidades disponibles`
                  : 'Sin stock'}
              </span>
            </div>

            {/* Cantidad */}
            {product.stock > 0 && (
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Cantidad
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-bold w-16 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="space-y-3">
              {product.stock > 0 ? (
                <Button
                  size="lg"
                  className="w-full text-lg"
                  style={{ backgroundColor: primaryColor }}
                  onClick={addToCart}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Agregar al carrito
                </Button>
              ) : (
                <Button size="lg" className="w-full text-lg" disabled>
                  Sin stock
                </Button>
              )}

              {config.store_whatsapp && (
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full text-lg"
                  style={{ borderColor: '#25D366', color: '#25D366' }}
                  onClick={openWhatsApp}
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Consultar por WhatsApp
                </Button>
              )}
            </div>

            {/* Información de entrega */}
            {(config.store_shipping_enabled || config.store_pickup_enabled) && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3">Opciones de entrega</h3>
                  <div className="space-y-2 text-sm text-black">
                    {config.store_pickup_enabled && (
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: primaryColor }} />
                        <span>Recogida en tienda disponible</span>
                      </div>
                    )}
                    {config.store_shipping_enabled && (
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: primaryColor }} />
                        <span>Envío a domicilio disponible</span>
                      </div>
                    )}
                    {config.store_min_order && config.store_min_order > 0 && (
                      <p className="text-xs text-black mt-2">
                        Pedido mínimo: {formatCurrency(config.store_min_order)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
