import Link from "next/link";
import { ArrowLeft, ArrowRight, Store, HandHeart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { landingConfig } from "@/lib/landing-config";

export const metadata = {
  title: "Acerca de | posib.dev",
  description:
    "Conoce la historia de posib.dev, el sistema POS pensado para la tienda de barrio colombiana: llevar el control del negocio sin complicarse.",
};

export default function AcercaPage() {
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
          <h1 className="mb-2 text-3xl font-bold text-white">
            Acerca de {landingConfig.brand.name}
          </h1>
          <p className="mb-8 text-base text-gray-400">
            El punto de venta pensado para la tienda de barrio.
          </p>

          <div className="space-y-8 text-sm leading-relaxed text-gray-300">
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
                <Store className="h-5 w-5 text-brand" />
                Por qué existe posib
              </h2>
              <p>
                posib.dev nació de una idea simple: que el tendero de barrio pueda
                llevar el control de su negocio sin complicarse ni gastar de más.
                Muchas tiendas todavía anotan las ventas y los fiados en cuadernos,
                pierden mercancía por vencimiento y no saben con certeza cuánto
                ganan. posib pone orden en todo eso, en el celular que ya tienen.
              </p>
            </section>

            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
                <HandHeart className="h-5 w-5 text-brand" />
                Para quién es
              </h2>
              <p>
                Para la tienda de la esquina, la papelería, la licorera, la
                farmacia, la panadería y todo negocio pequeño que quiera vender
                mejor. No hace falta ser experto en tecnología ni comprar equipos
                costosos: posib funciona desde el navegador, en celular, tablet o
                computador.
              </p>
            </section>

            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
                <Sparkles className="h-5 w-5 text-brand" />
                Nuestro compromiso
              </h2>
              <p>
                Queremos que cada negocio, por pequeño que sea, tenga las mismas
                herramientas que los grandes: control de inventario, cuentas por
                cobrar (fiados), reportes claros de lo que se vende y respaldo de
                su información. Trabajamos para que posib sea fácil de usar, justo
                en su precio y cercano cuando necesites ayuda.
              </p>
            </section>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up" className="inline-block">
              <Button className="bg-brand hover:bg-brand-hover text-white">
                Probar gratis 30 días
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contacto" className="inline-block">
              <Button
                variant="outline"
                className="border-brand/40 text-brand hover:bg-brand-light hover:text-brand-hover"
              >
                Hablar con nosotros
              </Button>
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
