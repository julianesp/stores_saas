"use client";

import { Check, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const plans = [
  {
    name: "Básico",
    price: "$24.900",
    priceValue: 24900,
    description: "Ideal para pequeños negocios que están empezando",
    features: [
      "Punto de Venta (POS)",
      "Gestión de inventario básica",
      "Hasta 100 productos",
      "Reportes básicos",
      "Soporte por email",
      "1 usuario",
    ],
    popular: false,
  },
  {
    name: "Profesional",
    price: "$49.900",
    priceValue: 49900,
    description: "Perfecto para negocios en crecimiento",
    features: [
      "Todo en Básico +",
      "Hasta 200 productos",
      "Tienda online personalizada",
      "Facturación electrónica DIAN",
      "Reportes avanzados",
      "Sistema de puntos de lealtad",
      "Gestión de proveedores",
      "Hasta 5 usuarios",
      "Soporte prioritario",
    ],
    popular: true,
  },
  {
    name: "Premium",
    price: "$79.900",
    priceValue: 79900,
    description: "Todas las funcionalidades para crecer sin límites",
    features: [
      "Todo en Profesional +",
      "Hasta 500 productos",
      "Análisis con IA",
      "Email Marketing",
      "Reportes personalizados",
      "Hasta 10 usuarios",
      "Soporte prioritario 24/7",
    ],
    popular: false,
  },
  {
    name: "Empresa",
    price: "Personalizado",
    priceValue: null,
    description: "Solución completa para empresas establecidas",
    features: [
      "Todo en Premium +",
      "Productos ilimitados",
      "Usuarios ilimitados",
      "Múltiples sucursales",
      "API personalizada",
      "Integración con sistemas existentes",
      "Capacitación personalizada",
      "Soporte 24/7 dedicado",
    ],
    popular: false,
  },
];

export default function PricingPlans() {
  return (
    <section className="py-16 md:py-20 bg-white/5 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Planes Diseñados para tu Negocio
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Comienza gratis por 7 días. Sin tarjeta de crédito. Cancela cuando
            quieras.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular
                  ? "border-4 border-yellow-400 shadow-2xl scale-105 bg-gray-800"
                  : "border-gray-600 bg-gray-800/80"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="h-4 w-4" /> Más Popular
                  </span>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl text-white">
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-gray-300">
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-white">
                    {plan.price}
                  </span>
                  {plan.price !== "Personalizado" && (
                    <span className="text-gray-400">/mes</span>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-200 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/sign-up" className="block">
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-yellow-400 text-gray-900 hover:bg-yellow-500"
                        : "bg-gray-700 text-white hover:bg-gray-600"
                    }`}
                  >
                    Comenzar Ahora
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-white/70 text-sm">
            Todos los planes incluyen 7 días de prueba gratis. No se requiere
            tarjeta de crédito.
          </p>
        </div>
      </div>
    </section>
  );
}
