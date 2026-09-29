"use client";

import { useSyncExternalStore } from "react";
import { resolveDark, subscribeTheme } from "@/lib/theme";

export function useIsDark(): boolean {
  return useSyncExternalStore(subscribeTheme, () => resolveDark(), () => false);
}
