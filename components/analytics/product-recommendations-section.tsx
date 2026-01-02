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

  // Función para formatear las recomendaciones con HTML
  const formatRecommendations = (text: string): string => {
    let formatted = text;

    // Procesar secciones con títulos ##
    const sections = formatted.split(/(?=##)/);

    formatted = sections.map(section => {
      if (!section.trim()) return '';

      // Procesar cada sección
      let processed = section
        // Títulos con ##
        .replace(/##\s+(.+)/g, '<h3 class="section-title">$1</h3>')
        // Negrita **texto**
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Items con guión - al inicio de línea
        .replace(/^-\s+(.+)/gm, '<li>$1</li>')
        // Items numerados
        .replace(/^\d+\.\s+(.+)/gm, '<li class="numbered-item">$1</li>');

      // Envolver listas consecutivas
      processed = processed.replace(/(<li class="numbered-item">.*?<\/li>\s*)+/g, (match) => {
        return `<ol class="recommendations-list numbered">${match}</ol>`;
      });

      processed = processed.replace(/(<li>(?!.*class="numbered-item").*?<\/li>\s*)+/g, (match) => {
        return `<ul class="recommendations-list bulleted">${match}</ul>`;
      });

      // Limpiar saltos de línea extras
      processed = processed.replace(/\n{3,}/g, '\n\n');

      // Convertir saltos de línea en párrafos donde sea apropiado
      processed = processed.split('\n\n').map(para => {
        if (para.includes('<h3>') || para.includes('<ol>') || para.includes('<ul>')) {
          return para;
        }
        if (para.trim() && !para.includes('<li>')) {
          return `<p class="recommendation-text">${para.trim()}</p>`;
        }
        return para;
      }).join('');

      return processed;
    }).join('');

    return formatted;
  };

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
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <style jsx>{`
                .product-trends h3.section-title {
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                  font-size: 1.125rem;
                  font-weight: 700;
                  margin-top: 1.5rem;
                  margin-bottom: 0.75rem;
                  padding-bottom: 0.5rem;
                  border-bottom: 2px solid #e5e7eb;
                  color: #047857;
                }
                .product-trends h3.section-title:first-child {
                  margin-top: 0;
                }
                .product-trends .recommendations-list {
                  margin-left: 1.5rem;
                  margin-bottom: 1rem;
                  color: #4b5563;
                }
                .product-trends .recommendations-list.numbered {
                  list-style-type: decimal;
                }
                .product-trends .recommendations-list.bulleted {
                  list-style-type: disc;
                }
                .product-trends li {
                  margin-bottom: 0.75rem;
                  line-height: 1.6;
                  padding-left: 0.5rem;
                }
                .product-trends strong {
                  color: #059669;
                  font-weight: 600;
                }
                .product-trends .recommendation-text {
                  color: #6b7280;
                  line-height: 1.7;
                  margin-bottom: 0.75rem;
                }
                .product-trends ul li::marker {
                  color: #10b981;
                }
                .product-trends ol li::marker {
                  color: #10b981;
                  font-weight: 600;
                }
              `}</style>
              <div
                className="product-trends text-gray-700"
                dangerouslySetInnerHTML={{ __html: formatRecommendations(recommendations) }}
              />
            </div>
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
