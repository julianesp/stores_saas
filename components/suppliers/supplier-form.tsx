"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupplier, updateSupplier } from "@/lib/cloudflare-api";
import { Supplier } from "@/lib/types";
import { toast } from "sonner";

type SupplierFormValues = Partial<Supplier>;

interface SupplierFormProps {
  initialData?: SupplierFormValues;
  supplierId?: string;
}

export function SupplierForm({ initialData, supplierId }: SupplierFormProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch } = useForm<SupplierFormValues>({
    defaultValues: initialData || {
      payment_type: "contado",
      status: "activo",
      credit_days: 0,
      credit_limit: 0,
    },
  });

  const paymentType = watch("payment_type");

  const onSubmit = async (data: SupplierFormValues) => {
    setLoading(true);
    try {
      const supplierData = {
        ...data,
        credit_days: Number(data.credit_days) || 0,
        credit_limit: Number(data.credit_limit) || 0,
        default_discount: 0,
        delivery_days: 0,
        minimum_order: 0,
        rating: undefined,
      };

      if (supplierId) {
        await updateSupplier(supplierId, supplierData, getToken);
        toast.success("Proveedor actualizado");
      } else {
        await createSupplier(supplierData, getToken);
        toast.success("Proveedor creado");
        router.push("/dashboard/suppliers");
        router.refresh();
      }
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast.error(error instanceof Error ? error.message : "Error al guardar proveedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del proveedor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nombre y contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                {...register("name", { required: true })}
                placeholder="Ej: Distribuidora ABC"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_name">Persona de contacto</Label>
              <Input
                id="contact_name"
                {...register("contact_name")}
                placeholder="Ej: Juan Pérez"
              />
            </div>
          </div>

          {/* Celular y WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Celular *</Label>
              <Input
                id="phone"
                {...register("phone", { required: true })}
                placeholder="300 123 4567"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                {...register("whatsapp")}
                placeholder="300 123 4567"
              />
            </div>
          </div>

          {/* Ciudad y NIT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" {...register("city")} placeholder="Ej: Bogotá" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax_id">NIT / RUT</Label>
              <Input id="tax_id" {...register("tax_id")} placeholder="123456789-0" />
            </div>
          </div>

          {/* Pago y crédito */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="payment_type">Forma de pago</Label>
              <select
                id="payment_type"
                {...register("payment_type")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="contado">Contado</option>
                <option value="credito">Crédito</option>
              </select>
            </div>
            {paymentType === "credito" && (
              <div className="space-y-1.5">
                <Label htmlFor="credit_days">Días de plazo</Label>
                <Input
                  id="credit_days"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  {...register("credit_days")}
                  placeholder="30"
                />
              </div>
            )}
          </div>

          {/* Día de visita */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="visit_day">Día de visita del vendedor</Label>
              <select
                id="visit_day"
                {...register("visit_day")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sin día fijo</option>
                <option value="lunes">Lunes</option>
                <option value="martes">Martes</option>
                <option value="miércoles">Miércoles</option>
                <option value="jueves">Jueves</option>
                <option value="viernes">Viernes</option>
                <option value="sábado">Sábado</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                {...register("status")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              {...register("notes")}
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              placeholder="Ej: Solo acepta efectivo, pedir con 2 días de anticipación..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="bg-brand hover:bg-brand-hover text-white">
          {loading ? "Guardando..." : supplierId ? "Guardar cambios" : "Crear proveedor"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
