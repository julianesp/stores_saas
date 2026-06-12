"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  FileSpreadsheet,
  Download,
  Clock,
  Mail,
  CheckCircle2,
} from "lucide-react";
import Swal from "sweetalert2";

interface AutoReportsConfig {
  enabled: boolean;
  time: string;
  email: string | null;
}

export function AutoReportsConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AutoReportsConfig>({
    enabled: false,
    time: "20:00",
    email: null,
  });
  const [showPermissionRequest, setShowPermissionRequest] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/reports/config");

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setShowPermissionRequest(false);
      }
    } catch (error) {
      console.error("Error loading config:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error al cargar la configuración de reportes",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig: Partial<AutoReportsConfig>) => {
    try {
      setSaving(true);
      const updatedConfig = { ...config, ...newConfig };

      const response = await fetch("/api/reports/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(updatedConfig);
        setShowPermissionRequest(false);

        await Swal.fire({
          icon: "success",
          title: "¡Guardado!",
          text: data.message,
          confirmButtonColor: "#2563eb",
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      } else {
        const error = await response.json();
        Swal.fire({
          icon: "error",
          title: "Error al guardar",
          text: error.error || "No se pudo guardar la configuración",
          confirmButtonColor: "#2563eb",
        });
      }
    } catch (error) {
      console.error("Error saving config:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ocurrió un error al guardar la configuración",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEnableReports = () => {
    saveConfig({ enabled: true });
  };

  const handleDisableReports = async () => {
    const result = await Swal.fire({
      icon: "question",
      title: "¿Desactivar reportes?",
      text: "Los reportes automáticos diarios se desactivarán.",
      showCancelButton: true,
      confirmButtonText: "Sí, desactivar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    });

    if (result.isConfirmed) {
      saveConfig({ enabled: false });
    }
  };

  const downloadManualReport = async () => {
    Swal.fire({
      title: "Generando reporte...",
      text: "Por favor espera un momento",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(`/api/reports/daily?date=${today}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Ventas_${today}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        Swal.fire({
          icon: "success",
          title: "¡Reporte descargado!",
          text: `El reporte de ventas del ${today} se descargó correctamente`,
          confirmButtonColor: "#2563eb",
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      } else {
        const error = await response.json();

        if (response.status === 404) {
          Swal.fire({
            icon: "info",
            title: "Sin ventas",
            text: error.error || "No hay ventas registradas para el día de hoy",
            confirmButtonColor: "#2563eb",
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error al generar reporte",
            text: error.error || "No se pudo generar el reporte",
            confirmButtonColor: "#2563eb",
          });
        }
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con el servidor para generar el reporte",
        confirmButtonColor: "#2563eb",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-brand" />
            Reportes Automáticos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Cargando configuración...</p>
        </CardContent>
      </Card>
    );
  }

  // Solicitud inicial de permisos
  if (showPermissionRequest && !config.enabled) {
    return (
      <Card className="border-2 border-brand">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-brand" />
            Reportes Automáticos de Ventas
          </CardTitle>
          <CardDescription>
            Genera reportes diarios automáticos en formato Excel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-brand-light/50 border border-brand/40 rounded-lg p-4">
            <h4 className="font-semibold text-brand mb-2">
              🎯 Características de los Reportes Automáticos:
            </h4>
            <ul className="space-y-2 text-sm text-brand">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Generación automática a las 8:00 PM cada día</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Incluye: fecha, producto, cantidad, valores, cliente y
                  teléfono
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Formato Excel (.xlsx) listo para análisis</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Puedes descargarlos manualmente cuando quieras</span>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>📌 Permiso requerido:</strong> Para activar los reportes
              automáticos, necesitamos tu autorización. Este permiso solo se
              solicitará una vez.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleEnableReports}
              disabled={saving}
              className="flex-1 bg-brand hover:bg-brand-hover"
            >
              {saving ? "Activando..." : "Activar Reportes Automáticos"}
            </Button>
            <Button
              onClick={() => {
                saveConfig({ enabled: false });
              }}
              variant="outline"
              disabled={saving}
            >
              Ahora no
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-brand" />
          Reportes Automáticos de Ventas
        </CardTitle>
        <CardDescription>
          Configuración de generación automática de reportes diarios en Excel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estado y activación */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                config.enabled ? "bg-green-500 animate-pulse" : "bg-gray-300"
              }`}
            ></div>
            <div>
              <p className="font-medium text-gray-900">
                {config.enabled
                  ? "Reportes Activados"
                  : "Reportes Desactivados"}
              </p>
              <p className="text-sm text-gray-500">
                {config.enabled
                  ? "Se generan automáticamente cada día"
                  : "Activa para generar reportes diarios"}
              </p>
            </div>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => {
              if (checked) {
                handleEnableReports();
              } else {
                handleDisableReports();
              }
            }}
            disabled={saving}
          />
        </div>

        {/* Configuración de hora */}
        {config.enabled && (
          <div className="space-y-2">
            <Label htmlFor="report-time" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand" />
              Hora de generación
            </Label>
            <div className="flex gap-2">
              <Input
                id="report-time"
                type="time"
                value={config.time}
                onChange={(e) => setConfig({ ...config, time: e.target.value })}
                className="max-w-xs"
              />
              <Button
                onClick={() => saveConfig({ time: config.time })}
                disabled={saving}
                variant="outline"
              >
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Los reportes se generarán automáticamente a esta hora cada día
            </p>
          </div>
        )}

        {/* Email opcional */}
        {config.enabled && (
          <div className="space-y-2">
            <Label htmlFor="report-email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand" />
              Email para notificaciones (opcional)
            </Label>
            <div className="flex gap-2">
              <Input
                id="report-email"
                type="email"
                value={config.email || ""}
                onChange={(e) =>
                  setConfig({ ...config, email: e.target.value })
                }
                placeholder="tu@email.com"
                className="max-w-md"
              />
              <Button
                onClick={() => saveConfig({ email: config.email })}
                disabled={saving}
                variant="outline"
              >
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Recibirás una notificación cuando se genere el reporte
              (próximamente)
            </p>
          </div>
        )}

        {/* Descarga manual */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">
            Descargar reporte manual
          </h4>
          <Button
            onClick={downloadManualReport}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar Reporte de Hoy
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Descarga el reporte de ventas del día actual en formato Excel
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
