"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { applyTheme, isThemeEnabledForPath, setManualTheme } from "@/lib/theme";
import { useIsDark } from "@/lib/use-is-dark";

export default function HourTheme() {
  const dark = useIsDark();
  const pathname = usePathname();

  useEffect(() => {
    applyTheme(dark, pathname);
  }, [dark, pathname]);

  return null;
}

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useIsDark();
  const pathname = usePathname();

  if (!isThemeEnabledForPath(pathname)) return null;

  const label = dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <button
      type="button"
      onClick={() => setManualTheme(!dark)}
      aria-label={label}
      title={label}
      className={
        className ??
        "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      }
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
