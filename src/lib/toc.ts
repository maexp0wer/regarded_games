// src/lib/toc.ts
import GithubSlugger from 'github-slugger';

export type HeadingNode = {
  id: string;
  title: string;
  level: number;
  children: HeadingNode[];
};

export function getHeadingsFromMarkdown(content: string): HeadingNode[] {
  const slugger = new GithubSlugger();
  const headings: HeadingNode[] = [];
  
  // CHANGED: Match 1 to 3 hashes (H1, H2, H3)
  const regex = /^(#{1,3})\s+(.+)$/gm;
  
  let match;
  let currentH1: HeadingNode | null = null;
  let currentH2: HeadingNode | null = null;

  while ((match = regex.exec(content)) !== null) {
    const level = match[1].length; // 1, 2, or 3
    const title = match[2].trim();
    const id = slugger.slug(title);

    const node: HeadingNode = { id, title, level, children: [] };

    if (level === 1) {
      headings.push(node);
      currentH1 = node;
      currentH2 = null; // Reset H2 when a new H1 begins
    } 
    else if (level === 2) {
      if (currentH1) {
        currentH1.children.push(node);
      } else {
        headings.push(node); // Orphan H2
      }
      currentH2 = node; // Set current H2
    } 
    else if (level === 3) {
      if (currentH2) {
        currentH2.children.push(node);
      } else if (currentH1) {
        // Fallback: H3 directly under H1 (uncommon but possible)
        currentH1.children.push(node);
      } else {
        headings.push(node); // Orphan H3
      }
    }
  }

  return headings;
}