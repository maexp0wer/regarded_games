import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import GithubSlugger from 'github-slugger';

// Single source of truth, authored as one file.
export const WHITEPAPER_SOURCE = path.resolve(__dirname, '..', 'content', 'Whitepaper.md');
// Generated per-Part pages consumed by the whitepaper docs plugin. Gitignored.
export const GENERATED_DIR = path.resolve(__dirname, '..', 'content', 'whitepaper-pages');

const TOC_MIN_HEADING_LEVEL = 2;
const TOC_MAX_HEADING_LEVEL = 3;

interface Segment {
  title: string;
  bodyLines: string[];
}

export interface Part {
  id: string;
  label: string;
  slug: string;
}

// Split the document on top-level (H1) headings. Each H1 becomes its own
// Docusaurus page; the H2/H3 within it populate that page's right-side TOC.
function splitOnH1(content: string): Segment[] {
  const lines = content.split(/\r?\n/);
  const segments: Segment[] = [];
  let current: Segment | null = null;
  let inFence = false;

  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;
    const h1 = !inFence ? /^# (.+?)\s*$/.exec(line) : null;
    if (h1) {
      current = {title: h1[1].trim(), bodyLines: []};
      segments.push(current);
      continue;
    }
    if (current) current.bodyLines.push(line);
  }

  return segments;
}

// Drop the manual "## Table of Contents" subsection from the index page: its
// links target anchors that now live on separate pages, and the left sidebar
// replaces it.
function stripTableOfContents(lines: string[]): string[] {
  const out: string[] = [];
  let skipping = false;
  let inFence = false;

  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;
    const heading = !inFence ? /^#{1,6}\s+(.+?)\s*$/.exec(line) : null;
    if (heading) {
      if (/^table of contents$/i.test(heading[1].trim())) { skipping = true; continue; }
      if (skipping) skipping = false; // the next heading ends the TOC block
    }
    if (!skipping) out.push(line);
  }

  return out;
}

function trimBlankEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === '') start++;
  while (end > start && lines[end - 1].trim() === '') end--;
  return lines.slice(start, end);
}

// JSON.stringify produces valid YAML flow scalars, which safely escapes the
// colons and quotes that appear in Part titles.
function frontmatter(fields: Record<string, string | number>): string {
  const body = Object.entries(fields)
    .map(([key, value]) => `${key}: ${typeof value === 'number' ? value : JSON.stringify(value)}`)
    .join('\n');
  return `---\n${body}\n---\n`;
}

export function generateWhitepaperPages(): Part[] {
  const raw = fs.readFileSync(WHITEPAPER_SOURCE, 'utf8');
  const {content} = matter(raw);
  const segments = splitOnH1(content);
  const slugger = new GithubSlugger();

  fs.rmSync(GENERATED_DIR, {recursive: true, force: true});
  fs.mkdirSync(GENERATED_DIR, {recursive: true});

  return segments.map((segment, index) => {
    const isIndex = index === 0;
    const id = isIndex ? 'index' : slugger.slug(segment.title);
    const slug = isIndex ? '/' : id;
    const position = index + 1;

    const rawBody = isIndex ? stripTableOfContents(segment.bodyLines) : segment.bodyLines;
    const body = trimBlankEdges(rawBody).join('\n');

    const fm = frontmatter({
      id,
      title: segment.title,
      sidebar_label: segment.title,
      sidebar_position: position,
      slug,
      toc_min_heading_level: TOC_MIN_HEADING_LEVEL,
      toc_max_heading_level: TOC_MAX_HEADING_LEVEL,
    });

    const filename = `${String(position).padStart(2, '0')}-${id}.md`;
    fs.writeFileSync(path.join(GENERATED_DIR, filename), `${fm}\n${body}\n`);

    return {id, label: segment.title, slug};
  });
}
