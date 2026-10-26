'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  Info,
  Loader2,
  MessageCircle,
  RefreshCcw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ApiError,
  getStoresHealth,
  type StoreHealth,
  type StoreHealthLevel,
  type StoreHealthSeverity,
} from '@/lib/cloudflare-api';

type Filter = 'todas' | StoreHealthLevel;

const LEVELS: Record<StoreHealthLevel, { label: string; badge: string; bar: string }> = {
  riesgo: { label: 'En riesgo', badge: 'bg-red-100 text-red-800', bar: 'bg-red-500' },
  atencion: { label: 'Atención', badge: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500' },
  bien: { label: 'Bien', badge: 'bg-emerald-100 text-emerald-800', bar: 'bg-emerald-500' },
};

const SEVERITY_ICON: Record<StoreHealthSeverity, { icon: typeof Info; className: string; label: string }> = {
  critical: { icon: AlertOctagon, className: 'text-red-600', label: 'Grave' },
  warning: { icon: AlertTriangle, className: 'text-amber-600', label: 'Ajustar' },
  info: { icon: Info, className: 'text-sky-600', label: 'Sugerencia' },
};

const SUBSCRIPTION_LABELS: Record<string, string> = {
  trial: 'Prueba gratis',
  active: 'Pagando',
  expired: 'Vencida',
  canceled: 'Cancelada',
};

const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

function lastSaleLabel(store: StoreHealth): string {
  if (store.daysSinceLastSale === null) return 'Nunca';
  if (store.daysSinceLastSale === 0) return 'Hoy';
  if (store.daysSinceLastSale === 1) return 'Ayer';
  return `Hace ${store.daysSinceLastSale} días`;
}

// Celulares colombianos de 10 dígitos (3xx...) → indicativo 57 para wa.me.
function whatsappUrl(store: StoreHealth): string | null {
  const digits = (store.phone || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  const number = digits.length === 10 && digits.startsWith('3') ? `57${digits}` : digits;
  const text = `Hola, te escribo de posib.dev para ayudarte con ${store.storeName}.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

function StoreCard({ store }: { store: StoreHealth }) {
  const level = LEVELS[store.level];
  const wa = whatsappUrl(store);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{store.storeName}</CardTitle>
            <p className="truncate text-sm text-gray-500">{store.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              {SUBSCRIPTION_LABELS[store.subscriptionStatus] ?? store.subscriptionStatus}
              {store.trialDaysLeft !== null && store.trialDaysLeft >= 0 ? ` · ${store.trialDaysLeft} d` : ''}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${level.badge}`}>
              {level.label} · {store.score}
            </span>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
          <div className={`h-full rounded-full ${level.bar}`} style={{ width: `${Math.max(store.score, 3)}%` }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-gray-500">Última venta</dt>
            <dd className="font-medium text-gray-900">{lastSaleLabel(store)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Ventas 7 / 30 días</dt>
            <dd className="font-medium tabular-nums text-gray-900">
              {store.sales7d.toLocaleString('es-CO')} / {store.sales30d.toLocaleString('es-CO')}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Vendido 30 días</dt>
            <dd className="font-medium tabular-nums text-gray-900">{cop(store.revenue30d)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Productos activos</dt>
            <dd className="font-medium tabular-nums text-gray-900">{store.activeProducts.toLocaleString('es-CO')}</dd>
          </div>
        </dl>

        {store.issues.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Nada que ajustar por ahora.
          </p>
        ) : (
          <ul className="space-y-2">
            {store.issues.map((issue) => {
              const sev = SEVERITY_ICON[issue.severity];
              const Icon = sev.icon;
              return (
                <li key={issue.code} className="flex gap-2 text-sm">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${sev.className}`} aria-label={sev.label} />
                  <div>
                    <p className="font-medium text-gray-900">{issue.title}</p>
                    <p className="text-gray-600">{issue.advice}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center rounded-md border border-gray-200 px-3 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100"
          >
            <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" aria-hidden="true" />
            Escribir por WhatsApp
          </a>
        )}
      </CardContent>
    </Card>
  );
}

export default function SaludTiendasPage() {
  const { getToken } = useAuth();
  const [stores, setStores] = useState<StoreHealth[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<Filter>('todas');
  const [query, setQuery] = useState('');
  const [hideInactive, setHideInactive] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getStoresHealth(getToken)
      .then((data) => {
        if (cancelled) return;
        setStores(data.stores);
        setGeneratedAt(data.generatedAt);
        setForbidden(false);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 403) {
          setForbidden(true);
        } else {
          console.error('Error cargando la salud de las tiendas:', error);
          toast.error(error instanceof Error ? error.message : 'No se pudo cargar la salud de las tiendas');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, getToken]);

  // Las cuentas vencidas o canceladas ya no pagan: se ocultan por defecto.
  const visible = useMemo(
    () =>
      (stores ?? []).filter(
        (s) => !hideInactive || (s.subscriptionStatus !== 'expired' && s.subscriptionStatus !== 'canceled')
      ),
    [stores, hideInactive]
  );

  const counts = useMemo(() => {
    const c = { todas: visible.length, riesgo: 0, atencion: 0, bien: 0 };
    for (const s of visible) c[s.level]++;
    return c;
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visible.filter(
      (s) =>
        (filter === 'todas' || s.level === filter) &&
        (!q || s.storeName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
    );
  }, [visible, filter, query]);

  const refresh = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <ShieldAlert className="h-10 w-10 text-red-500" aria-hidden="true" />
        <p className="text-lg font-semibold text-gray-900">Solo para superadministradores</p>
        <p className="text-sm text-gray-600">Tu cuenta no tiene permisos para ver la salud de las tiendas.</p>
      </div>
    );
  }

  const FILTERS: { value: Filter; label: string }[] = [
    { value: 'todas', label: 'Todas' },
    { value: 'riesgo', label: LEVELS.riesgo.label },
    { value: 'atencion', label: LEVELS.atencion.label },
    { value: 'bien', label: LEVELS.bien.label },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <HeartPulse className="h-7 w-7 text-[#007C80]" aria-hidden="true" />
            Salud de las tiendas
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Qué tan bien usa cada tienda el sistema y qué debería ajustar. Las peores van primero.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading} aria-label="Actualizar">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      {loading && !stores && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#007C80]" aria-label="Cargando" />
        </div>
      )}

      {stores && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex flex-wrap rounded-lg border border-gray-200 p-1" role="group" aria-label="Estado">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  aria-pressed={filter === f.value}
                  className={`min-h-9 cursor-pointer rounded-md px-3 text-sm font-medium transition-colors ${
                    filter === f.value ? 'bg-[#007C80] text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {f.label} <span className="tabular-nums opacity-75">({counts[f.value]})</span>
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar tienda o correo"
                className="pl-9"
                aria-label="Buscar tienda"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={hideInactive}
                onChange={(e) => setHideInactive(e.target.checked)}
                className="h-4 w-4 accent-[#007C80]"
              />
              Ocultar vencidas y canceladas
            </label>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-gray-600">
                No hay tiendas con este filtro.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filtered.map((store) => (
                <StoreCard key={store.storeId} store={store} />
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500">
            Puntaje de 0 a 100: cada problema grave resta 30, cada ajuste 12 y cada sugerencia 4. Las cuentas con menos
            de 3 días no se evalúan por falta de productos o ventas.
            {generatedAt &&
              ` Calculado el ${new Date(generatedAt).toLocaleString('es-CO', {
                timeZone: 'America/Bogota',
                dateStyle: 'medium',
                timeStyle: 'short',
              })}.`}
          </p>
        </>
      )}
    </div>
  );
}
