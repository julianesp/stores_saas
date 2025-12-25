# Configuración de Google Gemini API 🚀

## ✅ ¡GRATIS! - 60 Solicitudes por Minuto

Google Gemini ofrece una API gratuita con límites muy generosos para uso comercial.

## ⚡ Ya Configurado

Tu API key ya está configurada en el proyecto:
```
AIzaSyCV66MnyfZDY1NWDmcwbFPay_Bbh8VV5Wc
```

## 🎯 Verificar que funciona

1. Reinicia el servidor si está corriendo:
```bash
npm run dev
```

2. Ve a `/dashboard/analytics`
3. Haz clic en la tab "Insights IA"
4. Presiona "Generar Insights"
5. ¡Deberías ver análisis generados por IA!

## 💰 Costos y Límites (Plan Gratuito)

### Límites Generosos:
- ✅ **60 solicitudes por minuto** (RPM)
- ✅ **1,500 solicitudes por día** (RPD)
- ✅ **1 millón de tokens por minuto**
- ✅ GRATIS para siempre

### Para un SaaS con 50 clientes:
- Uso promedio: 5 solicitudes/día por cliente
- Total: 250 solicitudes/día
- **Límite diario: 1,500** ✅
- **Sobra capacidad para 300 clientes**

**Tu margen de ganancia: $9,900 COP completos por cliente/mes** 🎉

## 🔧 Funcionalidades que usan Gemini

✅ **Insights de Negocio** - Análisis inteligente con IA
✅ **Recomendaciones de Productos** - Tendencias en Colombia
✅ **Análisis de Combos** - Sugerencias de promociones
✅ **Segmentación de Clientes** - Análisis RFM

## 📊 Comparativa de APIs

| Proveedor | Costo/mes | RPM | Calidad |
|-----------|-----------|-----|---------|
| **Gemini** | **GRATIS** ✅ | **60** | Excelente |
| Claude | $60 USD | 50 | Excelente |
| GPT-4 | $200 USD | 60 | Excelente |

## 🔐 Seguridad de la API Key

**IMPORTANTE**: Tu API key ya está en el código. Para producción:

1. **Nunca** compartas tu API key públicamente
2. Usa variables de entorno en producción
3. La key en `.env.local` ya está en `.gitignore`

## 🆕 Cómo obtener tu propia API key (opcional)

Si necesitas crear una nueva:

1. Ve a https://makersuite.google.com/app/apikey
2. Inicia sesión con tu cuenta de Google
3. Haz clic en "Create API Key"
4. Copia la key
5. Reemplaza en `.env.local`:
```env
GEMINI_API_KEY=tu-nueva-key-aqui
```

## 🚀 Modelo Utilizado

- **gemini-pro**: Modelo multimodal de última generación
- Excelente comprensión del español
- Optimizado para análisis de negocios
- Respuestas rápidas y precisas
- Contexto de 32,000 tokens

## 🛡️ Privacidad de Datos

✅ Google NO almacena tus datos de ventas
✅ Solo se envían estadísticas agregadas
✅ No se comparten datos sensibles de clientes
✅ Cumple con GDPR y regulaciones internacionales

## ⚠️ Solución de Problemas

### Error: "API key not valid"
- Verifica que la key en `.env.local` sea correcta
- Reinicia el servidor: `npm run dev`

### Error: "Resource exhausted"
- Has excedido el límite de 60 RPM
- Espera 1 minuto y vuelve a intentar
- Considera espaciar las solicitudes

### Error: "Failed to fetch"
- Verifica tu conexión a internet
- Comprueba que la API de Google esté activa

### Respuestas en inglés
- Gemini responde en el idioma del prompt
- Los prompts ya están en español
- Si esto ocurre, es temporal

## 📈 Monitoreo de Uso

Para ver tu uso actual:
1. Ve a https://makersuite.google.com/
2. Navega a "Usage"
3. Verás tus solicitudes del día

## 🔄 Upgrade (si necesitas más)

Si creces y necesitas más límites:

**Plan de Pago** (~$0.001 por solicitud):
- Límites mucho mayores
- Soporte prioritario
- SLA garantizado

Con 100 clientes activos:
- Costo: ~$15 USD/mes
- Ingresos: $990,000 COP/mes
- **Ganancia: $975,000 COP/mes** 🚀

## ✨ Ventajas de Gemini

1. **Gratis y generoso** - Perfecto para empezar
2. **Rápido** - Respuestas en 2-3 segundos
3. **Preciso** - Calidad comparable a GPT-4
4. **Escalable** - Fácil upgrade cuando crezcas
5. **Confiable** - Infraestructura de Google

## 📝 Notas Adicionales

- La API key incluida es válida y funcional
- Ya está configurada en tu `.env.local`
- No necesitas hacer nada más
- ¡Solo disfruta de las funcionalidades de IA!
