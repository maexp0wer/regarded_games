import type { TenantKey } from '@/config/tenants';

export function discourseNames(tenant: TenantKey, seasonNum: number) {
  const isSepolia = tenant === 'sepolia';
  const nameSfx = isSepolia ? '_Sepolia' : '';
  const slugSfx = isSepolia ? '-sepolia' : '';
  const dispSfx = isSepolia ? ' (Sepolia)' : '';

  return {
    groups: {
      players:     `S${seasonNum}_Players${nameSfx}`,
      bourgeoisie: `S${seasonNum}_Bourgeoisie${nameSfx}`,
      proletariat: `S${seasonNum}_Proletariat${nameSfx}`,
    },
    categories: {
      parent:      { slug: `season-${seasonNum}${slugSfx}`,                name: `Season ${seasonNum}${dispSfx}` },
      bourgeoisie: { slug: `s${seasonNum}-bourgeoisie-strategy${slugSfx}`, name: `S${seasonNum} Bourgeoisie Strategy${dispSfx}` },
      proletariat: { slug: `s${seasonNum}-proletariat-strategy${slugSfx}`, name: `S${seasonNum} Proletariat Strategy${dispSfx}` },
    },
    channels: {
      general:     `S${seasonNum}_General${nameSfx}`,
      bourgeoisie: `S${seasonNum}_Bourgeoisie${nameSfx}`,
      proletariat: `S${seasonNum}_Proletariat${nameSfx}`,
    },
  };
}
