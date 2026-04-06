'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Globe,
  RefreshCw,
  TrendingUp,
  Store,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import { getMarketTrends, type MarketTrendsData, type TrendingProduct } from '@/lib/market-analytics-helpers';
import { formatCurrency } from '@/lib/utils';

function TrendingList({
  products,
  emptyMessage,
}: {
  products: TrendingProduct[];
  emptyMessage: string;
}) {
  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {products.map((product, index) => (
        <div
          key={product.product_name}
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
        >
          <div className="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white rounded-full font-bold text-xs shrink-0">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{product.product_name}</p>
            <p className="text-xs text-gray-500">
              {product.total_quantity_sold.toLocaleString('es-CO')} unidades vendidas
            </p>
          </div>
          <div className="text-right shrink-0 space-y-1">
            <div className="flex items-center gap-1 justify-end">
              <Store className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                {product.store_count} {product.store_count === 1 ? 'tienda' : 'tiendas'}
              </span>
            </div>
            {product.avg_sale_price > 0 && (
              <p className="text-xs font-medium text-green-700">
                ~{formatCurrency(product.avg_sale_price)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MarketTrendsSection() {
  const { getToken } = useAuth();
  const [data, setData] = useState<MarketTrendsData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      toast.loading('Consultando tendencias del mercado...');
      const result = await getMarketTrends(getToken);
      setData(result);
      toast.dismiss();
      toast.success('Tendencias actualizadas');
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'Error al cargar tendencias');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con botón */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-600" />
            Tendencias del Mercado
          </h2>
          <p className="text-sm text-gray-500">
            Productos más vendidos por otras tiendas en los últimos 30 días
          </p>
        </div>
        <Button onClick={load} disabled={loading} size="sm" variant="outline">
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Cargando...
            </>
          ) : (
            <>
              <TrendingUp className="h-4 w-4 mr-2" />
              {data ? 'Actualizar' : 'Ver Tendencias'}
            </>
          )}
        </Button>
      </div>

      {!data && !loading && (
        <Card className="border-dashed border-2 border-indigo-200 bg-indigo-50">
          <CardContent className="py-10 text-center">
            <Globe className="h-14 w-14 mx-auto mb-3 text-indigo-300" />
            <p className="text-gray-600 mb-1 font-medium">Descubre qué venden otras tiendas</p>
            <p className="text-sm text-gray-500">
              Ve los productos más populares en tu ciudad y en todo el país para tomar mejores decisiones de compra.
            </p>
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Tendencias por ciudad */}
          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Top en{' '}
                  {data.city ? (
                    <Badge variant="secondary" className="text-blue-700 bg-blue-100">
                      {data.city}
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-sm font-normal">tu ciudad</span>
                  )}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data.city ? (
                <div className="text-center py-6 text-gray-400">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">
                    Configura la ciudad de tu tienda en{' '}
                    <a href="/dashboard/settings" className="text-blue-500 underline">
                      Configuración
                    </a>{' '}
                    para ver tendencias locales.
                  </p>
                </div>
              ) : (
                <TrendingList
                  products={data.city_trends}
                  emptyMessage={`Aún no hay suficientes datos de otras tiendas en ${data.city}`}
                />
              )}
            </CardContent>
          </Card>

          {/* Tendencias nacionales */}
          <Card className="border-indigo-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-indigo-600" />
                Top Nacional
                <Badge variant="secondary" className="text-indigo-700 bg-indigo-100">
                  Colombia
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendingList
                products={data.national_trends}
                emptyMessage="Aún no hay suficientes datos nacionales"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {data && (
        <p className="text-xs text-gray-400 text-right">
          Datos anónimos agregados · Actualizado{' '}
          {new Date(data.generated_at).toLocaleString('es-CO', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}
    </div>
  );
}
