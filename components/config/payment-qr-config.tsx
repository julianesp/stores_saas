'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Upload, Trash2, Loader2 } from 'lucide-react';
import { getUserProfile, updateUserProfile } from '@/lib/cloudflare-api';
import { UserProfile } from '@/lib/types';
import { toast } from 'sonner';

/**
 * Configuración del QR de pagos del tendero (Nequi / Daviplata / Bre-B).
 *
 * El tendero sube la imagen del QR que le genera su banco o billetera, y el
 * POS lo muestra en pantalla al cobrar con Nequi/transferencia junto con el
 * monto a pagar. Sin APIs bancarias: el tendero confirma visualmente el pago.
 */
export function PaymentQrConfig() {
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getUserProfile(getToken);
        setProfile(data);
      } catch (error) {
        console.error('Error cargando perfil para QR de pagos:', error);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen (foto o captura del QR)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar 5MB');
      return;
    }

    try {
      setUploading(true);

      // Subir a Cloudinary con el endpoint existente
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.secure_url) {
        throw new Error(data.error || 'Error al subir la imagen');
      }

      // Guardar la URL en el perfil
      await updateUserProfile(
        profile.id,
        { payment_qr_url: data.secure_url },
        getToken
      );

      setProfile({ ...profile, payment_qr_url: data.secure_url });
      toast.success('QR de pagos guardado. Ya aparecerá al cobrar en el POS.');
    } catch (error) {
      console.error('Error subiendo QR de pagos:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al guardar el QR'
      );
    } finally {
      setUploading(false);
      // Permitir volver a elegir el mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!profile) return;
    try {
      setRemoving(true);
      await updateUserProfile(profile.id, { payment_qr_url: '' }, getToken);
      setProfile({ ...profile, payment_qr_url: '' });
      toast.success('QR de pagos eliminado');
    } catch (error) {
      console.error('Error eliminando QR de pagos:', error);
      toast.error('Error al eliminar el QR');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-brand" />
          QR de pagos (Nequi / Daviplata / Bre-B)
        </CardTitle>
        <CardDescription>
          Sube el QR de tu banco o billetera. Cuando cobres con Nequi o
          transferencia en el POS, se mostrará en pantalla junto con el monto
          para que el cliente lo escanee y te pague.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile?.payment_qr_url ? (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Image
              src={profile.payment_qr_url}
              alt="QR de pagos registrado"
              width={160}
              height={160}
              className="rounded-lg border"
            />
            <div className="space-y-2">
              <p className="text-sm text-green-700 font-medium">
                ✓ QR registrado — aparecerá al cobrar en el POS
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  Cambiar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleRemove}
                  disabled={removing}
                >
                  {removing ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <QrCode className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-3">
              Aún no has subido tu QR. Lo encuentras en la app de tu banco o
              billetera (Nequi: Recibir → Código QR; Daviplata: Pasar y pedir
              plata → QR; Bancolombia: Cobrar con QR / llave Bre-B).
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !profile}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir imagen del QR
                </>
              )}
            </Button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </CardContent>
    </Card>
  );
}
