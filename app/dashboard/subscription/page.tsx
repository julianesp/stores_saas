"use client";

import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { Check, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserProfile } from "@/lib/cloudflare-api";
import { UserProfile } from "@/lib/types";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

// Planes de suscripción
const SUBSCRIPTION_PLANS = [
  {
    id: "plan-basico",
    name: "Plan Básico",
    price: 29900,
    popular: true,
    features: [
      "Gestión completa de inventario",
      "Punto de venta (POS)",
      "Gestión de clientes",
      "Reportes y estadísticas básicas",
      "Soporte técnico por email",
      "Actualizaciones automáticas",
    ],
  },
  {
    id: "plan-premium",
    name: "Plan Premium",
    price: 39900,
    popular: false,
    features: [
      "Todo lo del Plan Básico",
      "Tienda Online personalizable",
      "Análisis con Inteligencia Artificial",
      "Email Marketing (Carritos abandonados, Stock, Reportes)",
      "Múltiples métodos de pago (Wompi)",
      "Reportes avanzados",
      "Soporte prioritario",
      "Integración con WhatsApp",
      "Zonas de envío configurables",
    ],
  },
];

export default function SubscriptionPageWompi() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (getToken) {
        try {
          const data = await getUserProfile(getToken);
          setProfile(data);
        } catch (error) {
          console.error("Error loading profile:", error);
        }
      }
    }
    fetchProfile();
  }, [getToken]);

  const handleSubscribe = async (planId: string) => {
    if (!user) return;

    setLoading(true);
    setSelectedPlan(planId);

    try {
      // Llamar a la API local que luego llama al worker
      const response = await fetch("/api/subscriptions/create-payment-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear el link de pago");
      }

      const data = await response.json();

      if (!data.success || !data.data?.checkout_url) {
        throw new Error("No se recibió el link de pago");
      }

      // Redirigir al checkout de Wompi
      window.location.href = data.data.checkout_url;
    } catch (error) {
      console.error("Error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al procesar el pago";
      toast.error(errorMessage);
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const getDaysLeft = () => {
    if (!profile?.trial_end_date) return 0;
    const endDate = new Date(profile.trial_end_date);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getSubscriptionStatus = () => {
    if (!profile) return null;

    const daysLeft = getDaysLeft();
    const status = profile.subscription_status;

    return {
      status,
      daysLeft,
      nextBillingDate: profile.next_billing_date,
    };
  };

  const subscriptionStatus = getSubscriptionStatus();

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
            <div className="flex items-center gap-2 text-sm font-medium text-purple-600">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              </svg>
              <span>Nequi</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <span>Tarjetas (Visa, Mastercard)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              </svg>
              <span>PSE</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                Procesado por Wompi
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Planes */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`relative ${
              plan.popular ? "border-blue-500 border-2 shadow-lg" : ""
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Más Popular
                </span>
              </div>
            )}

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

              {/* Botón de pago con Wompi */}
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading && selectedPlan === plan.id}
              >
                {loading && selectedPlan === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creando link de pago...
                  </>
                ) : subscriptionStatus?.status === "active" ? (
                  "Renovar Plan"
                ) : (
                  <>
                    <svg
                      className="mr-2 h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                    Suscribirse con Wompi
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Información adicional */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              ✓ <strong>Pago seguro</strong> procesado por Wompi
            </p>
            <p>
              ✓ <strong>Múltiples métodos de pago</strong> - Nequi, PSE,
              tarjetas
            </p>
            <p>
              ✓ <strong>Facturación mensual</strong> automática
            </p>
            
            <p>
              ✓ <strong>Soporte técnico</strong> incluido en todos los planes
            </p>
            <p className="text-xs text-gray-500 mt-4 pt-4 border-t">
              Los pagos son procesados de forma segura por Wompi. Después de
              completar tu pago, tu suscripción se activará automáticamente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
