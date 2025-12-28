'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getShippingZones,
  createShippingZone,
  updateShippingZone,
  deleteShippingZone,
  ShippingZone,
} from '@/lib/shipping-zones';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, MapPin, Loader2 } from 'lucide-react';

export function ShippingZonesManager() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<ShippingZone[]>([]);

  // Modal states
  const [showDialog, setShowDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [zoneName, setZoneName] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    try {
      setLoading(true);
      const data = await getShippingZones(getToken);
      setZones(data);
    } catch (error: any) {
      console.error('Error loading shipping zones:', error);
      toast.error('Error al cargar zonas de envío');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingZone(null);
    setZoneName('');
    setShippingCost('');
    setIsActive(true);
    setShowDialog(true);
  };

  const openEditDialog = (zone: ShippingZone) => {
    setEditingZone(zone);
    setZoneName(zone.zone_name);
    setShippingCost(zone.shipping_cost.toString());
    setIsActive(zone.is_active === 1);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!zoneName.trim()) {
      toast.error('El nombre de la zona es requerido');
      return;
    }

    const cost = parseFloat(shippingCost);
    if (isNaN(cost) || cost < 0) {
      toast.error('El costo debe ser un número válido');
      return;
    }

    try {
      setSaving(true);

      if (editingZone) {
        // Actualizar zona existente
        await updateShippingZone(
          editingZone.id,
          {
            zone_name: zoneName.trim(),
            shipping_cost: cost,
            is_active: isActive,
          },
          getToken
        );
        toast.success('Zona de envío actualizada');
      } else {
        // Crear nueva zona
        await createShippingZone(
          {
            zone_name: zoneName.trim(),
            shipping_cost: cost,
            is_active: isActive,
          },
          getToken
        );
        toast.success('Zona de envío creada');
      }

      setShowDialog(false);
      loadZones();
    } catch (error: any) {
      console.error('Error saving shipping zone:', error);
      toast.error(error.message || 'Error al guardar zona de envío');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (zone: ShippingZone) => {
    if (!confirm(`¿Estás seguro de eliminar la zona "${zone.zone_name}"?`)) {
      return;
    }

    try {
      await deleteShippingZone(zone.id, getToken);
      toast.success('Zona de envío eliminada');
      loadZones();
    } catch (error: any) {
      console.error('Error deleting shipping zone:', error);
      toast.error(error.message || 'Error al eliminar zona de envío');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Zonas de Envío
          </CardTitle>
          <CardDescription>
            Configura las zonas y costos de envío para tu tienda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Zonas de Envío
              </CardTitle>
              <CardDescription>
                Configura las zonas y costos de envío para tu tienda
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Zona
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No hay zonas de envío configuradas</p>
              <p className="text-sm mt-1">
                Agrega zonas para que tus clientes puedan seleccionar su ubicación en el checkout
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zona / Lugar</TableHead>
                  <TableHead>Costo de Envío</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium">{zone.zone_name}</TableCell>
                    <TableCell>{formatCurrency(zone.shipping_cost)}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          zone.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {zone.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(zone)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(zone)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog for Create/Edit */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingZone ? 'Editar Zona de Envío' : 'Nueva Zona de Envío'}
            </DialogTitle>
            <DialogDescription>
              Configura el nombre de la zona y su costo de envío
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="zone-name">Nombre de la Zona / Lugar *</Label>
              <Input
                id="zone-name"
                placeholder="Ej: Centro, Norte, Sur, Barrio Popular, etc."
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="shipping-cost">Costo de Envío *</Label>
              <Input
                id="shipping-cost"
                type="number"
                placeholder="Ej: 5000"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                min="0"
                step="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Costo fijo de envío para esta zona (ej: mototaxi, domicilio, etc.)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="is-active">Zona activa</Label>
            </div>
            <p className="text-xs text-gray-500">
              Las zonas inactivas no aparecerán en el checkout
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>Guardar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
