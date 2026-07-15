import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerTenant, getServerAppPath } from '@/lib/tenant.server';
import { isRouteEnabled } from '@/config/appRoutes';
import { TenantProvider } from '@/context/TenantContext';
import { AppShell } from './_components/AppShell';

/* The app is wallet-gated (nothing to rank); the title still matters for the
   browser tab and for "regarded games app" brand queries. Sepolia's noindex
   comes from the middleware X-Robots-Tag header, not from here. */
export const metadata: Metadata = {
  title: 'Trading Terminal',
  description:
    'The Regarded Games trading terminal — stake $RGD, join the seasonal ' +
    'FIM auction, and trade on the on-chain exchange.',
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getServerTenant();
  const appPath = await getServerAppPath();

  if (!isRouteEnabled(appPath, tenant.key)) {
    notFound();
  }

  return (
    <TenantProvider tenant={tenant.key}>
      <AppShell>{children}</AppShell>
    </TenantProvider>
  );
}
