// Google Gemini configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Usar gemini-2.5-flash - versión estable más reciente (Junio 2025)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

if (!GEMINI_API_KEY) {
  console.error('⚠️ GEMINI_API_KEY no está configurada. Los insights de IA no funcionarán.');
}

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
  // Validar que la API key existe
  if (!GEMINI_API_KEY) {
    throw new Error('La API key de Gemini no está configurada. Contacta al administrador.');
  }

  try {
    const prompt = `Eres un experto consultor de negocios retail en Colombia. Genera un DIAGNÓSTICO EMPRESARIAL PROFESIONAL para el dueño de esta tienda. Usa un tono profesional pero cercano.

**DATOS DEL NEGOCIO (Últimos ${daysAnalyzed} días):**

📊 VENTAS:
- Ingresos totales: $${salesData.totalRevenue.toLocaleString('es-CO')} COP
- Transacciones: ${salesData.totalSales}
- Ticket promedio: $${salesData.avgTicket.toLocaleString('es-CO')} COP
- Productos con stock crítico: ${salesData.criticalProducts}

🏆 TOP 3 PRODUCTOS:
${salesData.topProducts.map((p, i) => `${i + 1}. ${p.name} - ${p.quantity} unidades ($${p.revenue.toLocaleString('es-CO')})`).join('\n')}

👥 CLIENTES:
- Base total: ${customerData.totalCustomers}
- Nuevos: ${customerData.newCustomers}
- Recurrentes: ${customerData.returningCustomers}
- Frecuencia promedio: ${customerData.avgPurchaseFrequency.toFixed(1)} compras/cliente

---

GENERA UN DIAGNÓSTICO CON ESTA ESTRUCTURA EXACTA:

## 📊 Resumen del Desempeño
[3 puntos clave sobre cómo está el negocio actualmente]

## 💡 Recomendaciones Estratégicas
[3 acciones específicas y prácticas para mejorar las ventas]

## ⚠️ Puntos de Atención
[2 riesgos o problemas que requieren atención inmediata]

## 🚀 Oportunidad de Crecimiento
[1 oportunidad específica basada en los datos para hacer crecer el negocio]

IMPORTANTE:
- Usa lenguaje claro y directo
- Incluye números específicos cuando sea relevante
- Sé práctico y accionable
- Máximo 300 palabras
- Usa los emojis indicados en cada sección`;

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
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });

      // Mensajes de error más específicos
      if (response.status === 400) {
        // Verificar si el error es por API key inválida
        if (errorData.error?.message?.includes('API key not valid')) {
          throw new Error('La API Key de Gemini no es válida. Por favor, genera una nueva en https://aistudio.google.com/app/apikey');
        }
        throw new Error('Error en la solicitud a la API de Gemini. Verifica la configuración.');
      } else if (response.status === 401 || response.status === 403) {
        throw new Error('API Key de Gemini inválida o sin permisos. Genera una nueva en https://aistudio.google.com/app/apikey');
      } else if (response.status === 429) {
        throw new Error('Límite de solicitudes alcanzado. Intenta nuevamente en unos minutos.');
      }

      throw new Error(`Error de API: ${response.statusText || 'Error desconocido'}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      console.error('Respuesta incompleta de Gemini:', data);
      throw new Error('La API no devolvió un resultado válido.');
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error generating insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(`Error al generar insights: ${errorMessage}`);
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
    const prompt = `Eres un experto en retail y tendencias del mercado colombiano. Analiza el inventario actual de esta tienda y recomienda productos tendencia que complementen su catálogo.

**TIPO DE TIENDA:** ${storeType}

**INVENTARIO ACTUAL (Muestra):**
${currentInventory.slice(0, 10).map((p) => `- ${p.name} (${p.category}): ${p.stock} unidades, velocidad: ${p.salesVelocity}/día`).join('\n')}

---

GENERA RECOMENDACIONES CON ESTA ESTRUCTURA EXACTA:

## **Productos en Tendencia para tu Tienda General:**

[Breve introducción sobre las tendencias del mercado colombiano en 2025 - 1 párrafo]

1. **[Nombre del Producto 1]** [emoji relevante]
   * **Categoría:** [Categoría]
   * **Tendencia:** [Por qué está en tendencia en Colombia - 1 línea]
   * **Margen estimado:** [Porcentaje de ganancia]

2. **[Nombre del Producto 2]** [emoji relevante]
   * **Categoría:** [Categoría]
   * **Tendencia:** [Por qué está en tendencia - 1 línea]
   * **Margen estimado:** [Porcentaje de ganancia]

3. **[Nombre del Producto 3]** [emoji relevante]
   * **Categoría:** [Categoría]
   * **Tendencia:** [Por qué está en tendencia - 1 línea]
   * **Margen estimado:** [Porcentaje de ganancia]

4. **[Nombre del Producto 4]** [emoji relevante]
   * **Categoría:** [Categoría]
   * **Tendencia:** [Por qué está en tendencia - 1 línea]
   * **Margen estimado:** [Porcentaje de ganancia]

5. **[Nombre del Producto 5]** [emoji relevante]
   * **Categoría:** [Categoría]
   * **Tendencia:** [Por qué está en tendencia - 1 línea]
   * **Margen estimado:** [Porcentaje de ganancia]

## 💡 Consejo de Promoción

[1 estrategia específica y práctica para promocionar estos productos en tu tienda]

IMPORTANTE:
- Enfócate en productos REALMENTE tendencia en Colombia 2025
- Considera: snacks saludables, bebidas funcionales, tecnología accesible, productos sostenibles
- Sé específico con nombres de productos
- Usa lenguaje claro y directo
- Máximo 350 palabras`;

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
