"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Clock, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  applyTheme,
  isThemeEnabledForPath,
  NIGHT_END,
  NIGHT_START,
  setManualTheme,
  setThemeMode,
  type ThemeMode,
} from "@/lib/theme";
import { useIsDark, useThemeMode } from "@/lib/use-is-dark";

export default function HourTheme() {
  const dark = useIsDark();
  const pathname = usePathname();

  useEffect(() => {
    applyTheme(dark, pathname);
  }, [dark, pathname]);

  return null;
}

const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

/**
 * Botón del tema en el encabezado: abre un menú para fijar el tema (siempre
 * claro / siempre oscuro) o dejarlo según la hora del día.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const dark = useIsDark();
  const mode = useThemeMode();
  const pathname = usePathname();

  if (!isThemeEnabledForPath(pathname)) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Tema de la pantalla"
        title="Tema de la pantalla"
        className={
          className ??
          "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        }
      >
        {dark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Tema de la pantalla</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => setThemeMode(value as ThemeMode)}
        >
          <DropdownMenuRadioItem value="auto" className="cursor-pointer">
            <Clock className="mr-2 h-4 w-4" />
            <span>
              Según la hora
              <span className="block text-xs text-gray-500">
                Claro de {hourLabel(NIGHT_END)} a {hourLabel(NIGHT_START)}
              </span>
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light" className="cursor-pointer">
            <Sun className="mr-2 h-4 w-4" />
            Siempre claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="cursor-pointer">
            <Moon className="mr-2 h-4 w-4" />
            Siempre oscuro
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        {mode === "auto" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-xs text-gray-600"
              onSelect={() => setManualTheme(!dark)}
            >
              {dark ? "Pasar a claro" : "Pasar a oscuro"} solo por ahora
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
