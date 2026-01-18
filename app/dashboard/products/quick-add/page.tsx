'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { BarcodeScannerZXing } from '@/components/products/barcode-scanner-zxing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, CheckCircle, ArrowRight, List } from 'lucide-react';
import { createProduct, getProducts } from '@/lib/cloudflare-api';
import { Product } from '@/lib/types';
import Swal from '@/lib/sweetalert';

export default function QuickAddProductPage() {
  const { getToken } = useAuth();

  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [scannedProducts, setScannedProducts] = useState<Array<{ barcode: string; exists: boolean; id?: string }>>([]);
  const [manualBarcode, setManualBarcode] = useState('');

  const handleBarcodeDetected = async (barcode: string) => {
    console.log('Código detectado:', barcode);

    // Verificar si ya fue escaneado en esta sesión
    if (scannedProducts.find(p => p.barcode === barcode)) {
      Swal.info('Este código ya fue escaneado', 'Código duplicado');
      return;
    }

    // Buscar si el producto ya existe
    const allProducts = await getProducts(getToken);
    const existingProducts = allProducts.filter(p => p.barcode === barcode);

    if (existingProducts.length > 0) {
      // Producto ya existe
      Swal.info('Este producto ya está registrado', 'Puedes verlo o editarlo');
      setScannedProducts(prev => [...prev, { barcode, exists: true, id: existingProducts[0].id }]);
    } else {
      // Producto nuevo - crear básico
      try {
        const newProduct = await createProduct({
          barcode: barcode,
          name: `Producto ${barcode.slice(-6)}`, // Nombre temporal
          description: 'Pendiente de completar',
          cost_price: 0,
          sale_price: 0,
          stock: 0,
          min_stock: 5,
        }, getToken);

        Swal.success('¡Producto creado!', 'Ahora completa los detalles');
        setScannedProducts(prev => [...prev, { barcode, exists: false, id: newProduct.id }]);
      } catch (error) {
        console.error('Error creando producto:', error);
        Swal.error('No se pudo crear el producto', 'Intenta de nuevo');
      }
    }
  };

  const handleManualAdd = async () => {
    if (!manualBarcode.trim()) {
      Swal.warning('Campo vacío', 'Ingresa un código de barras');
      return;
    }

    await handleBarcodeDetected(manualBarcode.trim());
    setManualBarcode('');
  };

  const goToEditProduct = (productId: string) => {
    router.push(`/dashboard/products/${productId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Agregar Productos Rápido</h1>
        <p className="text-gray-600 mt-1">
          Escanea códigos de barras para crear productos. Luego completa los detalles.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel Izquierdo - Escáner */}
        <div className="space-y-4">
          {/* Opción 1: Escanear con cámara */}
          {!showScanner ? (
            <Card>
              <CardHeader>
                <CardTitle>Opción 1: Escanear con Cámara</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowScanner(true)}
                  size="lg"
                  className="w-full"
                >
                  <Package className="mr-2 h-5 w-5" />
                  Abrir Cámara para Escanear
                </Button>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Funciona con celulares, tablets y computadoras con cámara
                </p>
              </CardContent>
            </Card>
          ) : (
            <div>
              <BarcodeScannerZXing
                onDetected={handleBarcodeDetected}
                onClose={() => setShowScanner(false)}
              />
            </div>
          )}

          {/* Opción 2: Ingresar manualmente */}
          <Card>
            <CardHeader>
              <CardTitle>Opción 2: Ingresar Manualmente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="manual-barcode">Código de Barras</Label>
                <Input
                  id="manual-barcode"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Ej: 7501234567890"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleManualAdd();
                    }
                  }}
                />
              </div>
              <Button onClick={handleManualAdd} className="w-full">
                Agregar Código
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Escribe o pega el código de barras del producto
              </p>
            </CardContent>
          </Card>

          {/* Información */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-sm mb-2 text-blue-900">💡 Flujo Recomendado</h3>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Escanea todos los productos que quieras agregar</li>
                <li>Se crearán automáticamente con el código de barras</li>
                <li>Luego, completa los detalles de cada uno (precio, nombre, etc.)</li>
                <li>¡Listo! Ya puedes venderlos en el POS</li>
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Panel Derecho - Lista de productos escaneados */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <List className="h-5 w-5" />
                    Productos Escaneados ({scannedProducts.length})
                  </div>
                </CardTitle>
                {scannedProducts.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/dashboard/products')}
                  >
                    Ver Todos
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {scannedProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">Aún no has escaneado productos</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Usa la cámara o ingresa códigos manualmente
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {scannedProducts.map((product, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        product.exists
                          ? 'bg-yellow-50 border-yellow-300'
                          : 'bg-green-50 border-green-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {product.exists ? (
                              <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                                Ya existía
                              </span>
                            ) : (
                              <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium">
                                ✓ Nuevo
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-sm font-medium">{product.barcode}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {product.exists
                              ? 'Este producto ya estaba registrado'
                              : 'Creado - Completa los detalles'}
                          </p>
                        </div>
                        {product.id && (
                          <Button
                            size="sm"
                            onClick={() => goToEditProduct(product.id!)}
                            variant={product.exists ? 'outline' : 'default'}
                          >
                            {product.exists ? 'Ver' : 'Completar'}
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {scannedProducts.filter(p => !p.exists).length > 0 && (
            <Card className="mt-4 bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-green-900 mb-1">
                      ¡{scannedProducts.filter(p => !p.exists).length} producto(s) nuevo(s) creado(s)!
                    </p>
                    <p className="text-green-700">
                      Haz clic en "Completar" para agregar nombre, precio y cantidad disponible
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
