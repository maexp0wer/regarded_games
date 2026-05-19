import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import GithubSlugger from 'github-slugger';
import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const WHITEPAPER_PATH = path.resolve(__dirname, '..', 'content', 'Whitepaper.md');
const DOC_URL = '/docs/whitepaper/';

interface Section {
  label: string;
  slug: string;
}

interface Part {
  label: string;
  sections: Section[];
}

function parseWhitepaper(): {topLevel: Section[]; parts: Part[]} {
  const raw = fs.readFileSync(WHITEPAPER_PATH, 'utf8');
  const {content} = matter(raw);
  const slugger = new GithubSlugger();

  const lines = content.split(/\r?\n/);
  const topLevel: Section[] = [];
  const parts: Part[] = [];
  let currentPart: Part | null = null;
  let inFence = false;
  let seenFirstH1 = false;

  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const h1 = /^# (.+?)\s*$/.exec(line);
    const h2 = /^## (.+?)\s*$/.exec(line);

    if (h1) {
      const text = h1[1].trim();
      slugger.slug(text);
      if (!seenFirstH1) {
        seenFirstH1 = true;
        continue;
      }
      currentPart = {label: text, sections: []};
      parts.push(currentPart);
    } else if (h2) {
      const text = h2[1].trim();
      const slug = slugger.slug(text);
      if (text === 'Table of Contents') continue;
      const section: Section = {label: text, slug};
      if (currentPart) {
        currentPart.sections.push(section);
      } else {
        topLevel.push(section);
      }
    }
  }

  return {topLevel, parts};
}

const {topLevel, parts} = parseWhitepaper();

const sidebars: SidebarsConfig = {
  whitepaperSidebar: [
    {type: 'doc', id: 'Whitepaper', label: 'Top'},
    ...topLevel.map((s) => ({
      type: 'link' as const,
      label: s.label,
      href: `${DOC_URL}#${s.slug}`,
    })),
    ...parts.map((part) => ({
      type: 'category' as const,
      label: part.label,
      collapsible: true,
      collapsed: true,
      items: part.sections.map((s) => ({
        type: 'link' as const,
        label: s.label,
        href: `${DOC_URL}#${s.slug}`,
      })),
    })),
  ],
};

export default sidebars;
