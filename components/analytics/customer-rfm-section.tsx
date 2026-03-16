'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  Trophy,
  AlertTriangle,
  Star,
  RefreshCw,
  TrendingUp,
  Heart,
  Sparkles,
  UserPlus,
  Repeat,
  DollarSign,
  Clock,
  Lightbulb,
  Target,
  Gift,
  PhoneCall,
  Mail,
  MessageCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getCustomerInsights, RFMSegment } from '@/lib/customer-analytics-helpers';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CustomerRFMSectionProps {
  getToken: () => Promise<string | null>;
  daysAnalyzed: number;
}

export function CustomerRFMSection({ getToken, daysAnalyzed }: CustomerRFMSectionProps) {
  const [loading, setLoading] = useState(false);
  const [champions, setChampions] = useState<RFMSegment[]>([]);
  const [atRisk, setAtRisk] = useState<RFMSegment[]>([]);
  const [segments, setSegments] = useState<{ [key: string]: number }>({});
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [newCustomers, setNewCustomers] = useState(0);
  const [returningCustomers, setReturningCustomers] = useState(0);
  const [avgFrequency, setAvgFrequency] = useState(0);
  const [topCustomers, setTopCustomers] = useState<RFMSegment[]>([]);

  const loadCustomerInsights = async () => {
    try {
      setLoading(true);
      const insights = await getCustomerInsights(daysAnalyzed, getToken);

      setChampions(insights.champions);
      setAtRisk(insights.atRiskCustomers);
      setSegments(insights.segments);
      setTotalCustomers(insights.totalCustomers);
      setNewCustomers(insights.newCustomers);
      setReturningCustomers(insights.returningCustomers);
      setAvgFrequency(insights.avgPurchaseFrequency);
      setTopCustomers(insights.topCustomers);

      toast.success('Análisis de clientes completado');
    } catch (error) {
      console.error('Error loading customer insights:', error);
      toast.error('Error al analizar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerInsights();
  }, [daysAnalyzed]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular métricas adicionales
  const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;
  const totalRevenue = topCustomers.reduce((sum, c) => sum + c.monetary, 0);
  const avgTicket = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  const championsPercentage = totalCustomers > 0 ? (champions.length / totalCustomers) * 100 : 0;
  const atRiskPercentage = totalCustomers > 0 ? (atRisk.length / totalCustomers) * 100 : 0;

  // Determinar el estado general del negocio
  const getBusinessHealth = () => {
    if (championsPercentage > 20 && retentionRate > 60) {
      return {
        status: 'excelente',
        icon: '🎉',
        color: 'green',
        message: '¡Tu negocio está excelente! Tienes muchos clientes leales.',
      };
    } else if (championsPercentage > 10 && retentionRate > 40) {
      return {
        status: 'bueno',
        icon: '👍',
        color: 'blue',
        message: 'Tu negocio va bien. Hay oportunidades de mejora.',
      };
    } else if (atRiskPercentage > 30) {
      return {
        status: 'alerta',
        icon: '⚠️',
        color: 'orange',
        message: 'Muchos clientes en riesgo. ¡Necesitas actuar pronto!',
      };
    } else {
      return {
        status: 'regular',
        icon: '💡',
        color: 'yellow',
        message: 'Hay espacio para crecer. Enfócate en retener clientes.',
      };
    }
  };

  const businessHealth = getBusinessHealth();

  // Función para obtener info de cada segmento
  const getSegmentInfo = (segmentName: string) => {
    const segmentMap: { [key: string]: { icon: string; color: string; explanation: string; action: string } } = {
      Champions: {
        icon: '🏆',
        color: 'yellow',
        explanation: 'Tus mejores clientes: compran mucho, gastan mucho y compraron hace poco.',
        action: '✅ Cuídalos mucho, ofréceles beneficios exclusivos y mantén contacto frecuente.',
      },
      Leales: {
        icon: '💙',
        color: 'blue',
        explanation: 'Clientes fieles que compran regularmente y confían en ti.',
        action: '✅ Agradéceles su lealtad, ofréceles descuentos especiales y programas de puntos.',
      },
      'Potencialmente Leales': {
        icon: '⭐',
        color: 'purple',
        explanation: 'Clientes nuevos que están empezando a comprar más seguido. ¡Buen potencial!',
        action: '✅ Dales seguimiento personalizado, ofrece incentivos para que vuelvan pronto.',
      },
      'En Riesgo': {
        icon: '⚠️',
        color: 'red',
        explanation: 'Clientes buenos que NO han comprado recientemente. ¡Pueden irse con la competencia!',
        action: '🚨 URGENTE: Llámales, envíales ofertas especiales, pregunta qué pasó.',
      },
      'Requieren Atención': {
        icon: '👀',
        color: 'orange',
        explanation: 'Clientes que compran poco y no muy seguido. Necesitan motivación.',
        action: '✅ Envía promociones atractivas, descuentos, comunica tus novedades.',
      },
      Nuevos: {
        icon: '🌟',
        color: 'green',
        explanation: 'Clientes que hicieron su primera compra hace poco. ¡Oportunidad de oro!',
        action: '✅ Primera impresión es clave: excelente servicio, bienvenida especial, descuento próxima compra.',
      },
      Prometedores: {
        icon: '🎯',
        color: 'cyan',
        explanation: 'Clientes con buenas señales: compran seguido aunque no mucho aún.',
        action: '✅ Incentívalos a comprar más: combos, ofertas, programa de lealtad.',
      },
      Inactivos: {
        icon: '😴',
        color: 'gray',
        explanation: 'Clientes que hace mucho no compran. Prácticamente perdidos.',
        action: '💭 Considera una campaña de "te extrañamos" con oferta irresistible, o déjalos ir.',
      },
      Ocasionales: {
        icon: '🔄',
        color: 'slate',
        explanation: 'Clientes que compran de vez en cuando, sin patrón claro.',
        action: '✅ Intenta descubrir qué los motiva: encuestas, ofertas personalizadas.',
      },
    };

    return (
      segmentMap[segmentName] || {
        icon: '👤',
        color: 'gray',
        explanation: 'Clientes sin segmento específico.',
        action: 'Analiza su comportamiento para tomar acción.',
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards - Métricas clave explicadas simplemente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-900">{totalCustomers}</p>
                <p className="text-xs text-blue-700">últimos {daysAnalyzed} días</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-blue-900">Total de Clientes</p>
            <p className="text-xs text-blue-700 mt-1">Personas que te compraron</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <UserPlus className="h-8 w-8 text-green-600" />
              <div className="text-right">
                <p className="text-3xl font-bold text-green-900">{newCustomers}</p>
                <p className="text-xs text-green-700">
                  {totalCustomers > 0 ? ((newCustomers / totalCustomers) * 100).toFixed(0) : 0}% del total
                </p>
              </div>
            </div>
            <p className="text-sm font-semibold text-green-900">Clientes Nuevos</p>
            <p className="text-xs text-green-700 mt-1">Primera compra en este período</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Repeat className="h-8 w-8 text-purple-600" />
              <div className="text-right">
                <p className="text-3xl font-bold text-purple-900">{returningCustomers}</p>
                <p className="text-xs text-purple-700">{retentionRate.toFixed(0)}% retención</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-purple-900">Clientes que Regresan</p>
            <p className="text-xs text-purple-700 mt-1">Compraron más de una vez</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 text-orange-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-900">{formatCurrency(avgTicket)}</p>
                <p className="text-xs text-orange-700">{avgFrequency.toFixed(1)} compras/cliente</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-orange-900">Ticket Promedio</p>
            <p className="text-xs text-orange-700 mt-1">Cuánto gasta cada cliente</p>
          </CardContent>
        </Card>
      </div>

      {/* ¿Qué está pasando? - Insight Card */}
      <Card className={`border-2 border-${businessHealth.color}-300 bg-${businessHealth.color}-50`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5" />
            ¿Qué está pasando en tu negocio? {businessHealth.icon}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="font-semibold text-lg mb-2">{businessHealth.message}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Trophy className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {champions.length} Clientes Champions ({championsPercentage.toFixed(0)}%)
                  </p>
                  <p className="text-gray-600">Tus mejores clientes, cuídalos mucho</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {atRisk.length} Clientes en Riesgo ({atRiskPercentage.toFixed(0)}%)
                  </p>
                  <p className="text-gray-600">Clientes buenos que pueden irse, ¡reactivar!</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Heart className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{retentionRate.toFixed(0)}% de Retención</p>
                  <p className="text-gray-600">
                    {retentionRate > 60 ? 'Excelente' : retentionRate > 40 ? 'Bueno' : 'Mejorar'} -{' '}
                    {returningCustomers} clientes volvieron
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{avgFrequency.toFixed(1)} Compras por Cliente</p>
                  <p className="text-gray-600">
                    {avgFrequency > 3 ? 'Muy bueno' : avgFrequency > 2 ? 'Bueno' : 'Puede mejorar'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ¿Qué deberías hacer? - Action Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Target className="h-5 w-5" />
            ¿Qué deberías hacer HOY? (Recomendaciones)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {champions.length > 0 && (
              <div className="flex items-start gap-2 bg-white rounded p-3 border border-blue-200">
                <Gift className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Cuida a tus {champions.length} Champions</p>
                  <p className="text-gray-600">
                    Llámalos para agradecerles, ofréceles descuentos exclusivos o un regalo sorpresa
                  </p>
                </div>
              </div>
            )}
            {atRisk.length > 0 && (
              <div className="flex items-start gap-2 bg-white rounded p-3 border border-red-200">
                <PhoneCall className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-700">URGENTE: Recupera a {atRisk.length} clientes en riesgo</p>
                  <p className="text-gray-600">
                    Envíales un mensaje o llama: "Te extrañamos, tenemos {' '}
                    una oferta especial para ti"
                  </p>
                </div>
              </div>
            )}
            {newCustomers > 0 && (
              <div className="flex items-start gap-2 bg-white rounded p-3 border border-green-200">
                <MessageCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Dale bienvenida a {newCustomers} clientes nuevos</p>
                  <p className="text-gray-600">
                    Envíales un mensaje de bienvenida y un cupón de descuento para su próxima compra
                  </p>
                </div>
              </div>
            )}
            {retentionRate < 40 && (
              <div className="flex items-start gap-2 bg-white rounded p-3 border border-orange-200">
                <Mail className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Mejora tu retención (actualmente {retentionRate.toFixed(0)}%)</p>
                  <p className="text-gray-600">
                    Crea un programa de puntos, ofrece descuentos por volumen, mejora el servicio
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Segmentos Detallados con Explicaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Tus Clientes por Segmento (Explicado Simple)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(segments)
              .sort((a, b) => b[1] - a[1]) // Ordenar por cantidad
              .map(([segment, count]) => {
                const info = getSegmentInfo(segment);
                return (
                  <div key={segment} className={`bg-${info.color}-50 rounded-lg p-4 border border-${info.color}-200`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{info.icon}</span>
                      <span className={`text-3xl font-bold text-${info.color}-900`}>{count}</span>
                    </div>
                    <p className="font-semibold text-sm mb-1">{segment}</p>
                    <p className="text-xs text-gray-700 mb-2">{info.explanation}</p>
                    <div className="bg-white rounded p-2 mt-2 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-900">{info.action}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Champions - Tus Estrellas */}
      {champions.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <Trophy className="h-5 w-5" />
              🏆 Tus Clientes CHAMPIONS - ¡Las Estrellas de tu Negocio!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-lg p-3 mb-4 border border-yellow-200">
              <p className="text-sm font-semibold text-gray-900 mb-1">¿Qué significa esto?</p>
              <p className="text-sm text-gray-700">
                Estos {champions.length} clientes son tu tesoro: compran seguido, gastan mucho y compraron hace poco.{' '}
                <strong>¡Son el corazón de tu negocio!</strong> Si cuidas bien a estos clientes, tu negocio estará
                siempre bien.
              </p>
            </div>
            <div className="space-y-3">
              {champions.slice(0, 5).map((customer) => (
                <div key={customer.customer_id} className="bg-white p-4 rounded-lg border border-yellow-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-lg flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        {customer.customer_name}
                      </p>
                      <p className="text-sm text-gray-600">{customer.segment_description}</p>
                    </div>
                    <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {customer.rfm_score}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">Última compra:</span>
                      <p className="font-semibold">Hace {customer.recency_days} días</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Compras:</span>
                      <p className="font-semibold">{customer.frequency} veces</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Ha gastado:</span>
                      <p className="font-bold text-green-600">{formatCurrency(customer.monetary)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">💚 Cliente Valioso</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">⚡ Compra Frecuente</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* At Risk - ¡Alerta! */}
      {atRisk.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="h-5 w-5" />
              ⚠️ Clientes en RIESGO - ¡Acción URGENTE Necesaria!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-lg p-3 mb-4 border border-red-300">
              <p className="text-sm font-semibold text-red-900 mb-1">⚠️ ¡IMPORTANTE!</p>
              <p className="text-sm text-gray-700">
                Estos {atRisk.length} clientes eran BUENOS (gastaban bien), pero hace tiempo no compran.{' '}
                <strong>Pueden irse con la competencia.</strong> ¡Contáctalos HOY! Una llamada, un mensaje, una oferta
                especial... ¡lo que sea para recuperarlos!
              </p>
            </div>
            <div className="space-y-3">
              {atRisk.slice(0, 5).map((customer) => (
                <div key={customer.customer_id} className="bg-white p-4 rounded-lg border border-red-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{customer.customer_name}</p>
                      <p className="text-sm text-red-600 font-medium">
                        ⏰ Sin comprar {customer.recency_days} días - ¡Contáctalo YA!
                      </p>
                    </div>
                    <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      URGENTE
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">Sin comprar:</span>
                      <p className="font-semibold text-red-600">{customer.recency_days} días</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Compraba:</span>
                      <p className="font-semibold">{customer.frequency} veces</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Gastó antes:</span>
                      <p className="font-bold text-green-600">{formatCurrency(customer.monetary)}</p>
                    </div>
                  </div>
                  <div className="bg-red-100 rounded p-2 text-xs text-red-900">
                    <p className="font-semibold">💡 Qué hacer:</p>
                    <p>
                      1) Llámalo o envía WhatsApp 2) Pregunta cómo está 3) Ofrece descuento especial "te extrañamos"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Explicación Simple RFM */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Sparkles className="h-5 w-5" />
            ¿Cómo funciona esto? (Explicado para humanos normales)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-800 space-y-3">
          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <p className="font-semibold mb-2">🤔 ¿Qué es RFM?</p>
            <p>
              RFM significa <strong>Recency</strong> (¿cuándo compró?), <strong>Frequency</strong> (¿cuántas veces?) y{' '}
              <strong>Monetary</strong> (¿cuánto gastó?). Es un método para saber quiénes son tus mejores clientes y
              quiénes necesitan atención.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <p className="font-semibold">Recency (Reciente)</p>
              </div>
              <p className="text-xs text-gray-700">
                ¿Hace cuánto compró? Si fue hace poco = bueno. Si hace mucho = malo.
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Repeat className="h-4 w-4 text-purple-600" />
                <p className="font-semibold">Frequency (Frecuencia)</p>
              </div>
              <p className="text-xs text-gray-700">
                ¿Cuántas veces compró? Más veces = cliente más leal = mejor.
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <p className="font-semibold">Monetary (Dinero)</p>
              </div>
              <p className="text-xs text-gray-700">
                ¿Cuánto gastó en total? Más dinero = cliente más valioso.
              </p>
            </div>
          </div>
          <div className="bg-yellow-100 rounded-lg p-3 border border-yellow-300">
            <p className="font-semibold text-yellow-900 mb-1">💡 El Score RFM</p>
            <p className="text-xs text-yellow-900">
              Cada cliente recibe un puntaje de 3 números (ej: "555"). Cuanto más alto, mejor. "555" = Cliente
              perfecto. "111" = Cliente que casi no compra.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
