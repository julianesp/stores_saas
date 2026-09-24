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
import WhyPosib from "@/components/landing/WhyPosib";
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
    <div className="min-h-screen" style={{ background: "#0f1117" }}>
      {/* Header */}
      <NavbarRueda />

      {/* WhatsApp Button */}
      <WhatsAppButton />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Glow de fondo centrado */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,124,128,0.28) 0%, transparent 70%)",
          }}
        />
        <div className="container relative mx-auto px-4 pt-32 md:pt-44 pb-16 md:pb-24 text-center">
          {/* Etiqueta de confianza */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/60 mb-8 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            Sistema POS para tiendas colombianas
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-5 leading-[1.05]">
            Tu tienda,{" "}
            <span className="text-brand">bajo control</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/60 mb-10 max-w-xl mx-auto leading-relaxed px-2">
            Punto de venta, inventario, fiados y reportes — todo desde el celular que ya tienes. Sin cajas registradoras ni equipos costosos.
          </p>
          <div className="flex flex-row gap-3 justify-center">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="h-12 px-7 text-sm font-semibold bg-brand hover:bg-brand-hover text-white cursor-pointer shadow-lg shadow-brand/20"
              >
                Empezar gratis 30 días
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button
                size="lg"
                variant="ghost"
                className="h-12 px-7 text-sm font-medium text-white/70 hover:text-white hover:bg-white/8 cursor-pointer border border-white/10"
              >
                Ya tengo cuenta
              </Button>
            </Link>
          </div>

          {/* Social proof mínimo */}
          <p className="mt-8 text-xs text-white/35">
            Sin tarjeta de crédito · Cancela cuando quieras · Soporte en español
          </p>
        </div>
      </section>

      {/* Del caos al control */}
      <FadeInSection>
      <section className="border-t border-white/5">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12 md:mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-3">
              Para la tienda de barrio
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              Del cuaderno al control total
            </h2>
            <p className="text-base text-white/50 max-w-lg mx-auto">
              Mira cómo posib.dev transforma el día a día de tu negocio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
            <div className="group relative overflow-hidden rounded-2xl ring-1 ring-white/8 bg-white/3">
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src="https://pub-ea40242d92ce470fbb6e43d46f01cefe.r2.dev/images/homepage_1.jpg"
                  alt="Tendero abrumado entre montañas de ventas y recibos en papel"
                  fill
                  sizes="(max-width: 768px) 100vw, 480px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <span className="inline-block rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold px-3 py-1 mb-3">
                    Antes
                  </span>
                  <h3 className="text-xl font-bold text-white">
                    Papeles, cuadernos y cuentas perdidas
                  </h3>
                  <p className="text-sm text-white/70 mt-1">
                    Sin saber cuánto vendiste hoy ni cuánto te deben
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl ring-1 ring-brand/20 bg-white/3">
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src="https://pub-ea40242d92ce470fbb6e43d46f01cefe.r2.dev/images/homepage_2.jpg"
                  alt="Panel de control mostrando ventas y tendencias de la tienda"
                  fill
                  sizes="(max-width: 768px) 100vw, 480px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <span className="inline-block rounded-full bg-brand/20 border border-brand/30 text-brand text-xs font-semibold px-3 py-1 mb-3">
                    Con posib
                  </span>
                  <h3 className="text-xl font-bold text-white">
                    Ventas, inventario y fiados en tu celular
                  </h3>
                  <p className="text-sm text-white/70 mt-1">
                    La IA te muestra qué vender más y qué reponer
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link href="/sign-up">
              <Button size="lg" className="bg-brand hover:bg-brand-hover text-white cursor-pointer shadow-lg shadow-brand/20">
                Quiero verlo en mi tienda
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      </FadeInSection>

      {/* Por qué posib llega a cualquier tienda: sin equipos, fiados, reporte diario, respaldo en nube y referidos */}
      <FadeInSection>
        <WhyPosib />
      </FadeInSection>

      {/* Videos */}
      <FadeInSection>
      <section className="border-t border-white/5">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-3">
              Vélo en acción
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              El sistema en 2 minutos
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            <div className="rounded-2xl overflow-hidden ring-1 ring-white/8 bg-white/3">
              <div className="aspect-video">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/I6qJtQ1t2rQ"
                  title="Demo: Punto de Venta Rápido"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="p-4">
                <p className="font-semibold text-white text-sm">Punto de Venta Rápido</p>
                <p className="text-white/50 text-xs mt-0.5">Escanea, cobra y registra en segundos</p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden ring-1 ring-white/8 bg-white/3">
              <div className="aspect-video">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/b-yYlIAqopM"
                  title="Demo: Vende un producto"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="p-4">
                <p className="font-semibold text-white text-sm">Registra una venta</p>
                <p className="text-white/50 text-xs mt-0.5">Lleva el historial de cada transacción</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      </FadeInSection>

      {/* Funcionalidades principales — bento oscuro */}
      <FadeInSection>
      <section className="border-t border-white/5">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-3">
              Todo en uno
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              Funcionalidades principales
            </h2>
            <p className="text-white/50 mt-3 max-w-lg mx-auto text-sm">
              Todo lo que necesitas para administrar tu tienda de manera profesional
            </p>
          </div>

          {/* Bento 2×2 grande + items listados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-5xl mx-auto mb-6">
            {[
              {
                icon: ShoppingCart,
                title: "Punto de Venta",
                desc: "POS rápido con escaneo de código de barras, múltiples métodos de pago y recibos digitales.",
                accent: true,
              },
              {
                icon: Package,
                title: "Control de Inventario",
                desc: "Stock en tiempo real, alertas de agotamiento y control de vencimientos.",
                accent: false,
              },
              {
                icon: BarChart3,
                title: "Reportes y Ganancias",
                desc: "Ventas del día, productos más rentables y comparativos por período.",
                accent: false,
              },
              {
                icon: Users,
                title: "Gestión de Clientes",
                desc: "Historial de compras, cuentas por cobrar (fiados) y puntos de lealtad.",
                accent: false,
              },
            ].map(({ icon: Icon, title, desc, accent }) => (
              <div
                key={title}
                className={`group rounded-2xl p-6 ring-1 transition-all duration-200 hover:ring-brand/40 ${
                  accent
                    ? "bg-brand/10 ring-brand/20"
                    : "bg-white/3 ring-white/8"
                }`}
              >
                <div className={`inline-flex rounded-xl p-2.5 mb-4 ${accent ? "bg-brand/20" : "bg-white/6"}`}>
                  <Icon className={`h-5 w-5 ${accent ? "text-brand" : "text-white/60"}`} />
                </div>
                <h3 className="font-semibold text-white mb-1.5">{title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Features secundarias en fila compacta */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-5xl mx-auto">
            {[
              { icon: Gift, label: "Ofertas y descuentos" },
              { icon: Bell, label: "Alertas de stock y vencimientos" },
              { icon: Users, label: "Multi-usuario con roles" },
              { icon: CreditCard, label: "Efectivo, Nequi y crédito" },
              { icon: Smartphone, label: "Celular, tablet y PC" },
              { icon: TrendingUp, label: "Reportes diarios automáticos" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl bg-white/3 px-4 py-3 ring-1 ring-white/6"
              >
                <Icon className="h-4 w-4 text-brand shrink-0" />
                <span className="text-sm text-white/70">{label}</span>
              </div>
            ))}
          </div>
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

      {/* CTA final */}
      <FadeInSection>
      <section className="border-t border-white/5">
        <div className="container mx-auto px-4 py-20 md:py-28 text-center">
          {/* Glow tenue detrás del bloque */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 -translate-x-1/2"
            style={{
              width: "600px",
              height: "300px",
              background:
                "radial-gradient(ellipse, rgba(0,124,128,0.18) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <p className="relative text-xs font-semibold uppercase tracking-widest text-brand mb-4">
            Empieza hoy
          </p>
          <h2 className="relative text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Tu tienda, bajo control
          </h2>
          <p className="relative text-base text-white/50 max-w-md mx-auto mb-10">
            30 días gratis sin tarjeta. Configura en minutos y empieza a vender hoy mismo.
          </p>
          <div className="relative flex flex-row gap-3 justify-center">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="h-12 px-8 text-sm font-semibold bg-brand hover:bg-brand-hover text-white cursor-pointer shadow-xl shadow-brand/25"
              >
                Crear cuenta gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button
                size="lg"
                variant="ghost"
                className="h-12 px-7 text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 cursor-pointer border border-white/10"
              >
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
          <p className="relative mt-6 text-xs text-white/30">
            Sin tarjeta de crédito · Cancela cuando quieras · Soporte en español
          </p>
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
