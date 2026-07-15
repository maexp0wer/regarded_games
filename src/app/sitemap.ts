import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/config/seo';

/* Sitemap for the bare-domain landing surface. The docs subdomain is a
   separate Docusaurus deploy with its own generated sitemap. /seasons stays
   out until it carries real season data (it is noindex today) — add
   /seasons/{n} entries when the archive goes live. */

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_ORIGIN}/`,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_ORIGIN}/faq`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
