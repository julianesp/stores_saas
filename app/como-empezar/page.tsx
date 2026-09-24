import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Cómo empezar | posib.dev",
  description:
    "Empieza con posib.dev en minutos: crea tu cuenta con 30 días de prueba gratis, configura tu tienda, carga tus productos y haz tu primera venta.",
};

const pasos = [
  {
    titulo: "Crea tu cuenta gratis",
    texto:
      "Regístrate en segundos y prueba posib gratis por 30 días. No necesitas tarjeta de crédito ni instalar nada: funciona desde el navegador de tu celular, tablet o computador.",
  },
  {
    titulo: "Configura tu tienda",
    texto:
      "Ponle el nombre a tu negocio y ajusta lo básico. Puedes elegir el tipo de tienda (abarrotes, papelería, licorera, farmacia y más) para que el sistema se adapte a ti.",
  },
  {
    titulo: "Carga tus productos",
    texto:
      "Agrega tus productos con precio y stock. Puedes escanear códigos de barras con la cámara para hacerlo más rápido, o cargarlos poco a poco mientras vendes.",
  },
  {
    titulo: "Haz tu primera venta",
    texto:
      "Registra una venta en efectivo, Nequi o a crédito (fiado). Verás lo fácil que es cobrar y llevar la cuenta. Desde ahí, cada venta queda registrada sola.",
  },
  {
    titulo: "Lleva el control de tu negocio",
    texto:
      "Consulta tus reportes de ventas, controla los fiados y el inventario, y recibe alertas de stock bajo o productos por vencer. Todo tu negocio, en orden y a la vista.",
  },
];

export default function ComoEmpezarPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-600 to-gray-200">
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <article className="rounded-2xl bg-gray-800 p-6 text-gray-200 shadow-2xl md:p-10">
          <h1 className="mb-2 text-3xl font-bold text-white">Cómo empezar</h1>
          <p className="mb-8 text-base text-gray-400">
            En unos pocos pasos tendrás tu negocio funcionando con posib.
          </p>

          <ol className="space-y-6">
            {pasos.map((paso, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-base font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {paso.titulo}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-gray-300">
                    {paso.texto}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10">
            <Link href="/sign-up" className="inline-block">
              <Button className="bg-brand hover:bg-brand-hover text-white">
                Crear mi cuenta gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
