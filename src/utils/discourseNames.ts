import type { TenantKey } from '@/config/tenants';

export function discourseNames(tenant: TenantKey, seasonNum: number) {
  const isSepolia = tenant === 'sepolia';
  const nameSfx = isSepolia ? '_Sepolia' : '';
  const slugSfx = isSepolia ? '-sepolia' : '';
  const dispSfx = isSepolia ? ' (Sepolia)' : '';

  return {
    groups: {
      players:     `S${seasonNum}_Players${nameSfx}`,
      capitalist:  `S${seasonNum}_Capitalists${nameSfx}`,
      proletariat: `S${seasonNum}_Proletarians${nameSfx}`,
    },
    categories: {
      parent:      { slug: `season-${seasonNum}${slugSfx}`,                 name: `Season ${seasonNum}${dispSfx}` },
      capitalist:  { slug: `s${seasonNum}-capitalists-strategy${slugSfx}`,  name: `S${seasonNum} Capitalists Strategy${dispSfx}` },
      proletariat: { slug: `s${seasonNum}-proletarians-strategy${slugSfx}`, name: `S${seasonNum} Proletarians Strategy${dispSfx}` },
    },
    channels: {
      general:     `S${seasonNum}_General${nameSfx}`,
      capitalist:  `S${seasonNum}_Capitalists${nameSfx}`,
      proletariat: `S${seasonNum}_Proletarians${nameSfx}`,
    },
  };
}
