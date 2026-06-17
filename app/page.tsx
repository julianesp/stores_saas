import Link from "next/link";
import {
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  ArrowRight,
  CreditCard,
  Store,
  TrendingUp,
  Bell,
  Gift,
  Smartphone,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import WhatsAppButton from "@/components/landing/WhatsAppButton";
import PricingPlans from "@/components/landing/PricingPlans";
import FreeMigration from "@/components/landing/FreeMigration";
import TrustBadges from "@/components/landing/TrustBadges";
import VideoTutorials from "@/components/landing/VideoTutorials";
import OvercomeResistance from "@/components/landing/OvercomeResistance";
import FAQ from "@/components/landing/FAQ";
import { landingConfig } from "@/lib/landing-config";

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-600 to-gray-200">
      {/* Header */}
      <header className="border-b  backdrop-blur-sm  top-0 z-50 fixed w-full rounded-e-4xl rounded-s-4xl shadow-2xl ">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold text-white">
            Posib.dev
          </h1>
        </div>
      </header>

      {/* WhatsApp Button */}
      <WhatsAppButton />

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-28 md:pt-36 pb-12 md:pb-20 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 md:mb-6">
          Gestión Completa para tu Tienda
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-white mb-6 md:mb-8 max-w-2xl mx-auto px-2">
          Sistema integral de punto de venta, inventario, facturación y tienda
          online. Todo lo que necesitas para administrar y hacer crecer tu
          negocio.
        </p>
        <div className="flex flex-row gap-3 md:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
          <Link href="/sign-in" className="flex-1 sm:flex-none">
            <Button
              size="lg"
              variant="ghost"
              className="text-base md:text-lg w-full sm:w-auto h-20 sm:h-auto py-4 bg-gray-800 cursor-pointer text-white hover:bg-white hover:text-gray-800 transition-colors hover:border hover:border-black"
            >
              Entrar
            </Button>
          </Link>
          <Link href="/sign-up" className="flex-1 sm:flex-none">
            <Button
              size="lg"
              className="text-base md:text-lg w-full sm:w-auto h-20 sm:h-auto py-4 cursor-pointer"
            >
              Registro <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Demo Videos Section */}
      <section className="bg-white/5 backdrop-blur-sm py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-4 text-white">
            Ve el Sistema en Acción
          </h3>
          <p className="text-center text-white mb-8 md:mb-12 max-w-2xl mx-auto">
            Videos cortos que muestran cómo usar las funcionalidades principales
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Video 1 - Punto de Venta */}
            <Card className="bg-gray-800/50 border-gray-600 overflow-hidden">
              <CardHeader className="p-4">
                <div className="aspect-video bg-gray-700 rounded-lg mb-3 overflow-hidden">
                  <iframe
                    className="w-full h-full rounded-lg"
                    src="https://www.youtube.com/embed/I6qJtQ1t2rQ"
                    title="Demo: Punto de Venta Rápido - Posib.dev"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <CardTitle className="text-lg text-white">
                  Punto de Venta Rápido
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Escanea productos, aplica descuentos y cobra en segundos
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Video 2 - Vender Producto */}
            <Card className="bg-gray-800/50 border-gray-600 overflow-hidden">
              <CardHeader className="p-4">
                <div className="aspect-video bg-gray-700 rounded-lg mb-3 overflow-hidden">
                  <iframe
                    className="w-full h-full rounded-lg"
                    src="https://www.youtube.com/embed/b-yYlIAqopM"
                    title="Demo: Vende un producto - Posib.dev"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <CardTitle className="text-lg text-white">
                  Vende un producto
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Lleva registro de tus ventas
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Video 3 - Tienda Online */}
            {/* <Card className="bg-gray-800/50 border-gray-600 overflow-hidden">
              <CardHeader className="p-4">
                <div className="aspect-video bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                  <Store className="h-12 w-12 text-gray-400" />
                  
                </div>
                <CardTitle className="text-lg text-white">
                  Tienda Online
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Vende en línea y recibe pedidos desde tu propia tienda web
                </CardDescription>
              </CardHeader>
            </Card> */}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <h3 className="text-2xl md:text-3xl font-bold text-center mb-3 text-white">
          Funcionalidades Principales
        </h3>
        <p className="text-center text-white/80 mb-8 md:mb-12 max-w-3xl mx-auto">
          Todo lo que necesitas para administrar tu tienda de manera profesional
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-2 hover:border-brand/80 transition-all hover:shadow-lg bg-gray-300">
            <CardHeader className="p-4 md:p-6">
              <ShoppingCart className="h-8 w-8 md:h-10 md:w-10 text-brand mb-2" />
              <CardTitle className="text-base md:text-lg">
                Punto de Venta
              </CardTitle>
              <CardDescription className="text-sm">
                Sistema POS rápido con escaneo de códigos de barras, múltiples
                métodos de pago y recibos de venta
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-green-400 transition-all hover:shadow-lg bg-gray-300">
            <CardHeader className="p-4 md:p-6">
              <Package className="h-8 w-8 md:h-10 md:w-10 text-green-600 mb-2" />
              <CardTitle className="text-base md:text-lg">
                Control de Inventario
              </CardTitle>
              <CardDescription className="text-sm">
                Gestión completa de productos, stock, proveedores, compras y
                alertas de inventario bajo
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-purple-400 transition-all hover:shadow-lg bg-gray-300">
            <CardHeader className="p-4 md:p-6">
              <BarChart3 className="h-8 w-8 md:h-10 md:w-10 text-purple-600 mb-2" />
              <CardTitle className="text-base md:text-lg">
                Reportes y Analytics
              </CardTitle>
              <CardDescription className="text-sm">
                Análisis de ventas, productos más vendidos, ganancias y reportes
                personalizados por período
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-orange-400 transition-all hover:shadow-lg bg-gray-300">
            <CardHeader className="p-4 md:p-6">
              <Users className="h-8 w-8 md:h-10 md:w-10 text-orange-600 mb-2" />
              <CardTitle className="text-base md:text-lg">
                Gestión de Clientes
              </CardTitle>
              <CardDescription className="text-sm">
                Base de datos de clientes, historial de compras, cuentas por
                cobrar y sistema de puntos de lealtad
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* More Features */}
      <section className="bg-white/5 backdrop-blur-sm py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-3 text-white">
            Funcionalidades Adicionales
          </h3>
          <p className="text-center text-white/80 mb-8 md:mb-12">
            Herramientas poderosas que hacen la diferencia
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center p-4">
              <div className="bg-gradient-to-br from-brand to-brand rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg">
                <Store className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
              <h4 className="font-semibold text-base md:text-lg mb-2 text-white">
                Tienda Online
              </h4>
              <p className="text-white/90 text-sm md:text-base px-2">
                Crea tu tienda web personalizada y vende 24/7. Los clientes
                pueden ver catálogo, añadir al carrito y pagar en línea
              </p>
            </div>

            <div className="text-center p-4">
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg">
                <Gift className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
              <h4 className="font-semibold text-base md:text-lg mb-2 text-white">
                Ofertas y Descuentos
              </h4>
              <p className="text-white/90 text-sm md:text-base px-2">
                Crea ofertas automáticas por fecha de vencimiento, descuentos
                por cantidad y promociones especiales
              </p>
            </div>

            <div className="text-center p-4">
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg">
                <Bell className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
              <h4 className="font-semibold text-base md:text-lg mb-2 text-white">
                Alertas Inteligentes
              </h4>
              <p className="text-white/90 text-sm md:text-base px-2">
                Notificaciones de stock bajo, productos por vencer y
                recordatorios de cuentas por cobrar
              </p>
            </div>

            <div className="text-center p-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg">
                <Users className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
              <h4 className="font-semibold text-base md:text-lg mb-2 text-white">
                Multi-Usuario
              </h4>
              <p className="text-white/90 text-sm md:text-base px-2">
                Roles diferenciados para administradores, cajeros y clientes con
                permisos personalizados
              </p>
            </div>

            <div className="text-center p-4">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg">
                <CreditCard className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
              <h4 className="font-semibold text-base md:text-lg mb-2 text-white">
                Múltiples Pagos
              </h4>
              <p className="text-white/90 text-sm md:text-base px-2">
                Acepta efectivo, tarjeta, transferencias y pagos en línea.
                Integración con Wompi y otros gateways
              </p>
            </div>

            <div className="text-center p-4">
              <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg">
                <Smartphone className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
              <h4 className="font-semibold text-base md:text-lg mb-2 text-white">
                100% Responsive
              </h4>
              <p className="text-white/90 text-sm md:text-base px-2">
                Funciona perfectamente en celular, tablet y computador.
                Administra desde cualquier dispositivo
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <h3 className="text-2xl md:text-3xl font-bold text-center mb-3 text-white">
          ¿Por qué elegir este sistema?
        </h3>
        <p className="text-center text-white/80 mb-8 md:mb-12">
          Ventajas que transformarán tu negocio
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="bg-gradient-to-br from-brand to-brand-hover border-0 text-white">
            <CardHeader className="p-6">
              <TrendingUp className="h-10 w-10 mb-3" />
              <CardTitle className="text-xl mb-2">Ahorra Tiempo</CardTitle>
              <CardDescription className="text-brand/40">
                Procesa ventas en segundos, genera reportes automáticos y
                automatiza tareas repetitivas
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0 text-white">
            <CardHeader className="p-6">
              <Package className="h-10 w-10 mb-3" />
              <CardTitle className="text-xl mb-2">Control Total</CardTitle>
              <CardDescription className="text-green-100">
                Sabe exactamente qué tienes en stock, qué debes comprar y qué
                productos te generan más ganancia
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 text-white">
            <CardHeader className="p-6">
              <Store className="h-10 w-10 mb-3" />
              <CardTitle className="text-xl mb-2">Vende Más</CardTitle>
              <CardDescription className="text-purple-100">
                Con tu tienda online activa 24/7, llegas a más clientes y
                aumentas tus ventas sin límites
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Pricing Plans */}
      <PricingPlans />

      {/* Free Migration */}
      {/* <FreeMigration /> */}

      {/* Trust & Social Proof */}
      {/* <TrustBadges /> */}

      {/* Overcome Resistance to Change */}
      <OvercomeResistance />

      {/* Video Tutorials */}
      {/* <VideoTutorials /> */}

      {/* FAQ */}
      <FAQ />

      {/* CTA */}
      <section className="container mx-auto px-4 py-12 md:py-20 text-center">
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-white">
          ¿Listo para Empezar?
        </h3>
        <p className="text-base sm:text-lg md:text-xl text-white mb-6 md:mb-8 px-2">
          Prueba gratis por 7 días. No requiere tarjeta de crédito.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
          <Link href="/sign-up" className="inline-block">
            <Button
              size="lg"
              className="text-base md:text-lg bg-white text-gray-900 hover:bg-gray-100"
            >
              Crear Cuenta Gratis{" "}
              <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </Link>
          {/* <a
            href={landingConfig.contact.calendly.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="lg"
              variant="outline"
              className="text-base md:text-lg bg-yellow-400 text-gray-900 hover:bg-yellow-500 border-yellow-400"
            >
              <Calendar className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              Agendar Demostración
            </Button>
          </a> */}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-800 py-6 md:py-8">
        <div className="container mx-auto px-4 text-center text-gray-300">
          <p className="text-sm md:text-base">
            posib.dev - Sistema POS para tu Negocio
          </p>
          <p className="text-xs md:text-sm text-gray-400 mt-2">
            Gestión profesional para tu negocio
          </p>
          <div className="mt-4 text-xs text-gray-500">
            <p>© 2026 posib.dev - Todos los derechos reservados</p>
          </div>
        </div>
      </footer>

      {/* Chat en Vivo con Tawk.to */}
      {/* <TawkToChat
        propertyId={landingConfig.contact.tawkTo.propertyId}
        widgetId={landingConfig.contact.tawkTo.widgetId}
      /> */}
    </div>
  );
}
