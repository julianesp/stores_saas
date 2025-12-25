"use client";

import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import {
  Check,
  Loader2,
  Smartphone,
  CreditCard,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUBSCRIPTION_PLANS } from "@/lib/epayco";
import {
  checkSubscriptionStatus,
  getUserProfileByClerkId,
} from "@/lib/cloudflare-subscription-helpers";
import { SubscriptionStatus } from "@/lib/types";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export default function SubscriptionPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      if (user && getToken) {
        const status = await checkSubscriptionStatus(getToken);
        setSubscriptionStatus(status);
      }
    }
    fetchStatus();
  }, [user, getToken]);

  const handleSubscribe = async (
    planId: string,
    paymentMethod: "NEQUI" | null = null
  ) => {
    if (!user) return;

    setLoading(true);
    setSelectedPlan(planId);
    setSelectedMethod(paymentMethod);

    try {
      // Llamar a la API para crear la sesión de pago con ePayco
      const response = await fetch("/api/subscription/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al crear el pago");
      }

      const data = await response.json();

      // Verificar que recibimos el sessionId para Smart Checkout
      if (!data.sessionId) {
        throw new Error(data.error || "No se recibió el sessionId de ePayco");
      }

      console.log("✓ SessionId recibido:", data.sessionId);

      // Cargar el script de ePayco si no está cargado
      if (!(window as any).ePayco) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.epayco.co/checkout-v2.js";
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Error al cargar ePayco SDK"));
          document.head.appendChild(script);
        });
      }

      // Configurar y abrir el checkout de ePayco
      const checkout = (window as any).ePayco.checkout.configure({
        sessionId: data.sessionId,
        type: "onpage",
        test: process.env.NEXT_PUBLIC_EPAYCO_ENV !== "production",
      });

      checkout.onCreated(() => {
        console.log("✓ Checkout de ePayco creado");
      });

      checkout.onErrors((errors: any) => {
        console.error("❌ Errores en checkout:", errors);
        toast.error("Error al procesar el pago");
        setLoading(false);
        setSelectedPlan(null);
        setSelectedMethod(null);
      });

      checkout.onClosed(() => {
        console.log("Checkout cerrado");
        setLoading(false);
        setSelectedPlan(null);
        setSelectedMethod(null);
      });

      checkout.open();
    } catch (error) {
      console.error("Error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al procesar el pago";
      toast.error(errorMessage);
      setLoading(false);
      setSelectedPlan(null);
      setSelectedMethod(null);
    }
  };

  const isButtonLoading = (planId: string, method: string | null) => {
    return loading && selectedPlan === planId && selectedMethod === method;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Planes de Suscripción</h1>
        <p className="text-gray-500 mt-2">
          Elige el plan perfecto para tu negocio
        </p>
        <div className="mt-4 inline-block bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-300 rounded-lg px-6 py-3">
          <p className="text-sm font-medium text-purple-900">
            ✨ <strong>Prueba Gratis por 15 Días:</strong> Plan Básico completo
          </p>
        </div>
      </div>

      {/* Estado actual de suscripción */}
      {subscriptionStatus && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900">
                  Estado de tu suscripción
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  {subscriptionStatus.status === "trial" && (
                    <>
                      Período de prueba - {subscriptionStatus.daysLeft} días
                      restantes
                    </>
                  )}
                  {subscriptionStatus.status === "active" && (
                    <>
                      Suscripción activa - Próximo pago:{" "}
                      {subscriptionStatus.nextBillingDate}
                    </>
                  )}
                  {subscriptionStatus.status === "expired" && (
                    <>Suscripción expirada - Renueva tu plan</>
                  )}
                </p>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  subscriptionStatus.status === "active"
                    ? "bg-green-100 text-green-800"
                    : subscriptionStatus.status === "trial"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {subscriptionStatus.status === "trial" && "Prueba Gratuita"}
                {subscriptionStatus.status === "active" && "Activa"}
                {subscriptionStatus.status === "expired" && "Expirada"}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métodos de pago aceptados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Métodos de pago aceptados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Smartphone className="h-5 w-5 text-purple-600" />
              <span>Nequi</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <span>Tarjetas (Visa, Mastercard)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-5 w-5 text-green-600" />
              <span>PSE</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-5 w-5 text-yellow-600" />
              <span>Bancolombia</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Planes */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {SUBSCRIPTION_PLANS.filter((plan) => !plan.isAddon).map((plan) => (
          <Card
            key={plan.id}
            className={`relative ${
              plan.popular ? "border-blue-500 border-2 shadow-lg" : ""
            } ${
              plan.isAddon
                ? "border-purple-300 bg-gradient-to-br from-purple-50 to-white"
                : ""
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Más Popular
                </span>
              </div>
            )}
            {/* TEMPORALMENTE DESHABILITADO - En desarrollo
            {plan.isAddon && (
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1 ">
                  ✨ Potencia tu Negocio con IA
                </span>
              </div>
            )}
            */}

            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">
                  {formatCurrency(plan.price)}
                </span>
                <span className="text-gray-500 ml-2">/mes</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Botón de Nequi */}
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
                onClick={() => handleSubscribe(plan.id, "NEQUI")}
                disabled={isButtonLoading(plan.id, "NEQUI")}
              >
                {isButtonLoading(plan.id, "NEQUI") ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Smartphone className="mr-2 h-5 w-5" />
                    Pagar con Nequi
                  </>
                )}
              </Button>

              {/* Botón de otros métodos */}
              <Button
                className="w-full"
                size="lg"
                variant="outline"
                onClick={() => handleSubscribe(plan.id, null)}
                disabled={isButtonLoading(plan.id, null)}
              >
                {isButtonLoading(plan.id, null) ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Procesando...
                  </>
                ) : subscriptionStatus?.status === "active" ? (
                  "Plan Actual"
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Otros métodos (Tarjeta, PSE, etc.)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Verificación manual de pago */}
      <Card className="max-w-4xl mx-auto bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">
                ¿Ya pagaste y tu suscripción no se activó?
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Verifica tu pago manualmente ingresando el ID de transacción de
                ePayco
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                (window.location.href =
                  "/dashboard/subscription/verify-payment")
              }
              className="border-blue-300 hover:bg-blue-100"
            >
              Verificar Pago
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              ✓ <strong>Pago seguro</strong> procesado por ePayco
            </p>
            <p>
              ✓ <strong>Pago con Nequi</strong> - La forma más rápida y fácil de
              pagar
            </p>
            <p>
              ✓ <strong>Facturación mensual</strong> automática
            </p>
            <p>
              ✓ <strong>Cancela cuando quieras</strong> sin penalizaciones
            </p>
            <p>
              ✓ <strong>Soporte técnico</strong> incluido en todos los planes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
