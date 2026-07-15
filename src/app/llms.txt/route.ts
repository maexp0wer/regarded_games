import { DOCS_ORIGIN, SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from '@/config/seo';

/* llms.txt (llmstxt.org) — a curated markdown index for LLM agents fetching
   the bare domain. Points at the citable sources; the full whitepaper as one
   plain-markdown file lives on the docs origin (llms-full.txt, generated at
   docs build time from content/Whitepaper.md). */

export async function GET() {
  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

Key facts: two classes decided by a share-of-supply cut (Proletarians hold
the poorest balances summing to ≤50% of FIM supply; Capitalists hold the
rest); settlement compares the final Gini coefficient of holdings against the
season start; no randomness and no house — outcomes are set entirely by
player trades. Stakes are real money.

## Docs

- [Whitepaper](${DOCS_ORIGIN}/whitepaper): complete game specification — auction, exchange, class boundary, settlement math, payout rules
- [Documentation](${DOCS_ORIGIN}/): player and integration docs
- [FAQ](${SITE_ORIGIN}/faq): plain answers — what the game is, whether it is gambling, what players can lose

## Optional

- [Full whitepaper, single file](${DOCS_ORIGIN}/llms-full.txt): the entire whitepaper as one markdown document
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
