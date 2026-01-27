"use client";

import { Check, Sparkles, Store, Mail, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const basePlan = {
  name: "Plan Básico",
  price: "$24.900",
  priceValue: 24900,
  description: "Todo lo esencial para gestionar tu negocio",
  features: [
    "Punto de Venta (POS)",
    "Gestión de inventario completa",
    "Hasta 100 productos",
    "Gestión de clientes y proveedores",
    "Reportes y estadísticas básicas",
    "Sistema de créditos y deudores",
    "Ofertas y promociones",
    "Soporte técnico por email",
  ],
};

const addons = [
  {
    name: "Análisis con IA",
    price: "$4.900",
    priceValue: 4900,
    icon: Sparkles,
    color: "purple",
    description: "Predicciones y análisis inteligentes",
    features: [
      "Predicciones de ventas automáticas",
      "Análisis de tendencias y patrones",
      "Recomendaciones de inventario inteligentes",
      "Alertas automáticas",
      "Detección de anomalías en ventas",
    ],
  },
  {
    name: "Tienda Online",
    price: "$9.900",
    priceValue: 9900,
    icon: Store,
    color: "blue",
    description: "Vende en línea 24/7",
    features: [
      "Tienda online personalizable",
      "Carrito de compras completo",
      "Pedidos online en tiempo real",
      "Integración con Wompi (pagos)",
      "Zonas de envío configurables",
      "Integración con WhatsApp",
      "Sincronización automática de inventario",
    ],
    popular: true,
  },
  {
    name: "Email Marketing",
    price: "$4.900",
    priceValue: 4900,
    icon: Mail,
    color: "green",
    description: "Automatiza tu comunicación con clientes",
    features: [
      "Carritos abandonados (3 emails automáticos)",
      "Reportes diarios por email",
      "Alertas de stock para clientes",
      "Campañas personalizadas",
      "Segmentación de clientes",
      "Analytics de emails enviados",
    ],
  },
];

const getColorClasses = (color: string) => {
  const colors: Record<string, { border: string; bg: string; accent: string }> =
    {
      purple: {
        border: "border-purple-400",
        bg: "bg-purple-500/10",
        accent: "text-purple-400",
      },
      blue: {
        border: "border-blue-400",
        bg: "bg-blue-500/10",
        accent: "text-blue-400",
      },
      green: {
        border: "border-green-400",
        bg: "bg-green-500/10",
        accent: "text-green-400",
      },
    };
  return colors[color] || colors.purple;
};

export default function PricingPlans() {
  return (
    <section className="py-16 md:py-20 bg-white/5 backdrop-blur-sm">
      <div className="container mx-auto px-4 ">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Planes Diseñados para tu Negocio
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Comienza con el Plan Básico y agrega las funcionalidades que
            necesites
          </p>
        </div>

        {/* Plan Base */}
        <div className="max-w-2xl mx-auto mb-12">
          <Card className="border-4 border-yellow-400 shadow-2xl bg-gray-800">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-1 rounded-full">
                Plan Base Requerido
              </span>
            </div>

            <CardHeader className="text-center pb-4 pt-8">
              <CardTitle className="text-3xl text-white">
                {basePlan.name}
              </CardTitle>
              <CardDescription className="text-gray-300 text-lg">
                {basePlan.description}
              </CardDescription>
              <div className="mt-4">
                <span className="text-5xl font-bold text-white">
                  {basePlan.price}
                </span>
                <span className="text-white text-lg">/mes</span>
              </div>
            </CardHeader>

            <CardContent>
              <ul className="space-y-3 mb-6">
                {basePlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-200 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/sign-up" className="block">
                <Button className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-500 text-lg py-6 cursor-pointer">
                  Comenzar con Plan Básico
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Complementos */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Complementos Disponibles
            </h3>
            <p className="text-white/80 text-[20px]">
              Agrega funcionalidades extra a tu Plan Básico
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {addons.map((addon) => {
              const colors = getColorClasses(addon.color);
              const Icon = addon.icon;

              return (
                <Card
                  key={addon.name}
                  className="relative border-2 border-yellow-400 bg-gray-800 hover:shadow-2xl transition-shadow"
                >
                  {addon.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                        <Sparkles className="h-3 w-3" /> Más Popular
                      </span>
                    </div>
                  )}

                  <CardHeader className="text-center pb-3 pt-6">
                    <div
                      className={`w-14 h-14 mx-auto mb-3 rounded-full ${colors.bg} flex items-center justify-center border-2 ${colors.border}`}
                    >
                      <Icon className={`h-7 w-7 ${colors.accent}`} />
                    </div>
                    <CardTitle className="text-xl text-white mb-2">
                      {addon.name}
                    </CardTitle>
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Plus className="h-4 w-4 text-yellow-400" />
                      <span className="text-3xl font-bold text-white">
                        {addon.price}
                      </span>
                      <span className="text-gray-400 text-sm">/mes</span>
                    </div>
                    <CardDescription className="text-gray-300 text-2xl">
                      {addon.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <ul className="space-y-2 mb-6 min-h-[140px]">
                      {addon.features.slice(0, 4).map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-yellow-300 mt-0.5" />
                          <span className="text-white text-[16px] leading-tight">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Link href="/sign-up" className="block">
                      <Button className="w-full bg-yellow-400 text-black hover:bg-yellow-500 font-semibold cursor-pointer">
                        Agregar Complemento
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-white/70 text-sm">
            ✨ <strong>15 días de prueba gratis</strong> con acceso completo a
            todos los complementos. Sin tarjeta de crédito.
          </p>
          <p className="text-white/60 text-xs mt-2">
            Los complementos se pueden activar y desactivar en cualquier momento
            desde tu cuenta
          </p>
        </div>
      </div>
    </section>
  );
}
