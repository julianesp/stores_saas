// Google Gemini configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCV66MnyfZDY1NWDmcwbFPay_Bbh8VV5Wc';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export interface SalesData {
  totalRevenue: number;
  totalSales: number;
  topProducts: Array<{
    name: string;
    revenue: number;
    quantity: number;
  }>;
  criticalProducts: number;
  avgTicket: number;
}

export interface CustomerData {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  avgPurchaseFrequency: number;
}

/**
 * Genera insights de negocio usando IA (Google Gemini)
 */
export async function generateBusinessInsights(
  salesData: SalesData,
  customerData: CustomerData,
  daysAnalyzed: number
): Promise<string> {
  try {
    const prompt = `Eres un experto consultor de negocios para tiendas minoristas en Colombia. Analiza los siguientes datos de una tienda y proporciona insights accionables en español:

**Datos de Ventas (últimos ${daysAnalyzed} días):**
- Ingresos totales: $${salesData.totalRevenue.toLocaleString('es-CO')}
- Número de ventas: ${salesData.totalSales}
- Ticket promedio: $${salesData.avgTicket.toLocaleString('es-CO')}
- Productos críticos (bajo stock): ${salesData.criticalProducts}
- Top 3 productos más vendidos:
${salesData.topProducts.map((p, i) => `  ${i + 1}. ${p.name}: ${p.quantity} unidades, $${p.revenue.toLocaleString('es-CO')}`).join('\n')}

**Datos de Clientes:**
- Total de clientes: ${customerData.totalCustomers}
- Clientes nuevos: ${customerData.newCustomers}
- Clientes recurrentes: ${customerData.returningCustomers}
- Frecuencia de compra promedio: ${customerData.avgPurchaseFrequency.toFixed(1)} compras/cliente

Proporciona:
1. **3 insights clave** sobre el rendimiento del negocio
2. **3 recomendaciones específicas** para aumentar ventas
3. **2 alertas** sobre posibles problemas o riesgos
4. **1 oportunidad** de crecimiento basada en los datos

Formato: Usa emojis y sé conciso. Máximo 250 palabras.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar insights.';
  } catch (error) {
    console.error('Error generating insights:', error);
    return 'Error al generar insights. Por favor intenta nuevamente.';
  }
}

/**
 * Genera recomendaciones de productos basándose en análisis de tendencias
 */
export async function generateProductRecommendations(
  currentInventory: Array<{ name: string; category: string; stock: number; salesVelocity: number }>,
  storeType: string
): Promise<string> {
  try {
    const prompt = `Eres un experto en retail en Colombia. Basándote en las tendencias actuales del mercado colombiano y el inventario de esta tienda, sugiere productos que deberían considerar vender.

**Tipo de tienda:** ${storeType}

**Inventario actual (muestra):**
${currentInventory.slice(0, 10).map((p) => `- ${p.name} (${p.category}): ${p.stock} unidades, velocidad: ${p.salesVelocity}/día`).join('\n')}

**Productos tendencia en Colombia 2025:**
Considera categorías populares como: snacks saludables, bebidas funcionales, cuidado personal, tecnología accesible, productos de limpieza ecológicos, etc.

Proporciona:
1. **5 productos específicos** que están en tendencia en Colombia y que complementarían bien este inventario
2. Para cada producto indica: nombre, categoría, por qué es tendencia, y margen de ganancia estimado
3. **1 consejo** sobre cómo promocionar estos productos

Formato: Conciso, con emojis. Máximo 300 palabras.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar recomendaciones.';
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return 'Error al generar recomendaciones. Por favor intenta nuevamente.';
  }
}

/**
 * Analiza combos frecuentes de productos (Market Basket Analysis simplificado)
 */
export async function analyzeFrequentCombos(
  salesItems: Array<{ productName: string; quantity: number; saleId: string }>
): Promise<string> {
  try {
    // Agrupar productos por venta
    const salesMap = new Map<string, string[]>();
    salesItems.forEach((item) => {
      if (!salesMap.has(item.saleId)) {
        salesMap.set(item.saleId, []);
      }
      salesMap.get(item.saleId)?.push(item.productName);
    });

    // Encontrar combinaciones frecuentes (productos que se compran juntos)
    const combos = new Map<string, number>();
    salesMap.forEach((products) => {
      if (products.length > 1) {
        // Generar pares de productos
        for (let i = 0; i < products.length; i++) {
          for (let j = i + 1; j < products.length; j++) {
            const combo = [products[i], products[j]].sort().join(' + ');
            combos.set(combo, (combos.get(combo) || 0) + 1);
          }
        }
      }
    });

    // Ordenar por frecuencia
    const topCombos = Array.from(combos.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([combo, count]) => `${combo}: ${count} veces`);

    const prompt = `Eres un experto en merchandising y ventas. Analiza estos combos de productos que los clientes compran juntos frecuentemente y sugiere estrategias:

**Combos frecuentes:**
${topCombos.join('\n')}

Proporciona:
1. **3 insights** sobre por qué estos productos se compran juntos
2. **3 sugerencias** de promociones o descuentos para aumentar ventas cruzadas
3. **2 ideas** de nuevos combos basados en estos patrones

Formato: Conciso, con emojis. Máximo 250 palabras.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo analizar combos.';
  } catch (error) {
    console.error('Error analyzing combos:', error);
    return 'Error al analizar combos. Por favor intenta nuevamente.';
  }
}
