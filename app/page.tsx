import Link from 'next/link';
import { ShoppingCart, Package, BarChart3, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-600 to-gray-200">
      {/* Header */}
      <header className="border-b bg-gray-700 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold text-white">Sistema POS</h1>
          <div className="flex gap-2 md:gap-4">
            <Link href="/sign-in" >
              <Button variant="ghost" className="text-sm md:text-base px-3 md:px-4 bg-gray-800 cursor-pointer text-white hover:bg-white hover:text-gray-800 transition-colors hover:border hover:border-black">
                <span className="hidden sm:inline ">Iniciar Sesión</span>
                <span className="sm:hidden">Entrar</span>
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button className="text-sm md:text-base px-3 md:px-4">
                <span className="hidden sm:inline">Registrarse</span>
                <span className="sm:hidden">Registro</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 md:mb-6">
          Gestión Completa para tu Tienda
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-white mb-6 md:mb-8 max-w-2xl mx-auto px-2">
          Sistema integral de punto de venta, inventario y facturación.
          Todo lo que necesitas para administrar tu negocio en un solo lugar.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
          <Link href="/sign-up" className="w-full sm:w-auto">
            <Button size="lg" className="text-base md:text-lg w-full sm:w-auto cursor-pointer">
              Comenzar Ahora <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </Link>
          {/* <Link href="/dashboard" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="text-black md:text-lg w-full sm:w-auto">
              Ver Demo
            </Button>
          </Link> */}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <h3 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12 text-white">Características Principales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-2 hover:border-gray-400 transition-colors bg-gray-300">
            <CardHeader className="p-4 md:p-6">
              <ShoppingCart className="h-8 w-8 md:h-10 md:w-10 text-blue-600 mb-2" />
              <CardTitle className="text-base md:text-lg">Punto de Venta</CardTitle>
              <CardDescription className="text-sm">
                Procesa ventas rápidamente con lector de código de barras
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-gray-400 transition-colors bg-gray-300">
            <CardHeader className="p-4 md:p-6">
              <Package className="h-8 w-8 md:h-10 md:w-10 text-green-600 mb-2" />
              <CardTitle className="text-base md:text-lg">Gestión de Inventario</CardTitle>
              <CardDescription className="text-sm">
                Control total de productos, stock y proveedores
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-gray-400 transition-colors bg-gray-300">
            <CardHeader className="p-4 md:p-6">
              <BarChart3 className="h-8 w-8 md:h-10 md:w-10 text-purple-600 mb-2" />
              <CardTitle className="text-base md:text-lg">Reportes Detallados</CardTitle>
              <CardDescription className="text-sm">
                Reportes diarios, semanales y mensuales de ventas
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-gray-400 transition-colors bg-gray-300">
            <CardHeader className="p-4 md:p-6">
              <Users className="h-8 w-8 md:h-10 md:w-10 text-orange-600 mb-2" />
              <CardTitle className="text-base md:text-lg">Gestión de Clientes</CardTitle>
              <CardDescription className="text-sm">
                Clientes pueden crear cuentas y separar productos
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* More Features */}
      <section className="from-gray-600 to-gray-200 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Todo lo que Necesitas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Package className="h-7 w-7 md:h-8 md:w-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-base md:text-lg mb-2">Ofertas Automáticas</h4>
              <p className="text-white text-sm md:text-base px-2">
                Crea ofertas para productos próximos a vencer automáticamente
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4">
                <BarChart3 className="h-7 w-7 md:h-8 md:w-8 text-green-600" />
              </div>
              <h4 className="font-semibold text-base md:text-lg mb-2">Alertas de Stock</h4>
              <p className="text-white text-sm md:text-base px-2">
                Recibe notificaciones cuando el inventario esté bajo
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Users className="h-7 w-7 md:h-8 md:w-8 text-purple-600" />
              </div>
              <h4 className="font-semibold text-base md:text-lg mb-2">Multi-Usuario</h4>
              <p className="text-white text-sm md:text-base px-2">
                Roles para administradores, cajeros y clientes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-12 md:py-20 text-center">
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6">¿Listo para Empezar?</h3>
        <p className="text-base sm:text-lg md:text-xl text-white mb-6 md:mb-8 px-2">
          Únete hoy y optimiza la gestión de tu tienda
        </p>
        <Link href="/sign-up" className="inline-block">
          <Button size="lg" className="text-base md:text-lg">
            Crear Cuenta Gratis <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t from-gray-600 to-gray-200 py-6 md:py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p className="text-sm md:text-base text-white ">Sistema POS - Gestión Integral para Tiendas</p>
        </div>
      </footer>
    </div>
  );
}
