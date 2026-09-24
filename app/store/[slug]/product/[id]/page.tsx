"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  getStoreConfig,
  getStoreProduct,
  getStoreProducts,
  StoreConfig,
  StoreProduct,
  calculateDiscountedPrice,
  parseProductImages,
} from "@/lib/storefront-api";
import { formatCurrency } from "@/lib/utils";
import { readCart, writeCart } from "@/lib/storefront-cart";
import {
  ArrowLeft,
  Plus,
  Minus,
  Package,
  Tag,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ShareProductButton } from "@/components/store/share-product-button";
import { toast } from "sonner";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const productId = params.id as string;

  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<StoreProduct[]>([]);
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

      // Cargar productos de la misma categoría o todos los productos
      try {
        const allProducts = productData.category_id
          ? await getStoreProducts(slug, productData.category_id)
          : await getStoreProducts(slug);

        // Filtrar el producto actual y limitar a 4 productos relacionados
        const related = allProducts
          .filter((p) => p.id !== productData.id)
          .slice(0, 4);
        setRelatedProducts(related);
      } catch (err) {
        console.error("Error loading related products:", err);
        // No fallar si no se pueden cargar productos relacionados
      }
    } catch (err: unknown) {
      console.error("Error loading product:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err) || "Error al cargar el producto");
      }
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    if (!product) return;

    try {
      const cart = readCart(slug);

      // Verificar si el producto ya está en el carrito
      const existingIndex = cart.findIndex((item) => item.id === product.id);

      if (existingIndex >= 0) {
        // Actualizar cantidad
        const newQuantity = cart[existingIndex].quantity + quantity;
        if (newQuantity > product.stock) {
          toast.error("No hay suficiente stock disponible");
          return;
        }
        cart[existingIndex].quantity = newQuantity;
      } else {
        // Agregar nuevo producto
        if (quantity > product.stock) {
          toast.error("No hay suficiente stock disponible");
          return;
        }
        cart.push({
          id: product.id,
          name: product.name,
          price: product.sale_price,
          quantity: quantity,
          stock: product.stock,
          image: parseProductImages(product.images)[0] || null,
          discount_percentage: product.discount_percentage || 0,
        });
      }

      writeCart(slug, cart);
      toast.success(
        `${quantity} ${
          quantity === 1 ? "producto agregado" : "productos agregados"
        } al carrito`,
        {
          action: {
            label: "Ver carrito",
            onClick: () => router.push(`/store/${slug}/cart`),
          },
        }
      );

      // Resetear cantidad a 1
      setQuantity(1);
    } catch (err) {
      console.error("Error adding to cart:", err);
      toast.error("Error al agregar al carrito");
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
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
          <h1 className="text-2xl font-bold text-black mb-2">
            Producto no encontrado
          </h1>
          <p className="text-black mb-4">
            {error || "El producto que buscas no existe"}
          </p>
          <Link href={`/store/${slug}`}>
            <Button>Volver a la tienda</Button>
          </Link>
        </div>
      </div>
    );
  }

  const images = parseProductImages(product.images);
  const hasOffer = Boolean(
    product.discount_percentage && product.discount_percentage > 0
  );
  const originalPrice = product.sale_price;
  const finalPrice = hasOffer
    ? calculateDiscountedPrice(originalPrice, product.discount_percentage!)
    : originalPrice;

  const primaryColor = config.store_primary_color || "#3B82F6";
  const secondaryColor = config.store_secondary_color || "#10B981";

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Volver al catálogo */}
        <Link
          href={`/store/${slug}#productos`}
          className="inline-flex items-center gap-2 text-sm font-medium mb-6 hover:underline"
          style={{ color: primaryColor }}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a productos
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Galería de imágenes */}
          <div className="space-y-4">
            {/* Imagen principal */}
            <Card>
              <CardContent className="p-0">
                <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '3 / 4' }}>
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
                        ? "ring-2 ring-offset-2"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    style={
                      {
                        "--tw-ring-color":
                          selectedImage === index ? primaryColor : undefined,
                      } as React.CSSProperties
                    }
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
                <p
                  className="text-sm font-medium mb-2"
                  style={{ color: primaryColor }}
                >
                  {product.category_name}
                </p>
              )}
              <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
                {product.name}
              </h1>

              {product.description && (
                <p className="text-black text-base leading-relaxed">{product.description}</p>
              )}
            </div>

            {/* Precio */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {hasOffer && (
                    <div className="flex items-center gap-2">
                      <Tag
                        className="h-5 w-5"
                        style={{ color: secondaryColor }}
                      />
                      <span className="text-lg text-black line-through">
                        {formatCurrency(originalPrice)}
                      </span>
                      <span
                        className="text-sm font-bold px-2 py-1 rounded"
                        style={{
                          backgroundColor: secondaryColor,
                          color: "white",
                        }}
                      >
                        -{product.discount_percentage}%
                      </span>
                    </div>
                  )}
                  <p
                    className="text-4xl font-bold"
                    style={{ color: hasOffer ? secondaryColor : primaryColor }}
                  >
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
                  : "Sin stock"}
              </span>
            </div>

            {/* Cantidad */}
            {product.stock > 0 && (
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Cantidad
                </label>
                <div className="flex items-center gap-3 text-black">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max={product.stock}
                    value={quantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setQuantity(Math.min(product.stock, Math.max(1, value)));
                    }}
                    className="text-2xl font-bold w-24 text-center"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setQuantity(Math.min(product.stock, quantity + 1))
                    }
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

              {/* Compartir producto (canal de captación de posib.dev) */}
              <ShareProductButton
                productName={product.name}
                price={finalPrice}
                storeName={config.store_name}
                primaryColor={primaryColor}
                className="w-full text-lg"
              />
            </div>

            {/* Información de entrega */}
            {(config.store_shipping_enabled || config.store_pickup_enabled) && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3">Opciones de entrega</h3>
                  <div className="space-y-2 text-sm text-black">
                    {config.store_pickup_enabled && (
                      <div className="flex items-start gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-2"
                          style={{ backgroundColor: primaryColor }}
                        />
                        <span>Recogida en tienda disponible</span>
                      </div>
                    )}
                    {config.store_shipping_enabled && (
                      <div className="flex items-start gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-2"
                          style={{ backgroundColor: primaryColor }}
                        />
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

        {/* Productos relacionados de la misma categoría - Miniaturas */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 pt-8 border-t">
            <h2 className="text-3xl font-bold text-black mb-8">
              Más de {product?.category_name || "esta categoría"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {relatedProducts.map((relatedProduct) => {
                const relatedImages = parseProductImages(relatedProduct.images);
                const hasOffer = Boolean(
                  relatedProduct.discount_percentage && relatedProduct.discount_percentage > 0
                );
                const relatedFinalPrice = hasOffer
                  ? calculateDiscountedPrice(
                      relatedProduct.sale_price,
                      relatedProduct.discount_percentage!
                    )
                  : relatedProduct.sale_price;

                return (
                  <Link
                    key={relatedProduct.id}
                    href={`/store/${slug}/product/${relatedProduct.id}`}
                    className="cursor-pointer flex flex-col gap-2"
                  >
                    {/* Imagen */}
                    <div className="relative aspect-square bg-gray-100 overflow-hidden rounded-lg group hover:shadow-lg transition-shadow">
                      {relatedImages.length > 0 ? (
                        <Image
                          src={relatedImages[0]}
                          alt={relatedProduct.name}
                          fill
                          className="object-contain p-2 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                      {hasOffer && (
                        <div
                          className="absolute top-1 right-1 text-white px-1.5 py-0.5 rounded text-xs font-bold"
                          style={{
                            backgroundColor: config?.store_secondary_color || "#10B981",
                          }}
                        >
                          -{relatedProduct.discount_percentage}%
                        </div>
                      )}
                    </div>

                    {/* Precio y Botón */}
                    <div className="flex flex-col gap-1">
                      <p
                        className="text-sm font-bold"
                        style={{
                          color: hasOffer
                            ? config?.store_secondary_color
                            : config?.store_primary_color,
                        }}
                      >
                        {formatCurrency(relatedFinalPrice)}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full text-xs"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Ver
                      </Button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
