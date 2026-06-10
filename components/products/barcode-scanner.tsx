'use client';

import { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';
import { Camera, X, Zap, AlertCircle } from 'lucide-react';
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
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(true);
  const [checkingPermission, setCheckingPermission] = useState(true);

  // Verificar si ya tenemos permisos guardados
  useEffect(() => {
    const savedPermission = localStorage.getItem('camera_permission');
    if (savedPermission === 'granted') {
      setPermissionState('granted');
      setShowPermissionModal(false);
      // Iniciar escaneo automáticamente
      setIsScanning(true);
    }
    setCheckingPermission(false);
  }, []);

  // Verificar permisos de cámara
  const checkCameraPermission = async () => {
    try {
      // Intentar acceder a la cámara para verificar permisos
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      // Si llegamos aquí, tenemos permisos
      setPermissionState('granted');
      // Guardar en localStorage para no volver a pedir
      localStorage.setItem('camera_permission', 'granted');

      // Detener el stream inmediatamente
      stream.getTracks().forEach(track => track.stop());

      return true;
    } catch (err: any) {
      console.error('Error al verificar permisos:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setError('Permisos de cámara denegados. Por favor, permite el acceso a la cámara en la configuración de tu navegador.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No se encontró ninguna cámara en este dispositivo.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('La cámara está siendo usada por otra aplicación. Cierra otras apps que usen la cámara.');
      } else {
        setError('No se pudo acceder a la cámara. Verifica los permisos e intenta nuevamente.');
      }

      return false;
    }
  };

  useEffect(() => {
    if (isScanning && scannerRef.current) {
      console.log('🎥 Iniciando escáner de códigos de barras...');

      Quagga.init(
        {
          inputStream: {
            type: 'LiveStream' as const,
            target: scannerRef.current,
            constraints: {
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
              facingMode: 'environment', // Cámara trasera en móviles
            },
            // REMOVIDO: area - Esta configuración puede causar el error de "null.x"
          },
          locator: {
            patchSize: 'medium' as const,
            halfSample: true, // Cambiar a true para mejor compatibilidad
          },
          numOfWorkers: 0, // Desactivar workers para mejor compatibilidad con móviles
          frequency: 10, // Escaneos por segundo
          decoder: {
            readers: [
              'ean_reader', // Códigos EAN-13 (más comunes en productos)
              'ean_8_reader', // EAN-8
              'code_128_reader', // Code 128
              'code_39_reader', // Code 39
              'upc_reader', // UPC-A
              'upc_e_reader', // UPC-E
            ] as const,
            multiple: false,
          },
          locate: true,
        },
        (err) => {
          if (err) {
            console.error('❌ Error al iniciar escáner:', err);
            setError(`No se pudo iniciar el escáner: ${err.message || err}`);
            setIsScanning(false);
            return;
          }
          console.log('✅ Escáner iniciado correctamente');
          Quagga.start();
        }
      );

      // Mejorar detección con validación de calidad
      Quagga.onDetected((result) => {
        try {
          const code = result.codeResult.code;

          // Calcular calidad de forma más segura
          let quality = 1;
          try {
            const decodedCodes = result.codeResult.decodedCodes || [];
            const validCodes = decodedCodes.filter((c: any) => c.error !== undefined);
            if (validCodes.length > 0) {
              quality = validCodes.reduce((sum: number, c: any) => sum + c.error, 0) / validCodes.length;
            }
          } catch (e) {
            console.warn('No se pudo calcular calidad, usando valor por defecto');
          }

          // 🔍 DEBUG: Mostrar TODOS los códigos detectados en la consola
          console.log('📷 Código detectado:', {
            codigo: code,
            calidad: quality.toFixed(4),
            formato: result.codeResult.format,
            aceptado: quality < 0.3 // Relajado aún más para móviles
          });

          // Relajar el umbral de calidad de 0.15 a 0.3 para mejor detección con cámara móvil
          if (code && quality < 0.3 && code !== lastScanned && !isProcessing) {
            setIsProcessing(true);
            setLastScanned(code);

            console.log('✅ Código aceptado y enviado:', code);

            // Vibración (si el dispositivo lo soporta)
            if (navigator.vibrate) {
              navigator.vibrate(200);
            }

            // Sonido de confirmación (opcional)
            try {
              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYHGGS57OihUBELTKXh8bllHgU2kdb0z4IuCR1ywfDdkkEKF2a77OujUhELTqXi8bllHQU4kdXyz38qCiJ1wvDck0UJHGG56+6lUREMUKjj8r5sHgY8ldz00YMvCiZ4x/LajUIKH2W96+2nUxALTqrj8rxrHwU6lNv0z4QtCSF2wfHajEAPG2O56+qjURIMUKrk871rIAU7ldz00IMuCiR3xPDajEELG2K46+ykTxELTarg8r1sIAU6ltzzz4QuCiF1xvHYjUEPGl656+qkTxELTarg8r1sIAU5ltzzz4QuCiF1xvHYjUEPGl656+qkTxELTarg8r1sIAU5ltzzz4QuCiF1xvHYjUEPGl656+qkTxELTarg8r1sIAU5ltzzz4QuCiF1xvHYjUEPGl656+qkTxELTarg8r1sIAU5ltzzz4QuCiF1xvHYjUEPGl656+qkTxELTarg8r1sIAU5ltzzz4QuCiF1xvHYjUEPGl656+qkTxEL');
              audio.volume = 0.3;
              audio.play().catch(() => {}); // Silenciar errores si no se puede reproducir
            } catch (e) {
              // Ignorar errores de audio
            }

            // Llamar a onDetected
            onDetected(code);

            // Resetear después de 3 segundos
            setTimeout(() => {
              setLastScanned('');
              setIsProcessing(false);
            }, 3000);
          }
        } catch (error) {
          console.error('Error procesando código detectado:', error);
        }
      });
    }

    return () => {
      if (isScanning) {
        Quagga.stop();
      }
    };
  }, [isScanning, lastScanned, isProcessing, onDetected]);

  const startScanning = async () => {
    setError('');

    // Primero verificar permisos
    const hasPermission = await checkCameraPermission();

    if (hasPermission) {
      setShowPermissionModal(false);
      setIsScanning(true);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    Quagga.stop();
    if (onClose) {
      onClose();
    }
  };

  const retry = () => {
    setError('');
    setPermissionState('prompt');
    startScanning();
  };

  // Mostrar loading mientras verificamos permisos guardados
  if (checkingPermission) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Camera className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-pulse" />
          <p className="text-gray-500">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Solo mostrar modal de permisos si no estamos escaneando y es necesario
  if (!isScanning && showPermissionModal) {
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
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900 mb-2">{error}</p>

                    {permissionState === 'denied' && (
                      <div className="text-xs text-red-700 space-y-2 mt-2">
                        <p className="font-medium">Para habilitar la cámara:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>En tu navegador, busca el ícono de candado 🔒 o información ℹ️ en la barra de direcciones</li>
                          <li>Busca la opción "Permisos" o "Configuración del sitio"</li>
                          <li>Encuentra "Cámara" y selecciona "Permitir"</li>
                          <li>Recarga la página y vuelve a intentar</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Button
                onClick={error ? retry : startScanning}
                size="lg"
                className="w-full"
                disabled={isScanning}
              >
                <Camera className="mr-2 h-5 w-5" />
                {error ? 'Reintentar' : 'Activar Cámara'}
              </Button>

              {error && onClose && (
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  Cancelar
                </Button>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
              <p className="text-xs text-blue-700">
                <strong>💡 Importante:</strong> Debes permitir el acceso a la cámara cuando tu navegador lo solicite.
              </p>
            </div>
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
