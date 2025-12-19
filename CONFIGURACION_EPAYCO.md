# Configuración de ePayco - Tienda POS

## 🎯 Estado Actual

✅ **Sistema de pagos con ePayco completamente configurado y listo para producción**

### Credenciales en Producción
- **Ambiente**: Producción
- **Método de pago**: Checkout Estándar
- **P_CUST_ID_CLIENTE**: 1561203
- **P_KEY**: 101df072a3893ba3a275792688bbd7b1
- **PRIVATE_KEY**: 202c490f729670c6ae421c8031c2c6ab
- **PUBLIC_KEY**: 2d9fe7c7c0a93958d633f67ad51f14e4be86e686

### URL de Producción
- **Aplicación**: https://tienda-pos.vercel.app
- **Webhook de confirmación**: https://tienda-pos.vercel.app/api/webhooks/epayco
- **Página de respuesta**: https://tienda-pos.vercel.app/dashboard/subscription/payment-response

---

## 📋 Configuración en ePayco

### 1. URLs de Confirmación y Respuesta

Debes configurar estas URLs en tu panel de ePayco:

1. Ingresa a: https://secure.epayco.co/panel/
2. Ve a **Configuración** → **URLs de Respuesta**
3. Configura:
   - **URL de Confirmación**: `https://tienda-pos.vercel.app/api/webhooks/epayco`
   - **URL de Respuesta**: `https://tienda-pos.vercel.app/dashboard/subscription/payment-response`
   - **Método de confirmación**: POST

### 2. Métodos de Pago Habilitados

Asegúrate de tener habilitados en tu cuenta de ePayco:
- ✅ Nequi
- ✅ Tarjetas de crédito/débito (Visa, Mastercard)
- ✅ PSE
- ✅ Bancolombia

---

## 🚀 Despliegue en Vercel

### Opción 1: Script Automático (Recomendado)

```bash
# Ejecutar el script que sube las variables automáticamente
./upload-epayco-env-auto.sh
```

Este script:
1. Lee los valores de tu `.env.local`
2. Los sube a Vercel en el ambiente de producción
3. Te muestra un resumen antes de confirmar

### Opción 2: Manual a través de Vercel CLI

```bash
# 1. ePayco Ambiente
echo "production" | vercel env add NEXT_PUBLIC_EPAYCO_ENV production

# 2. Public Key
echo "2d9fe7c7c0a93958d633f67ad51f14e4be86e686" | vercel env add NEXT_PUBLIC_EPAYCO_PUBLIC_KEY production

# 3. Customer ID
echo "1561203" | vercel env add EPAYCO_P_CUST_ID_CLIENTE production

# 4. P Key
echo "101df072a3893ba3a275792688bbd7b1" | vercel env add EPAYCO_P_KEY production

# 5. Private Key
echo "202c490f729670c6ae421c8031c2c6ab" | vercel env add EPAYCO_PRIVATE_KEY production

# 6. URLs
echo "https://tienda-pos.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production
echo "https://tienda-pos.vercel.app" | vercel env add NEXT_PUBLIC_URL production
```

### Opción 3: Manual a través del Dashboard de Vercel

1. Ve a: https://vercel.com/tu-proyecto/settings/environment-variables
2. Agrega las siguientes variables para **Production**:

```
NEXT_PUBLIC_EPAYCO_ENV = production
NEXT_PUBLIC_EPAYCO_PUBLIC_KEY = 2d9fe7c7c0a93958d633f67ad51f14e4be86e686
EPAYCO_P_CUST_ID_CLIENTE = 1561203
EPAYCO_P_KEY = 101df072a3893ba3a275792688bbd7b1
EPAYCO_PRIVATE_KEY = 202c490f729670c6ae421c8031c2c6ab
NEXT_PUBLIC_APP_URL = https://tienda-pos.vercel.app
NEXT_PUBLIC_URL = https://tienda-pos.vercel.app
```

### Después de configurar las variables:

```bash
# Desplegar a producción
vercel --prod
```

---

## 💳 Planes de Suscripción

### Plan Básico
- **Precio**: $29,900 COP/mes
- **ID**: `basic-monthly`
- **Características**:
  - Gestión completa de inventario
  - Punto de venta (POS)
  - Gestión de clientes
  - Reportes y estadísticas básicas
  - Soporte técnico por email
  - Actualizaciones automáticas

### Add-on de Análisis IA
- **Precio**: $9,900 COP/mes
- **ID**: `ai-addon-monthly`
- **Características**:
  - Análisis predictivo de ventas
  - Recomendaciones inteligentes
  - Detección de patrones de compra
  - Optimización automática de inventario
  - Alertas inteligentes
  - Dashboard con insights IA

### Combo (Básico + IA)
- **Precio**: $39,800 COP/mes
- **Ahorro**: $0 (mismo precio que comprar por separado)

---

## 🔄 Flujo de Pago

### 1. Usuario selecciona plan
- Usuario entra a `/dashboard/subscription`
- Selecciona plan (Básico o IA)
- Selecciona método de pago (Nequi u Otros)

