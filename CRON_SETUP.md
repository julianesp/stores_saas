# Configuración del CRON Job para Notificaciones de Suscripciones

Este sistema incluye un CRON job que verifica diariamente las suscripciones próximas a expirar y envía notificaciones a los usuarios.

## 📋 ¿Qué hace el CRON?

El CRON job ejecuta las siguientes tareas automáticamente cada día:

1. **Busca usuarios con prueba gratuita que termina en 3 días**
2. **Busca usuarios con suscripción activa que vence en 3 días**
3. **Registra en logs los usuarios que deben recibir notificación**
4. **(Futuro) Envía emails automáticos de recordatorio**

## 🔧 Configuración

### Opción 1: Vercel Cron (Recomendado para producción)

Si tu aplicación está desplegada en Vercel, puedes usar Vercel Cron:

1. Crea el archivo `vercel.json` en la raíz del proyecto:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-subscriptions",
      "schedule": "0 9 * * *"
    }
  ]
}
```

2. Esto ejecutará el cron todos los días a las 9:00 AM UTC

3. Asegúrate de tener `CRON_SECRET` configurado en las variables de entorno de Vercel

### Opción 2: cron-job.org (Gratis)

1. Regístrate en https://cron-job.org
2. Crea un nuevo cron job con:
   - **URL:** `https://tienda-pos.vercel.app/api/cron/check-subscriptions`
   - **Frecuencia:** Diaria a las 9:00 AM
   - **Headers personalizados:**
     ```
     Authorization: Bearer TU_CRON_SECRET_AQUI
     ```

### Opción 3: EasyCron (Gratis hasta 25 tareas)

1. Regístrate en https://www.easycron.com
2. Crea un nuevo cron job con:
   - **URL:** `https://tienda-pos.vercel.app/api/cron/check-subscriptions`
   - **Expresión Cron:** `0 9 * * *` (9:00 AM diario)
   - **HTTP Headers:**
     ```
     Authorization: Bearer TU_CRON_SECRET_AQUI
     ```

## 🔐 Variables de Entorno Requeridas

Asegúrate de tener estas variables configuradas:

### En Next.js (.env.local o Vercel)

```bash
CRON_SECRET=tu-secreto-super-seguro-917edba8626d6da05f3d2ff52ecac09e
```

### En Cloudflare Workers

```bash
# Ejecutar este comando en cloudflare-migration/
wrangler secret put CRON_SECRET
# Cuando te pregunte, ingresa: tu-secreto-super-seguro-917edba8626d6da05f3d2ff52ecac09e
```

## 🧪 Probar el CRON Manualmente

Puedes probar el CRON job manualmente con curl:

```bash
curl -X GET \
  https://tienda-pos.vercel.app/api/cron/check-subscriptions \
  -H "Authorization: Bearer tu-secreto-super-seguro-917edba8626d6da05f3d2ff52ecac09e"
```

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Verificación de suscripciones completada",
  "notificationsSent": 5,
  "expiringTrials": 3,
  "expiringSubscriptions": 2
}
```

## 📧 Integración de Email (Futuro)

Actualmente el sistema solo registra en logs los usuarios que deben recibir notificación.

Para implementar el envío real de emails, puedes integrar:

### Opción 1: Resend (Recomendado)

```bash
npm install resend
```

```typescript
// En cloudflare-migration/src/routes/subscriptions.ts
import { Resend } from "resend";

const resend = new Resend(c.env.RESEND_API_KEY);

await resend.emails.send({
  from: "Sistema POS <noreply@tudominio.com>",
  to: notification.email,
  subject: "⚠️ Tu suscripción vence en 3 días",
  html: `<p>Hola, tu suscripción vence en 3 días...</p>`,
});
```

### Opción 2: SendGrid

```bash
npm install @sendgrid/mail
```

### Opción 3: Nodemailer (SMTP)

```bash
npm install nodemailer
```

## 📊 Monitoreo

Para ver los logs del CRON en Cloudflare Workers:

```bash
cd cloudflare-migration
wrangler tail
```

Luego ejecuta el CRON y verás los logs en tiempo real.

## 🎯 Notificaciones Actuales en la UI

Aunque el email automático aún no está implementado, los usuarios SÍ reciben notificaciones visuales:

1. **Banner superior** cuando están en período de prueba
2. **Alerta destacada** cuando faltan 3 días o menos (trial o suscripción activa)
3. **Modal de bloqueo** cuando la suscripción ya expiró (con opción de renovar)

## ✅ Estado Actual del Sistema

- ✅ CRON job creado y listo para usar
- ✅ Endpoint de verificación en Worker de Cloudflare
- ✅ Notificaciones visuales en la UI
- ✅ Sistema de recordatorio de 3 días
- ⏳ Envío de emails (pendiente de configurar servicio)

## 🚀 Próximos Pasos

1. Despliega los cambios a producción
2. Configura el CRON en Vercel o cron-job.org
3. Prueba el flujo completo
4. (Opcional) Integra un servicio de email para notificaciones automáticas
