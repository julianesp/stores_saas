import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { landingConfig } from "@/lib/landing-config";

export const metadata = {
  title: "Política de privacidad | posib.dev",
  description:
    "Política de privacidad y tratamiento de datos personales de posib.dev.",
};

export default function PrivacidadPage() {
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
            Política de privacidad
          </h1>
          <p className="mb-8 text-sm text-gray-400">
            Última actualización: {lastUpdated}
          </p>

          <div className="space-y-6 text-sm leading-relaxed text-gray-300">
            <section>
              <h2 className="mb-2 text-lg font-semibold text-white">
                1. Responsable del tratamiento
              </h2>
              <p>
                {landingConfig.brand.name} es responsable del tratamiento de los
                datos personales que recopila para prestar el Servicio. Esta
                política se rige por la normativa colombiana de protección de
                datos personales (Ley 1581 de 2012 y normas concordantes).
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-white">
                2. Datos que recopilamos
              </h2>
              <p>
                Recopilamos datos de la cuenta (nombre, correo electrónico,
                información de la tienda) y los datos operativos que registras en
                el sistema (ventas, inventario, clientes y proveedores). Los datos
                de tus clientes que ingreses son tratados por cuenta tuya.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-white">
                3. Finalidad del tratamiento
              </h2>
              <p>
                Usamos los datos para operar y mejorar el Servicio, procesar pagos
                de suscripción, brindar soporte y enviar comunicaciones
                relacionadas con tu cuenta.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-white">
                4. Compartir información
              </h2>
              <p>
                No vendemos tus datos. Podemos compartirlos con proveedores que
                nos ayudan a prestar el Servicio (por ejemplo, pasarelas de pago y
                proveedores de infraestructura), únicamente en la medida necesaria
                para su funcionamiento.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-white">
                5. Tus derechos
              </h2>
              <p>
                Tienes derecho a conocer, actualizar, rectificar y solicitar la
                supresión de tus datos personales, así como a revocar la
                autorización otorgada. Puedes exportar tu información desde el
                panel en cualquier momento.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-white">
                6. Seguridad
              </h2>
              <p>
                Aplicamos medidas técnicas y organizativas razonables para
                proteger los datos personales frente a accesos no autorizados,
                pérdida o alteración.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-white">
                7. Contacto
              </h2>
              <p>
                Para ejercer tus derechos o realizar consultas sobre el
                tratamiento de datos, escríbenos a{" "}
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
