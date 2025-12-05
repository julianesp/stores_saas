'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length >= maxImages) {
      toast.warning(`Máximo ${maxImages} imágenes permitidas. Elimina una para agregar otra`);
      return;
    }

    const remainingSlots = maxImages - images.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    setUploading(true);

    try {
      const uploadPromises = filesToUpload.map(async (file, index) => {
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
          toast.error(`Solo se permiten imágenes. Archivo: ${file.name}`);
          return null;
        }

        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`Imagen muy grande (máx 5MB). Archivo: ${file.name}`);
          return null;
        }

        setLoadingIndex(images.length + index);

        // Crear FormData para subir a Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'products'); // Usaremos un preset sin firma
        formData.append('folder', `products/${productId || 'temp'}`);

        // Subir a Cloudinary
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error('Error al subir imagen a Cloudinary');
        }

        const data = await response.json();
        return data.secure_url;
      });

      const uploadedUrls = (await Promise.all(uploadPromises)).filter(
        (url): url is string => url !== null
      );

      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);
      onChange(newImages);

      if (uploadedUrls.length > 0) {
        toast.success(`${uploadedUrls.length} imagen(es) subida(s) correctamente`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Error al subir imágenes. Intenta de nuevo');
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
      <div className="grid grid-cols-3 gap-4">
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
                Imagen {index + 1}
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
              <p className="text-xs text-center text-gray-400 mt-1">
                {images.length + index + 1}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Botón de subida */}
      {images.length < maxImages && (
        <div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
            disabled={uploading}
          />
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
                Agregar Imagen{images.length > 0 ? 's' : ''} ({images.length}/{maxImages})
              </>
            )}
          </label>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Máximo {maxImages} imágenes • JPG, PNG o WEBP • Máx 5MB por imagen
          </p>
        </div>
      )}

      {/* Estado completo */}
      {images.length === maxImages && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800 text-center">
            ✓ Máximo de imágenes alcanzado ({maxImages}/{maxImages})
          </p>
        </div>
      )}
    </div>
  );
}
