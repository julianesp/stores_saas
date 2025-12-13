'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Tag, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getProducts, createProduct, getCategories, createCategory, createOffer } from '@/lib/cloudflare-api';
import { ProductWithRelations, Product, Category } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';

export default function OffersPage() {
  const { getToken } = useAuth();

  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [expiringProducts, setExpiringProducts] = useState<ProductWithRelations[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // Obtener productos y categorías
      const productsData = await getProducts(getToken) as Product[];
      const categories = await getCategories(getToken) as Category[];

      // Crear mapa de categorías
      const categoriesMap = new Map(categories.map(c => [c.id, c]));

      // Filtrar productos con fecha de vencimiento y combinar con categorías
      const productsWithExpiration = productsData
        .filter(p => p.expiration_date)
        .map(p => ({
          ...p,
          category: p.category_id ? categoriesMap.get(p.category_id) : undefined
        })) as ProductWithRelations[];

      // Ordenar por fecha de vencimiento
      productsWithExpiration.sort((a, b) => {
        const dateA = a.expiration_date ? new Date(a.expiration_date) : new Date();
        const dateB = b.expiration_date ? new Date(b.expiration_date) : new Date();
        return dateA.getTime() - dateB.getTime();
      });

      setProducts(productsWithExpiration);

      // Productos que vencen en menos de 15 días
      const expiring = productsWithExpiration.filter(p => {
        if (!p.expiration_date) return false;
        const days = differenceInDays(new Date(p.expiration_date), new Date());
        return days <= 15 && days >= 0;
      });
      setExpiringProducts(expiring);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar productos');
    }
  };

  const handleCreateOffer = async (productId: string, discount: number) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const endDate = new Date(product.expiration_date!);
      await createOffer({
        product_id: productId,
        discount_percentage: discount,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        is_active: 1,
        reason: 'proximoAVencer'
      }, getToken);

      toast.success('Oferta creada correctamente');
      fetchProducts();
    } catch (error: any) {
      console.error('Error creating offer:', error);
      toast.error(error.message || 'Error al crear oferta');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ofertas</h1>
        <p className="text-gray-500">Gestiona ofertas y productos próximos a vencer</p>
      </div>

      {/* Productos próximos a vencer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-semibold">
              Productos Próximos a Vencer ({expiringProducts.length})
            </h2>
          </div>

          {expiringProducts.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No hay productos próximos a vencer
            </p>
          ) : (
            <div className="space-y-3">
              {expiringProducts.map(product => {
                const daysToExpire = differenceInDays(
                  new Date(product.expiration_date!),
                  new Date()
                );

                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-orange-50"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-gray-600">
                        Vence en {daysToExpire} días - {formatCurrency(product.sale_price)}
                      </p>
                      <p className="text-xs text-gray-500">Disponible: {product.stock} unidades</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleCreateOffer(product.id, 10)}
                      >
                        10% OFF
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleCreateOffer(product.id, 20)}
                      >
                        20% OFF
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCreateOffer(product.id, 30)}
                      >
                        30% OFF
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
