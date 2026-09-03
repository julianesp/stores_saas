"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, DollarSign, Save } from "lucide-react";
import { toast } from "sonner";
import {
  getBusinessTypePrices,
  updateBusinessTypePrice,
  type BusinessTypePrice,
} from "@/lib/cloudflare-api";
import { BUSINESS_TYPES } from "@/lib/business-types";

/**
 * Panel del superadmin para editar el precio mensual de cada tipo de negocio
 * (plan de suscripción). Los cambios se reflejan de inmediato en el checkout
 * de ePayco y en la página de suscripción.
 */
export default function BusinessTypePricesEditor() {
  const { getToken } = useAuth();
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchPrices = async () => {
    try {
      const data = await getBusinessTypePrices(getToken);
      const map: Record<string, number> = {};
      (Array.isArray(data) ? data : []).forEach((p: BusinessTypePrice) => {
        map[p.businessType] = p.price;
      });
      setPrices(map);
      setDrafts(
        Object.fromEntries(
          Object.entries(map).map(([id, price]) => [id, String(price)]),
        ),
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Error al cargar precios",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (businessTypeId: string) => {
    const raw = drafts[businessTypeId] ?? "";
    const price = Number(raw);

    if (!Number.isInteger(price) || price < 0) {
      toast.error("El precio debe ser un número entero positivo");
      return;
    }

    setSavingId(businessTypeId);
    try {
      await updateBusinessTypePrice(businessTypeId, price, getToken);
      setPrices((prev) => ({ ...prev, [businessTypeId]: price }));
      toast.success("Precio actualizado");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "No se pudo actualizar el precio",
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-brand" />
          Precios de planes por tipo de negocio
        </CardTitle>
        <p className="text-sm text-gray-500">
          Precio mensual en COP de cada plan. Se usa al crear el checkout de
          ePayco y en la página de suscripción.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Cargando precios...
          </div>
        ) : (
          <div className="space-y-3">
            {BUSINESS_TYPES.map((type) => {
              const draft = drafts[type.id] ?? "";
              const current = prices[type.id];
              const dirty = current !== undefined && Number(draft) !== current;

              return (
                <div
                  key={type.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {type.emoji} {type.name}
                    </p>
                    <p className="text-xs text-gray-400">{type.planId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">$</span>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={draft}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [type.id]: e.target.value,
                        }))
                      }
                      className="w-32"
                    />
                    <span className="text-sm text-gray-500">COP/mes</span>
                  </div>
                  <Button
                    size="sm"
                    disabled={!dirty || savingId === type.id}
                    onClick={() => handleSave(type.id)}
                  >
                    {savingId === type.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
