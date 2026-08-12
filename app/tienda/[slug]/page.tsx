import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Store,
  MapPin,
  Phone,
  Mail,
  Navigation,
  ArrowLeft,
  Facebook,
  Instagram,
} from 'lucide-react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL ||
  'https://tienda-pos-api.julii1295.workers.dev';

interface StoreProfile {
  name: string;
  location: string;
  image: string;
  description: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  facebook: string;
  instagram: string;
  mapsUrl: string;
}

async function getProfile(slug: string): Promise<StoreProfile | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/stats/client-stores/${encodeURIComponent(slug)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? (data.store as StoreProfile) : null;
  } catch {
    return null;
  }
}

/** Normaliza un WhatsApp colombiano a enlace wa.me. */
function whatsappLink(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const withCountry = digits.length === 10 ? `57${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfile(slug);

  if (!profile) {
    return { title: 'Tienda no encontrada · posib.dev' };
  }

  return {
    title: `${profile.name} · posib.dev`,
    description:
      profile.description || `${profile.name} en ${profile.location}.`,
    openGraph: profile.image
      ? { images: [{ url: profile.image }] }
      : undefined,
  };
}

export default async function StoreProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getProfile(slug);

  if (!profile) {
    notFound();
  }

  const hasContact =
    profile.phone ||
    profile.whatsapp ||
    profile.email ||
    profile.facebook ||
    profile.instagram;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a posib.dev
        </Link>

        {/* Imagen de la tienda */}
        <div className="relative mx-auto mb-6 flex h-56 w-56 items-center justify-center overflow-hidden rounded-3xl border border-gray-700 bg-gray-800 shadow-2xl sm:h-64 sm:w-64">
          {profile.image ? (
            <Image
              src={profile.image}
              alt={profile.name}
              fill
              sizes="256px"
              className="object-cover"
              priority
            />
          ) : (
            <Store className="h-24 w-24 text-gray-600" />
          )}
        </div>

        {/* Nombre y ubicación */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">{profile.name}</h1>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-gray-400">
            <MapPin className="h-4 w-4 shrink-0" />
            {profile.location}
          </p>
          {profile.description && (
            <p className="mx-auto mt-4 max-w-xl text-gray-300">
              {profile.description}
            </p>
          )}
        </div>

        {/* Botón principal: cómo llegar */}
        {profile.mapsUrl && (
          <a
            href={profile.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-4 text-lg font-semibold text-white shadow-lg transition-transform hover:scale-[1.01] hover:opacity-95"
          >
            <Navigation className="h-5 w-5" />
            Cómo llegar
          </a>
        )}

        {/* Dirección en texto */}
        {profile.address && (
          <div className="mb-6 rounded-xl border border-gray-700 bg-gray-800/50 p-4 text-center">
            <p className="text-sm text-gray-400">Dirección</p>
            <p className="mt-1 font-medium">{profile.address}</p>
          </div>
        )}

        {/* Contacto */}
        {hasContact && (
          <div className="space-y-3">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-gray-500">
              Contacto
            </h2>

            {profile.whatsapp && (
              <a
                href={whatsappLink(profile.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/50 p-4 transition-colors hover:border-green-500/50 hover:bg-gray-800"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/15 text-green-400">
                  <Phone className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs text-gray-400">WhatsApp</p>
                  <p className="font-medium">{profile.whatsapp}</p>
                </div>
              </a>
            )}

            {profile.phone && (
              <a
                href={`tel:${profile.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/50 p-4 transition-colors hover:border-brand/50 hover:bg-gray-800"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-brand">
                  <Phone className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs text-gray-400">Teléfono</p>
                  <p className="font-medium">{profile.phone}</p>
                </div>
              </a>
            )}

            {profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/50 p-4 transition-colors hover:border-brand/50 hover:bg-gray-800"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-brand">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs text-gray-400">Correo</p>
                  <p className="font-medium break-all">{profile.email}</p>
                </div>
              </a>
            )}

            {(profile.facebook || profile.instagram) && (
              <div className="flex items-center justify-center gap-4 pt-2">
                {profile.facebook && (
                  <a
                    href={profile.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-700 bg-gray-800/50 text-blue-400 transition-colors hover:bg-gray-800"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {profile.instagram && (
                  <a
                    href={profile.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-700 bg-gray-800/50 text-pink-400 transition-colors hover:bg-gray-800"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        <p className="mt-12 text-center text-xs text-gray-600">
          Este negocio usa{' '}
          <Link href="/" className="text-brand hover:underline">
            posib.dev
          </Link>{' '}
          como sistema de punto de venta.
        </p>
      </div>
    </div>
  );
}
