import { headers } from 'next/headers';
import { getTenant, type TenantConfig, type TenantKey } from '@/config/tenants';

const PROD_ROOT_DOMAIN = 'yourdomain.com';
const DEV_ROOT_DOMAIN = 'localhost:3000';

export function tenantFromHost(host: string | null | undefined): TenantKey | null {
  if (!host) return null;
  if (host === `app.sepolia.${PROD_ROOT_DOMAIN}` || host === `app.sepolia.${DEV_ROOT_DOMAIN}`) {
    return 'sepolia';
  }
  if (host === `app.${PROD_ROOT_DOMAIN}` || host === `app.${DEV_ROOT_DOMAIN}`) {
    return 'mainnet';
  }
  return null;
}

export async function getServerTenant(): Promise<TenantConfig> {
  const h = await headers();
  const fromHeader = h.get('x-tenant') as TenantKey | null;
  if (fromHeader === 'mainnet' || fromHeader === 'sepolia') {
    return getTenant(fromHeader);
  }
  const host = h.get('host');
  const key = tenantFromHost(host);
  return getTenant(key ?? 'mainnet');
}

export async function getServerAppPath(): Promise<string> {
  const h = await headers();
  return h.get('x-app-path') ?? '/';
}

export function tenantFromRequest(req: Request): TenantConfig {
  const origin = req.headers.get('origin') ?? req.headers.get('referer') ?? '';
  let host: string | null = null;
  try {
    host = origin ? new URL(origin).host : null;
  } catch {
    host = null;
  }
  const key = tenantFromHost(host) ?? 'mainnet';
  return getTenant(key);
}
