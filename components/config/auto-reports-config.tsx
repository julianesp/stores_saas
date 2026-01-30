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
import { toast } from "sonner";

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
        // No mostrar la solicitud si ya hay configuración guardada (enabled es true o false explícitamente)
        // Solo mostrar si es null o undefined (primera vez)
        setShowPermissionRequest(false);
      }
    } catch (error) {
      console.error("Error loading config:", error);
      toast.error("Error al cargar configuración");
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
        toast.success(data.message);
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al guardar configuración");
      }
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleEnableReports = () => {
    saveConfig({ enabled: true });
  };

  const handleDisableReports = () => {
    saveConfig({ enabled: false });
  };

  const downloadManualReport = async () => {
    try {
      toast.loading("Generando reporte...");
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
        toast.dismiss();
        toast.success("Reporte descargado exitosamente");
      } else {
        const error = await response.json();
        toast.dismiss();
        toast.error(error.error || "Error al generar reporte");
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.dismiss();
      toast.error("Error al descargar reporte");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
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
      <Card className="border-2 border-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Reportes Automáticos de Ventas
          </CardTitle>
          <CardDescription>
            Genera reportes diarios automáticos en formato Excel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">
              🎯 Características de los Reportes Automáticos:
            </h4>
            <ul className="space-y-2 text-sm text-blue-800">
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
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? "Activando..." : "Activar Reportes Automáticos"}
            </Button>
            <Button
              onClick={() => {
                // Guardar que el usuario rechazó la solicitud
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
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
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
              <Clock className="h-4 w-4 text-blue-600" />
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
              <Mail className="h-4 w-4 text-blue-600" />
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
