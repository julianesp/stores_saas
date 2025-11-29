import Link from 'next/link';
import { ShoppingCart, Package, BarChart3, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">Sistema POS</h1>
          <div className="flex gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Iniciar Sesión</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Registrarse</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6">
          Gestión Completa para tu Tienda
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Sistema integral de punto de venta, inventario y facturación.
          Todo lo que necesitas para administrar tu negocio en un solo lugar.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/sign-up">
            <Button size="lg" className="text-lg">
              Comenzar Ahora <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="text-lg">
              Ver Demo
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">Características Principales</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-2 hover:border-blue-500 transition-colors">
            <CardHeader>
              <ShoppingCart className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Punto de Venta</CardTitle>
              <CardDescription>
                Procesa ventas rápidamente con lector de código de barras
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-blue-500 transition-colors">
            <CardHeader>
              <Package className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Gestión de Inventario</CardTitle>
              <CardDescription>
                Control total de productos, stock y proveedores
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-blue-500 transition-colors">
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>Reportes Detallados</CardTitle>
              <CardDescription>
                Reportes diarios, semanales y mensuales de ventas
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-blue-500 transition-colors">
            <CardHeader>
              <Users className="h-10 w-10 text-orange-600 mb-2" />
              <CardTitle>Gestión de Clientes</CardTitle>
              <CardDescription>
                Clientes pueden crear cuentas y separar productos
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* More Features */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">Todo lo que Necesitas</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Ofertas Automáticas</h4>
              <p className="text-gray-600">
                Crea ofertas para productos próximos a vencer automáticamente
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Alertas de Stock</h4>
              <p className="text-gray-600">
                Recibe notificaciones cuando el inventario esté bajo
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Multi-Usuario</h4>
              <p className="text-gray-600">
                Roles para administradores, cajeros y clientes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h3 className="text-4xl font-bold mb-6">Listo para Empezar?</h3>
        <p className="text-xl text-gray-600 mb-8">
          Únete hoy y optimiza la gestión de tu tienda
        </p>
        <Link href="/sign-up">
          <Button size="lg" className="text-lg">
            Crear Cuenta Gratis <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>Sistema POS - Gestión Integral para Tiendas</p>
        </div>
      </footer>
    </div>
  );
}
