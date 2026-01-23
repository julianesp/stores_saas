'use client';

import { Database, PlayCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function FreeMigration() {
  return (
    <section className="py-16 md:py-20 bg-white/5 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500 rounded-full mb-4">
            <Database className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Migración 100% Gratuita
          </h2>
          <p className="text-lg text-white/80 max-w-3xl mx-auto">
            ¿Usas Alegra, MiComercio, o cualquier otro sistema? Te ayudamos a migrar todos tus datos
            sin costo adicional. Sin complicaciones, sin pérdida de información.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          <Card className="bg-gray-800 border-purple-400">
            <CardHeader>
              <Database className="h-10 w-10 text-purple-400 mb-2" />
              <CardTitle className="text-white">Migramos Todo por Ti</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200 text-sm">
                    Productos, inventario y precios
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200 text-sm">
                    Base de datos de clientes completa
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200 text-sm">
                    Historial de ventas y facturas
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200 text-sm">
                    Proveedores y cuentas por cobrar
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200 text-sm">
                    Configuraciones y categorías
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-purple-400">
            <CardHeader>
              <PlayCircle className="h-10 w-10 text-purple-400 mb-2" />
              <CardTitle className="text-white">Video Tutorial Paso a Paso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                <PlayCircle className="h-16 w-16 text-purple-400" />
                {/* Aquí irá tu video tutorial de migración */}
                {/* <video src="/videos/migration-tutorial.mp4" controls className="w-full h-full rounded-lg" /> */}
              </div>
              <p className="text-gray-300 text-sm mb-4">
                Si prefieres hacerlo tú mismo, tenemos un video detallado que te guía en cada paso
                del proceso de migración.
              </p>
              <Button variant="outline" className="w-full border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white">
                Ver Video Tutorial
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 md:p-8 max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-white mb-3">
            Proceso Simple en 3 Pasos
          </h3>
          <div className="grid md:grid-cols-3 gap-6 mt-6">
            <div className="text-white">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">
                1
              </div>
              <h4 className="font-semibold mb-2">Exporta</h4>
              <p className="text-sm text-purple-100">
                Exporta tus datos desde tu sistema actual (te mostramos cómo)
              </p>
            </div>
            <div className="text-white">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">
                2
              </div>
              <h4 className="font-semibold mb-2">Envía</h4>
              <p className="text-sm text-purple-100">
                Nos envías los archivos de forma segura
              </p>
            </div>
            <div className="text-white">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">
                3
              </div>
              <h4 className="font-semibold mb-2">Listo</h4>
              <p className="text-sm text-purple-100">
                En 24-48 horas todo estará migrado y listo para usar
              </p>
            </div>
          </div>
          <Button className="mt-6 bg-white text-purple-700 hover:bg-gray-100">
            Solicitar Migración Gratuita <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