### 2. Creación del checkout
- Se llama a `/api/subscription/create-payment`
- Se genera referencia única: `SUB-{userProfileId}-{timestamp}`
- Se calcula firma de seguridad
- Se crea URL de checkout en ePayco

### 3. Proceso de pago en ePayco
- Usuario es redirigido a ePayco
- Completa el pago con su método preferido
- ePayco procesa el pago

### 4. Confirmación (Webhook)
- ePayco envía POST a `/api/webhooks/epayco`
- Se verifica la firma de seguridad
- Se valida que la transacción fue aprobada
- Se activa la suscripción del usuario
- Se registra la transacción en la base de datos

### 5. Respuesta al usuario
- Usuario es redirigido a `/dashboard/subscription/payment-response`
- Sistema detecta el estado del pago
- Redirige a:
  - `/dashboard/subscription/success` si fue aprobado
  - `/dashboard/subscription/failed` si fue rechazado

---

## 🔍 Verificación Manual de Pagos

Si un pago fue aprobado pero no se activó automáticamente:

1. Usuario va a `/dashboard/subscription/verify-payment`
2. Ingresa el ID de transacción de ePayco
3. Sistema consulta el estado en ePayco
4. Si está aprobado, activa la suscripción manualmente

### ¿Dónde encontrar el ID de transacción?
- Email de confirmación de ePayco
- Recibo de pago
- Panel de ePayco

---

## 🧪 Pruebas

### Tarjetas de Prueba en Producción

ePayco proporciona tarjetas de prueba incluso en ambiente de producción:

**Visa (Aprobada)**
- Número: 4575623182290326
- CVV: 123
- Fecha: Cualquier fecha futura

**Mastercard (Rechazada)**
- Número: 5254133674403900
- CVV: 123
- Fecha: Cualquier fecha futura

### Probar Flujo Completo

1. **Crear pago**:
   ```bash
   # Ir a la app
   https://tienda-pos.vercel.app/dashboard/subscription

   # Seleccionar plan y pagar con tarjeta de prueba
   ```

2. **Verificar webhook**:
   ```bash
   # Ver logs en Vercel
   vercel logs --follow

   # Buscar: "ePayco Webhook Received"
   ```

3. **Verificar activación**:
   ```bash
   # Revisar en Cloudflare D1
   # O ver en el dashboard del usuario
   ```

---

## 🐛 Troubleshooting

### El webhook no se está ejecutando

**Posibles causas**:
1. Las URLs no están configuradas en el panel de ePayco
2. El método de confirmación no está configurado como POST
3. Las variables de entorno no están en Vercel

**Solución**:
```bash
# 1. Verificar URLs en panel de ePayco
# 2. Verificar variables en Vercel
vercel env ls

# 3. Ver logs en tiempo real
vercel logs --follow
```

### La firma es inválida

**Causa**: Las credenciales en `.env.local` no coinciden con las de Vercel

**Solución**:
```bash
# Volver a subir las variables
./upload-epayco-env-auto.sh

# Redesplegar
vercel --prod
```

### El pago se aprobó pero no se activó la suscripción

**Solución inmediata**:
1. Usuario usa verificación manual: `/dashboard/subscription/verify-payment`
2. Ingresa el ID de transacción
3. Sistema activa manualmente

**Solución permanente**:
- Revisar logs del webhook
- Verificar que el webhook se esté ejecutando

---

## 📊 Monitoreo

### Ver transacciones
```bash
# En Cloudflare D1
wrangler d1 execute tienda-pos-shared --remote --command="SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 10"
```

### Ver suscripciones activas
```bash
wrangler d1 execute tienda-pos-shared --remote --command="SELECT email, subscription_status, plan_id, has_ai_addon FROM user_profiles WHERE subscription_status = 'active'"
```

### Ver logs en tiempo real
```bash
# Logs de Vercel
vercel logs --follow

# Logs de Cloudflare Workers
wrangler tail
```

---

## 📞 Soporte

### Documentación de ePayco
- Panel: https://secure.epayco.co/panel/
- Documentación API: https://docs.epayco.co/
- Checkout Estándar: https://docs.epayco.co/payments/checkout-standar

### Archivos relacionados
- Librería ePayco: `/lib/epayco.ts`
- Webhook: `/app/api/webhooks/epayco/route.ts`
- Create Payment: `/app/api/subscription/create-payment/route.ts`
- Verify Payment: `/app/api/subscription/verify-payment/route.ts`
- Página de suscripción: `/app/dashboard/subscription/page.tsx`

---

## ✅ Checklist de Despliegue

- [ ] Variables de entorno subidas a Vercel
- [ ] URLs configuradas en panel de ePayco
- [ ] Desplegado con `vercel --prod`
- [ ] Probado flujo completo de pago
- [ ] Verificado que el webhook funciona
- [ ] Probado verificación manual
- [ ] Revisado que las suscripciones se activan correctamente

---

**Última actualización**: 2025-12-19
**Estado**: ✅ Listo para producción
