'use client';

import { useState, useSyncExternalStore } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Check, Palette } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ACCENTS,
  DEFAULT_ACCENT,
  findAccent,
  readStoredAccent,
  setAccent,
  subscribeAccent,
} from '@/lib/accent';
import { getUserProfile, updateUserProfile } from '@/lib/cloudflare-api';
import { cn } from '@/lib/utils';

/**
 * Selector del color del sistema. El cambio se ve al instante en todo el
 * dashboard (claro y oscuro) y se guarda en el perfil de la tienda para que el
 * tendero y su equipo lo vean igual en cualquier dispositivo.
 */
export function AccentConfig() {
  const { getToken } = useAuth();
  const current = useSyncExternalStore(subscribeAccent, readStoredAccent, () => DEFAULT_ACCENT);
  const [saving, setSaving] = useState<string | null>(null);

  const choose = async (id: string) => {
    if (id === current) return;
    const previous = current;
    setAccent(id); // se aplica de inmediato en esta pantalla
    setSaving(id);
    try {
      const profile = await getUserProfile(getToken);
      if (!profile?.id) throw new Error('Perfil no disponible');
      await updateUserProfile(profile.id, { ui_accent: id }, getToken);
      toast.success(`Color "${findAccent(id).name}" guardado para tu tienda`);
    } catch (error) {
      console.error('No se pudo guardar el color en el perfil:', error);
      // El color queda aplicado en este dispositivo aunque no se haya podido sincronizar.
      toast.warning('Color aplicado en este dispositivo. No se pudo guardar en tu cuenta.', {
        action: { label: 'Deshacer', onClick: () => setAccent(previous) },
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-brand" />
          Color del sistema
        </CardTitle>
        <CardDescription>
          Elige el color de tu tienda. Se aplica a botones, menús y realces en todo el
          sistema, de día y de noche.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div role="radiogroup" aria-label="Color del sistema" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ACCENTS.map((accent) => {
            const selected = accent.id === current;
            return (
              <button
                key={accent.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(accent.id)}
                disabled={saving !== null}
                className={cn(
                  'group flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
                  selected
                    ? 'border-transparent bg-white ring-2 ring-[var(--accent-swatch)]'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
                style={{ '--accent-swatch': accent.light.brand } as React.CSSProperties}
              >
                {/* Muestra: el color de día con su variante de noche en la esquina. */}
                <span
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg text-white"
                  style={{ backgroundColor: accent.light.brand }}
                  aria-hidden="true"
                >
                  <span
                    className="absolute bottom-0 right-0 h-4 w-4 rounded-tl-md"
                    style={{ backgroundColor: accent.dark.text }}
                  />
                  {selected && <Check className="relative h-5 w-5" strokeWidth={2.5} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-gray-900">
                    {accent.name}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {saving === accent.id ? 'Guardando…' : selected ? 'En uso' : 'Usar'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
