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

export const metadata: Metadata = {
  title: "posib.dev - Sistema POS",
  description: "Sistema completo de punto de venta y gestión de inventario para tiendas",
  metadataBase: new URL('https://posib.dev'),
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://posib.dev',
    title: 'posib.dev - Sistema POS',
    description: 'Sistema completo de punto de venta y gestión de inventario para tiendas',
    siteName: 'posib.dev',
    images: [
      {
        url: '/og-image.png',
        secureUrl: 'https://posib.dev/og-image.png',
        width: 1200,
        height: 630,
        alt: 'posib.dev - Sistema POS',
        type: 'image/png',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'posib.dev - Sistema POS',
    description: 'Sistema completo de punto de venta y gestión de inventario para tiendas',
    images: [
      {
        url: 'https://posib.dev/og-image.png',
        alt: 'posib.dev - Sistema POS',
      }
    ],
  },
  icons: {
    icon: [
      { url: 'https://0dwas2ied3dcs14f.public.blob.vercel-storage.com/tienda_pos/posib_logo.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: 'https://0dwas2ied3dcs14f.public.blob.vercel-storage.com/tienda_pos/posib_logo.png', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'posib.dev',
  },
  applicationName: 'posib.dev',
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
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
