'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  Store,
  Sparkles,
  Mail,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Preview {
  clientEmail: string;
  clientId: string;
  clientStoreName: string | null;
  clientStatus: string;
  addonType: 'Store' | 'AI' | 'Email';
  amount: number;
  refPayco: string;
  transactionDate: string;
  expiresAt: string;
  alreadyActive: boolean;
}

const ADDON_META: Record<Preview['addonType'], { label: string; icon: typeof Store }> = {
  Store: { label: 'Tienda Online', icon: Store },
  AI: { label: 'Análisis con IA', icon: Sparkles },
  Email: { label: 'Email Marketing', icon: Mail },
};

export default function ReconciliarPagosPage() {
  const [refPayco, setRefPayco] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activating, setActivating] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => {
    setPreview(null);
    setError(null);
    setDone(false);
  };

  const handleVerify = async () => {
    const ref = refPayco.trim();
    if (!ref) {
      toast.error('Pega la referencia ePayco (ref_payco)');
      return;
    }

    setVerifying(true);
    reset();
    try {
      const res = await fetch('/api/admin/activate-addon-manually', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refPayco: ref, dryRun: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        // El 409 (regla de plan base) trae un mensaje claro que mostramos tal cual.
        setError(data.error || 'No se pudo verificar el pago');
        return;
      }

      setPreview(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar el pago');
    } finally {
      setVerifying(false);
    }
  };

  const handleActivate = async () => {
    if (!preview) return;

    setActivating(true);
    try {
      const res = await fetch('/api/admin/activate-addon-manually', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refPayco: preview.refPayco }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'No se pudo activar el add-on');
        return;
      }

      toast.success(`✅ ${data.message}`);
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al activar el add-on');
    } finally {
      setActivating(false);
    }
  };

  const AddonIcon = preview ? ADDON_META[preview.addonType].icon : Receipt;

  return (
    <div className="space-y-6 max-w-3xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold">Reconciliar pagos de ePayco</h1>
        <p className="text-gray-500 mt-2">
          Recupera pagos que ePayco aprobó pero que no se activaron automáticamente.
          Verifica contra ePayco por su referencia y activa el complemento en la
          cuenta del cliente correcto.
        </p>
      </div>

      {/* Entrada de referencia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Referencia ePayco (ref_payco)
          </CardTitle>
          <CardDescription>
            Cópiala del panel de ePayco (Transacciones) o de la URL de la pantalla
            de pago del cliente (<code className="text-xs">?ref_payco=…</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="ref-payco" className="sr-only">
                Referencia ePayco
              </Label>
              <Input
                id="ref-payco"
                placeholder="Ej: 6aa755a1219cb326d74e1f37"
                value={refPayco}
                onChange={(e) => setRefPayco(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                className="font-mono"
              />
            </div>
            <Button onClick={handleVerify} disabled={verifying}>
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando…
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Verificar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error de verificación */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">No se pudo procesar</p>
                <p className="text-sm text-red-800 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previsualización + activación */}
      {preview && (
        <Card className="border-brand/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Pago aprobado en ePayco
            </CardTitle>
            <CardDescription>
              Revisa que corresponda al cliente correcto antes de activar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Cliente</p>
                <p className="font-medium">
                  {preview.clientStoreName || preview.clientEmail}
                </p>
                <p className="text-xs text-gray-500">{preview.clientEmail}</p>
              </div>
              <div>
                <p className="text-gray-500">Complemento pagado</p>
                <p className="font-medium flex items-center gap-1.5">
                  <AddonIcon className="h-4 w-4 text-brand" />
                  {ADDON_META[preview.addonType].label}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Monto</p>
                <p className="font-medium">{formatCurrency(preview.amount)}</p>
              </div>
              <div>
                <p className="text-gray-500">Estado de la cuenta base</p>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    preview.clientStatus === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {preview.clientStatus}
                </span>
              </div>
              <div>
                <p className="text-gray-500">Referencia</p>
                <p className="font-mono text-xs">{preview.refPayco}</p>
              </div>
              <div>
                <p className="text-gray-500">Vigencia si se activa</p>
                <p className="font-medium">
                  hasta{' '}
                  {new Date(preview.expiresAt).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {preview.alreadyActive && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Este complemento ya figura activo en la cuenta. Activar de nuevo
                  solo renovará la fecha de vigencia.
                </p>
              </div>
            )}

            {done ? (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-900">
                  Complemento activado en la cuenta de {preview.clientEmail}.
                </p>
              </div>
            ) : (
              <Button
                onClick={handleActivate}
                disabled={activating}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {activating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Activando…
                  </>
                ) : (
                  <>
                    Activar {ADDON_META[preview.addonType].label} para este cliente
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ayuda */}
      {!preview && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 space-y-3">
              <p className="font-medium text-gray-900">¿Cuándo usar esto?</p>
              <p>
                Cuando un cliente pagó por ePayco (Nequi/PSE/tarjeta) y el pago se
                cobró pero el complemento no se activó, o le apareció
                &quot;pago rechazado&quot; siendo que sí pagó.
              </p>
              <ol className="space-y-2 mt-2">
                {[
                  'Entra al panel de ePayco → Transacciones y ubica el pago (estado Aceptada).',
                  'Copia su ref_payco y pégalo arriba.',
                  'Pulsa Verificar: se consulta ePayco y se identifica al cliente por la transacción.',
                  'Revisa que sea el cliente y el complemento correctos, y pulsa Activar.',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-bold text-brand">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-gray-500 pt-2">
                Solo se activan pagos que ePayco confirma como aprobados. La Tienda
                Online requiere que el cliente tenga el Plan Básico activo.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
