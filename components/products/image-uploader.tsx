'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';

interface ImageUploaderProps {
  productId?: string;
  initialImages?: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUploader({
  productId,
  initialImages = [],
  onChange,
  maxImages = 3,
}: ImageUploaderProps) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sincronizar estado interno con initialImages cuando cambien
  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length >= maxImages) {
      toast.warning(
        maxImages === 1
          ? 'Ya tienes una imagen. Elimínala para agregar otra'
          : `Máximo ${maxImages} imágenes permitidas. Elimina una para agregar otra`
      );
      return;
    }

    const remainingSlots = maxImages - images.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    setUploading(true);

    try {
      const uploadPromises = filesToUpload.map(async (file, index) => {
        try {
          // Validar tipo de archivo
          if (!file.type.startsWith('image/')) {
            toast.error(`Solo se permiten imágenes. Archivo: ${file.name}`);
            return null;
          }

          setLoadingIndex(images.length + index);

          console.log('📸 Imagen:', {
            nombre: file.name,
            tamaño: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            tipo: file.type
          });

          // Validar tamaño (máximo 5MB)
          if (file.size > 5 * 1024 * 1024) {
            toast.error(`Imagen muy grande (máx 5MB). Archivo: ${file.name}`);
            return null;
          }

          // Usar endpoint de Next.js que maneja la subida con firma
          const formData = new FormData();
          formData.append('file', file);
          formData.append('folder', `products/${productId || 'temp'}`);

          // Subir a través del endpoint de Next.js
          console.log('📤 Subiendo a servidor...');
          toast.info('Subiendo imagen...', { duration: 2000 });

          const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Error del servidor:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            });

            // Mensajes más específicos según el error
            let errorMessage = 'Error al subir imagen';
            if (response.status === 401) {
              errorMessage = 'No estás autorizado. Intenta cerrar sesión y volver a entrar.';
            } else if (response.status === 400) {
              errorMessage = errorData.error || 'La imagen no es válida';
            } else if (response.status === 500) {
              errorMessage = 'Error en el servidor. Intenta de nuevo.';
            } else {
              errorMessage = errorData.error || `Error ${response.status}`;
            }

            throw new Error(errorMessage);
          }

          const data = await response.json();
          if (!data.success || !data.secure_url) {
            console.error('❌ Respuesta inválida:', data);
            throw new Error('Respuesta inválida del servidor');
          }

          console.log('✅ Imagen subida exitosamente:', data.secure_url);
          return data.secure_url;
        } catch (error: any) {
          console.error('❌ Error procesando imagen:', error);
          toast.error(error.message || `Error al procesar ${file.name}`);
          return null;
        }
      });

      const uploadedUrls = (await Promise.all(uploadPromises)).filter(
        (url): url is string => url !== null
      );

      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);
      onChange(newImages);

      if (uploadedUrls.length > 0) {
        toast.success(
          uploadedUrls.length === 1
            ? 'Imagen subida correctamente'
            : `${uploadedUrls.length} imágenes subidas correctamente`
        );
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error(maxImages === 1 ? 'Error al subir imagen. Intenta de nuevo' : 'Error al subir imágenes. Intenta de nuevo');
    } finally {
      setUploading(false);
      setLoadingIndex(null);
      // Resetear el input
      e.target.value = '';
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageUrl = images[index];

    try {
      // Extraer public_id de la URL de Cloudinary
      const urlParts = imageUrl.split('/');
      const uploadIndex = urlParts.indexOf('upload');
      if (uploadIndex !== -1) {
        const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/');
        const publicId = pathAfterUpload.split('.')[0];

        // Intentar eliminar de Cloudinary (opcional, requiere endpoint backend)
        // Por ahora solo removemos de la lista
        console.log('Public ID to delete:', publicId);
      }

      const newImages = images.filter((_, i) => i !== index);
      setImages(newImages);
      onChange(newImages);

      toast.success('Imagen eliminada');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Error al eliminar imagen. Intenta de nuevo');
    }
  };

  // Iniciar cámara
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  };

  // Detener cámara
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Tomar foto
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Configurar canvas al tamaño del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convertir canvas a blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error('Error al capturar foto');
        return;
      }

      // Crear archivo desde el blob
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Detener cámara
      stopCamera();

      // Subir la foto
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', `products/${productId || 'temp'}`);

        toast.info('Subiendo foto...', { duration: 2000 });

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Error al subir imagen');
        }

        const data = await response.json();
        if (!data.success || !data.secure_url) {
          throw new Error('Respuesta inválida del servidor');
        }

        const newImages = [...images, data.secure_url];
        setImages(newImages);
        onChange(newImages);

        toast.success('Foto agregada correctamente');
      } catch (error) {
        console.error('Error uploading photo:', error);
        toast.error('Error al subir foto');
      } finally {
        setUploading(false);
      }
    }, 'image/jpeg', 0.9);
  };

  // Limpiar stream al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Grid de imágenes */}
      <div className={`grid gap-4 ${maxImages === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-3'}`}>
        {images.map((imageUrl, index) => (
          <Card key={index} className="relative group">
            <CardContent className="p-2">
              <div className="relative aspect-square overflow-hidden rounded-md">
                <Image
                  src={imageUrl}
                  alt={`Producto imagen ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 33vw, 200px"
                  className="object-cover"
                  loading="lazy"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={() => handleRemoveImage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-center text-gray-500 mt-1">
                {maxImages === 1 ? 'Vista previa' : `Imagen ${index + 1}`}
              </p>
            </CardContent>
          </Card>
        ))}

        {/* Placeholders para slots vacíos */}
        {Array.from({ length: maxImages - images.length }).map((_, index) => (
          <Card key={`empty-${index}`} className="border-dashed">
            <CardContent className="p-2">
              <div className="aspect-square flex items-center justify-center bg-gray-50 rounded-md">
                {loadingIndex === images.length + index ? (
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-gray-300" />
                )}
              </div>
              {maxImages > 1 && (
                <p className="text-xs text-center text-gray-400 mt-1">
                  {images.length + index + 1}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Botones de subida */}
      {images.length < maxImages && (
        <div className="space-y-3">
          {/* Input oculto para selección de archivos */}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
            disabled={uploading}
          />

          {/* Botones principales */}
          <div className="grid grid-cols-2 gap-3">
            {/* Botón de cámara */}
            <Button
              type="button"
              onClick={startCamera}
              disabled={uploading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Camera className="mr-2 h-4 w-4" />
              Tomar Foto
            </Button>

            {/* Botón de galería */}
            <label
              htmlFor="image-upload"
              className={`inline-flex items-center justify-center rounded-md border border-gray-300 bg-blue-600 text-white px-4 py-2 text-sm font-medium transition-colors hover:bg-blue-700 ${
                uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Galería
                </>
              )}
            </label>
          </div>

          <p className="text-xs text-gray-500 text-center">
            {images.length}/{maxImages} {maxImages === 1 ? 'imagen' : 'imágenes'} • JPG, PNG o WEBP • Máx 5MB
          </p>
        </div>
      )}

      {/* Estado completo */}
      {images.length === maxImages && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800 text-center">
            ✓ {maxImages === 1 ? 'Imagen agregada' : `Máximo de imágenes alcanzado (${maxImages}/${maxImages})`}
          </p>
        </div>
      )}

      {/* Modal de Cámara */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full overflow-hidden">
            {/* Header */}
            <div className="bg-purple-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-6 w-6" />
                <h2 className="text-xl font-bold">Tomar Foto del Producto</h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={stopCamera}
                className="text-white hover:bg-purple-700"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Video preview */}
            <div className="relative bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-h-[60vh] object-contain"
              />

              {/* Canvas oculto para capturar la imagen */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Guías visuales */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-white border-dashed w-3/4 h-3/4 rounded-lg opacity-50"></div>
              </div>
            </div>

            {/* Footer con botones */}
            <div className="p-4 bg-gray-50">
              <div className="flex gap-3 justify-center">
                <Button
                  type="button"
                  onClick={stopCamera}
                  variant="outline"
                  className="min-w-[120px]"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={capturePhoto}
                  disabled={uploading}
                  className="min-w-[120px] bg-purple-600 hover:bg-purple-700"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Capturar Foto
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 text-center mt-3">
                Centra el producto dentro del recuadro y presiona Capturar Foto
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
