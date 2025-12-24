import { DriveStep } from 'driver.js';
import { TourConfig } from '@/hooks/useTour';

/**
 * Configuración del tour para la página de Productos
 */
export const productsTourConfig: TourConfig = {
  tourId: 'products_page',
  steps: [
    {
      element: 'body',
      popover: {
        title: '¡Bienvenido a la gestión de Productos! 🎉',
        description: 'Te guiaremos paso a paso para que conozcas todas las funcionalidades de esta sección. Haz clic en "Siguiente" para continuar.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: 'h1',
      popover: {
        title: 'Panel de Productos 📦',
        description: 'Desde aquí podrás gestionar todo tu inventario de productos de manera fácil y rápida.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[href="/dashboard/products/new"]',
      popover: {
        title: 'Agregar Nuevo Producto ➕',
        description: 'Usa este botón para crear un nuevo producto con todos sus detalles: nombre, precio, stock, categoría y más.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[href="/dashboard/products/quick-add"]',
      popover: {
        title: 'Agregar Producto Rápido 📸',
        description: 'Esta opción te permite agregar productos de forma rápida escaneando códigos de barras con tu cámara. ¡Ideal para agilizar el proceso!',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: 'button:has(svg.lucide-alert-triangle)',
      popover: {
        title: 'Ver Productos Agotados ⚠️',
        description: 'Haz clic aquí para filtrar y ver solo los productos que están agotados (sin stock). El número indica cuántos productos necesitan reabastecimiento.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: 'button:has(svg.lucide-tag)',
      popover: {
        title: 'Gestionar Categorías 🏷️',
        description: 'Organiza tus productos en categorías. Aquí podrás crear, editar y eliminar categorías para mantener tu inventario ordenado.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: 'input[placeholder*="Buscar"]',
      popover: {
        title: 'Búsqueda Rápida 🔍',
        description: 'Busca productos por nombre o código de barras. La búsqueda es instantánea y te ayudará a encontrar productos rápidamente.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '.mb-6.pb-4.border-b',
      popover: {
        title: 'Filtros por Categoría 📑',
        description: 'Filtra tus productos por categoría para ver solo los que necesitas. El número entre paréntesis indica cuántos productos hay en cada categoría.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: 'body',
      popover: {
        title: '¡Todo Listo! ✨',
        description: 'Ya conoces las funcionalidades principales de la gestión de productos. ¡Puedes volver a ver este tutorial desde el menú de ayuda cuando lo necesites!',
        side: 'bottom',
        align: 'center',
      },
    },
  ],
  config: {
    animate: true,
    overlayOpacity: 0.7,
    smoothScroll: true,
    allowClose: true,
    disableActiveInteraction: false,
  },
};

/**
 * Configuración del tour para la página de Ventas/POS
 */
export const posTourConfig: TourConfig = {
  tourId: 'pos_page',
  steps: [
    {
      element: 'body',
      popover: {
        title: '¡Bienvenido al Punto de Venta! 🛒',
        description: 'Te mostraremos cómo realizar ventas de forma rápida y eficiente. Este es el corazón de tu negocio.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: 'h1',
      popover: {
        title: 'Punto de Venta (POS) 💳',
        description: 'Desde aquí podrás registrar todas tus ventas de manera ágil y profesional.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: 'input[placeholder*="Buscar producto"]',
      popover: {
        title: 'Buscar Productos 🔍',
        description: 'Busca productos por nombre o código de barras para agregarlos al carrito de compra.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: 'input[placeholder*="código de barras"]',
      popover: {
        title: 'Escanear Código de Barras 📸',
        description: 'Escanea códigos de barras con tu cámara o lector para agregar productos rápidamente.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: 'body',
      popover: {
        title: '¡Listo para Vender! ✨',
        description: 'Ahora puedes comenzar a procesar ventas. Busca productos, agrégalos al carrito y completa la venta. ¡Éxito!',
        side: 'bottom',
        align: 'center',
      },
    },
  ],
  config: {
    animate: true,
    overlayOpacity: 0.7,
    smoothScroll: true,
    allowClose: true,
    disableActiveInteraction: false,
  },
};

/**
 * Configuración del tour para la página de Clientes
 */
export const customersTourConfig: TourConfig = {
  tourId: 'customers_page',
  steps: [
    {
      element: 'body',
      popover: {
        title: '¡Bienvenido a la gestión de Clientes! 👥',
        description: 'Aprende a gestionar tu base de clientes y sus datos de contacto.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: 'h1',
      popover: {
        title: 'Panel de Clientes 📇',
        description: 'Administra toda la información de tus clientes desde aquí.',
        side: 'bottom',
        align: 'start',
      },
    },
  ],
  config: {
    animate: true,
    overlayOpacity: 0.7,
    smoothScroll: true,
    allowClose: true,
    disableActiveInteraction: false,
  },
};

/**
 * Configuración del tour para la página de Inventario
 */
export const inventoryTourConfig: TourConfig = {
  tourId: 'inventory_page',
  steps: [
    {
      element: 'body',
      popover: {
        title: '¡Bienvenido al Inventario! 📊',
        description: 'Controla y registra todos los movimientos de tu inventario.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: 'h1',
      popover: {
        title: 'Control de Inventario 📈',
        description: 'Visualiza y gestiona los movimientos de entrada y salida de productos.',
        side: 'bottom',
        align: 'start',
      },
    },
  ],
  config: {
    animate: true,
    overlayOpacity: 0.7,
    smoothScroll: true,
    allowClose: true,
    disableActiveInteraction: false,
  },
};

/**
 * Configuración del tour para el Dashboard principal
 */
export const dashboardTourConfig: TourConfig = {
  tourId: 'dashboard_main',
  steps: [
    {
      element: 'body',
      popover: {
        title: '¡Bienvenido a tu Sistema POS! 🎊',
        description: 'Este es tu panel de control principal. Te mostraremos las funciones más importantes.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: 'h1',
      popover: {
        title: 'Panel de Control 📊',
        description: 'Aquí verás un resumen de las métricas más importantes de tu negocio: ventas, productos más vendidos, y más.',
        side: 'bottom',
        align: 'start',
      },
    },
  ],
  config: {
    animate: true,
    overlayOpacity: 0.7,
    smoothScroll: true,
    allowClose: true,
    disableActiveInteraction: false,
  },
};
