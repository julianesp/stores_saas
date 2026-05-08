'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Search,
  CheckCircle,
  Sparkles,
  Store,
  Mail,
  CreditCard,
  Loader2,
  User,
  Calendar,
  AlertCircle,
  DollarSign,
  X,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getUserProfile, getAllUserProfiles } from '@/lib/cloudflare-api';
import { UserProfile } from '@/lib/types';

const PLANS = [
  {
    id: 'plan-basico',
    name: 'Plan Básico',
    icon: CreditCard,
    price: 24900,
    color: 'gray',
    description: 'Activa la suscripción mensual completa',
  },
  {
    id: 'addon-ai',
    name: 'Addon: Análisis con IA',
    icon: Sparkles,
    price: 5000,
    color: 'purple',
    description: 'Predicciones y análisis inteligentes',
  },
  {
    id: 'addon-store',
    name: 'Addon: Tienda Online',
    icon: Store,
    price: 9900,
    color: 'blue',
    description: 'Tienda online completa con pagos',
  },
  {
    id: 'addon-email',
    name: 'Addon: Email Marketing',
    icon: Mail,
    price: 5000,
    color: 'green',
    description: 'Campañas y carritos abandonados',
  },
];

export default function ActivatePlanManuallyPage() {
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activating, setActivating] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  // Cargar todos los usuarios al montar el componente
  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const profiles = await getAllUserProfiles(getToken);
        setAllUsers(profiles);
      } catch (error) {
        console.error('Error loading users:', error);
        toast.error('Error al cargar usuarios');
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [getToken]);

  // Filtrar usuarios en tiempo real
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setFilteredUsers([]);
      setShowSuggestions(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allUsers.filter((user) => {
      const email = user.email?.toLowerCase() || '';
      const storeName = user.store_name?.toLowerCase() || '';
      return email.includes(query) || storeName.includes(query);
    });

    setFilteredUsers(filtered.slice(0, 8)); // Mostrar máximo 8 sugerencias
    setShowSuggestions(filtered.length > 0);
  }, [searchQuery, allUsers]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectUser = (user: UserProfile) => {
    setUserProfile(user);
    setSearchQuery(user.email);
    setShowSuggestions(false);
    toast.success(`Usuario seleccionado: ${user.store_name || user.email}`);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setUserProfile(null);
    setSelectedPlan('');
    setPaymentReference('');
    setShowSuggestions(false);
  };

  const handleActivatePlan = async () => {
    if (!userProfile || !selectedPlan) {
      toast.error('Selecciona un plan para activar');
      return;
    }

    setActivating(true);
    try {
      const response = await fetch('/api/admin/activate-plan-manually', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userProfile.email,
          planType: selectedPlan,
          paymentReference: paymentReference || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al activar plan');
      }

      toast.success(`✅ ${data.data.planName} activado correctamente`);

      // Limpiar formulario
      setSelectedPlan('');
      setPaymentReference('');

      // Recargar datos del usuario
      const updatedProfiles = await getAllUserProfiles(getToken);
      const updatedUser = updatedProfiles.find(
        (p: UserProfile) => p.email === userProfile.email
      );
      if (updatedUser) {
        setUserProfile(updatedUser);
      }
    } catch (error: any) {
      console.error('Error activating plan:', error);
      toast.error(error.message || 'Error al activar plan');
    } finally {
      setActivating(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      gray: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    };
    return colors[color] || colors.gray;
  };

  const getUserStatus = () => {
    if (!userProfile) return null;

    const now = new Date();
    const status = userProfile.subscription_status;

    let statusInfo = {
      label: 'Desconocido',
      color: 'gray',
      details: '',
    };

    if (status === 'trial') {
      const trialEnd = userProfile.trial_end_date ? new Date(userProfile.trial_end_date) : null;
      const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      statusInfo = {
        label: 'Prueba Gratuita',
        color: 'yellow',
        details: `${daysLeft} días restantes`,
      };
    } else if (status === 'active') {
      const nextBilling = userProfile.next_billing_date ? new Date(userProfile.next_billing_date) : null;
      const daysLeft = nextBilling ? Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      statusInfo = {
        label: 'Activa',
        color: 'green',
        details: `${daysLeft} días hasta próximo pago`,
      };
    } else if (status === 'expired') {
      statusInfo = {
        label: 'Expirada',
        color: 'red',
        details: 'Requiere renovación',
      };
    }

    return statusInfo;
  };

  const userStatus = getUserStatus();

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold">Activación Manual de Planes</h1>
        <p className="text-gray-500 mt-2">
          Busca un usuario y activa su plan o addon después de verificar el pago por Nequi
        </p>
      </div>

      {/* Buscador de Usuario con Autocompletado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Usuario
          </CardTitle>
          <CardDescription>
            Escribe el email o nombre de la tienda del usuario que realizó el pago
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative" ref={searchRef}>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por email o nombre de tienda..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (filteredUsers.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  className="pl-10 pr-10"
                  disabled={loadingUsers}
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Dropdown de Sugerencias */}
            {showSuggestions && filteredUsers.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[400px] overflow-y-auto">
                <div className="p-2">
                  <p className="text-xs text-gray-500 px-3 py-2">
                    {filteredUsers.length} resultado{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
                  </p>
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="w-full text-left px-3 py-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-full">
                          <User className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {user.store_name || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                user.subscription_status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : user.subscription_status === 'trial'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {user.subscription_status === 'active'
                                ? 'Activa'
                                : user.subscription_status === 'trial'
                                  ? 'Trial'
                                  : 'Expirada'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mensaje cuando no hay resultados */}
            {showSuggestions && filteredUsers.length === 0 && searchQuery.length >= 2 && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                <div className="text-center text-gray-500">
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium">No se encontraron usuarios</p>
                  <p className="text-xs mt-1">
                    Intenta con otro email o nombre de tienda
                  </p>
                </div>
              </div>
            )}
          </div>

          {loadingUsers && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando usuarios...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información del Usuario */}
      {userProfile && userStatus && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Usuario Seleccionado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{userProfile.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tienda</p>
                <p className="font-medium">{userProfile.store_name || 'Sin nombre'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estado</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    userStatus.color === 'green'
                      ? 'bg-green-100 text-green-800'
                      : userStatus.color === 'yellow'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {userStatus.label}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Detalles</p>
                <p className="font-medium">{userStatus.details}</p>
              </div>
            </div>

            {/* Addons Activos */}
            <div className="border-t pt-3 mt-3">
              <p className="text-sm text-gray-600 mb-2">Addons Activos:</p>
              <div className="flex flex-wrap gap-2">
                {userProfile.has_ai_addon && (
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                    ✓ IA
                  </span>
                )}
                {userProfile.has_store_addon && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    ✓ Tienda
                  </span>
                )}
                {userProfile.has_email_addon && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    ✓ Email
                  </span>
                )}
                {!userProfile.has_ai_addon && !userProfile.has_store_addon && !userProfile.has_email_addon && (
                  <span className="text-gray-500 text-sm">Sin addons activos</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selección de Plan */}
      {userProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Seleccionar Plan a Activar
            </CardTitle>
            <CardDescription>
              Elige el plan o addon que el usuario pagó
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {PLANS.map((plan) => {
                const colors = getColorClasses(plan.color);
                const Icon = plan.icon;
                const isSelected = selectedPlan === plan.id;

                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `${colors.border} ${colors.bg} border-2`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colors.bg}`}>
                        <Icon className={`h-5 w-5 ${colors.text}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{plan.name}</p>
                        <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                        <p className="text-lg font-bold mt-2 text-gray-900">
                          {formatCurrency(plan.price)}/mes
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle className={`h-5 w-5 ${colors.text}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Referencia de Pago (Opcional) */}
            <div className="border-t pt-4">
              <Label htmlFor="payment-reference" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Referencia de Pago (Opcional)
              </Label>
              <Input
                id="payment-reference"
                placeholder="Ej: Nequi-20260210-1234 o número de comprobante"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ingresa cualquier referencia del pago para tener registro
              </p>
            </div>

            {/* Botón de Activación */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">Verifica antes de activar</p>
                <p className="text-xs text-yellow-800 mt-1">
                  Asegúrate de haber recibido y verificado el pago por Nequi antes de activar el plan.
                </p>
              </div>
            </div>

            <Button
              onClick={handleActivatePlan}
              disabled={!selectedPlan || activating}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {activating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Activando Plan...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Activar Plan Seleccionado
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Información de Ayuda */}
      {!userProfile && !loadingUsers && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500 space-y-2">
              <Calendar className="h-12 w-12 mx-auto text-gray-400" />
              <p className="font-medium">¿Cómo usar esta herramienta?</p>
              <ol className="text-sm text-left max-w-md mx-auto space-y-2 mt-4">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-600">1.</span>
                  <span>Recibe el comprobante de Nequi por WhatsApp del usuario</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-600">2.</span>
                  <span>Verifica el pago en tu cuenta de Nequi</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-600">3.</span>
                  <span>Busca al usuario escribiendo su email o nombre en el campo de arriba</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-600">4.</span>
                  <span>Haz clic en el usuario de las sugerencias</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-600">5.</span>
                  <span>Selecciona el plan que pagó</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-600">6.</span>
                  <span>Haz clic en "Activar Plan" y listo!</span>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
