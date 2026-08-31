import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { landingConfig } from "@/lib/landing-config";

// Enlaces de navegación interna (anclas a secciones de la misma landing).
// Los id correspondientes se definen en app/page.tsx.
const navLinks = [
  { name: "Precios", href: "#precios" },
  { name: "Reseñas", href: "#resenas" },
  { name: "Preguntas frecuentes", href: "#faq" },
];

const accessLinks = [
  { name: "Entrar", href: "/sign-in" },
  { name: "Crear cuenta", href: "/sign-up" },
];

const legalLinks = [
  { name: "Términos y condiciones", href: "/terminos" },
  { name: "Política de privacidad", href: "/privacidad" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-700 bg-gray-800 text-gray-300">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Marca + descripción */}
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-white" translate="no">
              {landingConfig.brand.name}
            </h3>
            <p className="text-sm text-gray-400">
              {landingConfig.brand.tagline}
            </p>
            <p className="max-w-sm text-sm text-gray-400">
              Sistema integral de punto de venta, inventario, facturación y
              gestión de clientes para tiendas en Colombia. Todo lo que necesitas
              en un solo plan.
            </p>
          </div>

          {/* Navegación interna */}
          <div>
            <h4 className="mb-4 text-lg font-semibold text-white">Navegación</h4>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="rounded-sm text-sm text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
              {accessLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-1 rounded-sm text-sm text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
                  >
                    {link.name}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 text-lg font-semibold text-white">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="rounded-sm text-sm text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Barra inferior */}
      <div className="border-t border-gray-700">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 text-center md:flex-row md:text-left">
          <p className="text-xs text-gray-500">
            © {year}{" "}
            <span translate="no">{landingConfig.brand.name}</span> — Todos los
            derechos reservados
          </p>
          <a
            href="https://www.neurai.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-gray-600 bg-gray-700/50 px-3 py-1 text-xs text-gray-300 transition-colors hover:bg-gray-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
          >
            Hecho por neurai.dev
          </a>
        </div>
      </div>
    </footer>
  );
}
