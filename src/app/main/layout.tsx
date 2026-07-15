import type { Metadata } from 'next';
import {
  SITE_NAME,
  SITE_DESCRIPTION,
  organizationJsonLd,
  webSiteJsonLd,
  videoGameJsonLd,
} from '@/config/seo';

/* Segment layout for the public landing surface (the bare domain — middleware
   rewrites regarded.games/* to /main/*). Owns the entity metadata and the
   JSON-LD identity block; child pages (/faq, /seasons) override title and
   canonical per-page. */

export const metadata: Metadata = {
  title: {
    absolute: `${SITE_NAME} — Class War: The On-Chain Strategy Game`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  /* Entity identity block — Organization + WebSite + VideoGame, cross-linked
     via @id so crawlers resolve "Regarded Games" (the entity) against the
     generic phrase it collides with. See CONTEXT.md "Entity". */
  const jsonLd = [organizationJsonLd(), webSiteJsonLd(), videoGameJsonLd()];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
