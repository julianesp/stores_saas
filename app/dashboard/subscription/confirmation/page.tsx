"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Wompi envía el transaction ID en la query string
  const transactionId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [transactionStatus, setTransactionStatus] = useState<"PENDING" | "APPROVED" | "DECLINED" | "ERROR">("PENDING");

  useEffect(() => {
    if (transactionId) {
      // Dar tiempo para que el webhook procese el pago
      setTimeout(() => {
        checkPaymentStatus();
      }, 2000);
    } else {
      setTransactionStatus("ERROR");
      setLoading(false);
    }
  }, [transactionId]);

  const checkPaymentStatus = async () => {
    try {
      // Consultar el estado de la transacción
      const response = await fetch("/api/subscriptions/verify-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al verificar el pago");
      }

      const data = await response.json();

      if (data.isApproved) {
        setTransactionStatus("APPROVED");
      } else if (data.status === "DECLINED") {
        setTransactionStatus("DECLINED");
      } else {
        setTransactionStatus("PENDING");
      }
    } catch (error) {
      console.error("Error checking payment:", error);
      setTransactionStatus("ERROR");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando pago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card>
          <CardContent className="pt-8">
            {transactionStatus === "APPROVED" && (
              <>
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-green-100">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2 text-green-600">
                    ¡Pago Exitoso!
                  </h2>
                  <p className="text-gray-600">Tu suscripción ha sido activada</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <p className="text-sm text-gray-700 mb-4">
                    ✅ Tu pago ha sido procesado correctamente
                  </p>
                  <p className="text-sm text-gray-700 mb-4">
                    ✅ Tu suscripción está ahora activa
                  </p>
                  <p className="text-sm text-gray-700">
                    ✅ Ya puedes usar todas las funcionalidades del sistema
                  </p>
                </div>

                <div className="space-y-3">
                  <Link href="/dashboard">
                    <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
                      Ir al Dashboard
                    </Button>
                  </Link>

                  <Link href="/dashboard/subscription">
                    <Button variant="outline" size="lg" className="w-full">
                      Ver detalles de suscripción
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {transactionStatus === "PENDING" && (
              <div className="text-center">
                <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Procesando pago...</h2>
                <p className="text-gray-600 mb-6">Estamos verificando tu transacción</p>
                <Button onClick={checkPaymentStatus}>
                  Verificar nuevamente
                </Button>
              </div>
            )}

            {transactionStatus === "DECLINED" && (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-red-100">
                  <AlertCircle className="h-12 w-12 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-red-600">
                  Pago Rechazado
                </h2>
                <p className="text-gray-600 mb-6">
                  Tu pago no pudo ser procesado
                </p>
                <div className="space-y-3">
                  <Link href="/dashboard/subscription">
                    <Button size="lg" className="w-full bg-blue-600">
                      Intentar nuevamente
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {transactionStatus === "ERROR" && !transactionId && (
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">
                  No hay información de pago
                </h2>
                <p className="text-gray-600 mb-6">
                  No pudimos encontrar los detalles de tu transacción
                </p>
                <Link href="/dashboard/subscription">
                  <Button size="lg" className="w-full bg-blue-600">
                    Volver a suscripciones
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SubscriptionConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
