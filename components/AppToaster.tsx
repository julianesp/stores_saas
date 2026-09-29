"use client";

import { Toaster } from "sonner";
import { useIsDark } from "@/lib/use-is-dark";

export default function AppToaster() {
  const dark = useIsDark();

  return (
    <Toaster
      position="top-right"
      richColors
      theme={dark ? "dark" : "light"}
      toastOptions={{
        style: {
          marginTop: "10px",
        },
        className: "toast-below-cart",
      }}
    />
  );
}
