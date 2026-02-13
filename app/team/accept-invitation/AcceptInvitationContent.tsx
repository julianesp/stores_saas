"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Mail, Store, Shield } from "lucide-react";
import { toast } from "sonner";
import { ROLE_DEFINITIONS } from "@/lib/permissions";

interface InvitationData {
  email: string;
  role: string;
  store_name?: string;
  inviter_name?: string;
  expires_at: string;
}

export default function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Token de invitación no proporcionado");
      setLoading(false);
      return;
    }

    validateInvitation();
  }, [token]);

  const validateInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/team/accept-invitation?token=${token}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Invitación no válida");
      }

      const data = await response.json();
      setInvitation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al validar la invitación");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;

    try {
      setAccepting(true);

      const response = await fetch("/api/team/accept-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitationToken: token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al aceptar la invitación");
      }

      setAccepted(true);
      toast.success("Invitación aceptada exitosamente");

      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al aceptar la invitación");
    } finally {
      setAccepting(false);
    }
  };

  const getRoleName = (role: string) => {
    const roleDefinition = ROLE_DEFINITIONS.find((r) => r.role === role);
    return roleDefinition?.name || role;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center justify-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validando invitación...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-600" />
              <CardTitle className="text-red-900">Invitación No Válida</CardTitle>
            </div>
            <CardDescription className="text-red-700">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="w-full"
            >
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <CardTitle className="text-green-900">Invitación Aceptada</CardTitle>
            </div>
            <CardDescription className="text-green-700">
              Te has unido exitosamente al equipo. Redirigiendo al dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Invitación al Equipo</CardTitle>
          <CardDescription>
            Has sido invitado a unirte a un equipo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {invitation && (
            <>
              <div className="space-y-4">
                {invitation.store_name && (
                  <div className="flex items-start gap-3">
                    <Store className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Tienda
                      </p>
                      <p className="text-lg font-semibold">
                        {invitation.store_name}
                      </p>
                    </div>
                  </div>
                )}

                {invitation.inviter_name && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Invitado por
                      </p>
                      <p className="text-lg font-semibold">
                        {invitation.inviter_name}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Rol asignado
                    </p>
                    <Badge className="mt-1 bg-blue-100 text-blue-800 border-blue-200">
                      {getRoleName(invitation.role)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Email
                    </p>
                    <p className="text-lg font-semibold">{invitation.email}</p>
                  </div>
                </div>

                {invitation.expires_at && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      Esta invitación expira el{" "}
                      {new Date(invitation.expires_at).toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full"
                  size="lg"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Aceptando...
                    </>
                  ) : (
                    "Aceptar Invitación"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  className="w-full"
                  disabled={accepting}
                >
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
