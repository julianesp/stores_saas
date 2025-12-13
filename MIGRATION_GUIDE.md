# Guía de Migración: Firebase → Cloudflare API

Esta guía muestra cómo actualizar el frontend de Next.js para usar la nueva API de Cloudflare en lugar de Firebase/Firestore.

## Cambios Principales

### 1. Imports

**ANTES (Firebase):**
```tsx
import { getAllDocuments, deleteDocument, createDocument, updateDocument } from '@/lib/firestore-helpers';
```

**DESPUÉS (Cloudflare):**
```tsx
import { getProducts, deleteProduct, createProduct, updateProduct } from '@/lib/cloudflare-api';
import { useAuth } from '@clerk/nextjs';
```

### 2. Obtener Token de Autenticación

Todos los componentes que llamen a la API necesitan obtener el token JWT de Clerk:

```tsx
export default function MiComponente() {
  const { getToken } = useAuth();

  // ... resto del código
}
```

### 3. Llamadas a la API

#### PRODUCTOS

**ANTES:**
```tsx
// Obtener todos los productos
const productsData = await getAllDocuments('products') as Product[];

// Obtener un producto
const product = await getDocumentById('products', id);

// Crear producto
await createDocument('products', productData);

// Actualizar producto
await updateDocument('products', id, updates);

// Eliminar producto
await deleteDocument('products', id);
```

**DESPUÉS:**
```tsx
// Obtener todos los productos
const productsData = await getProducts(getToken);

// Obtener un producto
const product = await getProductById(id, getToken);

// Crear producto
await createProduct(productData, getToken);

// Actualizar producto
await updateProduct(id, updates, getToken);

// Eliminar producto
await deleteProduct(id, getToken);
```

#### CLIENTES

**ANTES:**
```tsx
const customers = await getAllDocuments('customers');
await createDocument('customers', customerData);
await updateDocument('customers', id, updates);
await deleteDocument('customers', id);
```

**DESPUÉS:**
```tsx
const customers = await getCustomers(getToken);
await createCustomer(customerData, getToken);
await updateCustomer(id, updates, getToken);
await deleteCustomer(id, getToken);
```

#### CATEGORÍAS

**ANTES:**
```tsx
const categories = await getAllDocuments('categories');
await createDocument('categories', categoryData);
```

**DESPUÉS:**
```tsx
const categories = await getCategories(getToken);
await createCategory(categoryData, getToken);
```

#### VENTAS

**ANTES:**
```tsx
const sales = await getAllDocuments('sales');
const sale = await getDocumentById('sales', id);
await createDocument('sales', saleData);
```

**DESPUÉS:**
```tsx
const sales = await getSales(getToken);
const sale = await getSaleById(id, getToken);
await createSale(saleData, getToken);
```

---

## Ejemplo Completo: Actualizar página de Productos

### ANTES (products/page.tsx con Firebase):

```tsx
'use client';

import { useState, useEffect } from 'react';
import { getAllDocuments, deleteDocument } from '@/lib/firestore-helpers';
import { Product } from '@/lib/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const productsData = await getAllDocuments('products') as Product[];
      const categoriesData = await getAllDocuments('categories');

      // Combinar datos...
      setProducts(productsData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDocument('products', id);
    fetchProducts();
  };

  // ... resto del componente
}
```

### DESPUÉS (products/page.tsx con Cloudflare):

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { getProducts, getCategories, deleteProduct } from '@/lib/cloudflare-api';
import { Product } from '@/lib/types';

export default function ProductsPage() {
  const { getToken } = useAuth();  // ← NUEVO: Obtener token
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // ← CAMBIO: Pasar getToken a las funciones
      const productsData = await getProducts(getToken);
      const categoriesData = await getCategories(getToken);

      // Combinar datos... (mismo código)
      setProducts(productsData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    // ← CAMBIO: Usar deleteProduct con getToken
    await deleteProduct(id, getToken);
    fetchProducts();
  };

  // ... resto del componente (sin cambios)
}
```

---

## Archivos que Necesitan Actualización

Busca y reemplaza en estos archivos:

### 📁 Productos
- ✅ `app/dashboard/products/page.tsx`
- ✅ `app/dashboard/products/[id]/page.tsx`
- ✅ `app/dashboard/products/new/page.tsx`
- ✅ `app/dashboard/products/quick-add/page.tsx`

### 📁 Clientes
- ✅ `app/dashboard/customers/page.tsx`
- ✅ `app/dashboard/customers/[id]/page.tsx`

### 📁 Categorías
- ✅ `app/dashboard/categories/page.tsx`
- ✅ Componentes que usan CategoryManagerModal

### 📁 Ventas (POS)
- ✅ `app/dashboard/pos/page.tsx`
- ✅ `app/dashboard/sales/page.tsx`
- ✅ `app/dashboard/sales/[id]/page.tsx`

### 📁 Otros
- ✅ Cualquier componente que use `getAllDocuments`, `getDocumentById`, `createDocument`, `updateDocument`, o `deleteDocument`

---

## Verificación

Después de actualizar cada archivo:

1. ✅ Verifica que `useAuth` esté importado
2. ✅ Verifica que `getToken` se obtenga del hook
3. ✅ Verifica que todas las llamadas a la API pasen `getToken`
4. ✅ Prueba la funcionalidad en el navegador
5. ✅ Revisa la consola del navegador por errores

---

## Diferencias Importantes

### Aislamiento por Tenant
- **Firebase**: Requería filtrar manualmente por `user_profile_id`
- **Cloudflare**: Aislamiento automático - cada tenant solo ve sus datos

### IDs
- **Firebase**: IDs generados automáticamente (aleatorios)
- **Cloudflare**: IDs con prefijo (`prod_`, `cust_`, `cat_`)

### Timestamps
- **Firebase**: Objetos `Timestamp`
- **Cloudflare**: Strings ISO 8601 (`2025-12-11T20:00:00.000Z`)

---

## Manejo de Errores

La API de Cloudflare devuelve responses consistentes:

```tsx
try {
  const products = await getProducts(getToken);
  // products es directamente el array de productos
} catch (error) {
  // error.message contiene el mensaje de error
  console.error('Error:', error);
  Swal.error('Error al cargar productos', error.message);
}
```

---

## Próximos Pasos

1. **Actualiza un archivo a la vez** - Empieza con `products/page.tsx`
2. **Prueba cada cambio** antes de continuar
3. **Mantén Firebase** temporalmente hasta que todo funcione
4. **Una vez probado** elimina las imports de `firestore-helpers`

---

## ¿Necesitas Ayuda?

Si encuentras errores o algo no funciona:

1. Verifica que la API esté funcionando: `https://tienda-pos-api.julii1295.workers.dev/health`
2. Revisa que el token se esté obteniendo correctamente
3. Revisa la consola del navegador para mensajes de error
4. Verifica que `NEXT_PUBLIC_CLOUDFLARE_API_URL` esté en `.env.local`

**Variable de entorno requerida:**
```env
NEXT_PUBLIC_CLOUDFLARE_API_URL=https://tienda-pos-api.julii1295.workers.dev
```
