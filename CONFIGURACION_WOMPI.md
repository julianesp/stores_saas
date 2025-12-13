# 🔧 Configuración de Wompi para Sistema POS

## 📋 Resumen de Precios Actuales

- **Plan Básico:** $39,900/mes
- **Análisis IA (Addon):** $15,000/mes
- **Total con IA:** $54,900/mes

---

## 🚀 Paso 1: Crear Cuenta en Wompi

1. Ve a https://comercios.wompi.co/
2. Haz clic en "Registrarse" o "Crear cuenta"
3. Completa el formulario con:
   - Nombre del negocio
   - NIT o Cédula
   - Email
   - Teléfono
   - Contraseña
4. Verifica tu email

---

## 🔑 Paso 2: Obtener tus Credenciales API

### Modo Sandbox (Pruebas)

1. Inicia sesión en https://comercios.wompi.co/
2. Ve a **Configuración** → **API Keys**
3. Copia estas llaves de **SANDBOX**:
   - `Public Key` (empieza con `pub_test_...`)
   - `Private Key` (empieza con `prv_test_...`)
   - `Integrity Secret` (empieza con `test_integrity_...`)

### Modo Producción (Real)

1. **IMPORTANTE:** Primero debes completar el proceso de verificación de tu negocio
2. Wompi te pedirá:
   - RUT o documento de identidad
   - Extracto bancario
   - Cámara de comercio (si aplica)
3. Una vez aprobado, obtendrás las llaves de **PRODUCCIÓN**:
   - `Public Key` (empieza con `pub_prod_...`)
   - `Private Key` (empieza con `prv_prod_...`)
   - `Integrity Secret` (empieza con `prod_integrity_...`)

---

## ⚙️ Paso 3: Configurar Variables de Entorno

1. Copia el archivo `.env.wompi.example` a `.env.local`:

   ```bash
   cp .env.wompi.example .env.local
   ```

2. Edita `.env.local` y agrega tus credenciales:

   **Para pruebas:**

   ```env
   NEXT_PUBLIC_WOMPI_ENV=sandbox
   NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_TU_LLAVE_AQUI
   WOMPI_PRIVATE_KEY=prv_test_TU_LLAVE_AQUI
   WOMPI_INTEGRITY_SECRET=test_integrity_TU_SECRET_AQUI
   ```

   **Para producción:**

   ```env
   NEXT_PUBLIC_WOMPI_ENV=production
   NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_prod_TU_LLAVE_AQUI
   WOMPI_PRIVATE_KEY=prv_prod_TU_LLAVE_AQUI
   WOMPI_INTEGRITY_SECRET=prod_integrity_TU_SECRET_AQUI
   ```

3. **NUNCA** compartas estas llaves públicamente ni las subas a Git

---

## 🔔 Paso 4: Configurar Webhooks (Importante)

Los webhooks permiten que Wompi notifique a tu sistema cuando se completa un pago.

### En Wompi:

1. Ve a **Configuración** → **Webhooks**
2. Haz clic en "Agregar Webhook"
3. Configura:
   - **URL:** `https://tu-dominio.com/api/webhooks/wompi`
   - **Eventos:** Selecciona `transaction.updated`
   - **Estado:** Activo
4. Guarda el webhook

### URLs según entorno:

- **Desarrollo local:** `https://tu-ngrok-url.ngrok.io/api/webhooks/wompi`
- **Producción:** `https://tudominio.com/api/webhooks/wompi`

💡 **Tip:** Para pruebas locales, usa [ngrok](https://ngrok.com/) para crear un túnel HTTPS

---

## 💳 Paso 5: Configurar Métodos de Pago

En el panel de Wompi, activa los métodos de pago que quieres aceptar:

- ✅ **Nequi** (recomendado - más popular en Colombia)
- ✅ **Tarjetas de crédito/débito** (Visa, Mastercard)
- ✅ **PSE** (transferencias bancarias)
- ✅ **Bancolombia** (transferencia desde app)

---

## 💰 Paso 6: Configurar Cuenta Bancaria

Para recibir los pagos:

1. Ve a **Configuración** → **Datos bancarios**
2. Agrega tu cuenta bancaria:
   - Banco
   - Tipo de cuenta (Ahorros/Corriente)
   - Número de cuenta
   - Nombre del titular
3. Wompi verificará la cuenta (puede tomar 1-2 días hábiles)

### Ciclo de pagos:

- **Wompi retiene:** 2-3 días hábiles
- **Comisión:** ~3.49% + IVA por transacción
- **Transferencia:** Automática a tu cuenta cada X días

---

## 🧪 Paso 7: Probar Pagos en Sandbox

Para probar, usa estas tarjetas de prueba de Wompi:

### Tarjeta de Crédito (Aprobada)

```
Número: 4242 4242 4242 4242
CVV: 123
Fecha: Cualquier fecha futura
```

### Tarjeta de Débito (Aprobada)

```
Número: 5555 5555 5555 4444
CVV: 123
Fecha: Cualquier fecha futura
```

### Nequi (Sandbox)

- Número: Cualquier número de 10 dígitos
- Código OTP: `0000` (en sandbox siempre funciona)

---

## 🚦 Paso 8: Pasar a Producción

Cuando estés listo para recibir pagos reales:

1. ✅ Verifica que tu cuenta Wompi esté aprobada
2. ✅ Configura tu cuenta bancaria
3. ✅ Cambia las variables de entorno a producción:
   ```env
   NEXT_PUBLIC_WOMPI_ENV=production
   NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_prod_...
   WOMPI_PRIVATE_KEY=prv_prod_...
   ```
4. ✅ Actualiza la URL del webhook a tu dominio real
5. ✅ Prueba con un pago real pequeño primero
6. ✅ Monitorea los pagos en el panel de Wompi

---

## 📊 Monitoreo de Pagos

### En Wompi:

- **Transacciones:** Ver todos los pagos en tiempo real
- **Reportes:** Descargar reportes de pagos
- **Disputas:** Gestionar devoluciones o reclamos

### En tu Sistema POS:

- Los pagos se reflejan automáticamente vía webhook
- El estado de suscripción se actualiza automáticamente
- Puedes ver el historial en `/dashboard/subscription`

---

## 🆘 Soporte

### Problemas comunes:

1. **"Error al crear pago"**

   - Verifica que las llaves API sean correctas
   - Revisa que estés usando las llaves del entorno correcto (sandbox/prod)

2. **"Webhook no se recibe"**

   - Verifica que la URL sea accesible públicamente
   - Revisa los logs en Wompi → Webhooks → Histórico

3. **"Pago aprobado pero no se activó suscripción"**
   - Revisa los logs del webhook en `/api/webhooks/wompi`
   - Verifica el `Integrity Secret`

### Contacto Wompi:

- 📧 Email: ayuda@wompi.co
- 💬 Chat: En el panel de comercios
- 📱 WhatsApp: Disponible en su sitio web

---

## ✅ Checklist Final

Antes de lanzar en producción:

- [ ] Cuenta Wompi verificada y aprobada
- [ ] Cuenta bancaria configurada y verificada
- [ ] Variables de entorno de producción configuradas
- [ ] Webhook configurado con URL de producción
- [ ] Pago de prueba realizado exitosamente
- [ ] Métodos de pago activados (Nequi, Tarjetas, PSE)
- [ ] Comisiones de Wompi entendidas y aceptadas
- [ ] Monitoreo de transacciones configurado

---

**¡Listo!** 🎉 Tu Sistema POS ya está configurado para recibir pagos con Wompi.
