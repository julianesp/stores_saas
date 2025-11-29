# Sistema POS - Gestión Completa para Tiendas

Sistema integral de punto de venta y gestión de inventario construido con Next.js 15, Firebase/Firestore y Clerk.

## Características Principales

- Sistema de Punto de Venta (POS) con lectura de código de barras
- Gestión completa de productos con categorías y proveedores
- Control de inventario con alertas de stock bajo
- Sistema de facturación y ventas
- Reportes diarios, semanales y mensuales
- Ofertas automáticas para productos próximos a vencer
- Gestión de clientes con puntos de fidelidad
- Aplicación Web Progresiva (PWA)
- Autenticación con múltiples roles (admin, cajero, cliente)

## Configuración Inicial

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env.local` y configura:

```bash
# Clerk Authentication (obtener en https://clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Firebase (obtener en https://console.firebase.google.com)
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=tu-app-id
```

### 3. Configurar Firebase/Firestore

1. Ve a la [Consola de Firebase](https://console.firebase.google.com)
2. Crea un nuevo proyecto o usa uno existente
3. Habilita Firestore Database en modo producción
4. Configura las reglas de seguridad según tus necesidades
5. Las colecciones se crearán automáticamente al agregar el primer documento

### 4. Ejecutar en Modo Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del Proyecto

```
tienda-pos/
├── app/
│   ├── dashboard/          # Páginas del dashboard
│   │   ├── pos/           # Punto de venta
│   │   ├── products/      # Gestión de productos
│   │   ├── suppliers/     # Gestión de proveedores
│   │   ├── customers/     # Gestión de clientes
│   │   ├── sales/         # Historial de ventas
│   │   └── offers/        # Sistema de ofertas
│   ├── sign-in/           # Inicio de sesión
│   └── sign-up/           # Registro
├── components/            # Componentes reutilizables
├── lib/                   # Utilidades y configuración
│   ├── firebase.ts       # Configuración de Firebase
│   ├── firestore-helpers.ts  # Funciones helper para Firestore
│   └── types.ts          # Tipos TypeScript
└── supabase/             # Esquemas de referencia (legacy)
```

## Guía de Uso

### Punto de Venta (POS)

1. Ve a "Punto de Venta" en el dashboard
2. Conecta tu lector de código de barras USB
3. Escanea productos o búscalos manualmente
4. Selecciona método de pago (efectivo, tarjeta, transferencia)
5. Procesa la venta

**Tip**: El lector de código de barras funciona como un teclado. El cursor se enfoca automáticamente en el campo correcto.

### Gestión de Productos

- **Crear**: Agrega nuevos productos con código de barras, precios, stock
- **Editar**: Actualiza información y precios
- **Categorías**: Organiza productos por categorías
- **Alertas**: Recibe notificaciones de stock bajo

### Sistema de Ofertas

El sistema detecta automáticamente productos próximos a vencer (15 días o menos) y te permite crear ofertas con un clic:
- 10% de descuento
- 20% de descuento
- 30% de descuento

### Reportes

Accede a reportes de ventas:
- **Hoy**: Ventas del día actual
- **Semana**: Últimos 7 días
- **Mes**: Último mes

Visualiza métricas como:
- Total de ventas
- Monto total
- Productos más vendidos
- Métodos de pago utilizados

## Tecnologías

- **Next.js 15** - Framework React
- **Firebase/Firestore** - Base de datos NoSQL en tiempo real
- **Clerk** - Autenticación
- **Tailwind CSS** - Estilos
- **TypeScript** - Tipado estático
- **PWA** - Aplicación web progresiva

## Características PWA

La aplicación se puede instalar en dispositivos móviles:

1. Abre la app en Chrome/Safari
2. Menú > "Agregar a pantalla de inicio"
3. Usa como app nativa

## Sistema de Super Administrador

El sistema incluye un panel de Super Administrador para gestionar el SaaS multi-tenant:

### Características del Panel de Super Admin

- **Dashboard de Métricas**:
  - Total de tiendas registradas
  - Tiendas activas con suscripción pagada
  - Tiendas en período de prueba
  - Ingresos mensuales estimados

- **Gestión de Tiendas**:
  - Ver lista completa de todas las tiendas
  - Activar/Suspender suscripciones de tiendas
  - Promover usuarios a Super Admin
  - Buscar tiendas por nombre o email

### Configuración de Super Admin

Por defecto, el usuario con email `admin@neural.dev` es automáticamente promovido a Super Admin.

#### Promover manualmente a Super Admin

Existen 3 formas de promover un usuario:

1. **Automática**: El usuario con email `admin@neural.dev` es automáticamente Super Admin
2. **Desde el Panel**: Los Super Admins pueden promover otros usuarios desde el panel usando el botón con ícono de escudo
3. **Por API**: Llamar a `/api/admin/set-superadmin` con el email del usuario

#### Actualizar Perfil

Si acabas de registrarte con el email de super admin, haz clic en el botón "Actualizar Perfil" en el header del dashboard para forzar la actualización de tu perfil.

### Beneficios del Super Admin

- ✅ Acceso ilimitado sin necesidad de suscripción
- ✅ No aparece el banner de trial o suscripción expirada
- ✅ Acceso al panel de Super Admin
- ✅ Puede gestionar todas las tiendas del sistema

## Sistema de Suscripciones

El sistema incluye un modelo de suscripción con prueba gratuita:

### Período de Prueba

- **30 días de prueba gratuita** para todos los nuevos usuarios
- Acceso completo a todas las funciones durante el período de prueba
- Banner informativo mostrando días restantes
- Sin necesidad de tarjeta de crédito para empezar

### Planes Disponibles

1. **Plan Básico** - $50,000 COP/mes
   - Punto de venta completo
   - Gestión de inventario
   - Hasta 1000 productos
   - Reportes básicos
   - Soporte por email

2. **Plan Profesional** - $100,000 COP/mes
   - Todo lo del Plan Básico
   - Productos ilimitados
   - Múltiples usuarios (hasta 5)
   - Reportes avanzados
   - Integración con DIAN
   - Soporte prioritario

### Métodos de Pago (Wompi)

El sistema acepta los siguientes métodos de pago:

- 💜 **Nequi** - Billetera digital
- 💳 **Tarjetas** - Visa, Mastercard, Amex (incluye Nu/Nubank)
- 🏦 **PSE** - Transferencias bancarias
- 🟡 **Bancolombia** - Botón y transferencias

### Configuración de Wompi

1. Crea una cuenta en [Wompi Comercios](https://comercios.wompi.co/register)
2. Obtén tus credenciales en el dashboard
3. Configura las variables de entorno (ver `.env.example`)
4. Configura el webhook: `https://tu-dominio.com/api/webhooks/wompi`

Para más detalles, consulta la guía completa en `.env.example`.

## Próximas Características

- [ ] Envío a domicilio
- [ ] Integración con DIAN (Colombia)
- [ ] Impresión de facturas
- [ ] Exportar reportes a PDF/Excel
- [ ] Notificaciones push
- [ ] Suscripciones anuales con descuento

## Soporte

Para reportar problemas o solicitar características, contacta al desarrollador.

---

Desarrollado para optimizar la gestión de tiendas en Colombia
