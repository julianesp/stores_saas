'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Settings, Save, Plus, Trash2, Award } from 'lucide-react';
import { getLoyaltySettings, updateLoyaltySettings } from '@/lib/loyalty-helpers';
import { getUserProfileByClerkId } from '@/lib/subscription-helpers';
import { LoyaltySettings, LoyaltyTier } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function ConfigPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const profile = await getUserProfileByClerkId(user.id);
      if (!profile) {
        toast.error('Perfil no encontrado');
        return;
      }

      const loyaltySettings = await getLoyaltySettings(profile.id);
      setSettings(loyaltySettings);
      setEnabled(loyaltySettings.enabled);
      setTiers(loyaltySettings.tiers);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Error al cargar configuración');
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
        toast.error('Los rangos de montos no pueden superponerse');
        return;
      }
    }

    try {
      setSaving(true);
      await updateLoyaltySettings(settings.id, {
        enabled,
        tiers: sortedTiers,
      });
      toast.success('Configuración guardada correctamente');
      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar configuración');
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
        name: 'Nuevo nivel',
      },
    ]);
  };

  const handleRemoveTier = (index: number) => {
    if (tiers.length <= 1) {
      toast.error('Debe haber al menos un nivel');
      return;
    }
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const handleUpdateTier = (index: number, field: keyof LoyaltyTier, value: LoyaltyTier[keyof LoyaltyTier]) => {
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
            <p className="text-gray-500">Administra el sistema de puntos de lealtad</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !settings}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
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
                {enabled ? 'Los clientes ganarán puntos en cada compra' : 'Sistema desactivado'}
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
            />
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
                Define cuántos puntos ganan los clientes según el monto de su compra
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
                        onChange={(e) => handleUpdateTier(index, 'name', e.target.value)}
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
                        value={tier.min_amount}
                        onChange={(e) => handleUpdateTier(index, 'min_amount', Number(e.target.value))}
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
                        value={tier.max_amount === Infinity ? '' : tier.max_amount}
                        onChange={(e) => handleUpdateTier(
                          index,
                          'max_amount',
                          e.target.value === '' ? Infinity : Number(e.target.value)
                        )}
                        placeholder="Sin límite"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {tier.max_amount === Infinity ? 'Sin límite' : formatCurrency(tier.max_amount)}
                      </p>
                    </div>

                    {/* Puntos a otorgar */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Puntos a Otorgar
                      </label>
                      <Input
                        type="number"
                        value={tier.points}
                        onChange={(e) => handleUpdateTier(index, 'points', Number(e.target.value))}
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
                    <strong>Vista previa:</strong> Compras entre {formatCurrency(tier.min_amount)} y{' '}
                    {tier.max_amount === Infinity ? 'sin límite' : formatCurrency(tier.max_amount)}{' '}
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

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Información</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>• Los puntos se asignan automáticamente cuando un cliente realiza una compra</p>
          <p>• Los rangos de montos no pueden superponerse</p>
          <p>• Asegúrate de cubrir todos los rangos de montos que desees recompensar</p>
          <p>• Los cambios se aplicarán inmediatamente a las nuevas ventas</p>
        </CardContent>
      </Card>
    </div>
  );
}
