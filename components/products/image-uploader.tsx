'use client';

import { useState, useEffect } from 'react';
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

          {/* Botón de galería */}
          <label
            htmlFor="image-upload"
            className={`inline-flex items-center justify-center w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 ${
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
                Seleccionar desde Galería ({images.length}/{maxImages})
              </>
            )}
          </label>

          <p className="text-xs text-gray-500 text-center">
            Máximo {maxImages} {maxImages === 1 ? 'imagen' : 'imágenes'} • JPG, PNG o WEBP • Máx 5MB por imagen
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
    </div>
  );
}
