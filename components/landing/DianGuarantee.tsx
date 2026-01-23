'use client';

import { BadgeCheck, RefreshCw, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function DianGuarantee() {
  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-green-900 to-emerald-700">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-400 rounded-full mb-4">
              <BadgeCheck className="h-12 w-12 text-green-900" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Garantía de Reportes DIAN
            </h2>
            <p className="text-lg text-green-100">
              Estamos tan seguros de nuestro sistema que ofrecemos una garantía única en el mercado
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white/10 border-green-300 backdrop-blur-sm">
              <CardContent className="pt-6 text-center">
                <Shield className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Servicio Premium</h3>
                <p className="text-green-100 text-sm">
                  Por un pago adicional mensual, presentamos tus reportes DIAN de manera profesional
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-green-300 backdrop-blur-sm">
              <CardContent className="pt-6 text-center">
                <BadgeCheck className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">100% Garantizado</h3>
                <p className="text-green-100 text-sm">
                  Verificamos cada reporte antes de presentarlo a la DIAN para asegurar su exactitud
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-green-300 backdrop-blur-sm">
              <CardContent className="pt-6 text-center">
                <RefreshCw className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Devolución de Dinero</h3>
                <p className="text-green-100 text-sm">
                  Si un reporte tiene errores, te devolvemos el pago de ese mes completo
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-yellow-400 rounded-lg p-6 text-center">
            <p className="text-gray-900 font-bold text-lg mb-2">
              Esta garantía solo la puede ofrecer quien confía en su tecnología
            </p>
            <p className="text-gray-800 text-sm">
              Mantenemos nuestro sistema actualizado con cada cambio de la DIAN para que siempre
              estés en cumplimiento
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
