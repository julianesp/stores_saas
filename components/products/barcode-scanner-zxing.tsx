'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException, ChecksumException, FormatException } from '@zxing/library';
import { Camera, X, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface BarcodeScannerZXingProps {
  onDetected: (barcode: string) => void;
  onClose?: () => void;
}

export function BarcodeScannerZXing({ onDetected, onClose }: BarcodeScannerZXingProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(true);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [videoDeviceId, setVideoDeviceId] = useState<string>('');

  // Verificar si ya tenemos permisos guardados
  useEffect(() => {
    const savedPermission = localStorage.getItem('camera_permission');
    if (savedPermission === 'granted') {
      setPermissionState('granted');
      setShowPermissionModal(false);
      // Iniciar escaneo automáticamente
      initScanner();
    }
    setCheckingPermission(false);
  }, []);

  // Inicializar el lector de códigos
  const initScanner = async () => {
    try {
      // Crear instancia del lector
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      // Obtener dispositivos de video disponibles
      const videoInputDevices = await codeReader.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        setError('No se encontró ninguna cámara en este dispositivo.');
        return false;
      }

      // Buscar cámara trasera en móviles (preferencia)
      let selectedDeviceId = videoInputDevices[0].deviceId;
      const backCamera = videoInputDevices.find(device =>
        device.label.toLowerCase().includes('back') ||
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('trasera')
      );

      if (backCamera) {
        selectedDeviceId = backCamera.deviceId;
      }

      setVideoDeviceId(selectedDeviceId);
      console.log('📹 Cámara seleccionada:', videoInputDevices.find(d => d.deviceId === selectedDeviceId)?.label);

      setPermissionState('granted');
      localStorage.setItem('camera_permission', 'granted');
      setShowPermissionModal(false);
      setIsScanning(true);

      return true;
    } catch (err) {
      console.error('Error al inicializar escáner:', err);
      handleCameraError(err);
      return false;
    }
  };

  // Manejar errores de cámara
  const handleCameraError = (err: unknown) => {
    const errName = err instanceof Error ? err.name : '';
    if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
      setPermissionState('denied');
      setError('Permisos de cámara denegados. Por favor, permite el acceso a la cámara en la configuración de tu navegador.');
    } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
      setError('No se encontró ninguna cámara en este dispositivo.');
    } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
      setError('La cámara está siendo usada por otra aplicación. Cierra otras apps que usen la cámara.');
    } else {
      setError('No se pudo acceder a la cámara. Verifica los permisos e intenta nuevamente.');
    }
  };

  // Iniciar escaneo continuo
  useEffect(() => {
    if (isScanning && videoRef.current && codeReaderRef.current && videoDeviceId) {
      console.log('🎥 Iniciando escaneo continuo con ZXing...');

      // Configurar constraints para mejor rendimiento en móvil
      const constraints = {
        video: {
          deviceId: videoDeviceId,
          facingMode: 'environment',
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
        }
      };

      // Decodificar continuamente
      codeReaderRef.current.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result, error) => {
          if (result) {
            const code = result.getText();

            // Evitar duplicados rápidos
            if (code && code !== lastScanned && !isProcessing) {
              setIsProcessing(true);
              setLastScanned(code);

              console.log('✅ Código detectado:', {
                codigo: code,
                formato: result.getBarcodeFormat(),
              });

              // Vibración (si el dispositivo lo soporta)
              if (navigator.vibrate) {
                navigator.vibrate(200);
              }

              // Sonido de confirmación
              try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYHGGS57OihUBELTKXh8bllHgU2kdb0z4IuCR1ywfDdkkEKF2a77OujUhELTqXi8bllHQU4kdXyz38qCiJ1wvDck0UJHGG56+6lUREMUKjj8r5sHgY8ldz00YMvCiZ4x/LajUIKH2W96+2nUxALTqrj8rxrHwU6lNv0z4QtCSF2wfHajEAPG2O56+qjURIMUKrk871rIAU7ldz00IMuCiR3xPDajEELG2K46+ykTxELTarg8r1sIAU6ltzzz4QuCiF1xvHYjUEPGl656+qkTxELTarg8r1sIAU5ltzzz4QuCiF1xvHYjUEPGl656+qkTxELTarg8r1sIAU5ltzzz4QuCiF1xvHYjUEPGl656+qkTxELTarg8r1sIAU5ltzzz4QuCiF1xvHYjUEPGl656+qkTxELTarg8r1sIAU5ltzzz4QuCiF1xvHYjUEPGl656+qkTxELTarg8r1sIAU5ltzzz4QuCiF1xvHYjUEPGl656+qkTxEL');
                audio.volume = 0.3;
                audio.play().catch(() => {});
              } catch (e) {
                // Ignorar errores de audio
              }

              // Llamar al callback
              onDetected(code);

              // Resetear después de 2 segundos
              setTimeout(() => {
                setLastScanned('');
                setIsProcessing(false);
              }, 2000);
            }
          }

          // Manejar errores silenciosamente (excepto los críticos)
          if (error) {
            // Solo loggear errores que NO son de "no encontrado"
            if (!(error instanceof NotFoundException)) {
              if (error instanceof ChecksumException) {
                console.debug('Checksum error (ignorado)');
              } else if (error instanceof FormatException) {
                console.debug('Format error (ignorado)');
              } else {
                console.warn('Error de escaneo:', error);
              }
            }
          }
        }
      );
    }

    // Cleanup
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, [isScanning, videoDeviceId, lastScanned, isProcessing, onDetected]);

  const startScanning = async () => {
    setError('');
    await initScanner();
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
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
          <Camera className="h-12 w-12 mx-auto mb-4 text-brand animate-pulse" />
          <p className="text-gray-500">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Modal de permisos
  if (!isScanning && showPermissionModal) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-brand-light rounded-full flex items-center justify-center">
              <Camera className="w-10 h-10 text-brand" />
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
                          <li>En tu navegador, busca el ícono de candado en la barra de direcciones</li>
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

              {onClose && (
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

            <div className="bg-brand-light/50 border border-brand/40 rounded-lg p-3 text-left">
              <p className="text-xs text-brand">
                <strong>Importante:</strong> Debes permitir el acceso a la cámara cuando tu navegador lo solicite.
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
            <video
              ref={videoRef}
              className="w-full h-[500px] md:h-[400px] object-cover"
              playsInline
              muted
            />

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

            {/* Indicador de código detectado */}
            {lastScanned && (
              <div className="absolute bottom-4 left-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-10 animate-fade-in">
                <p className="text-sm font-medium text-center">Código detectado: {lastScanned}</p>
              </div>
            )}
          </div>

          {/* Instrucciones mejoradas */}
          <div className="bg-brand-light/50 border-t border-brand/40 p-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-brand mt-0.5 flex-shrink-0" />
              <div className="text-sm text-brand">
                <p className="font-medium mb-1">Instrucciones:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-brand">
                  <li>Coloca el código de barras dentro del recuadro verde</li>
                  <li>Mantén el código estable y con buena iluminación</li>
                  <li>La distancia ideal es de 10-20 cm del código</li>
                  <li>El escaneo es automático cuando detecta el código</li>
                  <li><strong>Mejor desde celular</strong> - usa la cámara trasera</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
