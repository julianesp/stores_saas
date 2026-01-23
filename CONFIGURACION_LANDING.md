# Guía de Configuración de Landing Page

## ✅ Resumen de Cambios Implementados

Se han implementado las siguientes mejoras en la landing page y sistema POS:

### 1. Sistema de Planes con Precios Diferenciados

**Archivo:** `lib/landing-config.ts`

Se configuraron 4 planes con límites específicos:

| Plan | Precio | Productos | Usuarios | Características Principales |
|------|--------|-----------|----------|---------------------------|
| **Básico** | $24.900/mes | 100 | 1 | POS + Inventario básico + Reportes básicos |
| **Profesional** | $49.900/mes | 200 | 5 | Todo Básico + Tienda online + DIAN + Puntos + Proveedores |
| **Premium** | $79.900/mes | 500 | 10 | Todo Profesional + IA + Email Marketing |
| **Empresa** | Personalizado | Ilimitado | Ilimitado | Todo Premium + Sucursales + API + Soporte dedicado |

### 2. Mensaje Motivador en lugar de Testimonios

**Archivo:** `components/landing/TrustBadges.tsx`

Se reemplazó la sección de testimonios vacíos con un mensaje motivador profesional que incluye:
- Beneficios clave del sistema
- Estadísticas destacadas (7 días gratis, 24/7 soporte, 100% DIAN)
- Diseño atractivo con gradientes azul-morado

### 3. Sección de FAQ (Preguntas Frecuentes)

**Archivo:** `components/landing/FAQ.tsx`

Se creó una sección completa con 17 preguntas en 5 categorías:

1. **General** (3 preguntas)
   - ¿Qué es Posib.dev?
   - ¿Necesito experiencia técnica?
   - ¿Funciona sin internet?

2. **Planes y Precios** (4 preguntas)
   - ¿Puedo probar antes de pagar?
   - ¿Qué plan me conviene?
   - ¿Puedo cambiar de plan?
   - ¿Hay costos ocultos?

3. **Facturación Electrónica** (3 preguntas)
   - ¿Genera facturas DIAN?
   - ¿Estoy obligado a facturar?
   - ¿Cómo funciona la integración?

4. **Tienda Online** (3 preguntas)
   - ¿Qué incluye?
   - ¿Puedo personalizar?
   - ¿Cómo funcionan los pagos?

5. **Soporte y Seguridad** (4 preguntas)
   - ¿Qué soporte ofrecen?
   - ¿Mis datos están seguros?
   - ¿Puedo exportar datos?

### 4. Chat en Vivo con Tawk.to

**Archivos creados:**
- `components/TawkToChat.tsx` - Componente reutilizable del chat
- Integrado en `app/page.tsx` (landing page)
- Integrado en `app/dashboard/config/page.tsx` (Configuración del POS)

**Características:**
- Widget en esquina inferior derecha
- No interfiere con el contenido
- Tarjeta informativa en la página de Configuración
- Se carga solo si está configurado

### 5. Contador Dinámico de Tiendas Activas

**Archivos:**
- `app/api/stats/active-stores/route.ts` - Endpoint Next.js
- `cloudflare-migration/src/routes/stats.ts` - Endpoint Cloudflare Worker
- `cloudflare-migration/src/index.ts` - Registro de ruta pública

**Funcionamiento:**
- Consulta la base de datos D1 en tiempo real
- Cuenta tiendas con `subscription_status = 'active'` o `'trial'`
- Actualiza automáticamente sin caché
- Muestra mínimo "1+" como fallback

### 6. Integración de Calendly

**Archivo:** `app/page.tsx`

Se centralizó la configuración para usar la URL desde `landing-config.ts` en todos los botones de "Agendar Demo".

---

## 📋 Pasos de Configuración PENDIENTES

### 🔴 IMPORTANTE: Configurar Estos 3 Elementos

#### 1. Configurar Tawk.to (Chat en Vivo) ⏱️ 5 minutos

**Pasos:**

1. Ve a https://www.tawk.to/ y crea una cuenta gratis
2. Inicia sesión y crea un nuevo "Property" (sitio web)
3. Ve a **Administration → Channels → Chat Widget**
4. En la sección "Direct Chat Link", haz clic en "**Widget Code**"
5. Copia los valores que necesitas:

