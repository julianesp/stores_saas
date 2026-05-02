"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface TenantContextValue {
  tenantReady: boolean;
  setTenantReady: (ready: boolean) => void;
}

const TenantContext = createContext<TenantContextValue>({
  tenantReady: false,
  setTenantReady: () => {},
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantReady, setTenantReady] = useState(false);
  return (
    <TenantContext.Provider value={{ tenantReady, setTenantReady }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
