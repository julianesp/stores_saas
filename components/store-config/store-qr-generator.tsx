'use client';

import { useRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface StoreQRGeneratorProps {
  storeSlug: string;
  storeName: string;
}

export function StoreQRGenerator({ storeSlug, storeName }: StoreQRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrGenerated, setQrGenerated] = useState(false);

  const storeUrl = `https://posib.dev/store/${storeSlug}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, storeUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      }).then(() => {
        setQrGenerated(true);
      }).catch((err) => {
        console.error('Error generating QR:', err);
        toast.error('Error al generar el QR');
      });
    }
  }, [storeUrl]);

  const downloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error('No se pudo generar el QR');
      return;
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `qr-${storeSlug}.png`;
    link.click();
    toast.success('QR descargado');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(storeUrl);
    toast.success('Enlace copiado al portapapeles');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Código QR de la Tienda</CardTitle>
        <CardDescription>
          Comparte este código QR para que tus clientes accedan a tu tienda online
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          {/* QR Code */}
          <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
            <canvas
              ref={canvasRef}
              className="w-64 h-64"
            />
          </div>

          {/* URL de la tienda */}
          <div className="w-full text-center">
            <p className="text-sm text-gray-600 mb-2">Enlace de tu tienda:</p>
            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
              <code className="flex-1 text-sm break-all text-gray-900">{storeUrl}</code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="flex-shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Botón de descarga */}
          <Button
            type="button"
            onClick={downloadQR}
            className="w-full gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar QR como Imagen
          </Button>

          {/* Información */}
          <div className="w-full bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>💡 Consejo:</strong> Imprime este código QR y colócalo en tu tienda física.
              Tus clientes podrán escanear el código para acceder directamente a tu tienda online.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
