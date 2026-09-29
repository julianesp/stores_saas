'use client';

import { useRef, useState } from 'react';
import { Camera, Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const MAX_SIDE_PX = 1024;

async function resizeToJpegBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la foto.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}

interface SuggestNameFromPhotoProps {
  /** Nombre actual del producto; se envía solo como pista para la IA. */
  currentName?: string;
  /** Se llama solo cuando la persona pulsa "Usar" en la sugerencia. */
  onUse: (name: string) => void;
}

export function SuggestNameFromPhoto({ currentName, onUse }: SuggestNameFromPhotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState('');

  const handleFile = async (file: File) => {
    setLoading(true);
    setSuggestion('');
    try {
      const imageBase64 = await resizeToJpegBase64(file);
      const res = await fetch('/api/ai/suggest-product-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg', currentName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo leer la foto.');

      if (!data.name) {
        toast.warning('No se alcanza a leer el empaque. Toma la foto de frente y con buena luz.');
        return;
      }
      setSuggestion(data.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo leer la foto.');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Camera className="mr-2 h-4 w-4" />
        )}
        {loading ? 'Leyendo la foto...' : 'Sugerir nombre con foto'}
      </Button>

      {suggestion && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-500">Sugerencia:</span>
          <strong>{suggestion}</strong>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onUse(suggestion);
              setSuggestion('');
            }}
          >
            <Check className="mr-1 h-4 w-4" />
            Usar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label="Descartar sugerencia"
            onClick={() => setSuggestion('')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
