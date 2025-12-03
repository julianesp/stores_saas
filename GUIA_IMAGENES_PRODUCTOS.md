# 📸 Guía: Agregar Imágenes a los Productos

## 🎯 Funcionalidad Implementada

Ahora puedes agregar **hasta 3 imágenes** por cada producto en tu inventario. Las imágenes se suben automáticamente a Firebase Storage y se muestran en toda la aplicación.

---

## ✨ Características

- ✅ **Hasta 3 imágenes por producto**
- ✅ **Vista previa en tiempo real** mientras subes
- ✅ **Validación automática**: solo imágenes JPG, PNG, WEBP
- ✅ **Límite de tamaño**: máximo 5MB por imagen
- ✅ **Eliminación individual** de imágenes
- ✅ **Optimizado para móviles y escritorio**
- ✅ **Las imágenes se guardan en Firebase Storage** (seguras y escalables)

---

## 🚀 Cómo Agregar Imágenes a un Producto

### **Método 1: Al Crear un Producto Nuevo**

1. Ve a **Dashboard** → **Productos** → **Nuevo Producto**
2. Llena la información básica del producto
3. Baja hasta la sección **"Imágenes del Producto"**
4. Haz clic en el botón **"Agregar Imágenes"**
5. Selecciona hasta 3 imágenes desde tu dispositivo
6. Espera a que se suban (verás un indicador de carga)
7. Guarda el producto

### **Método 2: Al Editar un Producto Existente**

1. Ve a **Dashboard** → **Productos**
2. Haz clic en el icono de **editar (✏️)** del producto
3. Baja hasta la sección **"Imágenes del Producto"**
4. Agrega, elimina o reemplaza imágenes
5. Guarda los cambios

### **Método 3: Productos Creados con Escaneo Rápido**

Cuando usas el **Agregar Rápido** (escáner de códigos):

1. Escanea el producto con la cámara
2. El producto se crea sin imágenes (normal)
3. Haz clic en **"Completar"** en el producto escaneado
4. Se abre el formulario de edición
5. Agrega las imágenes en la sección correspondiente
6. Guarda

---

## 📋 Dónde se Muestran las Imágenes

Las imágenes aparecen automáticamente en:

1. **Lista de Productos** (`/dashboard/products`)
   - Miniatura de la primera imagen (48x48px)
   - Si no hay imagen, muestra un icono de producto

2. **Formulario de Edición** (`/dashboard/products/[id]`)
   - Vista de las 3 imágenes con opciones para agregar/eliminar
   - Vista previa grande de cada imagen

3. **Punto de Venta (POS)** - *Próximamente*
   - La imagen aparecerá en el carrito de compras

4. **Reportes e Inventario** - *Próximamente*
   - Integración visual en reportes

---

## 💡 Consejos para Mejores Imágenes

### **Calidad de las Fotos**

- ✅ **Buena iluminación**: Toma fotos con luz natural o buena iluminación
- ✅ **Fondo neutro**: Fondos blancos o lisos resaltan el producto
- ✅ **Enfoque nítido**: Asegúrate de que la imagen esté enfocada
- ✅ **Ángulos múltiples**: Usa las 3 imágenes para mostrar diferentes ángulos

### **Orden de las Imágenes**

La primera imagen que subas será la que se muestre en la lista de productos, así que:
1. **Primera imagen**: Vista frontal o principal del producto
2. **Segunda imagen**: Vista lateral o detalles importantes
3. **Tercera imagen**: Etiqueta con información nutricional, ingredientes, etc.

### **Tamaño Recomendado**

- **Resolución ideal**: 800x800px o 1000x1000px
- **Peso**: Entre 200KB y 2MB (no uses imágenes muy pesadas)
- **Formato**: JPG para fotos normales, PNG si necesitas transparencia

---

## 🔧 Gestión de Imágenes

### **Agregar Múltiples Imágenes**

Puedes seleccionar varias imágenes a la vez:
- En el diálogo de selección, mantén presionado `Ctrl` (Windows/Linux) o `Cmd` (Mac)
- Haz clic en cada imagen que quieras subir
- O selecciona desde tu móvil la opción de múltiples fotos

### **Eliminar una Imagen**

1. Pasa el mouse sobre la imagen (en escritorio)
2. Aparecerá un botón rojo **X** en la esquina superior derecha
3. Haz clic para eliminar
4. La imagen se elimina de Firebase Storage automáticamente

### **Reemplazar Imágenes**

1. Elimina la imagen que quieres reemplazar
2. Agrega la nueva imagen en su lugar

---

## 📱 Desde el Celular

La funcionalidad está **100% optimizada para móviles**:

- ✅ Puedes tomar fotos directamente con la cámara
- ✅ O seleccionar de la galería
- ✅ La interfaz se adapta al tamaño de pantalla
- ✅ Las subidas funcionan perfectamente en 3G/4G/WiFi

### **Cómo Tomar Fotos con el Celular**

1. En el formulario de producto, toca **"Agregar Imágenes"**
2. El celular te preguntará: **"Cámara"** o **"Galería"**
3. Si eliges **Cámara**: toma la foto y confírmala
4. Si eliges **Galería**: selecciona fotos existentes
5. La imagen se sube automáticamente

