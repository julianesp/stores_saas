import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { landingConfig } from "@/lib/landing-config";

export const metadata = {
  title: "Términos y condiciones | posib.dev",
  description:
    "Términos y condiciones de uso del sistema POS posib.dev para tiendas en Colombia.",
};

export default function TerminosPage() {
  const lastUpdated = "2026";

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
            Términos y condiciones
          </h1>
          <p className="mb-8 text-sm text-gray-400">
            Última actualización: {lastUpdated}
          </p>

          <div className="space-y-6 text-sm leading-relaxed text-gray-300">
            <section>
              <h2 className="mb-2 text-lg font-semibold text-white">
                1. Aceptación de los términos
              </h2>
              <p>
                Al registrarte y utilizar {landingConfig.brand.name} (el
                &ldquo;Servicio&rdquo;), aceptas estos términos y condiciones. Si
                no estás de acuerdo con ellos, por favor no utilices el Servicio.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-white">
                2. Descripción del servicio
              </h2>
              <p>
                {landingConfig.brand.name} es un sistema de punto de venta (POS)
                para la gestión de ventas, inventario, clientes, proveedores y
                funcionalidades relacionadas, orientado a tiendas y comercios en
                Colombia. Los precios se expresan en pesos colombianos (COP).
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-white">
                3. Suscripción y pagos
              </h2>
              <p>
                El acceso al Servicio se ofrece mediante una suscripción mensual.
                Se ofrece un período de prueba gratuito; finalizado este, el
                acceso continuado requiere una suscripción activa. Los pagos se
                procesan a través de las pasarelas habilitadas. La falta de pago
                puede suspender el acceso a la cuenta.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-white">
                4. Responsabilidades del usuario
              </h2>
              <p>
                Eres responsable de la veracidad de la información registrada, del
                uso adecuado del Servicio y de mantener la confidencialidad de tus
                credenciales de acceso. No debes utilizar el Servicio para fines
                ilícitos.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-white">
                5. Datos y disponibilidad
              </h2>
              <p>
                Realizamos esfuerzos razonables para mantener el Servicio
                disponible y proteger tus datos, pero no garantizamos una
                disponibilidad ininterrumpida. Puedes exportar tu información en
                cualquier momento desde el panel.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-white">
                6. Cookies y analítica web
              </h2>
              <p>
                Este sitio utiliza cookies y tecnologías de terceros para medir
                el rendimiento de nuestra publicidad y mejorar el servicio. En
                particular, empleamos la etiqueta de Google (Google Ads) para
                registrar cuándo un usuario que llega desde uno de nuestros
                anuncios completa una acción, como el registro de una cuenta.
                Estos datos se usan de forma agregada para medir la efectividad
                de las campañas y no para identificarte personalmente.
              </p>
              <p className="mt-2">
                Puedes gestionar o rechazar las cookies desde la configuración
                de tu navegador. Para más información sobre cómo Google utiliza
                estos datos, consulta la{" "}
                <a
                  href="https://policies.google.com/technologies/partner-sites"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand underline"
                >
                  política de privacidad de Google
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-white">
                7. Cambios en los términos
              </h2>
              <p>
                Podemos actualizar estos términos en cualquier momento. Los
                cambios entrarán en vigor al publicarse en esta página.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-white">
                8. Contacto
              </h2>
              <p>
                Para consultas sobre estos términos, escríbenos a{" "}
                <a
                  href={`mailto:${landingConfig.contact.email}`}
                  className="text-brand underline"
                >
                  {landingConfig.contact.email}
                </a>
                .
              </p>
            </section>

            <p className="border-t border-gray-700 pt-6 text-xs text-gray-500">
              Este documento es una plantilla base y no constituye asesoría
              legal. Recomendamos revisarlo con un profesional antes de su
              publicación definitiva.
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
