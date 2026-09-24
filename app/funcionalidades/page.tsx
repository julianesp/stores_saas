import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
  Package,
  HandCoins,
  BarChart3,
  Store,
  Bell,
  Users,
  Gift,
  CloudUpload,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Funcionalidades | posib.dev",
  description:
    "Todo lo que posib.dev hace por tu negocio: punto de venta, control de inventario, fiados, reportes, tienda online, alertas y más. Un solo sistema para tu tienda.",
};

const funciones = [
  {
    icon: ShoppingCart,
    titulo: "Punto de venta (POS)",
    texto:
      "Cobra rápido en efectivo, Nequi o a crédito. Escanea códigos de barras, aplica descuentos y genera el recibo de la venta en segundos.",
  },
  {
    icon: HandCoins,
    titulo: "Fiados (cuentas por cobrar)",
    texto:
      "Lleva el control de quién te debe, cuánto y desde cuándo. Registra abonos y ten siempre claro tu dinero en la calle, sin cuadernos.",
  },
  {
    icon: Package,
    titulo: "Control de inventario",
    texto:
      "Gestiona productos, stock y proveedores. Recibe alertas de inventario bajo para saber qué reponer antes de quedarte sin mercancía.",
  },
  {
    icon: BarChart3,
    titulo: "Reportes y estadísticas",
    texto:
      "Consulta cuánto vendiste, qué productos se mueven más y cuánto ganas. Toma decisiones con datos reales de tu negocio.",
  },
  {
    icon: Bell,
    titulo: "Alertas inteligentes",
    texto:
      "Avisos de stock bajo, productos próximos a vencer y recordatorios de cuentas por cobrar. Tu negocio te avisa lo importante.",
  },
  {
    icon: Users,
    titulo: "Gestión de clientes y lealtad",
    texto:
      "Guarda el historial de compras de tus clientes y premia su fidelidad con un programa de puntos para que vuelvan.",
  },
  {
    icon: Store,
    titulo: "Tienda online",
    texto:
      "Crea tu catálogo web para vender 24/7. Tus clientes ven los productos, arman su pedido y te llega por WhatsApp. (Complemento opcional.)",
  },
  {
    icon: CloudUpload,
    titulo: "Respaldo en la nube",
    texto:
      "Una copia de tus ventas se guarda automáticamente en tu Google Drive. Aunque cambies de teléfono, tu información está a salvo.",
  },
  {
    icon: Gift,
    titulo: "Ofertas y vencimientos",
    texto:
      "Crea promociones y ofertas automáticas para los productos próximos a vencer y evita perder mercancía.",
  },
];

export default function FuncionalidadesPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-600 to-gray-200">
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-white">Funcionalidades</h1>
          <p className="text-base text-white/85">
            Todo lo que necesitas para administrar y hacer crecer tu tienda, en un
            solo lugar.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {funciones.map(({ icon: Icon, titulo, texto }) => (
            <div
              key={titulo}
              className="flex flex-col rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5 border-t-4 border-brand"
            >
              <div className="mb-3 inline-flex w-fit rounded-full bg-brand-light p-3">
                <Icon className="h-6 w-6 text-brand" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{titulo}</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                {texto}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/sign-up" className="inline-block">
            <Button
              size="lg"
              className="bg-brand hover:bg-brand-hover text-white"
            >
              Probar gratis 30 días
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
