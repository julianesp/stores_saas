# 🎨 Guía de SweetAlert2 - Notificaciones Elegantes

## ✅ ¿Qué es SweetAlert2?

**SweetAlert2** es una librería que reemplaza las feas notificaciones nativas de JavaScript (`alert()`, `confirm()`, `prompt()`) con modales hermosos y personalizables.

---

## 🚀 Uso Básico

### **1. Importar en tu archivo**

```typescript
import Swal from '@/lib/sweetalert';
```

---

## 📋 Tipos de Notificaciones

### **Notificaciones Toast (esquina superior derecha)**

#### **Éxito ✅**
```typescript
Swal.success('Producto guardado correctamente');
Swal.success('Operación completada', 'Todo salió bien');
```

#### **Error ❌**
```typescript
Swal.error('No se pudo guardar el producto');
Swal.error('Error al procesar', 'Intenta de nuevo');
```

#### **Advertencia ⚠️**
```typescript
Swal.warning('Stock insuficiente');
Swal.warning('Cuidado', 'Esta acción puede tener consecuencias');
```

#### **Información ℹ️**
```typescript
Swal.info('Este producto ya existe');
Swal.info('Dato interesante', 'El usuario ya tiene una cuenta');
```

---

## 🔔 Notificaciones Especiales del Sistema

### **Producto Agregado al Carrito** 🛒
```typescript
Swal.productAdded('Coca Cola 1.5L', 1);
Swal.productAdded('Arroz Diana', 3); // cantidad: 3
```

### **Venta Completada** 💰
```typescript
Swal.saleCompleted('VTA-001', 45000);
// Parámetros: número de venta, total
```

---

## ❓ Confirmaciones

### **Confirmación Simple**
```typescript
const confirmed = await Swal.confirm(
  '¿Estás seguro de continuar?',
  'Confirmar acción'
);

if (confirmed) {
  // Usuario hizo clic en "Sí, continuar"
  console.log('Confirmado');
} else {
  // Usuario canceló
  console.log('Cancelado');
}
```

### **Confirmación Personalizada**
```typescript
const result = await Swal.confirm(
  'Se enviará un email al cliente',
  '¿Enviar notificación?',
  {
    confirmText: 'Sí, enviar',
    cancelText: 'No enviar',
    type: 'question'
  }
);
```

### **Confirmación de Eliminación** 🗑️
```typescript
const confirmed = await Swal.deleteConfirm(
  'Coca Cola 1.5L',
  'Esta acción no se puede deshacer'
);

if (confirmed) {
  // Eliminar producto
  await deleteProduct(productId);
  Swal.success('Producto eliminado');
}
```

---

## ⏳ Indicadores de Carga

### **Mostrar Loading**
```typescript
Swal.loading('Procesando venta...');

// Hacer operación asíncrona
await procesarVenta();

// Cerrar loading
Swal.closeLoading();

// Mostrar resultado
Swal.success('Venta procesada');
```

### **Ejemplo Completo**
```typescript
const guardarProducto = async () => {
  Swal.loading('Guardando producto...');

  try {
    await createDocument('products', data);
    Swal.closeLoading();
    Swal.success('Producto guardado correctamente');
  } catch (error) {
    Swal.closeLoading();
    Swal.error('Error al guardar', error.message);
  }
};
```

---

## 📝 Inputs y Formularios

### **Input Simple**
```typescript
const nombre = await Swal.input(
  '¿Cuál es tu nombre?',
  'Escribe tu nombre completo'
);

if (nombre) {
  console.log('Nombre:', nombre);
}
```

### **Input Numérico**
```typescript
const descuento = await Swal.input(
  'Descuento',
  'Ingresa el porcentaje de descuento',
  'number',
  '10' // valor por defecto
);
```

---

## 🎨 Modal Personalizado

```typescript
Swal.custom({
  title: 'Título Personalizado',
  html: `
    <div>
      <p>Contenido HTML personalizado</p>
      <strong>Puede incluir cualquier HTML</strong>
    </div>
  `,
  icon: 'success',
  confirmButtonText: 'Entendido',
  showCancelButton: true,
  cancelButtonText: 'Cerrar'
});
```

---

## 📚 Ejemplos Reales del Sistema

### **Ejemplo 1: Agregar Producto al POS**

**ANTES (con toast de sonner):**
```typescript
toast.success(`${product.name} agregado al carrito`);
```

**AHORA (con SweetAlert2):**
```typescript
Swal.productAdded(product.name, 1);
```

### **Ejemplo 2: Eliminar Producto**

**ANTES (con confirm nativo):**
```typescript
if (!confirm('¿Estás seguro de eliminar este producto?')) return;

await deleteDocument('products', id);
toast.success('Producto eliminado');
```

**AHORA (con SweetAlert2):**
```typescript
const confirmed = await Swal.deleteConfirm(
  productName,
  'Esta acción no se puede deshacer'
);

if (!confirmed) return;

Swal.loading('Eliminando producto...');
await deleteDocument('products', id);
Swal.closeLoading();
Swal.success('Producto eliminado correctamente');
```

### **Ejemplo 3: Procesar Venta**

```typescript
const processSale = async () => {
  if (cart.length === 0) {
    Swal.warning('El carrito está vacío', 'Agrega productos primero');
    return;
  }

  Swal.loading('Procesando venta...');

  try {
    const sale = await createDocument('sales', data);
    Swal.closeLoading();
    Swal.saleCompleted(sale.number, sale.total);
  } catch (error) {
    Swal.closeLoading();
    Swal.error('Error al procesar la venta', error.message);
  }
};
```

---

