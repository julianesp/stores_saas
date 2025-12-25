'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Trophy, AlertTriangle, Star, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getCustomerInsights, RFMSegment } from '@/lib/customer-analytics-helpers';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CustomerRFMSectionProps {
  getToken: () => Promise<string | null>;
  daysAnalyzed: number;
}

export function CustomerRFMSection({ getToken, daysAnalyzed }: CustomerRFMSectionProps) {
  const [loading, setLoading] = useState(false);
  const [champions, setChampions] = useState<RFMSegment[]>([]);
  const [atRisk, setAtRisk] = useState<RFMSegment[]>([]);
  const [segments, setSegments] = useState<{ [key: string]: number }>({});

  const loadCustomerInsights = async () => {
    try {
      setLoading(true);
      const insights = await getCustomerInsights(daysAnalyzed, getToken);

      setChampions(insights.champions);
      setAtRisk(insights.atRiskCustomers);
      setSegments(insights.segments);

      toast.success('Análisis de clientes completado');
    } catch (error) {
      console.error('Error loading customer insights:', error);
      toast.error('Error al analizar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerInsights();
  }, [daysAnalyzed]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Segmentos Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Segmentación de Clientes (RFM)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(segments).map(([segment, count]) => (
              <div key={segment} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-600">{segment}</p>
                <p className="text-2xl font-bold text-blue-600">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Champions */}
      {champions.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <Trophy className="h-5 w-5" />
              Clientes Champions - Tus Mejores Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {champions.slice(0, 5).map((customer) => (
                <div
                  key={customer.customer_id}
                  className="bg-white p-4 rounded-lg border border-yellow-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-lg flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        {customer.customer_name}
                      </p>
                      <p className="text-sm text-gray-600">{customer.segment_description}</p>
                    </div>
                    <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {customer.rfm_score}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Última compra:</span>
                      <p className="font-semibold">Hace {customer.recency_days} días</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Compras:</span>
                      <p className="font-semibold">{customer.frequency}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Total gastado:</span>
                      <p className="font-bold text-green-600">{formatCurrency(customer.monetary)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* At Risk */}
      {atRisk.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="h-5 w-5" />
              Clientes en Riesgo - ¡Acción Requerida!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {atRisk.slice(0, 5).map((customer) => (
                <div
                  key={customer.customer_id}
                  className="bg-white p-4 rounded-lg border border-red-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{customer.customer_name}</p>
                      <p className="text-sm text-gray-600">{customer.segment_description}</p>
                    </div>
                    <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      REACTIVAR
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Sin comprar:</span>
                      <p className="font-semibold text-red-600">{customer.recency_days} días</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Compras totales:</span>
                      <p className="font-semibold">{customer.frequency}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Valor histórico:</span>
                      <p className="font-bold text-green-600">{formatCurrency(customer.monetary)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
