'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Sparkles, RefreshCw, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface ProductRecommendationsSectionProps {
  currentInventory: Array<{
    name: string;
    category: string;
    stock: number;
    salesVelocity: number;
  }>;
  storeType?: string;
}

export function ProductRecommendationsSection({
  currentInventory,
  storeType,
}: ProductRecommendationsSectionProps) {
  const [recommendations, setRecommendations] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generateRecommendations = async () => {
    try {
      setLoading(true);
      toast.loading('Analizando tendencias del mercado colombiano...');

      const response = await fetch('/api/ai/product-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentInventory,
          storeType: storeType || 'Tienda general',
        }),
      });

      toast.dismiss();

      if (!response.ok) {
        throw new Error('Error al generar recomendaciones');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);
      toast.success('Recomendaciones generadas');
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast.error('Error al generar recomendaciones');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <span className="text-green-900">Productos Tendencia en Colombia</span>
          </div>
          <Button
            onClick={generateRecommendations}
            disabled={loading}
            size="sm"
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Ver Tendencias
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations ? (
          <div className="bg-white rounded-lg p-6 whitespace-pre-wrap text-gray-800">
            {recommendations}
          </div>
        ) : (
          <div className="text-center py-8">
            <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-green-300" />
            <p className="text-gray-600 mb-4">
              Descubre qué productos están en tendencia en Colombia
            </p>
            <p className="text-sm text-gray-500">
              La IA analizará tu inventario y te recomendará productos populares que complementen tu catálogo
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