## 🔄 Migrar de Sonner a SweetAlert2

### **Paso 1: Cambiar Import**

**ANTES:**
```typescript
import { toast } from 'sonner';
```

**AHORA:**
```typescript
import Swal from '@/lib/sweetalert';
```

### **Paso 2: Reemplazar Llamadas**

| Sonner (Antes) | SweetAlert2 (Ahora) |
|----------------|---------------------|
| `toast.success('Mensaje')` | `Swal.success('Mensaje')` |
| `toast.error('Mensaje')` | `Swal.error('Mensaje')` |
| `toast.warning('Mensaje')` | `Swal.warning('Mensaje')` |
| `toast.info('Mensaje')` | `Swal.info('Mensaje')` |

### **Paso 3: Confirmaciones**

**ANTES:**
```typescript
if (!confirm('¿Estás seguro?')) return;
```

**AHORA:**
```typescript
const confirmed = await Swal.confirm('¿Estás seguro?');
if (!confirmed) return;
```

---

## 🎯 Casos de Uso Comunes

### **1. Validación de Formulario**
```typescript
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!formData.name) {
    Swal.warning('Campo requerido', 'El nombre es obligatorio');
    return;
  }

  if (!formData.price || formData.price <= 0) {
    Swal.warning('Precio inválido', 'El precio debe ser mayor a 0');
    return;
  }

  Swal.loading('Guardando...');
  await saveData();
  Swal.closeLoading();
  Swal.success('¡Guardado exitosamente!');
};
```

### **2. Confirmación antes de Acción Destructiva**
```typescript
const handleDelete = async (id) => {
  const confirmed = await Swal.deleteConfirm(
    'este elemento',
    'No podrás recuperarlo después'
  );

  if (confirmed) {
    await deleteItem(id);
    Swal.success('Elemento eliminado');
  }
};
```

### **3. Operación con Múltiples Pasos**
```typescript
const complexOperation = async () => {
  Swal.loading('Paso 1: Validando datos...');
  await step1();

  Swal.loading('Paso 2: Guardando en base de datos...');
  await step2();

  Swal.loading('Paso 3: Enviando notificación...');
  await step3();

  Swal.closeLoading();
  Swal.success('Operación completada', 'Todos los pasos ejecutados correctamente');
};
```

---

## 🎨 Personalización de Colores

Los colores están configurados en `/lib/sweetalert.ts`:

```typescript
const defaultConfig = {
  confirmButtonColor: '#2563eb',  // Azul - botón confirmar
  cancelButtonColor: '#64748b',   // Gris - botón cancelar
};
```

Puedes cambiarlos editando ese archivo.

---

## 📱 Responsive

Todas las notificaciones son **100% responsive**:
- ✅ Se ven perfectas en celulares
- ✅ Se adaptan a tablets
- ✅ Funcionan en computadoras

---

## 🆚 Comparación Visual

### **Antes (notificaciones nativas)**
```
┌─────────────────────────────┐
│  [!] http://localhost:3000  │
│  dice:                      │
│                             │
│  Producto eliminado         │
│                             │
│  [        OK        ]       │
└─────────────────────────────┘
```
**Feo, aburrido, genérico**

### **Ahora (SweetAlert2)**
```
╔═══════════════════════════════╗
║  ✓ ¡Éxito!                    ║
║                               ║
║  Producto eliminado           ║
║  correctamente                ║
║                               ║
║  [  Aceptar  ]                ║
╚═══════════════════════════════╝
```
**Elegante, moderno, personalizado**

---

## 🔧 Métodos Disponibles

```typescript
// Notificaciones Toast
Swal.success(message, title?)
Swal.error(message, title?)
Swal.warning(message, title?)
Swal.info(message, title?)

// Confirmaciones
Swal.confirm(message, title?, options?)
Swal.deleteConfirm(itemName, message?)

// Loading
Swal.loading(message?)
Swal.closeLoading()

// Inputs
Swal.input(title, placeholder, type?, defaultValue?)

// Especiales del Sistema
Swal.productAdded(productName, quantity)
Swal.saleCompleted(saleNumber, total)

// Personalizado
Swal.custom(config)

// Alias para compatibilidad
Swal.toast.success(message)
Swal.toast.error(message)
Swal.toast.warning(message)
Swal.toast.info(message)
```

---

## 📖 Documentación Oficial

Para funciones avanzadas, consulta:
**https://sweetalert2.github.io/**

---

## ✨ Ventajas sobre las Notificaciones Nativas

| Característica | Nativas | SweetAlert2 |
|----------------|---------|-------------|
| **Diseño** | Feo y genérico | Hermoso y moderno |
| **Personalización** | Ninguna | Total |
| **Responsive** | Limitado | Completo |
| **Animaciones** | No | Sí |
| **HTML Personalizado** | No | Sí |
| **Timer Automático** | No | Sí |
| **Barra de Progreso** | No | Sí |
| **Iconos** | No | Sí |
| **Posicionamiento** | Centro fijo | Configurable |

---

## 🎓 Recomendaciones

1. **Usa notificaciones cortas** - El usuario no quiere leer mucho
2. **Sé específico** - "Producto eliminado" mejor que "Operación exitosa"
3. **Usa el tipo correcto**:
   - `success` ✅ para acciones completadas
   - `error` ❌ para fallos
   - `warning` ⚠️ para advertencias
   - `info` ℹ️ para información neutral
4. **Confirmaciones para acciones destructivas** - Siempre confirma eliminaciones
5. **Loading para operaciones largas** - Si tarda más de 1 segundo

---

**¡Ahora tu sistema tiene notificaciones profesionales!** 🎉
