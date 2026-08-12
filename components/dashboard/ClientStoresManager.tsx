"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Store,
  MapPin,
  Plus,
  Trash2,
  Pencil,
  Upload,
  Loader2,
  X,
  ExternalLink,
  Globe,
} from "lucide-react";

interface ClientStore {
  id: string;
  name: string;
  location: string;
  image: string;
  sortOrder: number;
  isActive: boolean;
  slug: string;
  profileEnabled: boolean;
  description: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  facebook: string;
  instagram: string;
  mapsUrl: string;
}

interface FormState {
  name: string;
  location: string;
  image: string;
  sortOrder: string;
  isActive: boolean;
  profileEnabled: boolean;
  description: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  facebook: string;
  instagram: string;
  mapsUrl: string;
}

const emptyForm: FormState = {
  name: "",
  location: "",
  image: "",
  sortOrder: "0",
  isActive: true,
  profileEnabled: false,
  description: "",
  address: "",
  phone: "",
  whatsapp: "",
  email: "",
  facebook: "",
  instagram: "",
  mapsUrl: "",
};

/**
 * Panel para gestionar las tiendas clientes que se muestran en la landing.
 * Solo se renderiza dentro del dashboard del superadmin.
 * Las imágenes se suben a Cloudinary vía /api/upload-image.
 */
