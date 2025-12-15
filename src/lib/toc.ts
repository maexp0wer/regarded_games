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
  
  // Regex to match # and ##
  const regex = /^(#{1,2})\s+(.+)$/gm;
  
  let match;
  let currentH1: HeadingNode | null = null;

  while ((match = regex.exec(content)) !== null) {
    const level = match[1].length; // 1 for #, 2 for ##
    const title = match[2].trim();
    const id = slugger.slug(title);

    const node: HeadingNode = { id, title, level, children: [] };

    if (level === 1) {
      // It's an H1 (Top level in sidebar)
      headings.push(node);
      currentH1 = node;
    } else if (level === 2 && currentH1) {
      // It's an H2 (Child of the last H1)
      currentH1.children.push(node);
    } else if (level === 2 && !currentH1) {
      // Fallback: H2 without a preceding H1 (treat as root)
      headings.push(node);
    }
  }

  return headings;
}