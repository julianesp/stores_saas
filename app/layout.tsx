import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import Script from 'next/script';
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_DESCRIPTION =
  'Sistema POS (punto de venta) en Colombia para tiendas, minimarkets y negocios de barrio. Gestiona ventas, inventario, facturación, clientes y ventas a crédito con pagos en efectivo y Nequi. Pruébalo gratis 15 días.';

export const metadata: Metadata = {
  title: {
    default: 'Posib.dev | Sistema POS y punto de venta para tiendas en Colombia',
    template: '%s | Posib.dev',
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL('https://posib.dev'),
  applicationName: 'posib.dev',
  keywords: [
    'sistema POS',
    'punto de venta',
    'software POS Colombia',
    'sistema punto de venta',
    'programa para tiendas',
    'software de inventario',
    'gestión de inventario',
    'facturación electrónica',
    'sistema para tiendas de barrio',
    'control de ventas',
    'software para minimarket',
    'caja registradora digital',
    'ventas a crédito',
    'POS Nequi',
    'administrar tienda',
  ],
  authors: [{ name: 'posib.dev' }],
  creator: 'posib.dev',
  publisher: 'posib.dev',
  category: 'business',
  alternates: {
    canonical: 'https://posib.dev',
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://posib.dev',
    title: 'Posib.dev | Sistema POS y punto de venta para tiendas en Colombia',
    description: SITE_DESCRIPTION,
    siteName: 'posib.dev',
    images: [
      {
        url: 'https://pub-ea40242d92ce470fbb6e43d46f01cefe.r2.dev/images/logo.png',
        secureUrl: 'https://pub-ea40242d92ce470fbb6e43d46f01cefe.r2.dev/images/logo.png',
        width: 1200,
        height: 630,
        alt: 'posib.dev - Sistema POS para tiendas en Colombia',
        type: 'image/png',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Posib.dev | Sistema POS para tiendas en Colombia',
    description: SITE_DESCRIPTION,
    images: [
      {
        url: 'https://pub-ea40242d92ce470fbb6e43d46f01cefe.r2.dev/images/logo.png',
        alt: 'posib.dev - Sistema POS para tiendas en Colombia',
      }
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: 'https://pub-ea40242d92ce470fbb6e43d46f01cefe.r2.dev/images/logo.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: 'https://pub-ea40242d92ce470fbb6e43d46f01cefe.r2.dev/images/logo.png', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'posib.dev',
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#007C80",
};

// Datos estructurados (Schema.org) para que los buscadores entiendan que es
// un software de punto de venta y puedan mostrar resultados enriquecidos.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'posib.dev',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: SITE_DESCRIPTION,
  url: 'https://posib.dev',
  inLanguage: 'es-CO',
  image: 'https://pub-ea40242d92ce470fbb6e43d46f01cefe.r2.dev/images/logo.png',
  areaServed: {
    '@type': 'Country',
    name: 'Colombia',
  },
  offers: {
    '@type': 'Offer',
    price: '24900',
    priceCurrency: 'COP',
    description: 'Plan Básico mensual. Incluye 15 días de prueba gratis.',
  },
  featureList: [
    'Punto de venta (POS)',
    'Control de inventario',
    'Facturación',
    'Gestión de clientes',
    'Ventas a crédito y cuentas por cobrar',
    'Reportes y analítica de ventas',
    'Pagos en efectivo y Nequi',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased `}
        >
          <Script
            id="json-ld-software"
            type="application/ld+json"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <Script
            src="https://checkout.epayco.co/checkout.js"
            strategy="lazyOnload"
          />
          {children}
          <Analytics />
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              style: {
                marginTop: '10px',
              },
              className: 'toast-below-cart',
            }}
          />
          
        </body>
      </html>
    </ClerkProvider>
  );
}
