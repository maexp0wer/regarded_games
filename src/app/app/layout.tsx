import { notFound } from 'next/navigation';
import { getServerTenant, getServerAppPath } from '@/lib/tenant.server';
import { isRouteEnabled } from '@/config/appRoutes';
import { TenantProvider } from '@/context/TenantContext';
import { AppShell } from './_components/AppShell';

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
