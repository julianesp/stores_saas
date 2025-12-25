import { getCustomers, getSales } from './cloudflare-api';
import { Customer, Sale } from './types';

export interface RFMSegment {
  customer_id: string;
  customer_name: string;
  recency_days: number; // Días desde la última compra
  frequency: number; // Número de compras
  monetary: number; // Valor total gastado
  rfm_score: string; // Ej: "555" (mejor), "111" (peor)
  segment: string; // Champions, Loyal, At Risk, etc.
  segment_description: string;
}

export interface CustomerInsights {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  avgPurchaseFrequency: number;
  topCustomers: RFMSegment[];
  atRiskCustomers: RFMSegment[];
  champions: RFMSegment[];
  segments: {
    [key: string]: number;
  };
}

/**
 * Calcula el análisis RFM (Recency, Frequency, Monetary) de los clientes
 */
export async function analyzeCustomerRFM(
  daysToAnalyze: number = 90,
  getToken: () => Promise<string | null>
): Promise<RFMSegment[]> {
  try {
    // Obtener clientes y ventas
    const [customers, allSales] = await Promise.all([
      getCustomers(getToken) as Promise<Customer[]>,
      getSales(getToken) as Promise<Sale[]>,
    ]);

    // Filtrar ventas por período
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToAnalyze);

    const recentSales = allSales.filter((sale) => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= cutoffDate && sale.customer_id;
    });

    // Calcular métricas RFM por cliente
    const rfmData: RFMSegment[] = [];
    const now = new Date();

    customers.forEach((customer) => {
      // Ventas de este cliente
      const customerSales = recentSales.filter((s) => s.customer_id === customer.id);

      if (customerSales.length === 0) {
        // Cliente sin compras en el período
        return;
      }

      // Recency: Días desde la última compra
      const lastPurchaseDate = new Date(
        Math.max(...customerSales.map((s) => new Date(s.created_at).getTime()))
      );
      const recencyDays = Math.floor((now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24));

      // Frequency: Número de compras
      const frequency = customerSales.length;

      // Monetary: Valor total gastado
      const monetary = customerSales.reduce((sum, sale) => sum + sale.total, 0);

      rfmData.push({
        customer_id: customer.id,
        customer_name: customer.name,
        recency_days: recencyDays,
        frequency: frequency,
        monetary: monetary,
        rfm_score: '',
        segment: '',
        segment_description: '',
      });
    });

    // Calcular scores RFM (1-5, donde 5 es mejor)
    rfmData.forEach((data) => {
      // Recency score (menor es mejor)
      const recencyScore = calculateScore(data.recency_days, rfmData.map((d) => d.recency_days), true);

      // Frequency score (mayor es mejor)
      const frequencyScore = calculateScore(data.frequency, rfmData.map((d) => d.frequency), false);

      // Monetary score (mayor es mejor)
      const monetaryScore = calculateScore(data.monetary, rfmData.map((d) => d.monetary), false);

      data.rfm_score = `${recencyScore}${frequencyScore}${monetaryScore}`;

      // Asignar segmento
      const segment = assignSegment(recencyScore, frequencyScore, monetaryScore);
      data.segment = segment.name;
      data.segment_description = segment.description;
    });

    return rfmData.sort((a, b) => b.monetary - a.monetary);
  } catch (error) {
    console.error('Error in RFM analysis:', error);
    throw error;
  }
}

/**
 * Calcula el score de 1 a 5 basado en quintiles
 */
function calculateScore(value: number, allValues: number[], lowerIsBetter: boolean): number {
  const sorted = [...allValues].sort((a, b) => a - b);
  const quintileSize = Math.ceil(sorted.length / 5);

  for (let i = 0; i < 5; i++) {
    const threshold = sorted[quintileSize * (i + 1) - 1] || sorted[sorted.length - 1];
    if (value <= threshold) {
      return lowerIsBetter ? 5 - i : i + 1;
    }
  }

  return lowerIsBetter ? 1 : 5;
}

/**
 * Asigna segmento basado en scores RFM
 */
function assignSegment(
  recency: number,
  frequency: number,
  monetary: number
): { name: string; description: string } {
  const avgScore = (recency + frequency + monetary) / 3;

  // Champions: Compran frecuentemente, gastan mucho, compraron recientemente
  if (recency >= 4 && frequency >= 4 && monetary >= 4) {
    return {
      name: 'Champions',
      description: 'Mejores clientes. Compran frecuentemente y gastan mucho.',
    };
  }

  // Loyal Customers: Compran regularmente
  if (recency >= 3 && frequency >= 4) {
    return {
      name: 'Leales',
      description: 'Clientes fieles que compran con regularidad.',
    };
  }

  // Potential Loyalists: Clientes recientes con buen potencial
  if (recency >= 4 && frequency >= 2 && frequency <= 3) {
    return {
      name: 'Potencialmente Leales',
      description: 'Clientes recientes con potencial de convertirse en leales.',
    };
  }

  // At Risk: Compraban mucho pero no recientemente
  if (recency <= 2 && frequency >= 3 && monetary >= 3) {
    return {
      name: 'En Riesgo',
      description: 'Buenos clientes que no han comprado recientemente. ¡Reactivar!',
    };
  }

  // Need Attention: Por debajo del promedio, requieren atención
  if (recency <= 3 && frequency <= 3 && monetary <= 3) {
    return {
      name: 'Requieren Atención',
      description: 'Clientes que necesitan incentivos para volver.',
    };
  }

  // New Customers: Primera o segunda compra reciente
  if (recency >= 4 && frequency === 1) {
    return {
      name: 'Nuevos',
      description: 'Clientes nuevos. Oportunidad de convertir en leales.',
    };
  }

  // Promising: Compradores recientes con potencial
  if (recency >= 3 && frequency >= 2) {
    return {
      name: 'Prometedores',
      description: 'Clientes con buen potencial de crecimiento.',
    };
  }

  // Hibernating: No han comprado en mucho tiempo
  if (recency <= 2 && frequency <= 2) {
    return {
      name: 'Inactivos',
      description: 'Clientes inactivos. Considerar campaña de reactivación.',
    };
  }

  return {
    name: 'Ocasionales',
    description: 'Clientes ocasionales.',
  };
}

/**
 * Genera insights completos de clientes
 */
export async function getCustomerInsights(
  daysToAnalyze: number = 90,
  getToken: () => Promise<string | null>
): Promise<CustomerInsights> {
  try {
    const rfmSegments = await analyzeCustomerRFM(daysToAnalyze, getToken);

    // Contar segmentos
    const segments: { [key: string]: number } = {};
    rfmSegments.forEach((seg) => {
      segments[seg.segment] = (segments[seg.segment] || 0) + 1;
    });

    // Identificar nuevos vs recurrentes
    const newCustomers = rfmSegments.filter((seg) => seg.frequency === 1).length;
    const returningCustomers = rfmSegments.filter((seg) => seg.frequency > 1).length;

    // Frecuencia promedio
    const avgFrequency =
      rfmSegments.reduce((sum, seg) => sum + seg.frequency, 0) / rfmSegments.length || 0;

    return {
      totalCustomers: rfmSegments.length,
      newCustomers,
      returningCustomers,
      avgPurchaseFrequency: avgFrequency,
      topCustomers: rfmSegments.slice(0, 10), // Top 10 por monetary
      atRiskCustomers: rfmSegments.filter((seg) => seg.segment === 'En Riesgo'),
      champions: rfmSegments.filter((seg) => seg.segment === 'Champions'),
      segments,
    };
  } catch (error) {
    console.error('Error getting customer insights:', error);
    throw error;
  }
}