```javascript
// Ejemplo del código que verás:
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/PROPERTY_ID/WIDGET_ID';  // ← AQUÍ ESTÁN
...
```

6. Abre el archivo `lib/landing-config.ts` y actualiza:

```typescript
tawkTo: {
  propertyId: '65f3a2b8c4e1234567890abc', // ← Reemplaza con tu Property ID
  widgetId: '1h0k2m4p6r8t0v2x4z6',        // ← Reemplaza con tu Widget ID
},
```

**Nota:** El chat NO aparecerá hasta que configures estos valores. Los valores por defecto están como `'TU_PROPERTY_ID'` para que no cargue un widget inválido.

---

#### 2. Configurar Calendly ⏱️ 2 minutos

Ya asociaste tu cuenta de Google con Calendly, ahora:

1. Ve a tu dashboard de Calendly: https://calendly.com/dashboard
2. Crea o selecciona un tipo de evento (por ejemplo: "Demo 30min")
3. Copia la URL completa de tu evento, ejemplo:
   - `https://calendly.com/julianposib/demo`
   - `https://calendly.com/tu-usuario/demo-posib`

4. Abre `lib/landing-config.ts` y actualiza:

```typescript
calendly: {
  url: 'https://calendly.com/julianposib/demo', // ← Tu URL real de Calendly
},
```

---

#### 3. Desplegar Worker de Cloudflare ⏱️ 2 minutos

El contador de tiendas requiere desplegar el nuevo endpoint:

```bash
# Desde la raíz del proyecto
cd cloudflare-migration

# Desplegar a producción
npm run deploy

# O si prefieres desarrollo primero
npm run dev  # Para probar localmente
```

Esto creará el endpoint público: `https://tienda-pos-api.julii1295.workers.dev/stats/active-stores`

---

## 🧪 Probar los Cambios

### En desarrollo local:

```bash
# Desde la raíz del proyecto
npm run dev
```

Visita: http://localhost:3000

### ✅ Lista de Verificación:

- [ ] **Planes:** Los 4 planes se muestran con precios correctos
- [ ] **FAQ:** Se puede abrir/cerrar cada pregunta
- [ ] **Mensaje Motivador:** Aparece en lugar de testimonios
- [ ] **Chat (después de configurar):** Widget en esquina inferior derecha
- [ ] **Contador de Tiendas:** Muestra al menos "1+ Tiendas Activas"
- [ ] **Calendly:** Botones abren tu URL de Calendly
- [ ] **WhatsApp:** Botón verde flotante funciona

---

## 🚀 Desplegar a Producción

### Opción 1: Despliegue automático con Git (Recomendado)

```bash
# Ya hice el commit por ti, solo haz push
git push origin main
```

Vercel detectará los cambios y desplegará automáticamente en unos minutos.

### Opción 2: Despliegue manual desde Vercel Dashboard

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto `tienda-pos`
3. Ve a la pestaña "Deployments"
4. Haz clic en "Redeploy" con el último commit

---

## 🎨 Personalización Adicional (Opcional)

### Cambiar colores del mensaje motivador

Archivo: `components/landing/TrustBadges.tsx`, línea 48:

```typescript
// Actual: azul-morado
className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-400/30"

// Alternativa 1: verde-azul
className="bg-gradient-to-br from-green-900/50 to-blue-900/50 border-green-400/30"

// Alternativa 2: naranja-rojo
className="bg-gradient-to-br from-orange-900/50 to-red-900/50 border-orange-400/30"
```

### Agregar más preguntas al FAQ

Archivo: `components/landing/FAQ.tsx`, edita el array `faqs`:

```typescript
{
  category: 'Nueva Categoría',
  questions: [
    {
      question: '¿Nueva pregunta?',
      answer: 'Respuesta detallada aquí...',
    },
  ],
},
```

### Modificar límites de planes

Archivo: `lib/landing-config.ts`, sección `pricing`:

```typescript
professional: {
  price: 49900,
  maxProducts: 200,    // ← Cambia este número
  maxUsers: 5,         // ← O este
  features: { ... },
},
```

---

## 🐛 Solución de Problemas

### ❌ El chat no aparece

**Causa:** No has configurado los IDs de Tawk.to

