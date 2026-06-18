"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { getUserProfile, updateUserProfile } from "@/lib/cloudflare-api";
import { UserProfile } from "@/lib/types";
import { toast } from "sonner";
import {
  Store,
  Palette,
  Share2,
  MapPin,
  Eye,
  Plus,
  Trash2,
  ImageIcon,
} from "lucide-react";

import { ShippingZonesManager } from "@/components/store-config/shipping-zones-manager";
import {
  hasStorefrontAccess,
  getStorefrontBlockMessage,
} from "@/lib/storefront-access";
import Swal from "sweetalert2";

export default function StoreConfigPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  // Estados del formulario
  const [storeSlug, setStoreSlug] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [storeEnabled, setStoreEnabled] = useState(false);

  // Personalización
  const [storePrimaryColor, setStorePrimaryColor] = useState("#3B82F6");
  const [storeSecondaryColor, setStoreSecondaryColor] = useState("#10B981");
  const [storeLogoUrl, setStoreLogoUrl] = useState("");
  const [storeBannerUrl, setStoreBannerUrl] = useState("");
  const [storeBannerImages, setStoreBannerImages] = useState<string[]>([]);
  const [uploadingCarousel, setUploadingCarousel] = useState(false);

  // Redes sociales y contacto
  const [storeWhatsapp, setStoreWhatsapp] = useState("");
  const [storeFacebook, setStoreFacebook] = useState("");
  const [storeInstagram, setStoreInstagram] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeCity, setStoreCity] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  const [storeNequiNumber, setStoreNequiNumber] = useState("");

  // Configuración de ePayco (pagos online)
  const [epaycoPublicKey, setEpaycoPublicKey] = useState("");
  const [epaycoPrivateKey, setEpaycoPrivateKey] = useState("");
  const [epaycoCustomerId, setEpaycoCustomerId] = useState("");
  const [epaycoEnabled, setEpaycoEnabled] = useState(false);

  // Configuración de entrega
  const [storeShippingEnabled, setStoreShippingEnabled] = useState(false);
  const [storePickupEnabled, setStorePickupEnabled] = useState(true);
  const [storeMinOrder, setStoreMinOrder] = useState(0);
  const [storeTerms, setStoreTerms] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile(getToken);
      setProfile(data);

      // Verificar acceso a Tienda Online
      const accessCheck = hasStorefrontAccess(data);
      setHasAccess(accessCheck.hasAccess);

      // Si no tiene acceso, mostrar alerta y redirigir
      if (!accessCheck.hasAccess) {
        const message = getStorefrontBlockMessage(accessCheck.reason);

        Swal.fire({
          icon: "warning",
          title: message.title,
          html: message.html,
          showCancelButton: true,
          confirmButtonText: "Ver Planes de Suscripción",
          cancelButtonText: "Volver al Dashboard",
          confirmButtonColor: "#8B5CF6",
          cancelButtonColor: "#6B7280",
          allowOutsideClick: false,
        }).then((result) => {
          if (result.isConfirmed) {
            router.push("/dashboard/subscription");
          } else {
            router.push("/dashboard");
          }
        });

        setLoading(false);
        return;
      }

      // Cargar valores existentes
      setStoreSlug(data.store_slug || "");
      setStoreName(data.store_name || "");
      setStoreDescription(data.store_description || "");
      setStoreEnabled(data.store_enabled || false);
      setStorePrimaryColor(data.store_primary_color || "#3B82F6");
      setStoreSecondaryColor(data.store_secondary_color || "#10B981");
      setStoreLogoUrl(data.store_logo_url || "");
      setStoreBannerUrl(data.store_banner_url || "");
      try {
        const parsed = data.store_banner_images
          ? JSON.parse(data.store_banner_images)
          : [];
        setStoreBannerImages(Array.isArray(parsed) ? parsed : []);
      } catch {
        setStoreBannerImages([]);
      }
      setStoreWhatsapp(data.store_whatsapp || "");
      setStoreFacebook(data.store_facebook || "");
      setStoreInstagram(data.store_instagram || "");
      setStoreAddress(data.store_address || "");
      setStoreCity(data.store_city || "");
      setStorePhone(data.store_phone || "");
      setStoreEmail(data.store_email || "");
      setStoreNequiNumber(data.store_nequi_number || "");
      setEpaycoPublicKey(data.epayco_public_key || "");
      setEpaycoPrivateKey(data.epayco_private_key || "");
      setEpaycoCustomerId(data.epayco_customer_id || "");
      setEpaycoEnabled(data.epayco_enabled || false);
      setStoreShippingEnabled(data.store_shipping_enabled || false);
      setStorePickupEnabled(data.store_pickup_enabled !== false);
      setStoreMinOrder(data.store_min_order || 0);
      setStoreTerms(data.store_terms || "");
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleCarouselUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (storeBannerImages.length + files.length > 8) {
      toast.error("Máximo 8 imágenes en el carrusel");
      return;
    }
    setUploadingCarousel(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al subir imagen");
        uploaded.push(data.secure_url);
      }
      setStoreBannerImages((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} imagen(es) agregada(s) al carrusel`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir imagen");
    } finally {
      setUploadingCarousel(false);
      e.target.value = "";
    }
  };

  const removeCarouselImage = (index: number) => {
    setStoreBannerImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!profile) return;

    // Validaciones
    if (storeEnabled) {
      if (!storeSlug.trim()) {
        toast.error("El slug de la tienda es requerido");
        return;
      }
      if (!storeName.trim()) {
        toast.error("El nombre de la tienda es requerido");
        return;
      }

      // Validar formato del slug (solo letras, números y guiones)
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(storeSlug)) {
        toast.error(
          "El slug solo puede contener letras minúsculas, números y guiones",
        );
        return;
      }
    }

    setSaving(true);
    try {
      await updateUserProfile(
        profile.id,
        {
          store_slug: storeSlug.toLowerCase().trim() || undefined,
          store_name: storeName.trim() || undefined,
          store_description: storeDescription.trim() || undefined,
          store_enabled: storeEnabled,
          store_primary_color: storePrimaryColor,
          store_secondary_color: storeSecondaryColor,
          store_logo_url: storeLogoUrl.trim() || undefined,
          store_banner_url: storeBannerUrl.trim() || undefined,
          store_banner_images:
            storeBannerImages.length > 0
              ? JSON.stringify(storeBannerImages)
              : undefined,
          store_whatsapp: storeWhatsapp.trim() || undefined,
          store_facebook: storeFacebook.trim() || undefined,
          store_instagram: storeInstagram.trim() || undefined,
          store_address: storeAddress.trim() || undefined,
          store_city: storeCity.trim() || undefined,
          store_phone: storePhone.trim() || undefined,
          store_email: storeEmail.trim() || undefined,
          store_nequi_number: storeNequiNumber.trim() || undefined,
          epayco_public_key: epaycoPublicKey.trim() || undefined,
          epayco_private_key: epaycoPrivateKey.trim() || undefined,
          epayco_customer_id: epaycoCustomerId.trim() || undefined,
          epayco_enabled: epaycoEnabled,
          store_shipping_enabled: storeShippingEnabled,
          store_pickup_enabled: storePickupEnabled,
          store_min_order: storeMinOrder,
          store_terms: storeTerms.trim() || undefined,
        },
        getToken,
      );

      toast.success("Configuración guardada exitosamente");
      loadProfile(); // Recargar para obtener datos actualizados
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error(error instanceof Error ? error.message : "Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const getStoreUrl = () => {
    if (!storeSlug) return null;
    // Usar la URL de producción configurada en variables de entorno
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://tienda-pos.vercel.app";
    return `${baseUrl}/store/${storeSlug}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando configuración...</p>
      </div>
    );
  }

  // Si no tiene acceso, no mostrar el formulario (ya se mostró el modal)
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Redirigiendo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tienda Online</h1>
          <p className="text-gray-500">
            Configura tu tienda para vender por internet
          </p>
        </div>
        <div className="fixed top-[130px] right-6 z-40 flex flex-col items-center gap-2">
          {storeEnabled && storeSlug && (
            <Button
              variant="outline"
              onClick={() => window.open(getStoreUrl()!, "_blank")}
            >
              <Eye className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Vista Previa</span>
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {/* Estado de la tienda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Estado de la Tienda
          </CardTitle>
          <CardDescription>Activa o desactiva tu tienda online</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold">
                Tienda Online {storeEnabled ? "Activa" : "Inactiva"}
              </h3>
              <p className="text-sm text-gray-600">
                {storeEnabled
                  ? "Tu tienda está visible para el público"
                  : "Activa tu tienda para que los clientes puedan comprar online"}
              </p>
              {storeEnabled && storeSlug && (
                <p className="text-sm text-brand mt-2 font-mono">
                  {getStoreUrl()}
                </p>
              )}
            </div>
            <Switch checked={storeEnabled} onCheckedChange={setStoreEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Información básica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Información Básica
          </CardTitle>
          <CardDescription>Configuración general de tu tienda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug de la Tienda *
                <span className="text-xs text-gray-500 ml-2">(URL única)</span>
              </Label>
              <Input
                id="slug"
                value={storeSlug}
                onChange={(e) => setStoreSlug(e.target.value.toLowerCase())}
                placeholder="mi-tienda"
                className="font-mono"
              />
              <p className="text-xs text-gray-500">
                Solo letras minúsculas, números y guiones. Ejemplo:
                mi-tienda-123
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Tienda *</Label>
              <Input
                id="name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Mi Tienda"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={storeDescription}
              onChange={(e) => setStoreDescription(e.target.value)}
              placeholder="Descripción de tu tienda..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Personalización */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Personalización
          </CardTitle>
          <CardDescription>Colores e imágenes de tu tienda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Color Principal</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="primaryColor"
                  value={storePrimaryColor}
                  onChange={(e) => setStorePrimaryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={storePrimaryColor}
                  onChange={(e) => setStorePrimaryColor(e.target.value)}
                  placeholder="#3B82F6"
                  className="flex-1 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Color Secundario</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="secondaryColor"
                  value={storeSecondaryColor}
                  onChange={(e) => setStoreSecondaryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={storeSecondaryColor}
                  onChange={(e) => setStoreSecondaryColor(e.target.value)}
                  placeholder="#10B981"
                  className="flex-1 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">URL del Logo</Label>
            <Input
              id="logo"
              value={storeLogoUrl}
              onChange={(e) => setStoreLogoUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner">URL del Banner</Label>
            <Input
              id="banner"
              value={storeBannerUrl}
              onChange={(e) => setStoreBannerUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
            <p className="text-xs text-gray-500">
              Se usa como imagen única si no hay imágenes en el carrusel.
            </p>
          </div>

          {/* Carrusel de presentación */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Carrusel de Presentación
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Agrega hasta 8 imágenes que se mostrarán como carrusel en tu
                  tienda. Se cambian automáticamente cada 5 segundos.
                </p>
              </div>
              <span className="text-xs text-gray-400">
                {storeBannerImages.length}/8
              </span>
            </div>

            {/* Miniaturas actuales */}
            {storeBannerImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {storeBannerImages.map((url, index) => (
                  <div
                    key={url}
                    className="relative group aspect-video rounded-lg overflow-hidden border"
                  >
                    <img
                      src={url}
                      alt={`Carrusel ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removeCarouselImage(index)}
                        className="opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-all"
                        aria-label="Eliminar imagen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Botón de upload */}
            {storeBannerImages.length < 8 && (
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleCarouselUpload}
                  disabled={uploadingCarousel}
                />
                <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg text-sm text-gray-600 hover:text-gray-800 transition-colors">
                  <Plus className="h-4 w-4" />
                  {uploadingCarousel ? "Subiendo..." : "Agregar imágenes"}
                </div>
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Redes sociales y contacto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Redes Sociales y Contacto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={storeWhatsapp}
                onChange={(e) => setStoreWhatsapp(e.target.value)}
                placeholder="+57 300 123 4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="(601) 123 4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={storeEmail}
                onChange={(e) => setStoreEmail(e.target.value)}
                placeholder="contacto@mitienda.com"
                type="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nequi">Número Nequi / Cuenta Bancaria</Label>
              <Input
                id="nequi"
                value={storeNequiNumber}
                onChange={(e) => setStoreNequiNumber(e.target.value)}
                placeholder="3001234567 o número de cuenta"
              />
              <p className="text-xs text-gray-500">
                Los clientes usarán este número para realizar pagos
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={storeFacebook}
                onChange={(e) => setStoreFacebook(e.target.value)}
                placeholder="https://facebook.com/mitienda"
                type="url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={storeInstagram}
                onChange={(e) => setStoreInstagram(e.target.value)}
                placeholder="https://instagram.com/mitienda"
                type="url"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ubicación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Calle 123 # 45-67"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={storeCity}
                onChange={(e) => setStoreCity(e.target.value)}
                placeholder="Bogotá"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Pagos con ePayco */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            Pagos Online con ePayco
          </CardTitle>
          <CardDescription>
            Acepta pagos con tarjeta, PSE, Nequi y más. Cada tienda debe tener
            su propia cuenta de ePayco.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Aviso importante */}
          <div className="p-4 bg-brand-light/50 border border-brand/40 rounded-lg">
            <h4 className="font-semibold text-brand mb-2">
              📌 ¿Cómo obtener tus credenciales?
            </h4>
            <ol className="text-sm text-brand space-y-1 list-decimal list-inside">
              <li>Crea una cuenta en ePayco (epayco.co)</li>
              <li>Verifica tu identidad y datos bancarios</li>
              <li>
                Obtén tus credenciales desde el dashboard de ePayco:
                P_CUST_ID_CLIENTE, Public Key y Private Key
              </li>
              <li>Copia y pega las credenciales aquí abajo</li>
            </ol>
            <p className="text-xs text-brand mt-2">
              ⚠️ Los pagos irán directamente a tu cuenta bancaria configurada en
              ePayco
            </p>
          </div>

          {/* Switch para activar ePayco */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Activar Pagos con ePayco</h4>
              <p className="text-sm text-gray-600">
                Permite a los clientes pagar online
              </p>
            </div>
            <Switch
              checked={epaycoEnabled}
              onCheckedChange={setEpaycoEnabled}
            />
          </div>

          {/* Campos de credenciales */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="epayco-customer-id">P_CUST_ID_CLIENTE</Label>
              <Input
                id="epayco-customer-id"
                value={epaycoCustomerId}
                onChange={(e) => setEpaycoCustomerId(e.target.value)}
                placeholder="ID de cliente de ePayco"
                type="text"
              />
              <p className="text-xs text-gray-500">
                Tu identificador de cliente en ePayco
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="epayco-public">Public Key (Llave Pública)</Label>
              <Input
                id="epayco-public"
                value={epaycoPublicKey}
                onChange={(e) => setEpaycoPublicKey(e.target.value)}
                placeholder="Public key de ePayco"
                type="text"
              />
              <p className="text-xs text-gray-500">
                Esta llave es pública y se usa en el frontend
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="epayco-private">
                Private Key (Llave Privada)
              </Label>
              <Input
                id="epayco-private"
                value={epaycoPrivateKey}
                onChange={(e) => setEpaycoPrivateKey(e.target.value)}
                placeholder="Private key de ePayco"
                type="password"
              />
              <p className="text-xs text-gray-500">
                ⚠️ Esta llave es secreta, nunca la compartas
              </p>
            </div>
          </div>

          {/* Información adicional */}
          {epaycoEnabled &&
            epaycoPublicKey &&
            epaycoPrivateKey &&
            epaycoCustomerId && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ ePayco configurado. Los clientes podrán pagar con tarjeta,
                  PSE, Nequi y más métodos de pago.
                </p>
              </div>
            )}

          {epaycoEnabled &&
            (!epaycoPublicKey || !epaycoPrivateKey || !epaycoCustomerId) && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Para activar ePayco debes ingresar todas las credenciales
                  (P_CUST_ID_CLIENTE, Public Key y Private Key)
                </p>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Opciones de entrega */}
      <Card>
        <CardHeader>
          <CardTitle>Opciones de Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Envío a Domicilio</h4>
              <p className="text-sm text-gray-600">
                Permite que los clientes soliciten envío
              </p>
            </div>
            <Switch
              checked={storeShippingEnabled}
              onCheckedChange={setStoreShippingEnabled}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Recogida en Tienda</h4>
              <p className="text-sm text-gray-600">
                Los clientes pueden recoger en tu ubicación
              </p>
            </div>
            <Switch
              checked={storePickupEnabled}
              onCheckedChange={setStorePickupEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minOrder">
              Pedido Mínimo en Tienda Online (COP)
            </Label>
            <Input
              id="minOrder"
              type="number"
              inputMode="numeric"
              value={storeMinOrder || ""}
              onChange={(e) => setStoreMinOrder(Number(e.target.value) || 0)}
              placeholder="0"
              min="0"
              step="1000"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Monto mínimo que los clientes deben gastar para completar un
                pedido en la tienda online.
              </p>
              {storeMinOrder > 0 && (
                <p className="text-sm font-semibold text-brand">
                  ${storeMinOrder.toLocaleString("es-CO")}
                </p>
              )}
            </div>
            <p className="text-xs text-gray-400 italic">
              💡 Tip: Dejar en 0 para no establecer mínimo. Recomendado: $2,000
              - $5,000 COP
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Términos y condiciones */}
      <Card>
        <CardHeader>
          <CardTitle>Términos y Condiciones</CardTitle>
          <CardDescription>Políticas de tu tienda (opcional)</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={storeTerms}
            onChange={(e) => setStoreTerms(e.target.value)}
            placeholder="Términos y condiciones de tu tienda..."
            rows={6}
          />
        </CardContent>
      </Card>

      {/* Zonas de Envío */}
      <ShippingZonesManager />
    </div>
  );
}
