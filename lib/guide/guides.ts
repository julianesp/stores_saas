import {
  BarChart3,
  Brain,
  CreditCard,
  LayoutDashboard,
  Mail,
  Package,
  PiggyBank,
  Receipt,
  Scan,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Catálogo de la guía para tenderos nuevos: una guía por cada función del menú.
 *
 * - `steps[].target` es el valor de un atributo `data-guide="..."` puesto en la
 *   página. Si el elemento no está en pantalla (p. ej. la lista aún vacía), el
 *   paso se muestra igual y el botón "Mostrarme" avisa que no aparece todavía.
 * - `sceneId` reutiliza la demo animada del home (components/landing/
 *   process-showcase/scenes.tsx) como "video" de cómo se hace.
 * - El orden del arreglo es el orden sugerido para aprender.
 */

export interface GuideStep {
  title: string;
  text: string;
  target?: string;
  /** Qué hacer para que aparezca `target` si aún no está en pantalla. */
  missing?: string;
}

export interface Guide {
  id: string;
  title: string;
  summary: string;
  href: string;
  icon: LucideIcon;
  /** Si es true, solo aplica en la ruta exacta (para /dashboard). */
  exact?: boolean;
  sceneId?: string;
  steps: GuideStep[];
  tip?: string;
}

export const GUIDES: Guide[] = [
  {
    id: "inicio",
    title: "Tu panel de inicio",
    summary: "Cómo va tu tienda hoy y atajos a lo que más usas.",
    href: "/dashboard",
    exact: true,
    icon: LayoutDashboard,
    steps: [
      {
        title: "Atajos del día a día",
        text: "Desde aquí entras a vender, agregar productos, cobrar fiados o ver tus ventas con un solo toque.",
        target: "dash-shortcuts",
      },
      {
        title: "Ganancia de hoy",
        text: "Lo que de verdad te queda: lo vendido menos lo que te costó. Tócala para ver el detalle.",
        target: "dash-profit",
      },
      {
        title: "Números del día",
        text: "Ventas, órdenes y productos con poca cantidad. Se actualizan con cada venta.",
        target: "dash-stats",
      },
      {
        title: "Alertas",
        text: "Si algo se está acabando o está por vencer, aquí lo ves primero para pedirlo a tiempo.",
        target: "dash-alerts",
      },
    ],
  },
  {
    id: "productos",
    title: "Registrar productos",
    summary: "Crea tu catálogo con precio, código y cantidad.",
    href: "/dashboard/products",
    icon: Package,
    sceneId: "producto",
    steps: [
      {
        title: "Crea un producto",
        text: "Escribe el nombre, el precio de compra, el de venta y cuántos tienes. El código de barras es opcional.",
        target: "products-new",
      },
      {
        title: "Agrega rápido con la cámara",
        text: "Escanea el código de barras con el celular y completa solo lo básico. Ideal para cargar muchos de una vez.",
        target: "products-quick",
      },
      {
        title: "Busca por nombre o código",
        text: "Escribe parte del nombre o escanea el código para encontrar un producto y editarlo.",
        target: "products-search",
      },
      {
        title: "Mira lo agotado",
        text: "Este botón filtra los productos sin existencias para que sepas qué pedir.",
        target: "products-outofstock",
      },
      {
        title: "Ordena por categorías",
        text: "Agrupa tus productos (bebidas, aseo, granos) para encontrarlos más rápido al vender.",
        target: "products-categories",
      },
      {
        title: "Limpia los repetidos",
        text: "Si un producto quedó dos veces, aquí lo detectamos y te ayudamos a unirlo o renombrarlo.",
        target: "products-duplicates",
      },
    ],
    tip: "Si al vender escaneas algo que no está registrado, puedes crearlo ahí mismo sin salir de la venta.",
  },
  {
    id: "vender",
    title: "Vender",
    summary: "Escanea, cobra y el inventario se descuenta solo.",
    href: "/dashboard/pos",
    icon: ShoppingCart,
    sceneId: "venta",
    steps: [
      {
        title: "Agrega productos",
        text: "Usa el lector de códigos o la cámara del celular. Cada producto escaneado cae al carrito.",
        target: "pos-scan",
      },
      {
        title: "O búscalos por nombre",
        text: "Para lo que no tiene código (pan, huevos sueltos), búscalo aquí y tócalo.",
        target: "pos-search",
      },
      {
        title: "Revisa el carrito",
        text: "Cambia cantidades o quita productos antes de cobrar. El total se calcula solo.",
        target: "pos-cart",
      },
      {
        title: "Elige el cliente si vas a fiar",
        text: "Es opcional al pagar de contado. Para vender a crédito sí necesitas escoger el cliente.",
        target: "pos-customer",
      },
      {
        title: "Forma de pago",
        text: "Efectivo, Nequi o crédito. Con Nequi se muestra tu código QR para que el cliente pague.",
        target: "pos-payment",
        missing: "Agrega un producto al carrito y aparece.",
      },
      {
        title: "Cobra",
        text: "Toca Procesar Venta. Queda en tu historial y se descuenta del inventario.",
        target: "pos-checkout",
        missing: "Agrega un producto al carrito y aparece.",
      },
    ],
    tip: "Funciona sin internet: las ventas se guardan y se envían solas cuando vuelva la conexión.",
  },
  {
    id: "clientes",
    title: "Clientes",
    summary: "Guarda sus datos para fiarles y darles puntos.",
    href: "/dashboard/customers",
    icon: Users,
    steps: [
      {
        title: "Registra un cliente",
        text: "Nombre, teléfono y correo. Con el teléfono puedes recordarle una deuda por WhatsApp.",
        target: "customers-new",
      },
      {
        title: "Consulta su historial",
        text: "Abre un cliente para ver sus compras, sus puntos y el cupo de crédito que le das.",
        target: "customers-list",
      },
      {
        title: "Descarga la lista",
        text: "Exporta tus clientes a Excel cuando los necesites fuera del sistema.",
        target: "customers-export",
      },
    ],
  },
  {
    id: "fiados",
    title: "Fiados y abonos",
    summary: "Lleva las cuentas por cobrar sin cuaderno.",
    href: "/dashboard/debtors",
    icon: Receipt,
    sceneId: "fiado",
    steps: [
      {
        title: "Cuánto te deben",
        text: "La deuda total, cuántos clientes deben y el promedio. Se actualiza con cada fiado y cada abono.",
        target: "debtors-summary",
      },
      {
        title: "Encuentra al cliente",
        text: "Búscalo por nombre, teléfono o correo.",
        target: "debtors-search",
      },
      {
        title: "Recuérdale y registra abonos",
        text: "Envíale un recordatorio por WhatsApp. En Ver Detalle registras lo que te va pagando.",
        target: "debtors-list",
        missing: "Aparece cuando tengas tu primer fiado.",
      },
    ],
    tip: "Los fiados se crean desde Vender, eligiendo el cliente y la forma de pago Crédito.",
  },
  {
    id: "ventas",
    title: "Historial de ventas",
    summary: "Todo lo que has vendido, con su detalle y factura.",
    href: "/dashboard/sales",
    icon: BarChart3,
    steps: [
      {
        title: "Filtra por fecha",
        text: "Hoy, esta semana, este mes o un rango que tú escojas.",
        target: "sales-filters",
      },
      {
        title: "Totales del período",
        text: "Cuántas ventas hiciste, por cuánto y el promedio por venta.",
        target: "sales-summary",
      },
      {
        title: "Abre una venta",
        text: "Mira los productos que llevó, la factura o anúlala si fue un error.",
        target: "sales-list",
        missing: "Aparece cuando hagas tu primera venta.",
      },
      {
        title: "Exporta o importa",
        text: "Descarga tus ventas a Excel. Si venías de Siigo, puedes traer tus facturas anteriores.",
        target: "sales-export",
      },
    ],
  },
  {
    id: "inventario",
    title: "Inventario",
    summary: "Qué tienes, qué se acaba y qué se vence.",
    href: "/dashboard/inventory",
    icon: Scan,
    sceneId: "inventario",
    steps: [
      {
        title: "Tu bodega de un vistazo",
        text: "Cuántos productos tienes, cuánto vale lo que hay, qué se está acabando y qué está por vencer.",
        target: "inventory-stats",
      },
      {
        title: "Filtra lo urgente",
        text: "Marca cantidad baja o próximos a vencer para ver solo lo que necesita atención.",
        target: "inventory-filters",
      },
      {
        title: "Ajusta cantidades",
        text: "Si contaste y no cuadra, usa Ajustar Stock en el producto para corregirlo.",
        target: "inventory-list",
      },
    ],
  },
  {
    id: "rentabilidad",
    title: "Rentabilidad",
    summary: "Cuánto ganas de verdad con lo que vendes.",
    href: "/dashboard/rentabilidad",
    icon: PiggyBank,
    steps: [
      {
        title: "Hoy contra ayer",
        text: "Compara la ganancia de hoy con la de ayer para saber si vas mejor o peor.",
        target: "profit-today",
      },
      {
        title: "Elige el período",
        text: "Mira la ganancia de la semana, del mes o de otro rango.",
        target: "profit-period",
      },
      {
        title: "Ventas, costo y ganancia",
        text: "Lo que vendiste, lo que te costó y lo que te quedó en el período elegido.",
        target: "profit-totals",
      },
      {
        title: "Qué te deja más plata",
        text: "Tus productos ordenados por ganancia. Úsalo para decidir qué pedir más.",
        target: "profit-ranking",
      },
    ],
    tip: "Para que el cálculo sea correcto, cada producto necesita su precio de compra.",
  },
  {
    id: "configuracion",
    title: "Configuración",
    summary: "QR de pagos, avisos por Telegram, copias y puntos.",
    href: "/dashboard/config",
    icon: Settings,
    sceneId: "reporte",
    steps: [
      {
        title: "Tu QR de pagos",
        text: "Sube el QR de Nequi o de tu banco. Se muestra al cliente cuando cobras con Nequi.",
        target: "config-qr",
      },
      {
        title: "Avisos por Telegram",
        text: "Recibe en el celular el resumen del día y los productos por vencer.",
        target: "config-telegram",
      },
      {
        title: "Copia de seguridad",
        text: "Guarda tus ventas cada día en tu Google Drive, sin hacer nada.",
        target: "config-backup",
      },
      {
        title: "Puntos para tus clientes",
        text: "Activa el programa de puntos para premiar a los que más te compran.",
        target: "config-loyalty",
      },
    ],
  },
  {
    id: "tienda",
    title: "Tienda online",
    summary: "Vende por internet con tus mismos productos.",
    href: "/dashboard/store-config",
    icon: Store,
    sceneId: "tienda",
    steps: [
      {
        title: "Actívala",
        text: "Enciende la tienda para que tus clientes la vean en internet.",
        target: "store-status",
      },
      {
        title: "Nombre y dirección web",
        text: "Elige el nombre y la dirección que vas a compartir por WhatsApp.",
        target: "store-info",
      },
      {
        title: "Colores y fotos",
        text: "Ponle tus colores y las fotos que se ven al entrar.",
        target: "store-look",
      },
      {
        title: "Contacto y Nequi",
        text: "Tu WhatsApp y tu número de Nequi para que te paguen los pedidos.",
        target: "store-contact",
      },
      {
        title: "Entregas",
        text: "Define si haces domicilios, si el cliente recoge y cuánto cobras de envío.",
        target: "store-delivery",
      },
      {
        title: "Guarda y mira cómo quedó",
        text: "Guarda los cambios y abre la vista previa para verla como tu cliente.",
        target: "store-save",
      },
    ],
  },
  {
    id: "pedidos",
    title: "Pedidos web",
    summary: "Confirma los pedidos que llegan por la tienda online.",
    href: "/dashboard/web-orders",
    icon: ShoppingBag,
    sceneId: "tienda",
    steps: [
      {
        title: "Pedidos por estado",
        text: "Pendientes, completados y cancelados. Los pendientes son los que debes atender.",
        target: "orders-tabs",
      },
      {
        title: "Confirma el pago",
        text: "Revisa la referencia de Nequi y confirma. Ahí se descuenta el inventario y sale la factura.",
        target: "orders-actions",
        missing: "Aparece cuando llegue tu primer pedido.",
      },
    ],
  },
  {
    id: "emails",
    title: "Correos automáticos",
    summary: "Reporte diario y avisos de ofertas por correo.",
    href: "/dashboard/email-settings",
    icon: Mail,
    steps: [
      {
        title: "Reporte diario",
        text: "Recibe cada día un correo con lo que vendiste. Elige a qué hora te llega.",
        target: "email-daily",
      },
      {
        title: "Avisa tus ofertas",
        text: "Tus clientes con correo reciben un aviso cuando pones productos en oferta.",
        target: "email-offers",
      },
      {
        title: "Historial y estadísticas",
        text: "En estas pestañas ves qué correos salieron y cuántos se abrieron.",
        target: "email-tabs",
      },
    ],
  },
  {
    id: "ia",
    title: "Análisis con IA",
    summary: "Recomendaciones sobre qué vender y qué pedir.",
    href: "/dashboard/analytics",
    icon: Brain,
    steps: [
      {
        title: "Explora por temas",
        text: "Resumen, diagnóstico, clientes, tendencias e inventario. Cada pestaña responde una pregunta distinta.",
        target: "ai-tabs",
      },
    ],
    tip: "Entre más ventas registres, más útiles son las recomendaciones.",
  },
  {
    id: "suscripcion",
    title: "Tu plan",
    summary: "Estado de tu suscripción y cómo pagarla.",
    href: "/dashboard/subscription",
    icon: CreditCard,
    steps: [
      {
        title: "Tu plan",
        text: "Hasta cuándo está activo y qué incluye.",
        target: "sub-plan",
      },
      {
        title: "Cómo pagar",
        text: "Los medios de pago que puedes usar para renovar.",
        target: "sub-payments",
      },
      {
        title: "Complementos",
        text: "Activa la tienda online si quieres vender también por internet.",
        target: "sub-addons",
      },
    ],
  },
];

export function findGuideForPath(pathname: string | null): Guide | undefined {
  if (!pathname) return undefined;
  return GUIDES.find((g) =>
    g.exact ? pathname === g.href : pathname === g.href || pathname.startsWith(`${g.href}/`),
  );
}

export function getGuide(id: string): Guide | undefined {
  return GUIDES.find((g) => g.id === id);
}
