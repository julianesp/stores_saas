'use client';

import { useRef } from 'react';
import QRCode from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface StoreQRGeneratorProps {
  storeSlug: string;
  storeName: string;
}

export function StoreQRGenerator({ storeSlug, storeName }: StoreQRGeneratorProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const storeUrl = `https://posib.dev/store/${storeSlug}`;

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
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
          <div
            ref={qrRef}
            className="p-4 bg-white border-2 border-gray-200 rounded-lg"
          >
            <QRCode
              value={storeUrl}
              size={256}
              level="H"
              includeMargin={true}
              renderAs="canvas"
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
