import Image from 'next/image';
import Link from 'next/link';
import { Store, MapPin } from 'lucide-react';
import { getVisibleLandingStores } from '@/lib/landing-stores';

export default function ClientStores() {
  const stores = getVisibleLandingStores();

  // Si no hay tiendas visibles, no renderizamos la sección.
  if (stores.length === 0) {
    return null;
  }

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
          {stores.map((store) => {
            const card = (
              <>
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
                <p className="mt-1 flex items-center justify-center gap-1 text-sm text-gray-400">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {store.location}
                </p>
              </>
            );

            // La tarjeta enlaza al perfil solo si el perfil público está habilitado.
            return store.profileEnabled ? (
              <Link
                key={store.slug}
                href={`/tienda/${store.slug}`}
                className="flex flex-col items-center text-center w-40 sm:w-48 transition-transform hover:scale-[1.03]"
              >
                {card}
              </Link>
            ) : (
              <div
                key={store.slug}
                className="flex flex-col items-center text-center w-40 sm:w-48"
              >
                {card}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
