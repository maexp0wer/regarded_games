'use client';

import { createContext, useContext } from 'react';
import { TENANTS, type TenantConfig, type TenantKey, type CoreDeployment } from '@/config/tenants';

const TenantContext = createContext<TenantConfig | null>(null);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantKey;
  children: React.ReactNode;
}) {
  return (
    <TenantContext.Provider value={TENANTS[tenant]}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantConfig {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used inside <TenantProvider>');
  return ctx;
}

export function useTenantDeployment(): CoreDeployment {
  return useTenant().deployment;
}

export function useTenantPonderUrl(): string {
  return useTenant().ponderUrl;
}

export function useTenantChainId(): number {
  return useTenant().activeChainId;
}