**Solución:**
1. Verifica `lib/landing-config.ts`
2. Asegúrate que `propertyId` y `widgetId` NO empiecen con `"TU_"`
3. Recarga la página con Ctrl+Shift+R (forzar recarga)

---

### ❌ El contador siempre muestra "1"

**Causa:** No has desplegado el worker actualizado

**Solución:**
```bash
cd cloudflare-migration
npm run deploy
```

Luego verifica que el endpoint funcione:
```bash
curl https://tienda-pos-api.julii1295.workers.dev/stats/active-stores
```

Deberías ver:
```json
{"success":true,"count":1,"timestamp":"2026-01-22T..."}
```

---

### ❌ Los botones de Calendly no funcionan

**Causa:** URL no configurada o incorrecta

**Solución:**
1. Verifica `lib/landing-config.ts`
2. La URL debe empezar con `https://calendly.com/`
3. Prueba la URL en el navegador primero

---

### ❌ Error: "landingConfig is not defined"

**Causa:** Falta importar el config

**Solución:**
```typescript
import { landingConfig } from '@/lib/landing-config';
```

---

## 📊 Estructura de Archivos

```
tienda-pos/
├── app/
│   ├── page.tsx                          # ✅ Landing page con FAQ y chat
│   ├── api/stats/active-stores/route.ts  # ✅ Endpoint contador
│   └── dashboard/config/page.tsx         # ✅ Config POS con chat
├── components/
│   ├── TawkToChat.tsx                    # ✅ Componente de chat
│   └── landing/
│       ├── FAQ.tsx                        # ✅ Preguntas frecuentes
│       ├── PricingPlans.tsx              # ✅ Planes y precios
│       ├── TrustBadges.tsx               # ✅ Stats + Mensaje motivador
│       ├── WhatsAppButton.tsx            # ✅ Botón flotante
│       ├── DianCompliance.tsx            # ✅ Cumplimiento DIAN
│       ├── DianGuarantee.tsx             # ✅ Garantía DIAN
│       ├── FreeMigration.tsx             # ✅ Migración gratis
│       ├── OvercomeResistance.tsx        # ✅ Superar resistencia
│       └── VideoTutorials.tsx            # ✅ Tutoriales (placeholder)
├── lib/
│   └── landing-config.ts                 # ✅ Config centralizada
└── cloudflare-migration/src/
    ├── index.ts                          # ✅ Registro de ruta stats
    └── routes/stats.ts                   # ✅ Endpoint contador D1
```

---

## 📞 Siguiente Paso INMEDIATO

### 🎯 Configurar Tawk.to (5 minutos)

Esto es lo único que falta para que el chat funcione:

1. Ve a https://www.tawk.to/
2. Crea cuenta gratis
3. Copia Property ID y Widget ID
4. Actualiza `lib/landing-config.ts`
5. Haz push y despliega

```bash
# Después de editar landing-config.ts
git add lib/landing-config.ts
git commit -m "Configurar Tawk.to con IDs reales"
git push
```

---

## 📝 Resumen de URLs

| Servicio | URL | Estado |
|----------|-----|--------|
| Landing Dev | http://localhost:3000 | ✅ Listo |
| Landing Prod | https://posib.dev | ⏳ Desplegar |
| Tawk.to | https://www.tawk.to/ | 🔴 Configurar |
| Calendly | https://calendly.com/ | 🟡 Actualizar URL |
| Worker API | https://tienda-pos-api.julii1295.workers.dev | 🟡 Desplegar |

---

## ✅ TODO List

- [ ] Configurar Tawk.to (Property ID y Widget ID)
- [ ] Actualizar URL de Calendly en landing-config.ts
- [ ] Desplegar Cloudflare Worker (`npm run deploy`)
- [ ] Hacer push a Git (`git push origin main`)
- [ ] Verificar que todo funciona en producción
- [ ] Grabar videos demostrativos para VideoTutorials.tsx
- [ ] Agregar testimonios reales cuando lleguen clientes

---

## 📞 Soporte

Si tienes problemas con la configuración:
- **WhatsApp:** +57 317 450 3604
- **Email:** contacto@posib.dev
- **Chat en vivo:** (después de configurar Tawk.to 😉)

---

**Fecha de creación:** 2026-01-22
**Versión:** 1.0.0
**Estado:** ✅ Implementación completa - Pendiente configuración de Tawk.to y Calendly
