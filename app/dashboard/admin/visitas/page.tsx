'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CalendarDays,
  EyeOff,
  Loader2,
  MonitorSmartphone,
  RefreshCcw,
  Repeat,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApiError, getSiteVisitStats, type SiteVisitGroup, type SiteVisitStats } from '@/lib/cloudflare-api';
import { NO_TRACK_KEY } from '@/components/SiteVisitTracker';

const PERIODS = [7, 30, 90] as const;

const DEVICE_LABELS: Record<string, string> = {
  mobile: 'Celular',
  tablet: 'Tablet',
  desktop: 'Computador',
};

const PAGE_LABELS: Record<string, string> = {
  '/': 'Inicio (landing)',
  '/acerca': 'Acerca de',
  '/como-empezar': 'Cómo empezar',
  '/contacto': 'Contacto',
  '/funcionalidades': 'Funcionalidades',
  '/privacidad': 'Privacidad',
  '/terminos': 'Términos',
  '/sign-in': 'Iniciar sesión',
  '/sign-up': 'Registro',
};

const regionNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['es'], { type: 'region' })
    : null;

function countryLabel(code: string): string {
  if (!code) return 'Desconocido';
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

// D1 guarda 'YYYY-MM-DD HH:MM:SS' en UTC.
function formatColombia(utc: string): string {
  return new Date(utc.replace(' ', 'T') + 'Z').toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDay(day: string): string {
  const [, m, d] = day.split('-');
  return `${d}/${m}`;
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">{label}</p>
          <Icon className="h-5 w-5 text-[#007C80]" aria-hidden="true" />
        </div>
        <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{value.toLocaleString('es-CO')}</p>
        {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Breakdown({
  title,
  description,
  rows,
  total,
  formatLabel,
}: {
  title: string;
  description: string;
  rows: SiteVisitGroup[];
  total: number;
  formatLabel: (label: string) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">Sin datos en este período.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => {
              const pct = total > 0 ? Math.round((row.devices / total) * 100) : 0;
              return (
                <li key={row.label || '(vacío)'}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate text-gray-800">{formatLabel(row.label)}</span>
                    <span className="shrink-0 tabular-nums text-gray-600">
                      {row.devices.toLocaleString('es-CO')} <span className="text-gray-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[#007C80]"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const excludedListeners = new Set<() => void>();

function subscribeExcluded(callback: () => void) {
  excludedListeners.add(callback);
  return () => {
    excludedListeners.delete(callback);
  };
}

function readExcluded(): boolean {
  try {
    return localStorage.getItem(NO_TRACK_KEY) === '1';
  } catch {
    return false;
  }
}

export default function VisitasPage() {
  const { getToken } = useAuth();
  const [days, setDays] = useState<number>(30);
  const [reloadKey, setReloadKey] = useState(0);
  const [stats, setStats] = useState<SiteVisitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const excluded = useSyncExternalStore(subscribeExcluded, readExcluded, () => false);

  useEffect(() => {
    let cancelled = false;
    getSiteVisitStats(days, getToken)
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setForbidden(false);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 403) {
          setForbidden(true);
        } else {
          console.error('Error cargando visitas:', error);
          toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las visitas');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, reloadKey, getToken]);

  const changePeriod = (period: number) => {
    if (period === days) return;
    setLoading(true);
    setDays(period);
  };

  const refresh = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const toggleExcluded = () => {
    try {
      if (excluded) localStorage.removeItem(NO_TRACK_KEY);
      else localStorage.setItem(NO_TRACK_KEY, '1');
      excludedListeners.forEach((listener) => listener());
      toast.success(
        excluded ? 'Este navegador volverá a contarse como visita' : 'Este navegador ya no se contará como visita'
      );
    } catch {
      toast.error('No se pudo guardar la preferencia en este navegador');
    }
  };

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <ShieldAlert className="h-10 w-10 text-red-500" aria-hidden="true" />
        <p className="text-lg font-semibold text-gray-900">Solo para superadministradores</p>
        <p className="text-sm text-gray-600">Tu cuenta no tiene permisos para ver las visitas del sitio.</p>
      </div>
    );
  }

  const empty = stats !== null && stats.totals.visits === 0;
  const total = stats?.totals.devices ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <MonitorSmartphone className="h-7 w-7 text-[#007C80]" aria-hidden="true" />
            Visitas al sitio
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Dispositivos que abren la página pública de posib.dev (inicio, funcionalidades, registro e inicio de
            sesión).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 p-1" role="group" aria-label="Período">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => changePeriod(p)}
                aria-pressed={days === p}
                className={`min-h-9 cursor-pointer rounded-md px-3 text-sm font-medium transition-colors ${
                  days === p ? 'bg-[#007C80] text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {p} días
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={refresh} disabled={loading} aria-label="Actualizar">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {loading && !stats && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#007C80]" aria-label="Cargando" />
        </div>
      )}

      {stats && (
        <>
          {stats.tracking_started_at ? (
            <p className="text-xs text-gray-500">
              Registrando visitas desde el {formatColombia(stats.tracking_started_at)} (hora de Colombia). No hay datos
              anteriores a esa fecha.
            </p>
          ) : null}

          {empty ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
                <MonitorSmartphone className="h-10 w-10 text-gray-400" aria-hidden="true" />
                <p className="font-semibold text-gray-900">Aún no hay visitas registradas</p>
                <p className="max-w-md text-sm text-gray-600">
                  Las visitas se cuentan solo desde posib.dev (producción), no desde localhost ni vistas previas. Abre
                  la página en un navegador sin la exclusión activa y actualiza esta sección.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Kpi
                  icon={Users}
                  label="Dispositivos únicos"
                  value={stats.totals.devices}
                  hint={`Últimos ${stats.days} días`}
                />
                <Kpi
                  icon={MonitorSmartphone}
                  label="Visitas"
                  value={stats.totals.visits}
                  hint="Una por sesión del navegador"
                />
                <Kpi icon={CalendarDays} label="Hoy" value={stats.today.devices} hint={`${stats.today.visits} visitas`} />
                <Kpi
                  icon={Sparkles}
                  label="Nuevos"
                  value={stats.totals.new_devices}
                  hint="Primera vez que se ven"
                />
                <Kpi
                  icon={Repeat}
                  label="Ya habían visitado"
                  value={stats.totals.returning_devices}
                  hint="Volvieron al sitio"
                />
                <Kpi
                  icon={UserRound}
                  label="Anónimos"
                  value={stats.totals.anonymous_devices}
                  hint="Sin sesión iniciada"
                />
                <Kpi
                  icon={UserCheck}
                  label="Con sesión"
                  value={stats.totals.signed_in_devices}
                  hint="Ya son usuarios"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Evolución diaria</CardTitle>
                  <CardDescription>Días según hora de Colombia.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="day"
                          tickFormatter={formatDay}
                          tick={{ fontSize: 12 }}
                          minTickGap={24}
                        />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip
                          labelFormatter={(label) => formatDay(String(label))}
                          formatter={(value, name) => [Number(value).toLocaleString('es-CO'), name]}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="visits"
                          name="Visitas"
                          stroke="#94a3b8"
                          fill="#94a3b8"
                          fillOpacity={0.15}
                        />
                        <Area
                          type="monotone"
                          dataKey="devices"
                          name="Dispositivos únicos"
                          stroke="#007C80"
                          fill="#007C80"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Breakdown
                  title="Tipo de dispositivo"
                  description="Celular, tablet o computador"
                  rows={stats.device_types}
                  total={total}
                  formatLabel={(l) => DEVICE_LABELS[l] ?? 'Otro'}
                />
                <Breakdown
                  title="Sistema operativo"
                  description="Dispositivos únicos"
                  rows={stats.os}
                  total={total}
                  formatLabel={(l) => l || 'Otro'}
                />
                <Breakdown
                  title="Navegador"
                  description="Dispositivos únicos"
                  rows={stats.browsers}
                  total={total}
                  formatLabel={(l) => l || 'Otro'}
                />
                <Breakdown
                  title="País"
                  description="Según la red del visitante"
                  rows={stats.countries}
                  total={total}
                  formatLabel={countryLabel}
                />
                <Breakdown
                  title="Origen"
                  description="Campaña (utm/anuncios) o sitio de referencia"
                  rows={stats.sources}
                  total={total}
                  formatLabel={(l) => l || 'Directo / desconocido'}
                />
                <Breakdown
                  title="Primera página vista"
                  description="Página con la que se abrió la sesión"
                  rows={stats.pages}
                  total={total}
                  formatLabel={(l) => PAGE_LABELS[l] ?? l}
                />
              </div>
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cómo se cuentan estos datos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <ul className="list-disc space-y-1 pl-5">
                <li>Solo se registran visitas reales desde posib.dev; se descartan bots, localhost y vistas previas.</li>
                <li>
                  Un dispositivo es un navegador identificado con un código anónimo guardado en él. No se guarda la IP ni
                  datos personales.
                </li>
                <li>
                  Si alguien borra los datos del navegador, usa modo incógnito o Safari limpia el almacenamiento, se cuenta
                  como un dispositivo nuevo: la cifra puede quedar algo por encima de la real.
                </li>
                <li>No se cuentan quienes activan &quot;No rastrear&quot; ni los navegadores excluidos.</li>
              </ul>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button variant="outline" onClick={toggleExcluded}>
                  <EyeOff className="mr-2 h-4 w-4" aria-hidden="true" />
                  {excluded ? 'Volver a contar este navegador' : 'Excluir este navegador'}
                </Button>
                <span className="text-xs text-gray-500">
                  {excluded
                    ? 'Este navegador está excluido (solo aplica en el dominio donde lo activaste).'
                    : 'Actívalo en posib.dev para que tus propias visitas no inflen las cifras.'}
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
