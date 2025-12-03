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
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
              facingMode: 'environment', // Cámara trasera en móviles
              aspectRatio: { min: 1, max: 2 },
            },
            area: {
              // Área de escaneo (centro de la imagen)
              top: '20%',
              right: '10%',
              left: '10%',
              bottom: '20%',
            },
          },
          locator: {
            patchSize: 'medium',
            halfSample: false, // Mejor calidad, más lento pero más preciso
          },
          numOfWorkers: navigator.hardwareConcurrency || 4,
          frequency: 10, // Escaneos por segundo
          decoder: {
            readers: [
              'ean_reader', // Códigos EAN-13 (más comunes en productos)
              'ean_8_reader', // EAN-8
              'code_128_reader', // Code 128
              'code_39_reader', // Code 39
              'code_39_vin_reader', // Code 39 VIN
              'codabar_reader', // Codabar
              'upc_reader', // UPC-A
              'upc_e_reader', // UPC-E
              'i2of5_reader', // Interleaved 2 of 5
              '2of5_reader', // Standard 2 of 5
              'code_93_reader', // Code 93
            ],
            multiple: false,
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

      // Mejorar detección con validación de calidad
      Quagga.onDetected((result) => {
        const code = result.codeResult.code;
        const quality = result.codeResult.decodedCodes
          .filter((c: any) => c.error !== undefined)
          .reduce((sum: number, c: any) => sum + c.error, 0) / result.codeResult.decodedCodes.length;

        // Solo aceptar códigos con buena calidad (error < 0.15)
        if (code && quality < 0.15 && code !== lastScanned) {
          setLastScanned(code);
          onDetected(code);

          // Vibración (si el dispositivo lo soporta)
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }

          // Sonido de confirmación (opcional)
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYHGGS57OihUBELTKXh8bllHgU2kdb0z4IuCR1ywfDdkkEKF2a77OujUhELTqXi8bllHQU4kdXyz38qCiJ1wvDck0UJHGG56+6lUREMUKjj8r5sHgY8ldz00YMvCiZ4x/LajUIKH2W96+2nUxALTqrj8rxrHwU6lNv0z4QtCSF2wfHajEAPG2O56+qjURIMUKrk871rIAU7ldz00IMuCiR3xPDajEELG2K46+ykTxELTarg8r1sIAU6ltzzz4QuCiF1xvHYjUEPGl656+qkTxELTarg8r1sIAU5ltzzz4QuCiF1xvHYjUEPGl656+qkTxELTarg8r1sIAU5ltzzz4QuCiF1xvHYjUEPGl656+qkTxELTarg8r1sIAU5ltzzz4QuCiF1xvHYjUEPGl656+qkTxELTarg8r1sIAU5ltzzz4QuCiF1xvHYjUEPGl656+qkTxELTarg8r1sIAU5ltzzz4QuCiF1xvHYjUEPGl656+qkTxEL');
          audio.volume = 0.3;
          audio.play().catch(() => {}); // Silenciar errores si no se puede reproducir

          // Resetear después de 1.5 segundos
          setTimeout(() => setLastScanned(''), 1500);
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
            <div ref={scannerRef} className="w-full h-[500px] md:h-[400px]" />

            {/* Overlay con guías mejoradas */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Oscurecer bordes para enfocar en el centro */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60"></div>

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative border-2 border-green-400 rounded-lg w-72 h-40 shadow-lg bg-green-500/10">
                  {/* Esquinas animadas */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg animate-pulse"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg animate-pulse"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg animate-pulse"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg animate-pulse"></div>

                  {/* Línea de escaneo animada */}
                  <div className="absolute left-0 right-0 h-0.5 bg-green-400 top-1/2 transform -translate-y-1/2 animate-pulse shadow-lg shadow-green-400"></div>
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

          {/* Instrucciones mejoradas */}
          <div className="bg-blue-50 border-t border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">📱 Instrucciones:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-blue-700">
                  <li>Coloca el código de barras dentro del recuadro verde</li>
                  <li>Mantén el código estable y con buena iluminación</li>
                  <li>La distancia ideal es de 10-20 cm del código</li>
                  <li>El escaneo es automático - escucharás un sonido</li>
                  <li>💡 <strong>Mejor desde celular</strong> - usa la cámara trasera</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
