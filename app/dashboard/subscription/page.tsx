"use client";

import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import {
  Check,
  Loader2,
  CreditCard,
  Sparkles,
  Store,
  Mail,
  Copy,
  ExternalLink,
  Phone,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getUserProfile } from "@/lib/cloudflare-api";
import { UserProfile } from "@/lib/types";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  hasAIAccess,
  hasStoreAccess,
  hasEmailMarketingAccess,
} from "@/lib/cloudflare-subscription-helpers";
import Link from "next/link";
import Image from "next/image";

// Plan base de suscripción
const BASE_PLAN = {
  id: "plan-basico",
  name: "Plan Básico",
  price: 24900,
  features: [
    "Gestión completa de inventario",
    "Punto de venta (POS)",
    "Gestión de clientes y proveedores",
    "Reportes y estadísticas básicas",
    "Sistema de créditos y deudores",
    "Ofertas y promociones",
    "Soporte técnico por email",
    "Actualizaciones automáticas",
  ],
};

// Addons disponibles
const ADDONS = [
  {
    id: "addon-ai-monthly",
    type: "ai" as const,
    name: "Análisis con IA",
    icon: Sparkles,
    price: 4900,
    color: "purple",
    features: [
      "Predicciones de ventas automáticas",
      "Análisis de tendencias y patrones",
      "Recomendaciones de inventario inteligentes",
      "Insights y alertas automáticas",
      "Detección de anomalías en ventas",
    ],
  },
  {
    id: "addon-store-monthly",
    type: "store" as const,
    name: "Tienda Online",
    icon: Store,
    price: 9900,
    color: "blue",
    features: [
      "Tienda online personalizable",
      "Carrito de compras completo",
      "Pedidos online en tiempo real",
      "Integración con Wompi (pagos)",
      "Zonas de envío configurables",
      "Integración con WhatsApp",
      "Sincronización automática de inventario",
    ],
  },
  {
    id: "addon-email-monthly",
    type: "email" as const,
    name: "Email Marketing",
    icon: Mail,
    price: 4900,
    color: "green",
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

export default function SubscriptionPageWompi() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showNequiModal, setShowNequiModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

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

  const handleSubscribe = (itemId: string) => {
    if (!user) return;

    // Encontrar el plan o addon seleccionado
    let plan;
    if (itemId === BASE_PLAN.id) {
      plan = BASE_PLAN;
    } else {
      plan = ADDONS.find(addon => addon.id === itemId);
    }

    if (!plan) {
      toast.error("Plan no encontrado");
      return;
    }

    setSelectedPlan(plan);
    setSelectedItem(itemId);
    setShowNequiModal(true);
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

  // Verificar qué addons tiene activos el usuario
  const activeAddons = profile
    ? {
        ai: hasAIAccess(profile),
        store: hasStoreAccess(profile),
        email: hasEmailMarketingAccess(profile),
      }
    : { ai: false, store: false, email: false };

  const getColorClasses = (color: string) => {
    const colors: Record<
      string,
      { border: string; bg: string; text: string; button: string }
    > = {
      purple: {
        border: "border-purple-200",
        bg: "bg-purple-50",
        text: "text-purple-700",
        button: "bg-purple-600 hover:bg-purple-700",
      },
      blue: {
        border: "border-blue-200",
        bg: "bg-blue-50",
        text: "text-blue-700",
        button: "bg-blue-600 hover:bg-blue-700",
      },
      green: {
        border: "border-green-200",
        bg: "bg-green-50",
        text: "text-green-700",
        button: "bg-green-600 hover:bg-green-700",
      },
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="">
      {/* Botón de WhatsApp flotante */}
      <Link
        href="https://wa.me/573174503604?text=Hola,%20tengo%20una%20pregunta%20sobre%20los%20planes%20de%20suscripción"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-[10px] right-6 z-50 transition-transform hover:scale-110"
        aria-label="Contactar por WhatsApp"
      >
        <Image
          src="https://0dwas2ied3dcs14f.public.blob.vercel-storage.com/redes/social%20%281%29.png"
          alt="WhatsApp"
          className="w-14 h-14 md:w-16 md:h-16 drop-shadow-lg"
          width={50}
          height={50}
        />
      </Link>

      <div className="text-center">
        <h1 className="text-3xl font-bold">Planes y Addons</h1>
        <p className="text-gray-500 mt-2">
          Elige el plan base y agrega las funcionalidades que necesites
        </p>
        <div className="mt-4 inline-block bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-300 rounded-lg px-6 py-3">
          <p className="text-sm font-medium text-purple-900">
            ✨ <strong>Prueba Gratis por 15 Días:</strong> Acceso completo a
            todos los complementos
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

      {/* Método de pago aceptado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Método de pago</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-lg px-6 py-4">
              <Phone className="h-8 w-8 text-purple-600" />
              <div>
                <p className="font-bold text-lg text-purple-900">Transferencia Nequi</p>
                <p className="text-sm text-purple-700">Pago rápido y seguro</p>
              </div>
            </div>
          </div>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 text-center">
              💳 <strong>Fácil y seguro:</strong> Transfiere desde tu app de Nequi y envíanos el comprobante por WhatsApp para activación inmediata
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Plan Base */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Plan Base</h2>
        <Card className="border-gray-300 border-2">
          <CardHeader>
            <CardTitle className="text-2xl">{BASE_PLAN.name}</CardTitle>
            <CardDescription>
              Todo lo esencial para gestionar tu negocio
            </CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">
                {formatCurrency(BASE_PLAN.price)}
              </span>
              <span className="text-gray-500 ml-2">/mes</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {BASE_PLAN.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full bg-gray-800 hover:bg-gray-900"
              size="lg"
              onClick={() => handleSubscribe(BASE_PLAN.id)}
              disabled={loading && selectedItem === BASE_PLAN.id}
            >
              {loading && selectedItem === BASE_PLAN.id ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creando link de pago...
                </>
              ) : subscriptionStatus?.status === "active" ? (
                "Plan Activo"
              ) : (
                "Suscribirse al Plan Base"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Addons */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Addons Disponibles</h2>
        <p className="text-gray-600 mb-6">
          Agrega funcionalidades extra a tu plan base (se pueden combinar)
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {ADDONS.map((addon) => {
            const colors = getColorClasses(addon.color);
            const Icon = addon.icon;
            const isActive = activeAddons[addon.type];

            return (
              <Card
                key={addon.id}
                className={`relative ${colors.border} ${isActive ? "border-2" : ""}`}
              >
                {isActive && subscriptionStatus?.status === "trial" && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span
                      className={`${colors.bg} ${colors.text} px-3 py-1 rounded-full text-xs font-medium border ${colors.border}`}
                    >
                      Activo en Trial
                    </span>
                  </div>
                )}
                {isActive && subscriptionStatus?.status === "active" && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      ✓ Activo
                    </span>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${colors.bg}`}>
                      <Icon className={`h-6 w-6 ${colors.text}`} />
                    </div>
                    <CardTitle className="text-xl">{addon.name}</CardTitle>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">
                      +{formatCurrency(addon.price)}
                    </span>
                    <span className="text-gray-500 ml-2">/mes</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {addon.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full ${colors.button}`}
                    size="lg"
                    onClick={() => handleSubscribe(addon.id)}
                    disabled={loading && selectedItem === addon.id}
                  >
                    {loading && selectedItem === addon.id ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Procesando...
                      </>
                    ) : isActive && subscriptionStatus?.status === "active" ? (
                      "Renovar Addon"
                    ) : (
                      <>
                        <Icon className="mr-2 h-5 w-5" />
                        Agregar Addon
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Información adicional */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              ✓ <strong>Pago seguro</strong> por transferencia Nequi
            </p>
            <p>
              ✓ <strong>Activación rápida</strong> - En menos de 1 hora tras verificar el pago
            </p>
            <p>
              ✓ <strong>Facturación mensual</strong> - Paga solo por lo que necesites
            </p>
            <p>
              ✓ <strong>Cancela cuando quieras</strong> - Sin penalizaciones ni compromisos largos
            </p>
            <p>
              ✓ <strong>Soporte técnico incluido</strong> - Escríbenos por WhatsApp
            </p>
            <p className="text-xs text-gray-500 mt-4 pt-4 border-t">
              Los pagos se procesan de forma manual mediante transferencia Nequi. Cada addon se
              factura de manera independiente y puedes activarlos o desactivarlos en cualquier momento.
              Una vez realices el pago, envíanos el comprobante por WhatsApp y activaremos tu plan inmediatamente.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Calculadora de precio total */}
      {profile && subscriptionStatus?.status !== "trial" && (
        <Card className="max-w-2xl mx-auto bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-center">Tu Costo Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Plan Básico</span>
                <span className="font-bold">
                  {formatCurrency(BASE_PLAN.price)}
                </span>
              </div>
              {activeAddons.ai && (
                <div className="flex justify-between items-center text-purple-700">
                  <span>+ Análisis IA</span>
                  <span className="font-bold">{formatCurrency(4900)}</span>
                </div>
              )}
              {activeAddons.store && (
                <div className="flex justify-between items-center text-blue-700">
                  <span>+ Tienda Online</span>
                  <span className="font-bold">{formatCurrency(9900)}</span>
                </div>
              )}
              {activeAddons.email && (
                <div className="flex justify-between items-center text-green-700">
                  <span>+ Email Marketing</span>
                  <span className="font-bold">{formatCurrency(4900)}</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2 flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span>
                  {formatCurrency(
                    (subscriptionStatus?.status === "active"
                      ? BASE_PLAN.price
                      : 0) +
                      (activeAddons.ai ? 4900 : 0) +
                      (activeAddons.store ? 9900 : 0) +
                      (activeAddons.email ? 4900 : 0),
                  )}
                  <span className="text-sm font-normal text-gray-600">
                    /mes
                  </span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Instrucciones de Pago por Nequi */}
      <Dialog open={showNequiModal} onOpenChange={setShowNequiModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Phone className="h-6 w-6 text-purple-600" />
              </div>
              Instrucciones de Pago - Nequi
            </DialogTitle>
            <DialogDescription>
              Realiza la transferencia y envíanos el comprobante para activar tu plan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Resumen del Plan */}
            {selectedPlan && (
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Plan Seleccionado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-xl text-purple-900">{selectedPlan.name}</p>
                      <p className="text-sm text-purple-700">
                        {selectedPlan.id === BASE_PLAN.id ? "Todo lo esencial para tu negocio" : "Addon mensual"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-purple-900">
                        {formatCurrency(selectedPlan.price)}
                      </p>
                      <p className="text-sm text-purple-700">/mes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Paso 1: Datos de Nequi */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                Paso 1: Realiza la transferencia a Nequi
              </h3>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Número de Nequi:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-purple-900 font-mono">317 450 3604</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText('3174503604');
                        toast.success('Número copiado al portapapeles');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Titular:</span>
                  <span className="font-bold text-gray-900">Julián Alexander España Riobamba</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Valor a transferir:</span>
                  <span className="text-xl font-bold text-purple-900">
                    {selectedPlan && formatCurrency(selectedPlan.price)}
                  </span>
                </div>
              </div>

              {/* Botón para ir a Nequi */}
              <a
                href="https://clientes.nequi.com.co/recargas"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full bg-purple-600 hover:bg-purple-700" size="lg">
                  <ExternalLink className="mr-2 h-5 w-5" />
                  Ir a Nequi para Transferir
                </Button>
              </a>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  💡 <strong>Tip:</strong> Si usas la app de Nequi desde tu celular, puedes copiar el número
                  directamente desde aquí y pegarlo en la app.
                </p>
              </div>
            </div>

            {/* Paso 2: Enviar Comprobante */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Mail className="h-5 w-5 text-purple-600" />
                Paso 2: Envía el comprobante
              </h3>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4 space-y-3">
                <p className="text-sm text-gray-700">
                  Una vez realices la transferencia, envíanos el comprobante por WhatsApp para activar tu plan inmediatamente.
                </p>

                <a
                  href={`https://wa.me/573174503604?text=Hola,%20acabo%20de%20realizar%20una%20transferencia%20por%20Nequi%20para%20el%20plan:%20${selectedPlan?.name}%20por%20valor%20de%20${selectedPlan ? formatCurrency(selectedPlan.price) : ''}.%20Mi%20email%20registrado%20es:%20${user?.emailAddresses[0]?.emailAddress || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full block"
                >
                  <Button className="w-full bg-green-600 hover:bg-green-700" size="lg">
                    <Image
                      src="https://0dwas2ied3dcs14f.public.blob.vercel-storage.com/redes/social%20%281%29.png"
                      alt="WhatsApp"
                      width={24}
                      height={24}
                      className="mr-2"
                    />
                    Enviar Comprobante por WhatsApp
                  </Button>
                </a>
              </div>
            </div>

            {/* Información Importante */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2 text-sm text-yellow-900">
                  <p className="font-medium">Información Importante:</p>
                  <ul className="list-disc list-inside space-y-1 text-yellow-800">
                    <li>Tu plan se activará en menos de 1 hora después de verificar el pago</li>
                    <li>Asegúrate de enviar el comprobante con tu email registrado</li>
                    <li>El pago es por 30 días de servicio</li>
                    <li>Recibirás confirmación por email una vez activado</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botón de Cerrar */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowNequiModal(false)}
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
