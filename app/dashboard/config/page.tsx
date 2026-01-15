"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  Save,
  Plus,
  Trash2,
  Award,
  FileText,
  Info,
  ExternalLink,
} from "lucide-react";
import { LoyaltySettings, LoyaltyTier } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { AutoReportsConfig } from "@/components/config/auto-reports-config";

export default function ConfigPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // NOTA: Temporalmente usamos configuración por defecto
      // TODO: Migrar loyalty_settings a Cloudflare D1
      const defaultSettings: LoyaltySettings = {
        id: "default",
        user_profile_id: user.id,
        enabled: true,
        tiers: [
          { min_amount: 0, max_amount: 19999, points: 0, name: "Sin puntos" },
          {
            min_amount: 20000,
            max_amount: 49999,
            points: 5,
            name: "Compra pequeña",
          },
          {
            min_amount: 50000,
            max_amount: 99999,
            points: 10,
            name: "Compra mediana",
          },
          {
            min_amount: 100000,
            max_amount: 199999,
            points: 25,
            name: "Compra grande",
          },
          {
            min_amount: 200000,
            max_amount: 499999,
            points: 50,
            name: "Compra muy grande",
          },
          {
            min_amount: 500000,
            max_amount: Infinity,
            points: 100,
            name: "Compra premium",
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setSettings(defaultSettings);
      setEnabled(defaultSettings.enabled);
      setTiers(defaultSettings.tiers);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    // Validar que los tiers no tengan rangos superpuestos
    const sortedTiers = [...tiers].sort((a, b) => a.min_amount - b.min_amount);
    for (let i = 0; i < sortedTiers.length - 1; i++) {
      if (sortedTiers[i].max_amount >= sortedTiers[i + 1].min_amount) {
        toast.error("Los rangos de montos no pueden superponerse");
        return;
      }
    }

    try {
      setSaving(true);

      // NOTA: Por ahora solo se puede visualizar la configuración por defecto
      // TODO: Implementar guardado en Cloudflare D1 cuando se migre loyalty_settings
      toast.warning("Configuración de solo lectura", {
        description:
          "Por ahora se usa la configuración por defecto del sistema. La edición personalizada estará disponible próximamente.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newMin = lastTier ? lastTier.max_amount + 1 : 0;

    setTiers([
      ...tiers,
      {
        min_amount: newMin,
        max_amount: newMin + 49999,
        points: 5,
        name: "Nuevo nivel",
      },
    ]);
  };

  const handleRemoveTier = (index: number) => {
    if (tiers.length <= 1) {
      toast.error("Debe haber al menos un nivel");
      return;
    }
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const handleUpdateTier = (
    index: number,
    field: keyof LoyaltyTier,
    value: LoyaltyTier[keyof LoyaltyTier]
  ) => {
    const newTiers = [...tiers];
    newTiers[index] = {
      ...newTiers[index],
      [field]: value,
    };
    setTiers(newTiers);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Configuración</h1>
            <p className="text-gray-500">
              Administra el sistema de puntos de lealtad
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !settings}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      {/* Estado del Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-600" />
            Estado del Sistema de Puntos
          </CardTitle>
          <CardDescription>
            Activa o desactiva el sistema de puntos de lealtad para tus clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Sistema de Puntos</p>
              <p className="text-sm text-gray-500">
                {enabled
                  ? "Los clientes ganarán puntos en cada compra"
                  : "Sistema desactivado"}
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Niveles de Puntos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Niveles de Puntos</CardTitle>
              <CardDescription>
                Define cuántos puntos ganan los clientes según el monto de su
                compra
              </CardDescription>
            </div>
            <Button onClick={handleAddTier} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Nivel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tiers.map((tier, index) => (
              <div key={index} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Nombre del nivel */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Nombre del Nivel
                      </label>
                      <Input
                        type="text"
                        value={tier.name}
                        onChange={(e) =>
                          handleUpdateTier(index, "name", e.target.value)
                        }
                        placeholder="Ej: Compra pequeña"
                      />
                    </div>

                    {/* Monto mínimo */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Monto Mínimo
                      </label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={tier.min_amount}
                        onChange={(e) =>
                          handleUpdateTier(
                            index,
                            "min_amount",
                            Number(e.target.value)
                          )
                        }
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {formatCurrency(tier.min_amount)}
                      </p>
                    </div>

                    {/* Monto máximo */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Monto Máximo
                      </label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={
                          tier.max_amount === Infinity ? "" : tier.max_amount
                        }
                        onChange={(e) =>
                          handleUpdateTier(
                            index,
                            "max_amount",
                            e.target.value === ""
                              ? Infinity
                              : Number(e.target.value)
                          )
                        }
                        placeholder="Sin límite"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {tier.max_amount === Infinity
                          ? "Sin límite"
                          : formatCurrency(tier.max_amount)}
                      </p>
                    </div>

                    {/* Puntos a otorgar */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Puntos a Otorgar
                      </label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={tier.points}
                        onChange={(e) =>
                          handleUpdateTier(
                            index,
                            "points",
                            Number(e.target.value)
                          )
                        }
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Botón eliminar */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTier(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Preview del nivel */}
                <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                  <p className="text-blue-900">
                    <strong>Vista previa:</strong> Compras entre{" "}
                    {formatCurrency(tier.min_amount)} y{" "}
                    {tier.max_amount === Infinity
                      ? "sin límite"
                      : formatCurrency(tier.max_amount)}{" "}
                    otorgarán <strong>{tier.points} puntos</strong>
                  </p>
                </div>
              </div>
            ))}

            {tiers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay niveles configurados</p>
                <p className="text-sm">Agrega un nivel para comenzar</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reportes Automáticos */}
      <AutoReportsConfig />

      {/* Facturación Electrónica */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Facturación Electrónica DIAN
          </CardTitle>
          <CardDescription>
            Información sobre facturación electrónica ante la DIAN
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mensaje informativo principal */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold text-blue-900">
                  Recibos de Venta Internos
                </p>
                <p className="text-sm text-blue-800">
                  Este sistema genera <strong>recibos de venta internos</strong>{" "}
                  que son perfectos para:
                </p>
                <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 ml-2">
                  <li>Pequeños negocios y tiendas de barrio</li>
                  <li>Control interno de ventas e inventario</li>
                  <li>Negocios que no requieren facturación electrónica</li>
                  <li>Régimen simple de tributación</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Información sobre facturación electrónica */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">
              ¿Necesitas Facturación Electrónica DIAN?
            </h4>
            <p className="text-sm text-gray-700 mb-3">
              Si tu negocio está <strong>obligado por la DIAN</strong> a emitir
              facturas electrónicas, debes contratar un proveedor tecnológico
              autorizado. Podemos integrar este sistema con:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="border rounded-lg p-3 hover:border-blue-300 transition-colors">
                <p className="font-semibold text-sm text-gray-900">Alegra</p>
                <p className="text-xs text-gray-600 mt-1">
                  Popular y fácil de usar
                </p>
              </div>
              <div className="border rounded-lg p-3 hover:border-blue-300 transition-colors">
                <p className="font-semibold text-sm text-gray-900">Siigo</p>
                <p className="text-xs text-gray-600 mt-1">
                  Robusto y confiable
                </p>
              </div>
              <div className="border rounded-lg p-3 hover:border-blue-300 transition-colors">
                <p className="font-semibold text-sm text-gray-900">Otros</p>
                <p className="text-xs text-gray-600 mt-1">
                  FacturaBee, Soenac, etc.
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-900">
                <strong>Nota importante:</strong> La facturación electrónica es
                responsabilidad del comerciante. Tú debes tramitar la resolución
                de facturación ante la DIAN y contratar el proveedor
                tecnológico. Nosotros solo integramos el sistema.
              </p>
            </div>
          </div>

          {/* CTA para contactar */}
          <div className="flex justify-center">
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700 cursor-pointer"
              onClick={() =>
                window.open(
                  "https://wa.me/573174503604?text=Hola,%20necesito%20ayuda%20con%20facturación%20electrónica",
                  "_blank"
                )
              }
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Contactar para Integración
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Información</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>
            • Los puntos se asignan automáticamente cuando un cliente realiza
            una compra
          </p>
          <p>• Los rangos de montos no pueden superponerse</p>
          <p>
            • Asegúrate de cubrir todos los rangos de montos que desees
            recompensar
          </p>
          <p>• Los cambios se aplicarán inmediatamente a las nuevas ventas</p>
        </CardContent>
      </Card>
    </div>
  );
}
