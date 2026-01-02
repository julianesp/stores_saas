'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface AIInsightsSectionProps {
  salesData: {
    totalRevenue: number;
    totalSales: number;
    topProducts: Array<{
      name: string;
      revenue: number;
      quantity: number;
    }>;
    criticalProducts: number;
    avgTicket: number;
  };
  customerData: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    avgPurchaseFrequency: number;
  };
  daysAnalyzed: number;
}

export function AIInsightsSection({ salesData, customerData, daysAnalyzed }: AIInsightsSectionProps) {
  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Función para formatear el diagnóstico con HTML
  const formatDiagnosis = (text: string): string => {
    let formatted = text;

    // Procesar secciones con títulos ##
    const sections = formatted.split(/(?=##)/);

    formatted = sections.map(section => {
      if (!section.trim()) return '';

      // Procesar cada sección
      let processed = section
        // Títulos con ##
        .replace(/##\s+(.+)/g, '<h3>$1</h3>')
        // Negrita **texto**
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Items con guión - al inicio de línea
        .replace(/^-\s+(.+)/gm, '<li>$1</li>')
        // Items numerados
        .replace(/^\d+\.\s+(.+)/gm, '<li>$1</li>');

      // Envolver listas consecutivas
      processed = processed.replace(/(<li>.*?<\/li>\s*)+/g, (match) => {
        return `<ol class="list-decimal list-inside space-y-2 mb-4 pl-4">${match}</ol>`;
      });

      // Limpiar saltos de línea extras
      processed = processed.replace(/\n{3,}/g, '\n\n');

      // Convertir saltos de línea en párrafos donde sea apropiado
      processed = processed.split('\n\n').map(para => {
        if (para.includes('<h3>') || para.includes('<ol>')) {
          return para;
        }
        if (para.trim() && !para.includes('<li>')) {
          return `<p class="mb-3 text-gray-700">${para.trim()}</p>`;
        }
        return para;
      }).join('');

      return processed;
    }).join('');

    return formatted;
  };

  const generateInsights = async () => {
    try {
      setLoading(true);
      setError('');
      setInsights('');
      toast.loading('Generando insights con IA...');

      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salesData,
          customerData,
          daysAnalyzed,
        }),
      });

      toast.dismiss();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        const errorMessage = errorData.error || 'Error al generar insights';
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.insights) {
        throw new Error('No se recibieron insights de la API');
      }

      setInsights(data.insights);
      setError('');
      toast.success('Insights generados exitosamente');
    } catch (error) {
      console.error('Error generating insights:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al generar insights';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />
            <span className="text-purple-900">Diagnóstico Inteligente</span>
          </div>
          <Button
            onClick={generateInsights}
            disabled={loading}
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generar Diagnóstico
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">Error al generar insights</h3>
                <p className="text-red-700 text-sm mb-4">{error}</p>
                {error.includes('API Key') && (
                  <div className="bg-white rounded-md p-4 text-sm">
                    <p className="font-semibold text-gray-900 mb-2">📝 Cómo solucionar:</p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-700">
                      <li>Ve a <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a></li>
                      <li>Genera una nueva API Key</li>
                      <li>Actualiza la variable <code className="bg-gray-100 px-1 rounded">GEMINI_API_KEY</code> en tu archivo <code className="bg-gray-100 px-1 rounded">.env.local</code></li>
                      <li>Reinicia el servidor de desarrollo</li>
                    </ol>
                  </div>
                )}
                <Button
                  onClick={generateInsights}
                  disabled={loading}
                  size="sm"
                  className="mt-4 bg-red-600 hover:bg-red-700"
                >
                  Intentar nuevamente
                </Button>
              </div>
            </div>
          </div>
        ) : insights ? (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <style jsx>{`
                .ai-diagnosis h3 {
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                  font-size: 1.125rem;
                  font-weight: 700;
                  margin-top: 1.5rem;
                  margin-bottom: 0.75rem;
                  padding-bottom: 0.5rem;
                  border-bottom: 2px solid #e5e7eb;
                }
                .ai-diagnosis h3:first-child {
                  margin-top: 0;
                }
                .ai-diagnosis ol {
                  margin-left: 1.5rem;
                  margin-bottom: 1rem;
                  color: #4b5563;
                }
                .ai-diagnosis li {
                  margin-bottom: 0.5rem;
                  line-height: 1.6;
                }
                .ai-diagnosis strong {
                  color: #1f2937;
                  font-weight: 600;
                }
                .ai-diagnosis p {
                  color: #6b7280;
                  line-height: 1.7;
                }
              `}</style>
              <div
                className="ai-diagnosis text-gray-700"
                dangerouslySetInnerHTML={{ __html: formatDiagnosis(insights) }}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="h-16 w-16 mx-auto mb-4 text-purple-300" />
            <p className="text-gray-600 mb-4">
              Haz clic en "Generar Diagnóstico" para obtener un análisis completo de tu negocio
            </p>
            <p className="text-sm text-gray-500">
              La IA analizará tus ventas, clientes y productos para darte recomendaciones personalizadas
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