export default function ClientStoresManager() {
  const [stores, setStores] = useState<ClientStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStores = async () => {
    try {
      const res = await fetch("/api/admin/client-stores", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al cargar las tiendas");
      }
      setStores(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Error al cargar las tiendas"
      );
    } finally {
      setLoading(false);
    }
  };

  // Recarga usada tras crear / editar / borrar (muestra el spinner de carga).
  const reloadStores = async () => {
    setLoading(true);
    await fetchStores();
  };

  useEffect(() => {
    // El fetch inicial se hace en un efecto porque depende de la sesión del
    // navegador (cookies de Clerk) y no puede correr en el servidor. El estado
    // `loading` ya arranca en true, por eso aquí no lo tocamos; los setState
    // solo ocurren tras resolverse el fetch (asíncronamente), no en el render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchStores();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startEdit = (store: ClientStore) => {
    setEditingId(store.id);
    setForm({
      name: store.name,
      location: store.location,
      image: store.image,
      sortOrder: String(store.sortOrder),
      isActive: store.isActive,
      profileEnabled: store.profileEnabled,
      description: store.description,
      address: store.address,
      phone: store.phone,
      whatsapp: store.whatsapp,
      email: store.email,
      facebook: store.facebook,
      instagram: store.instagram,
      mapsUrl: store.mapsUrl,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.secure_url) {
        throw new Error(data.error || "Error al subir la imagen");
      }

      setForm((prev) => ({ ...prev, image: data.secure_url }));
      toast.success("Imagen subida correctamente");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Error al subir la imagen"
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.location.trim()) {
      toast.error("El nombre y la ubicación son obligatorios");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        location: form.location.trim(),
        image: form.image.trim(),
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
        profileEnabled: form.profileEnabled,
        description: form.description.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),
        facebook: form.facebook.trim(),
        instagram: form.instagram.trim(),
        mapsUrl: form.mapsUrl.trim(),
      };

      const url = editingId
        ? `/api/admin/client-stores?id=${encodeURIComponent(editingId)}`
        : "/api/admin/client-stores";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar la tienda");
      }

      toast.success(editingId ? "Tienda actualizada" : "Tienda creada");
      resetForm();
      await reloadStores();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Error al guardar la tienda"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (store: ClientStore) => {
    if (
      !window.confirm(
        `¿Eliminar "${store.name}" de las tiendas clientes de la landing?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/client-stores?id=${encodeURIComponent(store.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar la tienda");
      }

      toast.success("Tienda eliminada");
      if (editingId === store.id) resetForm();
      await reloadStores();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar la tienda"
      );
    }
  };

  return (
    <Card id="client-stores-manager">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5 text-brand" />
          Tiendas clientes en la landing
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Gestiona las tiendas que aparecen en la sección &quot;Tiendas que ya
          confían en posib.dev&quot; de la página principal.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulario de creación / edición */}
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2"
        >
          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor="cs-name">Nombre de la tienda</Label>
            <Input
              id="cs-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Supermercado la 10"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor="cs-location">Ubicación</Label>
            <Input
              id="cs-location"
              value={form.location}
              onChange={(e) =>
                setForm((p) => ({ ...p, location: e.target.value }))
              }
              placeholder="Colón, Putumayo"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label>Foto de la tienda</Label>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                {form.image ? (
                  <>
                    <Image
                      src={form.image}
                      alt="Vista previa"
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, image: "" }))}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                      aria-label="Quitar imagen"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <Store className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Subir imagen
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  O pega una URL directamente abajo.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="cs-image-url">URL de la imagen</Label>
            <Input
              id="cs-image-url"
              value={form.image}
              onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor="cs-order">Orden</Label>
            <Input
              id="cs-order"
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((p) => ({ ...p, sortOrder: e.target.value }))
              }
              placeholder="0"
            />
          </div>

          <div className="flex items-end gap-2 sm:col-span-1">
            <Switch
              id="cs-active"
              checked={form.isActive}
              onCheckedChange={(checked) =>
                setForm((p) => ({ ...p, isActive: checked }))
              }
            />
            <Label htmlFor="cs-active" className="cursor-pointer">
              Visible en la landing
            </Label>
          </div>

          {/* --- Perfil público de la tienda --- */}
          <div className="sm:col-span-2 mt-2 rounded-lg border border-dashed bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Switch
                id="cs-profile-enabled"
                checked={form.profileEnabled}
                onCheckedChange={(checked) =>
                  setForm((p) => ({ ...p, profileEnabled: checked }))
                }
              />
              <Label htmlFor="cs-profile-enabled" className="cursor-pointer font-medium">
                Habilitar perfil público
              </Label>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Al activarlo, la tarjeta de esta tienda en la landing enlazará a una
              página con su contacto y ubicación (sin productos ni tienda online).
            </p>

            {form.profileEnabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="cs-description">Descripción (opcional)</Label>
                  <Textarea
                    id="cs-description"
                    value={form.description}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, description: e.target.value }))
                    }
                    placeholder="Breve descripción del negocio"
                    rows={2}
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="cs-address">Dirección exacta</Label>
                  <Input
                    id="cs-address"
                    value={form.address}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, address: e.target.value }))
                    }
                    placeholder="Calle 10 # 5-20, Colón"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="cs-maps">Enlace de Google Maps</Label>
                  <Input
                    id="cs-maps"
                    value={form.mapsUrl}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, mapsUrl: e.target.value }))
                    }
                    placeholder="https://maps.app.goo.gl/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Genera el botón &quot;Cómo llegar&quot;. Copia el enlace desde
                    la app o web de Google Maps (Compartir → Copiar vínculo).
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cs-whatsapp">WhatsApp</Label>
                  <Input
                    id="cs-whatsapp"
                    value={form.whatsapp}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, whatsapp: e.target.value }))
                    }
                    placeholder="3001234567"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cs-phone">Teléfono</Label>
                  <Input
                    id="cs-phone"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="3001234567"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="cs-email">Correo</Label>
                  <Input
                    id="cs-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="tienda@ejemplo.com"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cs-facebook">Facebook (URL)</Label>
                  <Input
                    id="cs-facebook"
                    value={form.facebook}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, facebook: e.target.value }))
                    }
                    placeholder="https://facebook.com/..."
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cs-instagram">Instagram (URL)</Label>
                  <Input
                    id="cs-instagram"
                    value={form.instagram}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, instagram: e.target.value }))
                    }
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving || uploading}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : editingId ? (
                <Pencil className="mr-2 h-4 w-4" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {editingId ? "Guardar cambios" : "Agregar tienda"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
        </form>

        {/* Listado de tiendas */}
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Cargando tiendas...
          </div>
        ) : stores.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aún no hay tiendas registradas. Agrega la primera con el formulario.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <div
                key={store.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                  {store.image ? (
                    <Image
                      src={store.image}
                      alt={store.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <Store className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate font-medium">{store.name}</p>
                    {!store.isActive && (
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">
                        Oculta
                      </span>
                    )}
                    {store.profileEnabled && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">
                        <Globe className="h-2.5 w-2.5" />
                        Perfil
                      </span>
                    )}
                  </div>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {store.location}
                  </p>
                  {store.profileEnabled && store.slug && (
                    <a
                      href={`/tienda/${store.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-brand hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ver perfil
                    </a>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => startEdit(store)}
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(store)}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
