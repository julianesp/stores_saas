'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const faqs = [
  {
    category: 'General',
    questions: [
      {
        question: '¿Qué es Posib.dev?',
        answer:
          'Posib.dev es un sistema POS (Punto de Venta) completo diseñado para pequeños y medianos negocios en Colombia. Te permite gestionar ventas, inventario, clientes, proveedores y más, todo desde una plataforma fácil de usar.',
      },
      {
        question: '¿Necesito experiencia técnica para usar el sistema?',
        answer:
          'No, nuestro sistema está diseñado para ser intuitivo y fácil de usar. Si sabes usar WhatsApp, puedes usar nuestro POS.',
      },
      {
        question: '¿Funciona sin internet?',
        answer:
          '¡Sí! El sistema funciona completamente offline. Puedes registrar ventas, consultar productos y gestionar clientes sin conexión a internet. Todas las operaciones se guardan localmente y se sincronizan automáticamente cuando recuperas la conexión. Esta es una de nuestras ventajas competitivas más importantes.',
      },
      {
        question: '¿Qué ventajas tiene el modo offline?',
        answer:
          'El modo offline te permite: 1) Seguir vendiendo aunque se caiga el internet, 2) No depender de la velocidad de tu conexión, 3) Trabajar en zonas con mala señal, 4) Mayor velocidad en el POS al no esperar respuestas del servidor. El sistema detecta automáticamente cuando pierdes conexión y te avisa cuándo se recupera.',
      },
    ],
  },
  {
    category: 'Planes y Precios',
    questions: [
      {
        question: '¿Puedo probar el sistema antes de pagar?',
        answer:
          'Sí, todos los planes incluyen 7 días de prueba gratis con acceso completo a todas las funcionalidades. No se requiere tarjeta de crédito para iniciar la prueba.',
      },
      {
        question: '¿Qué plan me conviene?',
        answer:
          'El plan Básico ($24.900/mes) es ideal si estás empezando y solo necesitas el POS e inventario básico. El Profesional ($49.900/mes) incluye tienda online y más productos. El Premium ($79.900/mes) agrega IA y email marketing. Y el plan Empresa es personalizado para grandes operaciones.',
      },
      {
        question: '¿Puedo cambiar de plan después?',
        answer:
          'Sí, puedes actualizar o cambiar tu plan en cualquier momento desde el panel de suscripciones. Los cambios se aplican de inmediato y el cobro se ajusta proporcionalmente.',
      },
      {
        question: '¿Hay costos ocultos?',
        answer:
          'No, el precio que ves es el precio que pagas. No hay cargos ocultos, ni tarifas de instalación. Solo pagas tu plan mensual y listo.',
      },
    ],
  },
  {
    category: 'Facturación Electrónica',
    questions: [
      {
        question: '¿El sistema genera facturas electrónicas ante la DIAN?',
        answer:
          'El sistema genera recibos de venta internos, perfectos para pequeños negocios. Si tu negocio está obligado a facturar electrónicamente ante la DIAN, podemos integrarlo con proveedores autorizados como Alegra o Siigo. Contáctanos para más información.',
      },
      {
        question: '¿Estoy obligado a facturar electrónicamente?',
        answer:
          'Depende de tu nivel de ingresos y tipo de negocio. La DIAN exige facturación electrónica si superas ciertos montos de ingresos anuales. Consulta con tu contador o contáctanos para asesorarte.',
      },
      {
        question: '¿Cómo funciona la integración con proveedores de facturación?',
        answer:
          'Si necesitas facturación electrónica, tú contratas el proveedor (Alegra, Siigo, etc.) y nosotros integramos nuestro sistema con su API para que las facturas se generen automáticamente desde el POS.',
      },
    ],
  },
  {
    category: 'Tienda Online',
    questions: [
      {
        question: '¿Qué incluye la tienda online?',
        answer:
          'La tienda online (disponible desde el plan Profesional) incluye un sitio web completo donde tus clientes pueden ver productos, agregar al carrito y hacer pedidos. Se sincroniza automáticamente con tu inventario.',
      },
      {
        question: '¿Puedo personalizar mi tienda online?',
        answer:
          'Sí, puedes personalizar colores, logo, información de contacto y horarios de atención. En el plan Empresa ofrecemos personalización avanzada.',
      },
      {
        question: '¿Cómo funcionan los pagos en línea?',
        answer:
          'Integramos con pasarelas de pago colombianas como Wompi, Nequi y ePayco. Los clientes pueden pagar con tarjeta de crédito, débito, PSE o Nequi directamente desde tu tienda.',
      },
    ],
  },
  {
    category: 'Soporte y Seguridad',
    questions: [
      {
        question: '¿Qué tipo de soporte ofrecen?',
        answer:
          'Todos los planes incluyen soporte por email y chat en vivo. Los planes Premium y Empresa incluyen soporte prioritario. También tenemos videotutoriales y documentación completa.',
      },
      {
        question: '¿Mis datos están seguros?',
        answer:
          'Sí, usamos encriptación de nivel bancario y almacenamos tus datos en servidores seguros con respaldos automáticos diarios. Cumplimos con todas las regulaciones de protección de datos.',
      },
      {
        question: '¿Puedo exportar mis datos si decido cambiar de sistema?',
        answer:
          'Sí, puedes exportar todos tus datos (productos, clientes, ventas, etc.) en cualquier momento en formato Excel o CSV.',
      },
    ],
  },
];

export default function FAQ() {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section className="py-16 md:py-20 bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-500/20 rounded-full p-3">
              <HelpCircle className="h-10 w-10 text-blue-400" />
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Preguntas Frecuentes
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Encuentra respuestas a las preguntas más comunes sobre nuestro sistema POS
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-8 bg-blue-500 rounded"></span>
                {category.category}
              </h3>
              <div className="space-y-3">
                {category.questions.map((faq, questionIndex) => {
                  const id = `${categoryIndex}-${questionIndex}`;
                  const isOpen = openItems.includes(id);

                  return (
                    <Card
                      key={id}
                      className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors"
                    >
                      <button
                        onClick={() => toggleItem(id)}
                        className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <h4 className="text-lg font-semibold text-white pr-8">
                            {faq.question}
                          </h4>
                          <ChevronDown
                            className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform ${
                              isOpen ? 'transform rotate-180' : ''
                            }`}
                          />
                        </div>
                        {isOpen && (
                          <CardContent className="pt-4 pb-2 px-0">
                            <p className="text-gray-300 leading-relaxed">
                              {faq.answer}
                            </p>
                          </CardContent>
                        )}
                      </button>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* CTA de contacto */}
        <div className="mt-12 text-center">
          <p className="text-white/80 mb-4">¿No encuentras lo que buscas?</p>
          <a
            href="https://wa.me/573174503604?text=Hola,%20tengo%20una%20pregunta%20sobre%20el%20sistema%20POS"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            Contáctanos por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
