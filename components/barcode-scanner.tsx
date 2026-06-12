'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Button } from './ui/button';
import { X, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      rememberLastUsedCamera: true,
      showTorchButtonIfSupported: true,
      formatsToSupport: [
        0, // QR_CODE
        8, // EAN_13
        9, // EAN_8
        13, // CODE_128
        14, // CODE_39
        15, // ITF
      ],
    };

    scannerRef.current = new Html5QrcodeScanner(
      'barcode-scanner-container',
      config,
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        // Código escaneado exitosamente
        onScan(decodedText);
        cleanup();
      },
      (errorMessage) => {
        // Error de escaneo (normal durante el proceso)
        // console.log('Scanning...', errorMessage);
      }
    );

    setIsScanning(true);

    return () => {
      cleanup();
    };
  }, [onScan]);

  const cleanup = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch((error) => {
        console.error('Failed to clear scanner:', error);
      });
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-brand" />
            <h3 className="text-lg font-semibold">Escanear Código de Barras</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              cleanup();
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Instrucciones */}
        <p className="text-sm text-gray-600 mb-4">
          Apunta la cámara hacia el código de barras del producto
        </p>

        {/* Contenedor del escáner */}
        <div id="barcode-scanner-container" className="w-full" />

        {/* Botón de cancelar */}
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              cleanup();
              onClose();
            }}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
