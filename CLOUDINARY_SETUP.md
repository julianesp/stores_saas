# 🚀 Configuración de Cloudinary - IMPORTANTE

## ⚠️ Paso OBLIGATORIO antes de usar imágenes

Debes crear un **Upload Preset** en Cloudinary para que las imágenes se puedan subir.

### 📝 Pasos para Configurar el Upload Preset

1. **Ir a Cloudinary Dashboard**

   - Ve a: https://console.cloudinary.com/
   - Inicia sesión con tu cuenta

2. **Ir a Settings (Configuración)**

   - Haz clic en el ícono de engranaje ⚙️ en la parte superior derecha
   - O ve directamente a: https://console.cloudinary.com/settings

3. **Ir a Upload Tab**

   - En el menú lateral, haz clic en **"Upload"**
   - Baja hasta la sección **"Upload presets"**

4. **Agregar Upload Preset**

   - Haz clic en **"Add upload preset"**
   - Configura los siguientes campos:

   ```
   Upload preset name: products
   Signing Mode: Unsigned (⚠️ MUY IMPORTANTE)
   Folder: products

   Opcional (recomendado):
   - Use filename: Yes
   - Unique filename: Yes
   - Overwrite: No
   - Allowed formats: jpg, png, webp
   ```

5. **Guardar**
   - Haz clic en **"Save"**
   - Verás el preset **"products"** en la lista

### ✅ Verificar que funcionó

Después de crear el preset:

1. Reinicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

2. Ve a **Productos → Nuevo Producto**
3. Intenta subir una imagen
4. Debería funcionar sin errores CORS

### 🔧 Configuración Actual

Las variables de entorno ya están configuradas:

- ✅ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tienda_pos
- ✅ NEXT_PUBLIC_CLOUDINARY_API_KEY=491334679817122
- ✅ CLOUDINARY_API_SECRET=N4JkKriorCBtFYE-7Copg2QLmXE

### 📦 Estructura de Carpetas en Cloudinary

Las imágenes se guardarán automáticamente en:

```
/products/
  ├── {productId}/
  │   ├── imagen1.jpg
  │   ├── imagen2.jpg
  │   └── imagen3.jpg
  └── temp/
      └── (imágenes temporales)
```

### 🎯 Ventajas de Cloudinary

- ✅ **25 GB de almacenamiento gratis**
- ✅ **Sin problemas de CORS**
- ✅ **CDN global automático** (carga rápida en todo el mundo)
- ✅ **Optimización automática** de imágenes (WebP, AVIF)
- ✅ **Transformaciones gratis** (resize, crop, filters)
- ✅ **No necesitas configurar reglas de seguridad**

### 🐛 Solución de Problemas

**Error: "Upload preset not found"**

- Verifica que creaste el preset con el nombre exacto: `products`
- Verifica que el modo sea **Unsigned**

**Error: "Unauthorized"**

- Verifica que las variables de entorno estén correctas
- Reinicia el servidor: `npm run dev`

**Las imágenes no se muestran**

- Verifica que la URL empiece con `https://res.cloudinary.com/`
- Verifica que next.config.ts tenga configurado el dominio de Cloudinary

### 📞 Soporte

Si tienes problemas:

1. Revisa la consola del navegador (F12)
2. Verifica que el preset se creó correctamente
3. Reinicia el servidor de desarrollo

---

**¡Listo! Una vez creado el preset, tus imágenes se subirán automáticamente a Cloudinary.**
