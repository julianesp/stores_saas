"use client";

import { useSyncExternalStore } from "react";
import { getThemeMode, resolveDark, subscribeTheme, type ThemeMode } from "@/lib/theme";

export function useIsDark(): boolean {
  return useSyncExternalStore(subscribeTheme, () => resolveDark(), () => false);
}

export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribeTheme, getThemeMode, () => "auto" as const);
}
