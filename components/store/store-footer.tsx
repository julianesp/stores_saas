'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Store,
  MapPin,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Home,
  Package,
  ShoppingCart,
  Info,
} from 'lucide-react';
import { StoreConfig } from '@/lib/storefront-api';

interface StoreFooterProps {
  config: StoreConfig;
}

export function StoreFooter({ config }: StoreFooterProps) {
  const params = useParams();
  const slug = params.slug as string;

  const primaryColor = config.store_primary_color || '#3B82F6';
  const storeName = config.store_name || 'Tienda Online';
  const storeDescription = config.store_description || 'Tu tienda de confianza';

  const quickLinks = [
    { name: 'Inicio', href: `/store/${slug}`, icon: Home },
    { name: 'Productos', href: `/store/${slug}#productos`, icon: Package },
    { name: 'Carrito', href: `/store/${slug}/cart`, icon: ShoppingCart },
    { name: 'Información', href: `/store/${slug}#info`, icon: Info },
  ];

  const socialLinks = [
    {
      name: 'Facebook',
      icon: Facebook,
      url: config.store_facebook,
      color: '#1877F2'
    },
    {
      name: 'Instagram',
      icon: Instagram,
      url: config.store_instagram,
      color: '#E4405F'
    },
  ].filter(link => link.url); // Solo mostrar redes sociales configuradas

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      {/* Sección principal del footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Columna 1: Información de la tienda */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${primaryColor}30` }}
              >
                <Store className="h-6 w-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-bold text-white">{storeName}</h3>
            </div>
            <p className="text-sm text-gray-400">
              {storeDescription}
            </p>
            {config.store_address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: primaryColor }} />
                <span>{config.store_address}</span>
              </div>
            )}
          </div>

          {/* Columna 2: Enlaces rápidos */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Enlaces Rápidos</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="flex items-center gap-2 text-sm hover:text-white transition-colors group"
                    >
                      <Icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Columna 3: Contacto */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Contacto</h4>
            <ul className="space-y-3">
              {config.store_phone && (
                <li>
                  <a
                    href={`tel:${config.store_phone}`}
                    className="flex items-center gap-2 text-sm hover:text-white transition-colors group"
                  >
                    <Phone className="h-4 w-4 group-hover:scale-110 transition-transform" style={{ color: primaryColor }} />
                    {config.store_phone}
                  </a>
                </li>
              )}
              {config.store_whatsapp && (
                <li>
                  <a
                    href={`https://wa.me/${config.store_whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-white transition-colors group"
                  >
                    <Phone className="h-4 w-4 group-hover:scale-110 transition-transform" style={{ color: '#25D366' }} />
                    WhatsApp: {config.store_whatsapp}
                  </a>
                </li>
              )}
              {config.store_email && (
                <li>
                  <a
                    href={`mailto:${config.store_email}`}
                    className="flex items-center gap-2 text-sm hover:text-white transition-colors group"
                  >
                    <Mail className="h-4 w-4 group-hover:scale-110 transition-transform" style={{ color: primaryColor }} />
                    {config.store_email}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Columna 4: Redes sociales y opciones de entrega */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Síguenos</h4>
            {socialLinks.length > 0 ? (
              <div className="flex gap-3 mb-6">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all hover:scale-110"
                      aria-label={social.name}
                      style={{ color: social.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-6">
                Próximamente en redes sociales
              </p>
            )}

            {/* Métodos de entrega */}
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-white">Métodos de entrega</h5>
              <div className="space-y-1.5 text-sm text-gray-400">
                {config.store_pickup_enabled && (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                    <span>Retiro en tienda</span>
                  </div>
                )}
                {config.store_shipping_enabled && (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                    <span>Envío a domicilio</span>
                  </div>
                )}
                {!config.store_pickup_enabled && !config.store_shipping_enabled && (
                  <span className="text-xs">Consultar opciones disponibles</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra inferior */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} {storeName}. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-2">
              <span>Powered by</span>
              <Link
                href="/"
                className="font-semibold hover:text-white transition-colors"
                style={{ color: primaryColor }}
              >
                Sistema POS
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
