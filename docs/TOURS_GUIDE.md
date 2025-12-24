# 📚 Guía de Tours Interactivos

Este sistema proporciona tours guiados interactivos para ayudar a los usuarios nuevos a familiarizarse con la aplicación.

## 🎯 Características

- ✅ Tours automáticos para usuarios nuevos (primera vez)
- ✅ Botón de "Ayuda" para ver el tour cuando se desee
- ✅ Detección inteligente de usuarios que ya vieron el tour (usando localStorage)
- ✅ Diseño atractivo con gradientes y animaciones
- ✅ Totalmente responsive (móvil y desktop)
- ✅ Fácil de agregar a nuevas páginas

## 🚀 Tours Implementados

Actualmente los tours están implementados en:
- ✅ **Productos** (`/dashboard/products`)
- ✅ **Punto de Venta** (`/dashboard/pos`)

También hay configuraciones predefinidas para:
- Clientes
- Inventario
- Dashboard principal

## 📝 Cómo Agregar un Tour a una Nueva Página

### Paso 1: Configurar el Tour

Edita el archivo `/lib/tour-configs.ts` y agrega una nueva configuración:

```typescript
export const miPaginaTourConfig: TourConfig = {
  tourId: 'mi_pagina', // ID único para esta página
  steps: [
    {
      element: 'body', // O un selector CSS específico
      popover: {
        title: '¡Bienvenido! 🎉',
        description: 'Esta es la descripción de este paso del tour.',
        side: 'bottom', // Puede ser: top, bottom, left, right
        align: 'center', // Puede ser: start, center, end
      },
    },
    {
      element: 'button.mi-boton',
      popover: {
        title: 'Este es un botón importante',
        description: 'Aquí puedes hacer X cosa.',
        side: 'bottom',
        align: 'start',
      },
    },
    // ... más pasos
  ],
  config: {
    animate: true,
    overlayOpacity: 0.7,
    smoothScroll: true,
    allowClose: true,
    disableActiveInteraction: false,
  },
};
```

### Paso 2: Importar en tu Página

En tu componente de página (por ejemplo, `app/dashboard/mi-pagina/page.tsx`):

```typescript
import { useTour } from '@/hooks/useTour';
import { miPaginaTourConfig } from '@/lib/tour-configs';
import { HelpCircle } from 'lucide-react';

export default function MiPagina() {
  // Inicializar el tour
  const { startTour } = useTour(miPaginaTourConfig);

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1>Mi Página</h1>

        {/* Botón de Ayuda */}
        <Button
          variant="outline"
          size="sm"
          onClick={startTour}
          title="Ver guía interactiva"
        >
          <HelpCircle className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Ayuda</span>
        </Button>
      </div>

      {/* Resto del contenido */}
    </div>
  );
}
```

## 🎨 Personalización de Estilos

Los estilos del tour se encuentran en `/app/tour-styles.css`. Puedes personalizarlos según necesites.

### Temas disponibles

Puedes aplicar diferentes temas agregando clases al popover:

```typescript
config: {
  popoverClass: 'driver-theme-success', // Opciones: primary, success, warning, info
}
```

## 🔧 API del Hook `useTour`

```typescript
const { startTour, resetTour, hasSeenTour } = useTour(tourConfig, enabled);
```

### Parámetros

- `tourConfig` (requerido): Configuración del tour
- `enabled` (opcional): Si el tour está habilitado, por defecto `true`

### Retorna

- `startTour()`: Función para iniciar el tour manualmente
- `resetTour()`: Función para resetear el estado (útil para testing)
- `hasSeenTour`: Boolean que indica si el usuario ya vio el tour

## 📱 Responsive

Los tours están optimizados para funcionar en:
- 📱 Móviles (< 640px)
- 💻 Tablets (640px - 1024px)
- 🖥️ Desktop (> 1024px)

## 🎯 Selectores CSS Recomendados

Para seleccionar elementos en los tours:

```typescript
// ✅ Bueno - Selectores específicos
element: '[href="/dashboard/products/new"]'  // Links
element: 'button:has(svg.lucide-tag)'        // Botones con iconos
element: 'input[placeholder*="Buscar"]'      // Inputs
element: '.mb-6.pb-4.border-b'               // Clases CSS

// ❌ Evitar - Selectores genéricos
element: 'button'  // Demasiado genérico
element: 'div'     // Muy genérico
```

## 💡 Tips

1. **Orden lógico**: Organiza los pasos en el orden en que el usuario los usaría
2. **Textos claros**: Usa descripciones concisas y fáciles de entender
3. **Emojis**: Los emojis ayudan a hacer el tour más amigable 😊
4. **No sobrecargues**: 5-8 pasos son ideales, no hagas tours muy largos
5. **Testing**: Siempre prueba el tour en diferentes tamaños de pantalla

## 🔄 Resetear Tours (para testing)

Si necesitas resetear todos los tours:

```javascript
// En la consola del navegador
localStorage.clear();
// O específicamente:
localStorage.removeItem('tour_completed_products_page');
```

## 📚 Recursos

- [Driver.js Documentation](https://driverjs.com/)
- Librería usada: `driver.js`
- Almacenamiento: `localStorage`

## 🎉 ¡Listo!

Ahora puedes agregar tours guiados a cualquier página de la aplicación. Los usuarios nuevos verán automáticamente el tour la primera vez que visiten cada página, y siempre podrán volver a verlo haciendo clic en el botón "Ayuda".
