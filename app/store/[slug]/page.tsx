'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  getStoreConfig,
  getStoreProducts,
  getStoreCategories,
  StoreConfig,
  StoreProduct,
  StoreCategory,
  calculateDiscountedPrice,
  parseProductImages,
} from '@/lib/storefront-api';
import { formatCurrency } from '@/lib/utils';
import {
  Search,
  Phone,
  MapPin,
  Mail,
  Facebook,
  Instagram,
  Package,
  Filter,
  Truck,
  Shield,
  CreditCard,
  Clock,
  Star,
  TrendingUp,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StoreCarousel } from '@/components/store';

export default function StorefrontPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadStore();
  }, [slug]);

  const loadStore = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar configuración, productos y categorías en paralelo
      const [configData, productsData, categoriesData] = await Promise.all([
        getStoreConfig(slug),
        getStoreProducts(slug),
        getStoreCategories(slug),
      ]);

      setConfig(configData);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err: any) {
      console.error('Error loading store:', err);
      setError(err.message || 'Error al cargar la tienda');
    } finally {
      setLoading(false);
    }
  };

  const loadProductsByCategory = async (categoryId: string | null) => {
    try {
      const productsData = await getStoreProducts(slug, categoryId || undefined);
      setProducts(productsData);
      setSelectedCategory(categoryId);
    } catch (err: any) {
      console.error('Error loading products:', err);
    }
  };

  // Filtrar y eliminar duplicados
  const filteredProducts = products
    .filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((product, index, self) =>
      index === self.findIndex((p) => p.id === product.id)
    );

  // Función para formatear stock de huevos
  const formatEggStock = (stock: number, productName: string) => {
    // Detectar si es un producto de huevos
    const isEgg = productName.toLowerCase().includes('huevo');

    if (!isEgg) {
      return `${Math.round(stock)} disponibles`;
    }

    // Redondear el stock para evitar decimales raros
    const roundedStock = Math.round(stock);

    if (roundedStock === 0) {
      return 'Agotado';
    }

    const EGGS_PER_TRAY = 30;
    const trays = Math.floor(roundedStock / EGGS_PER_TRAY);
    const units = roundedStock % EGGS_PER_TRAY;

    if (trays === 0) {
      return `${units} ${units === 1 ? 'unidad' : 'unidades'}`;
    } else if (units === 0) {
      return `${trays} ${trays === 1 ? 'cubeta' : 'cubetas'}`;
    } else {
      return `${trays} ${trays === 1 ? 'cubeta' : 'cubetas'} + ${units} ${units === 1 ? 'unidad' : 'unidades'}`;
    }
  };

  const openWhatsApp = () => {
    if (config?.store_whatsapp) {
      const phone = config.store_whatsapp.replace(/\D/g, '');
      const message = encodeURIComponent(`Hola! Estoy interesado en productos de ${config.store_name}`);
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-black">Cargando tienda...</p>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <Package className="h-16 w-16 text-black mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-black mb-2">Tienda no encontrada</h1>
          <p className="text-black mb-4">
            {error || 'La tienda que buscas no existe o está inactiva'}
          </p>
          <Link href="/">
            <Button>Volver al inicio</Button>
          </Link>
        </div>
      </div>
    );
  }

  const primaryColor = config.store_primary_color || '#3B82F6';
  const secondaryColor = config.store_secondary_color || '#10B981';

  return (
    <div className="bg-gray-50">
      {/* Búsqueda y banner */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-5 w-5" />
            <Input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Hero Section: carrusel si hay imágenes, banner único, o fallback */}
      {(() => {
        const carouselImages: string[] = (() => {
          try {
            const parsed = config.store_banner_images ? JSON.parse(config.store_banner_images) : [];
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
          } catch { return []; }
        })();
        const allImages = carouselImages.length > 0
          ? carouselImages
          : config.store_banner_url
            ? [config.store_banner_url]
            : [];

        if (allImages.length > 0) {
          return (
            <StoreCarousel
              images={allImages}
              storeName={config.store_name || ''}
              storeDescription={config.store_description}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              onExploreClick={() => document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' })}
            />
          );
        }

        return (
          <div
            className="relative w-full py-16 md:py-24 overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}15 100%)` }}
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400 rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
              <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {config.store_name}
              </h1>
              {config.store_description && (
                <p className="text-lg md:text-2xl text-gray-700 max-w-2xl mx-auto mb-8">
                  {config.store_description}
                </p>
              )}
              <Button
                size="lg"
                style={{ backgroundColor: primaryColor }}
                className="text-white hover:opacity-90 font-semibold shadow-xl px-8"
                onClick={() => document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Explorar Productos
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Sección de confianza */}
      <div className="bg-white border-y">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="p-3 rounded-full" style={{ backgroundColor: `${primaryColor}15` }}>
                <Truck className="h-6 w-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold text-sm md:text-base">Envío {config.store_shipping_enabled ? 'disponible' : 'rápido'}</h3>
              <p className="text-xs text-gray-600">A todo el país</p>
            </div>

            <div className="flex flex-col items-center text-center gap-2">
              <div className="p-3 rounded-full" style={{ backgroundColor: `${primaryColor}15` }}>
                <Shield className="h-6 w-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold text-sm md:text-base">Compra segura</h3>
              <p className="text-xs text-gray-600">Protección garantizada</p>
            </div>

            <div className="flex flex-col items-center text-center gap-2">
              <div className="p-3 rounded-full" style={{ backgroundColor: `${primaryColor}15` }}>
                <CreditCard className="h-6 w-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold text-sm md:text-base">Pago fácil</h3>
              <p className="text-xs text-gray-600">Múltiples opciones</p>
            </div>

            <div className="flex flex-col items-center text-center gap-2">
              <div className="p-3 rounded-full" style={{ backgroundColor: `${primaryColor}15` }}>
                <Clock className="h-6 w-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold text-sm md:text-base">Atención 24/7</h3>
              <p className="text-xs text-gray-600">Siempre disponibles</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Categorías y filtros */}
          <div className="lg:col-span-1">
            
            <Button
              variant="outline"
              className="w-full lg:hidden mb-4 text-black"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2 text-black" />
              {showFilters ? 'Ocultar categorías' : 'Mostrar categorías'}
            </Button>

            <div className={`${showFilters ? 'block' : 'hidden'} lg:block space-y-4`}>
              {/* Categorías */}
              <Card>
                <CardContent className="pt-6">
                  <h2 className="font-bold text-lg mb-4">Categorías</h2>
                  <div className="space-y-2">
                    <button
                      onClick={() => loadProductsByCategory(null)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedCategory === null
                          ? 'font-semibold'
                          : 'text-black hover:bg-gray-100'
                      }`}
                      style={{
                        backgroundColor: selectedCategory === null ? primaryColor : 'transparent',
                        color: selectedCategory === null ? 'white' : 'inherit',
                      }}
                    >
                      Todos los productos
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => loadProductsByCategory(category.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex justify-between items-center ${
                          selectedCategory === category.id
                            ? 'font-semibold'
                            : 'text-black hover:bg-gray-100'
                        }`}
                        style={{
                          backgroundColor:
                            selectedCategory === category.id ? primaryColor : 'transparent',
                          color: selectedCategory === category.id ? 'white' : 'inherit',
                        }}
                      >
                        <span>{category.name}</span>
                        <span className="text-sm">({category.product_count})</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Información de contacto */}
              {(config.store_phone || config.store_email || config.store_address) && (
                <Card id="info">
                  <CardContent className="pt-6">
                    <h2 className="font-bold text-lg mb-4">Información de la tienda</h2>
                    <div className="space-y-3 text-sm">
                      {config.store_phone && (
                        <div className="flex items-start gap-2">
                          <Phone className="h-4 w-4 mt-0.5" style={{ color: primaryColor }} />
                          <span>{config.store_phone}</span>
                        </div>
                      )}
                      {config.store_email && (
                        <div className="flex items-start gap-2">
                          <Mail className="h-4 w-4 mt-0.5" style={{ color: primaryColor }} />
                          <span className="break-all">{config.store_email}</span>
                        </div>
                      )}
                      {config.store_address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5" style={{ color: primaryColor }} />
                          <div>
                            <p>{config.store_address}</p>
                            {config.store_city && <p className="text-black">{config.store_city}</p>}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Redes sociales */}
                    {(config.store_facebook || config.store_instagram) && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex gap-3">
                          {config.store_facebook && (
                            <a
                              href={config.store_facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                              style={{ color: primaryColor }}
                            >
                              <Facebook className="h-5 w-5" />
                            </a>
                          )}
                          {config.store_instagram && (
                            <a
                              href={config.store_instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                              style={{ color: primaryColor }}
                            >
                              <Instagram className="h-5 w-5" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Productos */}
          <div className="lg:col-span-3" id="productos">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedCategory
                  ? categories.find((c) => c.id === selectedCategory)?.name
                  : 'Todos los productos'}
              </h2>
              <p className="text-gray-600">{filteredProducts.length} productos</p>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-black mx-auto mb-4" />
                <p className="text-black text-lg">No hay productos disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {filteredProducts.map((product) => {
                  const images = parseProductImages(product.images);
                  const hasOffer = product.discount_percentage && product.discount_percentage > 0;
                  const originalPrice = product.sale_price;
                  const finalPrice = hasOffer
                    ? calculateDiscountedPrice(originalPrice, product.discount_percentage!)
                    : originalPrice;
                  const isLowStock = product.stock > 0 && product.stock <= 5;

                  return (
                    <Link key={product.id} href={`/store/${slug}/product/${product.id}`}>
                      <Card className="group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full overflow-hidden border-2 hover:border-gray-300">
                        <CardContent className="p-0">
                          {/* Imagen */}
                          <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                            {hasOffer && (
                              <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
                                <div
                                  className="text-white px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold shadow-lg flex items-center gap-1"
                                  style={{ backgroundColor: secondaryColor }}
                                >
                                  <Tag className="h-3 w-3" />
                                  -{product.discount_percentage}%
                                </div>
                              </div>
                            )}
                            {isLowStock && (
                              <div className="absolute top-3 left-3 z-10 bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-semibold shadow-lg">
                                ¡Últimas unidades!
                              </div>
                            )}
                            {images.length > 0 ? (
                              <Image
                                src={images[0]}
                                alt={product.name}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-16 w-16 text-gray-300 group-hover:scale-110 transition-transform" />
                              </div>
                            )}

                            {/* Overlay hover */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
                          </div>

                          {/* Info */}
                          <div className="p-4">
                            <h3 className="font-semibold text-sm md:text-base mb-3 line-clamp-2 text-gray-900 group-hover:text-gray-700 transition-colors">
                              {product.name}
                            </h3>

                            <div className="space-y-2">
                              {hasOffer && (
                                <div className="flex items-center gap-2">
                                  <p className="text-xs md:text-sm text-gray-400 line-through">
                                    {formatCurrency(originalPrice)}
                                  </p>
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                    Ahorra {formatCurrency(originalPrice - finalPrice)}
                                  </span>
                                </div>
                              )}
                              <p
                                className="text-xl md:text-2xl font-bold"
                                style={{ color: hasOffer ? secondaryColor : primaryColor }}
                              >
                                {formatCurrency(finalPrice)}
                              </p>
                            </div>

                            <div className="mt-3 pt-3 border-t border-gray-100">
                              {product.stock > 0 ? (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <div className={`w-2 h-2 rounded-full ${isLowStock ? 'bg-orange-400' : 'bg-green-400'}`} />
                                  <span className={isLowStock ? 'text-orange-600 font-medium' : 'text-green-600'}>
                                    {formatEggStock(product.stock, product.name)}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <div className="w-2 h-2 rounded-full bg-red-400" />
                                  <span className="text-red-600 font-medium">Agotado</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
