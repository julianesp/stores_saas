"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store, CheckCircle2 } from "lucide-react";
import { setSelectedTenantId } from "@/lib/cloudflare-api";
import { toast } from "sonner";

interface AccessibleStore {
  id: string;
  store_name: string;
  store_slug?: string;
  role: string;
  access_type: "owner" | "team_member";
  permissions?: string[];
  subscription_status?: string;
}

export default function StoreSwitcher() {
  const router = useRouter();
  const [stores, setStores] = useState<AccessibleStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadStores = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user-stores");
      if (!response.ok) {
        throw new Error("Error al cargar tiendas");
      }
      const data = await response.json();
      // El route handler puede devolver un array plano o { data: [...] }
      const list: AccessibleStore[] = Array.isArray(data) ? data : data?.data || [];
      setStores(list);

      // Si hay una tienda seleccionada en localStorage, usarla
      const savedTenantId = localStorage.getItem("selected_tenant_id");
      if (savedTenantId && list.find((s: AccessibleStore) => s.id === savedTenantId)) {
        setSelectedStore(savedTenantId);
      } else if (list.length > 0) {
        // Seleccionar la primera tienda por defecto (owner)
        const ownerStore = list.find((s: AccessibleStore) => s.access_type === "owner") || list[0];
        setSelectedStore(ownerStore.id);
        setSelectedTenantId(ownerStore.id);
      }
    } catch (error) {
      // Este selector solo se muestra cuando el usuario tiene MÁS de una tienda.
      // Un fallo transitorio al cargar la lista no debe alarmar al usuario con un
      // toast rojo (bloqueaba visualmente a quien solo tiene una tienda, como el
      // caso de suscripciones activas que veían "Error al cargar las tiendas").
      console.error("Error loading stores:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  const handleStoreChange = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId);
    if (store) {
      setSelectedStore(storeId);
      setSelectedTenantId(storeId);
      toast.success(`Cambiado a: ${store.store_name}`);

      // Recargar la página para aplicar el cambio de contexto
      router.refresh();
    }
  };

  // No mostrar el selector si:
  // 1. Solo hay una tienda O
  // 2. El usuario solo es team member (no tiene tiendas como owner)
  const hasOwnerStore = stores.some((s) => s.access_type === "owner");

  if (stores.length <= 1 || !hasOwnerStore) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Store className="h-4 w-4" />
        <span>Cargando...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedStore} onValueChange={handleStoreChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Seleccionar tienda" />
        </SelectTrigger>
        <SelectContent>
          {stores.map((store) => (
            <SelectItem key={store.id} value={store.id}>
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex flex-col items-start">
                  <span className="font-medium">{store.store_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {store.access_type === "owner" ? "Propietario" : store.role}
                  </span>
                </div>
                {store.access_type === "owner" && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
