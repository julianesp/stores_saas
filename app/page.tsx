import Link from "next/link";
import Image from "next/image";
import {
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  ArrowRight,
  CreditCard,
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
import NavbarRueda from "@/components/landing/NavbarRueda";
import FadeInSection from "@/components/landing/FadeInSection";
import WhatsAppButton from "@/components/landing/WhatsAppButton";
import PricingPlans from "@/components/landing/PricingPlans";
import FreeMigration from "@/components/landing/FreeMigration";
import TrustBadges from "@/components/landing/TrustBadges";
import VideoTutorials from "@/components/landing/VideoTutorials";
import OvercomeResistance from "@/components/landing/OvercomeResistance";
import ClientStores from "@/components/landing/ClientStores";
import PosReviews from "@/components/landing/PosReviews";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import { landingConfig } from "@/lib/landing-config";

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-600 to-gray-200">
      {/* Header */}
      <NavbarRueda />

      {/* WhatsApp Button */}
      <WhatsAppButton />

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-28 md:pt-36 pb-12 md:pb-20 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 md:mb-6">
          Gestión Completa para tu Tienda
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-white mb-6 md:mb-8 max-w-2xl mx-auto px-2">
          Sistema integral de punto de venta, inventario, facturación y gestión
          de clientes. Todo lo que necesitas para administrar y hacer crecer tu
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

      {/* Del caos al control - Storytelling con imágenes */}
      <FadeInSection>
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-10 md:mb-14">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
            De las montañas de papeles a tener el control
          </h3>
          <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto">
            Mira cómo posib.dev transforma el día a día de tu negocio. ¿Te
            identificas con alguna de estas escenas?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 max-w-5xl mx-auto">
          {/* Imagen 1 - El caos */}
          <div className="group flex flex-col items-center text-center">
            <div className="relative w-full max-w-sm aspect-[3/5] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-[1.02]">
              <Image
                src="https://pub-ea40242d92ce470fbb6e43d46f01cefe.r2.dev/images/homepage_1.jpg"
                alt="Tendero abrumado entre montañas de ventas y recibos en papel"
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-cover"
              />
            </div>
            <h4 className="mt-5 text-xl md:text-2xl font-bold text-white">
              ¿Tus cuentas viven en papeles y cuadernos?
            </h4>
            <p className="mt-2 text-sm md:text-base text-white/85 max-w-sm">
              Olvídate de buscar entre recibos y libretas. Registra cada venta
              en segundos y ten todo ordenado en un solo lugar.{" "}
              <span className="font-semibold text-white">
                Descubre lo fácil que es.
              </span>
            </p>
          </div>

          {/* Imagen 2 - El control con IA */}
          <div className="group flex flex-col items-center text-center">
            <div className="relative w-full max-w-sm aspect-[3/5] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-[1.02]">
              <Image
                src="https://pub-ea40242d92ce470fbb6e43d46f01cefe.r2.dev/images/homepage_2.jpg"
                alt="Panel de inteligencia artificial mostrando productos y tendencias de la tienda"
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-cover"
              />
            </div>
            <h4 className="mt-5 text-xl md:text-2xl font-bold text-white">
              Conoce tu tienda y vende lo que tus clientes buscan
            </h4>
            <p className="mt-2 text-sm md:text-base text-white/85 max-w-sm">
              La inteligencia artificial te muestra qué se vende más, qué
              reponer y cómo crecer.{" "}
              <span className="font-semibold text-white">
                Mira cómo funciona en tu negocio.
              </span>
            </p>
          </div>
        </div>

        <div className="text-center mt-10 md:mt-12">
          <Link href="/sign-up" className="inline-block">
            <Button size="lg" className="text-base md:text-lg cursor-pointer">
              Quiero verlo en mi tienda{" "}
              <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </Link>
        </div>
      </section>
      </FadeInSection>

      {/* Demo Videos Section */}
      <FadeInSection>
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
                    title="Demo: Punto de Venta Rápido - posib.dev"
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
                    title="Demo: Vende un producto - posib.dev"
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
      </FadeInSection>

      {/* Features */}
      <FadeInSection>
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

          <Card className="border-2 hover:border-brand/80 transition-all hover:shadow-lg bg-gray-300">
            <CardHeader className="p-4 md:p-6">
              <Package className="h-8 w-8 md:h-10 md:w-10 text-brand mb-2" />
              <CardTitle className="text-base md:text-lg">
                Control de Inventario
              </CardTitle>
              <CardDescription className="text-sm">
                Gestión completa de productos, stock, proveedores, compras y
                alertas de inventario bajo
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-brand/80 transition-all hover:shadow-lg bg-gray-300">
            <CardHeader className="p-4 md:p-6">
              <BarChart3 className="h-8 w-8 md:h-10 md:w-10 text-brand mb-2" />
              <CardTitle className="text-base md:text-lg">
                Reportes y Analytics
              </CardTitle>
              <CardDescription className="text-sm">
                Análisis de ventas, productos más vendidos, ganancias y reportes
                personalizados por período
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-brand/80 transition-all hover:shadow-lg bg-gray-300">
            <CardHeader className="p-4 md:p-6">
              <Users className="h-8 w-8 md:h-10 md:w-10 text-brand mb-2" />
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
      </FadeInSection>

      {/* More Features */}
      <FadeInSection>
      <section className="bg-white/5 backdrop-blur-sm py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-3 text-white">
            Funcionalidades Adicionales
          </h3>
          <p className="text-center text-white/80 mb-8 md:mb-12">
            Herramientas poderosas que hacen la diferencia
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {/* <div className="text-center p-4">
              <div className="bg-gradient-to-br from-brand to-brand-hover rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg">
                <Store className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
              <h4 className="font-semibold text-base md:text-lg mb-2 text-white">
                Tienda Online
              </h4>
              <p className="text-white/90 text-sm md:text-base px-2">
                Crea tu tienda web personalizada y vende 24/7. Los clientes
                pueden ver catálogo, añadir al carrito y pagar en línea
              </p>
            </div> */}

            <div className="text-center p-4">
              <div className="bg-gradient-to-br from-brand to-brand-hover rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg">
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
              <div className="bg-gradient-to-br from-brand to-brand-hover rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg">
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
              <div className="bg-gradient-to-br from-brand to-brand-hover rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg">
                <Users className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
              <h4 className="font-semibold text-base md:text-lg mb-2 text-white">
                Multi-Usuario
              </h4>
              <p className="text-white/90 text-sm md:text-base px-2">
                Roles diferenciados para administradores y cajeros con permisos
                personalizados
              </p>
            </div>

            <div className="text-center p-4">
              <div className="bg-gradient-to-br from-brand to-brand-hover rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg">
                <CreditCard className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
              <h4 className="font-semibold text-base md:text-lg mb-2 text-white">
                Múltiples Pagos
              </h4>
              <p className="text-white/90 text-sm md:text-base px-2">
                Registra ventas en efectivo, Nequi y crédito a clientes, con
                control de cuentas por cobrar
              </p>
            </div>

            <div className="text-center p-4">
              <div className="bg-gradient-to-br from-brand to-brand-hover rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg">
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
      </FadeInSection>

      {/* Benefits */}
      <FadeInSection>
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
              <CardDescription className="text-white/80">
                Procesa ventas en segundos, genera reportes automáticos y
                automatiza tareas repetitivas
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-brand to-brand-hover border-0 text-white">
            <CardHeader className="p-6">
              <Package className="h-10 w-10 mb-3" />
              <CardTitle className="text-xl mb-2">Control Total</CardTitle>
              <CardDescription className="text-white/80">
                Sabe exactamente qué tienes en stock, qué debes comprar y qué
                productos te generan más ganancia
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-brand to-brand-hover border-0 text-white">
            <CardHeader className="p-6">
              <Users className="h-10 w-10 mb-3" />
              <CardTitle className="text-xl mb-2">Fideliza Clientes</CardTitle>
              <CardDescription className="text-white/80">
                Lleva el historial de compras, ventas a crédito y puntos de
                lealtad para que tus clientes vuelvan
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
      </FadeInSection>

      {/* Tiendas Clientes */}
      <FadeInSection>
        <ClientStores />
      </FadeInSection>

      {/* Reseñas del sistema POS */}
      <FadeInSection>
        <div id="resenas" className="scroll-mt-24">
          <PosReviews />
        </div>
      </FadeInSection>

      {/* Pricing Plans */}
      <FadeInSection>
        <div id="precios" className="scroll-mt-24">
          <PricingPlans />
        </div>
      </FadeInSection>

      {/* Free Migration */}
      {/* <FreeMigration /> */}

      {/* Trust & Social Proof */}
      {/* <TrustBadges /> */}

      {/* Overcome Resistance to Change */}
      <FadeInSection>
        <OvercomeResistance />
      </FadeInSection>

      {/* Video Tutorials */}
      {/* <VideoTutorials /> */}

      {/* FAQ */}
      <FadeInSection>
        <div id="faq" className="scroll-mt-24">
          <FAQ />
        </div>
      </FadeInSection>

      {/* CTA */}
      <FadeInSection>
      <section className="container mx-auto px-4 py-12 md:py-20 text-center">
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-white">
          ¿Listo para Empezar?
        </h3>
        <p className="text-base sm:text-lg md:text-xl text-white mb-6 md:mb-8 px-2">
          Prueba gratis por 15 días. No requiere tarjeta de crédito.
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
      </FadeInSection>

      {/* Footer */}
      <Footer />

      {/* Chat en Vivo con Tawk.to */}
      {/* <TawkToChat
        propertyId={landingConfig.contact.tawkTo.propertyId}
        widgetId={landingConfig.contact.tawkTo.widgetId}
      /> */}
    </div>
  );
}
