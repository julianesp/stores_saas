'use client';

import Image from 'next/image';
import { Store } from 'lucide-react';

type ClientStore = {
  name: string;
  /** URL de la foto de la tienda. Déjala vacía para mostrar el placeholder. */
  image?: string;
};

// Tiendas que ya usan posib.dev.
// Cuando tengas la foto de una tienda, agrega su URL en `image`.
const stores: ClientStore[] = [
  {
    name: 'Supermercado la 10',
    image: '', // TODO: subir foto de la tienda y pegar la URL aquí
  },
];

export default function ClientStores() {
  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-gray-800 to-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Tiendas que ya confían en posib.dev
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Negocios reales en Colombia que ya venden con nuestro sistema POS.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 md:gap-8 max-w-5xl mx-auto">
          {stores.map((store) => (
            <div
              key={store.name}
              className="flex flex-col items-center text-center w-40 sm:w-48"
            >
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden bg-gray-700/50 border border-gray-600 shadow-lg flex items-center justify-center">
                {store.image ? (
                  <Image
                    src={store.image}
                    alt={store.name}
                    fill
                    sizes="(max-width: 640px) 160px, 192px"
                    className="object-cover"
                  />
                ) : (
                  <Store className="h-16 w-16 text-gray-500" />
                )}
              </div>
              <p className="mt-4 text-white font-semibold text-base sm:text-lg">
                {store.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
