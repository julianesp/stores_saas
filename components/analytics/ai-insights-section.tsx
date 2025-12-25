'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles, RefreshCw } from 'lucide-react';
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

  const generateInsights = async () => {
    try {
      setLoading(true);
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
        throw new Error('Error al generar insights');
      }

      const data = await response.json();
      setInsights(data.insights);
      toast.success('Insights generados exitosamente');
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('Error al generar insights');
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
            <span className="text-purple-900">Insights con IA</span>
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
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generar Insights
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights ? (
          <div className="bg-white rounded-lg p-6 whitespace-pre-wrap text-gray-800">
            {insights}
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="h-16 w-16 mx-auto mb-4 text-purple-300" />
            <p className="text-gray-600 mb-4">
              Haz clic en "Generar Insights" para obtener recomendaciones inteligentes sobre tu negocio
            </p>
            <p className="text-sm text-gray-500">
              La IA analizará tus ventas, clientes y productos para darte insights accionables
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
