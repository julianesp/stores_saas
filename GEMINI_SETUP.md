# Configuración de Google Gemini API

## Obtener tu API Key

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en "Create API Key"
4. Copia la API key generada

## Configurar en el Proyecto

1. Abre el archivo `.env.local` en la raíz del proyecto
2. Agrega la siguiente línea:

```env
GEMINI_API_KEY=tu-api-key-aqui
```

3. Reinicia el servidor de desarrollo:

```bash
npm run dev
```

## Verificar Funcionamiento

1. Ve a `/dashboard/analytics`
2. Haz clic en la tab "Insights IA"
3. Presiona "Generar Insights"
4. Deberías ver análisis generados por IA

## Límites del Plan Gratuito

- 60 solicitudes por minuto (RPM)
- 1,500 solicitudes por día (RPD)
- 1 millón de tokens por minuto
- GRATIS permanentemente

## Funcionalidades que Usan Gemini

- Insights de Negocio - Análisis inteligente con IA
- Recomendaciones de Productos - Tendencias en Colombia
- Análisis de Combos - Sugerencias de promociones
- Segmentación de Clientes - Análisis RFM

## Seguridad

**IMPORTANTE:**
- NUNCA subas tu API key a Git
- El archivo `.env.local` ya está en `.gitignore`
- No compartas tu API key públicamente
- Revócala inmediatamente si se expone

## Solución de Problemas

### Error: "API key not valid"
- Verifica que la key en `.env.local` sea correcta
- Reinicia el servidor: `npm run dev`

### Error: "Resource exhausted"
- Has excedido el límite de 60 RPM
- Espera 1 minuto y vuelve a intentar

### Error: "Failed to fetch"
- Verifica tu conexión a internet
- Comprueba que la API de Google esté activa

## Monitoreo de Uso

Para ver tu uso actual:
1. Ve a [Google AI Studio](https://aistudio.google.com/)
2. Navega a "Usage"
3. Verás tus solicitudes del día
