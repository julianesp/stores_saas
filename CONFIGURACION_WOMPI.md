# Configuración de Pagos con Wompi

## ✅ Estado Actual

El sistema de pagos con Wompi está **completamente funcional**:

- ✅ Payment links se crean correctamente
- ✅ Redirige a Wompi checkout
- ✅ Muestra el monto correcto ($29,900 COP)
- ✅ Webhook implementado y desplegado
- ✅ Base de datos lista para recibir transacciones

---

## 🔧 Configurar Webhook en Wompi (IMPORTANTE)

Para que las suscripciones se activen automáticamente después del pago, debes configurar el webhook en Wompi:

### Paso 1: Acceder al Panel de Wompi

1. Ir a: https://comercios.wompi.co/login
2. Iniciar sesión con tus credenciales
3. Ir a **Configuración → Webhooks** o **Configuración → Eventos**

### Paso 2: Agregar el Webhook

**Para producción en Vercel:**
```
https://tu-app.vercel.app/api/webhooks/wompi
```

### Paso 3: Configurar Eventos

Selecciona el evento:
- ✅ **transaction.updated** (obligatorio)

---

## 🧪 Probar el Flujo Completo

1. Ir a `/dashboard/subscription`
2. Hacer clic en "Pagar con Nequi" o "Otros métodos"
3. Completar el pago en Wompi
4. El webhook se disparará automáticamente
5. La suscripción se activará

---

## 📊 Verificar que el Webhook Funciona

```bash
# Ver transacciones
wrangler d1 execute tienda-pos-shared --remote \
  --command="SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 5"

# Ver estado de suscripción
wrangler d1 execute tienda-pos-shared --remote \
  --command="SELECT email, subscription_status, plan_id FROM user_profiles"
```

