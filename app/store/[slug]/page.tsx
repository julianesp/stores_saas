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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Banner */}
      {config.store_banner_url && (
        <div className="relative w-full h-48 md:h-64">
          <Image
            src={config.store_banner_url}
            alt="Banner"
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Categorías y filtros */}
          <div className="lg:col-span-1">
            {/* Botón móvil para mostrar filtros */}
            <Button
              variant="outline"
              className="w-full lg:hidden mb-4"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredProducts.map((product) => {
                  const images = parseProductImages(product.images);
                  const hasOffer = product.discount_percentage && product.discount_percentage > 0;
                  const originalPrice = product.sale_price;
                  const finalPrice = hasOffer
                    ? calculateDiscountedPrice(originalPrice, product.discount_percentage!)
                    : originalPrice;

                  return (
                    <Link key={product.id} href={`/store/${slug}/product/${product.id}`}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <CardContent className="p-0">
                          {/* Imagen */}
                          <div className="relative aspect-square bg-gray-100">
                            {hasOffer && (
                              <div
                                className="absolute top-2 right-2 z-10 text-white px-2 py-1 rounded-md text-sm font-bold"
                                style={{ backgroundColor: secondaryColor }}
                              >
                                -{product.discount_percentage}%
                              </div>
                            )}
                            {images.length > 0 ? (
                              <Image
                                src={images[0]}
                                alt={product.name}
                                fill
                                className="object-cover rounded-t-lg"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-16 w-16 text-black" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="p-4">
                            <h3 className="font-semibold text-sm md:text-base mb-2 line-clamp-2">
                              {product.name}
                            </h3>

                            <div className="space-y-1">
                              {hasOffer && (
                                <p className="text-xs md:text-sm text-black line-through">
                                  {formatCurrency(originalPrice)}
                                </p>
                              )}
                              <p
                                className="text-lg md:text-xl font-bold"
                                style={{ color: hasOffer ? secondaryColor : primaryColor }}
                              >
                                {formatCurrency(finalPrice)}
                              </p>
                            </div>

                            <p className="text-xs text-black mt-2">
                              {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
                            </p>
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

      {/* WhatsApp flotante */}
      {config.store_whatsapp && (
        <button
          onClick={openWhatsApp}
          className="fixed bottom-6 right-6 p-4 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
          style={{ backgroundColor: '#25D366' }}
          aria-label="Contactar por WhatsApp"
        >
          <Phone className="h-6 w-6 text-white" />
        </button>
      )}
    </div>
  );
}
