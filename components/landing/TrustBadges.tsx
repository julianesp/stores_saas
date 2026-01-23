'use client';

import { Star, Users, TrendingUp, Award, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';

export default function TrustBadges() {
  const [activeStores, setActiveStores] = useState(1);

  useEffect(() => {
    // Fetch active stores count
    fetch('/api/stats/active-stores')
      .then((res) => res.json())
      .then((data) => setActiveStores(data.count))
      .catch(() => setActiveStores(1)); // Fallback to 1 on error
  }, []);
  // Testimoniales reales se agregarán cuando lleguen los primeros clientes
  const hasTestimonials = false;

  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-gray-800 to-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Confían en Nosotros
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Miles de negocios en Colombia ya están creciendo con Posib.dev
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-16">
          <div className="text-center">
            <div className="bg-blue-500/20 rounded-lg p-4 mb-2">
              <Users className="h-8 w-8 text-blue-400 mx-auto" />
            </div>
            <div className="text-3xl font-bold text-white" id="active-stores">{activeStores}+</div>
            <div className="text-sm text-gray-400">Tiendas Activas</div>
          </div>
          <div className="text-center">
            <div className="bg-green-500/20 rounded-lg p-4 mb-2">
              <TrendingUp className="h-8 w-8 text-green-400 mx-auto" />
            </div>
            <div className="text-3xl font-bold text-white">98%</div>
            <div className="text-sm text-gray-400">Satisfacción</div>
          </div>
          <div className="text-center">
            <div className="bg-purple-500/20 rounded-lg p-4 mb-2">
              <Star className="h-8 w-8 text-purple-400 mx-auto" />
            </div>
            <div className="text-3xl font-bold text-white">4.9/5</div>
            <div className="text-sm text-gray-400">Calificación</div>
          </div>
          <div className="text-center">
            <div className="bg-yellow-500/20 rounded-lg p-4 mb-2">
              <Award className="h-8 w-8 text-yellow-400 mx-auto" />
            </div>
            <div className="text-3xl font-bold text-white">100%</div>
            <div className="text-sm text-gray-400">Cumplimiento DIAN</div>
          </div>
        </div>

        {/* Mensaje Motivador */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-400/30">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-blue-500/20 rounded-full p-4">
                  <TrendingUp className="h-12 w-12 text-blue-400" />
                </div>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Sé Parte del Éxito
              </h3>
              <p className="text-lg text-gray-200 mb-6 max-w-2xl mx-auto">
                Únete a los negocios que están transformando su forma de trabajar.
                Con nuestro sistema POS, tendrás todo lo que necesitas para crecer:
                control total de inventario, reportes en tiempo real y herramientas
                profesionales al alcance de tu mano.
              </p>
              <div className="grid md:grid-cols-3 gap-6 mt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">7 días</div>
                  <p className="text-gray-300 text-sm">Prueba gratis sin compromiso</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">24/7</div>
                  <p className="text-gray-300 text-sm">Soporte cuando lo necesites</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-2">100%</div>
                  <p className="text-gray-300 text-sm">Cumplimiento DIAN garantizado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Capterra Badge Placeholder */}
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-4">Próximamente en:</p>
          <div className="inline-block bg-gray-700/50 border border-gray-600 rounded-lg px-8 py-4">
            <p className="text-white font-semibold">Capterra.co</p>
            <p className="text-gray-400 text-xs">En proceso de certificación</p>
          </div>
        </div>
      </div>
    </section>
  );
}
