'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StoreCarouselProps {
  images: string[];
  storeName: string;
  storeDescription?: string;
  primaryColor: string;
  secondaryColor: string;
  onExploreClick: () => void;
}

export function StoreCarousel({
  images,
  storeName,
  storeDescription,
  primaryColor,
  onExploreClick,
}: StoreCarouselProps) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % images.length);
  }, [images.length]);

  const prev = () => {
    setCurrent((c) => (c - 1 + images.length) % images.length);
  };

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [images.length, next]);

  if (images.length === 0) return null;

  return (
    <div className="relative w-full h-64 md:h-96 lg:h-[450px] overflow-hidden">
      {images.map((src, index) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === current ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={src}
            alt={`${storeName} - imagen ${index + 1}`}
            fill
            className="object-cover"
            priority={index === 0}
          />
        </div>
      ))}

      {/* Overlay con texto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-end pb-12 md:pb-16">
          <div className="text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-3">{storeName}</h1>
            {storeDescription && (
              <p className="text-lg md:text-2xl text-white/90 max-w-2xl mb-6">
                {storeDescription}
              </p>
            )}
            <Button
              size="lg"
              className="bg-white hover:bg-gray-100 text-gray-900 font-semibold shadow-xl"
              onClick={onExploreClick}
            >
              Ver Productos
            </Button>
          </div>
        </div>
      </div>

      {/* Controles de navegación */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors"
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors"
            aria-label="Imagen siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Indicadores */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === current ? 'bg-white w-4' : 'bg-white/50'
                }`}
                aria-label={`Ir a imagen ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
