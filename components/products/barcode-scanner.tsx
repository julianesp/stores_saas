'use client';

import { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';
import { Camera, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose?: () => void;
}

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isScanning && scannerRef.current) {
      Quagga.init(
        {
          inputStream: {
            name: 'Live',
            type: 'LiveStream',
            target: scannerRef.current,
            constraints: {
              width: { min: 640 },
              height: { min: 480 },
              facingMode: 'environment', // Cámara trasera
              aspectRatio: { min: 1, max: 2 },
            },
          },
          locator: {
            patchSize: 'medium',
            halfSample: true,
          },
          numOfWorkers: 2,
          decoder: {
            readers: [
              'ean_reader', // Códigos EAN-13 (más comunes en productos)
              'ean_8_reader', // EAN-8
              'code_128_reader', // Code 128
              'code_39_reader', // Code 39
              'upc_reader', // UPC
              'upc_e_reader', // UPC-E
            ],
          },
          locate: true,
        },
        (err) => {
          if (err) {
            console.error('Error al iniciar escáner:', err);
            setError('No se pudo acceder a la cámara. Asegúrate de dar permisos.');
            setIsScanning(false);
            return;
          }
          Quagga.start();
        }
      );

      Quagga.onDetected((result) => {
        const code = result.codeResult.code;

        // Evitar escaneos duplicados rápidos
        if (code && code !== lastScanned) {
          setLastScanned(code);
          onDetected(code);

          // Vibración (si el dispositivo lo soporta)
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }

          // Resetear después de 1 segundo para permitir re-escaneo
          setTimeout(() => setLastScanned(''), 1000);
        }
      });
    }

    return () => {
      if (isScanning) {
        Quagga.stop();
      }
    };
  }, [isScanning, lastScanned, onDetected]);

  const startScanning = () => {
    setError('');
    setIsScanning(true);
  };

  const stopScanning = () => {
    setIsScanning(false);
    Quagga.stop();
    if (onClose) {
      onClose();
    }
  };

  if (!isScanning) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <Camera className="w-10 h-10 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Escanear con Cámara</h3>
              <p className="text-sm text-gray-600 mb-4">
                Usa la cámara de tu dispositivo para escanear códigos de barras
              </p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <Button onClick={startScanning} size="lg" className="w-full">
              <Camera className="mr-2 h-5 w-5" />
              Activar Cámara
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <Card>
        <CardContent className="p-0">
          {/* Área de escaneo */}
          <div className="relative bg-black">
            <div ref={scannerRef} className="w-full h-[400px]" />

            {/* Overlay con guías */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-green-500 rounded-lg w-64 h-32 shadow-lg">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
                </div>
              </div>
            </div>

            {/* Botón de cerrar */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 z-10"
              onClick={stopScanning}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Instrucciones */}
          <div className="bg-blue-50 border-t border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Instrucciones:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-blue-700">
                  <li>Coloca el código de barras dentro del recuadro verde</li>
                  <li>Mantén el código estable y bien iluminado</li>
                  <li>El escaneo es automático al detectar el código</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