---

## 🛡️ Seguridad

Las reglas de Firebase Storage están configuradas para:

- ✅ **Lectura pública**: Cualquiera puede ver las imágenes de productos
- ✅ **Escritura autenticada**: Solo usuarios logueados pueden subir
- ✅ **Validación de tipo**: Solo archivos de imagen
- ✅ **Límite de tamaño**: Máximo 5MB por imagen
- ✅ **Protección contra abuso**: Solo en la carpeta `/products/`

---

## 🗂️ Estructura en Firebase Storage

Las imágenes se guardan con esta estructura:

```
/products/
  ├── {productId}/
  │   ├── 1234567890_abc123_imagen1.jpg
  │   ├── 1234567891_def456_imagen2.jpg
  │   └── 1234567892_ghi789_imagen3.jpg
  └── temp/
      └── (imágenes temporales de productos nuevos)
```

Cada nombre de archivo incluye:
- **Timestamp**: Momento exacto de la subida
- **String aleatorio**: Para evitar duplicados
- **Nombre original**: El nombre del archivo que subiste

---

## ⚙️ Configuración de Firebase Storage

Para que las imágenes funcionen, **debes desplegar las reglas de Storage** a Firebase:

### **Paso 1: Instalar Firebase CLI** (si no lo tienes)
```bash
npm install -g firebase-tools
```

### **Paso 2: Login en Firebase**
```bash
firebase login
```

### **Paso 3: Inicializar (si no está inicializado)**
```bash
firebase init storage
```

### **Paso 4: Desplegar las reglas**
```bash
firebase deploy --only storage
```

Esto sube el archivo `storage.rules` a tu proyecto de Firebase.

---

## 🔍 Verificar que Funciona

### **Test Rápido:**

1. Ve a **Firebase Console** → Tu proyecto
2. Abre **Storage** en el menú lateral
3. Deberías ver las reglas activas
4. Crea un producto y sube una imagen
5. En Storage verás la carpeta `/products/{id}/`
6. Verifica que la imagen aparece en la lista de productos

---

## 🐛 Solución de Problemas

### **"Error al subir imágenes"**

**Causas posibles:**
1. **No estás autenticado**: Cierra sesión y vuelve a entrar
2. **Reglas no desplegadas**: Ejecuta `firebase deploy --only storage`
3. **Storage no habilitado**: Ve a Firebase Console → Storage → "Comenzar"
4. **Archivo muy grande**: Verifica que sea menor a 5MB
5. **Formato inválido**: Solo JPG, PNG, WEBP permitidos

### **"La imagen no se muestra"**

1. Verifica que la URL se guardó en Firestore (campo `images`)
2. Revisa las reglas de lectura en Firebase Storage
3. Asegúrate de que la imagen realmente se subió a Storage

### **"No puedo eliminar una imagen"**

1. Verifica que estés autenticado
2. Recarga la página e intenta de nuevo
3. Revisa las reglas de delete en `storage.rules`

---

## 📊 Impacto en el Proyecto

### **Archivos Modificados:**

1. `lib/types.ts` - Agregado campo `images?: string[]`
2. `lib/firebase.ts` - Configurado Firebase Storage
3. `components/products/image-uploader.tsx` - Nuevo componente
4. `components/products/product-form.tsx` - Integrado ImageUploader
5. `app/dashboard/products/page.tsx` - Columna de imágenes en tabla
6. `app/dashboard/products/quick-add/page.tsx` - Array vacío de imágenes
7. `storage.rules` - Reglas de seguridad (nuevo archivo)

### **Base de Datos:**

Los productos ahora tienen:
```typescript
{
  id: string;
  name: string;
  // ... otros campos
  images?: string[]; // ← NUEVO: Array de URLs
}
```

---

## 🎓 Flujo Recomendado para Inventario Inicial

Si tienes muchos productos sin imágenes:

### **Semana 1: Agregar Productos Básicos**
- Usa el escáner rápido para crear todos los productos
- No te preocupes por las imágenes todavía

### **Semana 2: Agregar Imágenes**
- Dedica tiempo a tomar fotos de los productos más importantes
- Empieza por los productos más vendidos
- Agrega al menos 1 imagen a cada uno

### **Semana 3: Completar**
- Agrega las 3 imágenes a productos clave
- Productos menos importantes pueden tener solo 1 imagen

---

## 📞 Soporte

Si encuentras problemas:
1. Verifica esta guía
2. Revisa la consola del navegador (F12) para errores
3. Verifica Firebase Console → Storage
4. Contacta a soporte técnico

---

## 🔄 Próximas Mejoras

Funcionalidades planeadas:
- 🔜 Mostrar imágenes en el POS
- 🔜 Galería expandible al hacer clic en una imagen
- 🔜 Edición de imágenes (recortar, rotar)
- 🔜 Compresión automática de imágenes grandes
- 🔜 Importación masiva de imágenes

---

**¡Listo! 🎉 Ahora tus productos tendrán un aspecto mucho más profesional con imágenes.**
