'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { getUserProfile, updateUserProfile } from '@/lib/cloudflare-api';
import { UserProfile } from '@/lib/types';
import { toast } from 'sonner';
import { Store, Palette, Share2, MapPin, Eye, ExternalLink } from 'lucide-react';
import { ShippingZonesManager } from '@/components/store-config/shipping-zones-manager';

export default function StoreConfigPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Estados del formulario
  const [storeSlug, setStoreSlug] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeEnabled, setStoreEnabled] = useState(false);

  // Personalización
  const [storePrimaryColor, setStorePrimaryColor] = useState('#3B82F6');
  const [storeSecondaryColor, setStoreSecondaryColor] = useState('#10B981');
  const [storeLogoUrl, setStoreLogoUrl] = useState('');
  const [storeBannerUrl, setStoreBannerUrl] = useState('');

  // Redes sociales y contacto
  const [storeWhatsapp, setStoreWhatsapp] = useState('');
  const [storeFacebook, setStoreFacebook] = useState('');
  const [storeInstagram, setStoreInstagram] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeCity, setStoreCity] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeEmail, setStoreEmail] = useState('');

  // Configuración de entrega
  const [storeShippingEnabled, setStoreShippingEnabled] = useState(false);
  const [storePickupEnabled, setStorePickupEnabled] = useState(true);
  const [storeMinOrder, setStoreMinOrder] = useState(0);
  const [storeTerms, setStoreTerms] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile(getToken);
      setProfile(data);

      // Cargar valores existentes
      setStoreSlug(data.store_slug || '');
      setStoreName(data.store_name || '');
      setStoreDescription(data.store_description || '');
      setStoreEnabled(data.store_enabled || false);
      setStorePrimaryColor(data.store_primary_color || '#3B82F6');
      setStoreSecondaryColor(data.store_secondary_color || '#10B981');
      setStoreLogoUrl(data.store_logo_url || '');
      setStoreBannerUrl(data.store_banner_url || '');
      setStoreWhatsapp(data.store_whatsapp || '');
      setStoreFacebook(data.store_facebook || '');
      setStoreInstagram(data.store_instagram || '');
      setStoreAddress(data.store_address || '');
      setStoreCity(data.store_city || '');
      setStorePhone(data.store_phone || '');
      setStoreEmail(data.store_email || '');
      setStoreShippingEnabled(data.store_shipping_enabled || false);
      setStorePickupEnabled(data.store_pickup_enabled !== false);
      setStoreMinOrder(data.store_min_order || 0);
      setStoreTerms(data.store_terms || '');
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    // Validaciones
    if (storeEnabled) {
      if (!storeSlug.trim()) {
        toast.error('El slug de la tienda es requerido');
        return;
      }
      if (!storeName.trim()) {
        toast.error('El nombre de la tienda es requerido');
        return;
      }

      // Validar formato del slug (solo letras, números y guiones)
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(storeSlug)) {
        toast.error('El slug solo puede contener letras minúsculas, números y guiones');
        return;
      }
    }

    setSaving(true);
    try {
      await updateUserProfile(profile.id, {
        store_slug: storeSlug.toLowerCase().trim() || undefined,
        store_name: storeName.trim() || undefined,
        store_description: storeDescription.trim() || undefined,
        store_enabled: storeEnabled,
        store_primary_color: storePrimaryColor,
        store_secondary_color: storeSecondaryColor,
        store_logo_url: storeLogoUrl.trim() || undefined,
        store_banner_url: storeBannerUrl.trim() || undefined,
        store_whatsapp: storeWhatsapp.trim() || undefined,
        store_facebook: storeFacebook.trim() || undefined,
        store_instagram: storeInstagram.trim() || undefined,
        store_address: storeAddress.trim() || undefined,
        store_city: storeCity.trim() || undefined,
        store_phone: storePhone.trim() || undefined,
        store_email: storeEmail.trim() || undefined,
        store_shipping_enabled: storeShippingEnabled,
        store_pickup_enabled: storePickupEnabled,
        store_min_order: storeMinOrder,
        store_terms: storeTerms.trim() || undefined,
      }, getToken);

      toast.success('Configuración guardada exitosamente');
      loadProfile(); // Recargar para obtener datos actualizados
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error(error.message || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const getStoreUrl = () => {
    if (!storeSlug) return null;
    return `${window.location.origin}/store/${storeSlug}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tienda Online</h1>
          <p className="text-gray-500">Configura tu tienda para vender por internet</p>
        </div>
        {storeEnabled && storeSlug && (
          <Button
            variant="outline"
            onClick={() => window.open(getStoreUrl()!, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver Tienda
          </Button>
        )}
      </div>

      {/* Estado de la tienda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Estado de la Tienda
          </CardTitle>
          <CardDescription>
            Activa o desactiva tu tienda online
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold">Tienda Online {storeEnabled ? 'Activa' : 'Inactiva'}</h3>
              <p className="text-sm text-gray-600">
                {storeEnabled
                  ? 'Tu tienda está visible para el público'
                  : 'Activa tu tienda para que los clientes puedan comprar online'}
              </p>
              {storeEnabled && storeSlug && (
                <p className="text-sm text-blue-600 mt-2 font-mono">
                  {getStoreUrl()}
                </p>
              )}
            </div>
            <Switch
              checked={storeEnabled}
              onCheckedChange={setStoreEnabled}
            />
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
          <CardDescription>
            Configuración general de tu tienda
          </CardDescription>
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
                Solo letras minúsculas, números y guiones. Ejemplo: mi-tienda-123
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
          <CardDescription>
            Colores e imágenes de tu tienda
          </CardDescription>
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

      {/* Opciones de entrega */}
      <Card>
        <CardHeader>
          <CardTitle>Opciones de Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Envío a Domicilio</h4>
              <p className="text-sm text-gray-600">Permite que los clientes soliciten envío</p>
            </div>
            <Switch
              checked={storeShippingEnabled}
              onCheckedChange={setStoreShippingEnabled}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Recogida en Tienda</h4>
              <p className="text-sm text-gray-600">Los clientes pueden recoger en tu ubicación</p>
            </div>
            <Switch
              checked={storePickupEnabled}
              onCheckedChange={setStorePickupEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minOrder">Pedido Mínimo (COP)</Label>
            <Input
              id="minOrder"
              type="number"
              value={storeMinOrder}
              onChange={(e) => setStoreMinOrder(Number(e.target.value))}
              placeholder="0"
              min="0"
              step="1000"
            />
          </div>
        </CardContent>
      </Card>

      {/* Términos y condiciones */}
      <Card>
        <CardHeader>
          <CardTitle>Términos y Condiciones</CardTitle>
          <CardDescription>
            Políticas de tu tienda (opcional)
          </CardDescription>
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

      {/* Botones de acción */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
        >
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>

        {storeEnabled && storeSlug && (
          <Button
            variant="outline"
            onClick={() => window.open(getStoreUrl()!, '_blank')}
            size="lg"
          >
            <Eye className="h-4 w-4 mr-2" />
            Vista Previa
          </Button>
        )}
      </div>
    </div>
  );
}
