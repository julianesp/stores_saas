"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadFieldProps {
  label: string;
  /** URL actual de la imagen (vacío si no hay). */
  value: string;
  /** Se llama con la nueva URL tras subir, o "" al eliminar. */
  onChange: (url: string) => void;
  helpText?: string;
}

/**
 * Campo para subir una imagen desde el dispositivo (cámara o galería en el
 * celular) en lugar de pedir una URL. Sube a Cloudinary vía /api/upload-image
 * y devuelve la URL. Reemplaza los antiguos inputs de "URL del Logo/Banner"
 * que obligaban al tendero a alojar la imagen en otro lado.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  helpText,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar 5MB");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.secure_url) {
        throw new Error(data.error || "Error al subir la imagen");
      }
      onChange(data.secure_url);
      toast.success(`${label} actualizado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>

      {value ? (
        <div className="flex items-center gap-4">
          <Image
            src={value}
            alt={label}
            width={80}
            height={80}
            className="h-20 w-20 rounded-full border object-cover bg-white"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              Cambiar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => onChange("")}
              disabled={uploading}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Quitar
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed rounded-lg p-6 text-center hover:border-brand transition-colors disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
          ) : (
            <ImageIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          )}
          <p className="text-sm text-gray-600">
            {uploading ? "Subiendo..." : "Toca para subir una imagen desde tu dispositivo"}
          </p>
        </button>
      )}

      {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
