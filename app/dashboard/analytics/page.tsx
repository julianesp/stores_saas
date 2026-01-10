"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  Brain,
  Download,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Package,
  BarChart,
  Lock,
  Sparkles,
  Users,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  analyzeProductSales,
  ProductAnalytics,
} from "@/lib/cloudflare-analytics-helpers";
import { exportAnalyticsToExcel } from "@/lib/excel-export";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { getUserProfile, getSales } from "@/lib/cloudflare-api";
import { hasAIAccess } from "@/lib/cloudflare-subscription-helpers";
import { UserProfile } from "@/lib/types";
import Link from "next/link";
import { AIInsightsSection } from "@/components/analytics/ai-insights-section";
import { ProductRecommendationsSection } from "@/components/analytics/product-recommendations-section";
import { CustomerRFMSection } from "@/components/analytics/customer-rfm-section";
import AdvancedMetricsDashboard from "@/components/analytics/advanced-metrics-dashboard";

export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [analytics, setAnalytics] = useState<ProductAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [daysToAnalyze, setDaysToAnalyze] = useState(30);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    if (!user) return;

    try {
      const profile = await getUserProfile(getToken);
      if (profile) {
        setUserProfile(profile);
        const access = hasAIAccess(profile);
        setHasAccess(access);

        if (access) {
          runAnalysis();
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      const data = await analyzeProductSales(daysToAnalyze, getToken);
      setAnalytics(data);
      toast.success("Análisis completado exitosamente");
    } catch (error) {
      console.error("Error running analysis:", error);
      toast.error("Error al realizar el análisis");
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (analytics.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }
    exportAnalyticsToExcel(analytics);
    toast.success("Análisis exportado a Excel exitosamente");
  };

  const criticalProducts = analytics.filter((p) => p.risk_level === "critical");
  const warningProducts = analytics.filter((p) => p.risk_level === "warning");
  const topSelling = analytics.slice(0, 10);
  const productsToOrder = analytics.filter(
    (p) => p.recommended_order_quantity > 0
  );

  const totalRevenue = analytics.reduce((sum, p) => sum + p.total_revenue, 0);
  const totalSales = analytics.reduce(
    (sum, p) => sum + p.total_quantity_sold,
    0
  );
  const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  // Preparar datos para IA
  const salesData = {
    totalRevenue,
    totalSales,
    topProducts: topSelling.slice(0, 3).map((p) => ({
      name: p.product_name,
      revenue: p.total_revenue,
      quantity: p.total_quantity_sold,
    })),
    criticalProducts: criticalProducts.length,
    avgTicket,
  };

  const customerData = {
    totalCustomers: 0, // Se calculará en el componente RFM
    newCustomers: 0,
    returningCustomers: 0,
    avgPurchaseFrequency: 0,
  };

  const inventoryForRecommendations = analytics.slice(0, 20).map((p) => ({
    name: p.product_name,
    category: "", // Podrías agregar categoría si la tienes
    stock: p.current_stock,
    salesVelocity: p.sales_velocity,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Brain className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-pulse" />
          <p className="text-gray-500">Analizando datos con IA...</p>
        </div>
      </div>
    );
  }

  // Si no tiene acceso, mostrar pantalla de bloqueo
  if (!hasAccess) {
    const isTrial = userProfile?.subscription_status === "trial";
    const isActive = userProfile?.subscription_status === "active";

    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="max-w-2xl w-full border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Análisis IA
              </h2>
              <p className="text-lg text-gray-600">
                Desbloquea el poder de la inteligencia artificial para tu
                negocio
              </p>
            </div>
            c
            {isTrial ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800">
                  <strong>¡Hola!</strong> Estás en período de prueba pero parece
                  que hubo un problema verificando tu acceso. Por favor recarga
                  la página o contacta a soporte.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-lg p-6 mb-6 text-left">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    ¿Qué incluye el Análisis IA?
                  </h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>
                        Análisis inteligente de ventas y predicciones precisas
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>
                        Predicciones de inventario para evitar agotamientos
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>
                        Recomendaciones automáticas de pedidos optimizados
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Reportes avanzados exportables a Excel</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>
                        Identificación de productos críticos en tiempo real
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="mb-6">
                  <p className="text-2xl font-bold text-purple-600 mb-2">
                    Incluido en el Plan Premium
                  </p>
                  <p className="text-sm text-gray-500">
                    {isActive
                      ? "Actualiza al Plan Premium para usar Análisis IA"
                      : "✨ GRATIS durante los 15 días de prueba"}
                  </p>
                </div>

                <Link href="/dashboard/subscription">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    {isActive
                      ? "Actualizar a Plan Premium"
                      : "Ver Planes y Activar Prueba Gratis"}
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            Análisis Inteligente con IA
          </h1>
          <p className="text-gray-500 text-sm md:text-base">
            Insights, predicciones y recomendaciones personalizadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              runAnalysis();
            }}
            disabled={analyzing}
          >
            <BarChart className="mr-2 h-4 w-4" />
            {analyzing ? "Analizando..." : "Actualizar"}
          </Button>
          <Button onClick={handleExport} disabled={analytics.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar a Excel
          </Button>
        </div>
      </div>

      {/* Tabs para diferentes secciones */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex w-auto min-w-full lg:min-w-0">
            <TabsTrigger value="overview" className="shrink-0">
              <BarChart className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="shrink-0">
              <TrendingUp className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Avanzado</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="shrink-0">
              <Brain className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Diagnóstico</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="shrink-0">
              <Users className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="shrink-0">
              <ShoppingBag className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Tendencias</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="shrink-0">
              <Package className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Inventario</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Estadísticas Generales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      Productos Analizados
                    </p>
                    <p className="text-2xl font-bold">{analytics.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Productos Críticos</p>
                    <p className="text-2xl font-bold text-red-600">
                      {criticalProducts.length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      Productos en Advertencia
                    </p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {warningProducts.length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Productos a Pedir</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {productsToOrder.length}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top 10 Productos Más Vendidos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Top 10 Productos Más Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topSelling.map((product, index) => (
                  <div
                    key={product.product_id}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {product.product_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {product.total_quantity_sold} unidades •{" "}
                        {product.sales_velocity} und/día
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(product.total_revenue)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Disponible: {product.current_stock}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Productos Críticos */}
          {criticalProducts.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  Productos Críticos - ¡Acción Inmediata Requerida!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {criticalProducts.map((product) => (
                    <div
                      key={product.product_id}
                      className="bg-white p-4 rounded-lg border border-red-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-lg">
                            {product.product_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {product.product_barcode}
                          </p>
                        </div>
                        <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          URGENTE
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">
                            Cantidad Actual:
                          </span>
                          <p className="font-semibold text-red-600">
                            {product.current_stock}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Velocidad:</span>
                          <p className="font-semibold">
                            {product.sales_velocity} und/día
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">
                            Días hasta agotarse:
                          </span>
                          <p className="font-semibold text-red-600">
                            {product.days_until_stockout}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Pedir:</span>
                          <p className="font-bold text-blue-600 text-lg">
                            {product.recommended_order_quantity} unidades
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Productos en Advertencia */}
          {warningProducts.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-5 w-5" />
                  Productos en Advertencia - Planear Pedido Pronto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {warningProducts.map((product) => (
                    <div
                      key={product.product_id}
                      className="bg-white p-4 rounded-lg border border-yellow-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">
                            {product.product_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {product.product_barcode}
                          </p>
                        </div>
                        <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          ADVERTENCIA
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Disponible:</span>
                          <p className="font-semibold">
                            {product.current_stock}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Días restantes:</span>
                          <p className="font-semibold">
                            {product.days_until_stockout}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Velocidad:</span>
                          <p className="font-semibold">
                            {product.sales_velocity} und/día
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Pedir:</span>
                          <p className="font-bold text-blue-600">
                            {product.recommended_order_quantity} unidades
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Explicación de la IA */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Brain className="h-5 w-5" />
                Cómo Funciona el Análisis de IA
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-900 space-y-2">
              <p>
                <strong>🧮 Velocidad de Venta:</strong> Calculamos cuántas
                unidades se venden por día en promedio, basado en los últimos{" "}
                {daysToAnalyze} días de ventas.
              </p>
              <p>
                <strong>📊 Predicción de Agotamiento:</strong> Estimamos cuántos
                días quedan antes de que el producto se agote, considerando la
                cantidad actual y la velocidad de venta.
              </p>
              <p>
                <strong>🎯 Cantidad Recomendada:</strong> Calculamos la cantidad
                óptima a pedir para mantener 30 días de inventario, más un
                margen de seguridad basado en el mínimo disponible.
              </p>
              <p>
                <strong>⚠️ Niveles de Riesgo:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>
                  <strong>Crítico:</strong> Cantidad por debajo del mínimo o se
                  agotará en 3 días o menos
                </li>
                <li>
                  <strong>Advertencia:</strong> Se agotará en 7 días o menos
                </li>
                <li>
                  <strong>Bien:</strong> Cantidad suficiente para más de 7 días
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Métricas Avanzadas */}
        <TabsContent value="advanced" className="space-y-6">
          <AdvancedMetricsDashboard />
        </TabsContent>

        {/* Tab: Diagnóstico IA */}
        <TabsContent value="insights" className="space-y-6">
          <AIInsightsSection
            salesData={salesData}
            customerData={customerData}
            daysAnalyzed={daysToAnalyze}
          />
        </TabsContent>

        {/* Tab: Clientes */}
        <TabsContent value="customers" className="space-y-6">
          <CustomerRFMSection
            getToken={getToken}
            daysAnalyzed={daysToAnalyze}
          />
        </TabsContent>

        {/* Tab: Tendencias */}
        <TabsContent value="trends" className="space-y-6">
          <ProductRecommendationsSection
            currentInventory={inventoryForRecommendations}
            storeType="Tienda General"
          />
        </TabsContent>

        {/* Tab: Inventario */}
        <TabsContent value="inventory" className="space-y-6">
          {/* Productos Críticos */}
          {criticalProducts.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  Productos Críticos - ¡Acción Inmediata Requerida!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {criticalProducts.map((product) => (
                    <div
                      key={product.product_id}
                      className="bg-white p-4 rounded-lg border border-red-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-lg">
                            {product.product_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {product.product_barcode}
                          </p>
                        </div>
                        <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          URGENTE
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">
                            Cantidad Actual:
                          </span>
                          <p className="font-semibold text-red-600">
                            {product.current_stock}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Velocidad:</span>
                          <p className="font-semibold">
                            {product.sales_velocity} und/día
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">
                            Días hasta agotarse:
                          </span>
                          <p className="font-semibold text-red-600">
                            {product.days_until_stockout}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Pedir:</span>
                          <p className="font-bold text-blue-600 text-lg">
                            {product.recommended_order_quantity} unidades
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Productos en Advertencia */}
          {warningProducts.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-5 w-5" />
                  Productos en Advertencia - Planear Pedido Pronto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {warningProducts.map((product) => (
                    <div
                      key={product.product_id}
                      className="bg-white p-4 rounded-lg border border-yellow-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">
                            {product.product_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {product.product_barcode}
                          </p>
                        </div>
                        <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          ADVERTENCIA
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Disponible:</span>
                          <p className="font-semibold">
                            {product.current_stock}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Días restantes:</span>
                          <p className="font-semibold">
                            {product.days_until_stockout}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Velocidad:</span>
                          <p className="font-semibold">
                            {product.sales_velocity} und/día
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Pedir:</span>
                          <p className="font-bold text-blue-600">
                            {product.recommended_order_quantity} unidades
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
