'use client';

import { PlayCircle, MessageSquare, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function VideoTutorials() {
  const [topic, setTopic] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      // Aquí puedes agregar la lógica para enviar el tema a tu backend o Google Forms
      console.log('Tema sugerido:', topic);
      setSubmitted(true);
      setTopic('');
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  const tutorialCategories = [
    {
      title: 'Primeros Pasos',
      description: 'Configuración inicial y tour del sistema',
      icon: '🚀',
    },
    {
      title: 'Punto de Venta',
      description: 'Cómo realizar ventas rápidas y eficientes',
      icon: '💰',
    },
    {
      title: 'Gestión de Inventario',
      description: 'Control de stock, alertas y reabastecimiento',
      icon: '📦',
    },
    {
      title: 'Tienda Online',
      description: 'Configura y personaliza tu tienda web',
      icon: '🌐',
    },
    {
      title: 'Reportes y Analytics',
      description: 'Interpreta tus datos y toma decisiones',
      icon: '📊',
    },
    {
      title: 'Reportes y Exportación',
      description: 'Exporta datos en Excel y genera reportes personalizados',
      icon: '📄',
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-white/5 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500 rounded-full mb-4">
            <PlayCircle className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Aprende a tu Ritmo
          </h2>
          <p className="text-lg text-white/80 max-w-3xl mx-auto">
            Videos tutoriales cortos y claros para que domines el sistema sin complicaciones.
            No necesitas ser experto en tecnología.
          </p>
        </div>

        {/* Tutorial Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
          {tutorialCategories.map((category, index) => (
            <Card key={index} className="bg-gray-800 border-gray-700 hover:border-red-400 transition-all cursor-pointer group">
              <CardHeader>
                <div className="text-4xl mb-2">{category.icon}</div>
                <CardTitle className="text-white text-lg">{category.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm mb-3">{category.description}</p>
                <div className="flex items-center gap-2 text-red-400 text-sm group-hover:gap-3 transition-all">
                  <PlayCircle className="h-4 w-4" />
                  <span>Ver videos</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Suggestion Form */}
        <div className="max-w-2xl mx-auto">
          <Card className="bg-gradient-to-br from-blue-900 to-blue-800 border-blue-400">
            <CardHeader>
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-blue-300" />
                <div>
                  <CardTitle className="text-white">¿Tienes dudas sobre algún tema?</CardTitle>
                  <p className="text-blue-200 text-sm mt-1">
                    Cuéntanos qué te gustaría aprender y crearemos un video tutorial para ti
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ejemplo: ¿Cómo configuro los métodos de pago en la tienda online?"
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-blue-300 text-white placeholder-blue-300/70 focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[100px] resize-y"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-yellow-400 text-blue-900 hover:bg-yellow-500 font-semibold"
                  disabled={submitted}
                >
                  {submitted ? (
                    <>
                      ✓ Tema Enviado - ¡Gracias!
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Sugerencia
                    </>
                  )}
                </Button>
              </form>
              <p className="text-blue-200 text-xs mt-3 text-center">
                Revisamos todas las sugerencias y priorizamos los temas más solicitados
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-white/70 text-sm">
            Todos nuestros videos incluyen subtítulos y transcripciones para mejor comprensión
          </p>
        </div>
      </div>
    </section>
  );
}
