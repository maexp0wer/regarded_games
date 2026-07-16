import type { FaqItem } from '@/config/seo';

/* Parser for the single-source FAQ markdown (content/docs/faq.mdx — shared
   with the Docusaurus docs site). Convention, documented in that file: every
   `## ` heading is a question and the plain paragraphs beneath it are its
   answer. MDX chrome (frontmatter, comments, the per-page <head> block) and
   everything before the first question are dropped; inline markdown (links,
   emphasis, code) is flattened to plain text so the rendered DOM and the
   FAQPage JSON-LD stay word-identical. */

export function parseFaqMarkdown(source: string): FaqItem[] {
  let s = source.replace(/\r\n/g, '\n');
  s = s.replace(/^---\n[\s\S]*?\n---\n/, ''); // frontmatter
  s = s.replace(/\{\/\*[\s\S]*?\*\/\}/g, ''); // MDX comments
  s = s.replace(/<head>[\s\S]*?<\/head>/g, ''); // per-page head block

  const items: FaqItem[] = [];
  // Split on H2 headings; the leading chunk (H1 + intro) is not a Q/A pair.
  const sections = s.split(/^##\s+/m).slice(1);
  for (const section of sections) {
    const nl = section.indexOf('\n');
    const question = (nl === -1 ? section : section.slice(0, nl)).trim();
    const answer = flattenInline(nl === -1 ? '' : section.slice(nl + 1))
      .split(/\n{2,}/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join(' ');
    if (question && answer) items.push({ question, answer });
  }
  return items;
}

function flattenInline(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images → alt text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → link text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^>\s?/gm, '');
}
