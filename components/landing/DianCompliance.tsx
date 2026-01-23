'use client';

import { Shield, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DianCompliance() {
  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-blue-900 to-blue-700">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400 rounded-full mb-4">
            <Shield className="h-8 w-8 text-blue-900" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            100% Cumplimiento DIAN
          </h2>
          <p className="text-lg text-blue-100 max-w-3xl mx-auto">
            Mantén tu negocio en total legalidad con nuestro sistema de facturación electrónica
            certificado. Evita multas y sanciones costosas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
          <Card className="bg-white/10 border-blue-300 backdrop-blur-sm">
            <CardHeader>
              <FileText className="h-10 w-10 text-yellow-400 mb-2" />
              <CardTitle className="text-white">Facturación Electrónica</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-100 text-sm">
                Sistema de facturación electrónica homologado por la DIAN. Genera facturas válidas
                con firma digital y envío automático a la DIAN.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-blue-300 backdrop-blur-sm">
            <CardHeader>
              <CheckCircle2 className="h-10 w-10 text-green-400 mb-2" />
              <CardTitle className="text-white">Reportes Automáticos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-100 text-sm">
                Generación automática de reportes de IVA, retenciones y declaraciones según los
                ingresos de tu negocio. Nos encargamos del cumplimiento.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-blue-300 backdrop-blur-sm">
            <CardHeader>
              <AlertTriangle className="h-10 w-10 text-orange-400 mb-2" />
              <CardTitle className="text-white">Evita Sanciones</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-100 text-sm">
                Nuestro sistema te mantiene actualizado con los últimos cambios de la DIAN.
                Alertas automáticas para declaraciones y obligaciones tributarias.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-yellow-400 rounded-lg p-6 md:p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            ¿Tu negocio debe declarar renta?
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-gray-900">
            <div>
              <h4 className="font-semibold mb-2">No estás obligado si:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Patrimonio bruto menor a 4.500 UVT (≈$214 millones COP)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Ingresos brutos menores a 1.400 UVT (≈$66 millones COP)</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Debes declarar si superas:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span>Los límites de patrimonio o ingresos</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span>Consumos con tarjeta &gt; 1.400 UVT</span>
                </li>
              </ul>
            </div>
          </div>
          <p className="text-center mt-6 text-sm font-medium">
            Nuestro sistema calcula automáticamente si debes declarar según tus ingresos registrados
          </p>
        </div>
      </div>
    </section>
  );
}
